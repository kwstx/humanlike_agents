/**
 * TrustGraph
 * 
 * Maps influence relationships between agents based on activity ledger data.
 * Tracks delegation chains, collaboration frequency, and performance outcomes.
 * Provides analysis for central nodes, high-impact contributors, and systemic risk.
 */
class TrustGraph {
    constructor() {
        this.nodes = new Map(); // id -> agent data
        this.edges = []; // array of { source, target, type, weight, metadata }
        this.collaborationMatrix = new Map(); // (id1, id2) -> count
    }

    /**
     * Builds the graph from an AgentActivityLedger or a list of entries.
     * @param {Array|Object} ledgerData - Either an array of entries or an object with 'entries' property.
     * @param {Map} [agentIdentities] - Optional map of id -> PersistentAgentIdentity for trust scores.
     */
    buildFromLedger(ledgerData, agentIdentities = new Map()) {
        const entries = Array.isArray(ledgerData) ? ledgerData : (ledgerData.entries || []);

        for (const entry of entries) {
            const agentId = entry.agentId;
            const actionType = entry.actionType;
            const details = entry.details || {};

            // Ensure node exists
            this._ensureNode(agentId, agentIdentities.get(agentId));

            switch (actionType) {
                case 'DELEGATION':
                    if (details.delegatedTo) {
                        this._ensureNode(details.delegatedTo, agentIdentities.get(details.delegatedTo));
                        this.addEdge(agentId, details.delegatedTo, 'DELEGATION', 1, {
                            scope: details.scope,
                            timestamp: entry.timestamp
                        });
                    }
                    break;

                case 'NEGOTIATION':
                    if (details.counterparty) {
                        this._ensureNode(details.counterparty, agentIdentities.get(details.counterparty));
                        this.addEdge(agentId, details.counterparty, 'COLLABORATION', 1, {
                            type: 'NEGOTIATION',
                            timestamp: entry.timestamp
                        });
                        this._incrementCollaboration(agentId, details.counterparty);
                    }
                    break;

                case 'COOPERATION':
                    const partners = Array.isArray(details.partners) ? details.partners : (details.partners ? [details.partners] : []);
                    partners.forEach(partnerId => {
                        this._ensureNode(partnerId, agentIdentities.get(partnerId));
                        this.addEdge(agentId, partnerId, 'COLLABORATION', 1, {
                            type: 'COOPERATION',
                            outcome: details.outcome,
                            timestamp: entry.timestamp
                        });
                        this._incrementCollaboration(agentId, partnerId);
                    });
                    break;

                case 'ECONOMIC':
                    const node = this.nodes.get(agentId);
                    node.performance.revenue += details.revenue || 0;
                    node.performance.pnl += details.pnl || 0;
                    node.performance.count++;
                    break;

                case 'POLICY_VIOLATION':
                    const vNode = this.nodes.get(agentId);
                    vNode.performance.violations++;
                    break;
            }
        }
    }

    _ensureNode(id, identity = null) {
        if (!this.nodes.has(id)) {
            this.nodes.set(id, {
                id,
                trustScore: identity ? identity.getTrustScore() : 0.5,
                trustProfile: identity ? identity.performance.trustProfile : null,
                performance: {
                    revenue: 0,
                    pnl: 0,
                    violations: 0,
                    count: 0
                },
                connections: {
                    in: 0,
                    out: 0
                }
            });
        } else if (identity) {
            // Update identity if provided later
            const node = this.nodes.get(id);
            node.trustScore = identity.getTrustScore();
            node.trustProfile = identity.performance.trustProfile;
        }
    }

    addEdge(source, target, type, weight = 1, metadata = {}) {
        this.edges.push({ source, target, type, weight, metadata });

        const sNode = this.nodes.get(source);
        const tNode = this.nodes.get(target);

        if (sNode) sNode.connections.out++;
        if (tNode) tNode.connections.in++;
    }

    _incrementCollaboration(id1, id2) {
        const key = [id1, id2].sort().join('<->');
        this.collaborationMatrix.set(key, (this.collaborationMatrix.get(key) || 0) + 1);
    }

    /**
     * Detects central nodes based on degree and collaboration frequency.
     * @returns {Array} List of central nodes sorted by importance
     */
    getCentralNodes() {
        return Array.from(this.nodes.values()).map(node => {
            const collabScore = Array.from(this.collaborationMatrix.entries())
                .filter(([key]) => key.includes(node.id))
                .reduce((sum, [, count]) => sum + count, 0);

            return {
                id: node.id,
                totalDegree: node.connections.in + node.connections.out,
                inDegree: node.connections.in,
                outDegree: node.connections.out,
                collabFrequency: collabScore,
                centralityIndex: (node.connections.in * 1.5) + node.connections.out + (collabScore * 2)
            };
        }).sort((a, b) => b.centralityIndex - a.centralityIndex);
    }

