# ATL Work Cars

Mobile-first marketing site for **atlworkcars.com** — weekly car rentals for rideshare, delivery and gig drivers in Metro Atlanta. The single goal of the site: get drivers to submit an application.

Next.js 16 (App Router) · TypeScript strict · Tailwind CSS v4 · Node 20+. Runtime dependencies: `next`, `react`, `react-dom`, `server-only`. Nothing else.

## Install, run, build

```bash
npm install
cp .env.example .env.local   # optional — every variable may stay empty
npm run dev                  # http://localhost:3000
npm run build && npm start   # production build, locally
npm run typecheck
npm run lint
npm run check                # typecheck + lint + build — run before every deploy
```

## Changing site content

Everything a non-developer might change lives in `src/data/`. No component hardcodes a phone number, price, city or FAQ answer.

| To change… | Edit |
|---|---|
| Phone, text number, email, hours, canonical domain | `src/data/site.ts` (one line each). When the real phone is in, set `phoneIsPlaceholder: false` so it's added to structured data. |
| Weekly rate, deposit, insurance, mileage and other policies | `src/data/policies.ts` — replace `null` with the text. Unknown values show "Contact us / Apply for current details". |
| Cars | `src/data/vehicles.ts`. Keep codes `awc-101…`. A real car gets `isPlaceholder: false`; once no placeholders remain, the "Sample listing" badges and inventory notice disappear by themselves. `null` price → "Contact us for pricing"; `null` odometer/MPG → row hidden; `null` photo → illustration. Photos go in `public/cars/` with `photo: "/cars/awc-101.jpg"` and a `photoAlt`. |
| FAQ | `src/data/faq.ts` |
| Service area, form county & pickup lists | `src/data/service-areas.ts` (the one location file) |
| Requirements | `src/data/requirements.ts` |
| Homepage & marketing copy, CTA wording | `src/data/copy.ts`, `src/data/navigation.ts` |
| Privacy, terms, rental-policy intro | `src/data/legal.ts` (have a lawyer review before launch) |
| Local SEO pages | `src/data/locations.ts` |
| Colours & fonts | the `@theme` block in `src/app/globals.css` |

### Local SEO pages

`/atlanta/`, `/lawrenceville/` and `/gwinnett-county/` are published, each with unique local copy and FAQs. The other seven slugs (duluth, norcross, snellville, suwanee, buford, decatur, marietta) exist in `locations.ts` but return **404** and stay out of the sitemap until someone writes genuinely unique copy for them — then add `content` and set `published: true`.

## Form submissions

`POST /api/apply/` and `POST /api/contact/` share validation with the browser forms (`src/lib/application-schema.ts`, `src/lib/contact-schema.ts`), rebuild the body field by field, drop honeypot hits with a normal success response, and generate the application reference (`AWC-YYYYMMDD-XXXXX`, no 0/O/1/I) and timestamp on the server.

Every lead goes through `deliver()` in `src/lib/leads/deliver.ts`:
1. It is always **logged** (`[lead] {...}`) — visible in Vercel → project → Logs.
2. If `LEAD_WEBHOOK_URL` is set, it is **POSTed** there as JSON. Test with a free URL from https://webhook.site.

To add email, a CRM, Google Sheets or a database, add another sink to `deliver.ts`. Phase 2 swaps in Supabase there.

Test from the command line (an incomplete submission must return **400**, not 500 and not 200):

```bash
curl -i -X POST https://<your-host>/api/apply/ -H 'content-type: application/json' -d '{"firstName":"Test"}'
```

## Environment variables

See `.env.example`. All are optional.

| Variable | Where it's read | Purpose |
|---|---|---|
| `LEAD_WEBHOOK_URL` | server only | POST every lead here |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | browser | Google Analytics 4 |
| `NEXT_PUBLIC_GOOGLE_ADS_ID` | browser | Google Ads account (AW-…) |
| `NEXT_PUBLIC_GOOGLE_ADS_APPLY_LABEL` | browser | conversion label for applications |
| `NEXT_PUBLIC_GOOGLE_ADS_CONTACT_LABEL` | browser | conversion label for contact form |
| `NEXT_PUBLIC_META_PIXEL_ID` | browser | Meta Pixel |

`NEXT_PUBLIC_` values are baked in at build time — redeploy after changing them. Never put a secret in a `NEXT_PUBLIC_` variable.

Tracked events: `cta_click` (every link/button with `data-cta`), `call_click`, `text_click`, `email_click`, `application_step_complete`, `application_submit` (→ Ads conversion + Meta `Lead`), `contact_submit`.

## Deploying to Vercel

1. Import this GitHub repo in Vercel (framework preset: Next.js, defaults are fine).
2. Add env vars in Project → Settings → Environment Variables.
3. Pushing to `main` deploys production; any other branch gets a preview URL — the easiest way to check on a real phone.
4. Run Lighthouse (mobile) against the deployed URL in an incognito window.

Canonical URLs always point at `https://atlworkcars.com` (from `site.url`), even on a Vercel URL.

Do **not** use static export. The Cloudflare move happens at the end of Phase 2 via vinext or `@opennextjs/cloudflare`.

## Database (Phase 2)

The Supabase schema, setup steps and tests live in `supabase/` — see `supabase/README.md`.

## Project layout

```
src/app/            routes, sitemap.ts, robots.ts, not-found.tsx, api/apply, api/contact, [location]
src/components/     server components + 5 client components (MobileMenu, StickyCtaBar, Analytics, form/*)
src/data/           all business content (typed)
src/lib/            seo, format, analytics, validation schemas, leads/ (server-only), internal/ (server-only)
src/fonts/          self-hosted Barlow Semi Condensed + Public Sans (SIL OFL)
public/og-image.png social preview (1200×630 PNG)
```
