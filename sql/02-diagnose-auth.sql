-- Diagnóstico del error "Database error querying schema" al hacer login.
-- Pegar en https://supabase.com/dashboard/project/wlxnehlpkpfmlgaythng/sql y ejecutar entero.
--
-- Cada SELECT te da una pista:
--   1. Tablas en public — si falta user_settings o profiles, ese es el bug.
--   2. Estructura de user_settings y profiles — busca columnas NOT NULL sin default.
--   3. RLS y policies sobre esas tablas.
--   4. Trigger on_auth_user_created sobre auth.users.
--   5. Definición de la función handle_new_user (security definer / search_path).
--   6. Permisos del owner de la función — si falta BYPASSRLS o no tiene grants, INSERT falla.
--   7. Últimos errores en auth.audit_log_entries.

-- 1. Tablas que el flujo necesita
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles','user_settings','plans','projects','files','outputs','subscriptions')
order by table_name;

-- 2. Columnas de user_settings (busca columnas not null sin default además de user_id)
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'user_settings'
order by ordinal_position;

-- 2b. Columnas de profiles
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
order by ordinal_position;

-- 3. RLS y policies sobre profiles y user_settings
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename in ('profiles','user_settings');

select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in ('profiles','user_settings')
order by tablename, policyname;

-- 4. Triggers sobre auth.users
select tgname,
       tgenabled,
       pg_get_triggerdef(oid) as trigger_def
from pg_trigger
where tgrelid = 'auth.users'::regclass
  and not tgisinternal;

-- 5. Definición de handle_new_user
select proname,
       prosecdef as is_security_definer,
       proowner::regrole as owner,
       proconfig as config,
       pg_get_functiondef(oid) as function_def
from pg_proc
where proname = 'handle_new_user' and pronamespace = 'public'::regnamespace;

-- 6. ¿El owner de la función puede insertar en las tablas? (debe ser postgres/supabase_admin)
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('profiles','user_settings')
  and grantee in ('postgres','supabase_admin','authenticated','anon','service_role')
order by table_name, grantee;

-- 7. Últimas entradas del audit log de auth (errores recientes)
select created_at, payload->>'action' as action, payload->'traits'->>'user_email' as email,
       payload->>'log_type' as log_type, payload
from auth.audit_log_entries
order by created_at desc
limit 15;
