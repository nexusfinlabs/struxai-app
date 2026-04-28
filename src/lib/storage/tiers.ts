// ============================================================
// STRUXAI Storage - Decisión de tier
// ============================================================
// Reglas:
//  - Si el usuario optó por STRUXAI Cloud y el archivo > umbral_supabase,
//    intentar STRUXAI Cloud primero (139 GB en VPS, gratis).
//  - Si no hay opt-in cloud, archivo > 50 MB → R2.
//  - Archivos pequeños siempre en Supabase (rápido + RLS integrada).
//  - Si se supera la cuota del tier elegido, fallback al siguiente.
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
    struxaiCloudQuotaBytes = 50 * 1024 * 1024 * 1024, // 50 GB default
    r2Configured,
    struxaiCloudConfigured,
  } = ctx;

  if (sizeBytes > STRUXAI_CLOUD_MAX_BYTES) {
    return {
      tier: "supabase",
      reason: "El archivo supera 10 GB (límite UI). Reduce o divide.",
    };
  }

  // Caso pequeño: siempre Supabase
  if (sizeBytes <= SUPABASE_MAX_BYTES) {
    return { tier: "supabase", reason: "Archivo pequeño (≤50 MB), usa Supabase Storage." };
  }

  // Cloud opt-in tiene prioridad si está activo y configurado y entra en cuota
  if (
    struxaiCloudOptin &&
    struxaiCloudConfigured &&
    struxaiCloudUsedBytes + sizeBytes <= struxaiCloudQuotaBytes
  ) {
    return {
      tier: "struxai_cloud",
      reason: "Opt-in STRUXAI Cloud activo, archivo se guarda en VPS propio.",
    };
  }

  // R2 si está configurado y archivo cabe
  if (r2Configured && sizeBytes <= R2_MAX_BYTES) {
    const warning =
      struxaiCloudOptin && !struxaiCloudConfigured
        ? "Opt-in STRUXAI Cloud activo pero VPS no está configurado, fallback a R2."
        : undefined;
    return { tier: "r2", reason: "Archivo grande (>50 MB), usa Cloudflare R2.", warning };
  }

  // Fallback: avisar que necesita configurar tier para grandes
  return {
    tier: "supabase",
    reason: "Sin tier configurado para >50 MB. Configura R2 o STRUXAI Cloud.",
    warning: "Faltan credenciales de R2 y STRUXAI Cloud. El upload puede fallar.",
  };
}
