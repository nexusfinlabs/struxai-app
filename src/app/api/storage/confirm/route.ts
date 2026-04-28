// ============================================================
// POST /api/storage/confirm
// ------------------------------------------------------------
// Tras subir el archivo al tier elegido, el cliente confirma
// con este endpoint para crear la fila en `files`.
// Body: {
//   project_id, file_id, filename, size_bytes, category,
//   provider, mime_type?, external_url?
// }
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extOf } from "@/lib/storage/constants";

const VALID_PROVIDERS = ["supabase", "r2", "struxai_cloud"] as const;

// Mapeo de category de UI → file_type del enum BD
const CATEGORY_TO_FILE_TYPE: Record<string, string> = {
  cad: "cad",
  bim: "bim",
  memoria_in: "memoria_in",
  memoria_out: "memoria_out",
  memoria_firmada: "memoria_firmada",
  otro: "otro",
};

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

  const {
    project_id,
    file_id,
    filename,
    size_bytes,
    category,
    provider,
    mime_type,
    external_url,
    storage_path,
  } = body || {};

  if (!project_id || !file_id || !filename || !size_bytes || !category || !provider) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }
  const fileType = CATEGORY_TO_FILE_TYPE[category];
  if (!fileType) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  // Verificar pertenencia
  const { data: project } = await supabase
    .from("projects")
    .select("id, user_id")
    .eq("id", project_id)
    .single();
  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { error: insErr, data: inserted } = await supabase
    .from("files")
    .insert({
      id: file_id,
      project_id,
      user_id: user.id,
      type: fileType,
      filename,
      storage_path: storage_path || `${provider}://${user.id}/${project_id}/${file_id}`,
      size_bytes,
      mime_type: mime_type || null,
      status: "uploaded",
      external_storage_provider: provider,
      external_url: external_url || null,
      category,
      original_extension: extOf(filename),
    })
    .select()
    .single();

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, file: inserted });
}
