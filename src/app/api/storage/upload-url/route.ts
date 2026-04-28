// ============================================================
// POST /api/storage/upload-url
// ------------------------------------------------------------
// Body: { project_id, filename, size_bytes, category, content_type? }
// Resp: { provider, upload, file_id, expires_at, warnings? }
//   provider = 'supabase' | 'r2' | 'struxai_cloud'
//   upload = depende del tier:
//     supabase → { kind: 'supabase', bucket, path, signedUrl, token }
//     r2       → { kind: 'r2', url, headers }
//     cloud    → { kind: 'struxai_cloud', url, token }
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decideTier } from "@/lib/storage/tiers";
import { isR2Configured, readR2Config, presignR2Put } from "@/lib/storage/r2";
import {
  isStruxAICloudConfigured,
  readStruxAICloudConfig,
  signCloudUploadToken,
  buildCloudUploadUrl,
} from "@/lib/storage/struxaiCloud";
import { categoryToBucket, extOf } from "@/lib/storage/constants";

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

  const { project_id, filename, size_bytes, category, content_type } = body || {};
  if (!project_id || !filename || typeof size_bytes !== "number" || !category) {
    return NextResponse.json(
      { error: "Missing fields: project_id, filename, size_bytes, category" },
      { status: 400 }
    );
  }

  // Verificar que el proyecto pertenece al usuario
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("id, user_id")
    .eq("id", project_id)
    .single();
  if (projErr || !project || project.user_id !== user.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Settings del usuario para opt-in cloud
  const { data: settings } = await supabase
    .from("user_settings")
    .select("struxai_cloud_optin, struxai_cloud_quota_gb")
    .eq("user_id", user.id)
    .single();

  // Suma de bytes ya en STRUXAI Cloud para este usuario
  const { data: cloudUsed } = await supabase
    .from("files")
    .select("size_bytes")
    .eq("user_id", user.id)
    .eq("external_storage_provider", "struxai_cloud");

  const struxaiCloudUsedBytes = (cloudUsed || []).reduce(
    (sum: number, f: any) => sum + (f.size_bytes || 0),
    0
  );

  const decision = decideTier({
    sizeBytes: size_bytes,
    struxaiCloudOptin: !!settings?.struxai_cloud_optin,
    struxaiCloudUsedBytes,
    struxaiCloudQuotaBytes: (settings?.struxai_cloud_quota_gb || 50) * 1024 * 1024 * 1024,
    r2Configured: isR2Configured(),
    struxaiCloudConfigured: isStruxAICloudConfigured(),
  });

  const fileId = crypto.randomUUID();
  const ext = extOf(filename);
  const safeName = filename.replace(/[^\w.\-]+/g, "_");
  const key = `${user.id}/${project_id}/${fileId}-${safeName}`;
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

  if (decision.tier === "supabase") {
    const bucket = categoryToBucket(category as any);
    if (!bucket) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    // Signed upload URL de Supabase Storage
    const { data: signed, error: signErr } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(key);
    if (signErr || !signed) {
      return NextResponse.json(
        { error: "Failed to sign Supabase upload: " + signErr?.message },
        { status: 500 }
      );
    }
    return NextResponse.json({
      provider: "supabase",
      file_id: fileId,
      upload: {
        kind: "supabase",
        bucket,
        path: signed.path,
        signedUrl: signed.signedUrl,
        token: signed.token,
      },
      expires_at: expiresAt,
      decision,
    });
  }

  if (decision.tier === "r2") {
    const cfg = readR2Config()!;
    const url = presignR2Put(cfg, key, 3600, content_type);
    return NextResponse.json({
      provider: "r2",
      file_id: fileId,
      upload: {
        kind: "r2",
        url,
        headers: content_type ? { "Content-Type": content_type } : {},
        key,
      },
      expires_at: expiresAt,
      decision,
    });
  }

  if (decision.tier === "struxai_cloud") {
    const cfg = readStruxAICloudConfig()!;
    const token = signCloudUploadToken(cfg, {
      user_id: user.id,
      project_id,
      file_id: fileId,
      ext,
      category,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    return NextResponse.json({
      provider: "struxai_cloud",
      file_id: fileId,
      upload: {
        kind: "struxai_cloud",
        url: buildCloudUploadUrl(cfg, safeName),
        token,
      },
      expires_at: expiresAt,
      decision,
    });
  }

  return NextResponse.json({ error: "No tier available" }, { status: 500 });
}
