# `sql/` — scripts SQL para Supabase

Scripts utilitarios para mantener el proyecto Supabase
[`wlxnehlpkpfmlgaythng`](https://supabase.com/dashboard/project/wlxnehlpkpfmlgaythng/sql) en buen estado.

Todos son **idempotentes**: pueden ejecutarse N veces seguidas sin
romper nada.

## Orden de ejecución recomendado

1. **`01-rls-policies.sql`** — RLS de `public.files` y de los buckets
   `cad-uploads` / `rvt-uploads` en `storage.objects`. Necesario para
   que la página `/app/uploads` funcione end-to-end.
2. **`02-diagnose-auth.sql`** — diagnóstico para investigar el error
   `Database error querying schema` al login. No modifica nada, solo
   imprime estado.
3. **`03-fix-auth-most-likely.sql`** — fix idempotente que reaplica
   tabla `profiles`, `user_settings`, función `handle_new_user`,
   trigger `on_auth_user_created` y backfill de users existentes. Solo
   ejecuta si el diagnóstico confirma el problema.

## Cómo aplicarlos

Dos opciones:

**A) SQL editor del Dashboard** (más rápido para uno o dos):

1. Abre https://supabase.com/dashboard/project/wlxnehlpkpfmlgaythng/sql
2. Copia el contenido del `.sql` y pégalo en el editor.
3. Run.

**B) `psql` en local** (mejor para flujo automatizable):

Necesitas la connection string de la BD (Dashboard → Project Settings
→ Database → Connection string). Después:

```sh
psql "$DATABASE_URL" -f sql/01-rls-policies.sql
psql "$DATABASE_URL" -f sql/02-diagnose-auth.sql
```
