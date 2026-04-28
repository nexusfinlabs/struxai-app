"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { toast } from "sonner";
import { extOf, humanSize, STRUXAI_CLOUD_MAX_BYTES } from "@/lib/storage/constants";
import { Cloud, HardDrive, Database } from "lucide-react";

type Item = {
  id: string;
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  message?: string;
  progress?: number;
  provider?: string;
};

const PROVIDER_ICON: Record<string, any> = {
  supabase: Database,
  r2: Cloud,
  struxai_cloud: HardDrive,
};

const PROVIDER_LABEL: Record<string, string> = {
  supabase: "Supabase",
  r2: "Cloudflare R2",
  struxai_cloud: "STRUXAI Cloud",
};

export default function ProjectUploader({
  projectId,
  category,
  accept,
  extensions,
  title,
  subtitle,
  onUploaded,
}: {
  projectId: string;
  category: "cad" | "bim" | "memoria_in" | "memoria_out" | "memoria_firmada" | "otro";
  accept: Record<string, string[]>;
  extensions: string[];
  title: string;
  subtitle: string;
  onUploaded: (file: any) => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      const valid = accepted.filter((f) => extensions.includes(extOf(f.name)));
      const tooBig = valid.filter((f) => f.size > STRUXAI_CLOUD_MAX_BYTES);
      if (tooBig.length > 0) {
        toast.error(`Algunos archivos superan 10 GB y no se aceptan: ${tooBig.map((f) => f.name).join(", ")}`);
      }
      const okFiles = valid.filter((f) => f.size <= STRUXAI_CLOUD_MAX_BYTES);
      if (okFiles.length > 0) {
        setItems((prev) => [
          ...prev,
          ...okFiles.map((f) => ({ id: crypto.randomUUID(), file: f, status: "pending" as const })),
        ]);
      }
      if (rejections.length > 0) {
        toast.error(`Algunos archivos no son del formato esperado.`);
      }
    },
    [extensions]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    multiple: true,
    validator: (file) => {
      if (!extensions.includes(extOf(file.name))) {
        return { code: "extension-not-allowed", message: `Solo: ${extensions.join(", ")}` };
      }
      return null;
    },
  });

  async function uploadOne(item: Item) {
    update(item.id, { status: "uploading", message: "Solicitando URL...", progress: 0 });

    // 1. Pedir tier + URL
    const r1 = await fetch("/api/storage/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        filename: item.file.name,
        size_bytes: item.file.size,
        category,
        content_type: item.file.type || undefined,
      }),
    });
    if (!r1.ok) {
      const err = await r1.json().catch(() => ({}));
      update(item.id, { status: "error", message: err.error || "Error solicitando URL" });
      return;
    }
    const sign = await r1.json();
    update(item.id, {
      provider: sign.provider,
      message: `Subiendo a ${PROVIDER_LABEL[sign.provider]}...`,
    });

    // 2. Subir según provider
    try {
      if (sign.upload.kind === "supabase") {
        const putRes = await fetch(sign.upload.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": item.file.type || "application/octet-stream" },
          body: item.file,
        });
        if (!putRes.ok) throw new Error("Supabase PUT falló: " + putRes.status);
      } else if (sign.upload.kind === "r2") {
        const putRes = await fetch(sign.upload.url, {
          method: "PUT",
          headers: sign.upload.headers || {},
          body: item.file,
        });
        if (!putRes.ok) throw new Error("R2 PUT falló: " + putRes.status);
      } else if (sign.upload.kind === "struxai_cloud") {
        const putRes = await fetch(sign.upload.url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sign.upload.token}`,
            "Content-Type": item.file.type || "application/octet-stream",
          },
          body: item.file,
        });
        if (!putRes.ok) throw new Error("STRUXAI Cloud upload falló: " + putRes.status);
      }
    } catch (e: any) {
      update(item.id, { status: "error", message: e.message || "Error subiendo" });
      return;
    }

    // 3. Confirmar inserción en BD
    const r2 = await fetch("/api/storage/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        file_id: sign.file_id,
        filename: item.file.name,
        size_bytes: item.file.size,
        category,
        provider: sign.provider,
        mime_type: item.file.type || null,
        external_url: null,
        storage_path:
          sign.upload.kind === "supabase"
            ? `${sign.upload.bucket}/${sign.upload.path}`
            : sign.upload.kind === "r2"
            ? `r2://${sign.upload.key}`
            : `struxai_cloud://${sign.file_id}`,
      }),
    });
    if (!r2.ok) {
      const err = await r2.json().catch(() => ({}));
      update(item.id, { status: "error", message: "Subido pero confirm falló: " + err.error });
      return;
    }
    const confirmed = await r2.json();
    update(item.id, { status: "done", message: "Subido OK" });
    onUploaded(confirmed.file);
  }

  function update(id: string, patch: Partial<Item>) {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  async function uploadAll() {
    setBusy(true);
    const pending = items.filter((i) => i.status === "pending");
    for (const it of pending) {
      await uploadOne(it);
    }
    setBusy(false);
  }

  const pendingCount = items.filter((i) => i.status === "pending").length;

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={
          "rounded-2xl border-2 border-dashed p-10 text-center transition cursor-pointer " +
          (isDragActive && !isDragReject
            ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950"
            : isDragReject
            ? "border-red-400 bg-red-50 dark:bg-red-950"
            : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800")
        }
      >
        <input {...getInputProps()} />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {isDragActive
            ? isDragReject
              ? "Tipo no admitido"
              : "Suelta para añadir"
            : "Arrastra los archivos aquí o haz click para seleccionar"}
        </p>
        <p className="mt-3 text-[10px] uppercase tracking-widest text-slate-400">
          {subtitle} · Hasta 10 GB por archivo
        </p>
      </div>

      {items.length > 0 && (
        <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-900">
          {items.map((it) => {
            const Icon = it.provider ? PROVIDER_ICON[it.provider] : null;
            return (
              <li key={it.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800 dark:text-slate-200">{it.file.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {humanSize(it.file.size)} · {extOf(it.file.name)}
                    {it.message ? " · " + it.message : ""}
                  </p>
                </div>
                {Icon && (
                  <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <Icon className="h-3 w-3" />
                    {PROVIDER_LABEL[it.provider!]}
                  </span>
                )}
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest " +
                    (it.status === "done"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : it.status === "uploading"
                      ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"
                      : it.status === "error"
                      ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")
                  }
                >
                  {it.status}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {items.length > 0 && (
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setItems([])}
            disabled={busy}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={uploadAll}
            disabled={busy || pendingCount === 0}
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Subiendo..." : pendingCount > 0 ? `Subir ${pendingCount}` : "Sin pendientes"}
          </button>
        </div>
      )}
    </div>
  );
}
