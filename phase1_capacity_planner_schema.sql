-- Phase 1 schema changes for Capacity Planner upgrade
-- Safe to review before applying.

begin;

create table if not exists public.cp_curves (
  id bigserial primary key,
  curve_id text not null unique,
  version text not null default 'v1.0.0',
  job_type text not null,
  task_type text not null,
  curve_type text,
  curve_status text not null default 'Active',
  weekly_percentages jsonb not null,
  description text,
  derived_from text,
  curve_family text,
  curve_parameters jsonb,
  domain_min numeric(10,6) default 0,
  domain_max numeric(10,6) default 1,
  normalisation_rule text default 'integrate_to_one',
  allocation_method text default 'equal_width_bins',
  constraints jsonb,
  spec_validated boolean not null default false,
  validated_at timestamptz,
  fit_quality numeric(8,4),
  spec_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cp_curves_job_type_task_type_idx
  on public.cp_curves (job_type, task_type);

create table if not exists public.cp_curve_registry (
  id bigserial primary key,
  job_type text not null,
  task_type text not null,
  default_curve_id text not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cp_curve_registry_default_curve_fk
    foreign key (default_curve_id) references public.cp_curves(curve_id) on delete cascade,
  constraint cp_curve_registry_job_task_unique unique (job_type, task_type)
);

create index if not exists cp_curve_registry_job_type_task_type_idx
  on public.cp_curve_registry (job_type, task_type);

create table if not exists public.cp_company_closures (
  id bigserial primary key,
  name text not null,
  start_date date not null,
  end_date date not null,
  closure_type text not null default 'Public Holiday',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cp_company_closures_date_check check (end_date >= start_date)
);

create index if not exists cp_company_closures_date_idx
  on public.cp_company_closures (start_date, end_date);

alter table public.cp_staff
  add column if not exists employee_type text not null default 'employee';

alter table public.cp_staff
  add constraint cp_staff_employee_type_check
  check (employee_type in ('employee', 'contractor'));

alter table public.cp_staff
  add column if not exists updated_at timestamptz default now();

alter table public.cp_staff_leave
  add column if not exists start_date date;

alter table public.cp_staff_leave
  add column if not exists end_date date;

alter table public.cp_staff_leave
  add column if not exists absence_type text;

alter table public.cp_staff_leave
  add column if not exists updated_at timestamptz default now();

update public.cp_staff_leave
set
  start_date = coalesce(start_date, date),
  end_date = coalesce(end_date, date),
  absence_type = coalesce(absence_type, leave_type)
where start_date is null
   or end_date is null
   or absence_type is null;

create index if not exists cp_staff_leave_staff_range_idx
  on public.cp_staff_leave (staff_mongo_id, start_date, end_date);

commit;
