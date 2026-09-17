# Client Document Generator

React + Vite + TypeScript + Tailwind, Supabase (Postgres + Auth), deployed on Cloudflare Pages —
same stack as your other apps.

Generates, per selected client/director:
- an **engagement letter** (PDF, from the Limited Company or Personal Tax "Schedule of Services"
  wording), for the company and every selected director
- an **AML periodic review** (PDF, with the real Yes/No/N-A checkboxes pre-ticked) — **company
  only**, not generated for directors

each as a separate downloadable file.

## 1. Database

In your Supabase project's SQL editor (the shared "Carglass" project), run `supabase/schema.sql`,
then `supabase/company_directors.sql`. Together they create:
- `doc_generator_clients` — a new table, so it won't collide with `cs_mailer_clients` or any other
  app's own clients table in that project
- `doc_generator_company_directors` — remembers which directors go with which company, so picking
  a company again auto-suggests them

both with RLS locked to signed-in users only.

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
