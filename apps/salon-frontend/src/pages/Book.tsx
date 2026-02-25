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
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CURRENCIES = ["RSD", "EUR", "USD", "GBP"];

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

const TIME_SLOTS = generateTimeSlots();

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: number }) {
  const steps = ["Podaci", "Usluge", "Potvrda"];
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((label, i) => {
        const idx = i + 1;
        const active = idx === step;
        const done = idx < step;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={[
                "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition",
                active ? "bg-blush-500 text-white shadow-glow" : done ? "bg-blush-200 text-blush-600" : "bg-white/70 text-slate-400 border border-white/60"
              ].join(" ")}
            >
              {done ? "✓" : idx}
            </div>
            <span className={["text-sm font-semibold", active ? "text-blush-600" : "text-slate-400"].join(" ")}>
              {label}
            </span>
            {i < steps.length - 1 && <div className="w-8 h-px bg-blush-200 mx-1" />}
          </div>
        );
      })}
    </div>
  );
}

function InputField({
  label,
  required,
  ...props
}: { label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        {label} {required && <span className="text-blush-500">*</span>}
      </label>
      <input
        {...props}
        className="w-full rounded-2xl bg-white/90 border border-white/60 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[var(--ring)] shadow-soft transition"
      />
    </div>
  );
}

// ─── Step 1: Customer Data ────────────────────────────────────────────────────

function Step1({
  data,
  onChange,
  onNext,
}: {
  data: CustomerData;
  onChange: (d: CustomerData) => void;
  onNext: () => void;
}) {
  const set = (k: keyof CustomerData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...data, [k]: e.target.value });

  const valid =
    data.first_name && data.last_name && data.email &&
    data.address1 && data.postal_code && data.city && data.country;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Osnovni podaci 💗</h2>
        <p className="text-slate-600 mt-1 text-sm">Unesi svoje podatke za rezervaciju.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <InputField label="Ime" required placeholder="Ana" value={data.first_name} onChange={set("first_name")} />
        <InputField label="Prezime" required placeholder="Jovanović" value={data.last_name} onChange={set("last_name")} />
        <InputField label="Email" required type="email" placeholder="ana@example.com" value={data.email} onChange={set("email")} />
        <InputField label="Telefon" type="tel" placeholder="060 123 4567" value={data.phone} onChange={set("phone")} />
        <InputField label="Adresa" required placeholder="Ulica i broj" value={data.address1} onChange={set("address1")} />
        <InputField label="Poštanski broj" required placeholder="11000" value={data.postal_code} onChange={set("postal_code")} />
        <InputField label="Grad" required placeholder="Beograd" value={data.city} onChange={set("city")} />
        <InputField label="Država" required placeholder="Srbija" value={data.country} onChange={set("country")} />
      </div>

      <Button fullWidth disabled={!valid} onClick={onNext}>
        Nastavi — odaberi usluge ✨
      </Button>
    </div>
  );
}

// ─── Step 2: Services & Time ──────────────────────────────────────────────────

