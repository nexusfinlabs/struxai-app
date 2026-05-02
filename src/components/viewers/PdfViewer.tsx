"use client";

// ============================================================
// PdfViewer
// ------------------------------------------------------------
// Estrategia: <iframe> con la URL firmada del PDF. Todos los
// navegadores modernos (Chromium, Firefox, Safari) embeben PDFs
// nativamente, lo que evita cargar pdf.js (~3 MB) por defecto.
//
// Si en el futuro se necesita más control (anotaciones, capas)
// se puede cambiar a <embed> + pdf.js sin romper la API pública.
// ============================================================

import { Download, ExternalLink } from "lucide-react";

export default function PdfViewer({
  url,
  filename,
}: {
  url: string;
  filename: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">
        <span className="font-mono uppercase tracking-widest text-slate-500">PDF</span>
        <div className="flex gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <ExternalLink className="h-3 w-3" /> Abrir
          </a>
          <a
            href={url}
            download={filename}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <Download className="h-3 w-3" /> Descargar
          </a>
        </div>
      </div>
      <iframe
        src={`${url}#view=FitH`}
        title={filename}
        className="flex-1 w-full bg-slate-100 dark:bg-slate-950"
      />
    </div>
  );
}
