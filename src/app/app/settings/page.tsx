import { createClient } from "@/lib/supabase/server";
import SettingsForm from "@/components/app/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Asegurar que existe la fila de settings
  const { data: existing } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user!.id)
    .single();

  let settings = existing;
  if (!settings) {
    const { data: created } = await supabase
      .from("user_settings")
      .insert({ user_id: user!.id })
      .select()
      .single();
    settings = created;
  }

  // Calcular uso de STRUXAI Cloud
  const { data: cloudFiles } = await supabase
    .from("files")
    .select("size_bytes")
    .eq("user_id", user!.id)
    .eq("external_storage_provider", "struxai_cloud");

  const struxaiCloudUsed = (cloudFiles || []).reduce(
    (sum: number, f: any) => sum + (f.size_bytes || 0),
    0
  );

  // R2 used
  const { data: r2Files } = await supabase
    .from("files")
    .select("size_bytes")
    .eq("user_id", user!.id)
    .eq("external_storage_provider", "r2");
  const r2Used = (r2Files || []).reduce((sum: number, f: any) => sum + (f.size_bytes || 0), 0);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Settings</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Motores de cálculo, normativas, plugins, plantilla de memoria y storage.
      </p>

      <SettingsForm
        initialSettings={settings || {}}
        struxaiCloudUsedBytes={struxaiCloudUsed}
        r2UsedBytes={r2Used}
      />
    </div>
  );
}
