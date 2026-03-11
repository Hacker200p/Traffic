"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riskService = void 0;
const connection_1 = require("../../database/connection");
const logger_1 = require("../../common/logger");

/**
 * Weights used to compute the 0–100 risk score.
 *
 * violationBase     – points per violation regardless of severity
 * severityMultiplier– extra points keyed by severity
 * overspeedWeight   – max points from overspeeding frequency
 * patternWeight     – max points from repeated-offence / pattern score
 * recencyBoost      – multiplier bump for violations in the last 30 days
 */
const W = {
    violationBase: 2,
    severity: { low: 1, medium: 3, high: 8, critical: 15 },
    overspeedWeight: 30,
    patternWeight: 25,
    recencyBoost: 0.20,
};

function ratingFromScore(score) {
    if (score >= 76) return 'critical';
    if (score >= 51) return 'high';
    if (score >= 26) return 'medium';
    return 'low';
}

class RiskService {
    /* ── Calculate full risk profile for one vehicle ───────────────── */
    async calculateRiskProfile(vehicleId) {
        // 1. Violation breakdown (totals + by-severity + recent-30d)
        const violationResult = await connection_1.db.query(`
            SELECT
                COUNT(*)                                          AS total,
                COUNT(*) FILTER (WHERE severity = 'low')          AS low,
                COUNT(*) FILTER (WHERE severity = 'medium')       AS med,
                COUNT(*) FILTER (WHERE severity = 'high')         AS high,
                COUNT(*) FILTER (WHERE severity = 'critical')     AS crit,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS recent
            FROM violations
            WHERE vehicle_id = $1
        `, [vehicleId]);

        const v = violationResult.rows[0];
        const totalViolations  = parseInt(v.total, 10);
        const lowCount         = parseInt(v.low, 10);
        const medCount         = parseInt(v.med, 10);
        const highCount        = parseInt(v.high, 10);
        const critCount        = parseInt(v.crit, 10);
        const recentCount      = parseInt(v.recent, 10);

        // 2. Overspeed frequency – % of tracking points above speed limit (80 km/h default)
        const speedResult = await connection_1.db.query(`
            SELECT
                COUNT(*)                                  AS total_points,
                COUNT(*) FILTER (WHERE speed > 80)        AS overspeed_points,
                ROUND(AVG(speed)::numeric, 2)             AS avg_speed,
                ROUND(MAX(speed)::numeric, 2)             AS max_speed
            FROM tracking_points
            WHERE vehicle_id = $1
              AND speed IS NOT NULL AND speed > 0
        `, [vehicleId]);

        const s = speedResult.rows[0];
        const totalPoints    = parseInt(s.total_points, 10) || 1;
        const overspeedPts   = parseInt(s.overspeed_points, 10);
        const avgSpeed       = parseFloat(s.avg_speed) || 0;
        const maxSpeed       = parseFloat(s.max_speed) || 0;
        const overspeedRatio = overspeedPts / totalPoints; // 0..1

        // 3. Dangerous driving patterns – distinct violation types (repeated-offence diversity)
        const patternResult = await connection_1.db.query(`
            SELECT type, COUNT(*) AS cnt
            FROM violations
            WHERE vehicle_id = $1
            GROUP BY type
            ORDER BY cnt DESC
        `, [vehicleId]);

        const patternTypes   = patternResult.rows;
        const distinctTypes  = patternTypes.length;
        const maxRepeat      = patternTypes.length > 0 ? parseInt(patternTypes[0].cnt, 10) : 0;

        // ── Score computation ────────────────────────────────────────
        // A) Violation score – capped at 45
        const violationScore = Math.min(45,
            totalViolations * W.violationBase
            + lowCount  * W.severity.low
            + medCount  * W.severity.medium
            + highCount * W.severity.high
            + critCount * W.severity.critical
        );

        // B) Overspeed score – capped at 30
        const overspeedScore = Math.min(W.overspeedWeight, overspeedRatio * W.overspeedWeight * 1.5);

        // C) Pattern score – repeated-type diversity + repeat-count
        const patternScore = Math.min(W.patternWeight,
            distinctTypes * 3 + Math.min(15, maxRepeat * 2)
        );

        // D) Recency multiplier – boost if many recent violations
        const recencyMultiplier = 1 + (recentCount > 0 ? W.recencyBoost : 0);

        const rawScore = (violationScore + overspeedScore + patternScore) * recencyMultiplier;
        const riskScore = Math.min(100, Math.round(rawScore * 10) / 10);
        const riskRating = ratingFromScore(riskScore);

        const factors = {
            violationScore: Math.round(violationScore * 10) / 10,
            overspeedScore: Math.round(overspeedScore * 10) / 10,
            patternScore:   Math.round(patternScore * 10) / 10,
            recencyMultiplier,
            totalViolations,
            severityBreakdown: { low: lowCount, medium: medCount, high: highCount, critical: critCount },
            recentViolations: recentCount,
            overspeedRatio: Math.round(overspeedRatio * 1000) / 10, // percentage
            overspeedCount: overspeedPts,
            avgSpeed,
            maxSpeed,
            distinctViolationTypes: distinctTypes,
            topViolationType: patternTypes.length > 0 ? patternTypes[0].type : null,
        };

        return { vehicleId, riskScore, riskRating, factors };
    }

