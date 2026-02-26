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
   SWAGGER
====================== */
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: { title: "Salon API", version: "1.0.0", description: "Salon reservation backend API" },
    servers: [{ url: `http://localhost:${PORT}` }],
    paths: {
      "/health": { get: { summary: "Health check", responses: { "200": { description: "OK" } } } },
      "/login": {
        post: {
          summary: "Admin login",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    username: { type: "string", example: "admin" },
                    password: { type: "string", example: "admin" }
                  },
                  required: ["username", "password"]
                }
              }
            }
          },
          responses: { "200": { description: "Login OK" }, "401": { description: "Invalid credentials" } }
        }
      },
      "/settings": {
        get: { summary: "Get salon settings", responses: { "200": { description: "Settings object" } } },
        put: {
          summary: "Update salon settings",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    working_hours: { type: "string" },
                    discount_until: { type: "string", example: "2026-12-31" }
                  }
                }
              }
            }
          },
          responses: { "200": { description: "Updated" } }
        }
      },
      "/catalog": { get: { summary: "Get catalog (categories + services)", responses: { "200": { description: "Catalog" } } } },
      "/categories": {
        get: { summary: "List categories", responses: { "200": { description: "Categories" } } },
        post: {
          summary: "Create category",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } } } },
          responses: { "201": { description: "Created" } }
        }
      },
      "/categories/{id}": {
        put: {
          summary: "Rename category",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } } } },
          responses: { "200": { description: "Updated" } }
        },
        delete: {
          summary: "Delete category",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { "200": { description: "Deleted" } }
        }
      },
      "/services": {
        post: {
          summary: "Create service",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    category_id: { type: "integer" },
                    name: { type: "string" },
                    description: { type: "string" },
                    duration_minutes: { type: "integer" },
                    price_rsd: { type: "number" },
                    max_clients: { type: "integer" },
                    slot_start: { type: "string", example: "09:00" },
                    slot_end: { type: "string", example: "18:00" }
                  },
                  required: ["category_id", "name", "duration_minutes", "price_rsd"]
                }
              }
            }
          },
          responses: { "201": { description: "Created" } }
        }
      },
      "/services/{id}": {
        put: {
          summary: "Update service",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    category_id: { type: "integer" },
                    name: { type: "string" },
                    description: { type: "string" },
                    duration_minutes: { type: "integer" },
                    price_rsd: { type: "number" },
                    max_clients: { type: "integer" },
                    slot_start: { type: "string" },
                    slot_end: { type: "string" }
                  }
                }
              }
            }
          },
          responses: { "200": { description: "Updated" } }
        },
        delete: {
          summary: "Delete service",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { "200": { description: "Deleted" } }
        }
      },
      "/currencies": {
        get: { summary: "List allowed currencies", responses: { "200": { description: "Currencies" } } },
        put: {
          summary: "Set allowed currencies",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { codes: { type: "array", items: { type: "string" } } }, required: ["codes"] } } } },
          responses: { "200": { description: "Updated" } }
        }
      },
      "/reservations": {
        get: { summary: "List reservations (admin)", responses: { "200": { description: "List" } } },
        post: {
          summary: "Create reservation",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    first_name: { type: "string" }, last_name: { type: "string" },
                    email: { type: "string" }, phone: { type: "string" },
                    address1: { type: "string" }, postal_code: { type: "string" },
                    city: { type: "string" }, country: { type: "string" },
                    currency: { type: "string" }, promo_code_used: { type: "string" },
                    items: { type: "array", items: { type: "object", properties: { service_id: { type: "integer" }, date: { type: "string" }, time: { type: "string" } } } }
                  }
                }
              }
            }
          },
          responses: { "201": { description: "Created" }, "400": { description: "Error" } }
        }
      },
      "/reservations/lookup": {
        post: {
          summary: "Lookup reservation by access_code + email",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { access_code: { type: "string" }, email: { type: "string" } } } } } },
          responses: { "200": { description: "Found" }, "404": { description: "Not found" } }
        }
      },
      "/reservations/{id}/cancel": {
        post: {
          summary: "Cancel reservation",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { access_code: { type: "string" }, email: { type: "string" } } } } } },
          responses: { "200": { description: "Cancelled" }, "400": { description: "Already cancelled" }, "404": { description: "Not found" } }
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
   LOGIN
