BEGIN;

-- Sin argumentos: solo comprueba la identidad del JWT verificado por Supabase.
-- SECURITY DEFINER permite consultar la tabla privada sin exponerla a la API.
CREATE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM private.administrator
    WHERE user_id = (SELECT auth.uid())
  );
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

GRANT SELECT ON public.projects, public.columns, public.tasks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects, public.columns, public.tasks TO authenticated;

CREATE POLICY projects_published_read ON public.projects
FOR SELECT TO anon, authenticated USING (is_published);

CREATE POLICY columns_published_read ON public.columns
FOR SELECT TO anon, authenticated USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = columns.project_id AND p.is_published)
);

CREATE POLICY tasks_published_read ON public.tasks
FOR SELECT TO anon, authenticated USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = tasks.project_id AND p.is_published)
);

CREATE POLICY projects_admin_all ON public.projects
FOR ALL TO authenticated
USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY columns_admin_all ON public.columns
FOR ALL TO authenticated
USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY tasks_admin_all ON public.tasks
FOR ALL TO authenticated
USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

COMMIT;
