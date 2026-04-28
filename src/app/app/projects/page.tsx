import { createClient } from "@/lib/supabase/server";
import ProjectsList from "@/components/app/ProjectsList";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, description, project_type, material_main, jurisdiction, status, size_bytes, cover_color, updated_at")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false });

  // Conteo de archivos por proyecto
  const ids = (projects || []).map((p) => p.id);
  let counts: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: filesAgg } = await supabase
      .from("files")
      .select("project_id")
      .in("project_id", ids);
    counts = (filesAgg || []).reduce((acc: Record<string, number>, row: any) => {
      acc[row.project_id] = (acc[row.project_id] || 0) + 1;
      return acc;
    }, {});
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Proyectos</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Crea proyectos para organizar tus modelos CAD, BIM y memorias.
          </p>
        </div>
      </div>

      <ProjectsList initialProjects={projects || []} fileCounts={counts} />
    </div>
  );
}
