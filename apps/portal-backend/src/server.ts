/**
 * server.ts — Portal backend API
 * Čita iz portal-db i izlaže endpointe za salon-reporting frontend.
 * Port: 4001
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import { pool } from "./pool";

const app = express();
const PORT = Number(process.env.PORT) || 4001;

app.use(cors());
app.use(express.json());

/* ======================
   HEALTH
====================== */
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "portal-backend" });
});

/* ======================
   LOGIN
   Portal koristi iste kredencijale kao salon-backend
   ali proverava na salon-backend API-ju
====================== */
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const SALON_API = process.env.SALON_API_URL ?? "http://salon-backend:4000";

    const r = await fetch(`${SALON_API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    res.json(data);
  } catch (err: any) {
    console.error("Portal /login error:", err?.message);
    res.status(500).json({ message: "Login failed" });
  }
});

/* ======================
   REPORTS
====================== */

/**
 * Feature 1: Broj rezervisanih termina po kategoriji usluge
 */
app.get("/reports/by-category", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(pri.service_category, 'Nepoznato') AS category,
        COUNT(pri.id)::int AS count
      FROM portal_reservation_items pri
      JOIN portal_reservations pr ON pr.id = pri.salon_reservation_id
      WHERE pr.status != 'cancelled'
        AND pri.service_category IS NOT NULL
      GROUP BY pri.service_category
      ORDER BY count DESC
    `);
    res.json(rows);
  } catch (err: any) {
    console.error("GET /reports/by-category error:", err?.message);
    res.status(500).json({ message: "Failed to load report" });
  }
});

/**
 * Feature 2: Broj rezervacija po datumima kreiranja
 */
app.get("/reports/by-date", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
        SELECT
            pri.reservation_date::text AS date,
            COUNT(pri.id)::int AS count
        FROM portal_reservation_items pri
        JOIN portal_reservations pr ON pr.id = pri.salon_reservation_id
        WHERE pr.status != 'cancelled'
            AND pri.reservation_date IS NOT NULL
        GROUP BY pri.reservation_date
        ORDER BY pri.reservation_date ASC
    `);
    res.json(rows);
  } catch (err: any) {
    console.error("GET /reports/by-date error:", err?.message);
    res.status(500).json({ message: "Failed to load report" });
  }
});

/* ======================
   404
====================== */
app.use((_req, res) => {
  res.status(404).json({ message: "Not found" });
});

/* ======================
   START
====================== */
app.listen(PORT, () => {
  console.log(`✅ Portal backend running on port ${PORT}`);
});