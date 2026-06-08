-- Fresh reset for Task Manager public schema.
-- WARNING: query ini menghapus seluruh table/function/policy di schema public.
-- Auth users di auth.users tetap ada, tapi semua project/payment/update lama dihapus.

drop schema if exists public cascade;
create schema public;

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;

create extension if not exists pgcrypto with schema public;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client text not null,
  status text not null default 'ongoing' check (status in ('ongoing', 'review', 'revision', 'done')),
  project_type text check (project_type in ('ui_ux_design', 'thesis', 'web_app')),
  project_types text[] not null default '{}'::text[]
    check (project_types <@ array['ui_ux_design', 'thesis', 'web_app']::text[]),
  deadline_at timestamptz,
  total_deal numeric not null default 0 check (total_deal >= 0),
  internal_cost numeric not null default 0 check (internal_cost >= 0),
  assigned_to uuid references public.users(id) on delete set null,
  created_by uuid not null references public.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  check (internal_cost <= total_deal),
  check ((assigned_to is not null and assigned_to <> created_by) or internal_cost = 0)
);

create table public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_type text not null check (project_type in ('ui_ux_design', 'thesis', 'web_app')),
  assigned_to uuid references public.users(id) on delete set null,
  role_label text,
  deal_amount numeric not null default 0 check (deal_amount >= 0),
  internal_fee numeric not null default 0 check (internal_fee >= 0),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (internal_fee <= deal_amount)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  assignment_id uuid references public.project_assignments(id) on delete set null,
  type text not null check (type in ('client', 'freelancer')),
  amount numeric not null default 0 check (amount > 0),
  note text,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  assignment_id uuid references public.project_assignments(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'review', 'revision', 'done')),
  deadline_at timestamptz,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.milestone_tasks (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  title text not null,
  is_completed boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.change_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  assignment_id uuid references public.project_assignments(id) on delete set null,
  milestone_id uuid references public.milestones(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'in_progress', 'done')),
  additional_deal numeric not null default 0 check (additional_deal >= 0),
  additional_cost numeric not null default 0 check (additional_cost >= 0),
  deadline_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (additional_cost <= additional_deal)
);

create table public.updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  assignment_id uuid references public.project_assignments(id) on delete set null,
  milestone_id uuid references public.milestones(id) on delete set null,
  note text not null,
  status text not null default 'ongoing'
    check (status in ('ongoing', 'review', 'revision', 'done')),
  created_at timestamptz not null default now()
);

create table public.handover_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  is_completed boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.invoice_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references public.users(id) on delete cascade default auth.uid(),
  token text not null unique,
  enabled boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index projects_created_by_idx on public.projects(created_by);
create index projects_assigned_to_idx on public.projects(assigned_to);
create index project_assignments_project_id_idx on public.project_assignments(project_id);
create index project_assignments_assigned_to_idx on public.project_assignments(assigned_to);
create index payments_project_id_idx on public.payments(project_id);
create index payments_assignment_id_idx on public.payments(assignment_id);
create index milestones_project_id_idx on public.milestones(project_id);
create index milestones_assignment_id_idx on public.milestones(assignment_id);
create index milestone_tasks_milestone_id_idx on public.milestone_tasks(milestone_id);
create index change_requests_project_id_idx on public.change_requests(project_id);
create index change_requests_assignment_id_idx on public.change_requests(assignment_id);
create index change_requests_milestone_id_idx on public.change_requests(milestone_id);
create index updates_project_id_idx on public.updates(project_id);
create index updates_assignment_id_idx on public.updates(assignment_id);
create index updates_milestone_id_idx on public.updates(milestone_id);
create index handover_items_project_id_idx on public.handover_items(project_id);
create index invoice_links_project_id_idx on public.invoice_links(project_id);
create index invoice_links_token_idx on public.invoice_links(token);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger milestones_set_updated_at
before update on public.milestones
for each row execute function public.set_updated_at();

create trigger change_requests_set_updated_at
before update on public.change_requests
for each row execute function public.set_updated_at();

create trigger project_assignments_set_updated_at
before update on public.project_assignments
for each row execute function public.set_updated_at();

