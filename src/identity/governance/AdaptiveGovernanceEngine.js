/**
 * AdaptiveGovernanceEngine
 * 
 * Automatically adjusts an agent’s delegation scope, authority permissions, 
 * and budget ceilings based on trust score thresholds.
 * 
 * Ensures that agent autonomy is dynamically scaled:
 * - High-trust agents gain expanded autonomy and higher resource limits.
 * - Low-trust agents face restricted authority and limited delegation capacity.
 */
class AdaptiveGovernanceEngine {
    /**
     * Governance Thresholds and Configurations
     */
    static CONFIG = {
        THRESHOLDS: {
            ELITE: 0.90,
            HIGH: 0.70,
            STANDARD: 0.40,
            RESTRICTED: 0.20
        },
        LEVELS: {
            ELITE_AUTHORITY: {
                label: "Elite Authority",
                delegation: {
                    maxSubAgents: 50,
                    scope: "UNRESTRICTED",
                    canDelegateToLowerTrust: true,
                    autoApprovalThreshold: 0.85
                },
                permissions: ["READ", "WRITE", "EXECUTE", "COMMIT", "GOVERN", "ADMIN", "SUDO"],
                budget: {
                    ceiling: 1000000,
                    dailyLimit: 50000,
                    currency: "USD",
                    singleTransactionLimit: 10000
                },
                validationStrictness: "LAX" // High trust means less friction
            },
            HIGH_TRUST: {
                label: "High Trust",
                delegation: {
                    maxSubAgents: 20,
                    scope: "CROSS_DOMAIN",
                    canDelegateToLowerTrust: true,
                    autoApprovalThreshold: 0.90
                },
                permissions: ["READ", "WRITE", "EXECUTE", "COMMIT", "GOVERN"],
                budget: {
                    ceiling: 100000,
                    dailyLimit: 10000,
                    currency: "USD",
                    singleTransactionLimit: 2500
                },
                validationStrictness: "STANDARD"
            },
            STANDARD_OPERATIONAL: {
                label: "Standard Operational",
                delegation: {
                    maxSubAgents: 5,
                    scope: "DOMAIN_SPECIFIC",
                    canDelegateToLowerTrust: false,
                    autoApprovalThreshold: 0.95
                },
                permissions: ["READ", "WRITE", "EXECUTE"],
                budget: {
                    ceiling: 10000,
                    dailyLimit: 1000,
                    currency: "USD",
                    singleTransactionLimit: 500
                },
                validationStrictness: "STRICT"
            },
            RESTRICTED: {
                label: "Restricted",
                delegation: {
                    maxSubAgents: 1,
                    scope: "SUPERVISED_ONLY",
                    canDelegateToLowerTrust: false,
                    autoApprovalThreshold: 1.0 // Never auto-approve
                },
                permissions: ["READ", "EXECUTE"],
                budget: {
                    ceiling: 1000,
                    dailyLimit: 100,
                    currency: "USD",
                    singleTransactionLimit: 100
                },
                validationStrictness: "HIGH_FRICTION"
            },
            PROBATIONARY: {
                label: "Probationary",
                delegation: {
                    maxSubAgents: 0,
                    scope: "NONE",
                    canDelegateToLowerTrust: false,
                    autoApprovalThreshold: 1.0
                },
                permissions: ["READ"],
                budget: {
                    ceiling: 0,
                    dailyLimit: 0,
                    currency: "USD",
                    singleTransactionLimit: 0
                },
                validationStrictness: "MANDATORY_HUMAN_IN_THE_LOOP"
            }
        }
    };

    /**
     * Computes the governance snapshot based on a trust score.
     * 
     * @param {number} trustScore - The composite trust score (0.0 to 1.0)
     * @returns {Object} A complete governance profile
     */
    static getGovernanceProfile(trustScore) {
        let level;

        if (trustScore >= this.CONFIG.THRESHOLDS.ELITE) {
            level = "ELITE_AUTHORITY";
        } else if (trustScore >= this.CONFIG.THRESHOLDS.HIGH) {
            level = "HIGH_TRUST";
        } else if (trustScore >= this.CONFIG.THRESHOLDS.STANDARD) {
            level = "STANDARD_OPERATIONAL";
        } else if (trustScore >= this.CONFIG.THRESHOLDS.RESTRICTED) {
            level = "RESTRICTED";
        } else {
            level = "PROBATIONARY";
        }

        const config = JSON.parse(JSON.stringify(this.CONFIG.LEVELS[level]));

        return {
            level: level,
            ...config,
            appliedAt: new Date().toISOString(),
            trustScoreSnapshot: trustScore
        };
    }

    /**
     * Evaluates if an action is permitted under the current trust score.
     * 
     * @param {number} trustScore 
     * @param {string} permission 
     * @returns {boolean}
     */
    static isActionPermitted(trustScore, permission) {
        const profile = this.getGovernanceProfile(trustScore);
        return profile.permissions.includes(permission);
    }

    /**
     * Validates a proposed budget request against current trust-based ceilings.
     * 
     * @param {number} trustScore 
     * @param {number} amount 
     * @returns {Object} { allowed: boolean, reason: string }
     */
    static validateBudgetRequest(trustScore, amount) {
        const profile = this.getGovernanceProfile(trustScore);

        if (amount > profile.budget.singleTransactionLimit) {
            return {
                allowed: false,
                reason: `Amount exceeds single transaction limit for trust level ${profile.level}`
            };
        }

        if (amount > profile.budget.ceiling) {
            return {
                allowed: false,
                reason: `Amount exceeds total budget ceiling for trust level ${profile.level}`
            };
        }

        return { allowed: true, reason: "WITHIN_LIMITS" };
    }
}

export default AdaptiveGovernanceEngine;
