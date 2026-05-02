// ============================================================
// POST /api/storage/download-url
// ------------------------------------------------------------
// Body: { file_id }
// Resp: { url, expires_at, provider, filename, mime_type }
//
// Devuelve una URL temporal para LEER el archivo en el navegador
// (visores PDF, 3D, IFC). La URL caduca en 1 hora.
// El usuario debe ser dueño del archivo (RLS + check explícito).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readR2Config, presignR2Get } from "@/lib/storage/r2";
import {
  readStruxAICloudConfig,
  signCloudDownloadToken,
  buildCloudDownloadUrlWithToken,
} from "@/lib/storage/struxaiCloud";

const DOWNLOAD_EXPIRES_SECONDS = 60 * 60; // 1h

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fileId = body?.file_id;
  if (!fileId || typeof fileId !== "string") {
    return NextResponse.json({ error: "Missing file_id" }, { status: 400 });
  }

  const { data: file, error: fileErr } = await supabase
    .from("files")
    .select("id, user_id, filename, mime_type, storage_path, external_storage_provider")
    .eq("id", fileId)
    .single();
  if (fileErr || !file || file.user_id !== user.id) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const provider = (file.external_storage_provider || "supabase") as
    | "supabase"
    | "r2"
    | "struxai_cloud";
  const expiresAt = new Date(Date.now() + DOWNLOAD_EXPIRES_SECONDS * 1000).toISOString();

  if (provider === "supabase") {
    // storage_path: `${bucket}/${path...}`
    const sep = file.storage_path.indexOf("/");
    if (sep < 0) {
      return NextResponse.json({ error: "Invalid storage_path" }, { status: 500 });
    }
    const bucket = file.storage_path.slice(0, sep);
    const path = file.storage_path.slice(sep + 1);
    const { data: signed, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, DOWNLOAD_EXPIRES_SECONDS);
    if (error || !signed) {
      return NextResponse.json(
        { error: "Failed to sign Supabase download: " + error?.message },
        { status: 500 }
      );
    }
    return NextResponse.json({
      url: signed.signedUrl,
      expires_at: expiresAt,
      provider,
      filename: file.filename,
      mime_type: file.mime_type,
    });
  }

  if (provider === "r2") {
    const cfg = readR2Config();
    if (!cfg) {
      return NextResponse.json({ error: "R2 not configured" }, { status: 500 });
    }
    // storage_path: `r2://${key}`
    const key = file.storage_path.replace(/^r2:\/\//, "");
    const url = presignR2Get(cfg, key, DOWNLOAD_EXPIRES_SECONDS);
    return NextResponse.json({
      url,
      expires_at: expiresAt,
      provider,
      filename: file.filename,
      mime_type: file.mime_type,
    });
  }

  if (provider === "struxai_cloud") {
    const cfg = readStruxAICloudConfig();
    if (!cfg) {
      return NextResponse.json({ error: "STRUXAI Cloud not configured" }, { status: 500 });
    }
    const token = signCloudDownloadToken(cfg, {
      user_id: user.id,
      file_id: fileId,
      exp: Math.floor(Date.now() / 1000) + DOWNLOAD_EXPIRES_SECONDS,
    });
    const url = buildCloudDownloadUrlWithToken(cfg, fileId, token);
    return NextResponse.json({
      url,
      expires_at: expiresAt,
      provider,
      filename: file.filename,
      mime_type: file.mime_type,
    });
  }

  return NextResponse.json({ error: "Unknown provider" }, { status: 500 });
}
