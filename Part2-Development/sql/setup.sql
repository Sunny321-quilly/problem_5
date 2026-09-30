-- =====================================================================
-- ONE-SHOT SETUP -- run this file by itself in the Supabase SQL Editor.
--
--   1. schema.sql        tables, RLS policies, sample programs
--   2. demo_account.sql  4 demo logins + demo scholars/submissions
--
-- Safe to re-run: every statement is idempotent.
-- After it finishes you should see 4 rows in the final verification query.
-- =====================================================================
-- =====================================================================
-- Student Scholarship Monitoring and Academic Compliance System
-- Supabase PostgreSQL schema  (run in the Supabase SQL Editor)
-- =====================================================================

-- ---------- PROFILES (app-level user data) ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'scholar' check (role in ('admin','staff','scholar')),
  created_at  timestamptz not null default now()
);

-- Auto-create a profile whenever a new auth user signs up.
-- Role can be pre-selected at sign-up via user metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'scholar')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: current user's role (used by RLS policies)
create or replace function public.app_current_role()
returns text
language sql
security definer set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.app_is_staff()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select coalesce(public.app_current_role(), '') in ('admin','staff');
$$;

-- ---------- SCHOLARSHIP PROGRAMS ----------
create table if not exists public.scholarship_programs (
  id                   bigint generated always as identity primary key,
  program_name         text not null unique,
  required_gwa         numeric(4,2) not null check (required_gwa between 1.00 and 5.00),
  min_units            integer not null default 0 check (min_units >= 0),
  allow_failing_grade  boolean not null default false,
  active               boolean not null default true,
  created_at           timestamptz not null default now()
);

-- ---------- SCHOLARS ----------
create table if not exists public.scholars (
  id             bigint generated always as identity primary key,
  student_id     text not null unique check (student_id <> ''),
  full_name      text not null check (full_name <> ''),
  degree_program text not null,
  year_level     text not null,
  scholarship_id bigint not null references public.scholarship_programs(id),
  status         text not null default 'Active' check (status in (
                   'Active','Pending Submission','For Verification','Compliant',
                   'With Deficiency','Probationary','For Renewal','Renewed','Disqualified')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------- GRADE SUBMISSIONS ----------
create table if not exists public.grade_submissions (
  id                   bigint generated always as identity primary key,
  scholar_id           bigint not null references public.scholars(id) on delete cascade,
  academic_year        text not null,
  semester             text not null,
  gwa                  numeric(4,2) not null check (gwa between 1.00 and 5.00),
  units_enrolled       integer not null check (units_enrolled >= 0),
  failed_subjects      integer not null default 0 check (failed_subjects >= 0),
  incomplete_subjects  integer not null default 0 check (incomplete_subjects >= 0),
  submission_status    text not null default 'Pending'
                       check (submission_status in ('Pending','Verified','Returned')),
  submitted_at         timestamptz not null default now(),
  verified_by          uuid references public.profiles(id),
  verified_at          timestamptz,
  return_reason        text,
  -- BR-03: one submission per scholar / academic year / semester
  constraint grade_submission_unique_term unique (scholar_id, academic_year, semester)
);

-- ---------- COMPLIANCE EVALUATIONS ----------
create table if not exists public.compliance_evaluations (
  id             bigint generated always as identity primary key,
  scholar_id     bigint not null references public.scholars(id) on delete cascade,
  submission_id  bigint not null unique references public.grade_submissions(id) on delete cascade,
  academic_year  text not null,
  semester       text not null,
  result         text not null check (result in ('Compliant','With Deficiency')),
  reasons        jsonb not null default '[]'::jsonb,
  evaluated_by   uuid references public.profiles(id),
  evaluated_at   timestamptz not null default now()
);

-- ---------- ROW LEVEL SECURITY (BR-10 / NFR-01) ----------
alter table public.profiles              enable row level security;
alter table public.scholarship_programs  enable row level security;
alter table public.scholars              enable row level security;
alter table public.grade_submissions     enable row level security;
alter table public.compliance_evaluations enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.app_is_staff());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or public.app_current_role() = 'admin')
  with check (id = auth.uid() or public.app_current_role() = 'admin');

-- Programs: everyone signed in may read; staff/admin may write
drop policy if exists programs_select on public.scholarship_programs;
create policy programs_select on public.scholarship_programs for select
  to authenticated using (true);
drop policy if exists programs_write on public.scholarship_programs;
create policy programs_write on public.scholarship_programs for all
  to authenticated using (public.app_is_staff()) with check (public.app_is_staff());

-- Scholars: staff full access; scholar reads only own record (matched by email prefix = student_id)
drop policy if exists scholars_select on public.scholars;
create policy scholars_select on public.scholars for select
  to authenticated
  using (public.app_is_staff() or student_id = split_part(auth.jwt() ->> 'email', '@', 1));
