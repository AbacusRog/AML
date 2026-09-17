# Client Document Generator

React + Vite + TypeScript + Tailwind, Supabase (Postgres + Auth), deployed on Cloudflare Pages —
same stack as your other apps.

Generates, per selected client/director:
- an **engagement letter** (Word, from the Limited Company or Personal Tax "Schedule of Services" template)
- an **AML periodic review** (PDF, with the real Yes/No/N-A checkboxes pre-ticked)

both as separate downloadable files.

## 1. Database

In your Supabase project's SQL editor (the shared "Carglass" project), run `supabase/schema.sql`.
It creates `doc_generator_clients` — a new table, so it won't collide with `cs_mailer_clients` or
any other app's own clients table in that project — with RLS locked to signed-in users only.

## 2. Auth

Uses Supabase Auth (email/password), same as `cs-mailer` and the IFK register. Create yourself a
user under Authentication → Users in the Supabase dashboard (or enable sign-ups temporarily) —
there's no separate sign-up screen in the app itself.

## 3. Local dev

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL + anon key
npm run dev
```

## 4. Deploy (Cloudflare Pages, matching your usual flow)

1. Create a new GitHub repo and upload this project's files via the GitHub web UI.
2. In Cloudflare Pages, connect that repo.
   - Build command: `npm run build`
   - Build output directory: `dist`
3. Under the Pages project's **Settings → Environment variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   (same project/keys as your other apps — find them in Supabase → Project Settings → API)
4. Deploy. First run: sign in, then use the "Upload client export" button to import your
   `All_Clients_Contact_Info` spreadsheet into `doc_generator_clients`. Re-uploading a newer
   export later updates existing rows (matched by client code) rather than duplicating them.

## Notes

- Individuals come through as "Surname, Firstname", exactly as the source export has them.
- Company number, trading name, nature of business, and services fields on the AML form are left
  blank — they're not in the client export. Add those columns to the import/table later if you
  want them auto-filled too.
- The two Word templates and the AML PDF live in `src/assets/` and are bundled into the build —
  edit them there (keeping the `{name}` / `{address}` / `{date}` merge markers in the .docx files)
  if the wording ever needs to change.
