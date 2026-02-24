import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import AgentActivityLedger from './src/identity/governance/AgentActivityLedger.js';
import AgentIdentityRegistry from './src/identity/AgentIdentityRegistry.js';
import PersistentAgentIdentity from './src/identity/models/PersistentAgentIdentity.js';

async function runTest() {
    console.log('--- AgentActivityLedger Compliance Test ---');

    // 1. Setup Identity
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const publicPem = publicKey.export({ type: 'pkcs1', format: 'pem' });
    const privatePem = privateKey.export({ type: 'pkcs1', format: 'pem' });

    const identity = new PersistentAgentIdentity({ publicKey: publicPem, originSystem: 'test-system' });
    console.log(`[PASS] Identity created: ${identity.id}`);

    // 2. Setup Registry and Ledger
    const registryPath = path.resolve(process.cwd(), 'test_compliance_registry.json');
    const ledgerPath = path.resolve(process.cwd(), 'test_compliance_ledger.json');

    // Cleanup old files
    if (fs.existsSync(registryPath)) fs.unlinkSync(registryPath);
    if (fs.existsSync(ledgerPath)) fs.unlinkSync(ledgerPath);

    const registry = new AgentIdentityRegistry({ storePath: registryPath });
    const ledger = new AgentActivityLedger(registry);
    console.log('[PASS] Registry and Ledger initialized');

    // 3. Add entries for ALL required types
    const actionTypes = [
        { type: AgentActivityLedger.ACTION_TYPES.DELEGATION, details: { task: 'Data Analysis', delegatedTo: 'agent:analyst-1' } },
        { type: AgentActivityLedger.ACTION_TYPES.NEGOTIATION, details: { partner: 'agent:market-maker', commitment: 'BUY_100_UNITS', price: 50.5 } },
        { type: AgentActivityLedger.ACTION_TYPES.ECONOMIC_OUTCOME, details: { type: 'REVENUE', amount: 5000, currency: 'USD' } },
        { type: AgentActivityLedger.ACTION_TYPES.POLICY_VIOLATION, details: { policy: 'RATE_LIMIT', severity: 'MEDIUM' } },
        { type: AgentActivityLedger.ACTION_TYPES.SANDBOX_PROPOSAL, details: { experiment: 'Neural Architecture Search', resources: '8xH100' } },
        { type: AgentActivityLedger.ACTION_TYPES.COOPERATIVE_COLLABORATION, details: { coalition: 'Project Genesis', role: 'Data Provider' } }
    ];

    console.log('Adding entries...');
    for (const action of actionTypes) {
        ledger.addEntry({
            agentId: identity.id,
            publicKey: identity.publicKey,
            privateKey: privatePem,
            actionType: action.type,
            details: action.details
        });
        console.log(`  Added ${action.type}`);
    }

    // 4. Verify Chain Integrity
    const initialVerify = ledger.verifyChain();
    if (initialVerify.valid) {
        console.log('[PASS] Initial chain verification successful');
    } else {
        console.error('[FAIL] Initial chain verification failed:', initialVerify.reason);
        process.exit(1);
    }

    // 5. Verify Persistence
    ledger.saveToFile(ledgerPath);
    const loadedLedger = AgentActivityLedger.loadFromFile(ledgerPath);
    const loadedVerify = loadedLedger.verifyChain();
    if (loadedVerify.valid && loadedLedger.getEntries().length === actionTypes.length) {
        console.log('[PASS] Persistence verification successful (Save/Load)');
    } else {
        console.error('[FAIL] Persistence verification failed');
        process.exit(1);
    }

    // 6. Verify Tamper Resistance
    const raw = fs.readFileSync(ledgerPath, 'utf8');
    const parsed = JSON.parse(raw);
    parsed.entries[1].details.price = 0; // Malicious change to NEGOTIATION price
    const tamperedPath = path.resolve(process.cwd(), 'test_compliance_ledger_tampered.json');
    fs.writeFileSync(tamperedPath, JSON.stringify(parsed, null, 2));

    const tamperedLedger = AgentActivityLedger.loadFromFile(tamperedPath);
    const tamperedVerify = tamperedLedger.verifyChain();
    if (!tamperedVerify.valid && tamperedVerify.reason === 'HASH_MISMATCH' && tamperedVerify.index === 1) {
        console.log('[PASS] Tamper detection successful (Hash mismatch detected)');
    } else {
        console.error('[FAIL] Tamper detection failed:', tamperedVerify);
        process.exit(1);
    }

    // 7. Verify Immutability (In-memory)
    const entries = ledger.getEntries();
    try {
        entries[0].actionType = 'MALICIOUS_TYPE';
        console.error('[FAIL] Entry object is NOT frozen');
        process.exit(1);
    } catch (e) {
        console.log('[PASS] Entry object is frozen (Immutability check passed)');
    }

    console.log('\n--- ALL COMPLIANCE CHECKS PASSED ---');

    // Cleanup
    fs.unlinkSync(registryPath);
    fs.unlinkSync(ledgerPath);
    fs.unlinkSync(tamperedPath);
}

runTest().catch(err => {
    console.error('Test errored:', err);
    process.exit(1);
});
