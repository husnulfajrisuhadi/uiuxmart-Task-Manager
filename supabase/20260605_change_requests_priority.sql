-- Add multi-type projects, paid scope additions, and billing helpers without removing existing data.
-- Run after 20260605_project_workflow_upgrade.sql.

alter table public.projects
  add column if not exists project_types text[] not null default '{}'::text[];

alter table public.projects
  drop constraint if exists projects_project_types_check;

alter table public.projects
  add constraint projects_project_types_check
    check (project_types <@ array['ui_ux_design', 'thesis', 'web_app']::text[]);

update public.projects
set project_types = array[project_type]
where project_type is not null and cardinality(project_types) = 0;

create table if not exists public.project_assignments (
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

create index if not exists project_assignments_project_id_idx
  on public.project_assignments(project_id);
create index if not exists project_assignments_assigned_to_idx
  on public.project_assignments(assigned_to);

alter table public.payments
  add column if not exists assignment_id uuid references public.project_assignments(id) on delete set null;
alter table public.milestones
  add column if not exists assignment_id uuid references public.project_assignments(id) on delete set null;
alter table public.updates
  add column if not exists assignment_id uuid references public.project_assignments(id) on delete set null;

create index if not exists payments_assignment_id_idx on public.payments(assignment_id);
create index if not exists milestones_assignment_id_idx on public.milestones(assignment_id);
create index if not exists updates_assignment_id_idx on public.updates(assignment_id);

insert into public.project_assignments (
  project_id,
  project_type,
  assigned_to,
  role_label,
  deal_amount,
  internal_fee,
  sort_order
)
select
  p.id,
  coalesce(p.project_type, 'web_app'),
  coalesce(p.assigned_to, p.created_by),
  case
    when p.project_type = 'ui_ux_design' then 'Design UI/UX'
    when p.project_type = 'thesis' then 'Pengerjaan Skripsi'
    else 'Website/Aplikasi'
  end,
  p.total_deal,
  case when p.assigned_to is not null and p.assigned_to <> p.created_by then p.internal_cost else 0 end,
  0
from public.projects p
where not exists (
  select 1
  from public.project_assignments pa
  where pa.project_id = p.id
);

alter table public.projects
  drop constraint if exists projects_priority_check,
  drop column if exists priority;

update public.projects
set internal_cost = 0
where assigned_to is null or assigned_to = created_by;

alter table public.projects
  drop constraint if exists projects_self_assignment_cost_check;

alter table public.projects
  add constraint projects_self_assignment_cost_check
    check ((assigned_to is not null and assigned_to <> created_by) or internal_cost = 0);

alter table public.milestones
  drop constraint if exists milestones_status_check;

alter table public.milestones
  add constraint milestones_status_check
    check (status in ('planned', 'in_progress', 'review', 'revision', 'done'));

create table if not exists public.change_requests (
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

alter table public.change_requests
  add column if not exists assignment_id uuid references public.project_assignments(id) on delete set null;

create index if not exists change_requests_project_id_idx
  on public.change_requests(project_id);
create index if not exists change_requests_assignment_id_idx
  on public.change_requests(assignment_id);
create index if not exists change_requests_milestone_id_idx
  on public.change_requests(milestone_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists change_requests_set_updated_at on public.change_requests;
create trigger change_requests_set_updated_at
before update on public.change_requests
for each row execute function public.set_updated_at();

drop trigger if exists project_assignments_set_updated_at on public.project_assignments;
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

drop trigger if exists guard_project_assignment_fee on public.project_assignments;
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

drop trigger if exists guard_change_request_cost on public.change_requests;
create trigger guard_change_request_cost
before insert or update on public.change_requests
for each row execute function public.guard_change_request_cost();

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

create table if not exists public.handover_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  is_completed boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.invoice_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references public.users(id) on delete cascade default auth.uid(),
  token text not null unique,
  enabled boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists handover_items_project_id_idx on public.handover_items(project_id);
create index if not exists invoice_links_project_id_idx on public.invoice_links(project_id);
create index if not exists invoice_links_token_idx on public.invoice_links(token);

alter table public.project_assignments enable row level security;
alter table public.change_requests enable row level security;
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

drop policy if exists projects_select_visible on public.projects;
create policy projects_select_visible
on public.projects for select
to authenticated
using (
  created_by = auth.uid()
  or assigned_to = auth.uid()
  or public.is_project_role_assignee(projects.id, auth.uid())
);

drop policy if exists projects_update_assignee_status on public.projects;
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

drop policy if exists project_assignments_select_visible on public.project_assignments;
create policy project_assignments_select_visible
on public.project_assignments for select
to authenticated
using (
  assigned_to = auth.uid()
  or public.is_project_owner(project_assignments.project_id, auth.uid())
);

drop policy if exists project_assignments_insert_owner on public.project_assignments;
create policy project_assignments_insert_owner
on public.project_assignments for insert
to authenticated
with check (
  public.is_project_owner(project_assignments.project_id, auth.uid())
);

drop policy if exists project_assignments_update_owner on public.project_assignments;
create policy project_assignments_update_owner
on public.project_assignments for update
to authenticated
using (
  public.is_project_owner(project_assignments.project_id, auth.uid())
)
with check (
  public.is_project_owner(project_assignments.project_id, auth.uid())
);

drop policy if exists project_assignments_delete_owner on public.project_assignments;
create policy project_assignments_delete_owner
on public.project_assignments for delete
to authenticated
using (
  public.is_project_owner(project_assignments.project_id, auth.uid())
);

drop policy if exists payments_select_visible on public.payments;
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

drop policy if exists milestones_select_visible on public.milestones;
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

drop policy if exists milestones_insert_visible on public.milestones;
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

drop policy if exists milestones_update_visible on public.milestones;
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

drop policy if exists milestones_delete_visible on public.milestones;
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

drop policy if exists milestone_tasks_select_visible on public.milestone_tasks;
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

drop policy if exists milestone_tasks_insert_visible on public.milestone_tasks;
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

drop policy if exists milestone_tasks_update_visible on public.milestone_tasks;
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

drop policy if exists milestone_tasks_delete_visible on public.milestone_tasks;
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

drop policy if exists updates_select_visible on public.updates;
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

drop policy if exists updates_insert_visible on public.updates;
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

drop policy if exists change_requests_select_visible on public.change_requests;
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

drop policy if exists change_requests_insert_owner on public.change_requests;
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

drop policy if exists change_requests_update_owner on public.change_requests;
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

drop policy if exists change_requests_delete_owner on public.change_requests;
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

drop policy if exists handover_items_owner_all on public.handover_items;
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

drop policy if exists invoice_links_owner_all on public.invoice_links;
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

grant select, insert, update, delete on public.project_assignments to authenticated;
grant select, insert, update, delete on public.change_requests to authenticated;
grant select, insert, update, delete on public.handover_items to authenticated;
grant select, insert, update, delete on public.invoice_links to authenticated;
grant execute on function public.get_public_invoice(text) to anon, authenticated;
