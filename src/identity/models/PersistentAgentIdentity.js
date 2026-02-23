import crypto from 'node:crypto';
import TrustScoringEngine from '../reputation/TrustScoringEngine.js';
import AdaptiveGovernanceEngine from '../governance/AdaptiveGovernanceEngine.js';

/**
 * PersistentAgentIdentity
 * 
 * Represents a globally unique, cryptographically verifiable identifier for an autonomous agent.
 * Designed to be persistent across sessions, deployments, and orchestration layers.
 * 
 * Now extended to include economic performance and cooperative metrics as first-class identity attributes.
 */
class PersistentAgentIdentity {
    /**
     * @param {Object} config
     * @param {string} config.publicKey - The agent's cryptographic public key (PEM or hex format).
     * @param {string} config.originSystem - The identifier of the system/platform where the identity was first created.
     * @param {string} [config.id] - Override ID (only for loading existing identities).
     * @param {Object} [config.metadata] - Optional existing metadata for reconstruction.
     * @param {Object} [config.performance] - Optional performance metrics for reconstruction.
     */
    constructor({ publicKey, originSystem, id = null, metadata = null, performance = null }) {
        if (!publicKey) {
            throw new Error("Cryptographic public key is mandatory for PersistentAgentIdentity.");
        }
        if (!originSystem) {
            throw new Error("Origin system must be specified for traceability.");
        }

        // Assign globally unique ID (using SHA-256 hash of the public key for cryptographic linkage)
        this.id = id || `did:agent:${this._generateKeyFingerprint(publicKey)}`;

        this.publicKey = publicKey;
        this.originSystem = originSystem;

        // Immutable Metadata
        if (metadata) {
            this.metadata = metadata;
        } else {
            const timestamp = new Date().toISOString();
            this.metadata = {
                creationTimestamp: timestamp,
                identityVersion: "1.0.0",
                versionHistory: [
                    {
                        version: "1.0.0",
                        timestamp: timestamp,
                        action: "IDENTITY_INITIALIZED",
                        details: `Identity created on ${originSystem}`
                    }
                ]
            };
        }

        // Economic and Performance Metrics (First-class attributes)
        if (performance) {
            this.performance = performance;
        } else {
            this.performance = {
                pnl: {
                    totalRevenue: 0,
                    totalExpenses: 0,
                    netProfit: 0
                },
                budgetEfficiency: 1.0,
                roi: 0.0,
                cooperationScore: 1.0,
                reliability: 1.0,
                uptime: 1.0,
                consistency: 1.0,
                policyViolations: 0,
                complianceHistory: 1.0,
                riskExposure: 0.05,
                taskSuccessRate: 1.0,
                taskComplexityScore: 0.0,
                trustProfile: null, // To be calculated
                lastUpdated: this.metadata.creationTimestamp
            };
            // Initial calculation
            this.performance.trustProfile = TrustScoringEngine.calculateScore(this.performance);
            this.performance.trustScore = this.performance.trustProfile.composite;
        }

        // Freeze instances to enforce immutability of the identity state
        Object.freeze(this.metadata);
        Object.freeze(this.metadata.versionHistory);
        Object.freeze(this.performance);
        Object.freeze(this.performance.pnl);
    }

    /**
     * Generates a unique fingerprint for the public key.
     * @param {string} publicKey 
     * @returns {string} hex hash
     * @private
     */
    _generateKeyFingerprint(publicKey) {
        return crypto.createHash('sha256').update(publicKey).digest('hex');
    }

    /**
     * Updates performance metrics and returns a NEW identity instance.
     * This ensures the identity remains a verifiable snapshot while evolving.
     * 
     * @param {Object} updates - New metrics to merge
     * @param {string} reason - The reason for the performance update
     * @returns {PersistentAgentIdentity}
     */
    updatePerformance(updates, reason = "PERFORMANCE_SYNC") {
        const nextPNL = {
            ...this.performance.pnl,
            ...(updates.pnl || {})
        };

        // Recalculate net profit if revenue or expenses changed
        nextPNL.netProfit = nextPNL.totalRevenue - nextPNL.totalExpenses;

        const nextPerformance = {
            ...this.performance,
            ...updates,
            pnl: nextPNL,
            lastUpdated: new Date().toISOString()
        };

        // Recalculate trust profile using the dedicated engine
        nextPerformance.trustProfile = TrustScoringEngine.calculateScore(nextPerformance, this.metadata.versionHistory);
        nextPerformance.trustScore = nextPerformance.trustProfile.composite;

        return this.upgrade(reason, `Metrics updated: Composite Trust now ${nextPerformance.trustScore.toFixed(3)}`, null, nextPerformance);
    }

    /**
     * @deprecated Use TrustScoringEngine.calculateScore
     */
    _calculateTrustScore(p) {
        return TrustScoringEngine.calculateScore(p).composite;
    }

    /**
     * Gets the trust score for a specific context, or the composite score.
     * 
     * @param {string} [context] 
     * @returns {number}
     */
    getTrustScore(context = null) {
        if (context && this.performance.trustProfile && this.performance.trustProfile.contexts[context] !== undefined) {
            return this.performance.trustProfile.contexts[context];
        }
        return this.performance.trustScore;
    }

    /**
     * Returns the authority level of the agent based on its trust score.
     * Used for delegation decisions.
     * 
     * @param {string} [context] - Optional reputation context (e.g., 'financial', 'compliance')
     */
    getAuthorityLevel(context = null) {
        const score = this.getTrustScore(context);
        return AdaptiveGovernanceEngine.getGovernanceProfile(score).level;
    }

    /**
     * Returns the full governance profile (limits, permissions, context)
     * based on current trust score.
     * 
     * @param {string} [context] - Optional reputation context (e.g., 'financial', 'compliance')
     * @returns {Object}
     */
    getGovernanceProfile(context = null) {
        const score = this.getTrustScore(context);
        const profile = AdaptiveGovernanceEngine.getGovernanceProfile(score);

        if (context) {
            profile.reputationContext = context;
        }

        return profile;
    }

    /**
     * Logs a version change and returns a NEW instance.
     */
    upgrade(action, details, newVersion = null, updatedPerformance = null) {
        const nextVersion = newVersion || this._incrementVersion(this.metadata.identityVersion);
        const newHistory = [
            ...this.metadata.versionHistory,
            {
                version: nextVersion,
                timestamp: new Date().toISOString(),
                action: action,
                details: details
            }
        ];

        return new PersistentAgentIdentity({
            id: this.id,
            publicKey: this.publicKey,
            originSystem: this.originSystem,
            metadata: {
                ...this.metadata,
                identityVersion: nextVersion,
                versionHistory: newHistory
            },
            performance: updatedPerformance || this.performance
        });
    }

    _incrementVersion(version) {
        const parts = version.split('.');
        parts[2] = parseInt(parts[2]) + 1;
        return parts.join('.');
    }

    /**
     * Export the identity to a plain object.
     */
    toObject() {
        return {
            id: this.id,
            publicKey: this.publicKey,
            originSystem: this.originSystem,
            metadata: this.metadata,
            performance: this.performance,
            authority: this.getAuthorityLevel(),
            governance: this.getGovernanceProfile()
        };
    }

    /**
     * Cryptographically verify if a message was signed by this identity's public key.
     */
    verifySignature(message, signature) {
        try {
            return crypto.verify(
                "sha256",
                Buffer.from(message),
                {
                    key: this.publicKey,
                    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
                },
                Buffer.from(signature, 'hex')
            );
        } catch (error) {
            console.error("Signature verification failed:", error.message);
            return false;
        }
    }
}

export default PersistentAgentIdentity;
