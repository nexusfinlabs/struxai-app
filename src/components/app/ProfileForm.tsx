"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ProfileForm({ profile }: { profile: any }) {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: profile?.first_name ?? "",
    last_name: profile?.last_name ?? "",
    phone: profile?.phone ?? "",
    address_line1: profile?.address_line1 ?? "",
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
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-lg bg-slate-50 p-4 text-sm">
        <span className="font-medium text-slate-600">Email</span>
        <span className="ml-3 text-slate-900">{profile?.email}</span>
        <span className="ml-2 text-xs text-slate-400">(no modificable)</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Nombre" value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} />
        <Field label="Apellidos" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} />
      </div>
      <Field label="Telefono" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
      <Field label="Direccion" value={form.address_line1} onChange={(v) => setForm({ ...form, address_line1: v })} />
      <div className="grid grid-cols-3 gap-4">
        <Field label="Ciudad" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
        <Field label="CP" value={form.postal_code} onChange={(v) => setForm({ ...form, postal_code: v })} />
        <Field label="Pais" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
      </div>
      <div className="border-t border-slate-100 pt-5">
        <Field label="Empresa" value={form.company_name} onChange={(v) => setForm({ ...form, company_name: v })} />
        <Field label="NIF / VAT" value={form.vat_number} onChange={(v) => setForm({ ...form, vat_number: v })} />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-gradient-to-r from-cyan-500 via-cyan-400 to-teal-400 px-6 py-2.5 text-sm font-semibold uppercase tracking-wider text-white shadow-[0_0_20px_-4px_rgba(6,182,212,0.5)] hover:from-cyan-400 hover:to-cyan-400 disabled:opacity-60"
      >
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-600">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
      />
    </div>
  );
}
