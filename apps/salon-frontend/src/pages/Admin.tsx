import { useEffect, useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";

const API = "http://localhost:4000";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category { id: number; name: string; }
interface Service {
  id: number; category_id: number; name: string; description: string;
  duration_minutes: number; price_rsd: number; max_clients: number;
  slot_start: string; slot_end: string;
}
interface Reservation {
  id: number; first_name: string; last_name: string;
  email: string; total_amount: number; status: string; created_at: string;
  access_code: string; promo_code: string; promo_code_used: boolean;
}
interface Settings {
  name: string; description: string; working_hours: string; discount_until: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-extrabold text-xl" style={{ color: "#1a0a10", marginBottom: "1.25rem" }}>
      {children}
    </h3>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#f01f72", marginBottom: "0.4rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", borderRadius: "14px",
  background: "rgba(255,255,255,0.90)",
  border: "1.5px solid rgba(255,61,138,0.20)",
  padding: "0.65rem 1rem", fontSize: "0.9rem",
  color: "#1a0a10", outline: "none",
  fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
  boxSizing: "border-box",
};

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputStyle, ...props.style }} />;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...inputStyle, resize: "vertical", minHeight: "80px", ...props.style }} />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...inputStyle, ...props.style }} />;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    active:    ["#d1fae5", "#065f46"],
    cancelled: ["#fee2e2", "#991b1b"],
    completed: ["#e0f2fe", "#0369a1"],
    pending:   ["#fef9c3", "#854d0e"],
  };
  const [bg, color] = map[status] ?? ["#f1f5f9", "#475569"];
  const labels: Record<string, string> = {
    active: "Aktivna", cancelled: "Otkazana", completed: "Završena", pending: "Na čekanju"
  };
  return (
    <span style={{ background: bg, color, borderRadius: "999px", padding: "0.25rem 0.75rem", fontSize: "0.75rem", fontWeight: 700 }}>
      {labels[status] ?? status}
    </span>
  );
}

