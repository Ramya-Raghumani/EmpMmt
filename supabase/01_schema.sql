-- ============================================================================
-- College Leave Management System — Schema, RLS policies and storage rules
-- Run this file first in the Supabase SQL Editor (it is idempotent).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('student','staff','hod','principal','management');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.leave_category as enum ('regular','event');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.leave_type as enum ('medical','personal','event','duty','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.leave_status as enum ('draft','pending','approved','rejected','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.document_type as enum (
    'event_brochure',
    'participation_report',
    'participation_certificate',
    'event_photos',
    'medical_certificate',
    'supporting_document'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Departments
-- ---------------------------------------------------------------------------
create table if not exists public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  code        text not null unique,
  hod_name    text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Users (mirrors auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  full_name     text not null,
  role          public.user_role not null default 'student',
  department_id uuid references public.departments(id) on delete set null,
  phone         text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists users_role_idx on public.users(role);
create index if not exists users_department_idx on public.users(department_id);

-- ---------------------------------------------------------------------------
-- Student profiles
-- ---------------------------------------------------------------------------
create table if not exists public.student_profiles (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references public.users(id) on delete cascade,
  roll_number       text not null unique,
  course            text,
  branch            text,
  year_of_study     int check (year_of_study between 1 and 6),
  semester          int check (semester between 1 and 12),
  assigned_staff_id uuid references public.users(id) on delete set null,
  guardian_name     text,
  guardian_phone    text,
  created_at        timestamptz not null default now()
);

create index if not exists student_profiles_staff_idx on public.student_profiles(assigned_staff_id);

-- ---------------------------------------------------------------------------
-- Staff profiles
-- ---------------------------------------------------------------------------
create table if not exists public.staff_profiles (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null unique references public.users(id) on delete cascade,
  employee_id            text not null unique,
  designation            text,
  department_id          uuid references public.departments(id) on delete set null,
  reporting_authority_id uuid references public.users(id) on delete set null,
  is_hod                 boolean not null default false,
  date_of_joining        date,
  created_at             timestamptz not null default now()
);

create index if not exists staff_profiles_authority_idx on public.staff_profiles(reporting_authority_id);

-- ---------------------------------------------------------------------------
-- Leave applications
-- ---------------------------------------------------------------------------
create sequence if not exists public.leave_application_seq start 1001;

create table if not exists public.leave_applications (
  id                  uuid primary key default gen_random_uuid(),
  application_no      text not null unique default (
                        'LV-' || to_char(now(), 'YYYY') || '-' ||
                        lpad(nextval('public.leave_application_seq')::text, 4, '0')
                      ),
  applicant_id        uuid not null references public.users(id) on delete cascade,
  applicant_role      public.user_role not null,
  category            public.leave_category not null default 'regular',
  leave_type          public.leave_type not null,
  event_type          text,
  event_name          text,
  event_location      text,
  start_date          date not null,
  end_date            date not null,
  total_days          int generated always as ((end_date - start_date) + 1) stored,
  reason              text not null,
  assigned_approver_id uuid references public.users(id) on delete set null,
  status              public.leave_status not null default 'draft',
  approver_comments   text,
  decided_at          timestamptz,
  decided_by          uuid references public.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint leave_dates_valid check (end_date >= start_date),
  constraint leave_reason_present check (length(trim(reason)) >= 5),
  constraint leave_event_details_present check (
    category <> 'event' or (
      event_name is not null and length(trim(event_name)) > 0 and
      event_location is not null and length(trim(event_location)) > 0
    )
  )
);

create index if not exists leave_applications_applicant_idx on public.leave_applications(applicant_id);
create index if not exists leave_applications_approver_idx on public.leave_applications(assigned_approver_id);
create index if not exists leave_applications_status_idx on public.leave_applications(status);
create index if not exists leave_applications_role_idx on public.leave_applications(applicant_role);

-- ---------------------------------------------------------------------------
-- Leave documents
-- ---------------------------------------------------------------------------
create table if not exists public.leave_documents (
  id                   uuid primary key default gen_random_uuid(),
  leave_application_id uuid not null references public.leave_applications(id) on delete cascade,
  document_type        public.document_type not null,
  file_name            text not null,
  file_path            text not null,
  file_size            bigint,
  mime_type            text,
  uploaded_by          uuid references public.users(id) on delete set null,
  uploaded_at          timestamptz not null default now()
);

create index if not exists leave_documents_application_idx
  on public.leave_documents(leave_application_id);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.users(id) on delete cascade,
  title                text not null,
  message              text not null,
  kind                 text not null default 'info' check (kind in ('info','success','warning','error')),
  leave_application_id uuid references public.leave_applications(id) on delete cascade,
  is_read              boolean not null default false,
  created_at           timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications(user_id, is_read);

-- ============================================================================
-- Helper functions (SECURITY DEFINER so RLS policies cannot recurse)
-- ============================================================================
create or replace function public.current_role()
returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.current_department()
returns uuid
language sql stable security definer set search_path = public as $$
  select department_id from public.users where id = auth.uid();
$$;

create or replace function public.is_staff_of_student(p_student uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.student_profiles sp
    where sp.user_id = p_student and sp.assigned_staff_id = auth.uid()
  );
$$;

-- ============================================================================
-- Business rules: approver routing, event-document enforcement, notifications
-- ============================================================================
create or replace function public.assign_approver()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role;
  v_approver uuid;
begin
  select role into v_role from public.users where id = new.applicant_id;
  if v_role is null then
    raise exception 'Applicant % has no profile in public.users', new.applicant_id;
  end if;

  -- The applicant role is always taken from the users table, never the client.
  new.applicant_role := v_role;

  if v_role = 'student' then
    select assigned_staff_id into v_approver
    from public.student_profiles where user_id = new.applicant_id;
    if v_approver is null then
      raise exception 'No faculty member is assigned to this student yet. Contact your department office.';
    end if;
  elsif v_role = 'staff' then
    -- Staff leave always routes to their HOD / Principal, never the student queue.
    select reporting_authority_id into v_approver
    from public.staff_profiles where user_id = new.applicant_id;
    if v_approver is null then
      select sp.reporting_authority_id into v_approver
      from public.staff_profiles sp
      where sp.user_id = new.applicant_id;
    end if;
    if v_approver is null then
      select id into v_approver from public.users
      where role = 'hod' and department_id = (select department_id from public.users where id = new.applicant_id)
      limit 1;
    end if;
    if v_approver is null then
      select id into v_approver from public.users where role = 'principal' order by created_at limit 1;
    end if;
    if v_approver is null then
      raise exception 'No HOD or Principal is configured to approve staff leave.';
    end if;
  else
    -- HOD / Principal / Management apply to their own reporting authority or the principal.
    select reporting_authority_id into v_approver
    from public.staff_profiles where user_id = new.applicant_id;
    if v_approver is null then
      select id into v_approver from public.users
      where role in ('principal','management') and id <> new.applicant_id
      order by (role = 'principal') desc limit 1;
    end if;
  end if;

  new.assigned_approver_id := v_approver;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_assign_approver on public.leave_applications;
create trigger trg_assign_approver
  before insert on public.leave_applications
  for each row execute function public.assign_approver();

-- Mandatory event documentation: 4 document types must exist before submission.
create or replace function public.required_event_doc_count(p_application uuid)
returns int
language sql stable security definer set search_path = public as $$
  select count(distinct document_type)::int
  from public.leave_documents
  where leave_application_id = p_application
    and document_type in (
      'event_brochure','participation_report','participation_certificate','event_photos'
    );
$$;

create or replace function public.enforce_event_documents()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.category = 'event' and new.status in ('pending','approved') then
    if public.required_event_doc_count(new.id) < 4 then
      raise exception
        'Event leave requires brochure, participation report (PDF), certificate and event photos before submission.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_event_documents on public.leave_applications;
create trigger trg_enforce_event_documents
  before update on public.leave_applications
  for each row execute function public.enforce_event_documents();

-- Approver rules: only the assigned approver may decide, and only once.
create or replace function public.enforce_decision_rules()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    if new.status in ('approved','rejected') then
      if auth.uid() is distinct from old.assigned_approver_id then
        raise exception 'Only the assigned approver can decide on this application.';
      end if;
      if old.status <> 'pending' then
        raise exception 'This application has already been decided.';
      end if;
      new.decided_at := now();
      new.decided_by := auth.uid();
    end if;
    if new.status = 'pending' and old.status = 'draft' then
      if auth.uid() is distinct from old.applicant_id then
        raise exception 'Only the applicant can submit this application.';
      end if;
      new.updated_at := now();
    end if;
  end if;

  -- Applicants may not silently rewrite a decided application.
  if auth.uid() = old.applicant_id and old.status in ('approved','rejected') then
    if new.reason is distinct from old.reason or new.start_date is distinct from old.start_date
       or new.end_date is distinct from old.end_date then
      raise exception 'A decided application can no longer be edited.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_decision_rules on public.leave_applications;
create trigger trg_enforce_decision_rules
  before update on public.leave_applications
  for each row execute function public.enforce_decision_rules();

-- Notifications on submission and on decision.
create or replace function public.notify_leave_events()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_applicant text;
  v_days int;
begin
  select full_name into v_applicant from public.users where id = new.applicant_id;
  v_days := (new.end_date - new.start_date) + 1;

  if tg_op = 'INSERT' and new.status = 'pending' and new.assigned_approver_id is not null then
    insert into public.notifications(user_id, title, message, kind, leave_application_id)
    values (
      new.assigned_approver_id,
      'New leave request',
      v_applicant || ' submitted ' || new.application_no || ' (' || v_days || ' day(s)) for your approval.',
      'info', new.id
    );
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'pending' then
      insert into public.notifications(user_id, title, message, kind, leave_application_id)
      values (
        new.assigned_approver_id,
        'New leave request',
        v_applicant || ' submitted ' || new.application_no || ' (' || v_days || ' day(s)) for your approval.',
        'info', new.id
      );
    elsif new.status in ('approved','rejected') then
      insert into public.notifications(user_id, title, message, kind, leave_application_id)
      values (
        new.applicant_id,
        'Leave ' || new.status,
        'Your leave application ' || new.application_no || ' has been ' || new.status || '.',
        case when new.status = 'approved' then 'success' else 'error' end,
        new.id
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_leave_events on public.leave_applications;
create trigger trg_notify_leave_events
  after insert or update on public.leave_applications
  for each row execute function public.notify_leave_events();

-- Keep timestamps fresh.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists trg_touch_users on public.users;
create trigger trg_touch_users before update on public.users
  for each row execute function public.touch_updated_at();

-- Block privilege escalation: only management may change a role / department.
create or replace function public.guard_user_role()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.department_id is distinct from old.department_id) then
    if public.current_role() <> 'management' then
      raise exception 'Only college management can change a role or department.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_user_role on public.users;
create trigger trg_guard_user_role before update on public.users
  for each row execute function public.guard_user_role();

-- Provision a profile whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role;
  v_requested text;
  v_name text;
begin
  v_requested := coalesce(new.raw_user_meta_data->>'role', 'student');
  -- Self-registration is limited to students and staff; HOD/Principal/Management
  -- accounts must be promoted by college management or the seed script.
  v_role := case when v_requested in ('student','staff') then v_requested::public.user_role else 'student'::public.user_role end;
  v_name := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1));

  insert into public.users(id, email, full_name, role, department_id, phone)
  values (
    new.id, new.email, v_name, v_role,
    nullif(new.raw_user_meta_data->>'department_id', '')::uuid,
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;

  if v_role = 'student' and coalesce(new.raw_user_meta_data->>'roll_number', '') <> '' then
    insert into public.student_profiles(user_id, roll_number, course, branch, year_of_study, semester, assigned_staff_id)
    values (
      new.id,
      new.raw_user_meta_data->>'roll_number',
      new.raw_user_meta_data->>'course',
      new.raw_user_meta_data->>'branch',
      nullif(new.raw_user_meta_data->>'year_of_study','')::int,
      nullif(new.raw_user_meta_data->>'semester','')::int,
      nullif(new.raw_user_meta_data->>'assigned_staff_id','')::uuid
    )
    on conflict (user_id) do nothing;
  elsif v_role = 'staff' then
    insert into public.staff_profiles(user_id, employee_id, designation, department_id, reporting_authority_id)
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data->>'employee_id',''), 'EMP-' || substr(new.id::text, 1, 8)),
      new.raw_user_meta_data->>'designation',
      nullif(new.raw_user_meta_data->>'department_id', '')::uuid,
      nullif(new.raw_user_meta_data->>'reporting_authority_id','')::uuid
    )
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.departments        enable row level security;
alter table public.users             enable row level security;
alter table public.student_profiles  enable row level security;
alter table public.staff_profiles    enable row level security;
alter table public.leave_applications enable row level security;
alter table public.leave_documents   enable row level security;
alter table public.notifications     enable row level security;

