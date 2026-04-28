"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Settings as SettingsIcon, Sun, Moon, Monitor, Languages, Bell, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function ConfigWheel() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function clearLocalCache() {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("sb-") || k.startsWith("struxai-"))
        .forEach((k) => localStorage.removeItem(k));
      toast.success("Caché local limpiada");
    } catch {
      toast.error("No se pudo limpiar la caché");
    }
  }

  async function setLanguage(lang: "es" | "en" | "de") {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("user_settings")
      .upsert({ user_id: user.id, language: lang });
    if (error) {
      toast.error("Error guardando idioma");
      return;
    }
    toast.success(
      lang === "es" ? "Idioma: Español" : lang === "en" ? "Language: English" : "Sprache: Deutsch"
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        aria-label="Configuración rápida"
      >
        <SettingsIcon className="h-4 w-4 transition group-hover:rotate-45" />
        Configuración
      </button>

      {open && mounted && (
        <div className="absolute bottom-full left-0 mb-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 dark:border-slate-700">
            <p className="text-xs font-mono uppercase tracking-widest text-slate-500">Ajustes rápidos</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 p-4">
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Tema</p>
              <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                <ThemeBtn active={theme === "light"} onClick={() => setTheme("light")} icon={Sun} label="Claro" />
                <ThemeBtn active={theme === "dark"} onClick={() => setTheme("dark")} icon={Moon} label="Oscuro" />
                <ThemeBtn active={theme === "system"} onClick={() => setTheme("system")} icon={Monitor} label="Auto" />
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <Languages className="h-3 w-3" />
                Idioma
              </p>
              <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                <LangBtn onClick={() => setLanguage("es")} label="ES" />
                <LangBtn onClick={() => setLanguage("en")} label="EN" />
                <LangBtn onClick={() => setLanguage("de")} label="DE" />
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <Bell className="h-3 w-3" />
                Notificaciones
              </p>
              <a
                href="/app/settings"
                className="block rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Configurar email + in-app →
              </a>
            </div>

            <button
              type="button"
              onClick={clearLocalCache}
              className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Trash2 className="h-3 w-3" />
              Limpiar caché local
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ThemeBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex flex-1 flex-col items-center gap-0.5 rounded-md px-2 py-1.5 text-[10px] transition " +
        (active
          ? "bg-white shadow-sm text-cyan-600 dark:bg-slate-700 dark:text-cyan-300"
          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200")
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function LangBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 rounded-md px-2 py-1.5 text-xs font-mono uppercase tracking-widest text-slate-500 transition hover:bg-white hover:text-slate-900 hover:shadow-sm dark:hover:bg-slate-700 dark:hover:text-slate-100"
    >
      {label}
    </button>
  );
}
