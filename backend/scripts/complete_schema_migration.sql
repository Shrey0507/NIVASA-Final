-- ============================================================================
-- NIVASA: Complete Supabase Database Schema Migration
-- Migration: 20261022_complete_schema.sql / complete_schema_migration.sql
--
-- Supported Roles:
--   • super_admin   (full access across all hostels)
--   • boys_admin    (isolated to boys' hostel)
--   • girls_admin   (isolated to girls' hostel)
--   • student       (own-record isolation for fees, movements, grievances)
--
-- Non-destructive: Uses CREATE TABLE IF NOT EXISTS and ALTER TABLE ADD COLUMN.
-- Tables are created FIRST to prevent forward-reference dependency errors.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 2. TABLES DEFINITION (Created before functions that reference them)
-- ----------------------------------------------------------------------------

-- A. ROOMS
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number TEXT NOT NULL,
  hostel TEXT NOT NULL CHECK (hostel IN ('boys', 'girls')),
  floor INTEGER NOT NULL DEFAULT 1,
  block TEXT NOT NULL DEFAULT 'A',
  capacity INTEGER NOT NULL DEFAULT 2,
  occupied INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'full', 'maintenance')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS floor INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS block TEXT NOT NULL DEFAULT 'A';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 2;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS occupied INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'available';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'number'
  ) THEN
    ALTER TABLE public.rooms ADD COLUMN number TEXT GENERATED ALWAYS AS (room_number) STORED;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'current_occupancy'
  ) THEN
    ALTER TABLE public.rooms ADD COLUMN current_occupancy INTEGER GENERATED ALWAYS AS (occupied) STORED;
  END IF;
END;
$$;

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

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS year TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS semester TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS guardian_name TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS guardian_phone TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS guardian_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

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

ALTER TABLE public.allocations ADD COLUMN IF NOT EXISTS allocated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.allocations ADD COLUMN IF NOT EXISTS deallocated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_allocations_student ON public.allocations(student_id);
CREATE INDEX IF NOT EXISTS idx_allocations_room ON public.allocations(room_id);


-- D. FEES
CREATE TABLE IF NOT EXISTS public.fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
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

ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS fee_type TEXT NOT NULL DEFAULT 'Hostel Fee';
ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS paid_date DATE;
ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS term TEXT;
ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS academic_term TEXT;
ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS remarks TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'fees' AND column_name = 'balance'
  ) THEN
    ALTER TABLE public.fees ADD COLUMN balance NUMERIC(10,2) GENERATED ALWAYS AS (amount - paid_amount) STORED;
  END IF;
END;
$$;

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
  "departureTime" TIMESTAMPTZ,
  expected_return_time TIMESTAMPTZ,
  expected_return TIMESTAMPTZ,
  "expectedReturn" TIMESTAMPTZ,
  actual_return_time TIMESTAMPTZ,
  actual_return TIMESTAMPTZ,
  "actualReturn" TIMESTAMPTZ,
  hostel TEXT,
  remarks TEXT,
  student_name TEXT,
  "studentName" TEXT,
  usn TEXT,
  room TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS movement_type TEXT NOT NULL DEFAULT 'exit';
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS destination TEXT;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'out';
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS departure_time TIMESTAMPTZ;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS "departureTime" TIMESTAMPTZ;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS expected_return_time TIMESTAMPTZ;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS expected_return TIMESTAMPTZ;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS "expectedReturn" TIMESTAMPTZ;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS actual_return_time TIMESTAMPTZ;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS actual_return TIMESTAMPTZ;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS "actualReturn" TIMESTAMPTZ;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS hostel TEXT;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS "studentName" TEXT;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS usn TEXT;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS room TEXT;

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

ALTER TABLE public.grievances ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.grievances ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';
ALTER TABLE public.grievances ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.grievances ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';
ALTER TABLE public.grievances ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE public.grievances ADD COLUMN IF NOT EXISTS response TEXT;
ALTER TABLE public.grievances ADD COLUMN IF NOT EXISTS responses JSONB NOT NULL DEFAULT '[]'::jsonb;

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