====================== */
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    const { rows } = await pool.query(
      "SELECT id, username FROM admins WHERE username = $1 AND password = $2",
      [username, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Pogrešno korisničko ime ili lozinka" });
    }

    res.json({ ok: true, username: rows[0].username });
  } catch (err: any) {
    console.error("POST /login error:", err?.message);
    res.status(500).json({ message: "Login failed" });
  }
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
  } catch {
    res.status(500).json({ message: "Failed to load settings" });
  }
});

app.put("/settings", async (req, res) => {
  try {
    const { name, description, working_hours, discount_until } = req.body;
    const { rows } = await pool.query(
      `UPDATE settings SET name=$1, description=$2, working_hours=$3, discount_until=$4 RETURNING *`,
      [name, description, working_hours, discount_until ?? null]
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
        SELECT c.id, c.name,
          COALESCE(
            json_agg(
              CASE WHEN s.id IS NULL THEN NULL ELSE
                json_build_object(
                  'id', s.id, 'name', s.name,
                  'description', s.description,
                  'duration_minutes', s.duration_minutes,
                  'price_rsd', s.price_rsd,
                  'max_clients', s.max_clients,
                  'slot_start', s.slot_start,
                  'slot_end', s.slot_end
                )
              END
            ) FILTER (WHERE s.id IS NOT NULL),
            '[]'::json
          ) AS services
        FROM categories c
        LEFT JOIN services s ON s.category_id = c.id
        GROUP BY c.id ORDER BY c.id
      `);
      return rows;
    });
    console.log(result.hit ? "🟢 catalog CACHE HIT" : "🟡 catalog CACHE MISS");
    res.json(result.data);
  } catch {
    res.status(500).json({ message: "Failed to load catalog" });
  }
});

/* ======================
   CATEGORIES CRUD
====================== */
app.get("/categories", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM categories ORDER BY id");
    res.json(rows);
  } catch {
    res.status(500).json({ message: "Failed to load categories" });
  }
});

app.post("/categories", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });
    const { rows } = await pool.query(
      "INSERT INTO categories (name) VALUES ($1) RETURNING *",
      [name]
    );
    await delKey(CATALOG_CACHE_KEY);
    res.status(201).json(rows[0]);
  } catch {
    res.status(500).json({ message: "Failed to create category" });
  }
});

app.put("/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });
    const { rows } = await pool.query(
      "UPDATE categories SET name=$1 WHERE id=$2 RETURNING *",
      [name, id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Category not found" });
    await delKey(CATALOG_CACHE_KEY);
    res.json(rows[0]);
  } catch {
    res.status(500).json({ message: "Failed to update category" });
  }
});

app.delete("/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM categories WHERE id=$1", [id]);
    await delKey(CATALOG_CACHE_KEY);
    res.json({ message: "Deleted" });
  } catch {
    res.status(500).json({ message: "Failed to delete category" });
  }
});

/* ======================
   SERVICES CRUD
====================== */
app.post("/services", async (req, res) => {
  try {
    const { category_id, name, description, duration_minutes, price_rsd, max_clients, slot_start, slot_end } = req.body;
    if (!category_id || !name || !duration_minutes || !price_rsd) {
      return res.status(400).json({ message: "category_id, name, duration_minutes, price_rsd are required" });
    }
    const { rows } = await pool.query(
      `INSERT INTO services (category_id, name, description, duration_minutes, price_rsd, max_clients, slot_start, slot_end)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [category_id, name, description ?? null, duration_minutes, price_rsd,
       max_clients ?? 1, slot_start ?? "09:00", slot_end ?? "18:00"]
    );
    await delKey(CATALOG_CACHE_KEY);
    res.status(201).json(rows[0]);
  } catch (err: any) {
    console.error("POST /services error:", err?.message);
    res.status(500).json({ message: "Failed to create service" });
  }
});

