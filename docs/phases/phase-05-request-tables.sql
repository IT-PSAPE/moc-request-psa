-- phase-05-request-tables.sql

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  tracking_id text not null unique,
  title text not null,
  category_id uuid references public.categories(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  priority public.request_priority not null default 'medium',
  status public.request_status not null default 'submitted',
  due_date timestamptz,
  requested_by_name text not null,
  requested_by_email text,
  submitted_by_user_id uuid references public.profiles(id) on delete set null,
  source public.submission_source not null default 'internal',
  who text not null default '',
  what text not null default '',
  when_text text not null default '',
  where_text text not null default '',
  why text not null default '',
  how text not null default '',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.request_assignees (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  duty text not null default 'assignee',
  created_at timestamptz not null default now(),
  unique (request_id, user_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action public.activity_action not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
