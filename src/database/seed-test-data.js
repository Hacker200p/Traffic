"use strict";
/**
 * Comprehensive test data seeder
 * Populates the database with realistic data across all tables
 * so every feature can be tested in the browser.
 *
 * Run: node src/database/seed-test-data.js
 */
const { db } = require("./connection");
const { v4: uuidv4 } = require("uuid");

// Cairo-area coordinates (matches map default center)
const CAIRO_CENTER = { lat: 30.0444, lng: 31.2357 };

function offset(base, dLat, dLng) {
  return { lat: base.lat + dLat, lng: base.lng + dLng };
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function hoursAgo(h) {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

function minutesAgo(m) {
  return new Date(Date.now() - m * 60_000).toISOString();
}

async function seedTestData() {
  console.log("=== Seeding comprehensive test data ===\n");

  // ── 1. Fetch existing IDs ────────────────────────────────────
  const { rows: users } = await db.query("SELECT id, role FROM users");
  const adminId = users.find((u) => u.role === "admin")?.id;
  const policeId = users.find((u) => u.role === "police")?.id;

  const { rows: vehicles } = await db.query(
    "SELECT id, plate_number, is_blacklisted FROM vehicles"
  );
  const vMap = {};
  vehicles.forEach((v) => (vMap[v.plate_number] = v.id));

  const blacklistedId = vehicles.find((v) => v.is_blacklisted)?.id;

  const { rows: signals } = await db.query("SELECT id FROM traffic_signals LIMIT 1");
  const signalId = signals[0]?.id;

  const { rows: groups } = await db.query("SELECT id FROM signal_groups LIMIT 1");
  const groupId = groups[0]?.id;

  // ── 2. Update signal group & signals to Cairo coords ─────────
  if (groupId) {
    await db.query(
      "UPDATE signal_groups SET latitude=$1, longitude=$2, intersection_name='Tahrir Square' WHERE id=$3",
      [CAIRO_CENTER.lat, CAIRO_CENTER.lng, groupId]
    );
    await db.query(
      "UPDATE traffic_signals SET latitude=$1, longitude=$2 WHERE group_id=$3",
      [CAIRO_CENTER.lat, CAIRO_CENTER.lng, groupId]
    );
    console.log("✓ Updated signal group to Cairo coords");
  }

  // Add more signal groups around Cairo
  const intersections = [
    { name: "Ramses Station Junction", lat: 30.0622, lng: 31.2467 },
    { name: "Opera Square", lat: 30.0425, lng: 31.2388 },
    { name: "Giza Square", lat: 30.0131, lng: 31.2089 },
    { name: "Heliopolis Circle", lat: 30.0866, lng: 31.3222 },
    { name: "Maadi Corniche", lat: 29.9626, lng: 31.2508 },
  ];

  const newGroupIds = [];
  const newSignalIds = [];
  for (const int of intersections) {
    const gId = uuidv4();
    newGroupIds.push(gId);
    await db.query(
      `INSERT INTO signal_groups (id, name, intersection_name, latitude, longitude, description)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
      [gId, int.name, int.name, int.lat, int.lng, `Traffic signals at ${int.name}`]
    );
    for (const dir of ["north", "south", "east", "west"]) {
      const sId = uuidv4();
      newSignalIds.push(sId);
      await db.query(
        `INSERT INTO traffic_signals (id, name, intersection_name, latitude, longitude, direction, type, default_green_duration, default_yellow_duration, default_red_duration, is_autonomous, group_id, current_state)
         VALUES ($1, $2, $3, $4, $5, $6, 'standard', 30, 5, 30, TRUE, $7, $8)`,
        [sId, `${int.name} - ${dir.toUpperCase()}`, int.name, int.lat, int.lng, dir, gId, dir === "north" || dir === "south" ? "green" : "red"]
      );
    }
  }
  console.log(`✓ Created ${intersections.length} signal groups with ${newSignalIds.length} signals`);

  // ── 3. Cameras ───────────────────────────────────────────────
  const cameraLocations = [
    { name: "Tahrir Sq Cam 1", ...CAIRO_CENTER, type: "anpr" },
    { name: "Ramses Station Cam", lat: 30.0622, lng: 31.2467, type: "anpr" },
    { name: "Opera Sq Cam", lat: 30.0425, lng: 31.2388, type: "fixed" },
    { name: "Giza Sq Cam", lat: 30.0131, lng: 31.2089, type: "anpr" },
    { name: "Heliopolis Cam", lat: 30.0866, lng: 31.3222, type: "dome" },
    { name: "Maadi Cam", lat: 29.9626, lng: 31.2508, type: "ptz" },
    { name: "6th October Bridge Cam", lat: 30.0488, lng: 31.2290, type: "anpr" },
    { name: "Qasr El Nil Cam", lat: 30.0440, lng: 31.2310, type: "fixed" },
    { name: "Salah Salem Cam", lat: 30.0550, lng: 31.2600, type: "anpr" },
    { name: "Autostrad Cam", lat: 30.0300, lng: 31.2500, type: "anpr" },
  ];

  const cameraIds = [];
  for (let i = 0; i < cameraLocations.length; i++) {
    const cam = cameraLocations[i];
    const cId = uuidv4();
    cameraIds.push(cId);
    await db.query(
      `INSERT INTO cameras (id, name, intersection_name, latitude, longitude, camera_type, stream_url, signal_id, is_online)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE) ON CONFLICT DO NOTHING`,
      [
        cId,
        cam.name,
        cam.name,
        cam.lat,
        cam.lng,
        cam.type,
        `rtsp://cameras.local/stream${i + 1}`,
        newSignalIds[i] || signalId || null,
      ]
    );
  }
  console.log(`✓ Created ${cameraIds.length} cameras`);

  // ── 4. More vehicles ─────────────────────────────────────────
  const extraVehicles = [
    { plate: "CAI-1001", type: "car", make: "Mercedes", model: "C200", color: "Silver", year: 2023 },
    { plate: "CAI-2002", type: "car", make: "Hyundai", model: "Elantra", color: "White", year: 2022 },
    { plate: "CAI-3003", type: "motorcycle", make: "Honda", model: "CBR", color: "Red", year: 2021 },
    { plate: "CAI-4004", type: "truck", make: "Isuzu", model: "NPR", color: "Blue", year: 2020 },
    { plate: "CAI-5005", type: "car", make: "BMW", model: "X5", color: "Black", year: 2024 },
    { plate: "STOLEN-01", type: "car", make: "Audi", model: "A6", color: "Gray", year: 2023 },
    { plate: "CAI-6006", type: "bus", make: "Volvo", model: "B8R", color: "Green", year: 2021 },
    { plate: "CAI-7007", type: "emergency", make: "Toyota", model: "Land Cruiser", color: "White", year: 2022 },
  ];

  for (const v of extraVehicles) {
    const vId = uuidv4();
    const blacklisted = v.plate === "STOLEN-01";
    await db.query(
      `INSERT INTO vehicles (id, plate_number, type, make, model, color, year, is_blacklisted, owner_name, owner_contact)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (plate_number) DO UPDATE SET is_blacklisted=EXCLUDED.is_blacklisted RETURNING id`,
      [vId, v.plate, v.type, v.make, v.model, v.color, v.year, blacklisted,
       `Owner of ${v.plate}`, `+20-100-${Math.floor(1000000 + Math.random() * 9000000)}`]
    );
    vMap[v.plate] = vId;
  }
  console.log(`✓ Created ${extraVehicles.length} extra vehicles`);

  // refresh vehicle list
  const { rows: allVehicles } = await db.query("SELECT id, plate_number, is_blacklisted FROM vehicles");
  allVehicles.forEach((v) => (vMap[v.plate_number] = v.id));
  const stolenId1 = vMap["BAD-9999"];
  const stolenId2 = vMap["STOLEN-01"];

  // ── 5. Speed zones ──────────────────────────────────────────
  const speedZones = [
    { name: "Downtown Cairo 40 Zone", lat: 30.0444, lng: 31.2357, limit: 40, school: false },
    { name: "Giza School Zone", lat: 30.0131, lng: 31.2089, limit: 20, school: true },
    { name: "Autostrad Highway", lat: 30.03, lng: 31.25, limit: 100, school: false },
  ];
  const speedZoneIds = [];
  for (const sz of speedZones) {
    const szId = uuidv4();
    speedZoneIds.push(szId);
    const boundary = JSON.stringify({
      type: "Polygon",
      coordinates: [[
        [sz.lng - 0.005, sz.lat - 0.005],
        [sz.lng + 0.005, sz.lat - 0.005],
        [sz.lng + 0.005, sz.lat + 0.005],
        [sz.lng - 0.005, sz.lat + 0.005],
        [sz.lng - 0.005, sz.lat - 0.005],
      ]],
    });
    await db.query(
      `INSERT INTO speed_zones (id, name, boundary_json, speed_limit, is_school_zone) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      [szId, sz.name, boundary, sz.limit, sz.school]
    );
  }
  console.log(`✓ Created ${speedZones.length} speed zones`);

  // ── 6. Tracking points (GPS history) ────────────────────────
  // Give every vehicle a trail of tracking points over the last 24 hours
  const plateKeys = Object.keys(vMap);
  let tpCount = 0;
  for (const plate of plateKeys) {
    const vid = vMap[plate];
    const startLat = CAIRO_CENTER.lat + randomBetween(-0.04, 0.04);
    const startLng = CAIRO_CENTER.lng + randomBetween(-0.04, 0.04);
    const points = plate === "BAD-9999" || plate === "STOLEN-01" ? 30 : 12;

    for (let i = 0; i < points; i++) {
      const lat = startLat + i * randomBetween(0.001, 0.003);
      const lng = startLng + i * randomBetween(-0.002, 0.002);
      const speed = randomBetween(20, 90);
      const heading = randomBetween(0, 360);
      const minutesBack = (points - i) * 30; // every 30 min
      await db.query(
        `INSERT INTO tracking_points (id, vehicle_id, latitude, longitude, speed, heading, source_type, recorded_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [uuidv4(), vid, lat, lng, speed.toFixed(2), heading.toFixed(2), i % 3 === 0 ? "camera" : "gps", minutesAgo(minutesBack)]
      );
      tpCount++;
    }

    // Update vehicle last known position
    const lastLat = startLat + (points - 1) * 0.002;
    const lastLng = startLng + (points - 1) * 0.001;
    await db.query(
      "UPDATE vehicles SET last_known_latitude=$1, last_known_longitude=$2, last_seen_at=$3 WHERE id=$4",
      [lastLat, lastLng, minutesAgo(5), vid]
    );
  }
  console.log(`✓ Created ${tpCount} tracking points`);

  // ── 7. Vehicle sightings (camera detections) ────────────────
  let sightCount = 0;
  for (const plate of plateKeys) {
    const vid = vMap[plate];
    const numSightings = plate === "BAD-9999" || plate === "STOLEN-01" ? 15 : 5;
    for (let i = 0; i < numSightings; i++) {
      const camIdx = i % cameraIds.length;
      const cam = cameraLocations[camIdx];
      const mBack = (numSightings - i) * 45;
      await db.query(
        `INSERT INTO vehicle_sightings (id, vehicle_id, camera_id, plate_text, confidence, latitude, longitude, speed, heading, detected_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          uuidv4(), vid, cameraIds[camIdx], plate,
          randomBetween(0.85, 0.99).toFixed(4),
          cam.lat + randomBetween(-0.001, 0.001),
          cam.lng + randomBetween(-0.001, 0.001),
          randomBetween(20, 80).toFixed(2),
          randomBetween(0, 360).toFixed(2),
          minutesAgo(mBack),
        ]
      );
      sightCount++;
    }
  }
  console.log(`✓ Created ${sightCount} vehicle sightings`);

  // ── 8. Violations ───────────────────────────────────────────
  const violationTypes = ["red_light", "speeding", "wrong_way", "no_helmet", "illegal_parking", "no_seatbelt"];
  const severities = ["low", "medium", "high", "critical"];
  const violationIds = [];

  const violationData = [
    { plate: "BAD-9999", type: "speeding", severity: "high", speed: 120, limit: 60 },
    { plate: "BAD-9999", type: "red_light", severity: "critical", speed: 55 },
    { plate: "NYC-1234", type: "speeding", severity: "medium", speed: 85, limit: 60 },
    { plate: "NYC-5678", type: "illegal_parking", severity: "low", speed: 0 },
    { plate: "CAI-1001", type: "speeding", severity: "high", speed: 110, limit: 60 },
    { plate: "CAI-3003", type: "no_helmet", severity: "high", speed: 45 },
    { plate: "CAI-3003", type: "wrong_way", severity: "critical", speed: 30 },
    { plate: "STOLEN-01", type: "red_light", severity: "critical", speed: 70 },
    { plate: "STOLEN-01", type: "speeding", severity: "high", speed: 130, limit: 80 },
    { plate: "CAI-2002", type: "no_seatbelt", severity: "low", speed: 40 },
    { plate: "CAI-5005", type: "speeding", severity: "medium", speed: 95, limit: 60 },
    { plate: "CAI-4004", type: "illegal_parking", severity: "low", speed: 0 },
  ];

  for (let i = 0; i < violationData.length; i++) {
    const v = violationData[i];
    const vId = uuidv4();
    violationIds.push(vId);
    const loc = offset(CAIRO_CENTER, randomBetween(-0.03, 0.03), randomBetween(-0.03, 0.03));
    const fineAmounts = { low: 100, medium: 500, high: 1000, critical: 2500 };
    await db.query(
      `INSERT INTO violations (id, vehicle_id, type, description, latitude, longitude, speed, speed_limit, severity, fine_amount, status, signal_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        vId,
        vMap[v.plate],
        v.type,
        `${v.type.replace(/_/g, " ")} violation by ${v.plate}`,
        loc.lat, loc.lng,
        v.speed, v.limit || null,
        v.severity,
        fineAmounts[v.severity],
        i < 4 ? "pending" : i < 8 ? "confirmed" : "reviewed",
        signalId || newSignalIds[0] || null,
        hoursAgo(randomBetween(1, 48)),
      ]
    );
  }
  console.log(`✓ Created ${violationIds.length} violations`);

  // Update vehicle violation counts & risk
  for (const plate of Object.keys(vMap)) {
    const { rows } = await db.query(
      "SELECT COUNT(*) as cnt FROM violations WHERE vehicle_id=$1",
      [vMap[plate]]
    );
    const cnt = parseInt(rows[0].cnt);
    if (cnt > 0) {
      const score = Math.min(cnt * 20, 100);
      const rating = score >= 80 ? "critical" : score >= 50 ? "high" : score >= 30 ? "medium" : "low";
      await db.query(
        "UPDATE vehicles SET violation_count=$1, risk_score=$2, risk_rating=$3, risk_updated_at=NOW() WHERE id=$4",
        [cnt, score, rating, vMap[plate]]
      );
    }
  }
  console.log("✓ Updated vehicle risk scores");

  // ── 9. Challans (e-Challans for confirmed violations) ───────
  let challanCount = 0;
  for (let i = 0; i < violationIds.length; i++) {
    if (i >= 4) { // only for non-pending violations
      const chId = uuidv4();
      const v = violationData[i];
      const fineAmounts = { low: 100, medium: 500, high: 1000, critical: 2500 };
      await db.query(
        `INSERT INTO challans (id, challan_number, violation_id, vehicle_id, plate_number, owner_name, violation_type, fine_amount, due_date, status, notification_channels, notification_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          chId,
          `CHN-2024-${String(1000 + i).padStart(6, "0")}`,
          violationIds[i],
          vMap[v.plate],
          v.plate,
          `Owner of ${v.plate}`,
          v.type,
          fineAmounts[v.severity],
          new Date(Date.now() + 30 * 86400_000).toISOString(),
          i < 6 ? "issued" : i < 8 ? "sent" : "paid",
          ["sms", "email"],
          "sent",
        ]
      );
      challanCount++;
    }
  }
  console.log(`✓ Created ${challanCount} challans`);

  // ── 10. Alerts ──────────────────────────────────────────────
  const alertsData = [
    { type: "blacklisted_vehicle", priority: "critical", title: "Stolen vehicle BAD-9999 spotted", desc: "Blacklisted vehicle detected near Tahrir Square", vehicleId: stolenId1, status: "active" },
    { type: "blacklisted_vehicle", priority: "critical", title: "Stolen vehicle STOLEN-01 spotted", desc: "Blacklisted Audi A6 detected near Ramses Station", vehicleId: stolenId2, status: "active" },
    { type: "accident", priority: "high", title: "Possible accident on 6th October Bridge", desc: "Sudden stop detected, multiple vehicles involved", status: "active" },
    { type: "congestion", priority: "medium", title: "Heavy traffic near Opera Square", desc: "Average speed dropped below 10 km/h", status: "active" },
    { type: "signal_malfunction", priority: "high", title: "Signal malfunction at Giza Square", desc: "Traffic signal not responding to commands", status: "acknowledged" },
    { type: "emergency", priority: "critical", title: "Emergency vehicle en route", desc: "Ambulance requesting signal priority on Salah Salem", status: "active" },
    { type: "violation", priority: "medium", title: "Multiple speed violations detected", desc: "3 vehicles exceeded 120 km/h on Autostrad", status: "active" },
    { type: "restricted_zone", priority: "high", title: "Unauthorized entry in VIP zone", desc: "Vehicle entered restricted area near presidential palace", status: "active" },
  ];

  const alertIds = [];
  for (const a of alertsData) {
    const aId = uuidv4();
    alertIds.push(aId);
    const loc = offset(CAIRO_CENTER, randomBetween(-0.03, 0.03), randomBetween(-0.03, 0.03));
    await db.query(
      `INSERT INTO alerts (id, type, priority, title, description, latitude, longitude, vehicle_id, status, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [aId, a.type, a.priority, a.title, a.desc, loc.lat, loc.lng, a.vehicleId || null, a.status, adminId, hoursAgo(randomBetween(0.5, 12))]
    );
  }
  console.log(`✓ Created ${alertIds.length} alerts`);

  // ── 11. Restricted zones ────────────────────────────────────
  const zones = [
    { name: "Presidential Palace Zone", type: "vip", lat: 30.0283, lng: 31.2226, radius: 500 },
    { name: "Cairo University School Zone", type: "school", lat: 30.0261, lng: 31.2115, radius: 300 },
    { name: "Hospital Zone - Qasr El Aini", type: "hospital", lat: 30.0365, lng: 31.2325, radius: 200 },
    { name: "Military Area - No Entry", type: "no_entry", lat: 30.0700, lng: 31.2800, radius: 1000 },
  ];

  for (const z of zones) {
    await db.query(
      `INSERT INTO restricted_zones (id, name, description, latitude, longitude, radius, zone_type, is_active, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,$8) ON CONFLICT DO NOTHING`,
      [uuidv4(), z.name, `${z.type} restricted zone`, z.lat, z.lng, z.radius, z.type, adminId]
    );
  }
  console.log(`✓ Created ${zones.length} restricted zones`);

  // ── 12. Accidents ───────────────────────────────────────────
  const accidentsData = [
    {
      type: "collision", severity: "critical", status: "confirmed",
      lat: 30.0488, lng: 31.2290, desc: "Two-car collision on 6th October Bridge",
      vehicleIds: [vMap["NYC-1234"], vMap["CAI-1001"]].filter(Boolean),
      police: true, hospital: true,
    },
    {
      type: "sudden_stop", severity: "high", status: "detected",
      lat: 30.0550, lng: 31.2600, desc: "Vehicle BAD-9999 sudden stop on Salah Salem",
      vehicleIds: [stolenId1].filter(Boolean),
      police: true, hospital: false,
    },
    {
      type: "unusual_motion", severity: "medium", status: "detected",
      lat: 30.0131, lng: 31.2089, desc: "Motorcycle swerving erratically near Giza Square",
      vehicleIds: [vMap["CAI-3003"]].filter(Boolean),
      police: false, hospital: false,
    },
    {
      type: "collision", severity: "high", status: "dispatched",
      lat: 29.9626, lng: 31.2508, desc: "Truck rear-ended a bus on Maadi Corniche",
      vehicleIds: [vMap["CAI-4004"], vMap["BUS-001"]].filter(Boolean),
      police: true, hospital: true,
    },
    {
      type: "sudden_stop", severity: "low", status: "false_alarm",
      lat: 30.0622, lng: 31.2467, desc: "Hard braking detected - turned out to be normal stop",
      vehicleIds: [vMap["CAI-2002"]].filter(Boolean),
      police: false, hospital: false,
    },
  ];

  for (const acc of accidentsData) {
    await db.query(
      `INSERT INTO accidents (id, detection_type, severity, status, latitude, longitude, description, vehicle_ids, detection_data, police_notified, hospital_notified, police_notified_at, hospital_notified_at, alert_id, responded_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        uuidv4(), acc.type, acc.severity, acc.status,
        acc.lat, acc.lng, acc.desc,
        acc.vehicleIds,
        JSON.stringify({ speed_before: randomBetween(40, 100).toFixed(1), deceleration: randomBetween(5, 15).toFixed(1) }),
        acc.police, acc.hospital,
        acc.police ? hoursAgo(randomBetween(0.5, 6)) : null,
        acc.hospital ? hoursAgo(randomBetween(0.5, 6)) : null,
        alertIds[2] || null, // link to accident alert
        acc.police ? policeId : null,
        hoursAgo(randomBetween(1, 24)),
      ]
    );
  }
  console.log(`✓ Created ${accidentsData.length} accidents`);

  // ── 13. Notification preferences for admin ──────────────────
  const alertTypes = ["accident", "blacklisted_vehicle", "emergency", "congestion", "violation"];
  for (const at of alertTypes) {
    await db.query(
      `INSERT INTO notification_preferences (id, user_id, alert_type, sms, push, email)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id, alert_type) DO NOTHING`,
      [uuidv4(), adminId, at, true, true, true]
    );
  }
  console.log("✓ Created notification preferences");

  // ── 14. Vehicle risk history ────────────────────────────────
  const riskyPlates = ["BAD-9999", "STOLEN-01", "CAI-3003", "CAI-1001"];
  for (const plate of riskyPlates) {
    const vid = vMap[plate];
    if (!vid) continue;
    for (let d = 7; d >= 0; d--) {
      const score = Math.min(randomBetween(20, 90), 100);
      const rating = score >= 80 ? "critical" : score >= 50 ? "high" : score >= 30 ? "medium" : "low";
      await db.query(
        `INSERT INTO vehicle_risk_history (id, vehicle_id, risk_score, risk_rating, factors, calculated_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          uuidv4(), vid, score.toFixed(1), rating,
          JSON.stringify({ violations: Math.floor(score / 20), speed_incidents: Math.floor(score / 30), blacklisted: plate === "BAD-9999" || plate === "STOLEN-01" }),
          hoursAgo(d * 24),
        ]
      );
    }
  }
  console.log("✓ Created vehicle risk history");

  // ── 15. Audit log entries ───────────────────────────────────
  const auditActions = [
    { action: "LOGIN", entity_type: "user", entity_id: adminId },
    { action: "CREATE_VIOLATION", entity_type: "violation", entity_id: violationIds[0] },
    { action: "UPDATE_SIGNAL", entity_type: "traffic_signal", entity_id: signalId || newSignalIds[0] },
    { action: "BLACKLIST_VEHICLE", entity_type: "vehicle", entity_id: stolenId1 },
    { action: "CREATE_ALERT", entity_type: "alert", entity_id: alertIds[0] },
    { action: "REVIEW_VIOLATION", entity_type: "violation", entity_id: violationIds[4] },
  ];

  for (const a of auditActions) {
    await db.query(
      `INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, ip_address, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [uuidv4(), adminId, a.action, a.entity_type, a.entity_id, "192.168.1.100", hoursAgo(randomBetween(1, 48))]
    );
  }
  console.log(`✓ Created ${auditActions.length} audit log entries`);

  // ── 16. Signal state logs ───────────────────────────────────
  const allSignalIds = newSignalIds.slice(0, 5);
  if (signalId) allSignalIds.push(signalId);
  for (const sid of allSignalIds) {
    for (let i = 0; i < 4; i++) {
      const states = ["green", "yellow", "red"];
      const prev = states[i % 3];
      const next = states[(i + 1) % 3];
      await db.query(
        `INSERT INTO signal_state_log (id, signal_id, previous_state, new_state, changed_by, reason, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [uuidv4(), sid, prev, next, adminId, i === 0 ? "Scheduled cycle" : "Traffic density adjustment", hoursAgo(randomBetween(0.5, 12))]
      );
    }
  }
  console.log("✓ Created signal state log entries");

  console.log("\n=== Test data seeding complete! ===");
  console.log("\nSummary:");
  console.log(`  Vehicles:        ${Object.keys(vMap).length} (2 blacklisted: BAD-9999, STOLEN-01)`);
  console.log(`  Signal groups:   ${intersections.length + 1}`);
  console.log(`  Cameras:         ${cameraIds.length}`);
  console.log(`  Tracking points: ${tpCount}`);
  console.log(`  Sightings:       ${sightCount}`);
  console.log(`  Violations:      ${violationIds.length}`);
  console.log(`  Challans:        ${challanCount}`);
  console.log(`  Alerts:          ${alertIds.length}`);
  console.log(`  Accidents:       ${accidentsData.length}`);
  console.log(`  Restricted zones: ${zones.length}`);
  console.log(`  Speed zones:     ${speedZones.length}`);
  console.log("\nLogin with: admin@trafficcontrol.gov / Admin@123456");
  console.log("Frontend:   http://localhost:5173");
}

seedTestData()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
