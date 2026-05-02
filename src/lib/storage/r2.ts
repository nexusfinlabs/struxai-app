// ============================================================
// Cloudflare R2 - presigned URLs (S3-compatible)
// ============================================================
// Para evitar añadir @aws-sdk como dep pesada, implementamos
// SigV4 a mano usando crypto de Node. Soporta PUT objects con
// X-Amz-Date / X-Amz-Expires en query string.
// ============================================================

import crypto from "crypto";

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicHost?: string; // ej. https://files.struxai.example.com (custom domain) o R2 dev URL
};

export function readR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicHost = process.env.R2_PUBLIC_HOST;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket, publicHost };
}

export function isR2Configured(): boolean {
  return readR2Config() !== null;
}

function sha256Hex(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function hmac(key: Buffer, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function getSigningKey(
  secret: string,
  date: string,
  region: string,
  service: string
): Buffer {
  const kDate = hmac(Buffer.from("AWS4" + secret, "utf8"), date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

/**
 * Devuelve una URL presigned PUT para subir un objeto a R2.
 * El cliente puede hacer fetch(url, {method:'PUT', body: file}).
 */
export function presignR2Put(
  cfg: R2Config,
  key: string,
  expiresSeconds: number = 3600,
  contentType?: string
): string {
  return presignR2(cfg, "PUT", key, expiresSeconds);
}

/**
 * Devuelve una URL presigned GET para descargar un objeto de R2.
 * El navegador o cualquier cliente HTTP puede hacer fetch(url) directamente.
 */
export function presignR2Get(
  cfg: R2Config,
  key: string,
  expiresSeconds: number = 3600
): string {
  return presignR2(cfg, "GET", key, expiresSeconds);
}

function presignR2(
  cfg: R2Config,
  method: "GET" | "PUT",
  key: string,
  expiresSeconds: number
): string {
  const region = "auto";
  const service = "s3";
  const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
  const path = `/${cfg.bucket}/${encodeURIPath(key)}`;

  const now = new Date();
  const amzDate =
    now.getUTCFullYear().toString().padStart(4, "0") +
    (now.getUTCMonth() + 1).toString().padStart(2, "0") +
    now.getUTCDate().toString().padStart(2, "0") +
    "T" +
    now.getUTCHours().toString().padStart(2, "0") +
    now.getUTCMinutes().toString().padStart(2, "0") +
    now.getUTCSeconds().toString().padStart(2, "0") +
    "Z";
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${cfg.accessKeyId}/${credentialScope}`;

  const params: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresSeconds),
    "X-Amz-SignedHeaders": "host",
  };

  const signedHeaders = "host";
  const canonicalQuery = Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join("&");

  const canonicalHeaders = `host:${host}\n`;
  const payloadHash = "UNSIGNED-PAYLOAD";
  const canonicalRequest = [
    method,
    path,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = getSigningKey(cfg.secretAccessKey, dateStamp, region, service);
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  const finalQuery = canonicalQuery + `&X-Amz-Signature=${signature}`;
  return `https://${host}${path}?${finalQuery}`;
}

function encodeURIPath(p: string): string {
  return p
    .split("/")
    .map((seg) => encodeURIComponent(seg).replace(/%2F/g, "/"))
    .join("/");
}

/**
 * URL pública (si bucket está expuesto vía custom domain o r2.dev).
 * No-op si no hay publicHost configurado.
 */
export function r2PublicUrl(cfg: R2Config, key: string): string | null {
  if (!cfg.publicHost) return null;
  return `${cfg.publicHost.replace(/\/$/, "")}/${encodeURIPath(key)}`;
}