ALTER TABLE public.mess ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE public.mess ADD COLUMN IF NOT EXISTS breakfast JSONB NOT NULL DEFAULT '{"items": [], "time": "7:00 AM - 9:00 AM"}'::jsonb;
ALTER TABLE public.mess ADD COLUMN IF NOT EXISTS lunch JSONB NOT NULL DEFAULT '{"items": [], "time": "12:00 PM - 2:00 PM"}'::jsonb;
ALTER TABLE public.mess ADD COLUMN IF NOT EXISTS snacks JSONB NOT NULL DEFAULT '{"items": [], "time": "4:00 PM - 5:00 PM"}'::jsonb;
ALTER TABLE public.mess ADD COLUMN IF NOT EXISTS dinner JSONB NOT NULL DEFAULT '{"items": [], "time": "7:00 PM - 9:00 PM"}'::jsonb;
ALTER TABLE public.mess ADD COLUMN IF NOT EXISTS hostel TEXT NOT NULL DEFAULT 'all';

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

ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'all';
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS target_audience TEXT;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS published_by TEXT NOT NULL DEFAULT 'Admin';
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS author TEXT;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';

CREATE INDEX IF NOT EXISTS idx_notices_audience ON public.notices(audience);
CREATE INDEX IF NOT EXISTS idx_notices_status ON public.notices(status);
CREATE INDEX IF NOT EXISTS idx_notices_created_at ON public.notices(created_at DESC);


-- ----------------------------------------------------------------------------
-- 3. HELPER FUNCTIONS (Defined after tables so relations exist)
-- ----------------------------------------------------------------------------

-- Extract trusted role from JWT app_metadata only (untrusted user_metadata removed)
CREATE OR REPLACE FUNCTION public.current_role()
RETURNS TEXT AS $$
BEGIN
  RETURN coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    'anon'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Extract hostel scope for admins from JWT
CREATE OR REPLACE FUNCTION public.current_admin_hostel()
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN (public.current_role()) = 'boys_admin' THEN 'boys'
    WHEN (public.current_role()) = 'girls_admin' THEN 'girls'
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Lookup student ID linked to current authenticated user
CREATE OR REPLACE FUNCTION public.current_student_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM public.students WHERE auth_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Lookup student hostel linked to current authenticated user
CREATE OR REPLACE FUNCTION public.current_student_hostel()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT hostel FROM public.students WHERE auth_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trigger_sync_room_occupancy ON public.students;
CREATE TRIGGER trigger_sync_room_occupancy
AFTER INSERT OR UPDATE OR DELETE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.sync_room_occupancy();


