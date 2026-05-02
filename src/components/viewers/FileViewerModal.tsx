"use client";

// ============================================================
// FileViewerModal
// ------------------------------------------------------------
// Modal de pantalla casi-completa que enruta al visor adecuado
// según extensión del fichero. Pide /api/storage/download-url
// para los visores que necesitan bytes (PDF, 3D, IFC). El visor
// APS no necesita el download URL (sube el fichero al bucket OSS
// de Autodesk a través de su propio endpoint).
// ============================================================

import { useEffect, useState } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { detectViewer, type ViewerKind } from "./utils";
import PdfViewer from "./PdfViewer";
import ThreeDViewer from "./ThreeDViewer";
import IfcViewer from "./IfcViewer";
import ApsViewer from "./ApsViewer";

export type FileViewerTarget = {
  id: string;
  filename: string;
};

export default function FileViewerModal({
  file,
  onClose,
}: {
  file: FileViewerTarget;
  onClose: () => void;
}) {
  const kind: ViewerKind = detectViewer(file.filename);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Esc para cerrar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Pedimos URL firmada para visores que descargan bytes en cliente.
  useEffect(() => {
    if (kind !== "pdf" && kind !== "three" && kind !== "ifc") return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/storage/download-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_id: file.id }),
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error || `download-url ${r.status}`);
        }
        const { url } = await r.json();
        if (!cancelled) setUrl(url);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Error obteniendo URL");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file.id, kind]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-stretch bg-black/80 p-2 sm:p-6"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl bg-slate-900 shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-700 bg-slate-950 px-4 py-2">
          <div className="min-w-0 truncate">
            <p className="truncate text-sm font-semibold text-slate-100">{file.filename}</p>
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
              {viewerLabel(kind)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="relative flex-1 overflow-hidden">
          {renderViewer(kind, file, url, error)}
        </div>
      </div>
    </div>
  );
}

function viewerLabel(kind: ViewerKind): string {
  switch (kind) {
    case "pdf":
      return "PDF Viewer";
    case "three":
      return "3D Viewer · Three.js";
    case "ifc":
      return "IFC Viewer · web-ifc";
    case "aps":
      return "Autodesk Platform Services";
    default:
      return "No soportado";
  }
}

function renderViewer(
  kind: ViewerKind,
  file: FileViewerTarget,
  url: string | null,
  error: string | null
) {
  if (kind === "unsupported") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center text-sm text-slate-400">
        <AlertTriangle className="h-8 w-8 text-amber-400" />
        <p>Este formato aún no tiene visor integrado.</p>
        <p className="text-xs text-slate-500">Descárgalo para abrirlo localmente.</p>
      </div>
    );
  }
  if (kind === "aps") {
    return <ApsViewer fileId={file.id} />;
  }
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center text-sm text-red-300">
        <AlertTriangle className="h-8 w-8 text-red-400" />
        <p>{error}</p>
      </div>
    );
  }
  if (!url) {
    return (
      <div className="flex h-full items-center justify-center text-slate-300">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Solicitando URL temporal…
      </div>
    );
  }
  if (kind === "pdf") return <PdfViewer url={url} filename={file.filename} />;
  if (kind === "three") return <ThreeDViewer url={url} filename={file.filename} />;
  if (kind === "ifc") return <IfcViewer url={url} filename={file.filename} />;
  return null;
}
