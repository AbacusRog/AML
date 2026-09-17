-- Client Document Generator
-- Run this once in your Supabase project's SQL editor (the shared "Carglass" project).
-- Named doc_generator_clients so it doesn't collide with cs_mailer_clients or any
-- other per-app clients table already in that project.

create table if not exists doc_generator_clients (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  type text default '',
  addr1 text default '',
  addr2 text default '',
  town text default '',
  county text default '',
  postcode text default '',
  contact_number text default '',
  email text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- pg_trgm powers fast partial-name search (ilike '%...%'); enable it before the index below.
create extension if not exists pg_trgm;
create index if not exists doc_generator_clients_name_idx on doc_generator_clients using gin (name gin_trgm_ops);

-- Keep updated_at current on every edit.
create or replace function doc_generator_clients_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_doc_generator_clients_updated_at on doc_generator_clients;
create trigger trg_doc_generator_clients_updated_at
  before update on doc_generator_clients
  for each row execute function doc_generator_clients_set_updated_at();

-- Row Level Security: only signed-in users (matching the rest of your apps) can read/write.
alter table doc_generator_clients enable row level security;

drop policy if exists "Authenticated users can read clients" on doc_generator_clients;
create policy "Authenticated users can read clients"
  on doc_generator_clients for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert clients" on doc_generator_clients;
create policy "Authenticated users can insert clients"
  on doc_generator_clients for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update clients" on doc_generator_clients;
create policy "Authenticated users can update clients"
  on doc_generator_clients for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete clients" on doc_generator_clients;
create policy "Authenticated users can delete clients"
  on doc_generator_clients for delete
  to authenticated
  using (true);
