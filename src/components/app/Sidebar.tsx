"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User, FolderKanban, CreditCard, Settings, FileText, LogOut } from "lucide-react";
import ConfigWheel from "./ConfigWheel";

const NAV = [
  { href: "/app/profile", label: "Mi perfil", icon: User },
  { href: "/app/projects", label: "Proyectos", icon: FolderKanban },
  { href: "/app/subscription", label: "Suscripción", icon: CreditCard },
  { href: "/app/settings", label: "Settings", icon: Settings },
  { href: "/app/outputs", label: "Memorias", icon: FileText },
];

export default function Sidebar({ profile }: { profile: any }) {
  const pathname = usePathname();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "https://struxai.nexusfinlabs.com";
  };

  return (
    <aside className="flex w-72 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-200 p-6 dark:border-slate-800">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
          STRUX<span className="text-cyan-500">AI</span>
        </h1>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-slate-400">
          Cliente App
        </p>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={
                "flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm transition " +
                (isActive
                  ? "border-l-cyan-500 bg-cyan-50 font-medium text-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200"
                  : "border-l-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-100")
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <div className="mb-3 px-2">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
            {profile?.first_name} {profile?.last_name}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{profile?.email}</p>
        </div>
        <ConfigWheel />
        <button
          onClick={logout}
          className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-100"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
