CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'psychologist');
CREATE TABLE public.user_roles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 role public.app_role NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can see own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
CREATE TABLE public.support_actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 student_id text NOT NULL,
 school text NOT NULL,
 class_name text NOT NULL,
 action_date date NOT NULL,
 action_type text NOT NULL CHECK (action_type IN ('psychologist','teacher','follow_up','current')),
 specialist text NOT NULL,
 note text NOT NULL,
 next_review_date date,
 status text NOT NULL CHECK (status IN ('in_progress','monitoring','stabilized','needs_support')),
 created_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT support_school CHECK (school = '№50 КЕЛЕШЕК жалпы білім беретін орта мектеп')
);
GRANT SELECT, INSERT ON public.support_actions TO authenticated;
GRANT ALL ON public.support_actions TO service_role;
ALTER TABLE public.support_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Assigned staff view support actions" ON public.support_actions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'psychologist'));
CREATE POLICY "Assigned staff add support actions" ON public.support_actions FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'psychologist')));
CREATE INDEX support_actions_student_idx ON public.support_actions (school, student_id, action_date DESC);
CREATE FUNCTION public.touch_support_actions() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER support_actions_updated BEFORE UPDATE ON public.support_actions FOR EACH ROW EXECUTE FUNCTION public.touch_support_actions();