app.put("/services/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, name, description, duration_minutes, price_rsd, max_clients, slot_start, slot_end } = req.body;
    const { rows } = await pool.query(
      `UPDATE services SET
         category_id=$1, name=$2, description=$3, duration_minutes=$4,
         price_rsd=$5, max_clients=$6, slot_start=$7, slot_end=$8
       WHERE id=$9 RETURNING *`,
      [category_id, name, description ?? null, duration_minutes, price_rsd,
       max_clients ?? 1, slot_start ?? "09:00", slot_end ?? "18:00", id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Service not found" });
    await delKey(CATALOG_CACHE_KEY);
    res.json(rows[0]);
  } catch (err: any) {
    console.error("PUT /services/:id error:", err?.message);
    res.status(500).json({ message: "Failed to update service" });
  }
});

app.delete("/services/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM services WHERE id=$1", [id]);
    await delKey(CATALOG_CACHE_KEY);
    res.json({ message: "Deleted" });
  } catch {
    res.status(500).json({ message: "Failed to delete service" });
  }
});

/* ======================
   CURRENCIES
====================== */
app.get("/currencies", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT code FROM allowed_currencies ORDER BY code");
    res.json(rows.map((r: any) => r.code));
  } catch {
    res.status(500).json({ message: "Failed to load currencies" });
  }
});

