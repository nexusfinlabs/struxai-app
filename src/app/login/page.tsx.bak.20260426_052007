"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErr(error.message);
      setLoading(false);
    } else {
      router.push("/app/profile");
      router.refresh();
    }
  };

  const handleGoogle = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth/callback" },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl md:grid-cols-2">
          <div className="relative hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-10 md:block">
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
                Calculo estructural <span className="text-cyan-400">automatizado</span>
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Conecta Revit con SAP2000, ETABS y CYPECAD. Devuelve memoria tecnica firmable en minutos.
              </p>
            </div>

            <div className="absolute bottom-10 left-10 flex gap-8 font-mono text-[10px]">
              <div>
                <div className="text-base font-bold text-cyan-400">EHE-08</div>
                <div className="uppercase tracking-widest text-slate-500">Verificado</div>
              </div>
              <div>
                <div className="text-base font-bold text-cyan-400">CTE</div>
                <div className="uppercase tracking-widest text-slate-500">Cumplido</div>
              </div>
              <div>
                <div className="text-base font-bold text-cyan-400">NCSR-02</div>
                <div className="uppercase tracking-widest text-slate-500">Mapeado</div>
              </div>
            </div>
          </div>

          <div className="p-8 sm:p-12">
            <h2 className="text-2xl font-bold text-slate-900">Access your account</h2>
            <p className="mt-1 text-sm text-slate-500">
              Restricted to authorised structural professionals
            </p>
            <div className="mt-2 inline-block h-0.5 w-10 bg-cyan-500" />

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-600">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition focus:border-cyan-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                  placeholder="hola@example.com"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-600">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition focus:border-cyan-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                />
                <div className="mt-1.5 text-right">
                  <Link
                    href="/reset-password"
                    className="text-xs text-slate-500 underline-offset-4 hover:text-cyan-600 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
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
                {loading ? "Signing in..." : "Sign in"}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="h-px w-full bg-slate-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs uppercase tracking-wider text-slate-400">
                    Or continue with
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <GoogleIcon />
                Google
              </button>

              <p className="text-center text-sm text-slate-500">
                Need access?{" "}
                <Link
                  href="/signup"
                  className="font-medium text-cyan-600 underline underline-offset-4 hover:text-cyan-700"
                >
                  Request credentials
                </Link>
              </p>
            </form>

            <div className="mt-10 flex items-center justify-between border-t border-slate-100 pt-6 text-[10px] text-slate-400">
              <span>(c) 2026 NexusFinLabs - STRUXAI</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Secure connection
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
