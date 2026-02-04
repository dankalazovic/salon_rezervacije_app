import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

import { ensureRedis } from "./cache/redis";
import { getOrSetJSON, delKey } from "./cache/cacheHelpers";
import { pool } from "./db/pool";

dotenv.config({ path: "./.env" });

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json());

/* ======================
   SWAGGER (INLINE with PATHS)
====================== */
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Salon API",
      version: "1.0.0",
      description: "Salon reservation backend API"
    },
    servers: [{ url: `http://localhost:${PORT}` }],
    paths: {
      "/health": {
        get: {
          summary: "Health check",
          responses: {
            "200": {
              description: "OK"
            }
          }
        }
      },
      "/settings": {
        get: {
          summary: "Get salon settings",
          responses: {
            "200": { description: "Settings object" }
          }
        },
        put: {
          summary: "Update salon settings",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string", example: "Trač" },
                    description: { type: "string", example: "Opis salona" },
                    working_hours: { type: "string", example: "Mon-Fri 09-17" }
                  },
                  required: ["name", "description", "working_hours"]
                }
              }
            }
          },
          responses: {
            "200": { description: "Updated settings" }
          }
        }
      },
      "/catalog": {
        get: {
          summary: "Get catalog (categories + services)",
          responses: {
            "200": { description: "Catalog list" }
          }
        }
      },
      "/reservations": {
        get: {
          summary: "List reservations (admin)",
          responses: { "200": { description: "List of reservations" } }
        },
        post: {
          summary: "Create reservation",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    first_name: { type: "string" },
                    last_name: { type: "string" },
                    email: { type: "string" },
                    phone: { type: "string" },
                    address1: { type: "string" },
                    postal_code: { type: "string" },
                    city: { type: "string" },
                    country: { type: "string" },
                    currency: { type: "string", example: "RSD" },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          service_id: { type: "integer" },
                          date: { type: "string", example: "2026-02-10" },
                          time: { type: "string", example: "10:00" }
                        },
                        required: ["service_id", "date", "time"]
                      }
                    }
                  },
                  required: ["first_name", "last_name", "email", "address1", "postal_code", "city", "country", "items"]
                }
              }
            }
          },
          responses: {
            "201": { description: "Created reservation" },
            "400": { description: "Validation error" },
            "500": { description: "Server error" }
          }
        }
      }
    }
  },
  apis: []
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/* ======================
   HEALTH
====================== */
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

/* ======================
   SETTINGS (CACHED)
====================== */
const SETTINGS_CACHE_KEY = "settings:v1";
const SETTINGS_TTL = 300;

app.get("/settings", async (_req, res) => {
  try {
    const result = await getOrSetJSON(SETTINGS_CACHE_KEY, SETTINGS_TTL, async () => {
      const { rows } = await pool.query("SELECT * FROM settings LIMIT 1");
      return rows[0];
    });

    console.log(result.hit ? "🟢 settings CACHE HIT" : "🟡 settings CACHE MISS");
    res.json(result.data);
  } catch (e) {
    res.status(500).json({ message: "Failed to load settings" });
  }
});

app.put("/settings", async (req, res) => {
  try {
    const { name, description, working_hours } = req.body;

    const { rows } = await pool.query(
      `UPDATE settings
       SET name = $1, description = $2, working_hours = $3
       RETURNING *`,
      [name, description, working_hours]
    );

    await delKey(SETTINGS_CACHE_KEY);
    console.log("🧹 settings cache invalidated");

    res.json(rows[0]);
  } catch {
    res.status(500).json({ message: "Failed to update settings" });
  }
});

/* ======================
   CATALOG (CACHED)
====================== */
const CATALOG_CACHE_KEY = "catalog:v1";
const CATALOG_TTL = 180;

