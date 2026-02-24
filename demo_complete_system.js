import IdentityReputationAPI from './src/api/IdentityReputationAPI.js';
import AdaptiveGovernanceEngine from './src/identity/governance/AdaptiveGovernanceEngine.js';
import crypto from 'node:crypto';

async function runDemo() {
    console.log("=== Human-Like Agent Governance & Identity Ecosystem Demo ===\n");

    const api = new IdentityReputationAPI({
        basePath: process.cwd(),
        identityStorePath: './demo_identities.json',
        ledgerPath: './demo_ledger.json',
        loadExistingLedger: false
    });

    // 1. Generate keys for agents
    const { publicKey: pub1, privateKey: priv1 } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const { publicKey: pub2, privateKey: priv2 } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const { publicKey: pub3, privateKey: priv3 } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

    const pem1 = pub1.export({ type: 'spki', format: 'pem' });
    const pem2 = pub2.export({ type: 'spki', format: 'pem' });
    const pem3 = pub3.export({ type: 'spki', format: 'pem' });

    // 2. Register Agents (Identity & Economic Alignment)
    console.log("[1] Registering persistent identities...");
    const agentA = api.registerAgent({
        publicKey: pem1,
        originSystem: 'Alpha-Net',
        id: 'did:agent:alpha-prime',
        performance: { pnl: { totalRevenue: 100, totalExpenses: 20, netProfit: 80 }, roi: 4.0, taskSuccessRate: 0.95 }
    });

    const agentB = api.registerAgent({
        publicKey: pem2,
        originSystem: 'Beta-Grid',
        id: 'did:agent:beta-core',
        performance: { pnl: { totalRevenue: 50, totalExpenses: 40, netProfit: 10 }, roi: 0.25, taskSuccessRate: 0.70 }
    });

    const agentC = api.registerAgent({
        publicKey: pem3,
        originSystem: 'Gamma-Ray',
        id: 'did:agent:gamma-node',
        performance: { pnl: { totalRevenue: 10, totalExpenses: 90, netProfit: -80 }, roi: -0.8, taskSuccessRate: 0.4 }
    });

    console.log(`Agent A (Elite) Trust: ${agentA.getTrustScore().toFixed(4)}`);
    console.log(`Agent B (Standard) Trust: ${agentB.getTrustScore().toFixed(4)}`);
    console.log(`Agent C (Probationary) Trust: ${agentC.getTrustScore().toFixed(4)}\n`);

    // 3. Dynamic Governance Adaptation
    console.log("[2] Dynamic Governance Scaling...");
    const profileA = agentA.getGovernanceProfile();
    const profileC = agentC.getGovernanceProfile();

    console.log(`Agent A Level: ${profileA.label} | Budget Ceiling: $${profileA.budget.ceiling}`);
    console.log(`Agent C Level: ${profileC.label} | Budget Ceiling: $${profileC.budget.ceiling}\n`);

    // 4. Immutable Behavioral Ledger & Collaboration
    console.log("[3] Recording collaborative actions to immutable ledger...");
    api.recordAction({
        agentId: agentA.id,
        publicKey: pem1,
        privateKey: priv1,
        actionType: 'COOPERATIVE_COLLABORATION',
        details: { partners: [agentB.id], outcome: 'SUCCESS', quality: 0.9, cooperationScore: 1.0 }
    });

    api.recordAction({
        agentId: agentC.id,
        publicKey: pem3,
        privateKey: priv3,
        actionType: 'POLICY_VIOLATION',
        details: { violationType: 'SUDO_ESCALATION_ATTEMPT', severity: 'HIGH' }
    });

    // 5. Multi-dimensional Trust Evolution
    console.log("\n[4] Evolving scores based on behavior...");
    const updatedA = api.getTrustScore(agentA.id);
    const updatedC = api.getTrustScore(agentC.id);
    console.log(`Agent A New Trust: ${updatedA.composite.toFixed(4)}`);
    console.log(`Agent C New Trust: ${updatedC.composite.toFixed(4)}\n`);

    // 6. Predictive Cooperative Intelligence
    console.log("[5] Predictive Intelligence Analysis...");
    const synergy = api.forecastSynergy(agentA.id, agentB.id);
    console.log(`Predicted Synergy (A <-> B): ${synergy.synergyProbability.toFixed(4)}`);
    console.log(`Recommendation: ${synergy.recommendation}`);

    const risk = api.forecastSystemicRisk();
    console.log(`\nSystemic Risk Report:`);
    console.log(`- Global Risk Index: ${risk.globalRiskIndex.toFixed(4)}`);
    console.log(`- Critical Vulnerabilities: ${risk.criticalVulnerabilities.length}`);
    if (risk.criticalVulnerabilities.length > 0) {
        console.log(`  - Highest Risk Node: ${risk.criticalVulnerabilities[0].id} (Score: ${risk.criticalVulnerabilities[0].vulnerabilityScore.toFixed(4)})`);
    }

    const opportunities = api.discoverOpportunities();
    console.log(`\nHidden Synergy Discovery:`);
    opportunities.forEach(op => {
        console.log(`- Potential Duo: ${op.pair.join(' + ')} | Synergy: ${op.synergyProbability.toFixed(4)}`);
    });

    console.log("\n=== Demo Complete ===");
}

runDemo().catch(console.error);
