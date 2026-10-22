-- ============================================================================
-- NIVASA: Complete Supabase Database Schema Migration
-- Migration: 20261022_complete_schema.sql
--
-- This migration creates all required tables, relationships, constraints,
-- indexes, triggers, and Row-Level Security (RLS) policies for NIVASA.
--
-- Non-destructive: Uses CREATE TABLE IF NOT EXISTS and DROP POLICY IF EXISTS.
-- Does NOT drop tables, reset the database, or delete existing data.
--
-- Supported Roles:
--   • super_admin   (full access across all hostels)
--   • boys_admin    (isolated to boys' hostel)
--   • girls_admin   (isolated to girls' hostel)
--   • student       (own-record isolation for fees, movements, grievances)
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 2. HELPER FUNCTIONS
-- ----------------------------------------------------------------------------

-- Extract trusted role from JWT app_metadata (with fallback to user_metadata)
CREATE OR REPLACE FUNCTION public.current_role()
RETURNS TEXT AS $$
  SELECT coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role',
    'anon'
  );
$$ LANGUAGE sql STABLE;

-- Extract hostel scope for admins from JWT
CREATE OR REPLACE FUNCTION public.current_admin_hostel()
RETURNS TEXT AS $$
  SELECT CASE
    WHEN (public.current_role()) = 'boys_admin' THEN 'boys'
    WHEN (public.current_role()) = 'girls_admin' THEN 'girls'
    ELSE NULL
  END;
$$ LANGUAGE sql STABLE;

-- Lookup student ID linked to current authenticated user
CREATE OR REPLACE FUNCTION public.current_student_id()
RETURNS UUID AS $$
  SELECT id FROM public.students WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 3. TABLES DEFINITION
-- ----------------------------------------------------------------------------

-- A. ROOMS
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number TEXT NOT NULL,
  number TEXT GENERATED ALWAYS AS (room_number) STORED,
  hostel TEXT NOT NULL CHECK (hostel IN ('boys', 'girls')),
  floor INTEGER NOT NULL DEFAULT 1,
  block TEXT NOT NULL DEFAULT 'A',
  capacity INTEGER NOT NULL DEFAULT 2,
  occupied INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'full', 'maintenance')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_hostel_number ON public.rooms(hostel, room_number);
CREATE INDEX IF NOT EXISTS idx_rooms_hostel_floor ON public.rooms(hostel, floor);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);

-- B. STUDENTS
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  usn TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  department TEXT,
  year TEXT,
  semester TEXT,
  hostel TEXT NOT NULL CHECK (hostel IN ('boys', 'girls')),
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  guardian_name TEXT,
  guardian_phone TEXT,
  guardian_details JSONB DEFAULT '{}'::jsonb,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'graduated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_usn ON public.students(usn);
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_auth_id ON public.students(auth_id) WHERE auth_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_hostel ON public.students(hostel);
CREATE INDEX IF NOT EXISTS idx_students_room_id ON public.students(room_id);
CREATE INDEX IF NOT EXISTS idx_students_full_name ON public.students(full_name);

-- C. ALLOCATIONS
CREATE TABLE IF NOT EXISTS public.allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deallocated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_allocations_student ON public.allocations(student_id);
CREATE INDEX IF NOT EXISTS idx_allocations_room ON public.allocations(room_id);

-- D. FEES
CREATE TABLE IF NOT EXISTS public.fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  balance NUMERIC(10,2) GENERATED ALWAYS AS (amount - paid_amount) STORED,
  fee_type TEXT NOT NULL DEFAULT 'Hostel Fee',
  category TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'overdue')),
  due_date DATE,
  paid_date DATE,
  term TEXT,
  academic_term TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fees_student ON public.fees(student_id);
CREATE INDEX IF NOT EXISTS idx_fees_status ON public.fees(status);
CREATE INDEX IF NOT EXISTS idx_fees_due_date ON public.fees(due_date);

-- E. MOVEMENTS (In / Out Register)
CREATE TABLE IF NOT EXISTS public.movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL DEFAULT 'exit',
  type TEXT,
  reason TEXT,
  purpose TEXT,
  destination TEXT,
  status TEXT NOT NULL DEFAULT 'out' CHECK (status IN ('out', 'returned', 'pending', 'approved', 'rejected', 'cancelled')),
  check_out_time TIMESTAMPTZ DEFAULT now(),
  departure_time TIMESTAMPTZ,
  expected_return_time TIMESTAMPTZ,
  expected_return TIMESTAMPTZ,
  actual_return_time TIMESTAMPTZ,
  actual_return TIMESTAMPTZ,
  hostel TEXT,
  remarks TEXT,
  student_name TEXT,
  usn TEXT,
  room TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movements_student ON public.movements(student_id);
