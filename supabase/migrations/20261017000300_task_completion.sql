-- When a task was finished, for daily review and weekly achievement rates.
alter table public.tasks add column completed_at timestamptz;
create index tasks_user_created on public.tasks (user_id, created_at desc);
