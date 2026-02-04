import { Link, NavLink } from "react-router-dom";

function BubbleLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "inline-flex items-center justify-center",
          "px-4 py-2 rounded-full text-sm font-semibold",
          "transition select-none",
          "border border-white/60 backdrop-blur-xl",
          isActive
            ? "bg-white/90 shadow-soft text-blush-600"
            : "bg-white/55 text-slate-700 hover:bg-white/85 hover:text-blush-600 hover:shadow-soft"
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50">
      {/* odvojen header */}
      <div className="bg-white/35 backdrop-blur-xl border-b border-white/50">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-4 flex items-center justify-between">
          {/* Levo: brand */}
          <Link to="/" className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-blush-500 text-white flex items-center justify-center shadow-glow">
              💅
            </div>
            <div className="leading-tight">
              <div className="text-xl font-extrabold text-slate-900">Trač</div>
              <div className="text-xs text-slate-600">salon • pink vibes</div>
            </div>
          </Link>

          {/* Desno: meni u bubble dugmićima */}
          <nav className="flex items-center gap-3">
            <BubbleLink to="/" label="Početna" />
            <BubbleLink to="/book" label="Rezerviši" />
            <BubbleLink to="/admin" label="Admin" />
          </nav>
        </div>
      </div>

      {/* mali razmak da se vidi odvojenost od body-ja */}
      <div className="h-5" />
    </header>
  );
}