-- Departments: everyone authenticated may read; only management may write.
drop policy if exists departments_read on public.departments;
create policy departments_read on public.departments
  for select to authenticated using (true);

drop policy if exists departments_manage on public.departments;
create policy departments_manage on public.departments
  for all to authenticated
  using (public.current_role() = 'management')
  with check (public.current_role() = 'management');

-- Users -------------------------------------------------------------------
drop policy if exists users_select_self on public.users;
create policy users_select_self on public.users
  for select to authenticated using (id = auth.uid());

drop policy if exists users_select_staff_students on public.users;
create policy users_select_staff_students on public.users
  for select to authenticated using (
    public.current_role() = 'staff' and public.is_staff_of_student(public.users.id)
  );

drop policy if exists users_select_approvers on public.users;
create policy users_select_approvers on public.users
  for select to authenticated using (
    public.current_role() in ('hod','principal')
    and (
      id in (select assigned_approver_id from public.leave_applications where applicant_id = auth.uid())
      or department_id = public.current_department()
      or role in ('staff','student')
    )
  );

drop policy if exists users_select_management on public.users;
create policy users_select_management on public.users
  for select to authenticated using (public.current_role() = 'management');

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists users_manage_management on public.users;
create policy users_manage_management on public.users
  for all to authenticated
  using (public.current_role() = 'management')
  with check (public.current_role() = 'management');

