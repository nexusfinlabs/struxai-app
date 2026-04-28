"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================================
// Server Action: createProject
// ------------------------------------------------------------
// El cliente NO necesita llamar a auth.getUser() — el SSR client
// del servidor lee la cookie directamente y resuelve el user.id
// de forma fiable. Evita el falso "Sesión expirada" cuando el
// browser client aún no ha hidratado la sesión.
// ============================================================

export type CreateProjectInput = {
  name: string;
  description?: string | null;
  project_type: string;
  material_main: string;
  jurisdiction: string;
  cover_color?: string | null;
};

export async function createProjectAction(input: CreateProjectInput) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return { ok: false as const, error: "No autenticado. Vuelve a iniciar sesión." };
  }

  const cleanName = (input.name || "").trim();
  if (!cleanName) {
    return { ok: false as const, error: "El nombre es obligatorio." };
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name: cleanName,
      description: (input.description || "").trim() || null,
      project_type: input.project_type,
      material_main: input.material_main,
      jurisdiction: input.jurisdiction,
      cover_color: input.cover_color || "#0ea5e9",
      status: "draft",
    })
    .select()
    .single();

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/app/projects");
  return { ok: true as const, project: data };
}

export async function deleteProjectAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return { ok: false as const, error: "No autenticado." };
  }

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/app/projects");
  return { ok: true as const };
}
