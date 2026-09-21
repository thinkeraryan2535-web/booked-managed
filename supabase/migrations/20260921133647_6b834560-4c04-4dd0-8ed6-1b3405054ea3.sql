CREATE TYPE public.app_role AS ENUM ('admin', 'team_member');
CREATE TYPE public.booking_status AS ENUM ('upcoming', 'today', 'completed');
CREATE TYPE public.task_priority AS ENUM ('high', 'medium', 'low');
CREATE TYPE public.task_status AS ENUM ('pending', 'done');
CREATE TYPE public.presence_status AS ENUM ('online', 'offline');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  avatar_url text,
  presence public.presence_status NOT NULL DEFAULT 'offline',
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read roles" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL CHECK (char_length(client_name) BETWEEN 1 AND 120),
  contact_person text CHECK (contact_person IS NULL OR char_length(contact_person) <= 120),
  phone text NOT NULL CHECK (char_length(phone) BETWEEN 7 AND 24),
  email text CHECK (email IS NULL OR char_length(email) <= 255),
  event_type text NOT NULL CHECK (char_length(event_type) <= 80),
  event_date date NOT NULL,
  event_time time,
  fy_label text NOT NULL CHECK (fy_label ~ '^[0-9]{4}-[0-9]{2}$'),
  venue_text text NOT NULL CHECK (char_length(venue_text) <= 1000),
  advance_payment numeric(14,2) NOT NULL DEFAULT 0 CHECK (advance_payment >= 0),
  total_budget numeric(14,2) NOT NULL DEFAULT 0 CHECK (total_budget >= 0),
  spent_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (spent_amount >= 0),
  hall_name text NOT NULL CHECK (char_length(hall_name) <= 160),
  hall_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK (hall_cost >= 0),
  people_count integer NOT NULL CHECK (people_count > 0),
  special_demand text CHECK (special_demand IS NULL OR char_length(special_demand) <= 2000),
  extra_activities jsonb NOT NULL DEFAULT '[]'::jsonb,
  assigned_team_member_ids uuid[] NOT NULL DEFAULT '{}',
  status public.booking_status NOT NULL DEFAULT 'upcoming',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view bookings" ON public.bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team can create bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Creators and admins update bookings" ON public.bookings FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins archive bookings" ON public.bookings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 240),
  assignee_id uuid,
  due_date date NOT NULL,
  due_time time,
  priority public.task_priority NOT NULL DEFAULT 'medium',
  status public.task_status NOT NULL DEFAULT 'pending',
  scope text NOT NULL DEFAULT 'team' CHECK (scope IN ('my', 'team')),
  completed_at timestamptz,
  last_updated_by uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team can create tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Assignees creators and admins update tasks" ON public.tasks FOR UPDATE TO authenticated USING (assignee_id = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (assignee_id = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins archive tasks" ON public.tasks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL,
  type text NOT NULL CHECK (char_length(type) <= 60),
  title text NOT NULL CHECK (char_length(title) <= 160),
  description text NOT NULL CHECK (char_length(description) <= 600),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own notifications" ON public.notifications FOR SELECT TO authenticated USING (recipient_id = auth.uid());
CREATE POLICY "Members update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());
CREATE POLICY "Admins create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members remove own notifications" ON public.notifications FOR DELETE TO authenticated USING (recipient_id = auth.uid());

CREATE TABLE public.revenue_archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fy_label text NOT NULL UNIQUE CHECK (fy_label ~ '^[0-9]{4}-[0-9]{2}$'),
  total_amount numeric(16,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  booking_records jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revenue_archives TO authenticated;
GRANT ALL ON public.revenue_archives TO service_role;
ALTER TABLE public.revenue_archives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view revenue archives" ON public.revenue_archives FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage revenue archives" ON public.revenue_archives FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER revenue_archives_updated_at BEFORE UPDATE ON public.revenue_archives FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;