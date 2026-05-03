"use client";

// ============================================================
// ApsViewer
// ------------------------------------------------------------
// Carga el Autodesk Viewer (SDK oficial vía CDN), pide al backend
// la traducción del file_id si todavía no la tiene, hace polling
// del manifest hasta que esté listo, y abre el modelo por URN.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { loadScriptOnce, loadStylesheetOnce } from "./utils";
import { Loader2 } from "lucide-react";

const APS_VIEWER_VERSION = "7.*";
const VIEWER_JS = `https://developer.api.autodesk.com/modelderivative/v2/viewers/${APS_VIEWER_VERSION}/viewer3D.min.js`;
const VIEWER_CSS = `https://developer.api.autodesk.com/modelderivative/v2/viewers/${APS_VIEWER_VERSION}/style.min.css`;

declare global {
  interface Window {
    Autodesk?: any;
  }
}

export default function ApsViewer({ fileId }: { fileId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Iniciando…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let viewer: any = null;
    let pollTimer: any = null;

    (async () => {
      try {
        loadStylesheetOnce(VIEWER_CSS);
        await loadScriptOnce(VIEWER_JS, { checkGlobal: "Autodesk" });

        setStatus("Subiendo a Autodesk…");
        const r = await fetch("/api/aps/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_id: fileId }),
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error || `translate ${r.status}`);
        }
        const { urn } = (await r.json()) as { urn: string };
        if (disposed) return;

        // Polling del manifest hasta success / failed.
        const finalStatus = await pollManifest(urn, (s, p) => {
          if (!disposed) setStatus(`Procesando ${p || ""} (${s})`);
        });
        if (disposed) return;
        if (finalStatus !== "success") {
          throw new Error("Traducción APS terminó en estado: " + finalStatus);
        }

        // Inicialización del viewer.
        setStatus("Cargando visor…");
        const tokenRes = await fetch("/api/aps/token");
        if (!tokenRes.ok) throw new Error("No se pudo obtener token APS");
        const { access_token, expires_in } = await tokenRes.json();

        const Autodesk = window.Autodesk;
        await new Promise<void>((resolve) => {
          Autodesk.Viewing.Initializer(
            {
              env: "AutodeskProduction2",
              api: "streamingV2",
              getAccessToken: (cb: (t: string, e: number) => void) => cb(access_token, expires_in),
            },
            () => resolve()
          );
        });

        if (disposed || !containerRef.current) return;
        viewer = new Autodesk.Viewing.GuiViewer3D(containerRef.current);
        viewer.start();

        await new Promise<void>((resolve, reject) => {
          Autodesk.Viewing.Document.load(
            "urn:" + urn,
            (doc: any) => {
              const defaultModel = doc.getRoot().getDefaultGeometry();
              viewer.loadDocumentNode(doc, defaultModel).then(() => resolve(), reject);
            },
            (errCode: any) => reject(new Error("Document.load error " + errCode))
          );
        });

        if (!disposed) setStatus("");
      } catch (e: any) {
        console.error(e);
        if (!disposed) setError(e?.message || "Error en visor APS");
      }
    })();

    return () => {
      disposed = true;
      if (pollTimer) clearTimeout(pollTimer);
      if (viewer) {
        try {
          viewer.finish();
        } catch {}
      }
    };
  }, [fileId]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" style={{ position: "relative" }} />
      {status && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 text-slate-300">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {status}
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/90 p-6 text-center text-sm text-red-300">
          <p className="font-semibold">No se pudo abrir en Autodesk Viewer.</p>
          <p className="font-mono text-xs">{error}</p>
          <p className="mt-3 text-xs text-slate-400">
            Comprueba que las variables APS_CLIENT_ID, APS_CLIENT_SECRET y APS_BUCKET_KEY están
            configuradas en el servidor.
          </p>
        </div>
      )}
    </div>
  );
}

async function pollManifest(
  urn: string,
  onProgress: (status: string, progress: string) => void,
  maxMs = 5 * 60 * 1000
): Promise<string> {
  const start = Date.now();
  let delay = 2000;
  while (Date.now() - start < maxMs) {
    const r = await fetch(`/api/aps/status?urn=${encodeURIComponent(urn)}`);
    if (r.ok) {
      const { status, progress } = await r.json();
      onProgress(status, progress);
      if (status === "success" || status === "failed" || status === "timeout") {
        return status;
      }
    }
    await new Promise((res) => setTimeout(res, delay));
    delay = Math.min(delay * 1.3, 8000);
  }
  return "timeout";
}
