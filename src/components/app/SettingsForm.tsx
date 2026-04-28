"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Hammer, Building, Calculator, Cloud, Database, HardDrive, AlertTriangle, Save } from "lucide-react";
import { humanSize, R2_FREE_TIER_BYTES, R2_WARN_THRESHOLD } from "@/lib/storage/constants";

type Settings = {
  user_id?: string;
  enabled_engines?: string[];
  enabled_normatives?: string[];
  enabled_plugins?: string[];
  enabled_materials?: string[];
  enabled_template?: string;
  professional_type?: string;
  default_jurisdiction?: string;
  preferred_pdf_template?: string;
  notification_email?: boolean;
  notification_inapp?: boolean;
  struxai_cloud_optin?: boolean;
  struxai_cloud_quota_gb?: number;
};

const PRESETS = [
  {
    id: "constructora",
    label: "Constructora",
    icon: Hammer,
    description: "Control de ejecución, replanteo, planos as-built, control calidad de obra.",
    defaults: {
      enabled_engines: ["sap2000"],
      enabled_normatives: ["cte-db-se", "cte-db-se-ae", "cte-db-si", "ehe-08", "eae"],
      enabled_materials: ["hormigon", "metalica"],
      enabled_template: "white-label",
    },
  },
  {
    id: "arquitectura",
    label: "Estudio de arquitectura",
    icon: Building,
    description: "Predimensionado, viabilidad, integración modelo, exportación IFC.",
    defaults: {
      enabled_engines: ["sap2000", "etabs"],
      enabled_normatives: ["cte-db-se", "cte-db-se-ae", "cte-db-si", "ehe-08"],
      enabled_materials: ["hormigon", "madera"],
      enabled_template: "standard",
    },
  },
  {
    id: "calculista",
    label: "Calculista estructural",
    icon: Calculator,
    description: "Dimensionado completo, ELU/ELS, FEM, memoria firmable visada.",
    defaults: {
      enabled_engines: ["sap2000", "etabs", "cypecad"],
      enabled_normatives: ["cte-db-se", "cte-db-se-ae", "cte-db-si", "ehe-08", "eae", "ncse-02"],
      enabled_materials: ["hormigon", "metalica", "mixta"],
      enabled_template: "visado",
    },
  },
];

const NORMATIVES = [
  { id: "cte-db-se", label: "CTE DB-SE", desc: "Seguridad estructural (España)" },
  { id: "cte-db-se-ae", label: "CTE DB-SE-AE", desc: "Acciones en la edificación" },
  { id: "cte-db-si", label: "CTE DB-SI", desc: "Seguridad contra incendio" },
  { id: "ehe-08", label: "EHE-08", desc: "Hormigón estructural" },
  { id: "eae", label: "EAE", desc: "Estructuras de acero" },
  { id: "ncse-02", label: "NCSE-02", desc: "Sismorresistente" },
  { id: "cte-db-se-m", label: "CTE DB-SE-M", desc: "Madera estructural" },
  { id: "cte-db-se-f", label: "CTE DB-SE-F", desc: "Fábrica / mampostería" },
  { id: "ec0", label: "Eurocodigo 0", desc: "Bases de proyecto" },
  { id: "ec1", label: "Eurocodigo 1", desc: "Acciones" },
  { id: "ec2", label: "Eurocodigo 2", desc: "Hormigon (EN 1992)" },
  { id: "ec3", label: "Eurocodigo 3", desc: "Acero (EN 1993)" },
  { id: "ec4", label: "Eurocodigo 4", desc: "Mixta (EN 1994)" },
  { id: "ec8", label: "Eurocodigo 8", desc: "Sismico (EN 1998)" },
  { id: "ncsp-07", label: "NCSP-07", desc: "Puentes — sismo" },
  { id: "rom-0-5-05", label: "ROM 0.5-05", desc: "Obra marítima" },
];

const ENGINES = [
  { id: "sap2000", label: "SAP2000" },
  { id: "etabs", label: "ETABS" },
  { id: "cypecad", label: "CYPECAD" },
  { id: "tricalc", label: "Tricalc" },
  { id: "robot", label: "Robot Structural Analysis" },
  { id: "opensees", label: "OpenSees" },
];

const PLUGINS = [
  { id: "revit-sync", label: "Revit ↔ STRUXAI sync" },
  { id: "autocad", label: "AutoCAD plugin" },
  { id: "tekla-bridge", label: "Tekla Structures bridge" },
  { id: "ifc-viewer", label: "IFC viewer integrado" },
];

const MATERIALS = [
  { id: "hormigon", label: "Hormigón armado", auto: ["ehe-08"] },
  { id: "metalica", label: "Acero estructural", auto: ["eae"] },
  { id: "mixta", label: "Mixta acero-hormigón", auto: ["eae", "ehe-08"] },
  { id: "madera", label: "Madera estructural", auto: ["cte-db-se-m"] },
  { id: "mamposteria", label: "Mampostería", auto: ["cte-db-se-f"] },
];

