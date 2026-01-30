import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { Pool } from "pg";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/**
 * Postgres connection
 */
const pool = new Pool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 5432),
  user: process.env.DB_USER ?? "salon",
  password: process.env.DB_PASSWORD ?? "salon",
  database: process.env.DB_NAME ?? "salon_db"
});

/**
 * Health check
 */
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "salon-backend" });
});

/**
 * SETTINGS
 */
app.get("/settings", async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM settings WHERE id = 1");
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Settings not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /settings error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.put("/settings", async (req, res) => {
  try {
    const {
      name,
      location,
      description,
      working_hours,
      base_currency,
      discount_until,
      discount_percent
    } = req.body ?? {};

    if (!name || !location || !description || !working_hours) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const q = `
      UPDATE settings
      SET
        name = $1,
        location = $2,
        description = $3,
        working_hours = $4,
        base_currency = COALESCE($5, base_currency),
        discount_until = $6,
        discount_percent = COALESCE($7, discount_percent),
        updated_at = NOW()
      WHERE id = 1
      RETURNING *;
    `;

    const values = [
      name,
      location,
      description,
      working_hours,
      base_currency ?? null,
      discount_until ?? null,
      discount_percent ?? null
    ];

    const result = await pool.query(q, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /settings error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * CATEGORIES
 */
app.get("/categories", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name FROM categories ORDER BY name ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /categories error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * CATALOG (categories + services)
 */
app.get("/catalog", async (_req, res) => {
  try {
    const q = `
      SELECT
        c.id AS category_id,
        c.name AS category_name,
        s.id AS service_id,
        s.name AS service_name,
        s.duration_minutes,
        s.price_rsd
      FROM categories c
      LEFT JOIN services s ON s.category_id = c.id
      ORDER BY c.name ASC, s.name ASC;
    `;

    const result = await pool.query(q);

    const map: Record<string, any> = {};
    for (const row of result.rows) {
      const key = String(row.category_id);
      if (!map[key]) {
        map[key] = {
          id: row.category_id,
          name: row.category_name,
          services: []
        };
      }
      if (row.service_id) {
        map[key].services.push({
          id: row.service_id,
          name: row.service_name,
          duration_minutes: row.duration_minutes,
          price_rsd: row.price_rsd
        });
      }
    }

    res.json(Object.values(map));
  } catch (err) {
    console.error("GET /catalog error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * Swagger / OpenAPI
 */
const openapiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Salon API",
    version: "1.0.0",
    description: "Backend API for Salon Reservation System"
  },
  servers: [{ url: "http://localhost:4000" }],
  paths: {
    "/health": { get: { summary: "Health check" } },
    "/settings": {
      get: { summary: "Get salon settings" },
      put: { summary: "Update salon settings" }
    },
    "/categories": { get: { summary: "List categories" } },
    "/catalog": { get: { summary: "Categories with services" } }
  }
};

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

/**
 * Start server
 */
const PORT = Number(process.env.PORT ?? 4000);
app.listen(PORT, () => {
  console.log(`Salon backend running on http://localhost:${PORT}`);
  console.log(`Swagger docs available at http://localhost:${PORT}/docs`);
});