create or replace function public.guard_project_assignment_fee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
begin
  select p.created_by
  into owner_id
  from public.projects p
  where p.id = new.project_id;

  if new.assigned_to is null or new.assigned_to = owner_id then
    new.internal_fee := 0;
  end if;

  return new;
end;
$$;

create trigger guard_project_assignment_fee
before insert or update on public.project_assignments
for each row execute function public.guard_project_assignment_fee();

create or replace function public.guard_change_request_cost()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  has_external_assignee boolean;
begin
  if new.assignment_id is not null then
    select pa.assigned_to is not null and pa.assigned_to <> p.created_by
    into has_external_assignee
    from public.project_assignments pa
    join public.projects p on p.id = pa.project_id
    where pa.id = new.assignment_id
      and pa.project_id = new.project_id;
  else
    select p.assigned_to is not null and p.assigned_to <> p.created_by
    into has_external_assignee
    from public.projects p
    where p.id = new.project_id;
  end if;

  if not coalesce(has_external_assignee, false) then
    new.additional_cost := 0;
  end if;

  return new;
end;
$$;

create trigger guard_change_request_cost
before insert or update on public.change_requests
for each row execute function public.guard_change_request_cost();

create or replace function public.user_display_name(user_email text, metadata jsonb)
returns text
language sql
stable
as $$
  select coalesce(
    nullif(trim(metadata->>'name'), ''),
    nullif(trim(metadata->>'full_name'), ''),
    nullif(split_part(user_email, '@', 1), ''),
    'User'
  );
$$;

insert into public.users (id, name, email, created_at)
select
  id,
  public.user_display_name(email, raw_user_meta_data),
  email,
  created_at
from auth.users
on conflict (id) do update
set
  name = excluded.name,
  email = excluded.email;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, email)
  values (
    new.id,
    public.user_display_name(new.email, new.raw_user_meta_data),
    new.email
  )
  on conflict (id) do update
  set
    name = excluded.name,
    email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_new_user();

-- Assigned users may update only status. Owners can update all project fields.
create or replace function public.guard_project_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'created_by cannot be changed';
  end if;

  if auth.uid() is not null and auth.uid() <> old.created_by then
    if new.name is distinct from old.name
      or new.client is distinct from old.client
      or new.project_type is distinct from old.project_type
      or new.project_types is distinct from old.project_types
      or new.deadline_at is distinct from old.deadline_at
      or new.total_deal is distinct from old.total_deal
      or new.internal_cost is distinct from old.internal_cost
      or new.assigned_to is distinct from old.assigned_to
      or new.created_at is distinct from old.created_at
    then
      raise exception 'assigned users can only update project status';
    end if;
  end if;

  return new;
end;
$$;

create trigger guard_project_update
before update on public.projects
for each row execute function public.guard_project_update();

alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.project_assignments enable row level security;
alter table public.payments enable row level security;
alter table public.milestones enable row level security;
alter table public.milestone_tasks enable row level security;
alter table public.change_requests enable row level security;
alter table public.updates enable row level security;
alter table public.handover_items enable row level security;
alter table public.invoice_links enable row level security;

create or replace function public.is_project_owner(project_uuid uuid, user_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = project_uuid
      and p.created_by = user_uuid
  );
$$;

create or replace function public.is_project_role_assignee(project_uuid uuid, user_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_assignments pa
    where pa.project_id = project_uuid
      and pa.assigned_to = user_uuid
  );
$$;

create or replace function public.is_assignment_assignee(assignment_uuid uuid, user_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_assignments pa
    where pa.id = assignment_uuid
      and pa.assigned_to = user_uuid
  );
$$;

create policy users_select_authenticated
on public.users for select
to authenticated
using (true);

create policy users_insert_self
on public.users for insert
to authenticated
with check (id = auth.uid());

create policy users_update_self
on public.users for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy projects_select_visible
on public.projects for select
to authenticated
using (
  created_by = auth.uid()
  or assigned_to = auth.uid()
  or public.is_project_role_assignee(projects.id, auth.uid())
);

create policy projects_insert_own
on public.projects for insert
to authenticated
with check (created_by = auth.uid());

