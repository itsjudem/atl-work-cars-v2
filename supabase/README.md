# Supabase database

Everything about the database lives in code here, so it can be rebuilt from scratch.

| File | What it is |
|---|---|
| `migrations/*.sql` | The schema, in order: tables, rules, history, permissions (RLS), photo storage, sample cars. **Edit these.** |
| `setup-all.sql` | All migrations joined into one file for the Supabase SQL Editor. Regenerate after editing a migration (command below). |
| `first-owner.sql` | Promotes the first Owner after they're added by hand. |
| `tests/database.test.sql` | 156 checks of every rule and permission, run as each role. **Throwaway database only.** |

## Set up a project (testing first, live only after testing passes)

1. Supabase → your project → **SQL Editor** → **New query**.
2. Paste the whole of `setup-all.sql` → **Run**. It should finish with "Success. No rows returned".
3. **Authentication → Users → Add user → Create new user**: the Owner's email, a password, tick **Auto Confirm User**.
4. SQL Editor → new query → paste `first-owner.sql` → **Run**. The result shows `role = owner`.
5. **Database → Tables**: every table shows RLS enabled.

Run `setup-all.sql` only once per project. To change the schema later, add a new migration file and run just that file.

## Login settings (per project, in the Supabase dashboard)

**Authentication → Sign In / Providers:** Email on; **"Allow new users to sign up" OFF** (invite only).

**Authentication → URL Configuration**
- Site URL: the site this project serves (testing: the Vercel preview URL; live: `https://atlworkcars.com`).
- Redirect URLs — add every host the admin runs on, each ending in `/**`:
  - `http://localhost:3000/**`
  - `https://*-jdelite.vercel.app/**` (Vercel previews)
  - `https://atl-work-cars-v2-neon.vercel.app/**`
  - later: the Cloudflare address and `https://atlworkcars.com/**`

**Authentication → Emails → Templates** — replace the link in two templates so it lands on
`/auth/confirm/`, which signs the person in and sends them to `/admin/set-password/`:

| Template | Link (use in the `href`) |
|---|---|
| Invite user | `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite` |
| Reset password | `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery` |

The admin passes `RedirectTo` = `<this site>/auth/confirm/`, so the same template works on
previews, production and localhost. The built-in email sender is for testing only (a few
emails an hour); connect Resend (Authentication → Emails → SMTP Settings) before inviting real staff.

## Rules the database enforces

- Only an Owner changes roles or active status; nobody changes their own role or deactivates themselves; there is always at least one active Owner.
- Role and active status are read on every request, so changes apply immediately. Deactivated staff see nothing.
- Logged-out visitors can read nothing. The website reads cars through the `public_vehicles` view with the secret key.
- `lead_category` is computed from fit and intent; writing it directly is an error.
- A rented car must have a renter and start date; other cars can't. A rented car can't be deleted; a renting contact can't be deleted.
- Application answers can't be edited. Notes can't be edited. History can't be edited or deleted by anyone.
- Phones are stored as 10 digits, emails lowercase. Times are stored in UTC.

Deliberate errors use SQLSTATE codes the admin maps to friendly wording:

| Code | Meaning |
|---|---|
| AWC01 | Not permitted (Owner only) |
| AWC02 | Can't change your own role / deactivate yourself |
| AWC03 | Would leave no active Owner |
| AWC04 | Application answers can't be edited |
| AWC05 | History can't be edited or deleted |
| AWC06 | Rented car can't be deleted |
| AWC07 | Renting contact can't be deleted |
| AWC08 | Write-once field (source, message, car code, created date) |
| AWC09 | Notes can't be edited |
| AWC10 | Staff member not found |

A change blocked by RLS affects **0 rows** rather than raising — the admin treats "0 rows" as "no permission".

## Regenerate `setup-all.sql`

```bash
cd supabase
{ echo "-- ATL Work Cars — complete database setup (all migrations in order)."; \
  echo "-- Generated from supabase/migrations/*.sql. Paste into Supabase → SQL Editor → Run, ONCE per project."; \
  echo "-- Do not edit here; edit the migration files and regenerate."; echo; \
  for f in migrations/*.sql; do echo; echo "-- >>> $f"; cat "$f"; done; } > setup-all.sql
```

## Run the tests (local throwaway PostgreSQL 16)

The tests need a stand-in for Supabase's `auth` and `storage` schemas (roles `anon`, `authenticated`, `service_role`; `auth.users`; `auth.uid()`; `storage.buckets/objects`). Apply `tests/supabase-shim.sql`, then `setup-all.sql`, then run `tests/database.test.sql` with `psql` and check for `FAIL` lines. Never run the tests against the testing or live project — they create and delete users and rows.
