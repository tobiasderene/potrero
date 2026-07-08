-- ═══════════════════════════════════════════════════════════════
-- Fix: RLS operativo — rol de aplicación sin BYPASSRLS + policies
-- corregidas de establecimientos + usuarios_establecimientos.
--
-- El backend corría con el rol "postgres" (BYPASSRLS por defecto en
-- Supabase), así que ninguna policy RLS se aplicaba de verdad. Este
-- script crea un rol nuevo sin ese privilegio y corrige dos bugs de
-- la migración 0001 que quedaban invisibles mientras RLS no se
-- aplicaba: la policy de "establecimientos" bloqueaba su propia
-- creación (exige ver su id antes de que exista el vínculo en
-- usuarios_establecimientos), y esa tabla de vínculos no tenía RLS.
--
-- Reemplazá el placeholder de password antes de correr. Pegar y
-- correr entero en Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════

-- ── Rol de aplicación ──────────────────────────────────────────
CREATE ROLE potrero_app WITH LOGIN PASSWORD '<REEMPLAZAR_CON_PASSWORD_SEGURO>'
    NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;

GRANT USAGE ON SCHEMA public TO potrero_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO potrero_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO potrero_app;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO potrero_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT EXECUTE ON FUNCTIONS TO potrero_app;

-- Si esta línea da error de permisos, comentala y seguí: auth.uid()
-- ya suele estar otorgada a PUBLIC en proyectos Supabase estándar.
GRANT USAGE ON SCHEMA auth TO potrero_app;
GRANT EXECUTE ON FUNCTION auth.uid() TO potrero_app;

-- ── Fix: usuarios_establecimientos no tenía RLS ──────────────────
ALTER TABLE usuarios_establecimientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acceso propio" ON usuarios_establecimientos
    FOR ALL USING (user_id = auth.uid());

-- ── Fix: policy de establecimientos bloqueaba su propia creación ─
DROP POLICY IF EXISTS "acceso por establecimiento" ON establecimientos;

CREATE POLICY "crear establecimiento propio" ON establecimientos
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ver mi establecimiento" ON establecimientos
    FOR SELECT USING (id IN (SELECT mis_establecimientos()));
CREATE POLICY "actualizar mi establecimiento" ON establecimientos
    FOR UPDATE USING (id IN (SELECT mis_establecimientos()))
    WITH CHECK (id IN (SELECT mis_establecimientos()));

-- No toca alembic_version: este parche alinea la base con la versión
-- ya corregida de 0001_initial_schema.py/.sql, no es una revisión nueva.
