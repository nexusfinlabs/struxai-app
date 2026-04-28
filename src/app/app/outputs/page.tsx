import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { FileText, FileCheck, Inbox, RotateCcw, ArrowRight } from "lucide-react";
import { humanSize } from "@/lib/storage/constants";

export const dynamic = "force-dynamic";

export default async function OutputsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: files } = await supabase
    .from("files")
    .select("id, filename, category, size_bytes, project_id, uploaded_at, projects(name)")
    .eq("user_id", user!.id)
    .in("category", ["memoria_in", "memoria_out", "memoria_firmada", "otro"])
    .order("uploaded_at", { ascending: false });

  const entrada = (files || []).filter((f: any) => f.category === "memoria_in");
  const salida = (files || []).filter((f: any) => f.category === "memoria_out");
  const otros = (files || []).filter(
    (f: any) => f.category === "memoria_firmada" || f.category === "otro"
  );

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Memorias y resultados</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Tus memorias agrupadas por estado: lo que entra, lo que calculamos y lo que firmas.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <CategoryCard
          icon={Inbox}
          title="Memorias de Entrada"
          description="Datos brutos: hipótesis, geometría, cargas y predimensionado."
          color="cyan"
          files={entrada}
          actionLabel="Recalcular"
          actionIcon={RotateCcw}
        />
        <CategoryCard
          icon={FileText}
          title="Memorias de Salida"
          description="Outputs calculados: memoria PDF, planos DXF, modelos IFC."
          color="emerald"
          files={salida}
        />
        <CategoryCard
          icon={FileCheck}
          title="Otros / Firmadas"
          description="Memorias selladas, revisiones y exports parciales."
          color="amber"
          files={otros}
        />
      </div>

      <p className="mt-8 text-xs text-slate-500 dark:text-slate-400">
        Para subir memorias entra en cada{" "}
        <Link href="/app/projects" className="text-cyan-600 hover:underline dark:text-cyan-400">
          proyecto
        </Link>{" "}
        y abre la pestaña <strong>Memorias</strong>.
      </p>
    </div>
  );
}

function CategoryCard({
  icon: Icon,
  title,
  description,
  color,
  files,
  actionLabel,
  actionIcon: ActionIcon,
}: {
  icon: any;
  title: string;
  description: string;
  color: "cyan" | "emerald" | "amber";
  files: Array<{ id: string; filename: string; size_bytes: number; project_id: string; projects?: any }>;
  actionLabel?: string;
  actionIcon?: any;
}) {
  const palette: Record<string, string> = {
    cyan: "from-cyan-500 to-blue-500 text-cyan-600 dark:text-cyan-300",
    emerald: "from-emerald-500 to-teal-500 text-emerald-600 dark:text-emerald-300",
    amber: "from-amber-500 to-orange-500 text-amber-600 dark:text-amber-300",
  };
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${palette[color]} opacity-10`} />
      <div className="flex items-start gap-3">
        <Icon className={`h-6 w-6 ${palette[color]}`} />
        <div className="flex-1">
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-slate-50">{files.length}</p>
      <ul className="mt-4 max-h-48 space-y-2 overflow-auto text-xs">
        {files.length === 0 ? (
          <li className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-slate-400 dark:border-slate-700">
            Sin documentos.
          </li>
        ) : (
          files.slice(0, 8).map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
              <Link href={`/app/projects/${f.project_id}`} className="min-w-0 flex-1 hover:text-cyan-600 dark:hover:text-cyan-400">
                <p className="truncate font-medium text-slate-700 dark:text-slate-200">{f.filename}</p>
                <p className="truncate text-[10px] text-slate-500">
                  {f.projects?.name || "Proyecto"} · {humanSize(f.size_bytes || 0)}
                </p>
              </Link>
              <ArrowRight className="h-3 w-3 text-slate-400" />
            </li>
          ))
        )}
      </ul>
      {actionLabel && ActionIcon && files.length > 0 && (
        <button
          type="button"
          className={`mt-4 inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${palette[color].replace("text-", "")} px-3 py-1 text-xs font-semibold text-white opacity-80 hover:opacity-100`}
          disabled
          title="Próximamente"
        >
          <ActionIcon className="h-3 w-3" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
