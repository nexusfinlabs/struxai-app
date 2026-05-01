"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/update-password",
    });
    if (error) setErr(error.message);
    else setSent(true);
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-2xl">
        <Link
          href="/login"
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-600"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver al login
        </Link>

        {!sent ? (
          <>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100">
              <Mail className="h-6 w-6 text-cyan-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Recuperar password</h2>
            <p className="mt-2 text-sm text-slate-500">
              Introduce tu email y te enviaremos un enlace para resetear tu password.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-600">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-cyan-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                  placeholder="hola@example.com"
                  autoComplete="email"
                />
              </div>

              {err && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {err}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gradient-to-r from-cyan-500 via-cyan-400 to-teal-400 px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow disabled:opacity-60"
              >
                {loading ? "Enviando..." : "Enviar enlace"}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <Mail className="h-6 w-6 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Email enviado</h2>
            <p className="mt-3 text-sm text-slate-500">
              Si existe una cuenta con <span className="font-medium text-slate-700">{email}</span>,
              recibiras un enlace para resetear tu password en los proximos minutos.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-lg bg-gradient-to-r from-cyan-500 via-cyan-400 to-teal-400 px-5 py-2.5 text-sm font-semibold text-white shadow"
            >
              Volver al login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