create policy projects_update_owner
on public.projects for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy projects_update_assignee_status
on public.projects for update
to authenticated
using (
  assigned_to = auth.uid()
  or public.is_project_role_assignee(projects.id, auth.uid())
)
with check (
  assigned_to = auth.uid()
  or public.is_project_role_assignee(projects.id, auth.uid())
);

create policy projects_delete_owner
on public.projects for delete
to authenticated
using (created_by = auth.uid());

create policy project_assignments_select_visible
on public.project_assignments for select
to authenticated
using (
  assigned_to = auth.uid()
  or public.is_project_owner(project_assignments.project_id, auth.uid())
);

create policy project_assignments_insert_owner
on public.project_assignments for insert
to authenticated
with check (
  public.is_project_owner(project_assignments.project_id, auth.uid())
);

create policy project_assignments_update_owner
on public.project_assignments for update
to authenticated
using (
  public.is_project_owner(project_assignments.project_id, auth.uid())
)
with check (
  public.is_project_owner(project_assignments.project_id, auth.uid())
);

create policy project_assignments_delete_owner
on public.project_assignments for delete
to authenticated
using (
  public.is_project_owner(project_assignments.project_id, auth.uid())
);

create policy payments_select_visible
on public.payments for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = payments.project_id
      and (
        p.created_by = auth.uid()
        or (
          payments.type = 'freelancer'
          and (
            (p.assigned_to = auth.uid() and payments.assignment_id is null)
            or exists (
              select 1
              from public.project_assignments pa
              where pa.id = payments.assignment_id
                and pa.assigned_to = auth.uid()
            )
          )
        )
      )
  )
);

create policy payments_insert_owner
on public.payments for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects p
    where p.id = payments.project_id
      and p.created_by = auth.uid()
  )
);

create policy payments_update_owner
on public.payments for update
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = payments.project_id
      and p.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = payments.project_id
      and p.created_by = auth.uid()
  )
);

create policy payments_delete_owner
on public.payments for delete
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = payments.project_id
      and p.created_by = auth.uid()
  )
);

create policy milestones_select_visible
on public.milestones for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = milestones.project_id
      and (
        p.created_by = auth.uid()
        or (
          milestones.assignment_id is null
          and p.assigned_to = auth.uid()
          and not exists (
            select 1 from public.project_assignments pa where pa.project_id = p.id
          )
        )
        or exists (
          select 1
          from public.project_assignments pa
          where pa.id = milestones.assignment_id
            and pa.assigned_to = auth.uid()
        )
      )
  )
);

create policy milestones_insert_visible
on public.milestones for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects p
    where p.id = milestones.project_id
      and (
        p.created_by = auth.uid()
        or (
          milestones.assignment_id is null
          and p.assigned_to = auth.uid()
          and not exists (
            select 1 from public.project_assignments pa where pa.project_id = p.id
          )
        )
        or exists (
          select 1
          from public.project_assignments pa
          where pa.id = milestones.assignment_id
            and pa.assigned_to = auth.uid()
        )
      )
  )
);

create policy milestones_update_visible
on public.milestones for update
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = milestones.project_id
      and (
        p.created_by = auth.uid()
        or (
          milestones.assignment_id is null
          and p.assigned_to = auth.uid()
          and not exists (
            select 1 from public.project_assignments pa where pa.project_id = p.id
          )
        )
        or exists (
          select 1
          from public.project_assignments pa
          where pa.id = milestones.assignment_id
            and pa.assigned_to = auth.uid()
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = milestones.project_id
      and (
        p.created_by = auth.uid()
        or (
          milestones.assignment_id is null
          and p.assigned_to = auth.uid()
          and not exists (
            select 1 from public.project_assignments pa where pa.project_id = p.id
          )
        )
        or exists (
          select 1
          from public.project_assignments pa
          where pa.id = milestones.assignment_id
            and pa.assigned_to = auth.uid()
        )
      )
  )
);

create policy milestones_delete_visible
on public.milestones for delete
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = milestones.project_id
      and (
        p.created_by = auth.uid()
        or (
          milestones.assignment_id is null
          and p.assigned_to = auth.uid()
          and not exists (
            select 1 from public.project_assignments pa where pa.project_id = p.id
          )
        )
        or exists (
          select 1
          from public.project_assignments pa
          where pa.id = milestones.assignment_id
            and pa.assigned_to = auth.uid()
        )
      )
  )
);