-- B. Sync movement aliases and lookups
CREATE OR REPLACE FUNCTION public.set_movement_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- Resolve student_id, student_name, hostel from USN or student_name if student_id is null
  IF NEW.student_id IS NULL AND (NEW.usn IS NOT NULL OR NEW.student_name IS NOT NULL OR NEW."studentName" IS NOT NULL) THEN
    SELECT id, full_name, hostel, usn INTO NEW.student_id, NEW.student_name, NEW.hostel, NEW.usn
    FROM public.students 
    WHERE (NEW.usn IS NOT NULL AND usn = NEW.usn)
       OR (NEW.student_name IS NOT NULL AND full_name ILIKE NEW.student_name)
       OR (NEW."studentName" IS NOT NULL AND full_name ILIKE NEW."studentName")
    LIMIT 1;
  END IF;

  -- Populate student_name/usn/hostel from students record if student_id is present
  IF NEW.student_id IS NOT NULL THEN
    SELECT full_name, usn, hostel INTO NEW.student_name, NEW.usn, NEW.hostel
    FROM public.students WHERE id = NEW.student_id LIMIT 1;
  END IF;

  -- Synchronize studentName <-> student_name
  IF NEW."studentName" IS NULL AND NEW.student_name IS NOT NULL THEN
    NEW."studentName" := NEW.student_name;
  ELSIF NEW.student_name IS NULL AND NEW."studentName" IS NOT NULL THEN
    NEW.student_name := NEW."studentName";
  END IF;

  -- Synchronize departure times
  IF NEW."departureTime" IS NOT NULL AND NEW.departure_time IS NULL THEN
    NEW.departure_time := NEW."departureTime";
  ELSIF NEW.departure_time IS NOT NULL AND NEW."departureTime" IS NULL THEN
    NEW."departureTime" := NEW.departure_time;
  END IF;

  IF NEW.check_out_time IS NULL AND NEW.departure_time IS NOT NULL THEN
    NEW.check_out_time := NEW.departure_time;
  ELSIF NEW.departure_time IS NULL AND NEW.check_out_time IS NOT NULL THEN
    NEW.departure_time := NEW.check_out_time;
  END IF;

  -- Synchronize expected return times
  IF NEW."expectedReturn" IS NOT NULL AND NEW.expected_return IS NULL THEN
    NEW.expected_return := NEW."expectedReturn";
  ELSIF NEW.expected_return IS NOT NULL AND NEW."expectedReturn" IS NULL THEN
    NEW."expectedReturn" := NEW.expected_return;
  END IF;

  IF NEW.expected_return IS NULL AND NEW.expected_return_time IS NOT NULL THEN
    NEW.expected_return := NEW.expected_return_time;
  ELSIF NEW.expected_return_time IS NULL AND NEW.expected_return IS NOT NULL THEN
    NEW.expected_return_time := NEW.expected_return;
  END IF;

  -- Synchronize actual return times
  IF NEW."actualReturn" IS NOT NULL AND NEW.actual_return IS NULL THEN
    NEW.actual_return := NEW."actualReturn";
  ELSIF NEW.actual_return IS NOT NULL AND NEW."actualReturn" IS NULL THEN
    NEW."actualReturn" := NEW.actual_return;
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

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
-- 6. ROW-LEVEL SECURITY (RLS) POLICIES — HARDENED & ISOLATED
-- ----------------------------------------------------------------------------

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grievances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mess ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- Idempotently drop existing policies
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

-- ── A. ROOMS POLICIES ────────────────────────────────────────────────────────
-- Super admin has unrestricted access across all rooms
CREATE POLICY "rooms_super_admin" ON public.rooms
  FOR ALL TO authenticated
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- Hostel admins can ONLY manage and view rooms in their assigned hostel
CREATE POLICY "rooms_hostel_admin" ON public.rooms
  FOR ALL TO authenticated
  USING (
    public.current_role() IN ('boys_admin', 'girls_admin')
    AND hostel = public.current_admin_hostel()
  )
  WITH CHECK (
    public.current_role() IN ('boys_admin', 'girls_admin')
    AND hostel = public.current_admin_hostel()
  );

-- Students can ONLY view rooms within their assigned hostel
CREATE POLICY "rooms_student_read" ON public.rooms
  FOR SELECT TO authenticated
  USING (
    public.current_role() = 'student'
    AND hostel = public.current_student_hostel()
  );


-- ── B. STUDENTS POLICIES ─────────────────────────────────────────────────────
-- Super admin has full access across all student records
CREATE POLICY "students_super_admin" ON public.students
  FOR ALL TO authenticated
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- Hostel admins can ONLY view, insert, update, or delete students in their hostel,
-- and any assigned room_id MUST strictly match the admin's hostel.
CREATE POLICY "students_hostel_admin" ON public.students
  FOR ALL TO authenticated
  USING (
    public.current_role() IN ('boys_admin', 'girls_admin')
    AND hostel = public.current_admin_hostel()
  )
  WITH CHECK (
    public.current_role() IN ('boys_admin', 'girls_admin')
    AND hostel = public.current_admin_hostel()
    AND (
      room_id IS NULL OR EXISTS (
        SELECT 1 FROM public.rooms r
        WHERE r.id = students.room_id
          AND r.hostel = public.current_admin_hostel()
      )
    )
  );

-- Students can ONLY read their own student profile
CREATE POLICY "students_own_record" ON public.students
  FOR SELECT TO authenticated
  USING (
    public.current_role() = 'student'
    AND auth_id = auth.uid()
  );


