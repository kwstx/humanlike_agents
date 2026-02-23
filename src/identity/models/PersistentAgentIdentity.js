import crypto from 'node:crypto';

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
                budgetEfficiency: 1.0, // Default to neutral/optimal
                roi: 0.0,
                cooperationScore: 1.0, // Default to cooperative
                trustScore: 0.5,        // Initial baseline trust
                lastUpdated: this.metadata.creationTimestamp
            };
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

        // Recalculate trust score based on new performance data
        nextPerformance.trustScore = this._calculateTrustScore(nextPerformance);

        return this.upgrade(reason, `Metrics updated: Trust Score now ${nextPerformance.trustScore.toFixed(3)}`, null, nextPerformance);
    }

    /**
     * Core logic for determining agent trust based on economic and behavioral data.
     * @private
     */
    _calculateTrustScore(p) {
        // Simple weighted model:
        // 30% Economic Profitability (ROI/PNL trend)
        // 30% Budget Efficiency
        // 40% Cooperative contribution

        const economicFactor = Math.min(Math.max(p.roi / 100, 0), 1); // Normalize ROI
        const efficiencyFactor = Math.min(Math.max(p.budgetEfficiency, 0), 1);
        const cooperationFactor = Math.min(Math.max(p.cooperationScore, 0), 1);

        const score = (economicFactor * 0.3) + (efficiencyFactor * 0.3) + (cooperationFactor * 0.4);
        return parseFloat(score.toFixed(4));
    }

    /**
     * Returns the authority level of the agent based on its trust score.
     * Used for delegation decisions.
     */
    getAuthorityLevel() {
        const score = this.performance.trustScore;
        if (score >= 0.9) return "ELITE_AUTHORITY";
        if (score >= 0.7) return "HIGH_TRUST";
        if (score >= 0.4) return "STANDARD_OPERATIONAL";
        if (score >= 0.2) return "RESTRICTED";
        return "PROBATIONARY";
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
            authority: this.getAuthorityLevel()
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
