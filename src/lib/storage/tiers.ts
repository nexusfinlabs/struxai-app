// ============================================================
// STRUXAI Storage - Decisión de tier
// ============================================================
// Reglas (post-decisión: STRUXAI Cloud es default, R2 solo fallback):
//  - ≤50 MB                     → Supabase Storage (rápido + RLS).
//  - >50 MB y Cloud configurado → STRUXAI Cloud (VPS propio, 140 GB).
//  - Si Cloud lleno o no configurado y R2 configurado → Cloudflare R2.
//  - Si nada configurado → Supabase con warning.
//
// El antiguo "opt-in" sigue existiendo como override:
//  - struxaiCloudOptin === false  →  forzar R2 si está configurado
//    (útil si quieres usar R2 pese a tener Cloud disponible).
//  - struxaiCloudOptin === true (default)  →  Cloud preferido.
// ============================================================

import { SUPABASE_MAX_BYTES, R2_MAX_BYTES, STRUXAI_CLOUD_MAX_BYTES } from "./constants";

export type StorageTier = "supabase" | "r2" | "struxai_cloud";

export type TierDecision = {
  tier: StorageTier;
  reason: string;
  warning?: string;
};

export type TierContext = {
  sizeBytes: number;
  /**
   * Si false, el usuario fuerza R2 aunque Cloud esté disponible.
   * Default true: Cloud preferido.
   */
  struxaiCloudOptin: boolean;
  struxaiCloudUsedBytes?: number;
  struxaiCloudQuotaBytes?: number;
  r2Configured: boolean;
  struxaiCloudConfigured: boolean;
};

export function decideTier(ctx: TierContext): TierDecision {
  const {
    sizeBytes,
    struxaiCloudOptin,
    struxaiCloudUsedBytes = 0,
    struxaiCloudQuotaBytes = 100 * 1024 * 1024 * 1024, // 100 GB default
    r2Configured,
    struxaiCloudConfigured,
  } = ctx;

  if (sizeBytes > STRUXAI_CLOUD_MAX_BYTES) {
    return {
      tier: "supabase",
      reason: "El archivo supera 10 GB (límite UI). Reduce o divide.",
      warning: "10 GB es el tope por archivo en STRUXAI.",
    };
  }

  // Caso pequeño: siempre Supabase
  if (sizeBytes <= SUPABASE_MAX_BYTES) {
    return { tier: "supabase", reason: "Archivo pequeño (≤50 MB), usa Supabase Storage." };
  }

  // STRUXAI Cloud es default si está configurado y la cuota del usuario no se llenó
  // y el usuario no forzó R2 (struxaiCloudOptin = false).
  const cloudHasRoom = struxaiCloudUsedBytes + sizeBytes <= struxaiCloudQuotaBytes;
  if (struxaiCloudConfigured && struxaiCloudOptin !== false && cloudHasRoom) {
    return {
      tier: "struxai_cloud",
      reason: "STRUXAI Cloud (VPS propio) — sin coste de egress, propiedad total.",
    };
  }

  // R2: o el usuario forzó R2 (optin=false), o Cloud está lleno/no configurado
  if (r2Configured && sizeBytes <= R2_MAX_BYTES) {
    const warning = !struxaiCloudConfigured
      ? "STRUXAI Cloud aún no configurado en este entorno; usando R2."
      : !cloudHasRoom
      ? "STRUXAI Cloud sin cuota disponible; fallback a R2."
      : undefined;
    return { tier: "r2", reason: "Cloudflare R2 (fallback >50 MB).", warning };
  }

  // Fallback: si no hay tier para grandes, devolvemos Supabase con aviso
  return {
    tier: "supabase",
    reason: "Sin tier configurado para >50 MB. Configura STRUXAI Cloud o R2.",
    warning:
      "Faltan credenciales de STRUXAI Cloud y R2. Configura una de las dos para subir archivos grandes.",
  };
}