create policy milestone_tasks_select_visible
on public.milestone_tasks for select
to authenticated
using (
  exists (
    select 1
    from public.milestones m
    join public.projects p on p.id = m.project_id
    where m.id = milestone_tasks.milestone_id
      and (
        p.created_by = auth.uid()
        or (
          m.assignment_id is null
          and p.assigned_to = auth.uid()
          and not exists (
            select 1 from public.project_assignments pa where pa.project_id = p.id
          )
        )
        or exists (
          select 1
          from public.project_assignments pa
          where pa.id = m.assignment_id
            and pa.assigned_to = auth.uid()
        )
      )
  )
);

create policy milestone_tasks_insert_visible
on public.milestone_tasks for insert
to authenticated
with check (
  exists (
    select 1
    from public.milestones m
    join public.projects p on p.id = m.project_id
    where m.id = milestone_tasks.milestone_id
      and (
        p.created_by = auth.uid()
        or (
          m.assignment_id is null
          and p.assigned_to = auth.uid()
          and not exists (
            select 1 from public.project_assignments pa where pa.project_id = p.id
          )
        )
        or exists (
          select 1
          from public.project_assignments pa
          where pa.id = m.assignment_id
            and pa.assigned_to = auth.uid()
        )
      )
  )
);

create policy milestone_tasks_update_visible
on public.milestone_tasks for update
to authenticated
using (
  exists (
    select 1
    from public.milestones m
    join public.projects p on p.id = m.project_id
    where m.id = milestone_tasks.milestone_id
      and (
        p.created_by = auth.uid()
        or (
          m.assignment_id is null
          and p.assigned_to = auth.uid()
          and not exists (
            select 1 from public.project_assignments pa where pa.project_id = p.id
          )
        )
        or exists (
          select 1
          from public.project_assignments pa
          where pa.id = m.assignment_id
            and pa.assigned_to = auth.uid()
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.milestones m
    join public.projects p on p.id = m.project_id
    where m.id = milestone_tasks.milestone_id
      and (
        p.created_by = auth.uid()
        or (
          m.assignment_id is null
          and p.assigned_to = auth.uid()
          and not exists (
            select 1 from public.project_assignments pa where pa.project_id = p.id
          )
        )
        or exists (
          select 1
          from public.project_assignments pa
          where pa.id = m.assignment_id
            and pa.assigned_to = auth.uid()
        )
      )
  )
);

create policy milestone_tasks_delete_visible
on public.milestone_tasks for delete
to authenticated
using (
  exists (
    select 1
    from public.milestones m
    join public.projects p on p.id = m.project_id
    where m.id = milestone_tasks.milestone_id
      and (
        p.created_by = auth.uid()
        or (
          m.assignment_id is null
          and p.assigned_to = auth.uid()
          and not exists (
            select 1 from public.project_assignments pa where pa.project_id = p.id
          )
        )
        or exists (
          select 1
          from public.project_assignments pa
          where pa.id = m.assignment_id
            and pa.assigned_to = auth.uid()
        )
      )
  )
);

create policy change_requests_select_visible
on public.change_requests for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = change_requests.project_id
      and (
        p.created_by = auth.uid()
        or (
          change_requests.assignment_id is null
          and p.assigned_to = auth.uid()
          and not exists (
            select 1 from public.project_assignments pa where pa.project_id = p.id
          )
        )
        or exists (
          select 1
          from public.project_assignments pa
          where pa.id = change_requests.assignment_id
            and pa.assigned_to = auth.uid()
        )
      )
  )
);

create policy change_requests_insert_owner
on public.change_requests for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects p
    where p.id = change_requests.project_id
      and p.created_by = auth.uid()
  )
);

create policy change_requests_update_owner
on public.change_requests for update
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = change_requests.project_id
      and p.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = change_requests.project_id
      and p.created_by = auth.uid()
  )
);

create policy change_requests_delete_owner
on public.change_requests for delete
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = change_requests.project_id
      and p.created_by = auth.uid()
  )
);

