import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/connection';
import { redis } from '../../config/redis';
import { logger } from '../../common/logger';
import { violationsService } from '../violations/violations.service';
import { trackingService } from '../tracking/tracking.service';
import { alertsService } from '../alerts/alerts.service';
import { signalsService } from '../traffic-signals/signals.service';
import {
  AiViolationInput,
  AiTrackingInput,
  AiTrackingBatchInput,
  AiAlertInput,
  AiSignalStateInput,
} from './integration.validation';

/**
 * Integration service — transforms AI microservice payloads into the shapes
 * expected by domain services, handles vehicle auto-lookup / auto-creation,
 * and delegates to the existing service layer for DB writes + Redis publish.
 */
export class IntegrationService {

  // ── Violations ──────────────────────────────────────────────────────────

  async ingestViolation(input: AiViolationInput) {
    // Try to resolve vehicleId from plate text
    let vehicleId: string | null = null;

    if (input.plate_text) {
      vehicleId = await this.resolveVehicleByPlate(input.plate_text);
    }

    // Insert violation directly (supports nullable vehicle_id after migration)
    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO violations
        (id, vehicle_id, type, description, location, speed, speed_limit,
         evidence_url, signal_id, severity, fine_amount, status, created_at, updated_at)
       VALUES
        ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7, $8,
         $9, $10, $11, $12, 'pending', NOW(), NOW())
       RETURNING id, vehicle_id, type, description,
                 ST_X(location::geometry) as longitude,
                 ST_Y(location::geometry) as latitude,
                 speed, speed_limit, evidence_url, signal_id,
                 severity, fine_amount, status, created_at`,
      [
        id,
        vehicleId,
        input.type,
        input.description || '',
        input.longitude,
        input.latitude,
        input.speed ?? null,
        input.speed_limit ?? null,
        input.evidence_url ?? null,
        input.signal_id ?? null,
        input.severity,
        input.fine_amount ?? null,
      ],
    );

    const violation = result.rows[0];

    // Enrich with plate_text for downstream consumers
    if (input.plate_text) {
      violation.plate_text = input.plate_text;
    }

    // Publish for real-time WebSocket broadcast
    await redis.publish('violations:new', JSON.stringify(violation));

    // If severity is high/critical, auto-create an alert
    if (input.severity === 'high' || input.severity === 'critical') {
      try {
        await this.autoCreateViolationAlert(violation, input);
      } catch (err) {
        logger.warn('Failed to auto-create alert for violation', { violationId: id, err });
      }
    }

    logger.info('AI violation ingested', {
      violationId: id,
      type: input.type,
      plate: input.plate_text ?? 'unknown',
      vehicleId,
    });

    return violation;
  }

  // ── Tracking ────────────────────────────────────────────────────────────

  async ingestTracking(input: AiTrackingInput) {
    return trackingService.recordPoint({
      vehicleId: input.vehicle_id,
      latitude: input.latitude,
      longitude: input.longitude,
      speed: input.speed,
      heading: input.heading,
      accuracy: input.accuracy,
      timestamp: input.timestamp,
    });
  }

  async ingestTrackingBatch(input: AiTrackingBatchInput) {
    return trackingService.recordBatch({
      points: input.points.map((p) => ({
        vehicleId: p.vehicle_id,
        latitude: p.latitude,
        longitude: p.longitude,
        speed: p.speed,
        heading: p.heading,
        accuracy: p.accuracy,
        timestamp: p.timestamp,
      })),
    });
  }

  // ── Alerts ──────────────────────────────────────────────────────────────

  async ingestAlert(input: AiAlertInput, systemUserId: string) {
    return alertsService.create(
      {
        type: input.type,
        priority: input.priority,
        title: input.title,
        description: input.description || '',
        latitude: input.latitude,
        longitude: input.longitude,
        radius: input.radius,
        vehicleId: input.vehicle_id,
        signalId: input.signal_id,
      },
      systemUserId,
    );
  }

  // ── Signal State ────────────────────────────────────────────────────────

  async ingestSignalState(signalId: string, input: AiSignalStateInput, systemUserId: string) {
    return signalsService.changeState(
      signalId,
      {
        state: input.state as any,
        reason: input.reason || `AI auto-adjustment (duration=${input.duration}s)`,
      },
      systemUserId,
    );
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Look up vehicle by plate number. If found return id.
   * If not found, auto-register it as an "unknown" vehicle and return its id.
   */
  private async resolveVehicleByPlate(plateText: string): Promise<string> {
    // Try existing
    const existing = await db.query(
      'SELECT id, is_blacklisted FROM vehicles WHERE plate_number = $1',
      [plateText],
    );

    if (existing.rows.length > 0) {
      const vehicle = existing.rows[0];

      // If blacklisted, fire an alert
      if (vehicle.is_blacklisted) {
        logger.warn('Blacklisted vehicle detected by AI', { plateNumber: plateText, vehicleId: vehicle.id });
      }

      return vehicle.id;
    }

    // Auto-register unknown vehicle
    const id = uuidv4();
    await db.query(
      `INSERT INTO vehicles
        (id, plate_number, type, is_blacklisted, notes, created_at, updated_at)
       VALUES ($1, $2, 'unknown', false, 'Auto-registered by AI detection', NOW(), NOW())`,
      [id, plateText],
    );

    logger.info('Auto-registered vehicle from AI detection', { vehicleId: id, plateNumber: plateText });
    return id;
  }

  /**
   * Auto-create a high-priority alert when a severe violation is detected.
   */
  private async autoCreateViolationAlert(
    violation: any,
    input: AiViolationInput,
  ): Promise<void> {
    const alertPayload = {
      type: 'other' as const,
      priority: input.severity as any,
      title: `${input.severity.toUpperCase()} Violation: ${input.type.replace(/_/g, ' ')}`,
      description: input.description || `AI-detected ${input.type} violation`,
      latitude: input.latitude,
      longitude: input.longitude,
      signalId: input.signal_id,
    };

    await alertsService.create(alertPayload, violation.created_by || 'system');
  }
}

export const integrationService = new IntegrationService();
