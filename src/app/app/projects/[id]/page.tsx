import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProjectDetail from "@/components/app/ProjectDetail";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();
  if (!project) notFound();

  const { data: files } = await supabase
    .from("files")
    .select("*")
    .eq("project_id", id)
    .order("uploaded_at", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/app/projects"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <ArrowLeft className="h-3 w-3" />
        Volver a proyectos
      </Link>
      <ProjectDetail project={project} initialFiles={files || []} />
    </div>
  );
}
