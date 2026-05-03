-- ============================================================
-- 0004_files_metadata.sql
-- ------------------------------------------------------------
-- Añade columna `metadata jsonb` a public.files para almacenar
-- datos opcionales por archivo:
--   * aps_urn        — URN base64url del modelo en APS / Forge
--                      tras subirlo al bucket OSS y lanzar la
--                      traducción Model Derivative.
--   * aps_status     — último estado conocido del manifest.
--   * thumbnail_url  — opcional, miniatura cacheada.
--   * (libre para extensiones futuras)
-- ============================================================

alter table public.files
  add column if not exists metadata jsonb;

create index if not exists idx_files_metadata_aps_urn
  on public.files ((metadata->>'aps_urn'))
  where metadata ? 'aps_urn';
