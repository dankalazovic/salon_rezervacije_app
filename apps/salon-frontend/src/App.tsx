import { useEffect, useState } from "react";
import "./App.css";

type Settings = {
  id: number;
  name: string;
  location: string;
  description: string;
  working_hours: string;
  base_currency: string;
  discount_until: string | null;
  discount_percent: number;
  updated_at: string;
};

type Service = {
  id: number;
  name: string;
  duration_minutes: number;
  price_rsd: number;
};

type Category = {
  id: number;
  name: string;
  services: Service[];
};

const API = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [catalog, setCatalog] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const [sRes, cRes] = await Promise.all([
          fetch(`${API}/settings`),
          fetch(`${API}/catalog`)
        ]);

        if (!sRes.ok) throw new Error("Ne mogu da učitam settings");
        if (!cRes.ok) throw new Error("Ne mogu da učitam katalog");

        const sData = (await sRes.json()) as Settings;
        const cData = (await cRes.json()) as Category[];

        setSettings(sData);
        setCatalog(Array.isArray(cData) ? cData : []);
      } catch (e: any) {
        setError(e?.message ?? "Greška pri učitavanju");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) return <div style={{ padding: 24 }}>Učitavanje...</div>;
  if (error) return <div style={{ padding: 24, color: "crimson" }}>{error}</div>;

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24, fontFamily: "Arial, sans-serif" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>{settings?.name ?? "Salon"}</h1>
        <p style={{ margin: "8px 0" }}>
          <b>Lokacija:</b> {settings?.location}
        </p>
        <p style={{ margin: "8px 0" }}>
          <b>Radno vreme:</b> {settings?.working_hours}
        </p>
        <p style={{ margin: "8px 0" }}>{settings?.description}</p>
      </header>

      <main>
        <h2 style={{ marginTop: 0 }}>Usluge</h2>

        {catalog.length === 0 ? (
          <p>Nema podataka o uslugama.</p>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {catalog.map((cat) => (
              <section key={cat.id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
                <h3 style={{ marginTop: 0 }}>{cat.name}</h3>

                {cat.services.length === 0 ? (
                  <p style={{ margin: 0, opacity: 0.7 }}>Nema usluga u ovoj kategoriji.</p>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {cat.services.map((s) => (
                      <li key={s.id} style={{ margin: "6px 0" }}>
                        <b>{s.name}</b> — {s.duration_minutes} min — {s.price_rsd} RSD
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}