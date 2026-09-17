-- Links a company to the directors you've chosen for it before, so picking
-- the company again can auto-suggest the same directors.
-- Run this after schema.sql.

create table if not exists doc_generator_company_directors (
  company_id uuid not null references doc_generator_clients(id) on delete cascade,
  director_id uuid not null references doc_generator_clients(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (company_id, director_id)
);

alter table doc_generator_company_directors enable row level security;

drop policy if exists "Authenticated users can read director links" on doc_generator_company_directors;
create policy "Authenticated users can read director links"
  on doc_generator_company_directors for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert director links" on doc_generator_company_directors;
create policy "Authenticated users can insert director links"
  on doc_generator_company_directors for insert
  to authenticated
  with check (true);

-- upsert() compiles to INSERT ... ON CONFLICT DO UPDATE, which Postgres will
-- only allow if RLS authorizes BOTH the insert and the update half of that
-- statement — even for a link that's brand new and has nothing to conflict
-- with yet. Skipping this policy makes every save silently fail.
drop policy if exists "Authenticated users can update director links" on doc_generator_company_directors;
create policy "Authenticated users can update director links"
  on doc_generator_company_directors for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete director links" on doc_generator_company_directors;
create policy "Authenticated users can delete director links"
  on doc_generator_company_directors for delete
  to authenticated
  using (true);
