-- ============================================================
-- STRUXAI App - Migración 0003: Rediseño de planes
-- ============================================================
-- Aplicada vía MCP el 2026-04-29.
-- 'pro' renombrado a "Studio Pro" (id legacy mantenido para no
-- romper FK en subscriptions).
-- ============================================================

-- ACADEMIC (49 EUR/mes)
update public.plans
set max_files_per_month = 2, max_compute_hours = 2, max_storage_gb = 2, max_engines = 1, max_users = 1,
    features = '[
      "1 motor de cálculo",
      "2 archivos subidos al mes",
      "2 h de cálculo",
      "2 GB storage",
      "Sin memoria",
      "Solo entornos universitarios"
    ]'::jsonb
where id = 'academic';

-- FREELANCE (199 EUR/mes)
update public.plans
set max_files_per_month = 5, max_compute_hours = 5, max_storage_gb = 5, max_engines = 1, max_users = 1,
    features = '[
      "1 motor (CYPECAD)",
      "5 archivos al mes",
      "5 h de cálculo",
      "5 GB storage",
      "Memoria PDF básica con marca de agua",
      "Normativa ES + CL"
    ]'::jsonb
where id = 'freelance';

-- BASIC (499 EUR/mes)
update public.plans
set max_files_per_month = 10, max_compute_hours = 10, max_storage_gb = 10, max_engines = 1, max_users = 1,
    features = '[
      "1 motor de cálculo",
      "10 archivos al mes",
      "10 h de cálculo al mes",
      "10 GB storage",
      "Memoria PDF básica",
      "Soporte email 48h"
    ]'::jsonb
where id = 'basic';

-- STUDIO (699 EUR/mes)
update public.plans
set max_files_per_month = 20, max_compute_hours = 20, max_storage_gb = 20, max_engines = 2, max_users = 3,
    features = '[
      "2 motores simultáneos",
      "20 archivos al mes",
      "20 h de cálculo al mes",
      "20 GB storage",
      "Memoria PDF + DXF",
      "Equipo hasta 3 personas",
      "Soporte priorizado"
    ]'::jsonb
where id = 'studio';

-- STUDIO PRO (id legacy 'pro') — 999 EUR/mes
update public.plans
set display_name = 'Studio Pro', category = 'client', monthly_price_eur = 999,
    max_files_per_month = 30, max_compute_hours = 30, max_storage_gb = 30, max_engines = 3, max_users = 5,
    features = '[
      "3 motores simultáneos",
      "30 archivos al mes",
      "30 h de cálculo al mes",
      "30 GB storage",
      "Memoria PDF + DXF",
      "Equipo hasta 5 personas",
      "Comparativa de revisiones",
      "Plugins Revit / CAD"
    ]'::jsonb
where id = 'pro';

-- PREMIUM (1999 EUR/mes)
update public.plans
set max_files_per_month = 40, max_compute_hours = 40, max_storage_gb = 40, max_engines = 99, max_users = 5,
    features = '[
      "Todos los motores simultáneos",
      "40 archivos al mes",
      "40 h de cálculo al mes",
      "40 GB storage",
      "Memoria PDF + DXF + IFC + Revit Sync",
      "Equipo hasta 5 personas",
      "Comparativa de revisiones",
      "API Access con MCP Servers",
      "Onboarding 1:1",
      "SLA 99.9%"
    ]'::jsonb
where id = 'premium';

-- ENTERPRISE (2999 EUR/mes) — 100 GB storage (2.5x Premium)
update public.plans
set max_files_per_month = 50, max_compute_hours = 50, max_storage_gb = 100, max_engines = 99, max_users = 5,
    features = '[
      "Todos los motores simultáneos",
      "50 archivos al mes",
      "50 h de cálculo al mes",
      "100 GB storage",
      "Memorias White-label por país",
      "Equipo hasta 5 personas",
      "Comparativa de revisiones",
      "API Access ilimitada",
      "Onboarding dedicado",
      "SLA 99.99%",
      "Soporte 24/7"
    ]'::jsonb
where id = 'enterprise';

-- VOLUME (custom)
update public.plans
set features = '[
      "Cálculos masivos sin límite",
      "Todos los motores simultáneos",
      "Storage ilimitado",
      "Equipo ilimitado",
      "API dedicada",
      "Onboarding personalizado",
      "SLA 99.99% + soporte 24/7",
      "Single Sign-On (SSO)",
      "Servidor dedicado",
      "White-label completo",
      "Contrato anual / multi-anual"
    ]'::jsonb
where id = 'volume';
