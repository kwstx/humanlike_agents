import AgentIdentityRegistry from './src/identity/AgentIdentityRegistry.js';
import crypto from 'node:crypto';

// Generate a dummy RSA key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

const registry = new AgentIdentityRegistry({ storePath: './test_identities.json' });

console.log("--- Registering Identity ---");
const identity = registry.registerIdentity({
    publicKey,
    originSystem: 'test-environment-alpha',
    metadata: { name: 'AlphaAgent' }
});
console.log("Identity ID:", identity.id);

console.log("\n--- Validating Action ---");
const message = "ACTIVATE_CORE_PROTOCOL";
const signature = crypto.sign("sha256", Buffer.from(message), {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING
}).toString('hex');

const result = registry.validateAction({
    agentId: identity.id,
    message,
    signature,
    timestamp: new Date().toISOString()
});
console.log("Validation Result:", result.valid ? "SUCCESS" : "FAILED", result.reason || "");

console.log("\n--- Testing Spoofing Protection (Same Key, Different Origin) ---");
try {
    registry.registerIdentity({
        publicKey,
        originSystem: 'test-environment-beta'
    });
    console.log("Error: Should have failed to register same key on different origin");
} catch (e) {
    console.log("Success: Caught expected error:", e.message);
}

console.log("\n--- Testing Schema Versioning ---");
console.log("Global Registry Schema Version:", registry.store.meta.schemaVersion);
console.log("Identity Entry Schema Version:", registry.getRaw(identity.id).schemaVersion);

console.log("\n--- Testing Identity Revocation ---");
registry.revokeIdentity(identity.id, "Security cleanup");
const revCheck = registry.validateAction({
    agentId: identity.id,
    message: "SHOULD_FAIL",
    signature: "0000",
});
console.log("Revocation Check Validation Result:", revCheck.valid ? "FAILED (Should be invalid)" : "SUCCESS (Is invalid)", revCheck.reason || "");

process.exit(0);
