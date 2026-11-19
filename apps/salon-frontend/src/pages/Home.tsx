
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API = "http://localhost:4000";

interface SalonSettings {
  name: string;
  description: string;
  working_hours: string;
  location?: string;
}

const platformBenefits = [
  {
    number: "01",
    title: "Jednostavno zakazivanje",
    text: "Izaberi uslugu i termin koji ti odgovara, bez pozivanja salona.",
  },
  {
    number: "02",
    title: "Pregledna ponuda",
    text: "Cene, trajanje i dostupne usluge na jednom mestu.",
  },
  {
    number: "03",
    title: "Rezervacija bez komplikacija",
    text: "Prođi kroz nekoliko jasnih koraka i potvrdi svoj termin.",
  },
];

export default function Home() {
  const [settings, setSettings] = useState<SalonSettings | null>(null);

  useEffect(() => {
    fetch(`${API}/settings`)
      .then((response) => {
        if (!response.ok) throw new Error("Settings unavailable");
        return response.json();
      })
      .then(setSettings)
      .catch(() => {});
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* HERO */}
      <section
        className="fade-up fade-up-1 swirl-surface"
        style={{
          background: "rgba(255, 253, 247, 0.92)",
          border: "1px solid var(--border)",
          borderRadius: "32px",
          padding: "3.4rem 2.4rem",
          textAlign: "center",
          boxShadow: "var(--shadow-soft)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0.55rem 1rem",
            borderRadius: "999px",
            background: "rgba(241, 232, 201, 0.55)",
            border: "1px solid var(--border)",
            color: "var(--muted)",
            fontSize: "0.78rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: "1.2rem",
          }}
        >
          Beauty Studio · Beograd
        </div>

        <h1
          style={{
            color: "var(--text)",
            lineHeight: 1.08,
            fontSize: "clamp(2.6rem, 6vw, 4.8rem)",
            marginBottom: "1rem",
            fontWeight: 800,
            maxWidth: "820px",
            marginInline: "auto",
          }}
        >
          Tvoja lepota. Tvoj trenutak.
        </h1>

        <p
          style={{
            color: "var(--muted)",
            fontSize: "1.02rem",
            maxWidth: "620px",
            margin: "0 auto 1.8rem",
            lineHeight: 1.8,
          }}
        >
          Mali predah od svakodnevice, posvećen samo tebi.
        </p>

        <div
          style={{
            display: "flex",
            gap: "0.85rem",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link to="/book" className="btn-primary">
            Zakaži termin
          </Link>
          <Link to="/services" className="btn-secondary">
            Naše usluge
          </Link>
        </div>
      </section>

      {/* O SALONU */}
      <section
        className="fade-up fade-up-2"
        style={{
          background: "rgba(241, 232, 201, 0.58)",
          border: "1px solid var(--border)",
          borderRadius: "32px",
          padding: "2.6rem 2.3rem",
          boxShadow: "var(--shadow-soft)",
        }}
      >
        <div
          className="section-label"
          style={{ textAlign: "center", marginBottom: "0.9rem" }}
        >
          O salonu
        </div>

        <h2
          style={{
            textAlign: "center",
            fontSize: "2rem",
            color: "var(--text)",
            marginBottom: "1.8rem",
            fontWeight: 800,
          }}
        >
          TRAC Beauty Studio
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
          }}
        >
          <InfoCard
            label="Lokacija"
            value={settings?.location ?? "Beograd, Srbija"}
          />

          <InfoCard
            label="Radno vreme"
            value={settings?.working_hours ?? "Informacije uskoro"}
          />

          <InfoCard
            label="Kontakt"
            value="011 000 0000"
          />
        </div>

        <div style={{ textAlign: "center", marginTop: "1.8rem" }}>
          <Link to="/book" className="btn-primary">
            Rezerviši online
          </Link>
        </div>
      </section>

      {/* ZAŠTO TRAC */}
      <section
        className="fade-up fade-up-3 swirl-surface"
        style={{
          background: "rgba(255, 253, 247, 0.88)",
          border: "1px solid var(--border)",
          borderRadius: "32px",
          padding: "2.6rem 2.3rem",
          boxShadow: "var(--shadow-soft)",
        }}
      >
        <div
          className="section-label"
          style={{ textAlign: "center", marginBottom: "0.9rem" }}
        >
          Zašto TRAC?
        </div>

        <h2
          style={{
            textAlign: "center",
            fontSize: "2rem",
            color: "var(--text)",
            marginBottom: "0.8rem",
            fontWeight: 800,
          }}
        >
          Do termina u nekoliko koraka.
        </h2>

        <p
          style={{
            color: "var(--muted)",
            textAlign: "center",
            maxWidth: "680px",
            margin: "0 auto 2rem",
            fontSize: "0.98rem",
            lineHeight: 1.75,
          }}
        >
          Pronađi uslugu, odaberi slobodan termin i rezerviši online.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
          }}
        >
          {platformBenefits.map((item) => (
            <BenefitCard key={item.number} {...item} />
          ))}
        </div>
      </section>
    </div>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255, 253, 247, 0.78)",
        border: "1px solid var(--border)",
        borderRadius: "22px",
        padding: "1.5rem 1.2rem",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        gap: "0.45rem",
      }}
    >
      <div
        style={{
          fontSize: "0.75rem",
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--accent)",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "0.95rem",
          fontWeight: 700,
          color: "var(--text)",
          lineHeight: 1.5,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function BenefitCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255, 253, 247, 0.78)",
        border: "1px solid var(--border)",
        borderRadius: "22px",
        padding: "1.6rem 1.35rem",
        boxShadow: "0 14px 30px rgba(86, 67, 51, 0.05)",
      }}
    >
      <div
        style={{
          fontSize: "0.75rem",
          fontWeight: 800,
          letterSpacing: "0.18em",
          color: "var(--accent)",
          marginBottom: "0.9rem",
        }}
      >
        {number}
      </div>

      <div
        style={{
          fontWeight: 800,
          fontSize: "1rem",
          color: "var(--text)",
          marginBottom: "0.55rem",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "0.93rem",
          color: "var(--muted)",
          lineHeight: 1.7,
        }}
      >
        {text}
      </div>
    </div>
  );
}
