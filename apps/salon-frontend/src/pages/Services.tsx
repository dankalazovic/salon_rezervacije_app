import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API = "http://localhost:4000";

interface Service {
  id: number;
  name: string;
  duration_minutes: number;
  price_rsd: number;
}

interface Category {
  id: number;
  name: string;
  services: Service[];
}

export default function Services() {
  const [catalog, setCatalog] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/catalog`)
      .then((r) => r.json())
      .then((data) => { setCatalog(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── HEADER (svetlo roze) ── */}
      <section style={{
        background: "rgba(255, 240, 246, 0.60)",
        borderRadius: "28px",
        padding: "2.5rem 2.5rem",
        textAlign: "center",
      }} className="fade-up fade-up-1">
        <div className="section-label" style={{ marginBottom: "0.75rem" }}>Cenovnik</div>
        <h1 className="font-black tracking-tight" style={{ color: "#1a0a10", fontSize: "clamp(2rem, 4vw, 3rem)", marginBottom: "0.6rem" }}>
          Naše usluge
        </h1>
        <p style={{
          color: "#5a2a3a",
          fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
          fontSize: "0.97rem",
          maxWidth: "420px",
          margin: "0 auto"
        }}>
          Izaberi tretman koji ti odgovara i zakaži termin online.
        </p>
      </section>

      {/* ── KATEGORIJE (naizmenično) ── */}
      {loading && (
        <div style={{ textAlign: "center", padding: "3rem", color: "#6b2145" }}>Učitavanje usluga…</div>
      )}

      {!loading && catalog.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem", color: "#6b2145" }}>Trenutno nema dostupnih usluga.</div>
      )}

      {catalog.map((cat, idx) => (
        <section
          key={cat.id}
          style={{
            background: idx % 2 === 0
              ? "rgba(255, 200, 230, 0.45)"   /* tamno roze */
              : "rgba(255, 240, 246, 0.60)",   /* svetlo roze */
            borderRadius: "28px",
            padding: "2rem 2.5rem",
          }}
          className="fade-up fade-up-2"
        >
          {/* Category label */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
            <div className="section-label">{cat.name}</div>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,61,138,0.15)" }} />
          </div>

          {/* Service cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
            {cat.services.map((svc) => (
              <ServiceCard key={svc.id} service={svc} />
            ))}
            {cat.services.length === 0 && (
              <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>Nema usluga u ovoj kategoriji.</p>
            )}
          </div>
        </section>
      ))}

      {/* ── CTA (svetlo roze ako je poslednji tamno, inače tamno) ── */}
      {!loading && catalog.length > 0 && (
        <section style={{
          background: catalog.length % 2 === 0
            ? "rgba(255, 200, 230, 0.45)"
            : "rgba(255, 240, 246, 0.60)",
          borderRadius: "28px",
          padding: "2.5rem",
          textAlign: "center",
        }} className="fade-up fade-up-3">
          <div className="font-black" style={{ color: "#1a0a10", fontSize: "1.6rem", marginBottom: "0.6rem" }}>
            Spremna za glow? 💗
          </div>
          <p style={{
            color: "#5a2a3a",
            fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
            fontSize: "0.93rem",
            marginBottom: "1.25rem"
          }}>
            Zakaži termin online i dobij promo kod za sledeću posetu.
          </p>
          <Link to="/book" className="btn-primary">
            Rezerviši termin ✨
          </Link>
        </section>
      )}
    </div>
  );
}

function ServiceCard({ service }: { service: Service }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.70)",
      border: "1.5px solid rgba(255,61,138,0.18)",
      borderRadius: "20px",
      padding: "1.4rem 1.4rem 1.2rem",
      display: "flex",
      flexDirection: "column",
      gap: "1rem",
      transition: "transform 0.2s, box-shadow 0.2s",
    }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 14px 36px rgba(255,61,138,0.16)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* Naziv i trajanje — centrirani */}
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontWeight: 700,
          fontSize: "0.97rem",
          color: "#1a0a10",
          marginBottom: "0.35rem",
          paddingLeft: "0.5rem",
          paddingRight: "0.5rem",
        }}>
          {service.name}
        </div>
        <div style={{
          fontSize: "0.78rem",
          color: "#6b2145",
          fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.3rem"
        }}>
          <span>⏱</span> {service.duration_minutes} min
        </div>
      </div>

      {/* Cena i dugme — centrirani, dugme levo od cene */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        flexWrap: "wrap",
      }}>
        <Link
          to="/book"
          className="btn-secondary"
          style={{ padding: "0.4rem 1rem", fontSize: "0.8rem" }}
        >
          Rezerviši
        </Link>
        <div style={{
          fontWeight: 800,
          fontSize: "1.05rem",
          color: "#f01f72",
          whiteSpace: "nowrap"
        }}>
          {Number(service.price_rsd).toLocaleString()} <span style={{ fontWeight: 600, fontSize: "0.82rem" }}>RSD</span>
        </div>
      </div>
    </div>
  );
}