CREATE INDEX IF NOT EXISTS idx_movements_status ON public.movements(status);
CREATE INDEX IF NOT EXISTS idx_movements_created_at ON public.movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_hostel ON public.movements(hostel);

-- F. GRIEVANCES
CREATE TABLE IF NOT EXISTS public.grievances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  response TEXT,
  responses JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grievances_student ON public.grievances(student_id);
CREATE INDEX IF NOT EXISTS idx_grievances_status ON public.grievances(status);
CREATE INDEX IF NOT EXISTS idx_grievances_created_at ON public.grievances(created_at DESC);

-- G. MESS
CREATE TABLE IF NOT EXISTS public.mess (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day TEXT NOT NULL,
  date DATE,
  breakfast JSONB NOT NULL DEFAULT '{"items": [], "time": "7:00 AM - 9:00 AM"}'::jsonb,
  lunch JSONB NOT NULL DEFAULT '{"items": [], "time": "12:00 PM - 2:00 PM"}'::jsonb,
  snacks JSONB NOT NULL DEFAULT '{"items": [], "time": "4:00 PM - 5:00 PM"}'::jsonb,
  dinner JSONB NOT NULL DEFAULT '{"items": [], "time": "7:00 PM - 9:00 PM"}'::jsonb,
  hostel TEXT NOT NULL DEFAULT 'all',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mess_day ON public.mess(day);
CREATE INDEX IF NOT EXISTS idx_mess_date ON public.mess(date);

-- H. NOTICES
CREATE TABLE IF NOT EXISTS public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  body TEXT,
  audience TEXT NOT NULL DEFAULT 'all',
  target_audience TEXT,
  published_by TEXT NOT NULL DEFAULT 'Admin',
  author TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notices_audience ON public.notices(audience);
CREATE INDEX IF NOT EXISTS idx_notices_status ON public.notices(status);
CREATE INDEX IF NOT EXISTS idx_notices_created_at ON public.notices(created_at DESC);

-- ----------------------------------------------------------------------------
-- 4. TRIGGERS & AUTOMATION
-- ----------------------------------------------------------------------------

-- A. Auto-recalculate room occupancy when students table changes
CREATE OR REPLACE FUNCTION public.sync_room_occupancy()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.room_id IS NOT NULL THEN
      UPDATE public.rooms
      SET occupied = (SELECT count(*) FROM public.students WHERE room_id = OLD.room_id)
      WHERE id = OLD.room_id;
    END IF;
  ELSE
    IF NEW.room_id IS NOT NULL THEN
      UPDATE public.rooms
      SET occupied = (SELECT count(*) FROM public.students WHERE room_id = NEW.room_id)
      WHERE id = NEW.room_id;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.room_id IS NOT NULL AND OLD.room_id != coalesce(NEW.room_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
      UPDATE public.rooms
      SET occupied = (SELECT count(*) FROM public.students WHERE room_id = OLD.room_id)
      WHERE id = OLD.room_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_room_occupancy ON public.students;
CREATE TRIGGER trigger_sync_room_occupancy
AFTER INSERT OR UPDATE OR DELETE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.sync_room_occupancy();

-- B. Sync movement aliases and lookups
CREATE OR REPLACE FUNCTION public.set_movement_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- Resolve student_id if usn is provided
  IF NEW.student_id IS NULL AND NEW.usn IS NOT NULL THEN
    SELECT id, full_name, hostel INTO NEW.student_id, NEW.student_name, NEW.hostel
    FROM public.students WHERE usn = NEW.usn LIMIT 1;
  END IF;

  -- Populate student_name/usn/hostel from students record if available
  IF NEW.student_id IS NOT NULL AND (NEW.student_name IS NULL OR NEW.usn IS NULL OR NEW.hostel IS NULL) THEN
    SELECT full_name, usn, hostel INTO NEW.student_name, NEW.usn, NEW.hostel
    FROM public.students WHERE id = NEW.student_id LIMIT 1;
  END IF;

  -- Synchronize time columns
  IF NEW.departure_time IS NULL AND NEW.check_out_time IS NOT NULL THEN
    NEW.departure_time := NEW.check_out_time;
  ELSIF NEW.check_out_time IS NULL AND NEW.departure_time IS NOT NULL THEN
    NEW.check_out_time := NEW.departure_time;
  END IF;

  IF NEW.expected_return IS NULL AND NEW.expected_return_time IS NOT NULL THEN
    NEW.expected_return := NEW.expected_return_time;
  ELSIF NEW.expected_return_time IS NULL AND NEW.expected_return IS NOT NULL THEN
    NEW.expected_return_time := NEW.expected_return;
  END IF;

  IF NEW.actual_return IS NULL AND NEW.actual_return_time IS NOT NULL THEN
    NEW.actual_return := NEW.actual_return_time;
  ELSIF NEW.actual_return_time IS NULL AND NEW.actual_return IS NOT NULL THEN
    NEW.actual_return_time := NEW.actual_return;
  END IF;

  -- Synchronize text aliases
  IF NEW.purpose IS NULL AND NEW.reason IS NOT NULL THEN
    NEW.purpose := NEW.reason;
  ELSIF NEW.reason IS NULL AND NEW.purpose IS NOT NULL THEN
    NEW.reason := NEW.purpose;
  END IF;

  IF NEW.type IS NULL AND NEW.movement_type IS NOT NULL THEN
    NEW.type := NEW.movement_type;
  ELSIF NEW.movement_type IS NULL AND NEW.type IS NOT NULL THEN
    NEW.movement_type := NEW.type;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_movement_defaults ON public.movements;
CREATE TRIGGER trigger_set_movement_defaults
BEFORE INSERT OR UPDATE ON public.movements
FOR EACH ROW EXECUTE FUNCTION public.set_movement_defaults();

-- C. Sync grievances aliases
CREATE OR REPLACE FUNCTION public.set_grievance_defaults()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.title IS NULL AND NEW.subject IS NOT NULL THEN
    NEW.title := NEW.subject;
  ELSIF NEW.subject IS NULL AND NEW.title IS NOT NULL THEN
    NEW.subject := NEW.title;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_grievance_defaults ON public.grievances;
CREATE TRIGGER trigger_set_grievance_defaults
BEFORE INSERT OR UPDATE ON public.grievances
FOR EACH ROW EXECUTE FUNCTION public.set_grievance_defaults();

-- D. Sync notices aliases
CREATE OR REPLACE FUNCTION public.set_notice_defaults()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.content IS NULL AND NEW.body IS NOT NULL THEN
    NEW.content := NEW.body;
  ELSIF NEW.body IS NULL AND NEW.content IS NOT NULL THEN
    NEW.body := NEW.content;
  END IF;

  IF NEW.author IS NULL AND NEW.published_by IS NOT NULL THEN
    NEW.author := NEW.published_by;
  ELSIF NEW.published_by IS NULL AND NEW.author IS NOT NULL THEN
    NEW.published_by := NEW.author;
  END IF;

  IF NEW.target_audience IS NULL AND NEW.audience IS NOT NULL THEN
    NEW.target_audience := NEW.audience;
  ELSIF NEW.audience IS NULL AND NEW.target_audience IS NOT NULL THEN
    NEW.audience := NEW.target_audience;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_notice_defaults ON public.notices;
CREATE TRIGGER trigger_set_notice_defaults
BEFORE INSERT OR UPDATE ON public.notices
FOR EACH ROW EXECUTE FUNCTION public.set_notice_defaults();

-- E. Sync fee aliases
CREATE OR REPLACE FUNCTION public.set_fee_defaults()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.fee_type IS NULL AND NEW.category IS NOT NULL THEN
    NEW.fee_type := NEW.category;
  ELSIF NEW.category IS NULL AND NEW.fee_type IS NOT NULL THEN
    NEW.category := NEW.fee_type;
  END IF;

  IF NEW.academic_term IS NULL AND NEW.term IS NOT NULL THEN
    NEW.academic_term := NEW.term;
  ELSIF NEW.term IS NULL AND NEW.academic_term IS NOT NULL THEN
    NEW.term := NEW.academic_term;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_fee_defaults ON public.fees;
CREATE TRIGGER trigger_set_fee_defaults
BEFORE INSERT OR UPDATE ON public.fees
FOR EACH ROW EXECUTE FUNCTION public.set_fee_defaults();

-- F. Apply updated_at trigger to all tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['rooms', 'students', 'allocations', 'fees', 'movements', 'grievances', 'mess', 'notices'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. GRANTS & PERMISSIONS
-- ----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;

-- ----------------------------------------------------------------------------
-- 6. ROW-LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grievances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mess ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- Clean existing policies for idempotency
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN ('rooms', 'students', 'allocations', 'fees', 'movements', 'grievances', 'mess', 'notices')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END;
$$;

-- ROOMS POLICIES
-- Super admin has all privileges
CREATE POLICY "rooms_super_admin" ON public.rooms
  FOR ALL TO authenticated
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- Hostel admins can read and update rooms in their hostel
CREATE POLICY "rooms_hostel_admin" ON public.rooms
  FOR ALL TO authenticated
  USING (hostel = public.current_admin_hostel())
  WITH CHECK (hostel = public.current_admin_hostel());

-- Students and anon can view all rooms
CREATE POLICY "rooms_read_all" ON public.rooms
  FOR SELECT TO authenticated, anon
  USING (true);


-- STUDENTS POLICIES
-- Super admin full access
CREATE POLICY "students_super_admin" ON public.students
  FOR ALL TO authenticated
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- Hostel admins manage students in their hostel
CREATE POLICY "students_hostel_admin" ON public.students
  FOR ALL TO authenticated
  USING (hostel = public.current_admin_hostel())
  WITH CHECK (hostel = public.current_admin_hostel());

-- Students can read only their own record
CREATE POLICY "students_own_record" ON public.students
  FOR SELECT TO authenticated
  USING (auth_id = auth.uid());


-- ALLOCATIONS POLICIES
-- Super admin full access
CREATE POLICY "allocations_super_admin" ON public.allocations
  FOR ALL TO authenticated
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- Hostel admins can manage allocations for students in their hostel
CREATE POLICY "allocations_hostel_admin" ON public.allocations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = allocations.student_id
        AND s.hostel = public.current_admin_hostel()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = allocations.student_id
        AND s.hostel = public.current_admin_hostel()
    )
  );

-- Students can view their own allocations
CREATE POLICY "allocations_student_view" ON public.allocations
  FOR SELECT TO authenticated
  USING (student_id = public.current_student_id());


-- FEES POLICIES
-- Super admin full access
CREATE POLICY "fees_super_admin" ON public.fees
  FOR ALL TO authenticated
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- Hostel admins can manage fees for students in their hostel
CREATE POLICY "fees_hostel_admin" ON public.fees
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = fees.student_id
        AND s.hostel = public.current_admin_hostel()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = fees.student_id
        AND s.hostel = public.current_admin_hostel()
    )
  );