app.get("/catalog", async (_req, res) => {
  try {
    const result = await getOrSetJSON(CATALOG_CACHE_KEY, CATALOG_TTL, async () => {
      const { rows } = await pool.query(`
        SELECT
          c.id,
          c.name,
          COALESCE(
            json_agg(
              CASE WHEN s.id IS NULL THEN NULL ELSE
                json_build_object(
                  ''id', s.id,
                  'name', s.name,
                  'duration_minutes', s.duration_minutes,
                  'price_rsd', s.price_rsd
                )
              END
            ) FILTER (WHERE s.id IS NOT NULL),
            '[]'::json
          ) AS services
        FROM categories c
        LEFT JOIN services s ON s.category_id = c.id
        GROUP BY c.id
      `);

      return rows;
    });

    console.log(result.hit ? "🟢 catalog CACHE HIT" : "🟡 catalog CACHE MISS");
    res.json(result.data);
  } catch {
    res.status(500).json({ message: "Failed to load catalog" });
  }
});

function randomCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

app.post("/reservations", async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      address1,
      postal_code,
      city,
      country,
      currency,
      items
    } = req.body;

    // minimalna validacija
    if (!first_name || !last_name || !email || !address1 || !postal_code || !city || !country) {
      return res.status(400).json({ message: "Missing required customer fields" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "At least one reservation item is required" });
    }

    const accessCode = randomCode(8);
    const promoCode = randomCode(6);

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1) Insert reservation header
      const ins = await client.query(
        `
        INSERT INTO reservations
          (first_name, last_name, email, phone, address1, postal_code, city, country,
           access_code, promo_code, currency)
        VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING *
        `,
        [
          first_name,
          last_name,
          email,
          phone ?? null,
          address1,
          postal_code,
          city,
          country,
          accessCode,
          promoCode,
          currency ?? "RSD"
        ]
      );

      const reservation = ins.rows[0];

      // 2) Insert items + calculate total from services.price_rsd
      let total = 0;

      for (const it of items) {
        const { service_id, date, time } = it;

        if (!service_id || !date || !time) {
          await client.query("ROLLBACK");
          return res.status(400).json({ message: "Each item needs service_id, date, time" });
        }

        const svc = await client.query(
          "SELECT id, price_rsd FROM services WHERE id = $1",
          [service_id]
        );

        if (svc.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({ message: `Service ${service_id} not found` });
        }

        const unitPrice = Number(svc.rows[0].price_rsd);
        const lineTotal = unitPrice;

        total += lineTotal;

        await client.query(
          `
          INSERT INTO reservation_items
            (reservation_id, service_id, date, time, unit_price, line_total)
          VALUES
            ($1,$2,$3,$4,$5,$6)
          `,
          [reservation.id, service_id, date, time, unitPrice, lineTotal]
        );
      }

      // 3) update total_amount
      await client.query(
        "UPDATE reservations SET total_amount = $1 WHERE id = $2",
        [total, reservation.id]
      );

      await client.query("COMMIT");

      return res.status(201).json({
        reservationId: reservation.id,
        accessCode: reservation.access_code,
        promoCode: reservation.promo_code,
        totalAmount: total,
        status: reservation.status
      });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("POST /reservations error:", err?.message || err);
    return res.status(500).json({ message: "Failed to create reservation" });

  }
});

app.get("/reservations", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT id, first_name, last_name, email, total_amount, status, created_at
      FROM reservations
      ORDER BY created_at DESC
      LIMIT 50
      `
    );
    res.json(rows);
  } catch (err: any) {
    console.error("GET /reservations error:", err?.message || err);
    res.status(500).json({ message: "Failed to load reservations" });
  }
});

app.get("/reservations/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const header = await pool.query(
      "SELECT * FROM reservations WHERE id = $1",
      [id]
    );
    if (header.rows.length === 0) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    const items = await pool.query(
      `
      SELECT
        ri.id,
        ri.service_id,
        s.name as service_name,
        ri.date,
        ri.time,
        ri.unit_price,
        ri.line_total
      FROM reservation_items ri
      JOIN services s ON s.id = ri.service_id
      WHERE ri.reservation_id = $1
      ORDER BY ri.date, ri.time
      `,
      [id]
    );

    res.json({
      reservation: header.rows[0],
      items: items.rows
    });
  } catch (err: any) {
    console.error("GET /reservations/:id error:", err?.message || err);
    res.status(500).json({ message: "Failed to load reservation" });
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
async function start() {
  try {
    await ensureRedis();
  } catch {
    console.warn("⚠️ Redis unavailable, continuing without cache");
  }

  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}

start();