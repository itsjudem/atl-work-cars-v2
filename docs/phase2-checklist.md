# Phase 2 checklist (ADM-001 … ADM-064)

Worked on the **testing** Supabase project + the `phase-2` Vercel preview.

Status: ✅ passed · ⏳ to click-test · 🔒 blocked (reason given) · ➖ not applicable

"DB test" means an automated check in `supabase/tests/database.test.sql` (**185/185 pass**) —
it acts as each role against the real migrations. "Build check" means the production build
was inspected (secret-key canary, robots, sitemap, API responses). "Owner" means the owner
confirmed it on the preview.

| ID | Test | Status | How verified |
|---|---|---|---|
| ADM-001 | /admin logged out → /admin/login | ✅ | Build check (307 → /admin/login/?next=…); Owner (A2) |
| ADM-002 | No sign-up page/link; sign-up off | ✅ | No sign-up route in code; Owner turned sign-up off (A1) |
| ADM-003 | Wrong password → general message | ✅ | Owner (A2) |
| ADM-004 | Forgot password link works | ✅ | Owner (A2) |
| ADM-005 | Invited person sets a password and logs in | 🔒 | Needs Resend (invite emails). Test accounts made by hand meanwhile |
| ADM-006 | Log out works | ✅ | Owner (A2) |
| ADM-007 | Secret key never in browser code | ✅ | Build check: canary secret found in 0 files under .next/static |
| ADM-008 | Logged-out visitors can't read any table | ✅ | DB test (anon refused on all 6 tables + view) |
| ADM-009 | RLS on every table | ✅ | DB test; Owner screenshot (A1) |
| ADM-010 | Admin noindex; /admin disallowed in robots | ✅ | Build check |
| ADM-011 | No admin page in sitemap | ✅ | Build check (0 entries) |
| ADM-012 | Viewer sees no change buttons | ✅ | Code reviewed; Owner click-tested as each role (A8) |
| ADM-013 | Viewer's direct change refused by DB | ✅ | DB test |
| ADM-014 | Sales can't edit cars | ✅ | DB test; Owner click-tested as each role (A8) |
| ADM-015 | Fleet can't edit contacts/rating/contacted/archive | ✅ | DB test; Owner click-tested as each role (A8) |
| ADM-016 | Fleet can add a contact note | ✅ | DB test; Owner click-tested as each role (A8) |
| ADM-017 | Only Owner sees Delete; others refused | ✅ | DB test; Owner click-tested as each role (A8) |
| ADM-018 | Only Owner opens /admin/staff | ✅ | Owner saw it (A3); Owner click-tested as each role (A8) |
| ADM-019 | Role change applies on next click | ✅ | Owner click-tested as each role (A8) |
| ADM-020 | Deactivated person logged out; can't log in | ✅ | DB test; Owner click-tested as each role (A8) |
| ADM-021 | Last active Owner can't be demoted/deactivated | ✅ | DB test |
| ADM-022 | Nobody changes own role/deactivates self | ✅ | DB test |
| ADM-023 | Application saves with reference + time | ✅ | Owner (A4) |
| ADM-024 | Contact form → contact, "Contact form", Unrated | ✅ | Owner (A4); DB test |
| ADM-025 | Incomplete application refused, nothing saved | ✅ | Build check: POST {} → 400 before any save |
| ADM-026 | Nothing goes to the Google Sheet | ✅ | No sheet code or env var in the site |
| ADM-027 | Import counts match the sheet | ➖ | Owner: no earlier submissions to import |
| ADM-028 | Applications list: 25/page, newest first, filters, search | ⏳ | Click-test |
| ADM-029 | Application answers can't be edited | ✅ | DB test (AWC04); no edit form in UI |
| ADM-030 | Mark contacted records who/when; untick clears | ✅ | Owner (A5); DB test |
| ADM-031 | Archive hides; restore brings back | ⏳ | DB test ✅; click-test |
| ADM-032 | Link to existing contact via search | ⏳ | Click-test |
| ADM-033 | Create contact pre-fills; offers existing match | ✅ | Owner (A5) |
| ADM-034 | Linked contact's lead category on list + detail | ⏳ | Click-test |
| ADM-035 | Needs attention sort order | ✅ | Owner (A6) |
| ADM-036 | Contact edit saves; history old + new | ✅ | DB test (every field) |
| ADM-037 | Edits validated like public form | ⏳ | Click-test (7-digit phone) |
| ADM-038 | Add by hand warns on existing phone/email | ⏳ | Click-test |
| ADM-039 | "Possible duplicate" flag | ⏳ | Click-test |
| ADM-040 | Every fit × intent → right category | ✅ | DB test |
| ADM-041 | Fit or intent unrated → Unrated | ✅ | DB test |
| ADM-042 | Category can't be set directly | ✅ | DB test (generated column) |
| ADM-043 | Each category shows colour, name, What to do | ✅ | Owner (A6) |
| ADM-044 | Dead lead offers archive, no auto-archive | ⏳ | Click-test |
| ADM-045 | Fleet adds a car with photo + description | ✅ | Owner did it as Owner (A7); Owner click-tested as each role (A8) |
| ADM-046 | Can't save Rented without renter | ✅ | DB test; UI only sets Rented through the renter picker |
| ADM-047 | Leaving Rented asks, then removes renter | ⏳ | Click-test |
| ADM-048 | Already-renting warning, still allowed | ⏳ | Click-test |
| ADM-049 | Rented car can't be deleted | ✅ | DB test; UI panel |
| ADM-050 | Renting contact can't be deleted | ✅ | DB test; UI panel |
| ADM-051 | Hidden cars not on website | ⏳ | Public view filters `is_published`; click-test |
| ADM-052 | Website never shows renter or notes | ✅ | Public view has no renter/note columns |
| ADM-053 | Change on site within a minute, no redeploy | ✅ | Owner (A7) |
| ADM-054 | Sample cars: only "Sample listing" badge | ✅ | Owner (A7) |
| ADM-055 | Applying for a sample car shows sample message | ⏳ | Click-test |
| ADM-056 | /apply/?vehicle=awc-102 still works | ⏳ | Click-test |
| ADM-057 | Every action creates a history entry | ✅ | DB test runs every history branch (A8) |
| ADM-058 | History in Atlanta time | ✅ | Owner (A5, "ET") |
| ADM-059 | Nobody can edit/delete history | ✅ | DB test (Owner refused too) |
| ADM-060 | Delete confirmation names the record | ✅ | Owner (A6); same panel on apps + cars |
| ADM-061 | Deleting contact keeps + unlinks applications | ✅ | DB test |
| ADM-062 | Admin works on a phone | ⏳ | Click-test on a phone |
| ADM-063 | No static export | ✅ | next.config.ts |
| ADM-064 | Everything works on Cloudflare | 🔒 | A9 |
