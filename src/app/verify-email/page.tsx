"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, RefreshCw, LogOut } from "lucide-react";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        // Si ya esta confirmado, ir a /app
        if (data.user.email_confirmed_at) {
          router.push("/app/profile");
          return;
        }
        setEmail(data.user.email || "");
      } else {
        router.push("/login");
      }
    });
  }, [router]);

  const handleResend = async () => {
    setResending(true);
    setErr(null);
    setResent(false);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: window.location.origin + "/auth/callback" },
    });
    if (error) setErr(error.message);
    else setResent(true);
    setResending(false);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-10 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-100">
          <Mail className="h-7 w-7 text-cyan-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Confirma tu email</h2>
        <p className="mt-3 text-sm text-slate-500">
          Hemos enviado un enlace de verificacion a{" "}
          <span className="font-medium text-slate-700">{email}</span>.
          Click en el enlace para activar tu cuenta y acceder a la app.
        </p>

        {resent && (
          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            Email reenviado. Revisa tu bandeja (y spam).
          </div>
        )}

        {err && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            onClick={handleResend}
            disabled={resending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 via-cyan-400 to-teal-400 px-4 py-2.5 text-sm font-semibold text-white shadow disabled:opacity-60"
          >
            <RefreshCw className={"h-4 w-4 " + (resending ? "animate-spin" : "")} />
            {resending ? "Reenviando..." : "Reenviar email"}
          </button>

          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesion
          </button>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          Ya lo confirmaste?{" "}
          <Link href="/app/profile" className="font-medium text-cyan-600 underline">
            Continuar a la app
          </Link>
        </p>
      </div>
    </div>
  );
}
