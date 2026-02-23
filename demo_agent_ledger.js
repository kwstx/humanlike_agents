import crypto from 'node:crypto';
import fs from 'node:fs';
import AgentActivityLedger from './src/identity/governance/AgentActivityLedger.js';
import AgentIdentityRegistry from './src/identity/AgentIdentityRegistry.js';
import PersistentAgentIdentity from './src/identity/models/PersistentAgentIdentity.js';

// Generate an RSA keypair for the demo (PEM)
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicPem = publicKey.export({ type: 'pkcs1', format: 'pem' });
const privatePem = privateKey.export({ type: 'pkcs1', format: 'pem' });

// Construct a persistent identity using the public key
const identity = new PersistentAgentIdentity({ publicKey: publicPem, originSystem: 'demo' });

const registry = new AgentIdentityRegistry({ storePath: './demo_agent_identities.json' });
const ledger = new AgentActivityLedger(registry);

// Helper to add demo entries for required categories
function addDemoEntries() {
    ledger.addEntry({
        agentId: identity.id,
        publicKey: identity.publicKey,
        privateKey: privatePem,
        actionType: 'DELEGATION',
        details: { delegatedTo: 'agent:sub-123', scope: 'DATA_FETCH', rationale: 'Scale-out data ingestion' }
    });

    ledger.addEntry({
        agentId: identity.id,
        publicKey: identity.publicKey,
        privateKey: privatePem,
        actionType: 'NEGOTIATION',
        details: { counterparty: 'agent:vendor-7', commitment: 'DELIVER_BY_2026-03-01', terms: { price: 1200 } }
    });

    ledger.addEntry({
        agentId: identity.id,
        publicKey: identity.publicKey,
        privateKey: privatePem,
        actionType: 'ECONOMIC',
        details: { revenue: 5000, expense: 1200, pnl: 3800, txId: 'tx-789' }
    });

    ledger.addEntry({
        agentId: identity.id,
        publicKey: identity.publicKey,
        privateKey: privatePem,
        actionType: 'POLICY_VIOLATION',
        details: { policyId: 'P-2', severity: 'LOW', description: 'Missing consent header' }
    });

    ledger.addEntry({
        agentId: identity.id,
        publicKey: identity.publicKey,
        privateKey: privatePem,
        actionType: 'SANDBOX_PROPOSAL',
        details: { sandboxId: 'sbx-1', purpose: 'A/B testing new model', resources: ['cpu','gpu'] }
    });

    ledger.addEntry({
        agentId: identity.id,
        publicKey: identity.publicKey,
        privateKey: privatePem,
        actionType: 'COOPERATION',
        details: { partners: ['agent:ally-9'], outcome: 'SUCCESS', notes: 'Coordinated training run' }
    });
}

addDemoEntries();

const outPath = './agent_ledger.json';
ledger.saveToFile(outPath);

console.log('Ledger saved to', outPath);

// Verify chain integrity
const v = ledger.verifyChain();
console.log('Initial verification:', v);

// Show tamper detection: modify the saved file and re-run verification
const raw = fs.readFileSync(outPath, 'utf8');
const parsed = JSON.parse(raw);
// Tamper: change the details of entry 2 (economic)
parsed.entries[2].details.pnl = 0; // malicious edit
fs.writeFileSync('./agent_ledger_tampered.json', JSON.stringify(parsed, null, 2), 'utf8');

// Load tampered ledger and check
const tampered = AgentActivityLedger.loadFromFile('./agent_ledger_tampered.json');
console.log('Tampered verification:', tampered.verifyChain());

console.log('Demo complete.');