    /**
     * Identifies high-impact contributors based on economic performance and success rates.
     */
    getHighImpactContributors() {
        return Array.from(this.nodes.values()).map(node => {
            // Calculate average PNL per action
            const avgPnl = node.performance.count > 0 ? node.performance.pnl / node.performance.count : 0;

            // Calculate success rate from COOPERATION edges
            const coopEdges = this.edges.filter(e => (e.source === node.id || e.target === node.id) && e.type === 'COLLABORATION');
            const successes = coopEdges.filter(e => e.metadata.outcome === 'SUCCESS').length;
            const successRate = coopEdges.length > 0 ? successes / coopEdges.length : 1.0;

            return {
                id: node.id,
                pnl: node.performance.pnl,
                revenue: node.performance.revenue,
                avgPnl,
                successRate,
                impactScore: (node.performance.pnl * 0.1) + (successRate * 100) + (node.performance.count * 5),
                trustScore: node.trustScore
            };
        }).sort((a, b) => b.impactScore - a.impactScore);
    }

    /**
     * Detects potential systemic risk clusters.
     * Risk factors: Low trust scores, high violations, dense connections among low-trust nodes.
     */
    getRiskClusters() {
        const clusters = [];
        const lowTrustNodes = Array.from(this.nodes.values()).filter(n => n.trustScore < 0.4 || n.performance.violations > 0);

        // Simple clustering: find connected components of low-trust nodes
        const visited = new Set();

        for (const node of lowTrustNodes) {
            if (visited.has(node.id)) continue;

            const cluster = [];
            const queue = [node.id];
            visited.add(node.id);

            while (queue.length > 0) {
                const currentId = queue.shift();
                cluster.push(this.nodes.get(currentId));

                // Find neighbors that are also in lowTrustNodes
                const neighbors = this.edges
                    .filter(e => e.source === currentId || e.target === currentId)
                    .map(e => e.source === currentId ? e.target : e.source);

                for (const neighborId of neighbors) {
                    if (!visited.has(neighborId) && lowTrustNodes.some(n => n.id === neighborId)) {
                        visited.add(neighborId);
                        queue.push(neighborId);
                    }
                }
            }

            if (cluster.length > 0) {
                const avgTrust = cluster.reduce((sum, n) => sum + n.trustScore, 0) / cluster.length;
                const totalViolations = cluster.reduce((sum, n) => sum + n.performance.violations, 0);

                clusters.push({
                    nodes: cluster.map(n => n.id),
                    size: cluster.length,
                    averageTrust: avgTrust,
                    totalViolations,
                    riskLevel: (1 - avgTrust) * cluster.length + (totalViolations * 2)
                });
            }
        }

        return clusters.sort((a, b) => b.riskLevel - a.riskLevel);
    }

    /**
     * Traces delegation chains starting from a specific agent or all seeds.
     * @param {string} [startId] - Optional starting agent ID.
     * @returns {Array} List of chains (arrays of IDs).
     */
    getDelegationChains(startId = null) {
        const chains = [];
        const seeds = startId ? [startId] : Array.from(this.nodes.values())
            .filter(n => n.connections.in === 0 && n.connections.out > 0)
            .map(n => n.id);

        const traverse = (currentId, currentChain) => {
            const children = this.edges
                .filter(e => e.source === currentId && e.type === 'DELEGATION')
                .map(e => e.target);

            if (children.length === 0) {
                if (currentChain.length > 1) chains.push([...currentChain]);
                return;
            }

            for (const childId of children) {
                if (currentChain.includes(childId)) {
                    // Prevent infinite loops in case of circular delegation
                    chains.push([...currentChain, childId + " (LOOP)"]);
                    continue;
                }
                traverse(childId, [...currentChain, childId]);
            }
        };

        for (const seedId of seeds) {
            traverse(seedId, [seedId]);
        }

        return chains;
    }

    /**
     * Returns the full graph structure.
     */
    toJSON() {
        return {
            nodes: Array.from(this.nodes.values()),
            edges: this.edges,
            summary: {
                totalNodes: this.nodes.size,
                totalEdges: this.edges.length,
                centralNodes: this.getCentralNodes().slice(0, 5),
                highImpact: this.getHighImpactContributors().slice(0, 5),
                riskClusters: this.getRiskClusters(),
                delegationChains: this.getDelegationChains()
            }
        };
    }
}

export default TrustGraph;
