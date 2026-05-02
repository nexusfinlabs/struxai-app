"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Trash2, Cloud, HardDrive, Database, Eye } from "lucide-react";
import { humanSize } from "@/lib/storage/constants";
import { isViewable } from "@/components/viewers/utils";
import FileViewerModal, { type FileViewerTarget } from "@/components/viewers/FileViewerModal";

const PROVIDER_ICON: Record<string, any> = {
  supabase: Database,
  r2: Cloud,
  struxai_cloud: HardDrive,
};

export default function ProjectFilesTable({
  files,
  onRemoved,
}: {
  files: Array<{
    id: string;
    filename: string;
    size_bytes: number;
    external_storage_provider: string | null;
    uploaded_at: string;
    status: string;
  }>;
  onRemoved: (id: string) => void;
}) {
  const [viewing, setViewing] = useState<FileViewerTarget | null>(null);

  if (files.length === 0) {
    return (
      <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        Sin archivos en esta categoría todavía.
      </p>
    );
  }

  async function remove(id: string) {
    if (!confirm("¿Borrar este archivo?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("files").delete().eq("id", id);
    if (error) {
      toast.error("Error: " + error.message);
      return;
    }
    onRemoved(id);
    toast.success("Archivo borrado");
  }

  return (
    <>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Archivo</th>
              <th className="px-4 py-3">Tamaño</th>
              <th className="px-4 py-3">Storage</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {files.map((f) => {
              const Icon = PROVIDER_ICON[f.external_storage_provider || "supabase"] || Database;
              const canView = isViewable(f.filename);
              return (
                <tr key={f.id} className="text-slate-700 dark:text-slate-300">
                  <td className="px-4 py-3">
                    <p className="truncate font-medium">{f.filename}</p>
                    <p className="text-[10px] text-slate-400">
                      Subido {new Date(f.uploaded_at).toLocaleString("es-ES")}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs">{humanSize(f.size_bytes)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <Icon className="h-3 w-3" />
                      {f.external_storage_provider || "supabase"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{f.status}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      {canView && (
                        <button
                          type="button"
                          onClick={() => setViewing({ id: f.id, filename: f.filename })}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-cyan-50 hover:text-cyan-600 dark:hover:bg-cyan-950 dark:hover:text-cyan-300"
                          aria-label="Ver"
                          title="Ver archivo"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(f.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                        aria-label="Borrar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {viewing && <FileViewerModal file={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
