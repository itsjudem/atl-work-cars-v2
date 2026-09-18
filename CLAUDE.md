@AGENTS.md

# ATL Work Cars — standing instructions

Spec: the ATL Work Cars build brief (Phase 1 public site, Phase 2 admin + Supabase).

## Non-negotiable
1. Never invent business facts (price, deposit, insurance, mileage, phone, hours, address). Unknown = `null` in `src/data/`, UI shows the fallback.
2. No fake social proof — no testimonials, ratings, counts, years in business.
3. No gig-platform names or logos anywhere (copy, alt text, filenames).
4. Metro Atlanta only: Gwinnett, Fulton, DeKalb, Cobb, Clayton.
5. No secrets in browser code. Only `NEXT_PUBLIC_` analytics IDs reach the browser.

Placeholders (only in `src/data/site.ts`): phone (770) 000-0000, info@atlworkcars.com, "Hours to be confirmed", no street address.

## Conventions
- Next.js 16 App Router, TypeScript strict, Tailwind v4 via `@theme` in `src/app/globals.css`. No `tailwind.config.js`. No UI kit, form library or state manager.
- All content lives in `src/data/`. Components never hardcode a phone, price, city or FAQ answer. No `any`.
- Server components by default. Client components: MobileMenu, StickyCtaBar, Analytics, ApplicationForm, ContactForm, admin NewContactForm (keeps typed values across the duplicate warning). Adding another needs a reason.
- Validation rules live once: `src/lib/application-schema.ts`, `src/lib/contact-schema.ts` — used by browser and server.
- Internal-only data goes in `src/lib/internal/` behind `import "server-only"`.
- Every URL ends in `/` (`trailingSlash: true`). Titles are complete (`title.absolute`), never templated.
- Never `output: "export"`. Cloudflare is reached through vinext or OpenNext at the end of Phase 2.
- Run `npm run check` (typecheck + lint + build) before every commit/deploy.
