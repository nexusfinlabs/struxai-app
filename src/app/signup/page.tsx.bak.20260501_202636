"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
        emailRedirectTo: window.location.origin + "/auth/callback",
      },
    });
    if (error) {
      setErr(error.message);
      setLoading(false);
    } else {
      setDone(true);
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth/callback" },
    });
  };

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-10 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-6 w-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Confirma tu email</h2>
          <p className="mt-2 text-sm text-slate-500">
            Te hemos enviado un enlace de confirmacion a <span className="font-medium text-slate-700">{email}</span>. Click en el enlace para activar tu cuenta.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-lg bg-gradient-to-r from-cyan-500 via-cyan-400 to-teal-400 px-5 py-2 text-sm font-semibold text-white shadow"
          >
            Volver al login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl md:grid-cols-2">
          <a href="https://struxai.nexusfinlabs.com" target="_blank" rel="noopener" className="relative hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-10 transition hover:opacity-95 md:block">
            <div className="absolute -right-24 top-12 h-72 w-72 rounded-full border-2 border-cyan-400/15" />
            <div className="absolute -left-12 bottom-12 h-48 w-48 rounded-full border border-cyan-400/10" />
            <div className="relative">
              <div className="mb-1 inline-block h-px w-10 bg-cyan-400" />
              <h1 className="text-3xl font-bold text-white">
                STRUX<span className="text-cyan-400">AI</span>
              </h1>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-400">
                Structural Intelligence Platform
              </p>
            </div>
            <div className="relative mt-32">
              <p className="text-xl font-medium leading-snug text-white">
                Crea tu cuenta y empieza a <span className="text-cyan-400">automatizar</span>
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                14 dias gratis en cualquier plan. Sin compromiso. Configura tu perfil y empieza a subir archivos en minutos.
              </p>
            </div>
          </a>

          <div className="p-8 sm:p-12">
            <h2 className="text-2xl font-bold text-slate-900">Request access</h2>
            <p className="mt-1 text-sm text-slate-500">Crea tu cuenta profesional</p>
            <div className="mt-2 inline-block h-0.5 w-10 bg-cyan-500" />

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-600">
                    First name
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition focus:border-cyan-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-600">
                    Last name
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition focus:border-cyan-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-600">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition focus:border-cyan-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-600">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition focus:border-cyan-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                />
                <p className="mt-1 text-[10px] text-slate-400">Minimo 8 caracteres</p>
              </div>

              {err && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {err}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-cyan-500 via-cyan-400 to-teal-400 px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_0_24px_-4px_rgba(6,182,212,0.55)] transition-all hover:from-cyan-400 hover:via-teal-400 hover:to-cyan-400 hover:shadow-[0_0_32px_-4px_rgba(20,184,166,0.7)] disabled:opacity-60"
              >
                {loading ? "Creando cuenta..." : "Create account"}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="h-px w-full bg-slate-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs uppercase tracking-wider text-slate-400">
                    Or
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
                </svg>
                Continuar con Google
              </button>

              <p className="text-center text-sm text-slate-500">
                Ya tienes cuenta?{" "}
                <Link href="/login" className="font-medium text-cyan-600 underline underline-offset-4 hover:text-cyan-700">
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
