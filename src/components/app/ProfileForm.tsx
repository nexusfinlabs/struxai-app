"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { User, MapPin, Building2, Mail, Save } from "lucide-react";

export default function ProfileForm({ profile }: { profile: any }) {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: profile?.first_name ?? "",
    last_name: profile?.last_name ?? "",
    phone: profile?.phone ?? "",
    address_line1: profile?.address_line1 ?? "",
    address_line2: profile?.address_line2 ?? "",
    city: profile?.city ?? "",
    postal_code: profile?.postal_code ?? "",
    country: profile?.country ?? "ES",
    company_name: profile?.company_name ?? "",
    vat_number: profile?.vat_number ?? "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update(form).eq("id", profile.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Perfil actualizado");
      router.refresh();
    }
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="space-y-8">
      {/* EMAIL (read-only) */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900">
        <Mail className="h-4 w-4 text-slate-400" />
        <span className="font-medium text-slate-600 dark:text-slate-300">Email</span>
        <span className="ml-auto text-slate-900 dark:text-slate-100">{profile?.email}</span>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          read only
        </span>
      </div>

      {/* DATOS PERSONALES */}
      <Section icon={User} title="Datos personales">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nombre" value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} />
          <Field label="Apellidos" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} />
        </div>
        <Field label="Teléfono" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} type="tel" placeholder="+34 600 000 000" />
      </Section>

      {/* DIRECCIÓN */}
      <Section icon={MapPin} title="Dirección">
        <Field label="Dirección" value={form.address_line1} onChange={(v) => setForm({ ...form, address_line1: v })} placeholder="Calle, número, piso" />
        <Field label="Línea adicional" value={form.address_line2} onChange={(v) => setForm({ ...form, address_line2: v })} placeholder="Edificio, escalera, etc. (opcional)" />
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Ciudad" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <Field label="Código postal" value={form.postal_code} onChange={(v) => setForm({ ...form, postal_code: v })} />
          <SelectField
            label="País"
            value={form.country}
            onChange={(v) => setForm({ ...form, country: v })}
            options={[
              { value: "ES", label: "España" },
              { value: "PT", label: "Portugal" },
              { value: "FR", label: "Francia" },
              { value: "DE", label: "Alemania" },
              { value: "IT", label: "Italia" },
              { value: "GB", label: "Reino Unido" },
              { value: "US", label: "Estados Unidos" },
              { value: "OTRO", label: "Otro" },
            ]}
          />
        </div>
      </Section>

      {/* EMPRESA */}
      <Section icon={Building2} title="Empresa" subtitle="Datos fiscales (opcional, para facturación).">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Empresa" value={form.company_name} onChange={(v) => setForm({ ...form, company_name: v })} placeholder="ej. Nexus FinLabs" />
          <Field label="NIF / VAT" value={form.vat_number} onChange={(v) => setForm({ ...form, vat_number: v })} placeholder="ej. B12345678 / ESB12345678" />
        </div>
      </Section>

      {/* SAVE */}
      <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-6 dark:border-slate-700">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-cyan-500" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-700 dark:text-slate-200">
          {title}
        </h2>
      </div>
      {subtitle && (
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      )}
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-600"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
