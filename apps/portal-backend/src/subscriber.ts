import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import { createClient } from "redis";
import { pool } from "./pool";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const SALON_API  = process.env.SALON_API_URL ?? "http://salon-backend:4000";

const subscriber = createClient({ url: REDIS_URL });
subscriber.on("error", (err) => console.error("Portal subscriber Redis error:", err));

// ─── Inicijalizacija baze ──────────────────────────────────────────────────

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS portal_reservations (
      id                    SERIAL PRIMARY KEY,
      salon_reservation_id  INT UNIQUE NOT NULL,
      created_date          DATE NOT NULL,
      status                VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS portal_reservation_items (
      id                    SERIAL PRIMARY KEY,
      salon_reservation_id  INT NOT NULL,
      salon_item_id         INT,
      service_category      VARCHAR(255),
      reservation_date      DATE,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Dodaj kolonu ako postoji stara tabela bez nje
  await pool.query(`
    ALTER TABLE portal_reservation_items
    ADD COLUMN IF NOT EXISTS reservation_date DATE;
  `);

  console.log("✅ Portal DB tables ready");
}

// ─── Handleri ──────────────────────────────────────────────────────────────

// reservation.created — čekamo kratko da worker upiše u salon-db, pa povučemo ID
async function handleCreated(raw: string) {
  let msg: any;
  try { msg = JSON.parse(raw); } catch { return; }

  const { first_name, last_name, access_code, items } = msg;
  if (!items || !Array.isArray(items)) return;

  console.log(`📊 Portal: reservation.created received for ${first_name} ${last_name}, items: ${items.length}`);
  console.log(`📊 Portal: items data:`, JSON.stringify(items));

  // Čekamo da worker upiše u salon-db ( worker je asinhroni)
  // Pokušavamo nekoliko puta sa backoff-om
  let salonResId: number | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    try {
      const res = await pool.query(
        `SELECT id FROM reservations WHERE access_code = $1`,
        [access_code]
      );
      if (res.rows.length > 0) {
        salonResId = res.rows[0].id;
        break;
      }
    } catch {
      // salon-db nije dostupan iz portal-backend-a — koristimo sync
    }
  }

  // Ako nismo uspeli da nađemo ID iz salon-db, koristimo sync API
  if (!salonResId) {
    try {
      const res = await fetch(`${SALON_API}/reservations`);
      if (res.ok) {
        const reservations: { id: number; access_code: string }[] = await res.json();
        const found = reservations.find((r) => r.access_code === access_code);
        if (found) salonResId = found.id;
      }
    } catch {
      console.warn("Portal: could not fetch salon API for ID lookup");
    }
  }

  if (!salonResId) {
    console.warn(`📊 Portal: could not resolve salon_reservation_id for access_code ${access_code}, skipping`);
    return;
  }

  const createdDate = new Date().toISOString().split("T")[0];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const inserted = await client.query(
      `INSERT INTO portal_reservations (salon_reservation_id, created_date, status)
       VALUES ($1, $2, 'active')
       ON CONFLICT (salon_reservation_id) DO NOTHING
       RETURNING id`,
      [salonResId, createdDate]
    );

    if (inserted.rows.length === 0) {
      await client.query("ROLLBACK");
      console.log(`📊 Portal: reservation ${salonResId} already exists, skipping`);
      return;
    }

    const portalResId = inserted.rows[0].id;

    for (const item of items) {
      const itemDate = item.date ?? null;
      console.log(`📊 Portal: inserting item service_id=${item.service_id} date=${itemDate}`);
      await client.query(
        `INSERT INTO portal_reservation_items
           (salon_reservation_id, salon_item_id, service_category, reservation_date)
         VALUES ($1, $2, $3, $4)`,
        [portalResId, item.service_id ?? null, null, itemDate]
      );
    }

    await client.query("COMMIT");
    console.log(`📊 Portal: reservation ${salonResId} recorded (${items.length} items, date=${createdDate})`);
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Portal handleCreated error:", err?.message);
  } finally {
    client.release();
  }

  // Enrichuj kategorije
  setTimeout(() => syncCategories().catch(console.warn), 2000);
}

