import { useEffect, useState } from "react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from "recharts";

const API = "http://localhost:4000";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CategoryStat { category: string; count: number; }
interface DateStat { date: string; count: number; }

// ─── Helpers / Styles ────────────────────────────────────────────────────────

const PINK = "#f01f72";
const PINK2 = "#ff3d8a";
const BG = "rgba(255,240,246,0.80)";
const BORDER = "1.5px solid rgba(255,61,138,0.18)";

const cardStyle: React.CSSProperties = {
  background: BG,
  border: BORDER,
  borderRadius: "24px",
  padding: "1.75rem 2rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%", borderRadius: "14px",
  background: "rgba(255,255,255,0.90)",
  border: "1.5px solid rgba(255,61,138,0.20)",
  padding: "0.65rem 1rem", fontSize: "0.9rem",
  color: "#1a0a10", outline: "none",
  fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
  boxSizing: "border-box" as const,
};

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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontWeight: 800, fontSize: "1.15rem", color: "#1a0a10", marginBottom: "1.25rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
      {children}
    </h3>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.70)", border: BORDER, borderRadius: "18px",
      padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.4rem",
    }}>
      <div style={{ fontSize: "1.6rem" }}>{icon}</div>
      <div style={{ fontSize: "1.8rem", fontWeight: 900, color: PINK, fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>{value}</div>
      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#6b2145", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>{label}</div>
    </div>
  );
}

const COLORS = ["#f01f72", "#ff6ea8", "#ffb3d1", "#ff3d8a", "#c4005a", "#ff85b8"];

// Custom tooltip za grafikon
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(255,240,246,0.97)", border: BORDER, borderRadius: "14px",
      padding: "0.6rem 1rem", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
    }}>
      <div style={{ fontWeight: 700, color: "#1a0a10", marginBottom: "0.25rem", fontSize: "0.85rem" }}>{label}</div>
      <div style={{ color: PINK, fontWeight: 800, fontSize: "1rem" }}>{payload[0].value} rezervacija</div>
    </div>
  );
}

