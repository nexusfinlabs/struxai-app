import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/app/ProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">Mi perfil</h1>
      <p className="mt-1 text-sm text-slate-500">
        Gestiona tu informacion personal. El email no se puede modificar.
      </p>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}