-- Student profiles --------------------------------------------------------
drop policy if exists student_profiles_select_self on public.student_profiles;
create policy student_profiles_select_self on public.student_profiles
  for select to authenticated using (user_id = auth.uid());

drop policy if exists student_profiles_select_staff on public.student_profiles;
create policy student_profiles_select_staff on public.student_profiles
  for select to authenticated using (public.is_staff_of_student(user_id));

drop policy if exists student_profiles_select_leadership on public.student_profiles;
create policy student_profiles_select_leadership on public.student_profiles
  for select to authenticated using (
    public.current_role() in ('hod','principal','management')
  );

drop policy if exists student_profiles_insert_self on public.student_profiles;
create policy student_profiles_insert_self on public.student_profiles
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists student_profiles_update_self on public.student_profiles;
create policy student_profiles_update_self on public.student_profiles
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists student_profiles_manage_leadership on public.student_profiles;
create policy student_profiles_manage_leadership on public.student_profiles
  for all to authenticated
  using (public.current_role() in ('hod','principal','management'))
  with check (public.current_role() in ('hod','principal','management'));

-- Staff profiles ----------------------------------------------------------
drop policy if exists staff_profiles_select_self on public.staff_profiles;
create policy staff_profiles_select_self on public.staff_profiles
  for select to authenticated using (user_id = auth.uid());

