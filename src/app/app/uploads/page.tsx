"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { createClient } from "@/lib/supabase/client";

type Kind = "cad" | "rvt";

const ACCEPT_CAD: Record<string, string[]> = {
  "application/acad": [".dwg"],
  "image/vnd.dwg": [".dwg"],
  "application/dxf": [".dxf"],
  "image/vnd.dxf": [".dxf"],
};

const ACCEPT_RVT: Record<string, string[]> = {
  "application/octet-stream": [".rvt", ".rfa", ".rte"],
};

const EXT_CAD = [".dwg", ".dxf"];
const EXT_RVT = [".rvt", ".rfa", ".rte"];

const STORAGE_BUCKETS: Record<Kind, string> = {
  cad: "cad-uploads",
  rvt: "rvt-uploads",
};

type Item = {
  id: string;
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  message?: string;
};

function humanSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + " MB";
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB";
}

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function DropZone({
  kind,
  onAdd,
}: {
  kind: Kind;
  onAdd: (files: File[]) => void;
}) {
  const accept = kind === "cad" ? ACCEPT_CAD : ACCEPT_RVT;
  const exts = kind === "cad" ? EXT_CAD : EXT_RVT;
  const title =
    kind === "cad" ? "Archivos CAD (.dwg, .dxf)" : "Archivos Revit (.rvt, .rfa, .rte)";

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      const valid = accepted.filter((f) => exts.includes(extOf(f.name)));
      if (valid.length > 0) onAdd(valid);
      if (rejections.length > 0 || valid.length !== accepted.length) {
        console.warn("Algunos archivos rechazados:", rejections);
      }
    },
    [onAdd, exts]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept,
      multiple: true,
      noClick: false,
      noKeyboard: false,
      validator: (file) => {
        if (!exts.includes(extOf(file.name))) {
          return {
            code: "extension-not-allowed",
            message: `Solo se aceptan ${exts.join(", ")}`,
          };
        }
        return null;
      },
    });

  return (
    <div
      {...getRootProps()}
      className={
        "rounded-2xl border-2 border-dashed p-10 text-center transition cursor-pointer " +
        (isDragActive && !isDragReject
          ? "border-cyan-500 bg-cyan-50"
          : isDragReject
          ? "border-red-400 bg-red-50"
          : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50")
      }
    >
      <input {...getInputProps()} />
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-2 text-xs text-slate-500">
        {isDragActive
          ? isDragReject
            ? "Tipo de archivo no admitido"
            : "Suelta para añadir"
          : "Arrastra los archivos aquí o haz click para seleccionar"}
      </p>
      <p className="mt-3 text-[10px] uppercase tracking-widest text-slate-400">
        Extensiones permitidas: {exts.join(" · ")}
      </p>
    </div>
  );
}

