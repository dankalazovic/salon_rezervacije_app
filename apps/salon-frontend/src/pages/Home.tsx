import { Link } from "react-router-dom";
import Button from "../components/Button";
import Card from "../components/Card";

function Badge({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 border border-white/60 shadow-soft">
      <span className="h-2 w-2 rounded-full bg-blush-500" />
      <span className="text-sm text-slate-700">{text}</span>
    </div>
  );
}

function MiniStat({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-2">
      <div className="h-12 w-12 rounded-2xl bg-white/75 border border-white/60 shadow-soft flex items-center justify-center text-xl">
        {icon}
      </div>
      <div className="text-sm font-bold text-slate-900">{title}</div>
      <div className="text-xs text-slate-600">{subtitle}</div>
    </div>
  );
}

function ServiceCard({ title, minutes, price }: { title: string; minutes: string; price: string }) {
  return (
    <Card className="p-6 hover:shadow-glow transition">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-extrabold text-slate-900">{title}</div>
          <div className="text-sm text-slate-600 mt-1">{minutes}</div>
        </div>
        <div className="text-sm font-extrabold text-blush-600 whitespace-nowrap">
          {price}
        </div>
      </div>
      <div className="mt-5">
        <Link to="/book">
          <Button variant="secondary" className="w-full">
            Rezerviši ✨
          </Button>
        </Link>
      </div>
    </Card>
  );
}

export default function Home() {
  return (
    <div className="space-y-14">
      {/* HERO */}
      <section className="text-center space-y-6">
        <Badge text="Salon za kosu i nokte u Beogradu" />

        <div className="space-y-3">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900">
            Mesto na kom nećeš čuti
          </h1>
          <div className="text-2xl md:text-3xl font-semibold text-blush-600 italic">
            “ma ne radim ti ja to…”
          </div>
        </div>

        <p className="max-w-2xl mx-auto text-base md:text-lg text-slate-700 leading-relaxed">
          Dobro došla u <span className="font-bold">Trač</span> 💗
          Kod nas je vibe nežan, usluge su top, a rezervacija je brza.
          Izaberi tretman i termin — završeno za minut.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/book">
            <Button>Zakaži termin 💅</Button>
          </Link>

          <Button variant="secondary" onClick={() => alert("Kasnije povezujemo Instagram 🙂")}>
            Instagram @trac
          </Button>
        </div>

        <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <MiniStat icon="☕" title="Kafa na račun kuće" subtitle="uvek" />
          <MiniStat icon="✨" title="Dobra atmosfera" subtitle="bez stresa" />
          <MiniStat icon="🎀" title="Profi usluga" subtitle="svaki put" />
        </div>
      </section>

      {/* POPULAR */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-blush-600">Najtraženije</div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">
              Popularne usluge
            </h2>
            <p className="text-slate-700 mt-2 max-w-xl">
              Ovo su usluge koje se najčešće zakazuju. Sledeći korak:
              povezujemo ove kartice sa backend <code>/catalog</code>.
            </p>
          </div>

          <Link to="/book">
            <Button variant="secondary">Pogledaj sve usluge</Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <ServiceCard title="Šišanje" minutes="45 min" price="1200 RSD" />
          <ServiceCard title="Feniranje" minutes="30 min" price="1200 RSD" />
          <ServiceCard title="Manikir" minutes="60 min" price="1800 RSD" />
        </div>
      </section>

      {/* CTA STRIP */}
      <section>
        <Card className="p-8 md:p-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="text-2xl md:text-3xl font-extrabold text-slate-900">
                Spremna za glow? 💗
              </div>
              <div className="text-slate-700 mt-2">
                Rezerviši termin online i dobiješ promo kod za sledeću posetu.
              </div>
            </div>

            <Link to="/book">
              <Button className="px-8">Rezerviši sada ✨</Button>
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}