drop policy if exists staff_profiles_select_leadership on public.staff_profiles;
create policy staff_profiles_select_leadership on public.staff_profiles
  for select to authenticated using (public.current_role() in ('hod','principal','management'));

drop policy if exists staff_profiles_update_self on public.staff_profiles;
create policy staff_profiles_update_self on public.staff_profiles
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists staff_profiles_manage_leadership on public.staff_profiles;
create policy staff_profiles_manage_leadership on public.staff_profiles
  for all to authenticated
  using (public.current_role() in ('hod','principal','management'))
  with check (public.current_role() in ('hod','principal','management'));

-- Leave applications ------------------------------------------------------
drop policy if exists leaves_select_own on public.leave_applications;
create policy leaves_select_own on public.leave_applications
  for select to authenticated using (applicant_id = auth.uid());

drop policy if exists leaves_select_assigned on public.leave_applications;
create policy leaves_select_assigned on public.leave_applications
  for select to authenticated using (
    assigned_approver_id = auth.uid()
    and public.current_role() in ('staff','hod','principal')
  );

-- Management: read-only visibility of staff (faculty) leave records only.
drop policy if exists leaves_select_management on public.leave_applications;
create policy leaves_select_management on public.leave_applications
  for select to authenticated using (
    public.current_role() = 'management' and applicant_role in ('staff','hod','principal')
  );

