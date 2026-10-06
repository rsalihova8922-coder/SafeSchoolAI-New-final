CREATE SCHEMA IF NOT EXISTS private;
CREATE FUNCTION private.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
DROP POLICY "Assigned staff view support actions" ON public.support_actions;
DROP POLICY "Assigned staff add support actions" ON public.support_actions;
CREATE POLICY "Assigned staff view support actions" ON public.support_actions FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'teacher') OR private.has_role(auth.uid(), 'psychologist'));
CREATE POLICY "Assigned staff add support actions" ON public.support_actions FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'teacher') OR private.has_role(auth.uid(), 'psychologist')));
DROP FUNCTION public.has_role(uuid, public.app_role);