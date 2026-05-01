"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/i18n/I18nProvider";

type Plan = {
  id: string;
  display_name: string;
  category: string;
  monthly_price_eur: number | null;
  features: string[];
  active: boolean;
  available_for_subscription: boolean;
  contact_sales: boolean;
  display_order: number;
};

export default function SubscriptionPage() {
  const { t } = useT();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("plans")
      .select("*")
      .eq("active", true)
      .order("display_order")
      .then(({ data }) => setPlans((data as Plan[]) || []));
  }, []);

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
        {t("subscription.title")}
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {t("subscription.subtitle")}
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => {
          const isContact = p.contact_sales;
          const isAvailable = p.available_for_subscription;
          const accentColor = isContact ? "violet" : "cyan";

          const cardClass =
            isAvailable || isContact
              ? "relative rounded-2xl border bg-white p-6 shadow-sm transition " +
                (isContact
                  ? "border-violet-300 ring-2 ring-violet-100"
                  : "border-slate-200 hover:border-cyan-300")
              : "relative rounded-2xl border border-slate-200 bg-slate-100 p-6 shadow-sm opacity-60 cursor-not-allowed";

          return (
            <div key={p.id} className={cardClass}>
              {isContact && (
                <span className="absolute -top-2 right-4 rounded-full bg-violet-600 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white">
                  {t("subscription.customLabel")}
                </span>
              )}
              <div
                className={
                  "mb-1 font-mono text-[10px] uppercase tracking-widest text-" +
                  accentColor +
                  "-600"
                }
              >
                {p.category}
              </div>
              <h3 className="text-lg font-bold text-slate-900">{p.display_name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                {p.monthly_price_eur ? (
                  <>
                    <span className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                      {p.monthly_price_eur}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {t("subscription.monthly")}
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-violet-600">
                    {t("subscription.contactSales")}
                  </span>
                )}
              </div>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                {p.features.slice(0, 6).map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span
                      className={"mt-1 h-1 w-1 shrink-0 rounded-full bg-" + accentColor + "-500"}
                    />
                    {f}
                  </li>
                ))}
              </ul>

              {isContact ? (
                <a
                  href="mailto:hola@nexusfinlabs.com?subject=STRUXAI%20Volume"
                  className="mt-5 block w-full rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-white shadow-[0_0_20px_-4px_rgba(139,92,246,0.5)] hover:from-violet-500 hover:to-purple-500"
                >
                  {t("subscription.contactSales")}
                </a>
              ) : isAvailable ? (
                <button
                  onClick={() => setShowPopup(true)}
                  className="mt-5 w-full rounded-lg bg-cyan-600 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-cyan-500 transition"
                >
                  {t("subscription.subscribe")}
                </button>
              ) : (
                <button
                  disabled
                  className="mt-5 w-full rounded-lg bg-slate-200 px-4 py-2.5 text-xs font-medium text-slate-400 cursor-not-allowed"
                >
                  {t("subscription.subscribe")}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {showPopup && (
        <div
          onClick={() => setShowPopup(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="mx-4 max-w-md rounded-2xl bg-white p-8 shadow-xl"
          >
            <h2 className="text-xl font-bold text-slate-900">Gracias por tu interes</h2>
            <p className="mt-3 text-sm text-slate-600">
              Por favor escribenos si tienes interes en usar nuestro producto. Te contactaremos para activar tu suscripcion.
            </p>
            <a
              href="mailto:hola@nexusfinlabs.com?subject=STRUXAI%20-%20Interes%20en%20suscripcion"
              className="mt-5 block w-full rounded-lg bg-cyan-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-cyan-500"
            >
              Escribir a hola@nexusfinlabs.com
            </a>
            <button
              onClick={() => setShowPopup(false)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
