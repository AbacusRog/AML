-- Adds a company_number column, used to remember a confirmed Companies House
-- match so future checks skip straight to it instead of searching by name.
-- Run this after schema.sql.

alter table doc_generator_clients
  add column if not exists company_number text;