drop policy if exists scholars_write on public.scholars;
create policy scholars_write on public.scholars for all
  to authenticated using (public.app_is_staff()) with check (public.app_is_staff());

-- Submissions: staff full access; scholar reads own only
drop policy if exists submissions_select on public.grade_submissions;
create policy submissions_select on public.grade_submissions for select
  to authenticated
  using (
    public.app_is_staff()
    or scholar_id in (select id from public.scholars
                      where student_id = split_part(auth.jwt() ->> 'email', '@', 1))
  );
drop policy if exists submissions_write on public.grade_submissions;
create policy submissions_write on public.grade_submissions for all
  to authenticated using (public.app_is_staff()) with check (public.app_is_staff());

-- Evaluations: staff full access; scholar reads own only
drop policy if exists evaluations_select on public.compliance_evaluations;
create policy evaluations_select on public.compliance_evaluations for select
  to authenticated
  using (
    public.app_is_staff()
    or scholar_id in (select id from public.scholars
                      where student_id = split_part(auth.jwt() ->> 'email', '@', 1))
  );
drop policy if exists evaluations_write on public.compliance_evaluations;
create policy evaluations_write on public.compliance_evaluations for all
  to authenticated using (public.app_is_staff()) with check (public.app_is_staff());

-- ---------- SAMPLE SCHOLARSHIP PROGRAMS (FR-03 / BR-02) ----------
-- Rule direction (institution: 1.00 = highest, 5.00 = lowest / failing)
-- Compliance = gwa <= required_gwa  AND  units_enrolled >= min_units
--              AND (allow_failing_grade OR failed_subjects = 0)
--              AND incomplete_subjects = 0
insert into public.scholarship_programs (program_name, required_gwa, min_units, allow_failing_grade, active)
values
  ('University Merit Scholarship',   1.75, 12, false, true),
  ('Government Grant (CHED)',        2.50, 12, false, true),
  ('Private Sponsorship Grant',      2.75, 15, true,  true),
  ('Entrance Scholarship',           2.00, 12, false, true)
on conflict (program_name) do nothing;

-- =====================================================================
-- Demo account + demo data
-- Run AFTER sql/schema.sql in the Supabase SQL Editor.
--
-- Creates four ready-to-use login accounts. Accounts are provisioned by the
-- registrar; the login page has no public sign-up (FR-14):
--
--   Demo Admin    admin@demo.scholarship.app      / DemoAdmin123
--   Demo Staff    staff@demo.scholarship.app      / DemoStaff123
--   Demo Scholar 1  2026001@demo.scholarship.app  / DemoScholar123   (Ana Reyes, Compliant)
--   Demo Scholar 2  2026002@demo.scholarship.app  / DemoScholar123   (Bruno Santos, Deficient)
--
-- The scholar logins use the student ID as the email prefix because the RLS
-- policies match a signed-in scholar to their record by
-- student_id = split_part(email, '@', 1) -- so each one resolves to a real record.
--
-- Also seeds a few scholars / submissions / evaluations so every screen has
-- something to show. Safe to re-run.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;
-- so crypt() / gen_salt() resolve wherever pgcrypto ended up
set search_path = public, extensions;

-- Fail with a readable message instead of "relation does not exist" if the
-- schema has not been installed yet.
do $$
begin
  if to_regclass('public.scholarship_programs') is null then
    raise exception 'Schema not installed. Run sql/schema.sql (or sql/setup.sql, which does both) FIRST, then run this script again.';
  end if;
end $$;

-- ---------- PROGRAMS (idempotent, needed by the demo scholars) ----------
insert into public.scholarship_programs (program_name, required_gwa, min_units, allow_failing_grade, active)
values
  ('University Merit Scholarship',  1.75, 12, false, true),
  ('Government Grant (CHED)',       2.50, 12, false, true),
  ('Private Sponsorship Grant',     2.75, 15, true,  true),
  ('Entrance Scholarship',          2.00, 12, false, true)
on conflict (program_name) do nothing;

-- ---------- AUTH USERS ----------
-- Passwords are stored as bcrypt hashes; the role comes from user metadata and
-- is copied into public.profiles by the handle_new_user() trigger.
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
       'authenticated', 'authenticated', v.email,
       crypt(v.password, gen_salt('bf')), now(), now(), now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_build_object('full_name', v.full_name, 'role', v.role)
from (values
  ('admin@demo.scholarship.app',    'DemoAdmin123',   'Demo Admin',   'admin'),
  ('staff@demo.scholarship.app',    'DemoStaff123',   'Demo Staff',   'staff'),
  ('2026001@demo.scholarship.app',  'DemoScholar123', 'Ana Reyes',    'scholar'),
  ('2026002@demo.scholarship.app',  'DemoScholar123', 'Bruno Santos', 'scholar')
) as v(email, password, full_name, role)
where not exists (select 1 from auth.users u where lower(u.email) = v.email);

