-- Add project priority and paid change requests without removing existing data.
-- Run after 20260605_project_workflow_upgrade.sql.

alter table public.projects
  add column if not exists priority text not null default 'medium';

alter table public.projects
  drop constraint if exists projects_priority_check;

alter table public.projects
  add constraint projects_priority_check
    check (priority in ('low', 'medium', 'high', 'urgent'));

update public.projects
set internal_cost = 0
where assigned_to is null or assigned_to = created_by;

alter table public.projects
  drop constraint if exists projects_self_assignment_cost_check;

alter table public.projects
  add constraint projects_self_assignment_cost_check
    check ((assigned_to is not null and assigned_to <> created_by) or internal_cost = 0);

create table if not exists public.change_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
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

create index if not exists change_requests_project_id_idx
  on public.change_requests(project_id);
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

create or replace function public.guard_change_request_cost()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  has_external_assignee boolean;
begin
  select p.assigned_to is not null and p.assigned_to <> p.created_by
  into has_external_assignee
  from public.projects p
  where p.id = new.project_id;

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
      or new.priority is distinct from old.priority
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

alter table public.change_requests enable row level security;

drop policy if exists change_requests_select_visible on public.change_requests;
create policy change_requests_select_visible
on public.change_requests for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = change_requests.project_id
      and (p.created_by = auth.uid() or p.assigned_to = auth.uid())
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

grant select, insert, update, delete on public.change_requests to authenticated;
