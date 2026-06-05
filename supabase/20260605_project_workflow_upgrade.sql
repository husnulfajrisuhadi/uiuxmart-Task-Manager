-- Upgrade existing Task Manager data without dropping any project or payment.

alter table public.projects
  add column if not exists project_type text,
  add column if not exists deadline_at timestamptz;

alter table public.projects
  drop constraint if exists projects_status_check,
  drop constraint if exists projects_project_type_check;

alter table public.projects
  add constraint projects_status_check
    check (status in ('ongoing', 'review', 'revision', 'done')),
  add constraint projects_project_type_check
    check (project_type is null or project_type in ('ui_ux_design', 'thesis', 'web_app'));

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'review', 'done')),
  deadline_at timestamptz,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.milestone_tasks (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  title text not null,
  is_completed boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.updates
  add column if not exists milestone_id uuid references public.milestones(id) on delete set null;

alter table public.updates
  drop constraint if exists updates_status_check;

alter table public.updates
  add constraint updates_status_check
    check (status in ('ongoing', 'review', 'revision', 'done'));

create index if not exists milestones_project_id_idx on public.milestones(project_id);
create index if not exists milestone_tasks_milestone_id_idx
  on public.milestone_tasks(milestone_id);
create index if not exists updates_milestone_id_idx on public.updates(milestone_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists milestones_set_updated_at on public.milestones;
create trigger milestones_set_updated_at
before update on public.milestones
for each row execute function public.set_updated_at();

-- Keep the existing rule: assignees may only change project status.
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

alter table public.milestones enable row level security;
alter table public.milestone_tasks enable row level security;

drop policy if exists milestones_select_visible on public.milestones;
create policy milestones_select_visible
on public.milestones for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = milestones.project_id
      and (p.created_by = auth.uid() or p.assigned_to = auth.uid())
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
      and (p.created_by = auth.uid() or p.assigned_to = auth.uid())
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
      and (p.created_by = auth.uid() or p.assigned_to = auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = milestones.project_id
      and (p.created_by = auth.uid() or p.assigned_to = auth.uid())
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
      and (p.created_by = auth.uid() or p.assigned_to = auth.uid())
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
      and (p.created_by = auth.uid() or p.assigned_to = auth.uid())
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
      and (p.created_by = auth.uid() or p.assigned_to = auth.uid())
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
      and (p.created_by = auth.uid() or p.assigned_to = auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.milestones m
    join public.projects p on p.id = m.project_id
    where m.id = milestone_tasks.milestone_id
      and (p.created_by = auth.uid() or p.assigned_to = auth.uid())
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
      and (p.created_by = auth.uid() or p.assigned_to = auth.uid())
  )
);

grant select, insert, update, delete on public.milestones to authenticated;
grant select, insert, update, delete on public.milestone_tasks to authenticated;
