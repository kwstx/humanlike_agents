/**
 * PreExecutionValidator
 * 
 * Evaluates proposed actions/proposals against trust-based security policies,
 * economic thresholds, and consensus requirements.
 * 
 * The validation strictness and risk tolerance are dynamically adjusted
 * based on the agent's current composite trust score and governance profile.
 */
class PreExecutionValidator {
    /**
     * Validation Strictness Mapping
     * Defines how different strictness levels translate to internal logic.
     */
    static STRICTNESS_LEVELS = {
        LAX: {
            riskTolerance: 0.9,     // Highly tolerant of experimental or high-risk actions
            economicSafetyMargin: 1.05, // 5% buffer on top of limits
            policyCheckIntensity: 0.1, // Minimal checks
            consensusRequired: false,
            minConfirmations: 0
        },
        STANDARD: {
            riskTolerance: 0.6,
            economicSafetyMargin: 1.0, // Strict adherence to limits
            policyCheckIntensity: 0.5,
            consensusRequired: false,
            minConfirmations: 0
        },
        STRICT: {
            riskTolerance: 0.3,
            economicSafetyMargin: 0.85, // 15% safety margin (lower actual limit)
            policyCheckIntensity: 0.8,
            consensusRequired: true,
            minConfirmations: 1 // Requires at least one peer or supervisor
        },
        HIGH_FRICTION: {
            riskTolerance: 0.1,
            economicSafetyMargin: 0.7,  // 30% safety margin
            policyCheckIntensity: 1.0, // Exhaustive checks
            consensusRequired: true,
            minConfirmations: 3 // High consensus required
        },
        MANDATORY_HUMAN_IN_THE_LOOP: {
            riskTolerance: 0.0,
            economicSafetyMargin: 0.5,
            policyCheckIntensity: 1.0,
            consensusRequired: true,
            requiresHumanApproval: true,
            minConfirmations: 5
        }
    };

    /**
     * Validates a proposal for execution.
     * 
     * @param {PersistentAgentIdentity} agent - The agent proposing the action
     * @param {Object} proposal - The proposal details
     * @param {string} proposal.type - Type of action (e.g., 'TRANSACTION', 'SELF_MODIFICATION', 'DELEGATION')
     * @param {number} proposal.impactScore - Estimated impact (0.0 to 1.0)
     * @param {number} proposal.riskScore - Estimated risk (0.0 to 1.0)
     * @param {number} [proposal.cost] - Financial cost if applicable
     * @param {Array} [proposal.policyTags] - Tags representing policies this action touches
     * @returns {Object} { allowed: boolean, validationResults: Object, reason: string }
     */
    static validate(agent, proposal) {
        const profile = agent.getGovernanceProfile();
        const strictness = profile.validationStrictness;
        const config = this.STRICTNESS_LEVELS[strictness] || this.STRICTNESS_LEVELS.STANDARD;

        const results = {
            riskCheck: this._validateRisk(proposal, config),
            economicCheck: this._validateEconomics(proposal, config, profile),
            policyCheck: this._validatePolicies(proposal, config),
            consensusCheck: this._validateConsensus(proposal, config, agent.performance.trustScore)
        };

        const failedChecks = Object.entries(results)
            .filter(([_, res]) => !res.passed)
            .map(([name, res]) => `${name}: ${res.reason}`);

        const isAllowed = failedChecks.length === 0;

        return {
            allowed: isAllowed,
            strictnessLevel: strictness,
            validationResults: results,
            reason: isAllowed ? "VALIDATION_PASSED" : `VALIDATION_FAILED: ${failedChecks.join("; ")}`
        };
    }

    /**
     * Risk-based validation
     */
    static _validateRisk(proposal, config) {
        const adjustedRisk = proposal.riskScore || 0;

        if (adjustedRisk > config.riskTolerance) {
            return {
                passed: false,
                reason: `Risk score ${adjustedRisk} exceeds tolerance ${config.riskTolerance} for this trust level.`
            };
        }

        return { passed: true };
    }

    /**
     * Economic threshold validation
     */
    static _validateEconomics(proposal, config, profile) {
        if (!proposal.cost) return { passed: true };

        const threshold = profile.budget.singleTransactionLimit * config.economicSafetyMargin;

        if (proposal.cost > threshold) {
            return {
                passed: false,
                reason: `Cost ${proposal.cost} exceeds adjusted economic threshold ${threshold.toFixed(2)} (Safety Margin: ${config.economicSafetyMargin}).`
            };
        }

        return { passed: true };
    }

    /**
     * Multi-dimensional policy checks (simulated intensity)
     */
    static _validatePolicies(proposal, config) {
        const intensity = config.policyCheckIntensity;
        const policyTags = proposal.policyTags || [];

        // Stricter policy checks: More rules are applied as intensity increases
        if (intensity > 0.4 && policyTags.includes('HIGH_PRIVILEGE')) {
            // Even at standard levels, privileged actions have some base rules
            if (proposal.impactScore > 0.7) return { passed: false, reason: "Privileged action exceeds standard impact threshold." };
        }

        if (intensity > 0.7) {
            // Highly strict checks for low-trust agents
            if (policyTags.includes('INFRASTRUCTURE')) {
                return { passed: false, reason: "Infrastructure modifications strictly prohibited for agents with high-friction strictness." };
            }
            if (policyTags.length > 3) {
                return { passed: false, reason: "Excessive policy complexity not permitted for restricted agents." };
            }
        }

        if (intensity > 0.9 && policyTags.includes('SENSITIVE_DATA')) {
            return { passed: false, reason: "Sensitive data access strictly prohibited for probationary agents." };
        }

        return { passed: true };
    }

    /**
     * Consensus and Confirmation validation
     */
    static _validateConsensus(proposal, config, trustScore) {
        const impact = proposal.impactScore || 0;

        // High impact actions by low trust agents ALWAYS require consensus even if strictness doesn't mandate it
        const impactThreshold = trustScore * 0.8; // Lower trust = lower threshold for "high impact"
        const requiresConsensus = config.consensusRequired || (impact > impactThreshold);

        if (requiresConsensus) {
            const currentConfirmations = proposal.confirmations || 0;
            const minNeeded = Math.max(config.minConfirmations, impact > 0.7 ? 2 : 0);

            if (currentConfirmations < minNeeded) {
                return {
                    passed: false,
                    reason: `Multi-agent confirmation required. Need ${minNeeded}, have ${currentConfirmations}.`
                };
            }

            if (config.requiresHumanApproval && !proposal.humanApproved) {
                return {
                    passed: false,
                    reason: `Final human-in-the-loop approval required.`
                };
            }
        }

        return { passed: true };
    }
}

export default PreExecutionValidator;