-- ── C. ALLOCATIONS POLICIES ──────────────────────────────────────────────────
-- Super admin full access
CREATE POLICY "allocations_super_admin" ON public.allocations
  FOR ALL TO authenticated
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- Hostel admins manage allocations ONLY where both student AND room belong to their hostel
CREATE POLICY "allocations_hostel_admin" ON public.allocations
  FOR ALL TO authenticated
  USING (
    public.current_role() IN ('boys_admin', 'girls_admin')
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = allocations.student_id
        AND s.hostel = public.current_admin_hostel()
    )
    AND EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = allocations.room_id
        AND r.hostel = public.current_admin_hostel()
    )
  )
  WITH CHECK (
    public.current_role() IN ('boys_admin', 'girls_admin')
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = allocations.student_id
        AND s.hostel = public.current_admin_hostel()
    )
    AND EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = allocations.room_id
        AND r.hostel = public.current_admin_hostel()
    )
  );

-- Students can only read their own allocations
CREATE POLICY "allocations_student_view" ON public.allocations
  FOR SELECT TO authenticated
  USING (
    public.current_role() = 'student'
    AND student_id = public.current_student_id()
  );


-- ── D. FEES POLICIES ─────────────────────────────────────────────────────────
-- Super admin full access
CREATE POLICY "fees_super_admin" ON public.fees
  FOR ALL TO authenticated
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- Hostel admins can manage fees ONLY for students in their assigned hostel
CREATE POLICY "fees_hostel_admin" ON public.fees
  FOR ALL TO authenticated
  USING (
    public.current_role() IN ('boys_admin', 'girls_admin')
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = fees.student_id
        AND s.hostel = public.current_admin_hostel()
    )
  )
  WITH CHECK (
    public.current_role() IN ('boys_admin', 'girls_admin')
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = fees.student_id
        AND s.hostel = public.current_admin_hostel()
    )
  );

-- Students can ONLY view their own fees (no student inserts/updates permitted)
CREATE POLICY "fees_student_view" ON public.fees
  FOR SELECT TO authenticated
  USING (
    public.current_role() = 'student'
    AND student_id = public.current_student_id()
  );


-- ── E. MOVEMENTS POLICIES ────────────────────────────────────────────────────
-- Super admin full access
CREATE POLICY "movements_super_admin" ON public.movements
  FOR ALL TO authenticated
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- Hostel admins manage movements strictly for their own hostel.
-- CRITICAL: If student_id is present, that student MUST belong to admin's hostel.
-- movement.hostel can NEVER override a mismatched student hostel.
CREATE POLICY "movements_hostel_admin" ON public.movements
  FOR ALL TO authenticated
  USING (
    public.current_role() IN ('boys_admin', 'girls_admin')
    AND (
      (movements.student_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = movements.student_id
          AND s.hostel = public.current_admin_hostel()
      ))
      OR (movements.student_id IS NULL AND movements.hostel = public.current_admin_hostel())
    )
    AND (movements.hostel IS NULL OR movements.hostel = public.current_admin_hostel())
  )
  WITH CHECK (
    public.current_role() IN ('boys_admin', 'girls_admin')
    AND (
      (movements.student_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = movements.student_id
          AND s.hostel = public.current_admin_hostel()
      ))
      OR (movements.student_id IS NULL AND movements.hostel = public.current_admin_hostel())
    )
    AND (movements.hostel IS NULL OR movements.hostel = public.current_admin_hostel())
  );

-- Students can ONLY view their own movements
CREATE POLICY "movements_student_select" ON public.movements
  FOR SELECT TO authenticated
  USING (
    public.current_role() = 'student'
    AND student_id = public.current_student_id()
  );

-- Students can submit movements ONLY for their own verified student_id with initial statuses
CREATE POLICY "movements_student_insert" ON public.movements
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_role() = 'student'
    AND student_id IS NOT NULL
    AND student_id = public.current_student_id()
    AND (hostel IS NULL OR hostel = public.current_student_hostel())
    AND status IN ('out', 'pending')
  );

-- Students can only mark their own active movement as returned
CREATE POLICY "movements_student_update" ON public.movements
  FOR UPDATE TO authenticated
  USING (
    public.current_role() = 'student'
    AND student_id = public.current_student_id()
  )
  WITH CHECK (
    public.current_role() = 'student'
    AND student_id = public.current_student_id()
    AND status = 'returned'
  );


