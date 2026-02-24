import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import IdentityReputationAPI from './src/api/IdentityReputationAPI.js';

async function runDemo() {
    const tempDir = path.resolve(process.cwd(), 'temp_test_api_debug');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const api = new IdentityReputationAPI({
        basePath: tempDir,
        loadExistingLedger: false
    });

    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    console.log("Registering...");
    api.registerAgent({ id: 'agent-001', publicKey, originSystem: 'Test' });

    console.log("Initial Score:", api.getTrustScore('agent-001').composite);

    console.log("Recording Action...");
    try {
        api.recordAction({
            agentId: 'agent-001',
            publicKey,
            privateKey,
            actionType: 'ECONOMIC_OUTCOME',
            details: { pnl: 100 }
        });
        console.log("Action recorded.");
    } catch (e) {
        console.error("FAILED to record action:", e);
    }
}

runDemo().catch(console.error);
