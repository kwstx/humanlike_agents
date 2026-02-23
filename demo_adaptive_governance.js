import PersistentAgentIdentity from './src/identity/models/PersistentAgentIdentity.js';
import PreExecutionValidator from './src/identity/governance/PreExecutionValidator.js';
import crypto from 'node:crypto';

// 1. Setup Agent
const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' }
});

console.log("====================================================");
console.log("   ADAPTIVE GOVERNANCE & VALIDATION DEMO            ");
console.log("====================================================\n");

let agent = new PersistentAgentIdentity({
    publicKey: publicKey,
    originSystem: "Governance-Core"
});

function displayGovernance(agent, label) {
    const profile = agent.getGovernanceProfile();
    console.log(`--- ${label} ---`);
    console.log(`Trust Score:    ${agent.performance.trustScore.toFixed(4)}`);
    console.log(`Authority:      ${profile.level} (${profile.label})`);
    console.log(`Strictness:     ${profile.validationStrictness}`);
    console.log("----------------------------------------------------\n");
}

function testValidation(agent, proposalLabel, proposal) {
    console.log(`\n>>> Testing Proposal: ${proposalLabel}`);
    const validation = PreExecutionValidator.validate(agent, proposal);

    if (validation.allowed) {
        console.log(`✅ [ALLOWED] ${validation.reason}`);
    } else {
        console.log(`❌ [DENIED]  ${validation.reason}`);
    }
}

// Proposals to test
const standardTransaction = {
    type: 'TRANSACTION',
    impactScore: 0.2,
    riskScore: 0.1,
    cost: 400
};

const highImpactAction = {
    type: 'SYSTEM_CONFIG',
    impactScore: 0.8,
    riskScore: 0.4,
    cost: 5000,
    policyTags: ['HIGH_PRIVILEGE', 'INFRASTRUCTURE']
};

const highRiskProposal = {
    type: 'EXPERIMENTAL_ALGO',
    impactScore: 0.5,
    riskScore: 0.8,
    cost: 200
};

// --- INITIAL STATE (STANDARD) ---
displayGovernance(agent, "INITIAL STATE (STANDARD)");
testValidation(agent, "Standard Tx (400 USD)", standardTransaction);
testValidation(agent, "High Impact Infra Change", highImpactAction);

// --- ELITE PERFORMANCE ---
console.log("\n>>> Simulation: Promoting agent to ELITE status...");
agent = agent.updatePerformance({
    taskSuccessRate: 1.0,
    reliability: 1.0,
    cooperationScore: 1.0,
    complianceHistory: 1.0
}, "EXCELLENT_PERFORMANCE");

displayGovernance(agent, "ELITE STATUS");
testValidation(agent, "High Impact Infra Change (as Elite)", highImpactAction);
testValidation(agent, "High Risk Proposal (as Elite)", highRiskProposal);

// --- CRITICAL SECURITY VIOLATION ---
console.log("\n>>> Simulation: Reporting critical security violations!");
agent = agent.updatePerformance({
    policyViolations: 5,
    riskExposure: 0.9,
    reliability: 0.3
}, "SECURITY_BREACH");

displayGovernance(agent, "POST-VIOLATION (RESTRICTED)");
testValidation(agent, "Standard Tx (400 USD)", standardTransaction);

// --- PROBATIONARY STATE ---
console.log("\n>>> Simulation: Total loss of trust...");
agent = agent.updatePerformance({
    policyViolations: 10,
    complianceHistory: 0.1,
    reliability: 0.1
}, "TOTAL_FAILURE");

displayGovernance(agent, "PROBATIONARY");
const minorTx = { ...standardTransaction, cost: 50 };
testValidation(agent, "Minor Tx (50 USD) during Probation", minorTx);

const majorActionWithConfirmations = {
    ...highImpactAction,
    confirmations: 2,
    humanApproved: false
};
testValidation(agent, "Major Action with 2 Confirmations (Probation)", majorActionWithConfirmations);
