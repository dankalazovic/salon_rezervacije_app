import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API = "http://localhost:4000";

interface SalonSettings {
  name: string;
  description: string;
  working_hours: string;
  location?: string;
}

export default function Home() {
  const [settings, setSettings] = useState<SalonSettings | null>(null);

  useEffect(() => {
    fetch(`${API}/settings`)
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── SECTION 1 — HERO (svetlo roze) ── */}
      <section style={{
        background: "rgba(255, 240, 246, 0.60)",
        borderRadius: "28px",
        padding: "3rem 2.5rem",
        textAlign: "center",
        marginBottom: "1.5rem",
      }} className="fade-up fade-up-1">

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-5"
          style={{
            background: "rgba(255,255,255,0.70)",
            border: "1.5px solid rgba(255,61,138,0.20)",
            color: "#6b2145",
            fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif"
          }}>
          <span style={{ color: "#ff3d8a" }}>✦</span>
          Salon lepote · Beograd
          <span style={{ color: "#ff3d8a" }}>✦</span>
        </div>

        <h1
          className="font-black tracking-tight"
          style={{ color: "#1a0a10", lineHeight: 1.1, fontSize: "clamp(2.8rem, 6vw, 5rem)", marginBottom: "1rem" }}
        >
          Dobro došla u{" "}
          <span style={{
            background: "linear-gradient(135deg, #ff3d8a, #f01f72)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontStyle: "italic"
          }}>
            Trač
          </span>
          <span style={{ WebkitTextFillColor: "initial" }}> 💗</span>
        </h1>

        <p style={{
          color: "#5a2a3a",
          fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
          fontSize: "1.05rem",
          maxWidth: "480px",
          margin: "0 auto 1.8rem",
          lineHeight: 1.7
        }}>
          
          Rezerviši termin online za minut.
        </p>

        {/* Dugmici jedan pored drugog */}
        <div style={{ display: "flex", gap: "0.85rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/book" className="btn-primary">
            Zakaži termin 💅
          </Link>
          <Link to="/services" className="btn-secondary">
            Pogledaj usluge
          </Link>
        </div>
      </section>

      {/* ── SECTION 2 — INFO KARTICE (tamno roze) ── */}
      <section style={{
        background: "rgba(255, 200, 230, 0.45)",
        borderRadius: "28px",
        padding: "2.5rem 2.5rem",
        marginBottom: "1.5rem",
      }} className="fade-up fade-up-2">

        <div className="section-label" style={{ textAlign: "center", marginBottom: "1.5rem" }}>O salonu</div>

        {/* Naziv + opis */}
        <h2 className="font-black text-center" style={{ color: "#c0185a", fontSize: "1.9rem", marginBottom: "0.6rem" }}>
          {settings?.name ?? "Salon Trač"}
        </h2>
        <p style={{
          color: "#5a2a3a",
          fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
          textAlign: "center",
          maxWidth: "520px",
          margin: "0 auto 2rem",
          fontSize: "0.95rem",
          lineHeight: 1.7
        }}>
          {settings?.description ?? "Učitavanje..."}
        </p>

        {/* Tri kartice jedan pored drugog */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          <InfoCard icon="📍" label="Lokacija" value={settings?.location ?? "Beograd, Srbija"} />
          <InfoCard icon="🕐" label="Radno vreme" value={settings?.working_hours ?? "Učitavanje..."} />
          <InfoCard icon="📞" label="Kontakt" value="@trac.salon" />
        </div>

        {/* Dugme rezervacija */}
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <Link to="/book" className="btn-primary">
            Rezerviši online ✨
          </Link>
        </div>
      </section>

      {/* ── SECTION 3 — MINI STATS (svetlo roze) ── */}
      <section style={{
        background: "rgba(255, 240, 246, 0.60)",
        borderRadius: "28px",
        padding: "2.5rem 2.5rem",
      }} className="fade-up fade-up-3">

        <div className="section-label" style={{ textAlign: "center", marginBottom: "1.5rem" }}>Zašto Trač?</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          {[
            { icon: "☕", title: "Kafa na račun kuće", sub: "uvek" },
            { icon: "✨", title: "Dobra atmosfera", sub: "bez stresa" },
            { icon: "🎀", title: "Profi usluga", sub: "svaki put" },
          ].map((s) => (
            <div key={s.title} style={{
              background: "rgba(255,255,255,0.65)",
              border: "1.5px solid rgba(255,61,138,0.18)",
              borderRadius: "20px",
              padding: "1.5rem 1rem",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.6rem" }}>{s.icon}</div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1a0a10", marginBottom: "0.25rem" }}>{s.title}</div>
              <div style={{ fontSize: "0.8rem", color: "#6b2145", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.65)",
      border: "1.5px solid rgba(255,61,138,0.18)",
      borderRadius: "20px",
      padding: "1.5rem 1rem",
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "0.5rem"
    }}>
      <div style={{
        width: "44px", height: "44px",
        borderRadius: "14px",
        background: "rgba(255,61,138,0.10)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1.3rem"
      }}>
        {icon}
      </div>
      <div style={{
        fontSize: "0.7rem",
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "#f01f72",
        fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif"
      }}>
        {label}
      </div>
      <div style={{
        fontSize: "0.88rem",
        fontWeight: 600,
        color: "#1a0a10",
        fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
        lineHeight: 1.4
      }}>
        {value}
      </div>
    </div>
  );
}