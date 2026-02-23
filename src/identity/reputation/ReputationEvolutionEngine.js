/**
 * ReputationEvolutionEngine
 * 
 * A specialized engine for handling the temporal evolution of agent trust scores.
 * It ensures that reputation is not static but a living metric that responds to:
 * 1. INACTIVITY: Gradual decay of trust when an agent is idle.
 * 2. PERFORMANCE: Weighted recovery and impact based on recent actions.
 * 3. CONSISTENCY: Accelerated recovery for sustained high-quality behavior.
 */
class ReputationEvolutionEngine {
    /**
     * Configuration for evolution dynamics.
     */
    static CONFIG = {
        // Time-based Decay
        DECAY_RATE_DAILY: 0.015,         // 1.5% decay per day of inactivity
        DECAY_GRACE_PERIOD_HOURS: 18,    // No decay for the first 18 hours
        MIN_METRIC_FLOOR: 0.15,          // Metrics won't decay below this level

        // Action-based Impact
        RECENCY_WEIGHT: 0.65,             // Weight given to the newest action batch
        RECOVERY_ACCELERATION: 0.1,      // Bonus to recovery when history is high quality

        // Behavioral Sensitivity
        IMPACT_VOLATILITY: 1.2,          // Factor to amplify negative impacts vs positive
        CONSISTENCY_THRESHOLD: 0.85      // Quality level considered "consistent"
    };

    /**
     * Evolves the agent's performance metrics based on time and activity.
     * 
     * @param {Object} currentPerformance - Current metrics from the identity
     * @param {Array} recentActions - Array of recent action objects { type, details: { quality, success, etc } }
     * @returns {Object} A new performance object with evolved metrics
     */
    static evolve(currentPerformance, recentActions = []) {
        const now = new Date();
        const lastUpdated = currentPerformance.lastUpdated ? new Date(currentPerformance.lastUpdated) : now;
        const msSinceUpdate = now - lastUpdated;
        const daysSinceUpdate = msSinceUpdate / (1000 * 60 * 60 * 24);

        let evolved = { ...currentPerformance };

        // 1. Apply Inactivity Decay
        if (msSinceUpdate > (this.CONFIG.DECAY_GRACE_PERIOD_HOURS * 3600000)) {
            // Decay only applies to active-effort metrics, not historical counts or P&L
            evolved = this._applyTemporalDecay(evolved, daysSinceUpdate);
        }

        // 2. Incorporate New Activity (Recovery & Recency)
        if (recentActions && recentActions.length > 0) {
            evolved = this._processActivityImpact(evolved, recentActions);
        }

        // 3. Update metadata
        evolved.lastUpdated = now.toISOString();

        return evolved;
    }

    /**
     * Reduces metrics gradually over time.
     * Logic: P = P_0 * (1 - decay)^days
     * @private
     */
    static _applyTemporalDecay(performance, days) {
        const decayFactor = Math.pow(1 - this.CONFIG.DECAY_RATE_DAILY, days);
        const next = { ...performance };

        const decayableMetrics = [
            'reliability', 'cooperationScore', 'consistency',
            'taskSuccessRate', 'complianceHistory'
        ];

        decayableMetrics.forEach(metric => {
            if (next[metric] !== undefined) {
                const decayedValue = next[metric] * decayFactor;
                next[metric] = parseFloat(Math.max(this.CONFIG.MIN_METRIC_FLOOR, decayedValue).toFixed(4));
            }
        });

        // Risk exposure slightly increases with inactivity (unknown state)
        if (next.riskExposure !== undefined) {
            next.riskExposure = parseFloat(Math.min(0.4, next.riskExposure + (0.005 * days)).toFixed(4));
        }

        return next;
    }

    /**
     * Merges current state with recent performance data using weighted recency logic.
     * @private
     */
    static _processActivityImpact(performance, actions) {
        const next = { ...performance };
        const actionMetrics = this._aggregateActionMetrics(actions);
        const w = this.CONFIG.RECENCY_WEIGHT;

        // Weighted Moving Average for primary metrics
        // Ensures system adapts to behavioral changes rather than permanent penalties
        const blend = (oldVal, newVal) => {
            const weight = (newVal < oldVal) ? w * this.CONFIG.IMPACT_VOLATILITY : w;
            const finalizedWeight = Math.min(0.95, weight); // Cap weight to prevent single-action swings
            return (oldVal * (1 - finalizedWeight)) + (newVal * finalizedWeight);
        };

        if (actionMetrics.reliability !== undefined) {
            next.reliability = parseFloat(blend(next.reliability, actionMetrics.reliability).toFixed(4));
        }

        if (actionMetrics.successRate !== undefined) {
            next.taskSuccessRate = parseFloat(blend(next.taskSuccessRate, actionMetrics.successRate).toFixed(4));
        }

        if (actionMetrics.cooperation !== undefined) {
            next.cooperationScore = parseFloat(blend(next.cooperationScore, actionMetrics.cooperation).toFixed(4));
        }

        // Recovery through consistent high-quality performance
        if (actionMetrics.avgQuality >= this.CONFIG.CONSISTENCY_THRESHOLD) {
            // "Consistent Excellence" bonus
            const recoveryBonus = this.CONFIG.RECOVERY_ACCELERATION * (actionMetrics.avgQuality - 0.5);
            next.consistency = parseFloat(Math.min(1.0, next.consistency + recoveryBonus).toFixed(4));

            // Gradually heal compliance history if it was damaged
            if (next.complianceHistory < 1.0) {
                next.complianceHistory = parseFloat(Math.min(1.0, next.complianceHistory + 0.02).toFixed(4));
            }

            // Reduce risk exposure on proven good behavior
            next.riskExposure = parseFloat(Math.max(0.01, next.riskExposure - 0.01).toFixed(4));
        } else if (actionMetrics.avgQuality < 0.4) {
            // Accelerated penalty for poor performance
            next.consistency = parseFloat(Math.max(0.1, next.consistency - 0.1).toFixed(4));
        }

        return next;
    }

    /**
     * Converts a batch of actions into a normalized metric set.
     * @private
     */
    static _aggregateActionMetrics(actions) {
        if (!actions.length) return {};

        let succCount = 0;
        let coopSum = 0;
        let qualitySum = 0;

        actions.forEach(a => {
            const d = a.details || {};
            succCount += d.success ? 1 : 0;
            coopSum += d.cooperationScore !== undefined ? d.cooperationScore : (d.success ? 0.9 : 0.5);
            qualitySum += d.quality !== undefined ? d.quality : (d.success ? 0.95 : 0.2);
        });

        return {
            successRate: succCount / actions.length,
            reliability: Math.min(1.0, actions.length / 3), // Volume factor for reliability
            cooperation: coopSum / actions.length,
            avgQuality: qualitySum / actions.length
        };
    }
}

export default ReputationEvolutionEngine;