function FileList({
  items,
  onRemove,
}: {
  items: Item[];
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
      {items.map((it) => (
        <li
          key={it.id}
          className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-slate-800">{it.file.name}</p>
            <p className="text-xs text-slate-500">
              {humanSize(it.file.size)} · {extOf(it.file.name)}
              {it.message ? " · " + it.message : ""}
            </p>
          </div>
          <span
            className={
              "rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest " +
              (it.status === "done"
                ? "bg-emerald-100 text-emerald-700"
                : it.status === "uploading"
                ? "bg-cyan-100 text-cyan-700"
                : it.status === "error"
                ? "bg-red-100 text-red-700"
                : "bg-slate-100 text-slate-600")
            }
          >
            {it.status}
          </span>
          {it.status === "pending" && (
            <button
              type="button"
              onClick={() => onRemove(it.id)}
              className="text-xs text-slate-400 hover:text-red-500"
            >
              quitar
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function UploadsPage() {
  const [cadItems, setCadItems] = useState<Item[]>([]);
  const [rvtItems, setRvtItems] = useState<Item[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const addCad = useCallback((files: File[]) => {
    setCadItems((prev) => [
      ...prev,
      ...files.map((f) => ({
        id: crypto.randomUUID(),
        file: f,
        status: "pending" as const,
      })),
    ]);
  }, []);

  const addRvt = useCallback((files: File[]) => {
    setRvtItems((prev) => [
      ...prev,
      ...files.map((f) => ({
        id: crypto.randomUUID(),
        file: f,
        status: "pending" as const,
      })),
    ]);
  }, []);

  const removeItem = useCallback((kind: Kind, id: string) => {
    if (kind === "cad") setCadItems((prev) => prev.filter((x) => x.id !== id));
    else setRvtItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const updateItem = useCallback(
    (kind: Kind, id: string, patch: Partial<Item>) => {
      if (kind === "cad") {
        setCadItems((prev) =>
          prev.map((x) => (x.id === id ? { ...x, ...patch } : x))
        );
      } else {
        setRvtItems((prev) =>
          prev.map((x) => (x.id === id ? { ...x, ...patch } : x))
        );
      }
    },
    []
  );

  const uploadAll = useCallback(async () => {
    setGlobalError(null);
    const supabase = createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      setGlobalError("Sesión no válida. Vuelve a iniciar sesión.");
      return;
    }

    setUploading(true);

    const all: Array<{ kind: Kind; item: Item }> = [
      ...cadItems.filter((i) => i.status === "pending").map((item) => ({ kind: "cad" as Kind, item })),
      ...rvtItems.filter((i) => i.status === "pending").map((item) => ({ kind: "rvt" as Kind, item })),
    ];

    for (const { kind, item } of all) {
      updateItem(kind, item.id, { status: "uploading", message: undefined });
      const bucket = STORAGE_BUCKETS[kind];
      const path = `${user.id}/${Date.now()}-${item.file.name}`;
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, item.file, {
          cacheControl: "3600",
          upsert: false,
          contentType: item.file.type || "application/octet-stream",
        });
      if (upErr) {
        updateItem(kind, item.id, {
          status: "error",
          message: upErr.message.includes("Bucket not found")
            ? `Falta el bucket "${bucket}" en Supabase Storage`
            : upErr.message,
        });
        continue;
      }

      const { error: insErr } = await supabase.from("files").insert({
        user_id: user.id,
        type: kind,
        filename: item.file.name,
        storage_path: `${bucket}/${path}`,
        size_bytes: item.file.size,
        mime_type: item.file.type || null,
        status: "uploaded",
      });
      if (insErr) {
        updateItem(kind, item.id, {
          status: "error",
          message: "Subido a Storage pero falló insert en BD: " + insErr.message,
        });
        continue;
      }

      updateItem(kind, item.id, { status: "done", message: "Subido OK" });
    }

    setUploading(false);
  }, [cadItems, rvtItems, updateItem]);

  const pendingCount =
    cadItems.filter((i) => i.status === "pending").length +
    rvtItems.filter((i) => i.status === "pending").length;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900">Subir archivos</h1>
      <p className="mt-1 text-sm text-slate-500">
        Arrastra y suelta tus modelos CAD o Revit, o haz click en cada zona para
        seleccionarlos.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <DropZone kind="cad" onAdd={addCad} />
        <DropZone kind="rvt" onAdd={addRvt} />
      </div>

      <FileList items={cadItems} onRemove={(id) => removeItem("cad", id)} />
      <FileList items={rvtItems} onRemove={(id) => removeItem("rvt", id)} />

      {globalError && (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {globalError}
        </p>
      )}

      {(cadItems.length > 0 || rvtItems.length > 0) && (
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setCadItems([]);
              setRvtItems([]);
              setGlobalError(null);
            }}
            disabled={uploading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={uploadAll}
            disabled={uploading || pendingCount === 0}
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
          >
            {uploading
              ? "Subiendo..."
              : pendingCount > 0
              ? `Subir ${pendingCount} archivo${pendingCount === 1 ? "" : "s"}`
              : "Sin archivos pendientes"}
          </button>
        </div>
      )}
    </div>
  );
}
