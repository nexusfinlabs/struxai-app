// ============================================================
// STRUXAI Cloud - servicio HTTP en VPS
// ------------------------------------------------------------
// Lanzar con: node server.mjs (idealmente vía systemd)
// Variables de entorno requeridas:
//   STRUXAI_CLOUD_PORT (default 8443)
//   STRUXAI_CLOUD_BASE_DIR (default /srv/struxai-cloud)
//   STRUXAI_CLOUD_SIGNING_SECRET (igual que en la app Next)
//   STRUXAI_CLOUD_TLS_CERT, STRUXAI_CLOUD_TLS_KEY (si TLS local;
//     en producción mejor terminar TLS en nginx delante)
// ============================================================

import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pipeline } from "node:stream/promises";

const PORT = Number(process.env.STRUXAI_CLOUD_PORT || 8443);
const BASE_DIR = process.env.STRUXAI_CLOUD_BASE_DIR || "/srv/struxai-cloud";
const SECRET = process.env.STRUXAI_CLOUD_SIGNING_SECRET || "";
const TLS_CERT = process.env.STRUXAI_CLOUD_TLS_CERT;
const TLS_KEY = process.env.STRUXAI_CLOUD_TLS_KEY;

if (!SECRET) {
  console.error("FATAL: STRUXAI_CLOUD_SIGNING_SECRET no configurado.");
  process.exit(1);
}

function verifyToken(token) {
  if (!token) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(payloadB64)
    .digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function userPath(p) {
  return path.join(
    BASE_DIR,
    "users",
    p.user_id,
    "projects",
    p.project_id,
    `${p.file_id}${p.ext || ""}`
  );
}

function getQuotaInfo() {
  try {
    const stat = fs.statfsSync(BASE_DIR);
    return {
      free_bytes: Number(stat.bavail) * Number(stat.bsize),
      total_bytes: Number(stat.blocks) * Number(stat.bsize),
    };
  } catch {
    return { free_bytes: 0, total_bytes: 0 };
  }
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization,Content-Type",
    ...headers,
  });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

async function handleUpload(req, res, payload) {
  const dest = userPath(payload);
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  const tmp = dest + ".part";
  let total = 0;
  try {
    const ws = fs.createWriteStream(tmp);
    req.on("data", (chunk) => (total += chunk.length));
    await pipeline(req, ws);
    await fs.promises.rename(tmp, dest);
  } catch (e) {
    try {
      await fs.promises.unlink(tmp);
    } catch {}
    return send(res, 500, { error: "upload_failed", detail: String(e) });
  }
  send(res, 200, { ok: true, file_id: payload.file_id, size_bytes: total });
}

async function handleDownload(req, res, payload, fileId) {
  const dest = userPath({ ...payload, file_id: fileId });
  try {
    const stat = await fs.promises.stat(dest);
    res.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Content-Length": stat.size,
    });
    await pipeline(fs.createReadStream(dest), res);
  } catch {
    send(res, 404, { error: "not_found" });
  }
}

async function handleDelete(_req, res, payload, fileId) {
  const dest = userPath({ ...payload, file_id: fileId });
  try {
    await fs.promises.unlink(dest);
    send(res, 200, { ok: true });
  } catch {
    send(res, 404, { error: "not_found" });
  }
}

const handler = async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, "");

  const url = new URL(req.url, `http://${req.headers.host}`);
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload) return send(res, 401, { error: "invalid_or_expired_token" });

  if (url.pathname === "/upload" && req.method === "POST") {
    return handleUpload(req, res, payload);
  }
  if (url.pathname.startsWith("/download/") && req.method === "GET") {
    const fileId = url.pathname.split("/")[2];
    return handleDownload(req, res, payload, fileId);
  }
  if (url.pathname.startsWith("/file/") && req.method === "DELETE") {
    const fileId = url.pathname.split("/")[2];
    return handleDelete(req, res, payload, fileId);
  }
  if (url.pathname === "/quota" && req.method === "GET") {
    return send(res, 200, getQuotaInfo());
  }
  send(res, 404, { error: "not_found" });
};

const server =
  TLS_CERT && TLS_KEY
    ? https.createServer({ cert: fs.readFileSync(TLS_CERT), key: fs.readFileSync(TLS_KEY) }, handler)
    : http.createServer(handler);

server.listen(PORT, () => {
  console.log(`STRUXAI Cloud listening on :${PORT} (base=${BASE_DIR})`);
});
