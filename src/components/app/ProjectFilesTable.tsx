"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Trash2,
  Cloud,
  HardDrive,
  Database,
  Eye,
  Sparkles,
  Send,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCw,
  FileText,
} from "lucide-react";
import { humanSize } from "@/lib/storage/constants";
import { isViewable, isAiEditable } from "@/components/viewers/utils";
import FileViewerModal, { type FileViewerTarget } from "@/components/viewers/FileViewerModal";

const PROVIDER_ICON: Record<string, any> = {
  supabase: Database,
  r2: Cloud,
  struxai_cloud: HardDrive,
};

type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

type JobState = {
  id: string;
  status: JobStatus;
  prompt: string;
  resultOutputId: string | null;
  errorMessage: string | null;
  createdAt: string;
  finishedAt: string | null;
};

type FileRow = {
  id: string;
  filename: string;
  size_bytes: number;
  external_storage_provider: string | null;
  uploaded_at: string;
  status: string;
};

export default function ProjectFilesTable({
  files,
  onRemoved,
}: {
  files: FileRow[];
  onRemoved: (id: string) => void;
}) {
  const [viewing, setViewing] = useState<FileViewerTarget | null>(null);
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  // Último job conocido por file_id (cargado al montar + actualizado por Realtime)
  const [activeJobs, setActiveJobs] = useState<Record<string, JobState>>({});
  // Jobs ya completados que el usuario ha cerrado manualmente
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Set de IDs de archivos visibles, estable como dependencia
  const fileIds = useMemo(() => files.map((f) => f.id).sort().join(","), [files]);

  // Cargar jobs en vuelo + suscribirse a Realtime
  const lastNotifiedJobRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (files.length === 0) return;
    const ids = files.map((f) => f.id);
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      // 1. Snapshot inicial: el último job (cualquier estado) por file_id
      const { data: rows } = await supabase
        .from("ai_edit_jobs")
        .select(
          "id, status, prompt, result_output_id, error_message, created_at, finished_at, source_file_id"
        )
        .eq("user_id", user.id)
        .in("source_file_id", ids)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (rows) {
        const map: Record<string, JobState> = {};
        for (const r of rows as any[]) {
          if (!map[r.source_file_id]) {
            map[r.source_file_id] = rowToJobState(r);
          }
        }
        setActiveJobs(map);
      }

      // 2. Realtime: cualquier cambio en mis ai_edit_jobs
      channel = supabase
        .channel(`ai-edit-jobs-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "ai_edit_jobs",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const row: any = payload.new ?? payload.old;
            if (!row?.source_file_id) return;
            // Solo nos importan archivos visibles ahora mismo
            if (!ids.includes(row.source_file_id)) return;

            if (payload.eventType === "DELETE") {
              setActiveJobs((prev) => {
                const next = { ...prev };
                delete next[row.source_file_id];
                return next;
              });
              return;
            }

            const newState = rowToJobState(row);
            setActiveJobs((prev) => {
              const existing = prev[row.source_file_id];
              // Si ya teníamos uno más reciente, ignora
              if (existing && existing.createdAt > newState.createdAt) return prev;
              return { ...prev, [row.source_file_id]: newState };
            });

            // Notificación al usuario solo una vez por job al cerrarse
            if (
              (newState.status === "succeeded" || newState.status === "failed") &&
              !lastNotifiedJobRef.current.has(newState.id)
            ) {
              lastNotifiedJobRef.current.add(newState.id);
              const file = files.find((f) => f.id === row.source_file_id);
              if (newState.status === "succeeded") {
                toast.success("STRUXAI ha terminado", {
                  description: `Memoria lista para «${file?.filename ?? "archivo"}». Ábrela desde la columna STRUXAI.`,
                });
              } else {
                toast.error("STRUXAI no pudo procesar el archivo", {
                  description: newState.errorMessage ?? "Error desconocido.",
                });
              }
            }
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileIds]);

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

  async function submitPrompt(e: FormEvent, fileId: string, filename: string) {
    e.preventDefault();
    const raw = (prompts[fileId] || "").trim();
    if (!raw) {
      toast.error("Describe primero qué cambio quieres analizar.");
      return;
    }
    if (submitting[fileId]) return;
    setSubmitting((s) => ({ ...s, [fileId]: true }));

    const supabase = createClient();
    try {
      const { data, error } = await supabase.functions.invoke("enqueue-ai-edit", {
        body: { fileId, prompt: raw },
      });
      if (error) throw error;
      const jobId = (data as { jobId?: string } | null)?.jobId;
      toast.success("Petición enviada a STRUXAI", {
        description:
          "Generaremos una memoria técnica con el análisis del cambio. " +
          "El archivo original no se modifica.",
      });
      setPrompts((p) => ({ ...p, [fileId]: "" }));
      // Optimismo: pinta queued de inmediato (Realtime confirmará)
      if (jobId) {
        setActiveJobs((prev) => ({
          ...prev,
          [fileId]: {
            id: jobId,
            status: "queued",
            prompt: raw,
            resultOutputId: null,
            errorMessage: null,
            createdAt: new Date().toISOString(),
            finishedAt: null,
          },
        }));
      }
    } catch (err: any) {
      toast.error("No se pudo encolar la petición", {
        description: err?.message || "Inténtalo de nuevo en unos segundos.",
      });
    } finally {
      setSubmitting((s) => ({ ...s, [fileId]: false }));
    }
  }

  async function openOutput(outputId: string) {
    const supabase = createClient();
    const { data: row, error: rowErr } = await supabase
      .from("outputs")
      .select("storage_path, filename")
      .eq("id", outputId)
      .single();
    if (rowErr || !row?.storage_path) {
      toast.error("No se pudo localizar la memoria.", {
        description: rowErr?.message,
      });
      return;
    }
    const { data: signed, error: signErr } = await supabase.storage
      .from("outputs")
      .createSignedUrl(row.storage_path, 3600);
    if (signErr || !signed?.signedUrl) {
      toast.error("No se pudo abrir la memoria.", { description: signErr?.message });
      return;
    }
    window.open(signed.signedUrl, "_blank", "noopener,noreferrer");
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
              <th
                className="px-4 py-3"
                title="STRUXAI genera una memoria técnica con el análisis del cambio. El archivo CAD/BIM original no se modifica."
              >
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-cyan-500" />
                  STRUXAI
                </span>
              </th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {files.map((f) => {
              const Icon = PROVIDER_ICON[f.external_storage_provider || "supabase"] || Database;
              const canView = isViewable(f.filename);
              const canEdit = isAiEditable(f.filename);
              const job = activeJobs[f.id];
              const showJobPill =
                job &&
                !dismissed.has(job.id) &&
                (job.status === "queued" ||
                  job.status === "running" ||
                  job.status === "succeeded" ||
                  job.status === "failed");

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
                  <td className="px-4 py-3">
                    {!canEdit ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-slate-300 dark:text-slate-600"
                        title="Análisis por IA solo disponible en CAD/BIM (DWG, DXF, RVT, IFC, OBJ, STL, STEP…)"
                      >
                        —
                      </span>
                    ) : showJobPill ? (
                      <JobPill
                        job={job!}
                        onDismiss={() =>
                          setDismissed((s) => {
                            const next = new Set(s);
                            next.add(job!.id);
                            return next;
                          })
                        }
                        onView={() =>
                          job!.resultOutputId && openOutput(job!.resultOutputId)
                        }
                        onRetry={() => {
                          setPrompts((p) => ({ ...p, [f.id]: job!.prompt }));
                          setDismissed((s) => {
                            const next = new Set(s);
                            next.add(job!.id);
                            return next;
                          });
                        }}
                      />
                    ) : (
                      <form
                        onSubmit={(e) => submitPrompt(e, f.id, f.filename)}
                        className="group flex min-w-[240px] items-center gap-1 rounded-full border border-slate-200 bg-gradient-to-r from-cyan-50/40 via-white to-blue-50/40 px-2 py-1 transition focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-200 hover:border-cyan-300 dark:border-slate-700 dark:from-cyan-950/30 dark:via-slate-900 dark:to-blue-950/30 dark:focus-within:border-cyan-500 dark:focus-within:ring-cyan-900"
                      >
                        <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-cyan-500" />
                        <input
                          type="text"
                          value={prompts[f.id] || ""}
                          onChange={(e) =>
                            setPrompts((p) => ({ ...p, [f.id]: e.target.value }))
                          }
                          placeholder="Pide una memoria de cambios"
                          className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none dark:text-slate-200 dark:placeholder-slate-500"
                          aria-label={`Generar memoria de cambios para ${f.filename}`}
                          title="STRUXAI generará una memoria técnica explicando el cambio. El archivo original no se modifica."
                        />
                        <button
                          type="submit"
                          className="rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 p-1 text-white shadow-sm transition hover:from-cyan-400 hover:to-blue-400 disabled:opacity-40"
                          disabled={!(prompts[f.id] || "").trim() || !!submitting[f.id]}
                          aria-label="Enviar a STRUXAI"
                          title="Enviar a STRUXAI"
                        >
                          {submitting[f.id] ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                        </button>
                      </form>
                    )}
                  </td>
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

// -------------------------------------------------------------
// Subcomponentes
// -------------------------------------------------------------

function rowToJobState(r: any): JobState {
  return {
    id: r.id,
    status: r.status,
    prompt: r.prompt ?? "",
    resultOutputId: r.result_output_id ?? null,
    errorMessage: r.error_message ?? null,
    createdAt: r.created_at,
    finishedAt: r.finished_at ?? null,
  };
}

function JobPill({
  job,
  onDismiss,
  onView,
  onRetry,
}: {
  job: JobState;
  onDismiss: () => void;
  onView: () => void;
  onRetry: () => void;
}) {
  if (job.status === "queued" || job.status === "running") {
    const label = job.status === "queued" ? "En cola" : "Procesando";
    const Icon = job.status === "queued" ? Clock : Loader2;
    return (
      <span
        className="inline-flex min-w-[240px] items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-medium text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300"
        title={`STRUXAI: ${label.toLowerCase()} «${job.prompt}»`}
      >
        <Icon className={"h-3.5 w-3.5 " + (job.status === "running" ? "animate-spin" : "")} />
        {label}…
        <span className="ml-auto truncate text-[10px] text-cyan-500/80">
          {job.prompt.length > 28 ? job.prompt.slice(0, 28) + "…" : job.prompt}
        </span>
      </span>
    );
  }

  if (job.status === "succeeded") {
    return (
      <span className="inline-flex min-w-[240px] items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Memoria lista
        <button
          type="button"
          onClick={onView}
          disabled={!job.resultOutputId}
          className="ml-auto inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 shadow-sm transition hover:bg-white disabled:opacity-40 dark:bg-emerald-900/50 dark:text-emerald-200 dark:hover:bg-emerald-900"
          title="Abrir memoria"
        >
          <FileText className="h-3 w-3" />
          Ver
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full p-0.5 text-emerald-500/70 hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900"
          title="Cerrar"
          aria-label="Cerrar notificación"
        >
          <X className="h-3 w-3" />
        </button>
      </span>
    );
  }

  // failed | cancelled
  return (
    <span className="inline-flex min-w-[240px] items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-medium text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
      <AlertCircle className="h-3.5 w-3.5" />
      <span
        className="truncate"
        title={job.errorMessage ?? "Sin detalle"}
      >
        Error
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="ml-auto inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-red-700 shadow-sm transition hover:bg-white dark:bg-red-900/50 dark:text-red-200 dark:hover:bg-red-900"
        title="Reintentar con el mismo prompt"
      >
        <RotateCw className="h-3 w-3" />
        Reintentar
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-full p-0.5 text-red-500/70 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900"
        title="Cerrar"
        aria-label="Cerrar notificación"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