function Step2({
  catalog,
  selected,
  currency,
  promoInput,
  onToggleService,
  onDateChange,
  onTimeChange,
  onCurrencyChange,
  onPromoChange,
  onBack,
  onNext,
}: {
  catalog: Category[];
  selected: SelectedItem[];
  currency: string;
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Odaberi usluge 💅</h2>
        <p className="text-slate-600 mt-1 text-sm">Možeš odabrati više usluga u jednoj rezervaciji.</p>
      </div>

      {catalog.length === 0 && (
        <p className="text-slate-500 text-sm">Učitavanje kataloga…</p>
      )}

      {catalog.map((cat) => (
        <div key={cat.id}>
          <div className="text-xs font-bold uppercase tracking-widest text-blush-500 mb-3">{cat.name}</div>
          <div className="grid md:grid-cols-2 gap-3">
            {cat.services.map((svc) => {
              const sel = isSelected(svc.id);
              const item = selected.find((s) => s.service.id === svc.id);
              return (
                <div
                  key={svc.id}
                  className={[
                    "rounded-2xl border p-4 cursor-pointer transition",
                    sel
                      ? "border-blush-400 bg-blush-50 shadow-glow"
                      : "border-white/60 bg-white/70 hover:border-blush-300"
                  ].join(" ")}
                  onClick={() => onToggleService(svc)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900">{svc.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{svc.duration_minutes} min</div>
                    </div>
                    <div className="text-sm font-extrabold text-blush-600 whitespace-nowrap">
                      {svc.price_rsd.toLocaleString()} RSD
                    </div>
                  </div>

                  {sel && (
                    <div
                      className="mt-3 grid grid-cols-2 gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-600 mb-1">Datum</div>
                        <input
                          type="date"
                          min={todayStr()}
                          value={item?.date ?? ""}
                          onChange={(e) => onDateChange(svc.id, e.target.value)}
                          className="w-full rounded-xl bg-white border border-white/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                        />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-600 mb-1">Vreme</div>
                        <select
                          value={item?.time ?? ""}
                          onChange={(e) => onTimeChange(svc.id, e.target.value)}
                          className="w-full rounded-xl bg-white border border-white/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                        >
                          <option value="">-- izaberi --</option>
                          {TIME_SLOTS.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Currency & Promo */}
      <div className="grid md:grid-cols-2 gap-4 pt-2">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Valuta</label>
          <select
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className="w-full rounded-2xl bg-white/90 border border-white/60 px-4 py-3 text-slate-900 focus:outline-none focus:ring-4 focus:ring-[var(--ring)] shadow-soft"
          >
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Promo kod <span className="text-slate-400 font-normal">(opciono — 5% popust)</span>
          </label>
          <input
            placeholder="npr. AB3XYZ"
            value={promoInput}
            onChange={(e) => onPromoChange(e.target.value.toUpperCase())}
            className="w-full rounded-2xl bg-white/90 border border-white/60 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[var(--ring)] shadow-soft"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="secondary" onClick={onBack}>← Nazad</Button>
        <Button
          fullWidth
          disabled={
            selected.length === 0 ||
            selected.some((s) => !s.date || !s.time)
          }
          onClick={onNext}
        >
          Nastavi — pregled ✨
        </Button>
      </div>
    </div>
  );
}

// ─── Step 3: Review & Confirm ─────────────────────────────────────────────────

function Step3({
  customer,
  selected,
  currency,
  promoInput,
  onBack,
  onConfirm,
  loading,
  error,
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
  const subtotal = selected.reduce((s, i) => s + i.service.price_rsd, 0);
  const promoDiscount = promoInput.length >= 5 ? subtotal * 0.05 : 0;
  const total = subtotal - promoDiscount;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Pregled rezervacije 🎀</h2>
        <p className="text-slate-600 mt-1 text-sm">Proveri detalje pre potvrde.</p>
      </div>

      {/* Customer summary */}
      <Card className="p-5">
        <div className="text-xs font-bold uppercase tracking-widest text-blush-500 mb-3">Podaci</div>
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-1 text-sm text-slate-700">
          <span><span className="font-semibold">Ime:</span> {customer.first_name} {customer.last_name}</span>
          <span><span className="font-semibold">Email:</span> {customer.email}</span>
          <span><span className="font-semibold">Adresa:</span> {customer.address1}, {customer.postal_code} {customer.city}</span>
          <span><span className="font-semibold">Država:</span> {customer.country}</span>
        </div>
      </Card>

      {/* Items */}
      <Card className="p-5">
        <div className="text-xs font-bold uppercase tracking-widest text-blush-500 mb-3">Usluge</div>
        <div className="space-y-3">
          {selected.map((item) => (
            <div key={item.service.id} className="flex items-center justify-between text-sm">
              <div>
                <div className="font-semibold text-slate-900">{item.service.name}</div>
                <div className="text-slate-500">{item.date} u {item.time} · {item.service.duration_minutes} min</div>
              </div>
              <div className="font-bold text-slate-800">{item.service.price_rsd.toLocaleString()} RSD</div>
            </div>
          ))}
        </div>

        <div className="border-t border-white/60 mt-4 pt-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Međuzbir</span>
            <span>{subtotal.toLocaleString()} RSD</span>
          </div>
          {promoDiscount > 0 && (
            <div className="flex justify-between text-blush-600 font-semibold">
              <span>Promo popust (5%)</span>
              <span>− {promoDiscount.toLocaleString()} RSD</span>
            </div>
          )}
          <div className="flex justify-between font-extrabold text-slate-900 text-base pt-1">
            <span>Ukupno</span>
            <span>{total.toLocaleString()} RSD {currency !== "RSD" && `(${currency})`}</span>
          </div>
        </div>
      </Card>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm px-5 py-3">
          ⚠️ {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} disabled={loading}>← Nazad</Button>
        <Button fullWidth onClick={onConfirm} disabled={loading}>
          {loading ? "Šaljem…" : "Potvrdi rezervaciju 💗"}
        </Button>
      </div>
    </div>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────

function SuccessScreen({ result, onNew }: { result: BookingResult; onNew: () => void }) {
  return (
    <div className="text-center space-y-6 py-4">
      <div className="text-6xl">🎉</div>
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900">Rezervacija potvrđena!</h2>
        <p className="text-slate-600 mt-2">Vidimo se u salonu Trač 💗</p>
      </div>

      <Card className="p-6 text-left space-y-4 max-w-sm mx-auto">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-blush-500 mb-1">Šifra za pristup</div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-widest">{result.accessCode}</div>
          <div className="text-xs text-slate-500 mt-0.5">Sačuvaj ovu šifru — potrebna je za izmenu rezervacije.</div>
        </div>

        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-blush-500 mb-1">Tvoj promo kod</div>
          <div className="text-xl font-extrabold text-blush-600 tracking-widest">{result.promoCode}</div>
          <div className="text-xs text-slate-500 mt-0.5">Iskoristi ga za sledeću rezervaciju — 5% popusta!</div>
        </div>

        <div className="border-t border-white/60 pt-4 flex justify-between font-bold text-slate-900">
          <span>Ukupno naplaćeno</span>
          <span>{result.totalAmount.toLocaleString()} RSD</span>
        </div>
      </Card>

      <Button onClick={onNew} variant="secondary">Nova rezervacija</Button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const emptyCustomer: CustomerData = {
  first_name: "", last_name: "", email: "", phone: "",
  address1: "", postal_code: "", city: "", country: ""
};

export default function Book() {
  const [step, setStep] = useState(1);
  const [catalog, setCatalog] = useState<Category[]>([]);
  const [customer, setCustomer] = useState<CustomerData>(emptyCustomer);
  const [selected, setSelected] = useState<SelectedItem[]>([]);
  const [currency, setCurrency] = useState("RSD");
  const [promoInput, setPromoInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);

  useEffect(() => {
    fetch(`${API}/catalog`)
      .then((r) => r.json())
      .then(setCatalog)
      .catch(() => {});
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
    setLoading(true);
    setError(null);
    try {
      const body = {
        ...customer,
        currency,
        promo_code_used: promoInput || undefined,
        items: selected.map((s) => ({
          service_id: s.service.id,
          date: s.date,
          time: s.time
        }))
      };

      const res = await fetch(`${API}/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
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
    setStep(1);
    setCustomer(emptyCustomer);
    setSelected([]);
    setCurrency("RSD");
    setPromoInput("");
    setResult(null);
    setError(null);
  }

  if (result) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 md:p-10">
          <SuccessScreen result={result} onNew={resetAll} />
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-8 md:p-10">
        <StepIndicator step={step} />

        {step === 1 && (
          <Step1 data={customer} onChange={setCustomer} onNext={() => setStep(2)} />
        )}
        {step === 2 && (
          <Step2
            catalog={catalog}
            selected={selected}
            currency={currency}
            promoInput={promoInput}
            onToggleService={toggleService}
            onDateChange={updateDate}
            onTimeChange={updateTime}
            onCurrencyChange={setCurrency}
            onPromoChange={setPromoInput}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <Step3
            customer={customer}
            selected={selected}
            currency={currency}
            promoInput={promoInput}
            onBack={() => setStep(2)}
            onConfirm={handleConfirm}
            loading={loading}
            error={error}
          />
        )}
      </Card>
    </div>
  );
}