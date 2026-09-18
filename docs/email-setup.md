# Staff emails (invites and password resets) — Resend + Supabase

Supabase's built-in email only reaches the project's own team and can't use custom templates.
Staff invites need custom SMTP. We use **Resend** with the domain **atlworkcars.com**.

## 1. Resend
1. resend.com → **Domains → Add domain** → `atlworkcars.com`, region US East.
2. Add the DNS records it shows (use **Auto configure → Cloudflare** if offered; the domain is in
   the `Malasadojude@…` Cloudflare account). Wait until the domain shows **Verified**.
3. **API Keys → Create API key**: name `supabase-smtp`, permission **Sending access**, domain
   `atlworkcars.com`. Copy it once — it goes straight into Supabase, nowhere else.

## 2. Supabase (testing project first, then live)
Authentication → **Emails → SMTP Settings** → Enable custom SMTP:

| Field | Value |
|---|---|
| Sender email | `no-reply@atlworkcars.com` |
| Sender name | `ATL Work Cars` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | the Resend API key |
| Minimum interval between emails | `30` (default is fine) |

Authentication → **Emails → Templates**:

| Template | Subject | Body |
|---|---|---|
| Invite user | `You're invited to the ATL Work Cars admin` | `supabase/email-templates/invite.html` |
| Reset password | `Reset your ATL Work Cars admin password` | `supabase/email-templates/reset-password.html` |

The links go to `{{ .RedirectTo }}?token_hash=…&type=invite|recovery`. `RedirectTo` is
`<site>/auth/confirm/`, which must match an entry in Authentication → URL Configuration →
Redirect URLs (the Vercel preview, the workers.dev address, later `https://atlworkcars.com/**`).
If it doesn't match, Supabase falls back to the Site URL and the link breaks.

## 3. Test
- Admin → Staff → invite a new address (e.g. `malasadojude+invite@gmail.com`, role Viewer).
  The email arrives from `no-reply@atlworkcars.com`; the button opens Set password; the
  person can then log in. (ADM-005)
- Log out → Forgot password → the reset email arrives with the new template and works.
