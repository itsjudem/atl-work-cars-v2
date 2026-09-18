# Cloudflare deployment (A9)

The same code runs on **Vercel** (`next build`) and on **Cloudflare Workers** (vinext).
No static export — the admin needs a server.

- Adapter: **vinext** (`npx vinext check` → compatible; set up with
  `vinext init --platform=cloudflare --cdn-cache=none --data-cache=none --image-optimization=none`).
- Worker name: **`atl-work-cars-v2`** (in `wrangler.jsonc`). Never `atl-work-cars` — that
  name belongs to an old Worker in the same account and would be overwritten.
- No Cloudflare caches or bindings are used: pages render on request; car pages refresh at
  most every 60 s. Photos are served straight from Supabase Storage (≤ 500 KB each).

## Build settings (Workers → the Worker → Settings → Build)

| Setting | Value |
|---|---|
| Git repository | `itsjudem/atl-work-cars-v2` |
| Branch | `phase-2` for testing; `main` once merged |
| Build command | `npm run build:vinext` |
| Deploy command | `npx wrangler deploy --config dist/server/wrangler.json` |

## Variables

`NEXT_PUBLIC_*` values are baked in at **build** time, so they go under **Build → Variables
and secrets**. The secret key is read at **run** time, so it goes under **Settings →
Variables and Secrets** as type **Secret**.

| Name | Where | Type |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Build variables | Text |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Build variables | Text |
| `SUPABASE_SECRET_KEY` | Runtime Variables and Secrets | **Secret** |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_GOOGLE_ADS_*`, `NEXT_PUBLIC_META_PIXEL_ID` | Build variables (optional) | Text |
| `LEAD_WEBHOOK_URL` | Runtime (optional) | Secret |

Never add `NEXT_PUBLIC_` to the secret key.

## Supabase

Authentication → URL Configuration → Redirect URLs: add
`https://atl-work-cars-v2.<your-subdomain>.workers.dev/**` (and later `https://atlworkcars.com/**`).

## Local

```bash
npm run build:vinext                       # build for Cloudflare
npx wrangler dev --config dist/server/wrangler.json   # run it in the Workers runtime
```

## Notes from the first deploy

- Production branch is set in Cloudflare → Worker → Settings → Build → Branch control.
  "Retry build" re-runs the SAME branch/commit; to build a newly selected branch, push a commit
  AFTER saving the branch (pushes made before the change are ignored).
- `NEXT_PUBLIC_SUPABASE_URL` is the bare project URL (`https://<ref>.supabase.co`) — no `/rest/v1/`.
