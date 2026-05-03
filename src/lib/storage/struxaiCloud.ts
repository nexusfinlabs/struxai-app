// ============================================================
// STRUXAI Cloud - cliente para almacenamiento en VPS propio
// ============================================================
// Arquitectura:
//   1. App Next.js firma un token corto (JWT-like) con HMAC.
//   2. Cliente sube directamente a https://cloud.struxai.<dominio>/upload
//      con header Authorization: Bearer <token>.
//   3. Servicio Node en el VPS valida el token, escribe en
//      /srv/struxai-cloud/users/{user_id}/projects/{project_id}/{file_id}.{ext}
//   4. Quota check antes de aceptar (df -h o config).
//
// Estado: cliente listo, servicio VPS pendiente de despliegue.
// Ver infra/struxai-cloud/ para systemd unit + servicio Node.
// ============================================================

import crypto from "crypto";

export type StruxAICloudConfig = {
  endpoint: string; // ej: https://cloud.struxai.nexusfinlabs.com
  signingSecret: string;
};

export function readStruxAICloudConfig(): StruxAICloudConfig | null {
  const endpoint = process.env.STRUXAI_CLOUD_ENDPOINT;
  const signingSecret = process.env.STRUXAI_CLOUD_SIGNING_SECRET;
  if (!endpoint || !signingSecret) return null;
  return { endpoint, signingSecret };
}

export function isStruxAICloudConfigured(): boolean {
  return readStruxAICloudConfig() !== null;
}

export type CloudUploadToken = {
  user_id: string;
  project_id: string;
  file_id: string;
  ext: string;
  category: string;
  exp: number;
};

/**
 * Genera token HMAC para upload directo al VPS.
 * Formato: base64url(payload).base64url(signature)
 */
export function signCloudUploadToken(
  cfg: StruxAICloudConfig,
  payload: CloudUploadToken
): string {
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", cfg.signingSecret)
    .update(payloadB64)
    .digest("base64url");
  return `${payloadB64}.${sig}`;
}

export function buildCloudUploadUrl(
  cfg: StruxAICloudConfig,
  filename: string
): string {
  return `${cfg.endpoint.replace(/\/$/, "")}/upload?filename=${encodeURIComponent(filename)}`;
}

export function buildCloudDownloadUrl(
  cfg: StruxAICloudConfig,
  fileId: string
): string {
  return `${cfg.endpoint.replace(/\/$/, "")}/download/${encodeURIComponent(fileId)}`;
}

export type CloudDownloadToken = {
  user_id: string;
  file_id: string;
  exp: number;
};

/**
 * Genera token HMAC para descarga directa desde el VPS.
 * Mismo formato que el upload token: base64url(payload).base64url(sig).
 * El servicio en el VPS debe validar firma + exp + ownership.
 */
export function signCloudDownloadToken(
  cfg: StruxAICloudConfig,
  payload: CloudDownloadToken
): string {
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", cfg.signingSecret)
    .update(payloadB64)
    .digest("base64url");
  return `${payloadB64}.${sig}`;
}

/**
 * URL completa para descargar incluyendo token en query string,
 * adecuada para incrustar en <iframe>, <embed> o pasarla a un fetch
 * client-side sin tener que añadir headers (necesario p.ej. para
 * <embed src> en el visor PDF nativo).
 */
export function buildCloudDownloadUrlWithToken(
  cfg: StruxAICloudConfig,
  fileId: string,
  token: string
): string {
  return `${buildCloudDownloadUrl(cfg, fileId)}?token=${encodeURIComponent(token)}`;
}