async function handleCancelled(raw: string) {
  let msg: any;
  try { msg = JSON.parse(raw); } catch { return; }

  const { reservation_id } = msg;
  if (!reservation_id) return;

  try {
    await pool.query(
      `UPDATE portal_reservations SET status='cancelled' WHERE salon_reservation_id=$1`,
      [reservation_id]
    );
    console.log(`📊 Portal: reservation ${reservation_id} marked as cancelled`);
  } catch (err: any) {
    console.error("Portal handleCancelled error:", err?.message);
  }
}

async function handleUpdated(raw: string) {
  let msg: any;
  try { msg = JSON.parse(raw); } catch { return; }

  const { reservation_id, action, service_id, date } = msg;
  if (!reservation_id || !action) return;

  console.log(`📊 Portal: reservation.updated action=${action} res=${reservation_id}`);

  const portalRes = await pool.query(
    `SELECT id FROM portal_reservations WHERE salon_reservation_id = $1`,
    [reservation_id]
  );
  if (portalRes.rows.length === 0) {
    console.warn(`📊 Portal: reservation ${reservation_id} not found in portal_reservations`);
    return;
  }
  const portalResId = portalRes.rows[0].id;

  if (action === "item_added") {
    let category: string | null = null;
    try {
      const catRes = await fetch(`${SALON_API}/catalog`);
      if (catRes.ok) {
        const catalog: { id: number; name: string; services: { id: number }[] }[] = await catRes.json();
        for (const cat of catalog) {
          if (cat.services.some((s) => s.id === service_id)) {
            category = cat.name;
            break;
          }
        }
      }
    } catch { /* best effort */ }

    await pool.query(
      `INSERT INTO portal_reservation_items
         (salon_reservation_id, salon_item_id, service_category, reservation_date)
       VALUES ($1, $2, $3, $4)`,
      [portalResId, service_id ?? null, category, date ?? null]
    );
    console.log(`📊 Portal: item added to reservation ${reservation_id} service=${service_id} date=${date}`);
  }

  if (action === "item_removed") {
    await pool.query(
      `DELETE FROM portal_reservation_items
       WHERE id = (
         SELECT id FROM portal_reservation_items
         WHERE salon_reservation_id = $1
         AND salon_item_id = $2
         ORDER BY id DESC
         LIMIT 1
       )`,
      [portalResId, service_id ?? null]
    );
    console.log(`📊 Portal: item removed from reservation ${reservation_id}`);
  }
}

// ─── Sync kategorija ───────────────────────────────────────────────────────

async function syncCategories() {
  try {
    const catRes = await fetch(`${SALON_API}/catalog`);
    if (!catRes.ok) return;
    const catalog: { id: number; name: string; services: { id: number }[] }[] = await catRes.json();

    const serviceToCategory: Record<number, string> = {};
    for (const cat of catalog) {
      for (const svc of cat.services) {
        serviceToCategory[svc.id] = cat.name;
      }
    }

    const unresolved = await pool.query(
      `SELECT id, salon_item_id FROM portal_reservation_items
       WHERE service_category IS NULL AND salon_item_id IS NOT NULL`
    );

    for (const row of unresolved.rows) {
      const category = serviceToCategory[row.salon_item_id];
      if (category) {
        await pool.query(
          `UPDATE portal_reservation_items SET service_category=$1 WHERE id=$2`,
          [category, row.id]
        );
      }
    }
  } catch (err: any) {
    console.warn("Portal syncCategories warning:", err?.message);
  }
}

// ─── Start ─────────────────────────────────────────────────────────────────

async function start() {
  await initDb();
  await subscriber.connect();
  console.log("🔧 Portal subscriber connected to Redis");

  await subscriber.subscribe("reservation.created",   (msg) => handleCreated(msg).catch(console.error));
  await subscriber.subscribe("reservation.cancelled", (msg) => handleCancelled(msg).catch(console.error));
  await subscriber.subscribe("reservation.updated",   (msg) => handleUpdated(msg).catch(console.error));

  console.log("✅ Portal subscriber listening on: reservation.created, reservation.cancelled, reservation.updated");

  // Periodična sinhronizacija kategorija
  setInterval(syncCategories, 60_000);
  setTimeout(syncCategories, 5_000);
}

start().catch((err) => {
  console.error("Portal subscriber failed to start:", err);
  process.exit(1);
});