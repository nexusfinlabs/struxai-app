// ============================================================
// STRUXAI Storage - Constantes compartidas
// ============================================================

// Tamaños
export const MB = 1024 * 1024;
export const GB = 1024 * 1024 * 1024;

// Umbrales por tier
export const SUPABASE_MAX_BYTES = 50 * MB; // free tier de Supabase
export const R2_MAX_BYTES = 5 * GB; // R2 single PUT; multipart hasta 5TB
export const STRUXAI_CLOUD_MAX_BYTES = 10 * GB; // límite UI por archivo

// Banner de aviso cuando se acerca al tope de R2 free tier (10 GB total)
export const R2_FREE_TIER_BYTES = 10 * GB;
export const R2_WARN_THRESHOLD = 0.8;

// Buckets de Supabase Storage
export const SUPABASE_BUCKETS = {
  cad: "cad-uploads",
  bim: "bim-uploads",
  memoria_in: "memorias-in",
  memoria_out: "memorias-out",
  memoria_firmada: "memorias-firmadas",
} as const;

// Categorías de archivo (alineadas con files.category en BD)
export type FileCategory = keyof typeof SUPABASE_BUCKETS | "otro";

// ---------- FORMATOS CAD ----------
export const CAD_EXTENSIONS = [
  ".dwg",
  ".dxf",
  ".dwf",
  ".dwfx",
  ".dgn",
  ".iges",
  ".igs",
  ".step",
  ".stp",
  ".stl",
  ".3dm",
  ".skp",
  ".3ds",
  ".obj",
] as const;

export const CAD_ACCEPT: Record<string, string[]> = {
  "application/acad": [".dwg"],
  "image/vnd.dwg": [".dwg"],
  "application/dxf": [".dxf"],
  "image/vnd.dxf": [".dxf"],
  "model/vnd.dwf": [".dwf", ".dwfx"],
  "model/vnd.dgn": [".dgn"],
  "model/iges": [".iges", ".igs"],
  "model/step": [".step", ".stp"],
  "application/sla": [".stl"],
  "model/stl": [".stl"],
  "model/vnd.3dm": [".3dm"],
  "application/vnd.sketchup.skp": [".skp"],
  "application/x-3ds": [".3ds"],
  "model/obj": [".obj"],
  "application/octet-stream": [...CAD_EXTENSIONS],
  "application/pdf": [".pdf"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
};

// ---------- FORMATOS BIM / REVIT ----------
export const BIM_EXTENSIONS = [
  ".rvt",
  ".rfa",
  ".rte",
  ".ifc",
  ".ifcxml",
  ".ifczip",
  ".nwc",
  ".nwd",
  ".nwf",
  ".pln",
  ".pla",
] as const;

export const BIM_ACCEPT: Record<string, string[]> = {
  "application/octet-stream": [...BIM_EXTENSIONS],
  "application/x-step": [".ifc"],
  "application/ifc": [".ifc"],
  "application/zip": [".ifczip"],
  "application/pdf": [".pdf"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
};

// ---------- MEMORIAS / OTROS ----------
export const MEMORIA_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".doc",
  ".odt",
  ".rtf",
  ".txt",
  ".csv",
  ".xlsx",
  ".xls",
  ".zip",
  ".7z",
] as const;

export const MEMORIA_ACCEPT: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.oasis.opendocument.text": [".odt"],
  "application/rtf": [".rtf"],
  "text/plain": [".txt"],
  "text/csv": [".csv"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/zip": [".zip"],
  "application/x-7z-compressed": [".7z"],
};

export function extOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i).toLowerCase() : "";
}

export function humanSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < MB) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < GB) return (bytes / MB).toFixed(1) + " MB";
  return (bytes / GB).toFixed(2) + " GB";
}

export function categoryToBucket(category: FileCategory): string | null {
  if (category === "otro") return null;
  return SUPABASE_BUCKETS[category];
}
