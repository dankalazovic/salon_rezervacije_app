/**
 * worker.ts — Background proces koji sluša Redis pub/sub kanal
 * "reservation.created" i upisuje rezervacije u bazu.
 *
 * Pokretanje: ts-node-dev --respawn --transpile-only src/worker.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import { createClient } from "redis";
import { pool } from "./db/pool";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

// Worker koristi zaseban subscriber klijent
const subscriber = createClient({ url: REDIS_URL });
subscriber.on("error", (err) => console.error("Worker Redis error:", err));

function randomCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function isDiscountActive(discountUntil: string | null): boolean {
  if (!discountUntil) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const until = new Date(discountUntil); until.setHours(0, 0, 0, 0);
  return today <= until;
}

async function handleReservationCreated(raw: string) {
  let msg: any;
  try {
    msg = JSON.parse(raw);
  } catch {
    console.error("Worker: invalid JSON message:", raw);
    return;
  }

  const {
    first_name, last_name, email, phone,
    address1, postal_code, city, country,
    currency, promo_code_used, items,
    access_code, promo_code,
  } = msg;

  if (!first_name || !last_name || !email || !address1 || !postal_code || !city || !country) {
    console.error("Worker: missing required customer fields, dropping message");
    return;
  }
  if (!Array.isArray(items) || items.length === 0) {
    console.error("Worker: no items in reservation, dropping message");
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Proveri zatvorene dane
    const hoursRes = await client.query("SELECT day_of_week, is_closed FROM salon_hours");
    const closedDays = new Set(
      hoursRes.rows.filter((r: any) => r.is_closed).map((r: any) => r.day_of_week)
    );
    for (const it of items) {
      const dow = new Date(it.date + "T00:00:00").getDay();
      if (closedDays.has(dow)) {
        await client.query("ROLLBACK");
        console.warn(`Worker: salon closed on requested day for item date=${it.date}, dropping`);
        return;
      }
    }

    // Proveri kapacitete za svaki item
    for (const it of items) {
      const { service_id, date, time } = it;
      if (!service_id || !date || !time) {
        await client.query("ROLLBACK");
        console.error("Worker: item missing service_id/date/time, dropping");
        return;
      }
      const svc = await client.query("SELECT id, max_clients FROM services WHERE id=$1", [service_id]);
      if (svc.rows.length === 0) {
        await client.query("ROLLBACK");
        console.error(`Worker: service ${service_id} not found, dropping`);
        return;
      }
      const taken = await client.query(
        `SELECT COUNT(*) as cnt FROM reservation_items ri
         JOIN reservations r ON r.id=ri.reservation_id
         WHERE ri.service_id=$1 AND ri.date::date=$2::date AND ri.time=$3 AND r.status!='cancelled'`,
        [service_id, date, time]
      );
      if (Number(taken.rows[0].cnt) >= Number(svc.rows[0].max_clients)) {
        await client.query("ROLLBACK");
        console.warn(`Worker: slot full for service=${service_id} date=${date} time=${time}, dropping`);
        return;
      }
    }

    // Promo kod validacija
    let promoDiscount = false;
    let promoReservationId: number | null = null;

    if (promo_code_used) {
      const promoRes = await client.query(
        "SELECT id, status, promo_code_used FROM reservations WHERE promo_code = $1",
        [promo_code_used.toUpperCase()]
      );
      if (promoRes.rows.length === 0) {
        await client.query("ROLLBACK");
        console.warn("Worker: promo code not found, dropping");
        return;
      }
      const promoRow = promoRes.rows[0];
      if (promoRow.status === "cancelled" || promoRow.promo_code_used) {
        await client.query("ROLLBACK");
        console.warn("Worker: promo code invalid/used, dropping");
        return;
      }
      promoDiscount = true;
      promoReservationId = promoRow.id;
    }

    // Popust
    const settingsRes = await client.query("SELECT discount_until FROM settings LIMIT 1");
    const tenPctActive = isDiscountActive(settingsRes.rows[0]?.discount_until ?? null);

    const accessCode = access_code ?? randomCode(8);
    const promoCode = promo_code ?? randomCode(6);

    const ins = await client.query(
      `INSERT INTO reservations (first_name,last_name,email,phone,address1,postal_code,city,country,access_code,promo_code,currency)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [first_name, last_name, email, phone ?? null, address1, postal_code, city, country, accessCode, promoCode, currency ?? "RSD"]
    );
    const reservation = ins.rows[0];

    let subtotal = 0;
    for (const it of items) {
      const { service_id, date, time } = it;
      const svc = await client.query("SELECT id, price_rsd FROM services WHERE id=$1", [service_id]);
      const unitPrice = Number(svc.rows[0].price_rsd);
      subtotal += unitPrice;
      await client.query(
        "INSERT INTO reservation_items (reservation_id,service_id,date,time,unit_price,line_total) VALUES ($1,$2,$3,$4,$5,$6)",
        [reservation.id, service_id, date, time, unitPrice, unitPrice]
      );
    }

    let total = subtotal;
    let discount10 = 0;
    let discount5 = 0;
    if (tenPctActive) { discount10 = Math.round(total * 0.10); total -= discount10; }
    if (promoDiscount) { discount5 = Math.round(total * 0.05); total -= discount5; }

    await client.query("UPDATE reservations SET total_amount=$1 WHERE id=$2", [total, reservation.id]);

    if (promoReservationId !== null) {
      await client.query("UPDATE reservations SET promo_code_used=TRUE WHERE id=$1", [promoReservationId]);
    }

    await client.query("COMMIT");
    console.log(`✅ Worker: reservation ${reservation.id} created (${first_name} ${last_name})`);

  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Worker: error processing reservation:", err?.message);
  } finally {
    client.release();
  }
}

async function start() {
  await subscriber.connect();
  console.log("🔧 Worker connected to Redis, listening on reservation.created...");

  await subscriber.subscribe("reservation.created", (message) => {
    console.log("Worker: received reservation.created event");
    handleReservationCreated(message).catch((err) =>
      console.error("Worker: unhandled error:", err)
    );
  });
}

start().catch((err) => {
  console.error("Worker failed to start:", err);
  process.exit(1);
});
