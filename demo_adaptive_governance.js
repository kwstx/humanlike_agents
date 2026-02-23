import PersistentAgentIdentity from './src/identity/models/PersistentAgentIdentity.js';
import crypto from 'node:crypto';

// 1. Setup Agent
const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' }
});

console.log("====================================================");
console.log("   ADAPTIVE GOVERNANCE ENGINE DEMONSTRATION         ");
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
    console.log(`Permissions:    ${profile.permissions.join(", ")}`);
    console.log(`Budget Ceiling: ${profile.budget.currency} ${profile.budget.ceiling.toLocaleString()}`);
    console.log(`Tx Limit:       ${profile.budget.currency} ${profile.budget.singleTransactionLimit.toLocaleString()}`);
    console.log(`Delegation:     Max ${profile.delegation.maxSubAgents} sub-agents (${profile.delegation.scope})`);
    console.log(`Strictness:     ${profile.validationStrictness}`);
    console.log("----------------------------------------------------\n");
}

// Initial State (Standard/Operational usually)
displayGovernance(agent, "INITIAL STATE");

// 2. High Performance -> Level Up
console.log(">>> Simulation: Agent performing exceptionally well...");
agent = agent.updatePerformance({
    taskSuccessRate: 1.0,
    reliability: 1.0,
    cooperationScore: 0.95,
    budgetEfficiency: 1.0,
    roi: 50.0,
    taskComplexityScore: 0.9
}, "PERFORMANCE_EXCELLENCE");

displayGovernance(agent, "HIGH PERFORMANCE UPGRADE");

// 3. Security Breach / Policy Violation -> Restriction
console.log(">>> Simulation: Security breach and policy violations detected!");
agent = agent.updatePerformance({
    policyViolations: 4,
    complianceHistory: 0.3,
    riskExposure: 0.9,
    reliability: 0.4
}, "CRITICAL_SECURITY_VIOLATION");

displayGovernance(agent, "POST-INCIDENT RESTRICTION");

// 4. Recovery
console.log(">>> Simulation: Agent undergoing rehabilitation and supervised tasks...");
agent = agent.updatePerformance({
    policyViolations: 0,
    complianceHistory: 0.6,
    riskExposure: 0.2,
    reliability: 0.8,
    taskSuccessRate: 0.9
}, "RECOVERY_PHASE");

displayGovernance(agent, "RECOVERY PHASE");

// 5. Elite Status
console.log(">>> Simulation: Long-term elite performance...");
agent = agent.updatePerformance({
    taskSuccessRate: 1.0,
    reliability: 1.0,
    cooperationScore: 1.0,
    budgetEfficiency: 1.0,
    roi: 200.0,
    taskComplexityScore: 1.0,
    complianceHistory: 1.0,
    uptime: 1.0
}, "ELITE_ACHIEVEMENT");

displayGovernance(agent, "ELITE STATUS ARCHIEVED");
