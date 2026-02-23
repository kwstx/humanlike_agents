import TrustGraph from './src/identity/reputation/TrustGraph.js';
import AgentActivityLedger from './src/identity/governance/AgentActivityLedger.js';
import AgentIdentityRegistry from './src/identity/AgentIdentityRegistry.js';
import crypto from 'node:crypto';

// 1. Initialize Registry and Identities
const registry = new AgentIdentityRegistry({ storePath: './test_identities.json' });

function createMockIdentity(id) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
    });
    return {
        identity: registry.registerIdentity({ publicKey, originSystem: 'demo-system' }),
        privateKey
    };
}

// Create a few agents
const agents = {
    orchestrator: createMockIdentity('orchestrator'),
    workerA: createMockIdentity('worker-a'),
    workerB: createMockIdentity('worker-b'),
    riskyAgent: createMockIdentity('risky-agent'),
    partnerX: createMockIdentity('partner-x')
};

// 2. Initialize Ledger and populate with diverse activities
const ledger = new AgentActivityLedger(registry);

// Orchestrator delegates to workers
ledger.addEntry({
    agentId: agents.orchestrator.identity.id,
    publicKey: agents.orchestrator.identity.publicKey,
    privateKey: agents.orchestrator.privateKey,
    actionType: 'DELEGATION',
    details: { delegatedTo: agents.workerA.identity.id, scope: 'COMPUTE', rationale: 'Task 1' }
});

ledger.addEntry({
    agentId: agents.orchestrator.identity.id,
    publicKey: agents.orchestrator.identity.publicKey,
    privateKey: agents.orchestrator.privateKey,
    actionType: 'DELEGATION',
    details: { delegatedTo: agents.workerB.identity.id, scope: 'STORAGE', rationale: 'Task 2' }
});

// Workers collaborate
ledger.addEntry({
    agentId: agents.workerA.identity.id,
    publicKey: agents.workerA.identity.publicKey,
    privateKey: agents.workerA.privateKey,
    actionType: 'COOPERATION',
    details: { partners: [agents.workerB.identity.id], outcome: 'SUCCESS', notes: 'Shared cache access' }
});

// High performance activities
for (let i = 0; i < 5; i++) {
    ledger.addEntry({
        agentId: agents.workerA.identity.id,
        publicKey: agents.workerA.identity.publicKey,
        privateKey: agents.workerA.privateKey,
        actionType: 'ECONOMIC',
        details: { revenue: 1000, pnl: 800, txId: `tx-a-${i}` }
    });
}

// Risky behavior
ledger.addEntry({
    agentId: agents.riskyAgent.identity.id,
    publicKey: agents.riskyAgent.identity.publicKey,
    privateKey: agents.riskyAgent.privateKey,
    actionType: 'POLICY_VIOLATION',
    details: { policyId: 'P-1', severity: 'HIGH', description: 'Unauthorized resource access' }
});

ledger.addEntry({
    agentId: agents.riskyAgent.identity.id,
    publicKey: agents.riskyAgent.identity.publicKey,
    privateKey: agents.riskyAgent.privateKey,
    actionType: 'COOPERATION',
    details: { partners: [agents.partnerX.identity.id], outcome: 'FAILURE', notes: 'Incomplete handshake' }
});

// Update risky agent identity to have lower trust manually for the demo
const updatedRisky = agents.riskyAgent.identity.updatePerformance({ reliability: 0.2 }, 'MANUAL_DOWNGRADE');
registry.registerIdentity({
    publicKey: updatedRisky.publicKey,
    originSystem: updatedRisky.originSystem,
    id: updatedRisky.id,
    metadata: updatedRisky.metadata,
    performance: updatedRisky.performance
});

// 3. Build and Analyze TrustGraph
const graph = new TrustGraph();

// Map of identities for the graph to use trust scores
const identityMap = new Map();
Object.values(agents).forEach(a => {
    const idObj = registry.getIdentityById(a.identity.id);
    identityMap.set(idObj.id, idObj);
});

graph.buildFromLedger(ledger.getEntries(), identityMap);

// 4. Output Analysis
console.log("=== TRUST GRAPH ANALYSIS ===");
console.log(`Total Nodes: ${graph.nodes.size}`);
console.log(`Total Edges: ${graph.edges.length}`);

console.log("\n--- CENTRAL NODES (Influence) ---");
graph.getCentralNodes().forEach((n, i) => {
    console.log(`${i + 1}. ${n.id} | Centrality: ${n.centralityIndex.toFixed(2)} | In/Out: ${n.inDegree}/${n.outDegree}`);
});

console.log("\n--- HIGH-IMPACT CONTRIBUTORS ---");
graph.getHighImpactContributors().forEach((n, i) => {
    console.log(`${i + 1}. ${n.id} | Impact Score: ${n.impactScore.toFixed(2)} | Success Rate: ${(n.successRate * 100).toFixed(0)}% | PNL: ${n.pnl}`);
});

console.log("\n--- SYSTEMIC RISK CLUSTERS ---");
const clusters = graph.getRiskClusters();
if (clusters.length === 0) {
    console.log("No high-risk clusters detected.");
} else {
    clusters.forEach((c, i) => {
        console.log(`${i + 1}. Risk Level: ${c.riskLevel.toFixed(2)} | Nodes: ${c.nodes.join(', ')}`);
        console.log(`   Avg Trust: ${c.averageTrust.toFixed(4)} | Total Violations: ${c.totalViolations}`);
    });
}

// Export the graph to a JSON file for visualization (simulated)
import fs from 'node:fs';
fs.writeFileSync('trust_graph_export.json', JSON.stringify(graph.toJSON(), null, 2));
console.log("\nGraph exported to trust_graph_export.json");
