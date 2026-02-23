import PersistentAgentIdentity from './src/identity/models/PersistentAgentIdentity.js';
import crypto from 'node:crypto';

// 1. Simulate generating a cryptographic key pair for an agent
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

console.log("--- Initializing New Agent Identity ---");

// 2. Create the PersistentAgentIdentity
const agentIdentity = new PersistentAgentIdentity({
    publicKey: publicKey,
    originSystem: "Orchestrator-Alpha-9"
});

console.log("Agent ID:", agentIdentity.id);
console.log("Origin System:", agentIdentity.originSystem);
console.log("Created At:", agentIdentity.metadata.creationTimestamp);
console.log("Identity Version:", agentIdentity.metadata.identityVersion);

// 3. Demonstrate traceability via version history
console.log("\n--- Upgrading Identity (Migration Example) ---");
const upgradedIdentity = agentIdentity.upgrade(
    "SYSTEM_MIGRATION",
    "Agent migrated from local cluster to cloud-native orchestration."
);

console.log("New Version:", upgradedIdentity.metadata.identityVersion);
console.log("Version History:", JSON.stringify(upgradedIdentity.metadata.versionHistory, null, 2));

// 4. Cryptographic Verification Demo
console.log("\n--- Cryptographic Verification ---");
const message = "Action Request: Allocate 100 Credits";
const signature = crypto.sign("sha256", Buffer.from(message), {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
}).toString('hex');

const isVerified = upgradedIdentity.verifySignature(message, signature);
console.log("Message Verified:", isVerified);

// 5. Immutability Check (Optional)
try {
    upgradedIdentity.metadata.identityVersion = "hack-version";
} catch (e) {
    console.log("\n[Success] Immutability check passed: Metadata is frozen.");
}
