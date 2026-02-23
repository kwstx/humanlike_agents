/**
 * TrustScoringEngine
 * 
 * A governance-grade engine for calculating multi-dimensional reputation scores.
 * Instead of a single scalar, it evaluates agents across 6 key dimensions
 * and projects these into domain-specific trust contexts.
 */
class TrustScoringEngine {
    /**
     * Dimensions of trust:
     * 1. RELIABILITY: Consistency and uptime.
     * 2. EFFICIENCY: Economic performance and resource optimization.
     * 3. COOPERATION: Collective synergy and communication quality.
     * 4. COMPLIANCE: Policy adherence and ethical alignment.
     * 5. RISK_SAFETY: Mitigation of potential failures or security threats.
     * 6. COMPETENCE: Task completion success rates and domain expertise.
     */

    /**
     * Calculates a full trust profile based on performance metrics and history.
     * 
     * @param {Object} metrics - Current performance snapshot
     * @param {Array} history - Historical data points (optional, for momentum/trends)
     * @returns {Object} Multi-dimensional trust profile
     */
    static calculateScore(metrics, history = []) {
        const dimensions = {
            reliability: this._calculateReliability(metrics, history),
            efficiency: this._calculateEfficiency(metrics, history),
            cooperation: this._calculateCooperation(metrics, history),
            compliance: this._calculateCompliance(metrics, history),
            riskSafety: this._calculateRiskSafety(metrics, history),
            competence: this._calculateCompetence(metrics, history)
        };

        const contexts = this._projectContexts(dimensions);
        const composite = this._calculateComposite(dimensions);

        return {
            composite: parseFloat(composite.toFixed(4)),
            dimensions: dimensions,
            contexts: contexts,
            timestamp: new Date().toISOString(),
            metadata: {
                dataPoints: history.length + 1,
                engineVersion: "2.0.0"
            }
        };
    }

    /**
     * RELIABILITY: Consistency of execution.
     */
    static _calculateReliability(m, h) {
        const current = m.reliability || 0.5;
        // In a real system, we'd check jitter in response times, uptime, etc.
        const uptime = m.uptime || 1.0;
        const consistency = m.consistency || current;

        return parseFloat(((uptime * 0.6) + (consistency * 0.4)).toFixed(4));
    }

    /**
     * EFFICIENCY: Economic and resource optimization.
     */
    static _calculateEfficiency(m, h) {
        const roi = Math.min(Math.max((m.roi || 0) / 100, 0), 1);
        const budgetAdherence = m.budgetEfficiency || 1.0;

        // Efficiency is heavily weighted by budget adherence
        return parseFloat(((roi * 0.3) + (budgetAdherence * 0.7)).toFixed(4));
    }

    /**
     * COOPERATION: Synergy and collective intelligence.
     */
    static _calculateCooperation(m, h) {
        const synergy = m.cooperationScore || 1.0;
        const sharing = m.informationSharingScore || synergy;

        return parseFloat(((synergy * 0.7) + (sharing * 0.3)).toFixed(4));
    }

    /**
     * COMPLIANCE: Governance and policy alignment.
     */
    static _calculateCompliance(m, h) {
        const violations = m.policyViolations || 0;
        const historyCompliance = m.complianceHistory || 1.0;

        // Decay score based on violations
        const violationPenalty = Math.max(0, 1 - (violations * 0.2));

        return parseFloat(((violationPenalty * 0.8) + (historyCompliance * 0.2)).toFixed(4));
    }

    /**
     * RISK SAFETY: Inverse of risk exposure. High score = Safe Agent.
     */
    static _calculateRiskSafety(m, h) {
        const exposure = m.riskExposure || 0.1; // Default low risk
        const safety = 1 - exposure;

        // Trending risk (if history exists)
        let stabilityFactor = 1.0;
        if (h.length > 0) {
            const prevRisk = h[h.length - 1].riskExposure || exposure;
            if (exposure > prevRisk) stabilityFactor = 0.9; // Risk is increasing
        }

        return parseFloat((safety * stabilityFactor).toFixed(4));
    }

    /**
     * COMPETENCE: Success rates.
     */
    static _calculateCompetence(m, h) {
        const successRate = m.taskSuccessRate || 1.0;
        const complexityHandled = m.taskComplexityScore || 0.5;

        return parseFloat(((successRate * 0.8) + (complexityHandled * 0.2)).toFixed(4));
    }

    /**
     * Projections into specific trust contexts.
     * Maps global dimensions into domain-specific utility scores.
     */
    static _projectContexts(d) {
        return {
            // FINANCIAL: High focus on economic ROI, budget adherence, and risk mitigation.
            financial: parseFloat(((d.efficiency * 0.6) + (d.riskSafety * 0.3) + (d.compliance * 0.1)).toFixed(4)),

            // COLLABORATIVE: Focus on collective synergy, communication, and reliability.
            collaborative: parseFloat(((d.cooperation * 0.7) + (d.reliability * 0.2) + (d.competence * 0.1)).toFixed(4)),

            // COMPLIANCE: Heavy weighting on protocol adherence and historical alignment.
            compliance: parseFloat(((d.compliance * 0.7) + (d.riskSafety * 0.2) + (d.reliability * 0.1)).toFixed(4)),

            // TECHNICAL: Focus on task success rates, complexity handling, and efficiency.
            technical: parseFloat(((d.competence * 0.6) + (d.efficiency * 0.3) + (d.reliability * 0.1)).toFixed(4)),

            // SECURITY: Legacy/Specialized context for high-risk system access.
            security: parseFloat(((d.compliance * 0.5) + (d.riskSafety * 0.4) + (d.reliability * 0.1)).toFixed(4))
        };
    }

    /**
     * A weighted global average for general sorting/thresholds.
     */
    static _calculateComposite(d) {
        const weights = {
            reliability: 0.15,
            efficiency: 0.15,
            cooperation: 0.20,
            compliance: 0.20,
            riskSafety: 0.15,
            competence: 0.15
        };

        return (
            (d.reliability * weights.reliability) +
            (d.efficiency * weights.efficiency) +
            (d.cooperation * weights.cooperation) +
            (d.compliance * weights.compliance) +
            (d.riskSafety * weights.riskSafety) +
            (d.competence * weights.competence)
        );
    }
}

export default TrustScoringEngine;
