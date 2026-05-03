import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/app/Sidebar";
import { Toaster } from "sonner";
import { I18nProvider } from "@/i18n/I18nProvider";
import { getServerLocale } from "@/i18n/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Locale resuelto desde la cookie struxai-locale (default 'es').
  // Sin esto el useT() de los componentes hijos cae al fallback
  // identidad y muestra las keys crudas (ej. subscription.contactSales).
  const locale = await getServerLocale();

  return (
    <I18nProvider locale={locale}>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
        <Sidebar profile={profile} />
        <main className="flex-1 overflow-x-hidden p-6 md:p-10">{children}</main>
        <Toaster position="top-right" richColors theme="system" />
      </div>
    </I18nProvider>
  );
}