-- Identity rows required for email/password sign-in
insert into auth.identities
  (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id, u.id, u.email,
       jsonb_build_object('sub', u.id, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.email in ('admin@demo.scholarship.app', 'staff@demo.scholarship.app',
                  '2026001@demo.scholarship.app', '2026002@demo.scholarship.app')
on conflict do nothing;

-- Profiles (the trigger creates these; this repairs any existing row)
insert into public.profiles (id, full_name, role)
select u.id, u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'role'
from auth.users u
where u.email in ('admin@demo.scholarship.app', 'staff@demo.scholarship.app',
                  '2026001@demo.scholarship.app', '2026002@demo.scholarship.app')
on conflict (id) do update
  set full_name = excluded.full_name, role = excluded.role;

-- ---------- DEMO SCHOLARS ----------
-- scholarship_id is resolved from the program name so the seed stays readable.
insert into public.scholars (student_id, full_name, degree_program, year_level, scholarship_id, status)
select v.student_id, v.full_name, v.degree_program, v.year_level, p.id, v.status
from (values
  ('2026001', 'Ana Reyes',     'BS Information Technology', '3rd Year', 'University Merit Scholarship', 'Compliant'),
  ('2026002', 'Bruno Santos',  'BS Civil Engineering',     '2nd Year', 'Government Grant (CHED)',      'With Deficiency'),
  ('2026003', 'Carla Mendoza', 'BS Psychology',            '3rd Year', 'Private Sponsorship Grant',    'For Verification'),
  ('2026004', 'Diego Lim',     'BS Accountancy',           '1st Year', 'Entrance Scholarship',         'Active')
) as v(student_id, full_name, degree_program, year_level, program_name, status)
join public.scholarship_programs p on p.program_name = v.program_name
on conflict (student_id) do nothing;

-- ---------- DEMO SUBMISSIONS ----------
-- Ana = verified and compliant, Bruno = verified and deficient,
-- Carla = still pending so the Verify action can be demonstrated live.
insert into public.grade_submissions
  (scholar_id, academic_year, semester, gwa, units_enrolled, failed_subjects,
   incomplete_subjects, submission_status, verified_by, verified_at)
select s.id, v.academic_year, v.semester, v.gwa, v.units, v.failed, v.incomplete,
       v.status,
       case when v.status = 'Pending' then null else p.id end,
       case when v.status = 'Pending' then null else now() end
from public.scholars s
join (values
  ('2026001', '2025-2026', '1st Semester', 1.50::numeric, 15, 0, 0, 'Verified'),
  ('2026002', '2025-2026', '1st Semester', 2.90::numeric, 15, 1, 0, 'Verified'),
  ('2026003', '2025-2026', '2nd Semester', 2.20::numeric, 18, 0, 0, 'Pending')
) as v(student_id, academic_year, semester, gwa, units, failed, incomplete, status)
  on v.student_id = s.student_id
cross join lateral (select id from public.profiles order by created_at limit 1) p
on conflict (scholar_id, academic_year, semester) do nothing;

-- ---------- DEMO COMPLIANCE EVALUATIONS (BR-05 / BR-06) ----------
insert into public.compliance_evaluations
  (scholar_id, submission_id, academic_year, semester, result, reasons, evaluated_by)
select s.id, g.id, g.academic_year, g.semester, v.result, v.reasons::jsonb,
       (select id from public.profiles order by created_at limit 1)
from public.scholars s
join public.grade_submissions g on g.scholar_id = s.id and g.submission_status = 'Verified'
join (values
  ('2026001', 'Compliant', '[]'),
  ('2026002', 'With Deficiency',
   '["GWA 2.90 exceeds allowed 2.50","1 failed subject(s); program does not allow failing grades"]')
) as v(student_id, result, reasons) on v.student_id = s.student_id
on conflict (submission_id) do update
  set result = excluded.result, reasons = excluded.reasons, evaluated_at = now();

-- ---------- DEMO WALKTHROUGH ----------
-- 1. Sign in as Demo Staff, open the dashboard: counters and the status board
--    already show compliant, deficient, pending and active scholars.
-- 2. Grade Submissions -> verify Carla Mendoza's 2nd Semester submission
--    (GWA 2.20, 18 units, 0 failed, 0 incomplete) to watch the rule run live:
--    her Private Sponsorship Grant allows 2.75 with 15 units, so the result is
--    Compliant (BR-05).
-- 3. Sign in as Demo Scholar to see the read-only, own-record-only view (FR-14).

-- ---------- VERIFY (expect 4 profiles, 4 programs, 4 scholars) ----------
select 'profiles' as table_name, count(*) as rows from public.profiles
union all select 'scholarship_programs', count(*) from public.scholarship_programs
union all select 'scholars', count(*) from public.scholars
union all select 'grade_submissions', count(*) from public.grade_submissions
union all select 'compliance_evaluations', count(*) from public.compliance_evaluations;