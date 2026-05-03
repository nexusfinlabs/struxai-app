// ============================================================
// GET /api/aps/status?urn=...
// ------------------------------------------------------------
// Resp: { status, progress, derivatives? }
// Permite al cliente hacer polling mientras la traducción avanza.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isApsConfigured, readApsConfig, getManifest } from "@/lib/aps/client";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isApsConfigured()) {
    return NextResponse.json({ error: "APS not configured" }, { status: 503 });
  }

  const urn = req.nextUrl.searchParams.get("urn");
  if (!urn) return NextResponse.json({ error: "Missing urn" }, { status: 400 });

  const cfg = readApsConfig()!;
  try {
    const manifest = await getManifest(cfg, urn);
    if (!manifest) {
      return NextResponse.json({ status: "pending", progress: "0%" });
    }
    return NextResponse.json({
      status: manifest.status,
      progress: manifest.progress,
      derivatives: manifest.derivatives,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "APS error" }, { status: 502 });
  }
}
