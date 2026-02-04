export default function Book() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-[32px] bg-white/70 border border-white/60 shadow-glow p-8 md:p-10">
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">
          Rezerviši termin <span className="text-blush-600">💗</span>
        </h2>
        <p className="mt-3 text-slate-700">
          U sledećem koraku ćemo povezati formu sa backend-om i katalogom.
        </p>

        <div className="mt-8 grid md:grid-cols-2 gap-4">
          {[
            { label: "Ime", placeholder: "Ana" },
            { label: "Prezime", placeholder: "Jovanović" },
            { label: "Email", placeholder: "ana@test.com" },
            { label: "Telefon", placeholder: "060..." }
          ].map((x) => (
            <div key={x.label}>
              <div className="text-sm font-semibold text-slate-700 mb-2">
                {x.label}
              </div>
              <input
                placeholder={x.placeholder}
                className="w-full rounded-2xl bg-white/90 border border-white/60 px-4 py-3 focus:outline-none focus:ring-4"
                style={{ boxShadow: "0 0 0 0 var(--ring)" }}
              />
            </div>
          ))}
        </div>

        <div className="mt-6">
          <button className="w-full px-6 py-3 rounded-2xl bg-blush-500 text-white font-bold shadow-glow hover:bg-blush-600 transition">
            Nastavi ✨
          </button>
          <div className="text-xs text-slate-600 mt-3 text-center">
            *Ovo je UI. Sledeće povezujemo /catalog i POST /reservations.
          </div>
        </div>
      </div>
    </div>
  );
}