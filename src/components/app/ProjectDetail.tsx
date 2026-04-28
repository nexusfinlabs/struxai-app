"use client";

import { useState } from "react";
import { FileBox, Layers, FileText, Settings as SettingsIcon } from "lucide-react";
import ProjectUploader from "./ProjectUploader";
import ProjectFilesTable from "./ProjectFilesTable";
import { CAD_ACCEPT, CAD_EXTENSIONS, BIM_ACCEPT, BIM_EXTENSIONS, MEMORIA_ACCEPT, MEMORIA_EXTENSIONS, humanSize } from "@/lib/storage/constants";

type Project = {
  id: string;
  name: string;
  description: string | null;
  project_type: string | null;
  material_main: string | null;
  jurisdiction: string | null;
  size_bytes: number | null;
  cover_color: string | null;
};

type FileRow = {
  id: string;
  filename: string;
  size_bytes: number;
  category: string | null;
  type: string;
  external_storage_provider: string | null;
  uploaded_at: string;
  status: string;
};

type Tab = "cad" | "bim" | "memorias" | "ajustes";

export default function ProjectDetail({
  project,
  initialFiles,
}: {
  project: Project;
  initialFiles: FileRow[];
}) {
  const [tab, setTab] = useState<Tab>("cad");
  const [files, setFiles] = useState<FileRow[]>(initialFiles);

  const cadFiles = files.filter((f) => f.category === "cad");
  const bimFiles = files.filter((f) => f.category === "bim");
  const memoriaFiles = files.filter((f) =>
    ["memoria_in", "memoria_out", "memoria_firmada", "otro"].includes(f.category || "")
  );

  const handleUploaded = (f: FileRow) => setFiles((prev) => [f, ...prev]);
  const handleRemoved = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  return (
    <>
      <div className="mt-3 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
            style={{
              backgroundColor: (project.cover_color || "#0ea5e9") + "22",
              color: project.cover_color || "#0ea5e9",
            }}
          >
            <FileBox className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{project.name}</h1>
            {project.description && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{project.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {project.project_type || "otro"}
              </span>
              <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                {project.material_main || "—"}
              </span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {project.jurisdiction || "ES"}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right text-xs text-slate-500 dark:text-slate-400">
          <p>{files.length} {files.length === 1 ? "archivo" : "archivos"}</p>
          <p className="mt-0.5">{humanSize(project.size_bytes || 0)}</p>
        </div>
      </div>

      <div className="mt-6 border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          <TabBtn active={tab === "cad"} onClick={() => setTab("cad")} icon={Layers}>
            CAD ({cadFiles.length})
          </TabBtn>
          <TabBtn active={tab === "bim"} onClick={() => setTab("bim")} icon={FileBox}>
            BIM / Revit ({bimFiles.length})
          </TabBtn>
          <TabBtn active={tab === "memorias"} onClick={() => setTab("memorias")} icon={FileText}>
            Memorias ({memoriaFiles.length})
          </TabBtn>
          <TabBtn active={tab === "ajustes"} onClick={() => setTab("ajustes")} icon={SettingsIcon}>
            Ajustes
          </TabBtn>
        </nav>
      </div>

      <div className="mt-6">
        {tab === "cad" && (
          <>
            <ProjectUploader
              projectId={project.id}
              category="cad"
              accept={CAD_ACCEPT}
              extensions={[...CAD_EXTENSIONS]}
              title="Archivos CAD"
              subtitle={`Formatos: ${CAD_EXTENSIONS.join(" · ")}`}
              onUploaded={handleUploaded}
            />
            <ProjectFilesTable files={cadFiles} onRemoved={handleRemoved} />
          </>
        )}
        {tab === "bim" && (
          <>
            <ProjectUploader
              projectId={project.id}
              category="bim"
              accept={BIM_ACCEPT}
              extensions={[...BIM_EXTENSIONS]}
              title="Archivos BIM / Revit"
              subtitle={`Formatos: ${BIM_EXTENSIONS.join(" · ")}`}
              onUploaded={handleUploaded}
            />
            <ProjectFilesTable files={bimFiles} onRemoved={handleRemoved} />
          </>
        )}
        {tab === "memorias" && (
          <MemoriasTab
            projectId={project.id}
            files={memoriaFiles}
            onUploaded={handleUploaded}
            onRemoved={handleRemoved}
          />
        )}
        {tab === "ajustes" && <ProjectAjustes project={project} />}
      </div>
    </>
  );
}

function TabBtn({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-3 text-sm transition " +
        (active
          ? "border-cyan-500 font-semibold text-cyan-700 dark:text-cyan-300"
          : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200")
      }
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function MemoriasTab({
  projectId,
  files,
  onUploaded,
  onRemoved,
}: {
  projectId: string;
  files: FileRow[];
  onUploaded: (f: any) => void;
  onRemoved: (id: string) => void;
}) {
  const entrada = files.filter((f) => f.category === "memoria_in");
  const salida = files.filter((f) => f.category === "memoria_out");
  const otros = files.filter((f) => f.category === "memoria_firmada" || f.category === "otro");

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <MemoriaCard
          title="Entrada"
          description="Datos brutos: hipótesis, geometría, cargas. Botón Recalcular."
          color="cyan"
          count={entrada.length}
        />
        <MemoriaCard
          title="Salida"
          description="Outputs: memoria PDF, planos DXF, modelo IFC, FEM input."
          color="emerald"
          count={salida.length}
        />
        <MemoriaCard
          title="Firmadas / Otros"
          description="Memorias selladas, revisiones, exports parciales."
          color="amber"
          count={otros.length}
        />
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Subir memoria de entrada
          </h3>
          <ProjectUploader
            projectId={projectId}
            category="memoria_in"
            accept={MEMORIA_ACCEPT}
            extensions={[...MEMORIA_EXTENSIONS]}
            title="Memorias de entrada"
            subtitle="PDF, DOCX, ODT, XLSX, CSV, ZIP..."
            onUploaded={onUploaded}
          />
          <ProjectFilesTable files={entrada} onRemoved={onRemoved} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Subir memoria de salida
          </h3>
          <ProjectUploader
            projectId={projectId}
            category="memoria_out"
            accept={MEMORIA_ACCEPT}
            extensions={[...MEMORIA_EXTENSIONS]}
            title="Memorias de salida"
            subtitle="PDF, DOCX, ODT, XLSX, CSV, ZIP..."
            onUploaded={onUploaded}
          />
          <ProjectFilesTable files={salida} onRemoved={onRemoved} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Subir documentos firmados / otros
          </h3>
          <ProjectUploader
            projectId={projectId}
            category="memoria_firmada"
            accept={MEMORIA_ACCEPT}
            extensions={[...MEMORIA_EXTENSIONS]}
            title="Memorias firmadas"
            subtitle="PDF firmado digitalmente, anexos..."
            onUploaded={onUploaded}
          />
          <ProjectFilesTable files={otros} onRemoved={onRemoved} />
        </div>
      </div>
    </div>
  );
}

function MemoriaCard({
  title,
  description,
  color,
  count,
}: {
  title: string;
  description: string;
  color: "cyan" | "emerald" | "amber";
  count: number;
}) {
  const palette: Record<string, string> = {
    cyan: "from-cyan-500 to-blue-500",
    emerald: "from-emerald-500 to-teal-500",
    amber: "from-amber-500 to-orange-500",
  };
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900`}>
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${palette[color]} opacity-10`} />
      <p className="text-xs font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">{count}</p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}

function ProjectAjustes({ project }: { project: Project }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Ajustes del proyecto</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Los ajustes generales (normativas, motores, plugins) viven en{" "}
        <a href="/app/settings" className="text-cyan-600 hover:underline dark:text-cyan-400">/app/settings</a>.
        Aquí puedes sobreescribir para este proyecto en próximas versiones.
      </p>
      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-mono uppercase tracking-widest text-slate-500">ID</dt>
          <dd className="mt-1 font-mono text-xs text-slate-700 dark:text-slate-300">{project.id}</dd>
        </div>
        <div>
          <dt className="text-xs font-mono uppercase tracking-widest text-slate-500">Tipo</dt>
          <dd className="mt-1 text-slate-700 dark:text-slate-300">{project.project_type || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-mono uppercase tracking-widest text-slate-500">Material</dt>
          <dd className="mt-1 text-slate-700 dark:text-slate-300">{project.material_main || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-mono uppercase tracking-widest text-slate-500">Jurisdicción</dt>
          <dd className="mt-1 text-slate-700 dark:text-slate-300">{project.jurisdiction || "ES"}</dd>
        </div>
      </dl>
    </div>
  );
}
