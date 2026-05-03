// ============================================================
// POST /api/aps/translate
// ------------------------------------------------------------
// Body: { file_id }
// Resp: { urn, manifest_status }
//
// Flujo:
//   1. Resolver el file por id (verificando ownership)
//   2. Si ya tiene aps_urn en metadata y la traducción está OK,
//      devolver tal cual (cacheable).
//   3. Si no, descargar el bytes del provider (Supabase / R2 /
//      STRUXAI Cloud), subirlos al bucket OSS, lanzar la
//      traducción y persistir el URN en files.metadata.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isApsConfigured,
  readApsConfig,
  ensureBucket,
  uploadObject,
  startTranslation,
  getManifest,
  urnFromObjectId,
} from "@/lib/aps/client";
import { readR2Config, presignR2Get } from "@/lib/storage/r2";
import {
  readStruxAICloudConfig,
  signCloudDownloadToken,
  buildCloudDownloadUrlWithToken,
} from "@/lib/storage/struxaiCloud";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isApsConfigured()) {
    return NextResponse.json({ error: "APS not configured" }, { status: 503 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fileId: string = body?.file_id;
  if (!fileId) return NextResponse.json({ error: "Missing file_id" }, { status: 400 });

  const { data: file } = await supabase
    .from("files")
    .select(
      "id, user_id, filename, mime_type, storage_path, external_storage_provider, metadata"
    )
    .eq("id", fileId)
    .single();
  if (!file || file.user_id !== user.id) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const cfg = readApsConfig()!;
  const meta = (file.metadata as Record<string, any>) || {};
  let urn: string | undefined = meta.aps_urn;

  // Si ya hay URN, comprobamos manifest. Si está success/inprogress,
  // devolvemos directamente (no re-traducimos).
  if (urn) {
    try {
      const manifest = await getManifest(cfg, urn);
      if (manifest && (manifest.status === "success" || manifest.status === "inprogress" || manifest.status === "pending")) {
        return NextResponse.json({ urn, manifest_status: manifest.status });
      }
    } catch {
      // Si manifest falla, recomenzamos.
    }
  }

  // Descargar bytes del provider de origen
  const sourceUrl = await resolveSourceUrl(supabase, user.id, file);
  if (!sourceUrl) {
    return NextResponse.json({ error: "Cannot resolve source URL" }, { status: 500 });
  }

  const downloadRes = await fetch(sourceUrl);
  if (!downloadRes.ok) {
    return NextResponse.json(
      { error: `Source download failed (${downloadRes.status})` },
      { status: 502 }
    );
  }
  const buf = await downloadRes.arrayBuffer();

  try {
    await ensureBucket(cfg);
    const objectKey = `${file.id}-${file.filename.replace(/[^\w.\-]+/g, "_")}`;
    const objectId = await uploadObject(cfg, objectKey, buf, file.mime_type || undefined);
    urn = urnFromObjectId(objectId);
    await startTranslation(cfg, urn);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "APS upload failed" }, { status: 502 });
  }

  await supabase
    .from("files")
    .update({ metadata: { ...meta, aps_urn: urn } })
    .eq("id", fileId);

  return NextResponse.json({ urn, manifest_status: "pending" });
}

async function resolveSourceUrl(
  supabase: any,
  userId: string,
  file: {
    id: string;
    storage_path: string;
    external_storage_provider: string | null;
  }
): Promise<string | null> {
  const provider = (file.external_storage_provider || "supabase") as
    | "supabase"
    | "r2"
    | "struxai_cloud";

  if (provider === "supabase") {
    const sep = file.storage_path.indexOf("/");
    if (sep < 0) return null;
    const bucket = file.storage_path.slice(0, sep);
    const path = file.storage_path.slice(sep + 1);
    const { data: signed } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 600);
    return signed?.signedUrl || null;
  }
  if (provider === "r2") {
    const cfg = readR2Config();
    if (!cfg) return null;
    const key = file.storage_path.replace(/^r2:\/\//, "");
    return presignR2Get(cfg, key, 600);
  }
  if (provider === "struxai_cloud") {
    const cfg = readStruxAICloudConfig();
    if (!cfg) return null;
    const token = signCloudDownloadToken(cfg, {
      user_id: userId,
      file_id: file.id,
      exp: Math.floor(Date.now() / 1000) + 600,
    });
    return buildCloudDownloadUrlWithToken(cfg, file.id, token);
  }
  return null;
}
