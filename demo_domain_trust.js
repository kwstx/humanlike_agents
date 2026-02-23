import PersistentAgentIdentity from './src/identity/models/PersistentAgentIdentity.js';
import PreExecutionValidator from './src/identity/governance/PreExecutionValidator.js';
import crypto from 'node:crypto';

// Setup keys
const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' }
});

console.log("=================================================================");
console.log("   DOMAIN-SPECIFIC TRUST & REPUTATION CONVERSATION DEMO   ");
console.log("=================================================================\n");

// 1. Initialize an agent that is technically proficient but poor at compliance
const mixedAgent = new PersistentAgentIdentity({
    publicKey: publicKey,
    originSystem: "Cluster-7",
    performance: {
        reliability: 0.95,
        uptime: 0.98,
        consistency: 0.92,
        // High competence metrics
        taskSuccessRate: 0.99,
        taskComplexityScore: 0.85,
        // Strong efficiency
        budgetEfficiency: 0.98,
        roi: 450,
        // POOR compliance metrics
        policyViolations: 4,
        complianceHistory: 0.3,
        riskExposure: 0.7,
        // Moderate cooperation
        cooperationScore: 0.5,
        pnl: { totalRevenue: 10000, totalExpenses: 2000, netProfit: 8000 }
    }
});

// Calculate the actual scores based on the metrics
const identity = mixedAgent.updatePerformance({}, "INITIAL_VALIDATION");

console.log("Agent Identity Initialized.");
console.log(`Composite Trust Score: ${identity.performance.trustScore.toFixed(3)}`);
console.log("\n--- Domain-Specific Reputation Contexts ---");
const contexts = identity.performance.trustProfile.contexts;
Object.entries(contexts).forEach(([context, score]) => {
    console.log(`${context.toUpperCase().padEnd(15)}: ${score.toFixed(3)}`);
});

console.log("\n--- Nuanced Governance Evaluation ---");

// Action: Moderate-risk resource allocation
const proposal = {
    type: "RESOURCE_ALLOCATION",
    impactScore: 0.6,
    riskScore: 0.5,
    cost: 5000,
    policyTags: ["FINANCIAL", "INFRASTRUCTURE"]
};

// Evaluate in TECHNICAL context (Expected: HIGH trust, likely allowed)
console.log("\nScenario A: Evaluating action in TECHNICAL context...");
const techResult = PreExecutionValidator.validate(identity, proposal, "technical");
console.log(`Result: ${techResult.allowed ? "✅ APPROVED" : "❌ REJECTED"}`);
console.log(`Reason: ${techResult.reason}`);
console.log(`Strictness Level: ${techResult.strictnessLevel}`);

// Evaluate in COMPLIANCE context (Expected: LOW trust, likely rejected)
console.log("\nScenario B: Evaluating SAME action in COMPLIANCE-SENSITIVE context...");
const compResult = PreExecutionValidator.validate(identity, proposal, "compliance");
console.log(`Result: ${compResult.allowed ? "✅ APPROVED" : "❌ REJECTED"}`);
console.log(`Reason: ${compResult.reason}`);
console.log(`Strictness Level: ${compResult.strictnessLevel}`);

// Evaluate in FINANCIAL context
console.log("\nScenario C: Evaluating in FINANCIAL context...");
const finResult = PreExecutionValidator.validate(identity, proposal, "financial");
console.log(`Result: ${finResult.allowed ? "✅ APPROVED" : "❌ REJECTED"}`);
console.log(`Reason: ${finResult.reason}`);

console.log("\n=================================================================");
console.log("   DEMO COMPLETE: Nuanced Governance working as intended.   ");
console.log("=================================================================");