function Toast({ msg, type }: { msg: string; type: "ok" | "err" }) {
  return (
    <div style={{
      borderRadius: "14px", padding: "0.7rem 1rem", fontSize: "0.88rem", fontWeight: 600,
      background: type === "ok" ? "#d1fae5" : "#fee2e2",
      color: type === "ok" ? "#065f46" : "#991b1b",
      border: `1.5px solid ${type === "ok" ? "#6ee7b7" : "#fca5a5"}`,
      fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
    }}>
      {type === "ok" ? "✅ " : "⚠️ "}{msg}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onLogin();
    } catch (e: any) {
      setError(e.message ?? "Greška pri logovanju");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "380px" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div className="section-label" style={{ marginBottom: "0.5rem" }}>Pristup ograničen</div>
          <h2 className="font-black" style={{ fontSize: "2rem", color: "#1a0a10" }}>Admin panel 🌸</h2>
          <p style={{ color: "#5a2a3a", fontSize: "0.9rem", marginTop: "0.4rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
            Unesi kredencijale za pristup
          </p>
        </div>
        <div style={{ background: "rgba(255,240,246,0.80)", border: "1.5px solid rgba(255,61,138,0.20)", borderRadius: "24px", padding: "2rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Field label="Korisničko ime">
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" autoComplete="username" onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
            </Field>
            <Field label="Lozinka">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
            </Field>
            {error && <Toast msg={error} type="err" />}
            <button onClick={handleLogin} disabled={loading || !username || !password} className="btn-primary" style={{ width: "100%", marginTop: "0.25rem" }}>
              {loading ? "Prijavljujem…" : "Prijavi se →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── KATEGORIJE ───────────────────────────────────────────────────────────────

function CategoriesPanel() {
  const [cats, setCats] = useState<Category[]>([]);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  function showToast(msg: string, type: "ok" | "err") { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  async function load() { const r = await fetch(`${API}/categories`); setCats(await r.json()); }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!newName.trim()) return;
    const r = await fetch(`${API}/categories`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName.trim() }) });
    if (r.ok) { setNewName(""); load(); showToast("Kategorija dodana!", "ok"); }
    else showToast("Greška pri dodavanju", "err");
  }

  async function rename(id: number) {
    if (!editName.trim()) return;
    const r = await fetch(`${API}/categories/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName.trim() }) });
    if (r.ok) { setEditId(null); setEditName(""); load(); showToast("Preimenovano!", "ok"); }
    else showToast("Greška pri preimenovanju", "err");
  }

  async function del(id: number) {
    if (!confirm("Obrisati kategoriju? Sve usluge u njoj će biti obrisane.")) return;
    const r = await fetch(`${API}/categories/${id}`, { method: "DELETE" });
    if (r.ok) { load(); showToast("Obrisano!", "ok"); }
    else showToast("Greška pri brisanju", "err");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <SectionTitle>Kategorije usluga</SectionTitle>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Naziv kategorije…" onKeyDown={(e) => e.key === "Enter" && add()} style={{ flex: 1 }} />
        <button className="btn-primary" onClick={add} style={{ whiteSpace: "nowrap", padding: "0.65rem 1.4rem" }}>+ Dodaj</button>
      </div>
      {toast && <Toast {...toast} />}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {cats.length === 0 && <p style={{ color: "#6b2145", fontSize: "0.88rem" }}>Nema kategorija.</p>}
        {cats.map((c) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "rgba(255,255,255,0.65)", borderRadius: "14px", border: "1.5px solid rgba(255,61,138,0.15)", padding: "0.7rem 1rem" }}>
            {editId === c.id ? (
              <>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && rename(c.id)} style={{ flex: 1 }} autoFocus />
                <button className="btn-primary" onClick={() => rename(c.id)} style={{ padding: "0.45rem 1rem", fontSize: "0.82rem" }}>Sačuvaj</button>
                <button className="btn-secondary" onClick={() => setEditId(null)} style={{ padding: "0.45rem 0.9rem", fontSize: "0.82rem" }}>Otkaži</button>
              </>
            ) : (
              <>
                <span style={{ flex: 1, fontWeight: 600, color: "#1a0a10", fontSize: "0.92rem" }}>{c.name}</span>
                <button className="btn-secondary" onClick={() => { setEditId(c.id); setEditName(c.name); }} style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem" }}>✏️</button>
                <button onClick={() => del(c.id)} style={{ ...inputStyle, width: "auto", padding: "0.4rem 0.9rem", fontSize: "0.8rem", background: "#fee2e2", border: "1.5px solid #fca5a5", color: "#991b1b", cursor: "pointer", borderRadius: "10px" }}>🗑</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── USLUGE ───────────────────────────────────────────────────────────────────

const emptyService = { category_id: 0, name: "", description: "", duration_minutes: 30, price_rsd: 0, max_clients: 1, slot_start: "09:00", slot_end: "18:00" };

function ServicesPanel() {
  const [cats, setCats] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState<typeof emptyService>({ ...emptyService });
  const [editId, setEditId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  function showToast(msg: string, type: "ok" | "err") { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  async function loadCats() { const r = await fetch(`${API}/categories`); setCats(await r.json()); }
  async function loadServices() {
    const r = await fetch(`${API}/catalog`);
    const catalog: { id: number; name: string; services: Service[] }[] = await r.json();
    setServices(catalog.flatMap((c) => c.services));
  }

  useEffect(() => { loadCats(); loadServices(); }, []);

  const setF = (k: keyof typeof emptyService) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: ["duration_minutes", "price_rsd", "max_clients", "category_id"].includes(k) ? Number(e.target.value) : e.target.value }));

  async function save() {
    if (!form.name || !form.category_id || !form.duration_minutes || !form.price_rsd) {
      return showToast("Popuni obavezna polja", "err");
    }
    const url = editId ? `${API}/services/${editId}` : `${API}/services`;
    const method = editId ? "PUT" : "POST";
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (r.ok) {
      setForm({ ...emptyService }); setEditId(null); loadServices();
      showToast(editId ? "Usluga izmenjena!" : "Usluga dodana!", "ok");
    } else {
      const d = await r.json(); showToast(d.message ?? "Greška", "err");
    }
  }

  async function del(id: number) {
    if (!confirm("Obrisati uslugu?")) return;
    const r = await fetch(`${API}/services/${id}`, { method: "DELETE" });
    if (r.ok) { loadServices(); showToast("Obrisano!", "ok"); }
    else showToast("Greška pri brisanju", "err");
  }

  function startEdit(s: Service) {
    setEditId(s.id);
    setForm({ category_id: s.category_id, name: s.name, description: s.description ?? "", duration_minutes: s.duration_minutes, price_rsd: s.price_rsd, max_clients: s.max_clients ?? 1, slot_start: s.slot_start?.slice(0, 5) ?? "09:00", slot_end: s.slot_end?.slice(0, 5) ?? "18:00" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <SectionTitle>{editId ? "Izmeni uslugu" : "Dodaj uslugu"}</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
        <Field label="Kategorija *">
          <Select value={form.category_id} onChange={setF("category_id")}>
            <option value={0}>-- izaberi --</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Naziv *"><Input value={form.name} onChange={setF("name")} placeholder="npr. Manikir" /></Field>
        <Field label="Trajanje (min) *"><Input type="number" value={form.duration_minutes} onChange={setF("duration_minutes")} min={5} /></Field>
        <Field label="Cena (RSD) *"><Input type="number" value={form.price_rsd} onChange={setF("price_rsd")} min={0} /></Field>
        <Field label="Maks. klijenata po terminu"><Input type="number" value={form.max_clients} onChange={setF("max_clients")} min={1} /></Field>
        <div />
        <Field label="Početak prvog termina"><Input type="time" value={form.slot_start} onChange={setF("slot_start")} /></Field>
        <Field label="Kraj poslednjeg termina"><Input type="time" value={form.slot_end} onChange={setF("slot_end")} /></Field>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Opis"><Textarea value={form.description} onChange={setF("description")} placeholder="Kratak opis usluge…" /></Field>
        </div>
      </div>
      {toast && <Toast {...toast} />}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button className="btn-primary" onClick={save} style={{ flex: 1 }}>{editId ? "💾 Sačuvaj izmene" : "+ Dodaj uslugu"}</button>
        {editId && <button className="btn-secondary" onClick={() => { setEditId(null); setForm({ ...emptyService }); }}>Otkaži</button>}
      </div>
      <div style={{ borderTop: "1.5px solid rgba(255,61,138,0.12)", paddingTop: "1.25rem" }}>
        <div className="section-label" style={{ marginBottom: "1rem" }}>Sve usluge</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {services.length === 0 && <p style={{ color: "#6b2145", fontSize: "0.88rem" }}>Nema usluga.</p>}
          {services.map((s) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "rgba(255,255,255,0.65)", borderRadius: "14px", border: "1.5px solid rgba(255,61,138,0.15)", padding: "0.7rem 1rem" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#1a0a10" }}>{s.name}</div>
                <div style={{ fontSize: "0.78rem", color: "#6b2145", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
                  {s.duration_minutes} min · {Number(s.price_rsd).toLocaleString()} RSD · max {s.max_clients} kl.
                </div>
              </div>
              <button className="btn-secondary" onClick={() => startEdit(s)} style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem" }}>✏️</button>
              <button onClick={() => del(s.id)} style={{ ...inputStyle, width: "auto", padding: "0.4rem 0.9rem", fontSize: "0.8rem", background: "#fee2e2", border: "1.5px solid #fca5a5", color: "#991b1b", cursor: "pointer", borderRadius: "10px" }}>🗑</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── VALUTE & POPUST ──────────────────────────────────────────────────────────

function CurrenciesPanel() {
  const AVAILABLE = ["RSD", "EUR"];
  const [selected, setSelected] = useState<string[]>([]);
  const [settings, setSettings] = useState<Settings>({ name: "", description: "", working_hours: "", discount_until: null });
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [saving, setSaving] = useState(false);

  function showToast(msg: string, type: "ok" | "err") { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  useEffect(() => {
    fetch(`${API}/currencies`).then((r) => r.json()).then(setSelected);
    fetch(`${API}/settings`).then((r) => r.json()).then((d) => setSettings({ ...d, discount_until: d.discount_until ? d.discount_until.split("T")[0] : "" }));
  }, []);

  function toggleCurrency(code: string) {
    setSelected((p) => p.includes(code) ? p.filter((c) => c !== code) : [...p, code]);
  }

  async function saveCurrencies() {
    if (selected.length === 0) return showToast("Izaberi bar jednu valutu", "err");
    setSaving(true);
    const r = await fetch(`${API}/currencies`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ codes: selected }) });
    setSaving(false);
    if (r.ok) showToast("Valute sačuvane!", "ok"); else showToast("Greška", "err");
  }

  async function saveDiscount() {
    setSaving(true);
    const r = await fetch(`${API}/settings`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: settings.name, description: settings.description, working_hours: settings.working_hours, discount_until: settings.discount_until || null })
    });
    setSaving(false);
    if (r.ok) showToast("Datum popusta sačuvan!", "ok"); else showToast("Greška", "err");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div>
        <SectionTitle>Dozvoljene valute</SectionTitle>
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
          {AVAILABLE.map((code) => (
            <div key={code} onClick={() => toggleCurrency(code)} style={{
              cursor: "pointer", padding: "0.75rem 1.5rem", borderRadius: "14px", fontWeight: 700, fontSize: "1rem",
              background: selected.includes(code) ? "linear-gradient(135deg,#ff3d8a,#f01f72)" : "rgba(255,255,255,0.75)",
              color: selected.includes(code) ? "white" : "#6b2145",
              border: `1.5px solid ${selected.includes(code) ? "transparent" : "rgba(255,61,138,0.25)"}`,
              boxShadow: selected.includes(code) ? "0 6px 18px rgba(255,61,138,0.30)" : "none",
              transition: "all 0.2s",
            }}>
              {code} {selected.includes(code) ? "✓" : ""}
            </div>
          ))}
        </div>
        {toast && <Toast {...toast} />}
        <button className="btn-primary" onClick={saveCurrencies} disabled={saving} style={{ marginTop: "0.5rem" }}>Sačuvaj valute</button>
      </div>
      <div style={{ borderTop: "1.5px solid rgba(255,61,138,0.12)", paddingTop: "1.5rem" }}>
        <SectionTitle>Popust 10% važi do</SectionTitle>
        <div style={{ maxWidth: "320px", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Input type="date" value={settings.discount_until ?? ""} onChange={(e) => setSettings((p) => ({ ...p, discount_until: e.target.value }))} />
          <p style={{ fontSize: "0.8rem", color: "#6b2145", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>Ostavi prazno ako ne želiš aktivni popust.</p>
          <button className="btn-primary" onClick={saveDiscount} disabled={saving}>Sačuvaj datum popusta</button>
        </div>
      </div>
    </div>
  );
}

// ─── PODEŠAVANJA SALONA ───────────────────────────────────────────────────────

function SettingsPanel() {
  const [form, setForm] = useState({ name: "", description: "", working_hours: "", discount_until: "" });
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [saving, setSaving] = useState(false);

  function showToast(msg: string, type: "ok" | "err") { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  useEffect(() => {
    fetch(`${API}/settings`).then((r) => r.json()).then((d) =>
      setForm({ name: d.name ?? "", description: d.description ?? "", working_hours: d.working_hours ?? "", discount_until: d.discount_until ? d.discount_until.split("T")[0] : "" })
    );
  }, []);

  const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));

  async function save() {
    setSaving(true);
    const r = await fetch(`${API}/settings`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, discount_until: form.discount_until || null }) });
    setSaving(false);
    if (r.ok) showToast("Podešavanja sačuvana!", "ok"); else showToast("Greška", "err");
  }

  return (
    <div style={{ maxWidth: "520px", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <SectionTitle>Podešavanje osnovnih informacija o salonu</SectionTitle>
      <Field label="Naziv salona"><Input value={form.name} onChange={setF("name")} placeholder="Trač" /></Field>
      <Field label="Opis"><Textarea value={form.description} onChange={setF("description")} placeholder="Opis salona…" /></Field>
      <Field label="Radno vreme"><Input value={form.working_hours} onChange={setF("working_hours")} placeholder="Pon–Pet 09:00–18:00" /></Field>
      <Field label="Popust 10% važi do">
        <Input type="date" value={form.discount_until} onChange={setF("discount_until")} />
        <p style={{ fontSize: "0.78rem", color: "#6b2145", marginTop: "0.3rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>Ostavi prazno ako ne želiš aktivni popust.</p>
      </Field>
      {toast && <Toast {...toast} />}
      <button className="btn-primary" onClick={save} disabled={saving} style={{ marginTop: "0.25rem" }}>{saving ? "Čuvam…" : "💾 Sačuvaj podešavanja"}</button>
    </div>
  );
}

// ─── REZERVACIJE ─────────────────────────────────────────────────────────────

interface ReservationItem {
  id: number;
  service_name: string;
  date: string;
  time: string;
  unit_price: number;
  line_total: number;
}

function ReservationRow({ r, index, onDeleted }: { r: Reservation; index: number; onDeleted: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<ReservationItem[] | null>(null);
  const [loadingItems, setLoadingItems] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function toggleExpand() {
    if (!expanded && items === null) {
      setLoadingItems(true);
      try {
        const res = await fetch(`${API}/reservations/${r.id}`);
        const data = await res.json();
        setItems(data.items ?? []);
      } catch {
        setItems([]);
      } finally {
        setLoadingItems(false);
      }
    }
    setExpanded((v) => !v);
  }

  async function handleDelete() {
    if (!confirm(`Obrisati rezervaciju #${r.id} (${r.first_name} ${r.last_name})? Ova akcija je trajna.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/reservations/${r.id}`, { method: "DELETE" });
      if (res.ok) onDeleted(r.id);
    } catch {
      alert("Greška pri brisanju");
    } finally {
      setDeleting(false);
    }
  }

  // Formatiraj datum kreiranja
  const createdDate = new Date(r.created_at).toLocaleDateString("sr-RS", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div style={{
      background: "rgba(255,255,255,0.65)", borderRadius: "16px",
      border: `1.5px solid ${expanded ? "rgba(255,61,138,0.35)" : "rgba(255,61,138,0.15)"}`,
      overflow: "hidden", transition: "border-color 0.2s",
    }}>
      {/* Glavni red */}
      <div style={{ padding: "0.85rem 1.1rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        {/* Broj */}
        <div style={{ width: "36px", height: "36px", borderRadius: "12px", flexShrink: 0, background: "rgba(255,61,138,0.10)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", fontWeight: 800, color: "#f01f72" }}>
          {index + 1}
        </div>

        {/* Ime i email */}
        <div style={{ flex: 1, minWidth: "160px" }}>
          <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#1a0a10" }}>{r.first_name} {r.last_name}</div>
          <div style={{ fontSize: "0.78rem", color: "#6b2145", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>{r.email}</div>
        </div>

        {/* Iznos i datum */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#1a0a10" }}>{Number(r.total_amount).toLocaleString()} RSD</div>
          <div style={{ fontSize: "0.75rem", color: "#9ca3af", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
            Zakazano: {createdDate}
          </div>
        </div>

        <StatusBadge status={r.status} />

        {/* Više info dugme */}
        <button
          onClick={toggleExpand}
          style={{
            background: expanded ? "linear-gradient(135deg,#ff3d8a,#f01f72)" : "rgba(255,61,138,0.08)",
            border: `1.5px solid ${expanded ? "transparent" : "rgba(255,61,138,0.25)"}`,
            borderRadius: "10px", padding: "0.4rem 0.75rem",
            fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
            color: expanded ? "white" : "#f01f72",
            transition: "all 0.2s", flexShrink: 0,
            fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
          }}
        >
          {loadingItems ? "…" : expanded ? "▲ Sakrij" : "▼ Više info"}
        </button>

        {/* Dugme obrisi */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            background: "#fee2e2", border: "1.5px solid #fca5a5",
            borderRadius: "10px", padding: "0.4rem 0.75rem",
            fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
            color: "#991b1b", flexShrink: 0,
            fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
            opacity: deleting ? 0.5 : 1,
          }}
        >
          {deleting ? "…" : "🗑 Obriši"}
        </button>
      </div>

      {/* Expandovani detalji */}
      {expanded && (
        <div style={{ borderTop: "1.5px solid rgba(255,61,138,0.12)", padding: "1rem 1.1rem", background: "rgba(255,61,138,0.03)" }}>

          {/* Kodovi */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "1rem" }}>
            <div style={{ background: "rgba(255,255,255,0.80)", borderRadius: "12px", padding: "0.7rem 1rem", border: "1.5px solid rgba(255,61,138,0.12)" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#f01f72", marginBottom: "0.2rem" }}>Kod za izmenu</div>
              <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#1a0a10", letterSpacing: "0.05em", fontFamily: "monospace" }}>{r.access_code}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.80)", borderRadius: "12px", padding: "0.7rem 1rem", border: "1.5px solid rgba(255,61,138,0.12)" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#f01f72", marginBottom: "0.2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Promo kod</span>
                <span style={{
                  background: r.promo_code_used ? "#fee2e2" : "#d1fae5",
                  color: r.promo_code_used ? "#991b1b" : "#065f46",
                  borderRadius: "999px", padding: "0.1rem 0.5rem",
                  fontSize: "0.65rem", fontWeight: 700,
                }}>
                  {r.promo_code_used ? "Iskorišćen" : "Nije iskorišćen"}
                </span>
              </div>
              <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#1a0a10", letterSpacing: "0.05em", fontFamily: "monospace" }}>{r.promo_code}</div>
            </div>
          </div>

          {/* Usluge */}
          {loadingItems && <p style={{ fontSize: "0.82rem", color: "#6b2145" }}>Učitavanje usluga…</p>}
          {!loadingItems && items && items.length === 0 && (
            <p style={{ fontSize: "0.82rem", color: "#9ca3af" }}>Nema usluga za ovu rezervaciju.</p>
          )}
          {!loadingItems && items && items.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#f01f72", marginBottom: "0.25rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
                Zakazane usluge
              </div>
              {items.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.70)", borderRadius: "12px", padding: "0.6rem 0.9rem", gap: "1rem", flexWrap: "wrap", border: "1.5px solid rgba(255,61,138,0.10)" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1a0a10" }}>{item.service_name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#6b2145", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
                      📅 {new Date(item.date.slice(0, 10) + "T00:00:00").toLocaleDateString("sr-RS", { day: "2-digit", month: "2-digit", year: "numeric" })} &nbsp;⏰ {item.time.slice(0, 5)}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#1a0a10", flexShrink: 0 }}>
                    {Number(item.line_total).toLocaleString()} RSD
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "0.25rem", fontSize: "0.82rem", color: "#6b2145", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
                Ukupno naplaćeno: <strong style={{ marginLeft: "0.4rem", color: "#1a0a10" }}>{Number(r.total_amount).toLocaleString()} RSD</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReservationsPanel() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/reservations`).then((r) => r.json())
      .then((d) => { setReservations(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function handleDeleted(id: number) {
    setReservations((prev) => prev.filter((r) => r.id !== id));
  }

  if (loading) return <p style={{ color: "#6b2145" }}>Učitavanje…</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <SectionTitle>Sve rezervacije</SectionTitle>
        <span className="section-label">{reservations.length} ukupno</span>
      </div>
      {reservations.length === 0 && <p style={{ color: "#6b2145", fontSize: "0.88rem" }}>Nema rezervacija.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
        {reservations.map((r, i) => (
          <ReservationRow key={r.id} r={r} index={i} onDeleted={handleDeleted} />
        ))}
      </div>
    </div>
  );
}

// ─── SALON HOURS ──────────────────────────────────────────────────────────────

interface SalonHour {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

const DAY_NAMES: Record<number, string> = {
  0: "Nedelja", 1: "Ponedeljak", 2: "Utorak", 3: "Sreda",
  4: "Četvrtak", 5: "Petak", 6: "Subota",
};

const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function SalonHoursPanel() {
  const [hours, setHours] = useState<SalonHour[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  function showToast(msg: string, type: "ok" | "err") { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  useEffect(() => {
    fetch(`${API}/salon-hours`).then((r) => r.json()).then(setHours).catch(() => {});
  }, []);

  function update(dayIndex: number, field: keyof SalonHour, value: any) {
    setHours((prev) => prev.map((h) => h.day_of_week === dayIndex ? { ...h, [field]: value } : h));
  }

  async function save() {
    setSaving(true);
    try {
      const r = await fetch(`${API}/salon-hours`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hours }) });
      if (r.ok) showToast("Radno vreme sačuvano!", "ok");
      else showToast("Greška pri čuvanju", "err");
    } catch {
      showToast("Greška pri čuvanju", "err");
    } finally {
      setSaving(false);
    }
  }

  if (hours.length === 0) return <p style={{ color: "#6b2145" }}>Učitavanje…</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <SectionTitle>Radno vreme salona</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {DISPLAY_ORDER.map((dow) => {
          const h = hours.find((x) => x.day_of_week === dow);
          if (!h) return null;
          return (
            <div key={h.day_of_week} style={{ display: "grid", gridTemplateColumns: "110px 1fr 1fr auto", alignItems: "center", gap: "0.75rem", background: h.is_closed ? "rgba(255,255,255,0.40)" : "rgba(255,255,255,0.65)", borderRadius: "14px", border: "1.5px solid rgba(255,61,138,0.15)", padding: "0.65rem 1rem", opacity: h.is_closed ? 0.6 : 1 }}>
              <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1a0a10" }}>{DAY_NAMES[h.day_of_week]}</span>
              <input type="time" value={h.open_time} disabled={h.is_closed} onChange={(e) => update(h.day_of_week, "open_time", e.target.value)} style={{ ...inputStyle, opacity: h.is_closed ? 0.4 : 1 }} />
              <input type="time" value={h.close_time} disabled={h.is_closed} onChange={(e) => update(h.day_of_week, "close_time", e.target.value)} style={{ ...inputStyle, opacity: h.is_closed ? 0.4 : 1 }} />
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap" }}>
                <input type="checkbox" id={`closed-${h.day_of_week}`} checked={h.is_closed} onChange={(e) => update(h.day_of_week, "is_closed", e.target.checked)} style={{ accentColor: "#f01f72", width: "16px", height: "16px", cursor: "pointer" }} />
                <label htmlFor={`closed-${h.day_of_week}`} style={{ fontSize: "0.78rem", fontWeight: 600, color: "#6b2145", cursor: "pointer", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>Zatvoreno</label>
              </div>
            </div>
          );
        })}
      </div>
      {toast && <Toast {...toast} />}
      <button className="btn-primary" onClick={save} disabled={saving}>{saving ? "Čuvam…" : "💾 Sačuvaj radno vreme"}</button>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

type Panel = "categories" | "services" | "currencies" | "hours" | "settings" | "reservations";

const MENU: { key: Panel; label: string; icon: string }[] = [
  { key: "categories",   label: "Kategorije usluga",   icon: "🗂️" },
  { key: "services",     label: "Usluge",               icon: "💅" },
  { key: "currencies",   label: "Valute & popust",      icon: "💱" },
  { key: "hours",        label: "Radno vreme",          icon: "🕐" },
  { key: "settings",     label: "Osnovna podešavanja",  icon: "⚙️" },
  { key: "reservations", label: "Rezervacije",          icon: "📋" },
];

export default function Admin() {
  const [loggedIn, setLoggedIn] = useState(() => localStorage.getItem("adminLoggedIn") === "true");
  const [active, setActive] = useState<Panel | null>(null);

  if (!loggedIn) return <LoginScreen onLogin={() => { setLoggedIn(true); localStorage.setItem("adminLoggedIn", "true"); }} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div className="section-label" style={{ marginBottom: "0.3rem" }}>Salon Trač</div>
          <h2 className="font-black" style={{ fontSize: "2.2rem", color: "#1a0a10" }}>Admin panel 🌸</h2>
        </div>
        <button className="btn-secondary" onClick={() => { setLoggedIn(false); localStorage.removeItem("adminLoggedIn"); }} style={{ fontSize: "0.82rem", padding: "0.5rem 1rem" }}>
          Odjavi se
        </button>
      </div>

      <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Sidebar */}
        <div style={{ background: "rgba(255,240,246,0.80)", border: "1.5px solid rgba(255,61,138,0.18)", borderRadius: "24px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: "220px", flexShrink: 0 }}>
          <div className="section-label" style={{ marginBottom: "0.5rem", paddingLeft: "0.25rem" }}>Opcije</div>
          {MENU.map((m) => (
            <button key={m.key} onClick={() => setActive(active === m.key ? null : m.key)} style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.75rem 1rem", borderRadius: "14px", background: active === m.key ? "linear-gradient(135deg,#ff3d8a,#f01f72)" : "rgba(255,255,255,0.70)", border: `1.5px solid ${active === m.key ? "transparent" : "rgba(255,61,138,0.18)"}`, color: active === m.key ? "white" : "#1a0a10", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer", boxShadow: active === m.key ? "0 6px 18px rgba(255,61,138,0.25)" : "none", transition: "all 0.2s", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", textAlign: "left" }}>
              <span style={{ fontSize: "1.1rem" }}>{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>

        {/* Sadržaj */}
        {active && (
          <div style={{ flex: 1, minWidth: "300px", background: "rgba(255,240,246,0.80)", border: "1.5px solid rgba(255,61,138,0.18)", borderRadius: "24px", padding: "1.75rem 2rem" }}>
            {active === "categories"   && <CategoriesPanel />}
            {active === "services"     && <ServicesPanel />}
            {active === "currencies"   && <CurrenciesPanel />}
            {active === "hours"        && <SalonHoursPanel />}
            {active === "settings"     && <SettingsPanel />}
            {active === "reservations" && <ReservationsPanel />}
          </div>
        )}

        {!active && (
          <div style={{ flex: 1, minWidth: "300px", minHeight: "200px", background: "rgba(255,240,246,0.50)", border: "1.5px dashed rgba(255,61,138,0.25)", borderRadius: "24px", padding: "2rem", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b2145", fontSize: "0.93rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
            ← Izaberi opciju iz menija
          </div>
        )}
      </div>
    </div>
  );
}