import { createClient } from "@/lib/supabase/server";

export default async function SubscriptionPage() {
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("plans")
    .select("*")
    .eq("active", true)
    .order("display_order");

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="text-2xl font-bold text-slate-900">Suscripcion</h1>
      <p className="mt-1 text-sm text-slate-500">
        Elige el plan que mejor se adapte a tu volumen de calculo. Stripe Checkout: Day 7-8.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans?.map((p) => {
          const isContact = p.contact_sales;
          const accentColor = isContact ? "violet" : "cyan";
          return (
            <div
              key={p.id}
              className={
                "relative rounded-2xl border bg-white p-6 shadow-sm transition " +
                (isContact
                  ? "border-violet-300 ring-2 ring-violet-100"
                  : "border-slate-200 hover:border-cyan-300")
              }
            >
              {isContact && (
                <span className="absolute -top-2 right-4 rounded-full bg-violet-600 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white">
                  Custom
                </span>
              )}
              <div className={"mb-1 font-mono text-[10px] uppercase tracking-widest text-" + accentColor + "-600"}>
                {p.category}
              </div>
              <h3 className="text-lg font-bold text-slate-900">{p.display_name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                {p.monthly_price_eur ? (
                  <>
                    <span className="text-3xl font-bold text-slate-900">{p.monthly_price_eur}</span>
                    <span className="text-slate-500">EUR/mes</span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-violet-600">Contacta con ventas</span>
                )}
              </div>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                {(p.features as string[]).slice(0, 6).map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className={"mt-1 h-1 w-1 shrink-0 rounded-full bg-" + accentColor + "-500"} />
                    {f}
                  </li>
                ))}
              </ul>
              {isContact ? (
                <a
                  href="mailto:sales@nexusfinlabs.com?subject=STRUXAI%20Volume%20-%20Solicitud%20de%20presupuesto&body=Hola%2C%0A%0AEstoy%20interesado%20en%20el%20plan%20Volume%20de%20STRUXAI.%0A%0AVolumen%20estimado%20de%20calculos%2Fmes%3A%0AMotores%20que%20necesitamos%3A%0AEquipo%20%28numero%20de%20usuarios%29%3A%0A%0AGracias."
                  className="mt-5 block w-full rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-white shadow-[0_0_20px_-4px_rgba(139,92,246,0.5)] hover:from-violet-500 hover:to-purple-500"
                >
                  Contacta con ventas
                </a>
              ) : (
                <button
                  disabled
                  className="mt-5 w-full rounded-lg bg-slate-100 px-4 py-2.5 text-xs font-medium text-slate-400"
                >
                  Suscribirse (Day 7)
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