-- Students can only read their own fees
CREATE POLICY "fees_student_view" ON public.fees
  FOR SELECT TO authenticated
  USING (student_id = public.current_student_id());


-- MOVEMENTS POLICIES
-- Super admin full access
CREATE POLICY "movements_super_admin" ON public.movements
  FOR ALL TO authenticated
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- Hostel admins manage movements for students in their hostel
CREATE POLICY "movements_hostel_admin" ON public.movements
  FOR ALL TO authenticated
  USING (
    hostel = public.current_admin_hostel()
    OR EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = movements.student_id
        AND s.hostel = public.current_admin_hostel()
    )
  )
  WITH CHECK (
    hostel = public.current_admin_hostel()
    OR EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = movements.student_id
        AND s.hostel = public.current_admin_hostel()
    )
  );

-- Students can view, submit, and update (return) their own movements
CREATE POLICY "movements_student_select" ON public.movements
  FOR SELECT TO authenticated
  USING (student_id = public.current_student_id());

CREATE POLICY "movements_student_insert" ON public.movements
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = public.current_student_id()
    OR student_id IS NULL
  );

CREATE POLICY "movements_student_update" ON public.movements
  FOR UPDATE TO authenticated
  USING (student_id = public.current_student_id())
  WITH CHECK (student_id = public.current_student_id());


