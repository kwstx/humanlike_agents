/**
 * PredictiveSynergyEngine
 * 
 * Implements Predictive Cooperative Intelligence for the agent governance ecosystem.
 * Analyzes the TrustGraph and AgentActivityLedger to forecast future performance,
 * synergy probabilities between agents, and systemic risk trends.
 */
class PredictiveSynergyEngine {
    /**
     * @param {TrustGraph} trustGraph - The current state of agent relationships.
     */
    constructor(trustGraph) {
        this.trustGraph = trustGraph;
    }

    /**
     * Calculates the predicted synergy between two agents if they were to collaborate.
     * 
     * @param {string} agentId1 
     * @param {string} agentId2 
     * @returns {Object} Forecasted synergy data
     */
    forecastSynergy(agentId1, agentId2) {
        const node1 = this.trustGraph.nodes.get(agentId1);
        const node2 = this.trustGraph.nodes.get(agentId2);

        if (!node1 || !node2) {
            return { synergyProbability: 0.5, reason: "One or both agents unknown to graph." };
        }

        // 1. Historical Affinity
        const collabKey = [agentId1, agentId2].sort().join('<->');
        const historicalCount = this.trustGraph.collaborationMatrix.get(collabKey) || 0;

        // Find historical outcomes
        const historicalEdges = this.trustGraph.edges.filter(e =>
            (e.source === agentId1 && e.target === agentId2) ||
            (e.source === agentId2 && e.target === agentId1) &&
            e.type === 'COLLABORATION'
        );

        const successRate = historicalEdges.length > 0
            ? historicalEdges.filter(e => e.metadata.outcome === 'SUCCESS').length / historicalEdges.length
            : 0.8; // Default optimistic prior for new pairings

        // 2. Complementary Dimensions (e.g. one is high competence, other is high compliance)
        const profile1 = node1.trustProfile?.dimensions || {};
        const profile2 = node2.trustProfile?.dimensions || {};

        // Cooperation Score Correlation
        const coop1 = profile1.cooperation || 0.5;
        const coop2 = profile2.cooperation || 0.5;
        const compatibility = (coop1 + coop2) / 2;

        // 3. Predicted Economic Surplus
        const avgPnl1 = node1.performance.count > 0 ? node1.performance.pnl / node1.performance.count : 0;
        const avgPnl2 = node2.performance.count > 0 ? node2.performance.pnl / node2.performance.count : 0;
        const predictedPnl = (avgPnl1 + avgPnl2) * synergyBoost(historicalCount);

        function synergyBoost(count) {
            if (count === 0) return 1.0;
            if (count < 5) return 1.1;
            return 1.25; // "Old friends" bonus
        }

        const confidence = historicalCount > 0 ? Math.min(0.5 + (historicalCount * 0.1), 0.95) : 0.4;

        return {
            pair: [agentId1, agentId2],
            synergyProbability: parseFloat(((successRate * 0.6) + (compatibility * 0.4)).toFixed(4)),
            predictedOutcome: successRate > 0.7 ? 'SUCCESS' : 'STABLE',
            predictedEconomicSurplus: parseFloat(predictedPnl.toFixed(4)),
            confidence: parseFloat(confidence.toFixed(4)),
            recommendation: (successRate * compatibility) > 0.6 ? 'PROMOTE_COLLABORATION' : 'MONITORED_COOPERATION'
        };
    }

    /**
     * Forecasts the trust score of an agent for the next period based on recent trends.
     * 
     * @param {string} agentId 
     * @param {Array} history - Array of { timestamp, score }
     * @returns {Object} Trend analysis
     */
    predictPerformanceTrend(agentId, history = []) {
        if (history.length < 2) {
            return { trend: 'STABLE', predictedScore: 0.5, confidence: 0.1 };
        }

        // Sort by timestamp
        const sorted = [...history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const first = sorted[0].score;
        const last = sorted[sorted.length - 1].score;

        const delta = last - first;
        const velocity = delta / sorted.length;

        const predicted = Math.min(Math.max(last + velocity, 0), 1);

        let trend = 'STABLE';
        if (velocity > 0.05) trend = 'RISING';
        if (velocity < -0.05) trend = 'DECAYING';

        return {
            agentId,
            currentScore: last,
            predictedScore: parseFloat(predicted.toFixed(4)),
            velocity: parseFloat(velocity.toFixed(4)),
            trend,
            riskAlert: trend === 'DECAYING' && predicted < 0.4
        };
    }

    /**
     * Analyzes the graph for "Influence Concentration" risk.
     * Identifies nodes that, if they fail or turn malicious, could compromise a large portion of the network.
     */
    forecastSystemicRisk() {
        const centralNodes = this.trustGraph.getCentralNodes();
        const clusters = this.trustGraph.getRiskClusters();

        // Identify "Single Points of Failure"
        // Nodes with high out-degree (many depend on them) but trending decay or low trust.
        const criticalRisks = centralNodes
            .filter(node => node.centralityIndex > 20)
            .map(node => {
                const graphNode = this.trustGraph.nodes.get(node.id);
                return {
                    id: node.id,
                    centrality: node.centralityIndex,
                    trustScore: graphNode.trustScore,
                    vulnerabilityScore: (node.centralityIndex / 100) * (1 - graphNode.trustScore)
                };
            })
            .sort((a, b) => b.vulnerabilityScore - a.vulnerabilityScore);

        return {
            timestamp: new Date().toISOString(),
            globalRiskIndex: clusters.reduce((sum, c) => sum + c.riskLevel, 0) / (this.trustGraph.nodes.size || 1),
            criticalVulnerabilities: criticalRisks.slice(0, 3),
            riskClusters: clusters.length
        };
    }

    /**
     * Identifies potential "Hidden Synergies" - pairs of agents who haven't 
     * collaborated yet but have highly compatible multi-dimensional profiles.
     */
    discoverHiddenSynergies(limit = 5) {
        const proposals = [];
        const ids = Array.from(this.trustGraph.nodes.keys());

        for (let i = 0; i < ids.length; i++) {
            for (let j = i + 1; j < ids.length; j++) {
                const id1 = ids[i];
                const id2 = ids[j];

                const collabKey = [id1, id2].sort().join('<->');
                if (this.trustGraph.collaborationMatrix.has(collabKey)) continue;

                const forecast = this.forecastSynergy(id1, id2);
                if (forecast.synergyProbability > 0.75) {
                    proposals.push(forecast);
                }
            }
        }

        return proposals
            .sort((a, b) => b.synergyProbability - a.synergyProbability)
            .slice(0, limit);
    }
}

export default PredictiveSynergyEngine;
