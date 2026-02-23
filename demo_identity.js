import PersistentAgentIdentity from './src/identity/models/PersistentAgentIdentity.js';
import crypto from 'node:crypto';

// 1. Simulate generating a cryptographic key pair for an agent
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

console.log("--- Initializing New Agent Identity ---");

// 2. Create the PersistentAgentIdentity (Initial state)
const agentIdentity = new PersistentAgentIdentity({
    publicKey: publicKey,
    originSystem: "Orchestrator-Alpha-9"
});

console.log("Agent ID:", agentIdentity.id);
console.log("Initial Trust Score:", agentIdentity.performance.trustScore);
console.log("Initial Authority:", agentIdentity.getAuthorityLevel());

// 3. Simulate Economic Performance Update
console.log("\n--- Recording Economic Activity & P&L Update ---");
const performingAgent = agentIdentity.updatePerformance({
    pnl: {
        totalRevenue: 5000,
        totalExpenses: 1200
    },
    roi: 316.6,
    budgetEfficiency: 0.95,
    cooperationScore: 0.88
}, "QUARTERLY_PERFORMANCE_REVIEW");

console.log("Updated P&L:", performingAgent.performance.pnl);
console.log("New Trust Score:", performingAgent.performance.trustScore);
console.log("New Authority:", performingAgent.getAuthorityLevel());

// 4. Simulate Low Performance (Impact on Trust)
console.log("\n--- Simulating Performance Drop (Penalty) ---");
const restrictedAgent = performingAgent.updatePerformance({
    budgetEfficiency: 0.4,
    cooperationScore: 0.1, // Agent became uncooperative
    roi: -20
}, "INCIDENT_REPORT_UNCOOPERATIVE_BEHAVIOR");

console.log("Degraded Trust Score:", restrictedAgent.performance.trustScore);
console.log("Authority Level:", restrictedAgent.getAuthorityLevel());

// 5. Traceability Check
console.log("\n--- Identity Traceability (Version 1 -> 2 -> 3) ---");
console.log("Current version:", restrictedAgent.metadata.identityVersion);
console.log("Latest Action:", restrictedAgent.metadata.versionHistory[restrictedAgent.metadata.versionHistory.length - 1].action);
console.log("Total History Events:", restrictedAgent.metadata.versionHistory.length);

// 6. Cryptographic Verification (Remains valid across performance updates)
console.log("\n--- Cryptographic Verification ---");
const message = "Action Request: Allocate 100 Credits";
const signature = crypto.sign("sha256", Buffer.from(message), {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
}).toString('hex');

const isVerified = restrictedAgent.verifySignature(message, signature);
console.log("Message Verified:", isVerified);
