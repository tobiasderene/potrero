-- ═══════════════════════════════════════════════════════════════
-- Fix: potrero_app no tiene USAGE sobre el schema "auth" (es de
-- supabase_auth_admin, "postgres" no tiene grant option sobre él y
-- tampoco es miembro de ese rol para poder SET ROLE).
--
-- Solución: wrapper SECURITY DEFINER en public, dueño "postgres"
-- (que sí tiene USAGE sobre auth). potrero_app solo necesita EXECUTE
-- sobre esta función, en un schema donde ya tiene acceso.
--
-- Pegar y correr entero en Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.current_uid()
RETURNS UUID
LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.current_uid() TO potrero_app;

-- Reemplazar las policies que llamaban a auth.uid() directamente
DROP POLICY IF EXISTS "crear establecimiento propio" ON establecimientos;
DROP POLICY IF EXISTS "ver mi establecimiento" ON establecimientos;
DROP POLICY IF EXISTS "actualizar mi establecimiento" ON establecimientos;

CREATE POLICY "crear establecimiento propio" ON establecimientos
    FOR INSERT WITH CHECK (public.current_uid() IS NOT NULL);
CREATE POLICY "ver mi establecimiento" ON establecimientos
    FOR SELECT USING (id IN (SELECT mis_establecimientos()));
CREATE POLICY "actualizar mi establecimiento" ON establecimientos
    FOR UPDATE USING (id IN (SELECT mis_establecimientos()))
    WITH CHECK (id IN (SELECT mis_establecimientos()));

DROP POLICY IF EXISTS "acceso propio" ON usuarios_establecimientos;
CREATE POLICY "acceso propio" ON usuarios_establecimientos
    FOR ALL USING (user_id = public.current_uid());
