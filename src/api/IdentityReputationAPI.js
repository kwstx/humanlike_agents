import path from 'node:path';
import fs from 'node:fs';
import AgentIdentityRegistry from '../identity/AgentIdentityRegistry.js';
import AgentActivityLedger from '../identity/governance/AgentActivityLedger.js';
import TrustScoringEngine from '../identity/reputation/TrustScoringEngine.js';
import ReputationEvolutionEngine from '../identity/reputation/ReputationEvolutionEngine.js';
import TrustGraph from '../identity/reputation/TrustGraph.js';
import PredictiveSynergyEngine from '../identity/reputation/PredictiveSynergyEngine.js';

/**
 * IdentityReputationAPI
 * 
 * A standalone, high-level API for managing agent identities and reputation.
 * This module is fully decoupled from any specific orchestration system,
 * making it pluggable into different agent frameworks (Autonomous AI, 
 * Swarm implementations, or legacy multi-agent systems).
 * 
 * It aggregates registration, trust scoring, reputation evolution,
 * audit logging (ledger), and graph-based relationship analysis.
 */
class IdentityReputationAPI {
    /**
     * @param {Object} options
     * @param {string} options.basePath - Directory for persistent storage
     * @param {string} options.identityStorePath - Path to agent_identities.json
     * @param {string} options.ledgerPath - Path to agent_ledger.json
     * @param {boolean} options.loadExistingLedger - Whether to load data on startup (default: true)
     */
    constructor(options = {}) {
        this.basePath = options.basePath || process.cwd();

        // Initialize Identity Registry (manages keys and metadata)
        this.registry = new AgentIdentityRegistry({
            storePath: options.identityStorePath || path.resolve(this.basePath, 'agent_identities.json')
        });

        // Initialize Activity Ledger (immutable audit trail)
        this.ledgerPath = options.ledgerPath || path.resolve(this.basePath, 'agent_ledger.json');
        if (options.loadExistingLedger !== false && fs.existsSync(this.ledgerPath)) {
            try {
                this.ledger = AgentActivityLedger.loadFromFile(this.ledgerPath, this.registry);
            } catch (e) {
                console.warn(`[IdentityReputationAPI] Could not load ledger from ${this.ledgerPath}, starting fresh.`);
                this.ledger = new AgentActivityLedger(this.registry);
            }
        } else {
            this.ledger = new AgentActivityLedger(this.registry);
        }

        // Internal analysis components (rebuilt on demand)
        this.trustGraph = new TrustGraph();
        this.predictor = new PredictiveSynergyEngine(this.trustGraph);
    }

    /**
     * registerAgent
     * Issues a persistent persistent cryptographic identity to an agent.
     * 
     * @param {Object} params - Registration details { publicKey, originSystem, id, metadata, performance }
     * @returns {PersistentAgentIdentity} The newly created identity object
     */
    registerAgent({ publicKey, originSystem, id = null, metadata = null, performance = null }) {
        // Ensure metadata has the required identityVersion field if provided
        const finalMetadata = metadata ? {
            identityVersion: metadata.identityVersion || metadata.version || "1.0.0",
            ...metadata
        } : null;

        return this.registry.registerIdentity({ publicKey, originSystem, id, metadata: finalMetadata, performance });
    }

    /**
     * getTrustScore
     * Computes a dynamic multi-dimensional trust profile for an agent.
     * 
     * @param {string} agentId - The persistent ID of the agent
     * @returns {Object} Multi-dimensional profile { composite, dimensions, contexts, timestamp }
     */
    getTrustScore(agentId) {
        const identity = this.registry.getIdentityById(agentId);
        if (!identity) throw new Error(`Agent identity '${agentId}' not found.`);

        // Calculates trust based on current performance snapshot
        return TrustScoringEngine.calculateScore(identity.performance);
    }

    /**
     * updateReputation
     * Evolves an agent's reputation metrics based on recent activity and time decay.
     * 
     * @param {string} agentId - The agent being updated
     * @param {Array} recentActions - Array of action results to incorporate
     * @returns {Object} The updated performance metrics
     */
    updateReputation(agentId, recentActions = []) {
        const identity = this.registry.getIdentityById(agentId);
        if (!identity) throw new Error(`Agent identity '${agentId}' not found.`);

        // Use the identity's own evolutionary logic to ensure trust scores are recalculated
        const updatedIdentity = identity.updatePerformance({}, 'REPUTATION_UPDATE', recentActions);

        // Persist the change via registry migration
        this.registry.migrateIdentity(agentId, (raw) => {
            const obj = updatedIdentity.toObject();
            raw.performance = obj.performance;
            raw.metadata = obj.metadata;
            return raw;
        }, 'REPUTATION_UPDATE');

        return updatedIdentity.performance;
    }

