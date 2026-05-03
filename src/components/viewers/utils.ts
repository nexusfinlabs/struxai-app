import { extOf } from "@/lib/storage/constants";

export type ViewerKind = "pdf" | "three" | "ifc" | "aps" | "unsupported";

// Three.js loaders soportados a través de CDN.
// (FBX y 3DS se mapean a APS porque su soporte en Three.js es
//  más errático y APS los renderiza nativamente.)
const THREE_EXT = new Set([".obj", ".stl", ".gltf", ".glb", ".ply"]);
const IFC_EXT = new Set([".ifc", ".ifcxml", ".ifczip"]);

// APS gestiona nativamente toda la familia CAD/BIM autodesk
// (Revit, AutoCAD, Inventor) y muchos formatos neutros.
// https://aps.autodesk.com/en/docs/model-derivative/v2/developers_guide/supported-translations/
const APS_EXT = new Set([
  ".rvt",
  ".rfa",
  ".rte",
  ".dwg",
  ".dwf",
  ".dwfx",
  ".dgn",
  ".iges",
  ".igs",
  ".step",
  ".stp",
  ".nwc",
  ".nwd",
  ".nwf",
  ".skp",
  ".3dm",
  ".3ds",
  ".fbx",
  ".pln",
  ".pla",
]);

export function detectViewer(filename: string): ViewerKind {
  const ext = extOf(filename);
  if (ext === ".pdf") return "pdf";
  if (THREE_EXT.has(ext)) return "three";
  if (IFC_EXT.has(ext)) return "ifc";
  if (APS_EXT.has(ext)) return "aps";
  return "unsupported";
}

export function isViewable(filename: string): boolean {
  return detectViewer(filename) !== "unsupported";
}

/** Extensión sin punto, en minúsculas. Útil para los loaders. */
export function bareExt(filename: string): string {
  return extOf(filename).replace(/^\./, "");
}

/**
 * Carga un script externo una sola vez. Resuelve cuando window
 * tiene la propiedad indicada (si se da). Sirve para CDN-load de
 * Three.js, web-ifc-three y el Autodesk Viewer SDK.
 */
export function loadScriptOnce(
  src: string,
  opts?: { module?: boolean; checkGlobal?: string }
): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (opts?.checkGlobal && (window as any)[opts.checkGlobal]) {
    return Promise.resolve();
  }
  const existing = document.querySelector(`script[data-loader-src="${src}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed: " + src)));
      // Si ya cargó, el listener no dispara — comprobamos global tras un tick.
      setTimeout(() => {
        if (!opts?.checkGlobal || (window as any)[opts.checkGlobal]) resolve();
      }, 0);
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    if (opts?.module) s.type = "module";
    s.dataset.loaderSrc = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed: " + src));
    document.head.appendChild(s);
  });
}

/** Inserta una <link rel=stylesheet> sólo una vez. */
export function loadStylesheetOnce(href: string): void {
  if (typeof window === "undefined") return;
  if (document.querySelector(`link[data-loader-href="${href}"]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = href;
  l.dataset.loaderHref = href;
  document.head.appendChild(l);
}