create policy updates_select_visible
on public.updates for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = updates.project_id
      and (
        p.created_by = auth.uid()
        or (
          updates.assignment_id is null
          and p.assigned_to = auth.uid()
          and not exists (
            select 1 from public.project_assignments pa where pa.project_id = p.id
          )
        )
        or exists (
          select 1
          from public.project_assignments pa
          where pa.id = updates.assignment_id
            and pa.assigned_to = auth.uid()
        )
      )
  )
);

create policy updates_insert_visible
on public.updates for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects p
    where p.id = updates.project_id
      and (
        p.created_by = auth.uid()
        or (
          updates.assignment_id is null
          and p.assigned_to = auth.uid()
          and not exists (
            select 1 from public.project_assignments pa where pa.project_id = p.id
          )
        )
        or exists (
          select 1
          from public.project_assignments pa
          where pa.id = updates.assignment_id
            and pa.assigned_to = auth.uid()
        )
      )
  )
);

create policy updates_update_owner
on public.updates for update
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = updates.project_id
      and p.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = updates.project_id
      and p.created_by = auth.uid()
  )
);

create policy updates_delete_owner
on public.updates for delete
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = updates.project_id
      and p.created_by = auth.uid()
  )
);

create policy handover_items_owner_all
on public.handover_items for all
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = handover_items.project_id
      and p.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = handover_items.project_id
      and p.created_by = auth.uid()
  )
);

create policy invoice_links_owner_all
on public.invoice_links for all
to authenticated
using (created_by = auth.uid())
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.projects p
    where p.id = invoice_links.project_id
      and p.created_by = auth.uid()
  )
);

create or replace function public.get_public_invoice(invoice_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  link_row public.invoice_links%rowtype;
  project_row public.projects%rowtype;
  scopes jsonb;
  paid numeric;
  additional_total numeric;
begin
  select *
  into link_row
  from public.invoice_links
  where token = invoice_token
    and enabled = true
    and (expires_at is null or expires_at > now())
  limit 1;

  if not found then
    return null;
  end if;

  select *
  into project_row
  from public.projects
  where id = link_row.project_id;

  if not found then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'title', cr.title,
        'description', cr.description,
        'amount', cr.additional_deal
      )
      order by cr.created_at
    ),
    '[]'::jsonb
  )
  into scopes
  from public.change_requests cr
  where cr.project_id = project_row.id
    and cr.status in ('approved', 'in_progress', 'done');

  select coalesce(sum(cr.additional_deal), 0)
  into additional_total
  from public.change_requests cr
  where cr.project_id = project_row.id
    and cr.status in ('approved', 'in_progress', 'done');

  select coalesce(sum(p.amount), 0)
  into paid
  from public.payments p
  where p.project_id = project_row.id
    and p.type = 'client';

  return jsonb_build_object(
    'invoice_number',
      'INV-' || to_char(link_row.created_at, 'YYYYMMDD') || '-' || upper(left(project_row.id::text, 6)),
    'issued_at', link_row.created_at,
    'project', jsonb_build_object(
      'id', project_row.id,
      'name', project_row.name,
      'client', project_row.client,
      'status', project_row.status,
      'project_type', project_row.project_type,
      'project_types', project_row.project_types,
      'deadline_at', project_row.deadline_at,
      'base_deal', project_row.total_deal,
      'total_deal', project_row.total_deal + additional_total
    ),
    'scopes', scopes,
    'client_paid', paid
  );
end;
$$;

grant select, insert, update on public.users to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.project_assignments to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert, update, delete on public.milestones to authenticated;
grant select, insert, update, delete on public.milestone_tasks to authenticated;
grant select, insert, update, delete on public.change_requests to authenticated;
grant select, insert, update, delete on public.updates to authenticated;
grant select, insert, update, delete on public.handover_items to authenticated;
grant select, insert, update, delete on public.invoice_links to authenticated;
grant execute on function public.get_public_invoice(text) to anon, authenticated;

grant all on all tables in schema public to postgres, service_role;
grant all on all routines in schema public to postgres, service_role;
grant all on all sequences in schema public to postgres, service_role;