    /**
     * getActivityHistory
     * Retrieves the behavioral ledger for a specific agent or the entire system.
     * 
     * @param {string} [agentId] - Optional filter for a specific agent
     * @returns {Array} List of ledger entries
     */
    getActivityHistory(agentId = null) {
        const entries = this.ledger.getEntries();
        if (agentId) {
            return entries.filter(e => e.agentId === agentId);
        }
        return entries;
    }

    /**
     * validateIdentitySignature
     * High-level validation of signed agent actions.
     * Includes identity lookup, revocation check, and cryptographic verification.
     * 
     * @param {Object} params - { agentId, publicKey, message, signature, timestamp, originSystem }
     * @returns {Object} { valid: boolean, reason: string, identity?: Object }
     */
    validateIdentitySignature({ agentId, publicKey, message, signature, timestamp, originSystem }) {
        return this.registry.validateAction({ agentId, publicKey, message, signature, timestamp, originSystem });
    }

    /**
     * getTrustGraph
     * Analyzes delegation chains and collaboration frequency to build a trust graph.
     * 
     * @returns {Object} Full graph structure with central nodes and risk clusters
     */
    getTrustGraph() {
        this.trustGraph = new TrustGraph();

        const identityMap = new Map();
        this.registry.listIdentityIds().forEach(id => {
            const identity = this.registry.getIdentityById(id);
            if (identity) identityMap.set(id, identity);
        });

        this.trustGraph.buildFromLedger(this.ledger, identityMap);
        return this.trustGraph.toJSON();
    }

    /**
     * recordAction
     * Convenience method to record an action in the ledger and automatically update reputation.
     * 
     * @param {Object} params - Action details including signature/privateKey
     * @returns {Object} The recorded ledger entry
     */
    recordAction(params) {
        const { agentId, actionType, details } = params;

        // 1. Log to immutable ledger
        const entry = this.ledger.addEntry(params);
        this.ledger.saveToFile(this.ledgerPath);

        // 2. Automatically trigger reputation update if it's a performance-related action
        if (['ECONOMIC_OUTCOME', 'COOPERATIVE_COLLABORATION', 'POLICY_VIOLATION'].includes(actionType)) {
            // Map ledger details to reputation action structure
            const reputationAction = {
                type: actionType,
                details: {
                    success: actionType === 'POLICY_VIOLATION' ? false : (details.outcome === 'SUCCESS' || details.pnl > 0),
                    quality: details.quality || (actionType === 'POLICY_VIOLATION' ? 0.1 : 0.8),
                    pnl: details.pnl || 0,
                    cooperationScore: details.cooperationScore || (actionType === 'COOPERATIVE_COLLABORATION' ? 1.0 : 0.5)
                }
            };
            this.updateReputation(agentId, [reputationAction]);
        }

        return entry;
    }

    /**
     * forecastSynergy
     * Predicts the outcome and synergy score for a collaboration between two agents.
     * 
     * @param {string} agentId1 
     * @param {string} agentId2 
     * @returns {Object} Forecast results
     */
    forecastSynergy(agentId1, agentId2) {
        this.getTrustGraph(); // Ensure graph is up-to-date
        this.predictor = new PredictiveSynergyEngine(this.trustGraph);
        return this.predictor.forecastSynergy(agentId1, agentId2);
    }

    /**
     * forecastSystemicRisk
     * Performs a system-wide risk assessment based on relationship structures.
     * 
     * @returns {Object} Risk analysis report
     */
    forecastSystemicRisk() {
        this.getTrustGraph(); // Ensure graph is up-to-date
        this.predictor = new PredictiveSynergyEngine(this.trustGraph);
        return this.predictor.forecastSystemicRisk();
    }

    /**
     * discoverOpportunities
     * Finds agents with high synergistic potential who have not yet collaborated.
     * 
     * @returns {Array} List of synergy proposals
     */
    discoverOpportunities() {
        this.getTrustGraph(); // Ensure graph is up-to-date
        this.predictor = new PredictiveSynergyEngine(this.trustGraph);
        return this.predictor.discoverHiddenSynergies();
    }
}

export default IdentityReputationAPI;
