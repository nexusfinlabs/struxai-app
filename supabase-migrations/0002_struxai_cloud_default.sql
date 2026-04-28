-- ============================================================
-- STRUXAI App - Migración 0002: STRUXAI Cloud por defecto
-- ============================================================
-- Tras la decisión de usar el VPS propio (140 GB libres) como
-- almacenamiento principal y dejar Cloudflare R2 solo como fallback,
-- cambiamos los defaults de user_settings.
--
-- Aplicar tras 0001_projects_overhaul.sql
-- ============================================================

alter table public.user_settings
  alter column struxai_cloud_optin set default true;

update public.user_settings
  set struxai_cloud_optin = true
  where struxai_cloud_optin is null or struxai_cloud_optin = false;

alter table public.user_settings
  alter column struxai_cloud_quota_gb set default 100;

update public.user_settings
  set struxai_cloud_quota_gb = 100
  where struxai_cloud_quota_gb is null or struxai_cloud_quota_gb = 50;

-- ============================================================
-- Verificación:
-- select user_id, struxai_cloud_optin, struxai_cloud_quota_gb
-- from public.user_settings limit 5;
-- ============================================================
