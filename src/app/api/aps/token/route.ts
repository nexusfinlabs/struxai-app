// ============================================================
// GET /api/aps/token
// ------------------------------------------------------------
// Resp: { access_token, expires_in }
// Token sólo `viewables:read` para el Autodesk Viewer en navegador.
// El usuario debe estar autenticado (no exponemos a anónimos).
// ============================================================

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isApsConfigured, readApsConfig, getViewerToken } from "@/lib/aps/client";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isApsConfigured()) {
    return NextResponse.json({ error: "APS not configured" }, { status: 503 });
  }
  const cfg = readApsConfig()!;
  try {
    const tok = await getViewerToken(cfg);
    return NextResponse.json({
      access_token: tok.access_token,
      expires_in: tok.expires_in,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "APS token error" }, { status: 502 });
  }
}