-- GRIEVANCES POLICIES
-- Super admin full access
CREATE POLICY "grievances_super_admin" ON public.grievances
  FOR ALL TO authenticated
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- Hostel admins manage grievances for their hostel
CREATE POLICY "grievances_hostel_admin" ON public.grievances
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = grievances.student_id
        AND s.hostel = public.current_admin_hostel()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = grievances.student_id
        AND s.hostel = public.current_admin_hostel()
    )
  );

-- Students can view and create their own grievances
CREATE POLICY "grievances_student_select" ON public.grievances
  FOR SELECT TO authenticated
  USING (student_id = public.current_student_id());

CREATE POLICY "grievances_student_insert" ON public.grievances
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = public.current_student_id()
    OR student_id IS NULL
  );


-- MESS POLICIES
-- Super admin full access
CREATE POLICY "mess_super_admin" ON public.mess
  FOR ALL TO authenticated
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- Hostel admins manage mess
CREATE POLICY "mess_hostel_admin" ON public.mess
  FOR ALL TO authenticated
  USING (public.current_role() IN ('boys_admin', 'girls_admin'))
  WITH CHECK (public.current_role() IN ('boys_admin', 'girls_admin'));

-- Anyone authenticated or anon can read mess menu
CREATE POLICY "mess_read_all" ON public.mess
  FOR SELECT TO authenticated, anon
  USING (true);


-- NOTICES POLICIES
-- Super admin full access
CREATE POLICY "notices_super_admin" ON public.notices
  FOR ALL TO authenticated
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- Hostel admins can manage notices
CREATE POLICY "notices_hostel_admin" ON public.notices
  FOR ALL TO authenticated
  USING (public.current_role() IN ('boys_admin', 'girls_admin'))
  WITH CHECK (public.current_role() IN ('boys_admin', 'girls_admin'));

-- Anyone authenticated or anon can read published notices
CREATE POLICY "notices_read_all" ON public.notices
  FOR SELECT TO authenticated, anon
  USING (status = 'published');

-- ----------------------------------------------------------------------------
-- 7. NOTIFY POSTGREST SCHEMA CACHE RELOAD
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
