import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import IdentityReputationAPI from './src/api/IdentityReputationAPI.js';

async function runDemo() {
    console.log("--- IdentityReputationAPI Standalone Demo ---");

    // Setup paths
    const tempDir = path.resolve(process.cwd(), 'temp_test_api');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const identityStorePath = path.resolve(tempDir, 'test_identities.json');
    const ledgerPath = path.resolve(tempDir, 'test_ledger.json');

    // cleanup old files
    if (fs.existsSync(identityStorePath)) fs.unlinkSync(identityStorePath);
    if (fs.existsSync(ledgerPath)) fs.unlinkSync(ledgerPath);

    const api = new IdentityReputationAPI({
        identityStorePath,
        ledgerPath,
        loadExistingLedger: false
    });

    // 1. Generate keys for a new agent
    console.log("\n1. Generating cryptographic keys for 'Agent-001'...");
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    // 2. Register Agent
    console.log("2. Registering agent with the API...");
    const identity = api.registerAgent({
        id: 'agent-001',
        publicKey,
        originSystem: 'TestNetwork-Alpha',
        metadata: { identityVersion: '1.0.0', type: 'trader' }
    });
    console.log(`   Registered: ${identity.id} on ${identity.originSystem}`);

    // 3. Get initial Trust Score
    console.log("\n3. Fetching Initial Trust Score...");
    const initialScore = api.getTrustScore('agent-001');
    console.log(`   Composite Score: ${initialScore.composite}`);
    console.log(`   Dimensions:`, initialScore.dimensions);

    // 4. Record Actions (and auto-update reputation)
    console.log("\n4. Recording actions in the ledger...");

    // Successful Collaboration
    console.log("   Recording 'COOPERATIVE_COLLABORATION' (SUCCESS)...");
    api.recordAction({
        agentId: 'agent-001',
        publicKey,
        privateKey,
        actionType: 'COOPERATIVE_COLLABORATION',
        details: {
            partners: ['agent-002'],
            outcome: 'SUCCESS',
            quality: 0.95,
            cooperationScore: 1.0
        }
    });

    // High Economic Performance
    console.log("   Recording 'ECONOMIC_OUTCOME' (Profitable)...");
    api.recordAction({
        agentId: 'agent-001',
        publicKey,
        privateKey,
        actionType: 'ECONOMIC_OUTCOME',
        details: {
            pnl: 5000,
            revenue: 12000,
            quality: 0.9
        }
    });

    // 5. Verify Reputation Evolution
    console.log("\n5. Fetching Updated Trust Score...");
    const updatedScore = api.getTrustScore('agent-001');
    console.log(`   New Composite Score: ${updatedScore.composite} (Initial was ${initialScore.composite})`);
    console.log(`   Technical Context Score: ${updatedScore.contexts.technical}`);

    // 6. Signature Validation check
    console.log("\n6. Validating a signed message...");
    const testMessage = "Verify this action";
    const signature = crypto.sign('sha256', Buffer.from(testMessage), {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING
    }).toString('hex');

    const validation = api.validateIdentitySignature({
        agentId: 'agent-001',
        message: testMessage,
        signature
    });
    console.log(`   Validation Result: ${validation.valid ? 'PASSED' : 'FAILED'}`);

    // 7. Get Activity History
    console.log("\n7. Fetching Activity History...");
    const history = api.getActivityHistory('agent-001');
    console.log(`   Entries found: ${history.length}`);
    history.forEach(e => console.log(`   - [${e.timestamp}] ${e.actionType}: ${JSON.stringify(e.details)}`));

    // 8. Trust Graph Analysis
    console.log("\n8. Generating Trust Graph...");
    const graph = api.getTrustGraph();
    console.log(`   Nodes: ${graph.nodes.length}, Edges: ${graph.edges.length}`);
    if (graph.summary.highImpact.length > 0) {
        console.log(`   Top Contributor: ${graph.summary.highImpact[0].id} (Impact: ${graph.summary.highImpact[0].impactScore.toFixed(2)})`);
    }

    console.log("\n--- Demo Complete ---");
}

runDemo().catch(console.error);