-- ── F. GRIEVANCES POLICIES ───────────────────────────────────────────────────
-- Super admin full access
CREATE POLICY "grievances_super_admin" ON public.grievances
  FOR ALL TO authenticated
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- Hostel admins can manage grievances ONLY for students in their assigned hostel
CREATE POLICY "grievances_hostel_admin" ON public.grievances
  FOR ALL TO authenticated
  USING (
    public.current_role() IN ('boys_admin', 'girls_admin')
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = grievances.student_id
        AND s.hostel = public.current_admin_hostel()
    )
  )
  WITH CHECK (
    public.current_role() IN ('boys_admin', 'girls_admin')
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = grievances.student_id
        AND s.hostel = public.current_admin_hostel()
    )
  );

-- Students can ONLY view their own grievances
CREATE POLICY "grievances_student_select" ON public.grievances
  FOR SELECT TO authenticated
  USING (
    public.current_role() = 'student'
    AND student_id = public.current_student_id()
  );

-- Students can submit grievances ONLY under their own student_id with status 'open'
CREATE POLICY "grievances_student_insert" ON public.grievances
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_role() = 'student'
    AND student_id IS NOT NULL
    AND student_id = public.current_student_id()
    AND status = 'open'
  );


-- ── G. MESS POLICIES ─────────────────────────────────────────────────────────
-- Super admin full access across all mess menus
CREATE POLICY "mess_super_admin" ON public.mess
  FOR ALL TO authenticated
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- Hostel admins can manage ONLY mess menus for their hostel or shared 'all' menus
CREATE POLICY "mess_hostel_admin" ON public.mess
  FOR ALL TO authenticated
  USING (
    public.current_role() IN ('boys_admin', 'girls_admin')
    AND hostel IN (public.current_admin_hostel(), 'all')
  )
  WITH CHECK (
    public.current_role() IN ('boys_admin', 'girls_admin')
    AND hostel IN (public.current_admin_hostel(), 'all')
  );

-- Students can view mess menus relevant to their hostel or shared 'all' menus
CREATE POLICY "mess_student_read" ON public.mess
  FOR SELECT TO authenticated
  USING (
    public.current_role() = 'student'
    AND hostel IN (public.current_student_hostel(), 'all')
  );

-- Public / unauthenticated can only view general shared mess menus
CREATE POLICY "mess_anon_read" ON public.mess
  FOR SELECT TO anon
  USING (hostel = 'all');


-- ── H. NOTICES POLICIES ──────────────────────────────────────────────────────
-- Super admin full access
CREATE POLICY "notices_super_admin" ON public.notices
  FOR ALL TO authenticated
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- Hostel admins can ONLY manage notices directed to their hostel or institution-wide ('all')
CREATE POLICY "notices_hostel_admin" ON public.notices
  FOR ALL TO authenticated
  USING (
    public.current_role() IN ('boys_admin', 'girls_admin')
    AND audience IN (public.current_admin_hostel(), 'all')
    AND (target_audience IS NULL OR target_audience IN (public.current_admin_hostel(), 'all'))
  )
  WITH CHECK (
    public.current_role() IN ('boys_admin', 'girls_admin')
    AND audience IN (public.current_admin_hostel(), 'all')
    AND (target_audience IS NULL OR target_audience IN (public.current_admin_hostel(), 'all'))
  );

-- Students can view published notices targeted to their hostel or institution-wide ('all')
CREATE POLICY "notices_student_read" ON public.notices
  FOR SELECT TO authenticated
  USING (
    public.current_role() = 'student'
    AND status = 'published'
    AND audience IN (public.current_student_hostel(), 'all')
  );

-- Public / unauthenticated can only view published notices intended for 'all'
CREATE POLICY "notices_anon_read" ON public.notices
  FOR SELECT TO anon
  USING (
    status = 'published'
    AND audience = 'all'
  );

-- ----------------------------------------------------------------------------
-- 7. NOTIFY POSTGREST SCHEMA CACHE RELOAD
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
