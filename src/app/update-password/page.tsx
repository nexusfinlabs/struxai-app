"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, CheckCircle2 } from "lucide-react";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [validSession, setValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setValidSession(!!data.session);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) {
      setErr("La password debe tener minimo 8 caracteres");
      return;
    }
    if (password !== confirm) {
      setErr("Las passwords no coinciden");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErr(error.message);
      setLoading(false);
    } else {
      setDone(true);
      await supabase.auth.signOut();
      setTimeout(() => router.push("/login"), 2500);
    }
  };

  if (validSession === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-500" />
      </div>
    );
  }

  if (!validSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-10 text-center shadow-2xl">
          <h2 className="text-xl font-bold text-slate-900">Enlace invalido o caducado</h2>
          <p className="mt-3 text-sm text-slate-500">
            El enlace de reset es invalido o ha caducado. Solicita uno nuevo.
          </p>
          <Link
            href="/reset-password"
            className="mt-6 inline-block rounded-lg bg-gradient-to-r from-cyan-500 via-cyan-400 to-teal-400 px-5 py-2.5 text-sm font-semibold text-white shadow"
          >
            Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-2xl">
        {!done ? (
          <>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100">
              <KeyRound className="h-6 w-6 text-cyan-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Nueva password</h2>
            <p className="mt-2 text-sm text-slate-500">
              Introduce tu nueva password. Te redirigiremos al login al terminar.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-600">
                  Nueva password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-cyan-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                />
                <p className="mt-1 text-[10px] text-slate-400">Minimo 8 caracteres</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-600">
                  Confirmar password
                </label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-cyan-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
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
                {loading ? "Actualizando..." : "Actualizar password"}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Password actualizada</h2>
            <p className="mt-3 text-sm text-slate-500">
              Te redirigimos al login...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