    /* ── Persist risk score into vehicles table + history ──────────── */
    async updateRiskScore(vehicleId) {
        const profile = await this.calculateRiskProfile(vehicleId);

        await connection_1.db.query(`
            UPDATE vehicles
            SET risk_score      = $2,
                risk_rating     = $3,
                violation_count = $4,
                overspeed_count = $5,
                risk_updated_at = NOW(),
                updated_at      = NOW()
            WHERE id = $1
        `, [
            vehicleId,
            profile.riskScore,
            profile.riskRating,
            profile.factors.totalViolations,
            profile.factors.overspeedCount,
        ]);

        await connection_1.db.query(`
            INSERT INTO vehicle_risk_history (vehicle_id, risk_score, risk_rating, factors)
            VALUES ($1, $2, $3, $4)
        `, [vehicleId, profile.riskScore, profile.riskRating, JSON.stringify(profile.factors)]);

        logger_1.logger.info('Risk score updated', { vehicleId, score: profile.riskScore, rating: profile.riskRating });
        return profile;
    }

    /* ── Get stored profile (fast read) ───────────────────────────── */
    async getRiskProfile(vehicleId) {
        return this.calculateRiskProfile(vehicleId);
    }

    /* ── Risk score history for a vehicle ─────────────────────────── */
    async getRiskHistory(vehicleId, limit = 30) {
        const result = await connection_1.db.query(`
            SELECT risk_score, risk_rating, factors, calculated_at
            FROM vehicle_risk_history
            WHERE vehicle_id = $1
            ORDER BY calculated_at DESC
            LIMIT $2
        `, [vehicleId, limit]);
        return result.rows;
    }

    /* ── Batch recalculate all vehicles ────────────────────────────── */
    async recalculateAll() {
        const vehicles = await connection_1.db.query('SELECT id FROM vehicles');
        let updated = 0;
        for (const v of vehicles.rows) {
            await this.updateRiskScore(v.id);
            updated++;
        }
        logger_1.logger.info('Batch risk recalculation complete', { updated });
        return { updated };
    }

    /* ── High-risk vehicles list ───────────────────────────────────── */
    async getHighRiskVehicles(limit = 20) {
        const result = await connection_1.db.query(`
            SELECT id, plate_number, type, make, model, color,
                   risk_score, risk_rating, violation_count, overspeed_count,
                   risk_updated_at
            FROM vehicles
            WHERE risk_score > 0
            ORDER BY risk_score DESC
            LIMIT $1
        `, [limit]);
        return result.rows;
    }
}

exports.riskService = new RiskService();
