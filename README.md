# Client Document Generator

React + Vite + TypeScript + Tailwind, Supabase (Postgres + Auth), deployed on Cloudflare Pages —
same stack as your other apps.

Generates, per selected client/director:
- an **engagement letter** (PDF, from the Limited Company or Personal Tax "Schedule of Services"
  wording), for the company and every selected director
- an **AML periodic review** (PDF, with the real Yes/No/N-A checkboxes pre-ticked) — **company
  only**, not generated for directors

each as a separate downloadable file. Selecting a company also offers a one-click check against
Companies House (name, address, status, active directors).

## 1. Database

In your Supabase project's SQL editor (the shared "Carglass" project), run, in order:
1. `supabase/schema.sql`
2. `supabase/company_directors.sql`
3. `supabase/company_number.sql`

Together they create:
- `doc_generator_clients` — a new table, so it won't collide with `cs_mailer_clients` or any other
  app's own clients table in that project — plus a `company_number` column used by the Companies
  House check
- `doc_generator_company_directors` — remembers which directors go with which company, so picking
  a company again auto-suggests them

both with RLS locked to signed-in users only.

## 2. Auth

Uses Supabase Auth (email/password), same as `cs-mailer` and the IFK register. Create yourself a
user under Authentication → Users in the Supabase dashboard (or enable sign-ups temporarily) —
there's no separate sign-up screen in the app itself.

## 3. Companies House check (optional)

Selecting a company shows a "Check Companies House" button that looks up the company's official
name, registered address, status, and active directors, and lets you update your record or
add/link any missing directors with one click.

This needs a free Companies House API key:
1. Register at [developer.company-information.service.gov.uk](https://developer.company-information.service.gov.uk),
   create an application (REST API, "Live" environment), and copy its API key.
2. In Cloudflare Pages → this project → **Settings → Environment variables**, add
   `COMPANIES_HOUSE_API_KEY` with that key.

The key is only ever used server-side, in `functions/api/companies-house/*.ts` (Cloudflare Pages
Functions, same pattern as the Resend integration in your payslip mailer) — it never reaches the
browser. Note that Pages Functions only run once deployed (or under `wrangler pages dev`), not
under plain `npm run dev`, so this piece can't be exercised by local dev alone — I've verified the
data-shaping logic against realistic Companies House API response shapes, but the live proxy
itself and the Supabase-authenticated update/add-director actions still want a real run-through
once you've got a key and are signed in.

If you skip this, the rest of the app works exactly the same — the button just won't do anything
useful without the key set.

## 4. Local dev

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL + anon key
npm run dev
```

## 5. Deploy (Cloudflare Pages, matching your usual flow)

1. Create a new GitHub repo and upload this project's files via the GitHub web UI.
2. In Cloudflare Pages, connect that repo.
   - Build command: `npm run build`
   - Build output directory: `dist`
3. Under the Pages project's **Settings → Environment variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `COMPANIES_HOUSE_API_KEY` (optional — see above)
   (Supabase values are the same project/keys as your other apps — find them in Supabase →
   Project Settings → API)
4. Deploy. First run: sign in, then use the "Upload client export" button to import your
   `All_Clients_Contact_Info` spreadsheet into `doc_generator_clients`. Re-uploading a newer
   export later updates existing rows (matched by client code) rather than duplicating them.

## Notes

- Individuals come through as "Surname, Firstname", exactly as the source export has them.
- Trading name, nature of business, and services fields on the AML form are left blank — they're
  not in the client export. Add those columns to the import/table later if you want them
  auto-filled too.
- **Letter wording lives in `src/assets/letter-content/company.json` and `director.json`**, not
  in a Word file. These are pdfmake content trees (headings, numbered/lettered lists, merge
  markers `{name}` / `{address}` / `{date}`), generated once from the original Word documents'
  own paragraph and numbering data — that's deliberate: converting Word's list numbering through
  HTML (the more obvious approach) turned out to silently mis-number nested lists, which isn't
  something you want in a document with legal wording. To change the letter text:
  - **Small wording tweaks**: edit the `"text"` strings directly in the JSON files.
  - **Bigger changes, or a new source Word doc**: `scripts/convert_letter.py` (Python,
    `pip install python-docx`) rebuilds the JSON from a `.docx` file, reading the paragraph text
    and numbering definitions directly rather than guessing from a rendered HTML export. Run
    `python scripts/convert_letter.py your-letter.docx` and copy the resulting JSON into
    `src/assets/letter-content/` (as `company.json` or `director.json`).