app.put("/currencies", async (req, res) => {
  try {
    const { codes } = req.body;
    if (!Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({ message: "codes array is required" });
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM allowed_currencies");
      for (const code of codes) {
        await client.query("INSERT INTO allowed_currencies (code) VALUES ($1)", [code.toUpperCase()]);
      }
      await client.query("COMMIT");
      res.json({ codes });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch {
    res.status(500).json({ message: "Failed to update currencies" });
  }
});

/* ======================
   RESERVATIONS
====================== */
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

app.post("/reservations", async (req, res) => {
  try {
    const { first_name, last_name, email, phone, address1, postal_code, city, country, currency, promo_code_used, items } = req.body;

    if (!first_name || !last_name || !email || !address1 || !postal_code || !city || !country) {
      return res.status(400).json({ message: "Missing required customer fields" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "At least one reservation item is required" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Promo kod validacija
      let promoDiscount = false;
      let promoReservationId: number | null = null;

      if (promo_code_used) {
        const promoRes = await client.query(
          "SELECT id, email, status, promo_code_used FROM reservations WHERE promo_code = $1",
          [promo_code_used.toUpperCase()]
        );
        if (promoRes.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({ message: "Promo kod nije pronađen" });
        }
        const promoRow = promoRes.rows[0];
        if (promoRow.status === "cancelled") {
          await client.query("ROLLBACK");
          return res.status(400).json({ message: "Promo kod otkazane rezervacije nije važeći" });
        }
        if (promoRow.promo_code_used) {
          await client.query("ROLLBACK");
          return res.status(400).json({ message: "Promo kod je već iskorišćen" });
        }
        // Promo kod može koristiti samo vlasnik — email mora odgovarati
        if (promoRow.email.toLowerCase() !== email.toLowerCase()) {
          await client.query("ROLLBACK");
          return res.status(400).json({ message: "Ovaj promo kod nije namenjen ovom email-u" });
        }
        promoDiscount = true;
        promoReservationId = promoRow.id;
      }

      // Popust iz settings
      const settingsRes = await client.query("SELECT discount_until FROM settings LIMIT 1");
      const tenPctActive = isDiscountActive(settingsRes.rows[0]?.discount_until ?? null);

      const accessCode = randomCode(8);
      const promoCode = randomCode(6);

      const ins = await client.query(
        `INSERT INTO reservations (first_name,last_name,email,phone,address1,postal_code,city,country,access_code,promo_code,currency)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [first_name, last_name, email, phone ?? null, address1, postal_code, city, country, accessCode, promoCode, currency ?? "RSD"]
      );
      const reservation = ins.rows[0];

      let subtotal = 0;
      for (const it of items) {
        const { service_id, date, time } = it;
        if (!service_id || !date || !time) {
          await client.query("ROLLBACK");
          return res.status(400).json({ message: "Each item needs service_id, date, time" });
        }
        const svc = await client.query("SELECT id, price_rsd FROM services WHERE id=$1", [service_id]);
        if (svc.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({ message: `Service ${service_id} not found` });
        }
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
      return res.status(201).json({ reservationId: reservation.id, accessCode: reservation.access_code, promoCode: reservation.promo_code, subtotal, discount10, discount5, totalAmount: total, currency: currency ?? "RSD", status: reservation.status });

    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("POST /reservations error:", err?.message);
    return res.status(500).json({ message: "Failed to create reservation" });
  }
});

app.get("/reservations", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id,first_name,last_name,email,total_amount,status,created_at FROM reservations ORDER BY created_at DESC LIMIT 50"
    );
    res.json(rows);
  } catch (err: any) {
    console.error("GET /reservations error:", err?.message);
    res.status(500).json({ message: "Failed to load reservations" });
  }
});

app.get("/reservations/slots", async (req, res) => {
  try {
    const { service_id, date } = req.query;
    if (!service_id || !date) {
      return res.status(400).json({ message: "service_id and date required" });
    }
    const { rows } = await pool.query(
      `SELECT ri.time, COUNT(*) as count
       FROM reservation_items ri
       JOIN reservations r ON r.id = ri.reservation_id
       WHERE ri.service_id = $1 AND ri.date::date = $2::date AND r.status != 'cancelled'
       GROUP BY ri.time`,
      [service_id, date]
    );
    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.time.slice(0, 5)] = Number(row.count);
    }
    res.json(result);
  } catch (err: any) {
    console.error("GET /reservations/slots error:", err?.message);
    res.status(500).json({ message: "Failed to load slots" });
  }
});

app.get("/reservations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const header = await pool.query("SELECT * FROM reservations WHERE id=$1", [id]);
    if (header.rows.length === 0) return res.status(404).json({ message: "Reservation not found" });
    const items = await pool.query(
      `SELECT ri.id, ri.service_id, s.name as service_name, ri.date, ri.time, ri.unit_price, ri.line_total
       FROM reservation_items ri JOIN services s ON s.id=ri.service_id
       WHERE ri.reservation_id=$1 ORDER BY ri.date, ri.time`,
      [id]
    );
    res.json({ reservation: header.rows[0], items: items.rows });
  } catch (err: any) {
    console.error("GET /reservations/:id error:", err?.message);
    res.status(500).json({ message: "Failed to load reservation" });
  }
});

app.post("/reservations/lookup", async (req, res) => {
  try {
    const { access_code, email } = req.body;
    if (!access_code || !email) return res.status(400).json({ message: "access_code and email required" });
    const header = await pool.query(
      "SELECT * FROM reservations WHERE access_code=$1 AND email=$2",
      [access_code.toUpperCase(), email.toLowerCase()]
    );
    if (header.rows.length === 0) return res.status(404).json({ message: "Rezervacija nije pronađena" });
    const items = await pool.query(
      `SELECT ri.id, ri.service_id, s.name as service_name, ri.date, ri.time, ri.unit_price, ri.line_total
       FROM reservation_items ri JOIN services s ON s.id=ri.service_id
       WHERE ri.reservation_id=$1 ORDER BY ri.date, ri.time`,
      [header.rows[0].id]
    );
    res.json({ reservation: header.rows[0], items: items.rows });
  } catch (err: any) {
    console.error("POST /reservations/lookup error:", err?.message);
    res.status(500).json({ message: "Failed to lookup reservation" });
  }
});

app.post("/reservations/:id/items", async (req, res) => {
  try {
    const { id } = req.params;
    const { access_code, email, service_id, date, time } = req.body;
    if (!access_code || !email || !service_id || !date || !time) {
      return res.status(400).json({ message: "access_code, email, service_id, date, time su obavezni" });
    }
    const found = await pool.query(
      "SELECT * FROM reservations WHERE id=$1 AND access_code=$2 AND email=$3",
      [id, access_code.toUpperCase(), email.toLowerCase()]
    );
    if (found.rows.length === 0) return res.status(404).json({ message: "Rezervacija nije pronađena" });
    if (found.rows[0].status === "cancelled") return res.status(400).json({ message: "Otkazana rezervacija se ne može menjati" });

    const svc = await pool.query("SELECT * FROM services WHERE id=$1", [service_id]);
    if (svc.rows.length === 0) return res.status(404).json({ message: "Usluga nije pronađena" });

    // Proveri kapacitet
    const taken = await pool.query(
      `SELECT COUNT(*) as cnt FROM reservation_items ri
       JOIN reservations r ON r.id=ri.reservation_id
       WHERE ri.service_id=$1 AND ri.date::date=$2::date AND ri.time=$3 AND r.status!='cancelled'`,
      [service_id, date, time]
    );
    if (Number(taken.rows[0].cnt) >= svc.rows[0].max_clients) {
      return res.status(400).json({ message: "Termin je popunjen" });
    }

    const unitPrice = Number(svc.rows[0].price_rsd);

    // Proveri da li je 10% popust aktivan
    const settings = await pool.query("SELECT discount_until FROM settings LIMIT 1");
    const tenPct = isDiscountActive(settings.rows[0]?.discount_until ?? null);
    const lineTotal = tenPct ? Math.round(unitPrice * 0.90) : unitPrice;

    const ins = await pool.query(
      "INSERT INTO reservation_items (reservation_id,service_id,date,time,unit_price,line_total) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [id, service_id, date, time, unitPrice, lineTotal]
    );
    // Ažuriraj ukupni iznos
    const newTotal = Number(found.rows[0].total_amount) + lineTotal;
    await pool.query("UPDATE reservations SET total_amount=$1 WHERE id=$2", [newTotal, id]);

    res.status(201).json({
      item: { ...ins.rows[0], service_name: svc.rows[0].name },
      total_amount: newTotal,
    });
  } catch (err: any) {
    console.error("POST /reservations/:id/items error:", err?.message);
    res.status(500).json({ message: "Greška pri dodavanju usluge" });
  }
});

app.delete("/reservations/:id/items/:itemId", async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { access_code, email } = req.body;
    if (!access_code || !email) return res.status(400).json({ message: "access_code i email su obavezni" });

    const found = await pool.query(
      "SELECT * FROM reservations WHERE id=$1 AND access_code=$2 AND email=$3",
      [id, access_code.toUpperCase(), email.toLowerCase()]
    );
    if (found.rows.length === 0) return res.status(404).json({ message: "Rezervacija nije pronađena" });
    if (found.rows[0].status === "cancelled") return res.status(400).json({ message: "Otkazana rezervacija se ne može menjati" });

    const item = await pool.query(
      "SELECT * FROM reservation_items WHERE id=$1 AND reservation_id=$2",
      [itemId, id]
    );
    if (item.rows.length === 0) return res.status(404).json({ message: "Stavka nije pronađena" });

    await pool.query("DELETE FROM reservation_items WHERE id=$1", [itemId]);

    // Ažuriraj ukupni iznos
    const newTotal = Math.max(0, Number(found.rows[0].total_amount) - Number(item.rows[0].line_total));
    await pool.query("UPDATE reservations SET total_amount=$1 WHERE id=$2", [newTotal, id]);

    res.json({ message: "Usluga uklonjena", total_amount: newTotal });
  } catch (err: any) {
    console.error("DELETE /reservations/:id/items/:itemId error:", err?.message);
    res.status(500).json({ message: "Greška pri uklanjanju usluge" });
  }
});

app.post("/reservations/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;
    const { access_code, email } = req.body;
    if (!access_code || !email) return res.status(400).json({ message: "access_code and email required" });
    const found = await pool.query(
      "SELECT * FROM reservations WHERE id=$1 AND access_code=$2 AND email=$3",
      [id, access_code.toUpperCase(), email.toLowerCase()]
    );
    if (found.rows.length === 0) return res.status(404).json({ message: "Rezervacija nije pronađena" });
    if (found.rows[0].status === "cancelled") return res.status(400).json({ message: "Već otkazana" });
    await pool.query("UPDATE reservations SET status='cancelled' WHERE id=$1", [id]);
    res.json({ message: "Rezervacija otkazana", reservationId: Number(id) });
  } catch (err: any) {
    console.error("POST /reservations/:id/cancel error:", err?.message);
    res.status(500).json({ message: "Failed to cancel reservation" });
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
  try { await ensureRedis(); }
  catch { console.warn("⚠️ Redis unavailable, continuing without cache"); }
  app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
}

start();