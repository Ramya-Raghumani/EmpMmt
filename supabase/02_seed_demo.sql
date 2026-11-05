-- ============================================================================
-- OPTIONAL demo data for the college project demo / evaluation.
-- Run AFTER 01_schema.sql. All demo accounts use the password: Passw0rd!2026
-- Delete/replace these accounts before using this system for real leave data.
-- ============================================================================
do $$
declare
  v_dept_cse uuid;
  v_dept_it  uuid;
  v_hod      uuid := gen_random_uuid();
  v_principal uuid := gen_random_uuid();
  v_mgmt     uuid := gen_random_uuid();
  v_staff    uuid := gen_random_uuid();
  v_staff2   uuid := gen_random_uuid();
  v_student  uuid := gen_random_uuid();
  v_student2 uuid := gen_random_uuid();
  v_pwd      text := crypt('Passw0rd!2026', gen_salt('bf'));
begin
  select id into v_dept_cse from public.departments where code = 'CSE';
  select id into v_dept_it  from public.departments where code = 'IT';

  -- ---- auth.users ------------------------------------------------------
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at)
  values
    ('00000000-0000-0000-0000-000000000000', v_hod, 'authenticated', 'authenticated',
     'hod.cse@college.edu', v_pwd, now(),
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('full_name','Dr. Meera Krishnan','role','hod'), now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_principal, 'authenticated', 'authenticated',
     'principal@college.edu', v_pwd, now(),
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('full_name','Dr. R. Sundaram','role','principal'), now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_mgmt, 'authenticated', 'authenticated',
     'management@college.edu', v_pwd, now(),
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('full_name','College Management','role','management'), now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_staff, 'authenticated', 'authenticated',
     'staff.cse@college.edu', v_pwd, now(),
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('full_name','Prof. Anand Verma','role','staff'), now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_staff2, 'authenticated', 'authenticated',
     'staff.it@college.edu', v_pwd, now(),
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('full_name','Prof. Kavya Nair','role','staff'), now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_student, 'authenticated', 'authenticated',
     'student1@college.edu', v_pwd, now(),
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('full_name','Aarav Sharma','role','student'), now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_student2, 'authenticated', 'authenticated',
     'student2@college.edu', v_pwd, now(),
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('full_name','Diya Patel','role','student'), now(), now())
  on conflict (id) do nothing;

  -- ---- auth.identities (required for email/password sign-in) ------------
  insert into auth.identities (id, user_id, provider_id, identity_data, provider,
                               last_sign_in_at, created_at, updated_at)
  select gen_random_uuid(), u.id, u.id::text,
         jsonb_build_object('sub', u.id::text, 'email', u.email),
         'email', now(), now(), now()
  from auth.users u
  where u.id in (v_hod, v_principal, v_mgmt, v_staff, v_staff2, v_student, v_student2)
  on conflict do nothing;

  -- ---- application profiles (created by handle_new_user; update roles) ---
  update public.users set role = 'hod',        department_id = v_dept_cse, full_name = 'Dr. Meera Krishnan'    where id = v_hod;
  update public.users set role = 'principal',  department_id = v_dept_cse, full_name = 'Dr. R. Sundaram'        where id = v_principal;
  update public.users set role = 'management', full_name = 'College Management'                                  where id = v_mgmt;
  update public.users set role = 'staff',      department_id = v_dept_it,  full_name = 'Prof. Kavya Nair'       where id = v_staff2;
  update public.users set role = 'staff',      department_id = v_dept_cse, full_name = 'Prof. Anand Verma'       where id = v_staff;
  update public.users set role = 'student',    department_id = v_dept_cse, full_name = 'Aarav Sharma'            where id = v_student;
  update public.users set role = 'student',    department_id = v_dept_cse, full_name = 'Diya Patel'              where id = v_student2;

  -- ---- staff profiles ---------------------------------------------------
  insert into public.staff_profiles (user_id, employee_id, designation, department_id, reporting_authority_id, is_hod, date_of_joining)
  values
    (v_hod,    'EMP-1001', 'Head of Department',      v_dept_cse, v_principal, true,  '2016-06-01'),
    (v_principal, 'EMP-1000', 'Principal',            v_dept_cse, v_mgmt,      false, '2012-07-15'),
    (v_staff,  'EMP-1002', 'Assistant Professor',     v_dept_cse, v_hod,       false, '2019-07-01'),
    (v_staff2, 'EMP-1003', 'Assistant Professor',     v_dept_it,  v_hod,       false, '2021-01-10')
  on conflict (user_id) do nothing;

  insert into public.staff_profiles (user_id, employee_id, designation)
  values (v_mgmt, 'EMP-0001', 'College Management')
  on conflict (user_id) do nothing;

  -- ---- student profiles -------------------------------------------------
  insert into public.student_profiles (user_id, roll_number, course, branch, year_of_study, semester, assigned_staff_id)
  values
    (v_student,  '21CS101', 'B.E. Computer Science', 'CSE', 3, 6, v_staff),
    (v_student2, '21CS102', 'B.E. Computer Science', 'CSE', 3, 6, v_staff)
  on conflict (user_id) do nothing;
end $$;
