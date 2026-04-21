
-- ============ ENUMS ============
create type public.app_role as enum ('student', 'executive_member', 'coordinator', 'admin');
create type public.event_status as enum ('draft', 'published', 'completed', 'cancelled');
create type public.registration_status as enum ('pending', 'approved', 'rejected');

-- ============ TABLES ============
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  semester text,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- Executive member applications (the "registrations" table from spec)
create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  community text not null,
  full_name text not null,
  gmail text not null,
  phone text not null,
  current_semester text,
  next_semester text,
  branch text,
  division text,
  current_position text,
  previous_position text,
  photo_url text,
  status registration_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  community text not null,
  created_by uuid references auth.users(id) on delete set null,
  event_date date,
  event_time text,
  venue text,
  status event_status not null default 'draft',
  expected_participants int not null default 0,
  actual_participants int not null default 0,
  funds_received numeric not null default 0,
  created_at timestamptz not null default now()
);

create table public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  full_name text not null,
  gmail text not null,
  phone text not null,
  semester text,
  created_at timestamptz not null default now()
);

create table public.event_coordinators (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

-- ============ HELPER FUNCTIONS (security definer to avoid RLS recursion) ============
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create or replace function public.is_event_coordinator(_event_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.event_coordinators
    where event_id = _event_id and user_id = _user_id
  )
$$;

-- Auto-create profile + default role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, email, phone, semester)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'semester', '')
  )
  on conflict (user_id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'student')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.registrations enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.event_coordinators enable row level security;

-- profiles
create policy "profiles_select_own_or_admin" on public.profiles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "profiles_admin_update" on public.profiles for update to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- user_roles
create policy "roles_select_all" on public.user_roles for select to authenticated using (true);
create policy "roles_admin_all" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- registrations (executive applications)
create policy "reg_select_own_or_admin" on public.registrations for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "reg_insert_own" on public.registrations for insert to authenticated
  with check (user_id = auth.uid());
create policy "reg_update_admin" on public.registrations for update to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "reg_delete_admin" on public.registrations for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- events
create policy "events_select_access" on public.events for select to authenticated
  using (
    created_by = auth.uid()
    or public.has_role(auth.uid(), 'admin')
    or public.is_event_coordinator(id, auth.uid())
    or status in ('published', 'completed')
  );
create policy "events_select_anon_published" on public.events for select to anon
  using (status in ('published', 'completed'));
create policy "events_insert" on public.events for insert to authenticated
  with check (
    created_by = auth.uid()
    and (public.has_role(auth.uid(), 'executive_member') or public.has_role(auth.uid(), 'admin'))
  );
create policy "events_update" on public.events for update to authenticated
  using (
    created_by = auth.uid()
    or public.has_role(auth.uid(), 'admin')
    or public.is_event_coordinator(id, auth.uid())
  );
create policy "events_delete" on public.events for delete to authenticated
  using (created_by = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- event_participants
create policy "participants_select" on public.event_participants for select to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id
      and (
        e.created_by = auth.uid()
        or public.has_role(auth.uid(), 'admin')
        or public.is_event_coordinator(e.id, auth.uid())
      )
    )
  );
create policy "participants_insert_anyone" on public.event_participants for insert to anon, authenticated
  with check (
    exists (select 1 from public.events e where e.id = event_id and e.status = 'published')
  );
create policy "participants_update_admin" on public.event_participants for update to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "participants_delete_admin" on public.event_participants for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- event_coordinators
create policy "coord_select" on public.event_coordinators for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or user_id = auth.uid()
         or exists (select 1 from public.events e where e.id = event_id and e.created_by = auth.uid()));
create policy "coord_insert_creator_or_admin" on public.event_coordinators for insert to authenticated
  with check (
    public.has_role(auth.uid(), 'admin')
    or exists (select 1 from public.events e where e.id = event_id and e.created_by = auth.uid())
  );
create policy "coord_delete_creator_or_admin" on public.event_coordinators for delete to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    or exists (select 1 from public.events e where e.id = event_id and e.created_by = auth.uid())
  );

-- ============ STORAGE ============
insert into storage.buckets (id, name, public) values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

create policy "photos_public_read" on storage.objects for select using (bucket_id = 'profile-photos');
create policy "photos_auth_upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos_auth_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos_auth_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
