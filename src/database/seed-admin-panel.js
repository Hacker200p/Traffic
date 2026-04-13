"use strict";

const { v4: uuidv4 } = require("uuid");
const { db } = require("./connection");

const TARGET_BY_STATUS = {
  pending_approval: 4,
  issued: 4,
  sent: 4,
  paid: 4,
  overdue: 2,
  rejected: 2,
};

function challanNumber(prefix) {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const r = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${d}-${r}`;
}

function pickViolationType(vType) {
  const allowed = new Set([
    "red_light",
    "speeding",
    "wrong_way",
    "illegal_parking",
    "no_seatbelt",
    "no_helmet",
    "illegal_turn",
    "other",
  ]);
  return allowed.has(vType) ? vType : "other";
}

async function getAdminId() {
  const { rows } = await db.query(
    "SELECT id FROM users WHERE role='admin' ORDER BY created_at ASC LIMIT 1"
  );
  return rows[0]?.id || null;
}

async function getCounts() {
  const { rows } = await db.query(
    `SELECT status, COUNT(*)::int AS c
     FROM challans
     GROUP BY status`
  );

  const counts = {
    pending_approval: 0,
    issued: 0,
    sent: 0,
    paid: 0,
    overdue: 0,
    rejected: 0,
  };

  for (const r of rows) {
    if (counts[r.status] !== undefined) counts[r.status] = r.c;
  }

  return counts;
}

async function getUnlinkedViolations(limit) {
  const { rows } = await db.query(
    `SELECT v.id AS violation_id,
            v.type AS violation_type,
            v.fine_amount,
            v.vehicle_id,
            veh.plate_number,
            veh.owner_name,
            veh.owner_contact
     FROM violations v
     LEFT JOIN vehicles veh ON veh.id = v.vehicle_id
     LEFT JOIN challans c ON c.violation_id = v.id
     WHERE c.id IS NULL
     ORDER BY v.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

async function insertChallanForViolation(v, status, adminId) {
  const id = uuidv4();
  const now = new Date();
  const fineAmount = Number(v.fine_amount || 500);

  const dueDate = new Date(now);
  if (status === "overdue") {
    dueDate.setDate(dueDate.getDate() - 5);
  } else {
    dueDate.setDate(dueDate.getDate() + 20);
  }

  const paymentDate = status === "paid" ? new Date(now.getTime() - 86400000) : null;
  const notificationStatus = status === "issued" || status === "sent" || status === "paid" || status === "overdue"
    ? "sent"
    : "pending";

  const approvedBy = status === "pending_approval" ? null : adminId;
  const approvedAt = status === "pending_approval" ? null : now.toISOString();

  await db.query(
    `INSERT INTO challans (
        id, challan_number, violation_id, vehicle_id, plate_number,
        owner_name, owner_contact, violation_type, fine_amount,
        due_date, status, payment_date, payment_ref,
        notification_channels, notification_sent_at, notification_status,
        approved_by, approved_at, approval_notes,
        created_at, updated_at
     ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16,
        $17, $18, $19,
        NOW(), NOW()
     )`,
    [
      id,
      challanNumber("ECH"),
      v.violation_id,
      v.vehicle_id,
      v.plate_number || "UNKNOWN",
      v.owner_name || "Unknown Owner",
      v.owner_contact || "+20-100-0000000",
      pickViolationType(v.violation_type),
      fineAmount,
      dueDate.toISOString(),
      status,
      paymentDate ? paymentDate.toISOString() : null,
      status === "paid" ? `PAY-${Date.now()}-${Math.floor(Math.random() * 9999)}` : null,
      ["sms", "email"],
      notificationStatus === "sent" ? now.toISOString() : null,
      notificationStatus,
      approvedBy,
      approvedAt,
      status === "rejected" ? "Rejected for demo testing" : "Seeded for admin panel testing",
    ]
  );

  await db.query(
    `UPDATE violations
     SET challan_id = $1, fine_amount = COALESCE(fine_amount, $2), updated_at = NOW()
     WHERE id = $3`,
    [id, fineAmount, v.violation_id]
  );
}

async function seedAdminPanel() {
  console.log("Seeding admin panel challan data...");

  const adminId = await getAdminId();
  const counts = await getCounts();

  let needed = 0;
  for (const [status, target] of Object.entries(TARGET_BY_STATUS)) {
    needed += Math.max(target - (counts[status] || 0), 0);
  }

  if (needed <= 0) {
    console.log("No additional challan rows needed. Targets already satisfied.");
    return;
  }

  const pool = await getUnlinkedViolations(needed + 20);
  if (pool.length === 0) {
    console.log("No unlinked violations available for new challans.");
    return;
  }

  let cursor = 0;
  let inserted = 0;

  for (const [status, target] of Object.entries(TARGET_BY_STATUS)) {
    const current = counts[status] || 0;
    const missing = Math.max(target - current, 0);

    for (let i = 0; i < missing; i++) {
      const v = pool[cursor++];
      if (!v) break;
      await insertChallanForViolation(v, status, adminId);
      inserted += 1;
    }
  }

  console.log(`Inserted ${inserted} challans for admin panel testing.`);

  const { rows: statsRows } = await db.query(
    `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'pending_approval')::int AS pending_approval,
        COUNT(*) FILTER (WHERE status = 'issued')::int AS issued,
        COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
        COUNT(*) FILTER (WHERE status = 'paid')::int AS paid,
        COUNT(*) FILTER (WHERE status = 'overdue')::int AS overdue,
        COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
        COALESCE(SUM(fine_amount), 0) AS total_fines,
        COALESCE(SUM(fine_amount) FILTER (WHERE status = 'paid'), 0) AS collected_fines
     FROM challans`
  );

  console.log("Current challan stats:");
  console.log(statsRows[0]);
}

seedAdminPanel()
  .catch((err) => {
    console.error("Admin panel seed failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.close();
  });