// ─── Login ───────────────────────────────────────────────────────────────────

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
      if (!res.ok) throw new Error(data.message ?? "Greška");
      localStorage.setItem("reportingLoggedIn", "true");
      onLogin();
    } catch (e: any) {
      setError(e.message ?? "Greška pri logovanju");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #fff0f6 0%, #ffe4ef 50%, #fff0f6 100%)",
      fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: "380px", padding: "1rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>📊</div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: "#1a0a10", marginBottom: "0.3rem" }}>Portal za izveštavanje</h1>
          <p style={{ color: "#6b2145", fontSize: "0.9rem" }}>Salon Trač — statistike rezervacija</p>
        </div>
        <div style={cardStyle}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: PINK, marginBottom: "0.4rem" }}>
                Korisničko ime
              </label>
              <input
                value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="admin" autoComplete="username"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: PINK, marginBottom: "0.4rem" }}>
                Lozinka
              </label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                style={inputStyle}
              />
            </div>
            {error && <Toast msg={error} type="err" />}
            <button
              onClick={handleLogin} disabled={loading || !username || !password}
              style={{
                width: "100%", padding: "0.85rem", borderRadius: "14px",
                background: `linear-gradient(135deg, ${PINK2}, ${PINK})`,
                border: "none", color: "white", fontWeight: 800, fontSize: "1rem",
                cursor: "pointer", opacity: (!username || !password) ? 0.5 : 1,
                fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
              }}
            >
              {loading ? "Prijavljujem…" : "Prijavi se →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [categoryData, setCategoryData] = useState<CategoryStat[]>([]);
  const [dateData, setDateData] = useState<DateStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  async function loadData() {
    setLoading(true);
    try {
      const [catRes, dateRes] = await Promise.all([
        fetch(`${API}/reports/by-category`).then((r) => r.json()),
        fetch(`${API}/reports/by-date`).then((r) => r.json()),
      ]);
      setCategoryData(catRes);
      setDateData(dateRes);
      setLastRefresh(new Date());
    } catch (e) {
      console.error("Failed to load reports", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // Auto-refresh svakih 30 sekundi
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Statistike
  const totalTermini = categoryData.reduce((s, c) => s + c.count, 0);
  const totalDana = dateData.length;
  const maxDan = dateData.reduce((max, d) => d.count > max.count ? d : max, { date: "-", count: 0 });
  const topKat = categoryData[0]?.category ?? "-";

  // Formatiraj datum za X osu
  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("sr-RS", { day: "2-digit", month: "2-digit" });
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #fff0f6 0%, #ffe4ef 50%, #fff0f6 100%)",
      fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
      padding: "2rem",
    }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: PINK, marginBottom: "0.3rem" }}>
              Salon Trač
            </div>
            <h1 style={{ fontSize: "2.2rem", fontWeight: 900, color: "#1a0a10", margin: 0 }}>Portal za izveštavanje 📊</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ fontSize: "0.78rem", color: "#6b2145" }}>
              Osveženo: {lastRefresh.toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
            <button
              onClick={loadData} disabled={loading}
              style={{
                padding: "0.55rem 1.2rem", borderRadius: "12px",
                background: "rgba(255,255,255,0.80)", border: BORDER,
                color: PINK, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
                fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
              }}
            >
              {loading ? "⏳" : "🔄 Osveži"}
            </button>
            <button
              onClick={onLogout}
              style={{
                padding: "0.55rem 1.2rem", borderRadius: "12px",
                background: "rgba(255,255,255,0.80)", border: BORDER,
                color: "#6b2145", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
                fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
              }}
            >
              Odjavi se
            </button>
          </div>
        </div>

        {/* Stat kartice */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <StatCard icon="📅" label="Ukupno termina" value={loading ? "…" : totalTermini} />
          <StatCard icon="📆" label="Dana sa rezervacijama" value={loading ? "…" : totalDana} />
          <StatCard icon="🏆" label="Najpopularnija kategorija" value={loading ? "…" : topKat} />
          <StatCard icon="🔥" label={`Najaktivniji dan (${formatDate(maxDan.date)})`} value={loading ? "…" : maxDan.count === 0 ? "-" : `${maxDan.count} rez.`} />
        </div>

        {/* Grafikon 1 — po kategorijama */}
        <div style={cardStyle}>
          <SectionTitle>Rezervisani termini po kategoriji usluge</SectionTitle>
          {loading ? (
            <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "#6b2145" }}>Učitavanje…</div>
          ) : categoryData.length === 0 ? (
            <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>Nema podataka</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,61,138,0.10)" />
                <XAxis dataKey="category" tick={{ fontSize: 13, fill: "#6b2145", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#9ca3af" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {/* Legenda */}
          {!loading && categoryData.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "1rem" }}>
              {categoryData.map((c, i) => (
                <div key={c.category} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", color: "#1a0a10", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                  <span>{c.category}</span>
                  <span style={{ fontWeight: 700, color: PINK }}>({c.count})</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grafikon 2 — po datumima */}
        <div style={cardStyle}>
          <SectionTitle>Broj rezervacija po datumu kreiranja</SectionTitle>
          {loading ? (
            <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "#6b2145" }}>Učitavanje…</div>
          ) : dateData.length === 0 ? (
            <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>Nema podataka</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dateData.map(d => ({ ...d, dateLabel: formatDate(d.date) }))} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,61,138,0.10)" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 12, fill: "#6b2145", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#9ca3af" }} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone" dataKey="count"
                  stroke={PINK} strokeWidth={3}
                  dot={{ fill: PINK2, r: 5, strokeWidth: 2, stroke: "white" }}
                  activeDot={{ r: 7, fill: PINK }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => localStorage.getItem("reportingLoggedIn") === "true");

  if (!loggedIn) return <LoginScreen onLogin={() => setLoggedIn(true)} />;
  return <Dashboard onLogout={() => { localStorage.removeItem("reportingLoggedIn"); setLoggedIn(false); }} />;
}