drop policy if exists leaves_insert_own on public.leave_applications;
create policy leaves_insert_own on public.leave_applications
  for insert to authenticated with check (
    applicant_id = auth.uid()
    and applicant_role = public.current_role()
    and public.current_role() in ('student','staff','hod','principal')
    and status in ('draft','pending')
  );

drop policy if exists leaves_update_own_draft on public.leave_applications;
create policy leaves_update_own_draft on public.leave_applications
  for update to authenticated
  using (applicant_id = auth.uid() and status in ('draft','pending'))
  with check (applicant_id = auth.uid());

drop policy if exists leaves_update_assigned_approver on public.leave_applications;
create policy leaves_update_assigned_approver on public.leave_applications
  for update to authenticated
  using (assigned_approver_id = auth.uid() and public.current_role() in ('staff','hod','principal'))
  with check (assigned_approver_id = auth.uid());

drop policy if exists leaves_delete_own_draft on public.leave_applications;
create policy leaves_delete_own_draft on public.leave_applications
  for delete to authenticated using (applicant_id = auth.uid() and status = 'draft');

-- Leave documents ---------------------------------------------------------
drop policy if exists documents_select_visible on public.leave_documents;
create policy documents_select_visible on public.leave_documents
  for select to authenticated using (
    exists (select 1 from public.leave_applications la where la.id = leave_application_id)
  );

drop policy if exists documents_insert_own_draft on public.leave_documents;
create policy documents_insert_own_draft on public.leave_documents
  for insert to authenticated with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.leave_applications la
      where la.id = leave_application_id
        and la.applicant_id = auth.uid()
        and la.status in ('draft','pending')
    )
  );

drop policy if exists documents_delete_own_draft on public.leave_documents;
create policy documents_delete_own_draft on public.leave_documents
  for delete to authenticated using (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.leave_applications la
      where la.id = leave_application_id
        and la.applicant_id = auth.uid()
        and la.status = 'draft'
    )
  );

-- Notifications -----------------------------------------------------------
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- Storage: private bucket for leave documents
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'leave-documents', 'leave-documents', false, 10485760,
  array['application/pdf','image/jpeg','image/jpg','image/png']
)
on conflict (id) do update
  set public = false,
      file_size_limit = 10485760,
      allowed_mime_types = array['application/pdf','image/jpeg','image/jpg','image/png'];

drop policy if exists leave_docs_upload_own on storage.objects;
create policy leave_docs_upload_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'leave-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists leave_docs_read_visible on storage.objects;
create policy leave_docs_read_visible on storage.objects
  for select to authenticated using (
    bucket_id = 'leave-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.leave_documents d where d.file_path = storage.objects.name)
    )
  );

drop policy if exists leave_docs_delete_own on storage.objects;
create policy leave_docs_delete_own on storage.objects
  for delete to authenticated using (
    bucket_id = 'leave-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- Baseline departments
-- ============================================================================
insert into public.departments (name, code) values
  ('Computer Science and Engineering', 'CSE'),
  ('Information Technology', 'IT'),
  ('Electronics and Communication Engineering', 'ECE'),
  ('Electrical and Electronics Engineering', 'EEE'),
  ('Mechanical Engineering', 'MECH'),
  ('Civil Engineering', 'CIVIL'),
  ('Artificial Intelligence and Data Science', 'AI&DS'),
  ('Basic Sciences and Humanities', 'BSH'),
  ('Administration', 'ADMIN')
on conflict (code) do nothing;