const TEMPLATES = [
  { id: "standard", label: "Standard", desc: "Memoria PDF profesional sin marca." },
  { id: "visado", label: "Visado COAATIE", desc: "Formato preparado para visado colegial." },
  { id: "white-label", label: "White-label", desc: "Tu logo y datos en cabecera." },
  { id: "academic", label: "Académica", desc: "Marca de agua académica." },
];

export default function SettingsForm({
  initialSettings,
  struxaiCloudUsedBytes,
  r2UsedBytes,
}: {
  initialSettings: Settings;
  struxaiCloudUsedBytes: number;
  r2UsedBytes: number;
}) {
  const [settings, setSettings] = useState<Settings>({
    enabled_engines: ["sap2000"],
    enabled_normatives: ["cte-db-se", "ehe-08"],
    enabled_plugins: [],
    enabled_materials: ["hormigon"],
    enabled_template: "standard",
    professional_type: "calculista",
    notification_email: true,
    notification_inapp: true,
    struxai_cloud_optin: true,
    struxai_cloud_quota_gb: 100,
    ...initialSettings,
  });
  const [pending, startTransition] = useTransition();

  function toggle<K extends keyof Settings>(key: K, value: string) {
    const arr = ((settings[key] as any) || []) as string[];
    const next = arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
    setSettings((s) => ({ ...s, [key]: next as any }));
  }

  function applyPreset(presetId: string) {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSettings((s) => ({
      ...s,
      professional_type: presetId,
      ...preset.defaults,
    }));
    toast.success(`Preset aplicado: ${preset.label}`);
  }

  function toggleMaterial(matId: string) {
    const isOn = (settings.enabled_materials || []).includes(matId);
    const mat = MATERIALS.find((m) => m.id === matId);
    if (!mat) return;
    const matsNext = isOn
      ? (settings.enabled_materials || []).filter((x) => x !== matId)
      : [...(settings.enabled_materials || []), matId];
    let normsNext = settings.enabled_normatives || [];
    if (!isOn) {
      mat.auto.forEach((n) => {
        if (!normsNext.includes(n)) normsNext = [...normsNext, n];
      });
    }
    setSettings((s) => ({ ...s, enabled_materials: matsNext, enabled_normatives: normsNext }));
  }

  async function save() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sesión expirada");
      return;
    }
    startTransition(async () => {
      const { error } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          enabled_engines: settings.enabled_engines,
          enabled_normatives: settings.enabled_normatives,
          enabled_plugins: settings.enabled_plugins,
          enabled_materials: settings.enabled_materials,
          enabled_template: settings.enabled_template,
          professional_type: settings.professional_type,
          notification_email: settings.notification_email,
          notification_inapp: settings.notification_inapp,
          struxai_cloud_optin: settings.struxai_cloud_optin,
          struxai_cloud_quota_gb: settings.struxai_cloud_quota_gb,
        });
      if (error) {
        toast.error("Error: " + error.message);
        return;
      }
      toast.success("Settings guardados");
    });
  }

  const r2Pct = r2UsedBytes / R2_FREE_TIER_BYTES;
  const cloudQuotaBytes = (settings.struxai_cloud_quota_gb || 100) * 1024 * 1024 * 1024;
  const cloudPct = struxaiCloudUsedBytes / cloudQuotaBytes;

  return (
    <div className="mt-8 space-y-8">
      <Section title="Tipo de profesional" subtitle="Elige un preset para autoconfigurar normativas y motores. Puedes ajustar después.">
        <div className="grid gap-4 md:grid-cols-3">
          {PRESETS.map((p) => {
            const Icon = p.icon;
            const active = settings.professional_type === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={
                  "rounded-2xl border-2 p-5 text-left transition " +
                  (active
                    ? "border-cyan-500 bg-cyan-50 dark:border-cyan-400 dark:bg-cyan-950"
                    : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600")
                }
              >
                <Icon className={"h-6 w-6 " + (active ? "text-cyan-600 dark:text-cyan-300" : "text-slate-400")} />
                <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{p.label}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{p.description}</p>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Material principal" subtitle="Activa los materiales que usas. Auto-activa las normativas relacionadas.">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {MATERIALS.map((m) => (
            <ToggleCard
              key={m.id}
              label={m.label}
              checked={(settings.enabled_materials || []).includes(m.id)}
              onChange={() => toggleMaterial(m.id)}
            />
          ))}
        </div>
      </Section>

      <Section title="Normativas estructurales (España + EU)" subtitle="Selecciona las normativas aplicables a tus cálculos.">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {NORMATIVES.map((n) => (
            <ToggleCard
              key={n.id}
              label={n.label}
              description={n.desc}
              checked={(settings.enabled_normatives || []).includes(n.id)}
              onChange={() => toggle("enabled_normatives", n.id)}
            />
          ))}
        </div>
      </Section>

      <Section title="Motores de cálculo" subtitle="Solo los activados estarán disponibles al lanzar un cálculo.">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {ENGINES.map((e) => (
            <ToggleCard
              key={e.id}
              label={e.label}
              checked={(settings.enabled_engines || []).includes(e.id)}
              onChange={() => toggle("enabled_engines", e.id)}
            />
          ))}
        </div>
      </Section>

      <Section title="Plugins / integraciones">
        <div className="grid gap-3 sm:grid-cols-2">
          {PLUGINS.map((p) => (
            <ToggleCard
              key={p.id}
              label={p.label}
              checked={(settings.enabled_plugins || []).includes(p.id)}
              onChange={() => toggle("enabled_plugins", p.id)}
            />
          ))}
        </div>
      </Section>

      <Section title="Plantilla de memoria">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSettings((s) => ({ ...s, enabled_template: t.id }))}
              className={
                "rounded-2xl border-2 p-4 text-left transition " +
                (settings.enabled_template === t.id
                  ? "border-cyan-500 bg-cyan-50 dark:border-cyan-400 dark:bg-cyan-950"
                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600")
              }
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t.label}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.desc}</p>
            </button>
          ))}
        </div>
      </Section>

      <Section
        title="Storage"
        subtitle="Decide dónde se guardan tus archivos grandes (>50 MB)."
      >
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 h-5 w-5 text-cyan-500" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Supabase (≤50 MB)</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Archivos pequeños siempre van aquí. Plan free: 1 GB total.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <HardDrive className="mt-0.5 h-5 w-5 text-emerald-500" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  STRUXAI Cloud (default &gt;50 MB)
                </p>
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!settings.struxai_cloud_optin}
                    onChange={(e) => setSettings((s) => ({ ...s, struxai_cloud_optin: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-300">Preferido</span>
                </label>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Servidor propio en VPS (~140 GB libres, sin coste de egress, propiedad total).
                Activado: archivos &gt;50 MB van aquí. Si tu cuota se llena, fallback automático a R2.
                Desactiva esta casilla solo si quieres forzar el uso de Cloudflare R2.
              </p>
              <div className="mt-3">
                <label className="block text-xs font-mono uppercase tracking-widest text-slate-500">
                  Cuota personal (GB)
                </label>
                <input
                  type="number"
                  min={1}
                  max={130}
                  value={settings.struxai_cloud_quota_gb || 100}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, struxai_cloud_quota_gb: Number(e.target.value) }))
                  }
                  className="mt-1 w-32 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <Bar pct={cloudPct} usedLabel={`${humanSize(struxaiCloudUsedBytes)} / ${humanSize(cloudQuotaBytes)}`} />
              {cloudPct >= 0.9 && (
                <p className="mt-2 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  Estás usando STRUXAI Cloud al máximo. Próximas subidas grandes irán a R2 (si está configurado).
                </p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Cloud className="mt-0.5 h-5 w-5 text-cyan-500" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Cloudflare R2 (fallback)</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Solo se usa si STRUXAI Cloud está lleno o desactivado. 10 GB gratis, sin egress.
              </p>
              <Bar pct={r2Pct} usedLabel={`${humanSize(r2UsedBytes)} / ${humanSize(R2_FREE_TIER_BYTES)}`} />
              {r2Pct >= R2_WARN_THRESHOLD && (
                <p className="mt-2 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  Te acercas al límite gratuito de R2.
                </p>
              )}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Notificaciones">
        <div className="grid gap-3 sm:grid-cols-2">
          <ToggleCard
            label="Email"
            description="Recibir avisos importantes por email."
            checked={!!settings.notification_email}
            onChange={() => setSettings((s) => ({ ...s, notification_email: !s.notification_email }))}
          />
          <ToggleCard
            label="In-app"
            description="Mostrar notificaciones dentro de la app."
            checked={!!settings.notification_inapp}
            onChange={() => setSettings((s) => ({ ...s, notification_inapp: !s.notification_inapp }))}
          />
        </div>
      </Section>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {pending ? "Guardando..." : "Guardar settings"}
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ToggleCard({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={
        "flex items-start justify-between gap-3 rounded-2xl border-2 p-4 text-left transition " +
        (checked
          ? "border-cyan-500 bg-cyan-50 dark:border-cyan-400 dark:bg-cyan-950"
          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600")
      }
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</p>
        {description && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      <span
        className={
          "mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition " +
          (checked
            ? "border-cyan-500 bg-cyan-500 text-white"
            : "border-slate-300 dark:border-slate-600")
        }
      >
        {checked && (
          <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </span>
    </button>
  );
}

function Bar({ pct, usedLabel }: { pct: number; usedLabel: string }) {
  const clamped = Math.min(1, Math.max(0, pct));
  const color = clamped >= 0.9 ? "bg-red-500" : clamped >= 0.7 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="mt-3">
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-full ${color}`} style={{ width: `${clamped * 100}%` }} />
      </div>
      <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{usedLabel}</p>
    </div>
  );
}
