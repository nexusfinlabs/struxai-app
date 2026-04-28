"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Building2, Building, Factory, TrainTrack, Wrench, Box } from "lucide-react";
import NewProjectModal from "./NewProjectModal";
import { humanSize } from "@/lib/storage/constants";

type Project = {
  id: string;
  name: string;
  description: string | null;
  project_type: string | null;
  material_main: string | null;
  jurisdiction: string | null;
  status: string | null;
  size_bytes: number | null;
  cover_color: string | null;
  updated_at: string;
};

const TYPE_ICON: Record<string, any> = {
  residencial: Building2,
  comercial: Building,
  industrial: Factory,
  infraestructura: TrainTrack,
  rehabilitacion: Wrench,
  otro: Box,
};

const TYPE_LABEL: Record<string, string> = {
  residencial: "Residencial",
  comercial: "Comercial",
  industrial: "Industrial",
  infraestructura: "Infraestructura",
  rehabilitacion: "Rehabilitación",
  otro: "Otro",
};

const MATERIAL_LABEL: Record<string, string> = {
  hormigon: "Hormigón",
  metalica: "Metálica",
  mixta: "Mixta",
  madera: "Madera",
  mamposteria: "Mampostería",
  otro: "Otro",
};

export default function ProjectsList({
  initialProjects,
  fileCounts,
}: {
  initialProjects: Project[];
  fileCounts: Record<string, number>;
}) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [showNew, setShowNew] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function deleteProject(id: string) {
    if (!confirm("¿Borrar este proyecto y todos sus archivos? Esta acción no se puede deshacer.")) return;
    const supabase = createClient();
    startTransition(async () => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) {
        toast.error("Error borrando proyecto: " + error.message);
        return;
      }
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success("Proyecto borrado");
      router.refresh();
    });
  }

  return (
    <>
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {projects.length} {projects.length === 1 ? "proyecto" : "proyectos"}
        </p>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nuevo proyecto
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="mt-8 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <Box className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Aún no tienes proyectos
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Crea uno para empezar a subir modelos CAD, BIM y memorias.
          </p>
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600"
          >
            <Plus className="h-4 w-4" />
            Crear primer proyecto
          </button>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const Icon = TYPE_ICON[p.project_type || "otro"] || Box;
            const fc = fileCounts[p.id] || 0;
            return (
              <li
                key={p.id}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
              >
                <Link href={`/app/projects/${p.id}`} className="block p-5">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: (p.cover_color || "#0ea5e9") + "22", color: p.cover_color || "#0ea5e9" }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {p.jurisdiction || "ES"}
                    </span>
                  </div>
                  <h3 className="mt-4 truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                    {p.name}
                  </h3>
                  {p.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                      {p.description}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest">
                    <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                      {TYPE_LABEL[p.project_type || "otro"]}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      {MATERIAL_LABEL[p.material_main || "otro"]}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <span>{fc} {fc === 1 ? "archivo" : "archivos"}</span>
                    <span>{humanSize(p.size_bytes || 0)}</span>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => deleteProject(p.id)}
                  disabled={pending}
                  className="absolute right-2 top-2 hidden rounded-lg bg-white/90 p-1.5 text-slate-400 opacity-0 transition group-hover:flex group-hover:opacity-100 hover:text-red-500 dark:bg-slate-900/90"
                  aria-label="Borrar proyecto"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {showNew && (
        <NewProjectModal
          onClose={() => setShowNew(false)}
          onCreated={(p) => {
            setProjects((prev) => [p, ...prev]);
            setShowNew(false);
            router.push(`/app/projects/${p.id}`);
          }}
        />
      )}
    </>
  );
}
