// ============================================================
// Autodesk Platform Services (APS, ex-Forge) - cliente server-side
// ------------------------------------------------------------
// Soporta:
//   - 2-legged OAuth (client_credentials) con scopes administrativos
//     (data:read/write/create, bucket:read/create) para uploads
//   - 2-legged OAuth con scope `viewables:read` para el viewer en
//     navegador (token expone-able al cliente)
//   - Creación idempotente de bucket OSS
//   - Subida directa (signed S3 upload — APIs S3 compatibles)
//   - Lanzamiento de jobs en Model Derivative
//   - Consulta de manifest (estado de la traducción)
//
// El visor web usa la URN base64url del objectId para abrir el modelo.
// ============================================================

const APS_BASE = "https://developer.api.autodesk.com";

export type ApsConfig = {
  clientId: string;
  clientSecret: string;
  bucketKey: string; // bucket OSS persistente para esta app
};

export function readApsConfig(): ApsConfig | null {
  const clientId = process.env.APS_CLIENT_ID;
  const clientSecret = process.env.APS_CLIENT_SECRET;
  const bucketKey = process.env.APS_BUCKET_KEY;
  if (!clientId || !clientSecret || !bucketKey) return null;
  return { clientId, clientSecret, bucketKey };
}

export function isApsConfigured(): boolean {
  return readApsConfig() !== null;
}

export type ApsToken = {
  access_token: string;
  expires_in: number;
  obtained_at: number;
};

// Cache simple en memoria por scope. Suficiente para una instancia.
const TOKEN_CACHE = new Map<string, ApsToken>();

async function fetchToken(cfg: ApsConfig, scopes: string[]): Promise<ApsToken> {
  const scopeKey = scopes.slice().sort().join(" ");
  const cached = TOKEN_CACHE.get(scopeKey);
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.obtained_at + cached.expires_in - 60 > now) {
    return cached;
  }

  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");
  const res = await fetch(`${APS_BASE}/authentication/v2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: scopeKey,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`APS token failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  const tok: ApsToken = {
    access_token: json.access_token,
    expires_in: json.expires_in,
    obtained_at: now,
  };
  TOKEN_CACHE.set(scopeKey, tok);
  return tok;
}

/**
 * Token administrativo: lectura/escritura de OSS + Model Derivative.
 */
export function getInternalToken(cfg: ApsConfig): Promise<ApsToken> {
  return fetchToken(cfg, [
    "data:read",
    "data:write",
    "data:create",
    "bucket:create",
    "bucket:read",
    "viewables:read",
  ]);
}

/**
 * Token para el visor en navegador: SOLO viewables:read.
 * Es seguro enviarlo al cliente (no permite mutaciones).
 */
export function getViewerToken(cfg: ApsConfig): Promise<ApsToken> {
  return fetchToken(cfg, ["viewables:read"]);
}

/**
 * Codifica un objectId (urn:adsk.objects:...) a base64url SIN padding,
 * formato que espera el viewer y la Model Derivative API.
 */
export function urnFromObjectId(objectId: string): string {
  return Buffer.from(objectId, "utf8")
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/**
 * Crea el bucket OSS si no existe. Idempotente.
 * policyKey 'persistent' = nunca caduca (vs transient/temporary).
 */
export async function ensureBucket(cfg: ApsConfig): Promise<void> {
  const tok = await getInternalToken(cfg);
  const res = await fetch(`${APS_BASE}/oss/v2/buckets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tok.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bucketKey: cfg.bucketKey,
      policyKey: "persistent",
    }),
  });
  if (res.status === 200 || res.status === 409) return; // creado o ya existe
  const text = await res.text().catch(() => "");
  throw new Error(`APS ensureBucket failed (${res.status}): ${text}`);
}

/**
 * Sube un archivo a OSS usando el flujo signed S3 (recomendado por
 * Autodesk para piezas grandes). Devuelve el objectId completo.
 *
 * - body: ArrayBuffer del fichero (suficiente para el tamaño que
 *   pasa por el visor; archivos enormes deberían usar multi-part).
 */
export async function uploadObject(
  cfg: ApsConfig,
  objectKey: string,
  body: ArrayBuffer | Uint8Array,
  contentType?: string
): Promise<string> {
  const tok = await getInternalToken(cfg);
  const headers = { Authorization: `Bearer ${tok.access_token}` };

  // 1. Pedir signed S3 URL (1 part)
  const signRes = await fetch(
    `${APS_BASE}/oss/v2/buckets/${encodeURIComponent(cfg.bucketKey)}/objects/${encodeURIComponent(objectKey)}/signeds3upload?parts=1`,
    { headers }
  );
  if (!signRes.ok) {
    const text = await signRes.text().catch(() => "");
    throw new Error(`APS signed upload failed (${signRes.status}): ${text}`);
  }
  const sign = (await signRes.json()) as { uploadKey: string; urls: string[] };

  // 2. PUT a la URL S3 firmada
  const putRes = await fetch(sign.urls[0], {
    method: "PUT",
    headers: contentType ? { "Content-Type": contentType } : undefined,
    body: body as any,
  });
  if (!putRes.ok) {
    const text = await putRes.text().catch(() => "");
    throw new Error(`APS S3 PUT failed (${putRes.status}): ${text}`);
  }

  // 3. Finalizar upload
  const finRes = await fetch(
    `${APS_BASE}/oss/v2/buckets/${encodeURIComponent(cfg.bucketKey)}/objects/${encodeURIComponent(objectKey)}/signeds3upload`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ uploadKey: sign.uploadKey }),
    }
  );
  if (!finRes.ok) {
    const text = await finRes.text().catch(() => "");
    throw new Error(`APS finalize upload failed (${finRes.status}): ${text}`);
  }
  const fin = (await finRes.json()) as { objectId: string };
  return fin.objectId;
}

/**
 * Lanza un job de traducción en Model Derivative (formato SVF2).
 * El cliente luego usa la URN para abrir el modelo en el visor.
 */
export async function startTranslation(cfg: ApsConfig, urn: string): Promise<void> {
  const tok = await getInternalToken(cfg);
  const res = await fetch(`${APS_BASE}/modelderivative/v2/designdata/job`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tok.access_token}`,
      "Content-Type": "application/json",
      "x-ads-force": "false",
    },
    body: JSON.stringify({
      input: { urn },
      output: {
        formats: [{ type: "svf2", views: ["2d", "3d"] }],
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`APS translation job failed (${res.status}): ${text}`);
  }
}

export type ApsManifest = {
  status: string;
  progress: string;
  region?: string;
  derivatives?: any[];
};

export async function getManifest(cfg: ApsConfig, urn: string): Promise<ApsManifest | null> {
  const tok = await getInternalToken(cfg);
  const res = await fetch(
    `${APS_BASE}/modelderivative/v2/designdata/${encodeURIComponent(urn)}/manifest`,
    { headers: { Authorization: `Bearer ${tok.access_token}` } }
  );
  if (res.status === 404) return null; // aún no se ha lanzado
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`APS manifest failed (${res.status}): ${text}`);
  }
  return (await res.json()) as ApsManifest;
}
