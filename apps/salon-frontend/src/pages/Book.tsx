import { useEffect, useState } from "react";
import Button from "../components/Button";
import Card from "../components/Card";

const API = "http://localhost:4000";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Service {
  id: number;
  name: string;
  duration_minutes: number;
  price_rsd: number;
  max_clients: number;
  slot_start: string;
  slot_end: string;
}

interface Category {
  id: number;
  name: string;
  services: Service[];
}

interface SelectedItem {
  service: Service;
  date: string;
  time: string;
}

interface CustomerData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address1: string;
  postal_code: string;
  city: string;
  country: string;
}

interface BookingResult {
  reservationId: number;
  accessCode: string;
  promoCode: string;
  totalAmount: number;
  subtotal: number;
  discount10: number;
  discount5: number;
  currency: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateTimeSlots(start = "09:00", end = "18:00", step = 30): string[] {
  const slots: string[] = [];
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let cur = sh * 60 + sm;
  const endMin = eh * 60 + em;
  while (cur < endMin) {
    const h = Math.floor(cur / 60).toString().padStart(2, "0");
    const m = (cur % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
    cur += step;
  }
  return slots;
}

// Proveri da li se dve usluge vremenski preklapaju na isti datum
// Uslov: sisanje završi u 15:00, manikir može početi tačno u 15:00 (ok)
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function hasTimeConflict(items: SelectedItem[]): string | null {
  // Samo proveravamo stavke koje imaju i datum i vreme
  const scheduled = items.filter((i) => i.date && i.time);
  for (let a = 0; a < scheduled.length; a++) {
    for (let b = a + 1; b < scheduled.length; b++) {
      const ia = scheduled[a];
      const ib = scheduled[b];
      if (ia.date !== ib.date) continue; // različiti dani — nema konflikta
      const aStart = timeToMinutes(ia.time);
      const aEnd = aStart + ia.service.duration_minutes;
      const bStart = timeToMinutes(ib.time);
      const bEnd = bStart + ib.service.duration_minutes;
      // Preklapanje postoji ako se intervali seku (ali ne ako jedan odmah počinje kad drugi završi)
      if (aStart < bEnd && bStart < aEnd) {
        return `"${ia.service.name}" (${ia.time}–${minutesToTime(aEnd)}) i "${ib.service.name}" (${ib.time}–${minutesToTime(bEnd)}) se preklapaju. Zakaži ih jedno za drugim.`;
      }
    }
  }
  return null;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}



function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// Učitaj zauzete termine za uslugu na određeni datum
async function fetchTakenSlots(serviceId: number, date: string): Promise<Record<string, number>> {
  try {
    const r = await fetch(`${API}/reservations/slots?service_id=${serviceId}&date=${date}`);
    if (!r.ok) { console.warn("slots endpoint error", r.status); return {}; }
    const data = await r.json();
    console.log(`🔍 takenSlots service=${serviceId} date=${date}`, data);
    return data;
  } catch (e) {
    console.error("fetchTakenSlots failed", e);
    return {};
  }
}

// Kurs valute prema RSD — vraća koliko RSD vredi 1 jedinica date valute
// Npr. za EUR: 1 EUR = ~118 RSD
async function fetchExchangeRate(currency: string): Promise<number> {
  if (currency === "RSD") return 1;
  try {
    const r = await fetch(`https://api.frankfurter.app/latest?from=${currency}&to=RSD`);
    const data = await r.json();
    return data.rates?.["RSD"] ?? 118;
  } catch {
    return 118; // fallback: 1 EUR ≈ 118 RSD
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: number }) {
  const steps = ["Podaci", "Usluge", "Potvrda"];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "2rem" }}>
      {steps.map((label, i) => {
        const idx = i + 1;
        const active = idx === step;
        const done = idx < step;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.85rem", fontWeight: 700, transition: "all 0.2s",
              background: active ? "linear-gradient(135deg,#ff3d8a,#f01f72)" : done ? "rgba(255,61,138,0.15)" : "rgba(255,255,255,0.70)",
              color: active ? "white" : done ? "#f01f72" : "#9ca3af",
              border: active ? "none" : "1.5px solid rgba(255,61,138,0.20)",
              boxShadow: active ? "0 4px 14px rgba(255,61,138,0.35)" : "none",
            }}>
              {done ? "✓" : idx}
            </div>
            <span style={{
              fontSize: "0.82rem", fontWeight: 600,
              color: active ? "#f01f72" : "#9ca3af",
              fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif"
            }}>
              {label}
            </span>
            {i < steps.length - 1 && (
              <div style={{ width: "2rem", height: "1px", background: "rgba(255,61,138,0.20)", margin: "0 0.25rem" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function InputField({
  label, required, ...props
}: { label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#f01f72", marginBottom: "0.4rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
        {label} {required && <span style={{ color: "#ff3d8a" }}>*</span>}
      </label>
      <input
        {...props}
        style={{
          width: "100%", borderRadius: "14px",
          background: "rgba(255,255,255,0.90)",
          border: "1.5px solid rgba(255,61,138,0.20)",
          padding: "0.65rem 1rem", fontSize: "0.9rem",
          color: "#1a0a10", outline: "none",
          fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────

function Step1({ data, onChange, onNext, onBack }: { data: CustomerData; onChange: (d: CustomerData) => void; onNext: () => void; onBack: () => void }) {
  const set = (k: keyof CustomerData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...data, [k]: e.target.value });

  const valid = data.first_name && data.last_name && data.email &&
    data.address1 && data.postal_code && data.city && data.country;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#1a0a10", marginBottom: "0.3rem" }}>Osnovni podaci 💗</h2>
        <p style={{ color: "#6b2145", fontSize: "0.88rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>Unesi svoje podatke za rezervaciju.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
        <InputField label="Ime" required placeholder="Ana" value={data.first_name} onChange={set("first_name")} />
        <InputField label="Prezime" required placeholder="Jovanović" value={data.last_name} onChange={set("last_name")} />
        <InputField label="Email" required type="email" placeholder="ana@example.com" value={data.email} onChange={set("email")} />
        <InputField label="Telefon" type="tel" placeholder="060 123 4567" value={data.phone} onChange={set("phone")} />
        <InputField label="Adresa" required placeholder="Ulica i broj" value={data.address1} onChange={set("address1")} />
        <InputField label="Poštanski broj" required placeholder="11000" value={data.postal_code} onChange={set("postal_code")} />
        <InputField label="Grad" required placeholder="Beograd" value={data.city} onChange={set("city")} />
        <InputField label="Država" required placeholder="Srbija" value={data.country} onChange={set("country")} />
      </div>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button className="btn-secondary" onClick={onBack}>← Nazad</button>
        <button className="btn-primary" disabled={!valid} onClick={onNext} style={{ flex: 1, opacity: valid ? 1 : 0.5 }}>
          Nastavi — odaberi usluge ✨
        </button>
      </div>
    </div>
  );
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────

function ServiceSlotPicker({
  service, item, otherItems, onDateChange, onTimeChange,
}: {
  service: Service;
  item: SelectedItem;
  otherItems: SelectedItem[]; // sve ostale odabrane usluge (bez ove)
  onDateChange: (id: number, date: string) => void;
  onTimeChange: (id: number, time: string) => void;
}) {
  const [takenSlots, setTakenSlots] = useState<Record<string, number>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);

  const slotStart = service.slot_start?.slice(0, 5) ?? "09:00";
  const slotEnd = service.slot_end?.slice(0, 5) ?? "18:00";
  const timeSlots = generateTimeSlots(slotStart, slotEnd);

  useEffect(() => {
    if (!item.date) return;
    setLoadingSlots(true);
    fetchTakenSlots(service.id, item.date).then((slots) => {
      setTakenSlots(slots);
      setLoadingSlots(false);
    });
  }, [item.date, service.id]);

  function isSlotFull(time: string) {
    return (takenSlots[time] ?? 0) >= Number(service.max_clients);
  }

  // Proverava da li bi odabir ovog vremena izazvao konflikt sa drugim uslugama
  function isSlotConflicting(time: string): boolean {
    if (!item.date) return false;
    const sameDay = otherItems.filter((i) => i.date === item.date && i.time);
    const thisStart = timeToMinutes(time);
    const thisEnd = thisStart + service.duration_minutes;
    return sameDay.some((other) => {
      const oStart = timeToMinutes(other.time);
      const oEnd = oStart + other.service.duration_minutes;
      return thisStart < oEnd && oStart < thisEnd;
    });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginTop: "0.75rem" }}
      onClick={(e) => e.stopPropagation()}>
      <div>
        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6b2145", marginBottom: "0.3rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>Datum</div>
        <input
          type="date" min={todayStr()} value={item.date}
          onChange={(e) => onDateChange(service.id, e.target.value)}
          style={{ width: "100%", borderRadius: "12px", background: "white", border: "1.5px solid rgba(255,61,138,0.20)", padding: "0.5rem 0.75rem", fontSize: "0.85rem", outline: "none", boxSizing: "border-box" }}
        />
      </div>
      <div>
        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6b2145", marginBottom: "0.3rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
          Vreme {loadingSlots && <span style={{ fontWeight: 400 }}>(učitavam…)</span>}
        </div>
        <select
          value={item.time}
          onChange={(e) => onTimeChange(service.id, e.target.value)}
          style={{ width: "100%", borderRadius: "12px", background: "white", border: "1.5px solid rgba(255,61,138,0.20)", padding: "0.5rem 0.75rem", fontSize: "0.85rem", outline: "none", boxSizing: "border-box" }}
        >
          <option value="">-- izaberi --</option>
          {timeSlots.map((t) => {
            const full = isSlotFull(t);
            const conflict = isSlotConflicting(t);
            const disabled = full || conflict;
            let label = t;
            if (full) label += " — popunjeno";
            else if (conflict) label += " — preklapanje";
            return (
              <option key={t} value={t} disabled={disabled}>
                {label}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}

function Step2({
  catalog, selected, currency, currencies, promoInput,
  onToggleService, onDateChange, onTimeChange,
  onCurrencyChange, onPromoChange, onBack, onNext,
}: {
  catalog: Category[];
  selected: SelectedItem[];
  currency: string;
  currencies: string[];
  promoInput: string;
  onToggleService: (svc: Service) => void;
  onDateChange: (id: number, date: string) => void;
  onTimeChange: (id: number, time: string) => void;
  onCurrencyChange: (c: string) => void;
  onPromoChange: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const isSelected = (id: number) => selected.some((s) => s.service.id === id);

  const conflictError = hasTimeConflict(selected);
  const canProceed = selected.length > 0 && selected.every((s) => s.date && s.time) && !conflictError;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#1a0a10", marginBottom: "0.3rem" }}>Odaberi usluge 💅</h2>
        <p style={{ color: "#6b2145", fontSize: "0.88rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>Klikni na uslugu da je odabereš. Možeš odabrati više.</p>
      </div>

      {catalog.length === 0 && <p style={{ color: "#6b2145", fontSize: "0.88rem" }}>Učitavanje kataloga…</p>}

      {catalog.map((cat) => (
        <div key={cat.id}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#f01f72", marginBottom: "0.75rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
            {cat.name}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {cat.services.map((svc) => {
              const sel = isSelected(svc.id);
              const item = selected.find((s) => s.service.id === svc.id);
              return (
                <div
                  key={svc.id}
                  onClick={() => onToggleService(svc)}
                  style={{
                    borderRadius: "18px", padding: "1rem", cursor: "pointer", transition: "all 0.2s",
                    background: sel ? "rgba(255,61,138,0.08)" : "rgba(255,255,255,0.70)",
                    border: `1.5px solid ${sel ? "#ff6ea8" : "rgba(255,61,138,0.18)"}`,
                    boxShadow: sel ? "0 6px 20px rgba(255,61,138,0.18)" : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#1a0a10" }}>{svc.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#6b2145", marginTop: "0.2rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
                        ⏱ {svc.duration_minutes} min · max {svc.max_clients} kl.
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#f01f72", whiteSpace: "nowrap" }}>
                      {Number(svc.price_rsd).toLocaleString()} RSD
                    </div>
                  </div>

                  {sel && item && (
                    <ServiceSlotPicker
                      service={svc} item={item}
                      otherItems={selected.filter((s) => s.service.id !== svc.id)}
                      onDateChange={onDateChange} onTimeChange={onTimeChange}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Konflikt termina upozorenje */}
      {conflictError && (
        <div style={{ borderRadius: "14px", background: "#fff7ed", border: "1.5px solid #fb923c", color: "#9a3412", padding: "0.7rem 1rem", fontSize: "0.85rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
          ⏰ <b>Preklapanje termina:</b> {conflictError}
        </div>
      )}

      {/* Valuta i promo */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#f01f72", marginBottom: "0.4rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
            Valuta
          </label>
          <select
            value={currency} onChange={(e) => onCurrencyChange(e.target.value)}
            style={{ width: "100%", borderRadius: "14px", background: "rgba(255,255,255,0.90)", border: "1.5px solid rgba(255,61,138,0.20)", padding: "0.65rem 1rem", fontSize: "0.9rem", color: "#1a0a10", outline: "none", boxSizing: "border-box" }}
          >
            {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#f01f72", marginBottom: "0.4rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
            Promo kod <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(5% popust)</span>
          </label>
          <input
            placeholder="npr. AB3XYZ"
            value={promoInput} onChange={(e) => onPromoChange(e.target.value.toUpperCase())}
            style={{ width: "100%", borderRadius: "14px", background: "rgba(255,255,255,0.90)", border: "1.5px solid rgba(255,61,138,0.20)", padding: "0.65rem 1rem", fontSize: "0.9rem", color: "#1a0a10", outline: "none", boxSizing: "border-box" }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button className="btn-secondary" onClick={onBack}>← Nazad</button>
        <button className="btn-primary" style={{ flex: 1, opacity: canProceed ? 1 : 0.5 }} disabled={!canProceed} onClick={onNext}>
          Nastavi — pregled ✨
        </button>
      </div>
    </div>
  );
}

// ─── Step 3 ───────────────────────────────────────────────────────────────────

function Step3({
  customer, selected, currency, promoInput,
  onBack, onConfirm, loading, error,
}: {
  customer: CustomerData;
  selected: SelectedItem[];
  currency: string;
  promoInput: string;
  onBack: () => void;
  onConfirm: () => void;
  loading: boolean;
  error: string | null;
}) {
  const [rate, setRate] = useState<number>(1);
  const [rateLoading, setRateLoading] = useState(false);

  useEffect(() => {
    if (currency === "RSD") { setRate(1); return; }
    setRateLoading(true);
    fetchExchangeRate(currency).then((r) => { setRate(r); setRateLoading(false); });
  }, [currency]);

  const subtotal = selected.reduce((s, i) => s + i.service.price_rsd, 0);
  const discount10 = 0; // backend računа, ovde samo prikazujemo
  const promoDiscount = promoInput.length >= 5 ? Math.round(subtotal * 0.05) : 0;
  const totalRSD = subtotal - promoDiscount;
  const totalConverted = currency !== "RSD" ? (totalRSD / rate).toFixed(2) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#1a0a10", marginBottom: "0.3rem" }}>Pregled rezervacije 🎀</h2>
        <p style={{ color: "#6b2145", fontSize: "0.88rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>Proveri detalje pre potvrde.</p>
      </div>

      {/* Podaci */}
      <div style={{ background: "rgba(255,255,255,0.65)", borderRadius: "18px", border: "1.5px solid rgba(255,61,138,0.15)", padding: "1.1rem 1.3rem" }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#f01f72", marginBottom: "0.75rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>Podaci</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem 2rem", fontSize: "0.88rem", color: "#1a0a10", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
          <span><b>Ime:</b> {customer.first_name} {customer.last_name}</span>
          <span><b>Email:</b> {customer.email}</span>
          <span><b>Adresa:</b> {customer.address1}, {customer.postal_code} {customer.city}</span>
          <span><b>Država:</b> {customer.country}</span>
        </div>
      </div>

      {/* Usluge */}
      <div style={{ background: "rgba(255,255,255,0.65)", borderRadius: "18px", border: "1.5px solid rgba(255,61,138,0.15)", padding: "1.1rem 1.3rem" }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#f01f72", marginBottom: "0.75rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>Usluge</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {selected.map((item) => (
            <div key={item.service.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
              <div>
                <div style={{ fontWeight: 600, color: "#1a0a10" }}>{item.service.name}</div>
                <div style={{ color: "#6b2145", fontSize: "0.78rem" }}>{new Date(item.date.slice(0, 10) + "T00:00:00").toLocaleDateString("sr-RS", { day: "2-digit", month: "2-digit", year: "numeric" })} u {item.time} · {item.service.duration_minutes} min</div>
              </div>
              <div style={{ fontWeight: 700, color: "#1a0a10" }}>{Number(item.service.price_rsd).toLocaleString()} RSD</div>
            </div>
          ))}
        </div>

        {/* Obračun */}
        <div style={{ borderTop: "1.5px solid rgba(255,61,138,0.12)", marginTop: "0.85rem", paddingTop: "0.85rem", display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.88rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#6b2145" }}>
            <span>Međuzbir</span><span>{subtotal.toLocaleString()} RSD</span>
          </div>
          {promoDiscount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", color: "#f01f72", fontWeight: 600 }}>
              <span>Promo popust (5%)</span><span>− {promoDiscount.toLocaleString()} RSD</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "1rem", color: "#1a0a10", paddingTop: "0.25rem" }}>
            <span>Ukupno</span>
            <div style={{ textAlign: "right" }}>
              <div>{totalRSD.toLocaleString()} RSD</div>
              {currency !== "RSD" && (
                <div style={{ fontSize: "0.82rem", color: "#f01f72", fontWeight: 600 }}>
                  {rateLoading ? "Učitavam kurs…" : `≈ ${totalConverted} ${currency}`}
                </div>
              )}
            </div>
          </div>
          {currency !== "RSD" && !rateLoading && (
            <div style={{ fontSize: "0.75rem", color: "#9ca3af", textAlign: "right" }}>
              Kurs: 1 {currency} = {rate.toFixed(2)} RSD (Frankfurter API)
            </div>
          )}
        </div>
      </div>

      {error && (
        <div style={{ borderRadius: "14px", background: "#fee2e2", border: "1.5px solid #fca5a5", color: "#991b1b", padding: "0.7rem 1rem", fontSize: "0.88rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button className="btn-secondary" onClick={onBack} disabled={loading}>← Nazad</button>
        <button className="btn-primary" style={{ flex: 1 }} onClick={onConfirm} disabled={loading}>
          {loading ? "Šaljem…" : "Potvrdi rezervaciju 💗"}
        </button>
      </div>
    </div>
  );
}

// ─── Success ──────────────────────────────────────────────────────────────────

function SuccessScreen({ result, onNew }: { result: BookingResult; onNew: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "1rem 0", display: "flex", flexDirection: "column", gap: "1.25rem", alignItems: "center" }}>
      <div style={{ fontSize: "4rem" }}>🎉</div>
      <div>
        <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#1a0a10", marginBottom: "0.4rem" }}>Rezervacija potvrđena!</h2>
        <p style={{ color: "#6b2145", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>Vidimo se u salonu Trač 💗</p>
      </div>

      <div style={{ background: "rgba(255,255,255,0.70)", border: "1.5px solid rgba(255,61,138,0.18)", borderRadius: "20px", padding: "1.5rem", width: "100%", maxWidth: "340px", display: "flex", flexDirection: "column", gap: "1rem", textAlign: "left" }}>
        <div>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#f01f72", marginBottom: "0.4rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>Šifra za pristup</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#1a0a10", letterSpacing: "0.15em" }}>{result.accessCode}</div>
          <div style={{ fontSize: "0.75rem", color: "#6b2145", marginTop: "0.25rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>Sačuvaj ovu šifru — potrebna je za izmenu rezervacije.</div>
        </div>

        <div>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#f01f72", marginBottom: "0.4rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>Tvoj promo kod</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#ff3d8a", letterSpacing: "0.12em" }}>{result.promoCode}</div>
          <div style={{ fontSize: "0.75rem", color: "#6b2145", marginTop: "0.25rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>Iskoristi za sledeću rezervaciju — 5% popusta!</div>
        </div>

        <div style={{ borderTop: "1.5px solid rgba(255,61,138,0.12)", paddingTop: "0.85rem", display: "flex", justifyContent: "space-between", fontWeight: 800, color: "#1a0a10", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
          <span>Ukupno naplaćeno</span>
          <span>{Number(result.totalAmount).toLocaleString()} RSD</span>
        </div>

        {result.discount10 > 0 && (
          <div style={{ fontSize: "0.78rem", color: "#065f46", background: "#d1fae5", borderRadius: "10px", padding: "0.5rem 0.75rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
            ✅ Primenjen popust 10% (-{result.discount10.toLocaleString()} RSD)
          </div>
        )}
        {result.discount5 > 0 && (
          <div style={{ fontSize: "0.78rem", color: "#065f46", background: "#d1fae5", borderRadius: "10px", padding: "0.5rem 0.75rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
            ✅ Promo popust 5% (-{result.discount5.toLocaleString()} RSD)
          </div>
        )}
      </div>

      <button className="btn-secondary" onClick={onNew}>Nova rezervacija</button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

// ─── Manage Reservation ───────────────────────────────────────────────────────

interface ManagedItem {
  id: number;
  service_id: number;
  service_name: string;
  date: string;
  time: string;
  unit_price: number;
  line_total: number;
}

interface ManagedReservation {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  total_amount: number;
  status: string;
  access_code: string;
  promo_code: string;
}

function ManageReservation({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<"lookup" | "view">("lookup");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservation, setReservation] = useState<ManagedReservation | null>(null);
  const [items, setItems] = useState<ManagedItem[]>([]);
  const [catalog, setCatalog] = useState<Category[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addDate, setAddDate] = useState("");
  const [addTime, setAddTime] = useState("");
  const [addServiceId, setAddServiceId] = useState<number | "">("");
  const [cancelConfirm, setCancelConfirm] = useState(false);

  useEffect(() => {
    fetch(`${API}/catalog`).then((r) => r.json()).then(setCatalog).catch(() => {});
  }, []);

  async function handleLookup() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API}/reservations/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_code: code.toUpperCase(), email: email.toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Rezervacija nije pronađena");
      setReservation(data.reservation);
      setItems(data.items ?? []);
      setMode("view");
    } catch (e: any) {
      setError(e.message ?? "Greška");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveItem(itemId: number) {
    if (!reservation) return;
    setActionLoading(true); setActionError(null); setActionSuccess(null);
    try {
      const res = await fetch(`${API}/reservations/${reservation.id}/items/${itemId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_code: reservation.access_code, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Greška pri uklanjanju");
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      setReservation((prev) => prev ? { ...prev, total_amount: data.total_amount ?? prev.total_amount } : prev);
      setActionSuccess("Usluga je uklonjena.");
    } catch (e: any) {
      setActionError(e.message ?? "Greška");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddItem() {
    if (!reservation || !addServiceId || !addDate || !addTime) return;
    setActionLoading(true); setActionError(null); setActionSuccess(null);
    try {
      const res = await fetch(`${API}/reservations/${reservation.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_code: reservation.access_code, email, service_id: addServiceId, date: addDate, time: addTime }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Greška pri dodavanju");
      setItems((prev) => [...prev, data.item]);
      setReservation((prev) => prev ? { ...prev, total_amount: data.total_amount ?? prev.total_amount } : prev);
      setActionSuccess("Usluga je dodana.");
      setShowAddPanel(false); setAddServiceId(""); setAddDate(""); setAddTime("");
    } catch (e: any) {
      setActionError(e.message ?? "Greška");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!reservation) return;
    setActionLoading(true); setActionError(null); setActionSuccess(null);
    try {
      const res = await fetch(`${API}/reservations/${reservation.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_code: reservation.access_code, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Greška pri otkazivanju");
      setReservation((prev) => prev ? { ...prev, status: "cancelled" } : prev);
      setActionSuccess("Rezervacija je otkazana.");
      setCancelConfirm(false);
    } catch (e: any) {
      setActionError(e.message ?? "Greška");
    } finally {
      setActionLoading(false);
    }
  }

  const card: React.CSSProperties = {
    background: "rgba(255,240,246,0.80)", border: "1.5px solid rgba(255,61,138,0.18)",
    borderRadius: "28px", padding: "2rem 2.5rem",
  };

  // ── Lookup forma ──
  if (mode === "lookup") {
    return (
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div style={card}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#f01f72", fontWeight: 700, fontSize: "0.88rem", marginBottom: "1.5rem", padding: 0, fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
            ← Nazad
          </button>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#1a0a10", marginBottom: "0.3rem" }}>Moja rezervacija 🔑</h2>
          <p style={{ color: "#6b2145", fontSize: "0.88rem", marginBottom: "1.5rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
            Unesi šifru koju si dobila pri rezervaciji i email kojim si se prijavila.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#f01f72", marginBottom: "0.4rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
                Šifra za pristup
              </label>
              <input
                placeholder="npr. AB3XYZ4W"
                value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
                style={{ width: "100%", borderRadius: "14px", background: "rgba(255,255,255,0.90)", border: "1.5px solid rgba(255,61,138,0.20)", padding: "0.65rem 1rem", fontSize: "0.9rem", color: "#1a0a10", outline: "none", boxSizing: "border-box", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", letterSpacing: "0.1em" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#f01f72", marginBottom: "0.4rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
                Email
              </label>
              <input
                type="email" placeholder="ana@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                style={{ width: "100%", borderRadius: "14px", background: "rgba(255,255,255,0.90)", border: "1.5px solid rgba(255,61,138,0.20)", padding: "0.65rem 1rem", fontSize: "0.9rem", color: "#1a0a10", outline: "none", boxSizing: "border-box", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}
              />
            </div>
            {error && (
              <div style={{ borderRadius: "14px", background: "#fee2e2", border: "1.5px solid #fca5a5", color: "#991b1b", padding: "0.7rem 1rem", fontSize: "0.88rem" }}>
                ⚠️ {error}
              </div>
            )}
            <button
              className="btn-primary" onClick={handleLookup}
              disabled={loading || !code || !email} style={{ opacity: (!code || !email) ? 0.5 : 1 }}
            >
              {loading ? "Tražim…" : "Pronađi rezervaciju →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── View/edit rezervacije ──
  if (!reservation) return null;
  const isCancelled = reservation.status === "cancelled";

  // Flatten svih usluga iz kataloga za add panel
  const allServices = catalog.flatMap((c) => c.services);
  const selectedAddSvc = allServices.find((s) => s.id === addServiceId);
  const addSlots = selectedAddSvc ? generateTimeSlots(selectedAddSvc.slot_start?.slice(0, 5) ?? "09:00", selectedAddSvc.slot_end?.slice(0, 5) ?? "18:00") : [];

  // Taken slotovi za odabranu uslugu na odabrani datum (kapacitet)
  const [addTakenSlots, setAddTakenSlots] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!addServiceId || !addDate) { setAddTakenSlots({}); return; }
    fetchTakenSlots(Number(addServiceId), addDate).then(setAddTakenSlots);
  }, [addServiceId, addDate]);

  // Pretvori postojeće items u format za conflict detection
  const existingAsSelectedItems: SelectedItem[] = items
    .filter((i) => i.date && i.time)
    .map((i) => {
      const svc = allServices.find((s) => s.id === i.service_id);
      return svc ? { service: svc, date: i.date, time: i.time.slice(0, 5) } : null;
    })
    .filter(Boolean) as SelectedItem[];

  function isAddSlotDisabled(t: string): { disabled: boolean; reason: string } {
    if (!selectedAddSvc) return { disabled: false, reason: "" };
    // Kapacitet
    const taken = addTakenSlots[t] ?? 0;
    if (taken >= Number(selectedAddSvc.max_clients)) return { disabled: true, reason: "— popunjeno" };
    // Preklapanje sa već rezervisanim uslugama
    if (addDate) {
      const sameDay = existingAsSelectedItems.filter((i) => i.date === addDate);
      const thisStart = timeToMinutes(t);
      const thisEnd = thisStart + selectedAddSvc.duration_minutes;
      const conflict = sameDay.some((other) => {
        const oStart = timeToMinutes(other.time);
        const oEnd = oStart + other.service.duration_minutes;
        return thisStart < oEnd && oStart < thisEnd;
      });
      if (conflict) return { disabled: true, reason: "— preklapanje" };
    }
    return { disabled: false, reason: "" };
  }

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <div style={card}>
        <button onClick={() => { setMode("lookup"); setReservation(null); setItems([]); setCancelConfirm(false); setActionError(null); setActionSuccess(null); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#f01f72", fontWeight: 700, fontSize: "0.88rem", marginBottom: "1.5rem", padding: 0, fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
          ← Nazad
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1a0a10", marginBottom: "0.2rem" }}>
              {reservation.first_name} {reservation.last_name}
            </h2>
            <div style={{ fontSize: "0.82rem", color: "#6b2145", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>{reservation.email}</div>
          </div>
          <span style={{
            background: isCancelled ? "#fee2e2" : "#d1fae5",
            color: isCancelled ? "#991b1b" : "#065f46",
            borderRadius: "999px", padding: "0.3rem 0.85rem",
            fontSize: "0.78rem", fontWeight: 700,
          }}>
            {isCancelled ? "Otkazana" : "Aktivna"}
          </span>
        </div>

        {/* Usluge */}
        <div style={{ background: "rgba(255,255,255,0.65)", borderRadius: "18px", border: "1.5px solid rgba(255,61,138,0.15)", padding: "1rem 1.2rem", marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#f01f72", marginBottom: "0.75rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
            Zakazane usluge
          </div>
          {items.length === 0 && <p style={{ fontSize: "0.85rem", color: "#9ca3af" }}>Nema usluga.</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {items.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1a0a10" }}>{item.service_name}</div>
                  <div style={{ fontSize: "0.75rem", color: "#6b2145", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
                    📅 {new Date(item.date.slice(0, 10) + "T00:00:00").toLocaleDateString("sr-RS", { day: "2-digit", month: "2-digit", year: "numeric" })} &nbsp;⏰ {item.time.slice(0, 5)}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontWeight: 800, fontSize: "0.88rem", color: "#1a0a10" }}>{Number(item.line_total).toLocaleString()} RSD</span>
                  {!isCancelled && (
                    <button
                      onClick={() => handleRemoveItem(item.id)} disabled={actionLoading}
                      style={{ background: "#fee2e2", border: "1.5px solid #fca5a5", borderRadius: "8px", padding: "0.3rem 0.6rem", fontSize: "0.75rem", fontWeight: 700, color: "#991b1b", cursor: "pointer" }}
                    >
                      Ukloni
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1.5px solid rgba(255,61,138,0.12)", marginTop: "0.75rem", paddingTop: "0.75rem", display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "0.9rem", color: "#1a0a10" }}>
            <span>Ukupno</span>
            <span>{Number(reservation.total_amount).toLocaleString()} RSD</span>
          </div>
        </div>

        {/* Dodaj uslugu panel */}
        {!isCancelled && (
          <div style={{ marginBottom: "1rem" }}>
            {!showAddPanel ? (
              <button onClick={() => setShowAddPanel(true)} className="btn-secondary" style={{ width: "100%" }}>
                + Dodaj uslugu
              </button>
            ) : (
              <div style={{ background: "rgba(255,255,255,0.65)", borderRadius: "18px", border: "1.5px solid rgba(255,61,138,0.20)", padding: "1rem 1.2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#f01f72", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
                  Dodaj uslugu
                </div>
                <select value={addServiceId} onChange={(e) => { setAddServiceId(Number(e.target.value)); setAddDate(""); setAddTime(""); }}
                  style={{ width: "100%", borderRadius: "12px", background: "white", border: "1.5px solid rgba(255,61,138,0.20)", padding: "0.55rem 0.75rem", fontSize: "0.88rem", outline: "none", boxSizing: "border-box" }}>
                  <option value="">-- odaberi uslugu --</option>
                  {catalog.map((cat) => (
                    <optgroup key={cat.id} label={cat.name}>
                      {cat.services.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} — {Number(s.price_rsd).toLocaleString()} RSD</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {addServiceId !== "" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                    <div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6b2145", marginBottom: "0.3rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>Datum</div>
                      <input type="date" min={todayStr()} value={addDate} onChange={(e) => setAddDate(e.target.value)}
                        style={{ width: "100%", borderRadius: "12px", background: "white", border: "1.5px solid rgba(255,61,138,0.20)", padding: "0.5rem 0.75rem", fontSize: "0.85rem", outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6b2145", marginBottom: "0.3rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>Vreme</div>
                      <select value={addTime} onChange={(e) => setAddTime(e.target.value)}
                        style={{ width: "100%", borderRadius: "12px", background: "white", border: "1.5px solid rgba(255,61,138,0.20)", padding: "0.5rem 0.75rem", fontSize: "0.85rem", outline: "none", boxSizing: "border-box" }}>
                        <option value="">-- izaberi --</option>
                        {addSlots.map((t) => {
                          const { disabled, reason } = isAddSlotDisabled(t);
                          return (
                            <option key={t} value={t} disabled={disabled}>
                              {t}{reason ? ` ${reason}` : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <button onClick={() => { setShowAddPanel(false); setAddServiceId(""); setAddDate(""); setAddTime(""); }} className="btn-secondary" style={{ flex: 1 }}>Otkaži</button>
                  <button onClick={handleAddItem} className="btn-primary" style={{ flex: 2, opacity: (!addServiceId || !addDate || !addTime) ? 0.5 : 1 }} disabled={!addServiceId || !addDate || !addTime || actionLoading}>
                    {actionLoading ? "Dodajem…" : "Dodaj"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Akcije i povratne poruke */}
        {actionError && (
          <div style={{ borderRadius: "14px", background: "#fee2e2", border: "1.5px solid #fca5a5", color: "#991b1b", padding: "0.7rem 1rem", fontSize: "0.88rem", marginBottom: "0.75rem" }}>
            ⚠️ {actionError}
          </div>
        )}
        {actionSuccess && (
          <div style={{ borderRadius: "14px", background: "#d1fae5", border: "1.5px solid #6ee7b7", color: "#065f46", padding: "0.7rem 1rem", fontSize: "0.88rem", marginBottom: "0.75rem" }}>
            ✅ {actionSuccess}
          </div>
        )}

        {/* Otkaži rezervaciju */}
        {!isCancelled && (
          <div style={{ borderTop: "1.5px solid rgba(255,61,138,0.12)", paddingTop: "1rem", marginTop: "0.25rem" }}>
            {!cancelConfirm ? (
              <button onClick={() => setCancelConfirm(true)} style={{ background: "none", border: "1.5px solid #fca5a5", borderRadius: "12px", padding: "0.6rem 1.2rem", fontSize: "0.85rem", fontWeight: 700, color: "#991b1b", cursor: "pointer", width: "100%", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
                Otkaži rezervaciju
              </button>
            ) : (
              <div style={{ background: "#fee2e2", border: "1.5px solid #fca5a5", borderRadius: "16px", padding: "1rem 1.2rem" }}>
                <p style={{ fontSize: "0.88rem", color: "#991b1b", fontWeight: 600, marginBottom: "0.75rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
                  ⚠️ Da li si sigurna? Otkazana rezervacija se ne može ponovo aktivirati.
                </p>
                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <button onClick={() => setCancelConfirm(false)} className="btn-secondary" style={{ flex: 1 }}>Ne, ostavi</button>
                  <button onClick={handleCancel} disabled={actionLoading} style={{ flex: 1, background: "#ef4444", border: "none", borderRadius: "12px", padding: "0.65rem 1rem", fontSize: "0.88rem", fontWeight: 700, color: "white", cursor: "pointer" }}>
                    {actionLoading ? "Otkazujem…" : "Da, otkaži"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Landing ──────────────────────────────────────────────────────────────────

function BookingLanding({ onBook, onManage }: { onBook: () => void; onManage: () => void }) {
  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ background: "rgba(255,240,246,0.80)", border: "1.5px solid rgba(255,61,138,0.18)", borderRadius: "28px", padding: "2.5rem", textAlign: "center" }}>
        <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>💅</div>
        <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#1a0a10", marginBottom: "0.4rem" }}>Salon Trač</h2>
        <p style={{ color: "#6b2145", fontSize: "0.92rem", marginBottom: "2rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
          Šta želiš da uradiš?
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <button className="btn-primary" onClick={onBook} style={{ width: "100%", fontSize: "1rem", padding: "0.9rem" }}>
            📅 Rezerviši termin
          </button>
          <button className="btn-secondary" onClick={onManage} style={{ width: "100%", fontSize: "1rem", padding: "0.9rem" }}>
            🔑 Pristupi svojoj rezervaciji
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const emptyCustomer: CustomerData = {
  first_name: "", last_name: "", email: "", phone: "",
  address1: "", postal_code: "", city: "", country: ""
};

export default function Book() {
  const [view, setView] = useState<"landing" | "book" | "manage">("landing");
  const [step, setStep] = useState(1);
  const [catalog, setCatalog] = useState<Category[]>([]);
  const [currencies, setCurrencies] = useState<string[]>(["RSD"]);
  const [customer, setCustomer] = useState<CustomerData>(emptyCustomer);
  const [selected, setSelected] = useState<SelectedItem[]>([]);
  const [currency, setCurrency] = useState("RSD");
  const [promoInput, setPromoInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);

  useEffect(() => {
    fetch(`${API}/catalog`).then((r) => r.json()).then(setCatalog).catch(() => {});
    fetch(`${API}/currencies`).then((r) => r.json()).then(setCurrencies).catch(() => {});
  }, []);

  function toggleService(svc: Service) {
    setSelected((prev) => {
      const exists = prev.find((s) => s.service.id === svc.id);
      if (exists) return prev.filter((s) => s.service.id !== svc.id);
      return [...prev, { service: svc, date: "", time: "" }];
    });
  }

  function updateDate(serviceId: number, date: string) {
    setSelected((prev) => prev.map((s) => s.service.id === serviceId ? { ...s, date } : s));
  }

  function updateTime(serviceId: number, time: string) {
    setSelected((prev) => prev.map((s) => s.service.id === serviceId ? { ...s, time } : s));
  }

  async function handleConfirm() {
    setLoading(true); setError(null);
    try {
      const body = {
        ...customer, currency,
        promo_code_used: promoInput || undefined,
        items: selected.map((s) => ({ service_id: s.service.id, date: s.date, time: s.time }))
      };
      const res = await fetch(`${API}/reservations`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Greška pri rezervaciji");
      setResult(data);
    } catch (e: any) {
      setError(e.message ?? "Nepoznata greška");
    } finally {
      setLoading(false);
    }
  }

  function resetAll() {
    setView("landing"); setStep(1); setCustomer(emptyCustomer); setSelected([]);
    setCurrency("RSD"); setPromoInput(""); setResult(null); setError(null);
  }

  if (view === "manage") {
    return <ManageReservation onBack={() => setView("landing")} />;
  }

  if (result) {
    return (
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ background: "rgba(255,240,246,0.80)", border: "1.5px solid rgba(255,61,138,0.18)", borderRadius: "28px", padding: "2.5rem" }}>
          <SuccessScreen result={result} onNew={resetAll} />
        </div>
      </div>
    );
  }

  if (view === "landing") {
    return <BookingLanding onBook={() => setView("book")} onManage={() => setView("manage")} />;
  }

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ background: "rgba(255,240,246,0.80)", border: "1.5px solid rgba(255,61,138,0.18)", borderRadius: "28px", padding: "2rem 2.5rem" }}>
        <StepIndicator step={step} />
        {step === 1 && <Step1 data={customer} onChange={setCustomer} onNext={() => setStep(2)} onBack={() => setView("landing")} />}
        {step === 2 && (
          <Step2
            catalog={catalog} selected={selected} currency={currency}
            currencies={currencies} promoInput={promoInput}
            onToggleService={toggleService} onDateChange={updateDate}
            onTimeChange={updateTime} onCurrencyChange={setCurrency}
            onPromoChange={setPromoInput} onBack={() => setView("landing")} onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <Step3
            customer={customer} selected={selected} currency={currency}
            promoInput={promoInput} onBack={() => setStep(2)}
            onConfirm={handleConfirm} loading={loading} error={error}
          />
        )}
      </div>
    </div>
  );
}