# Serenedipity

A premium, night-first focus app: tell it how you feel and what's due, get a plan, and focus with music.
"Serenedipity" is the current name; it lives in one constant, `APP_NAME` in `lib/config.ts`.

- Product requirements: [`docs/PRD.md`](docs/PRD.md)
- Design system: [`design/DESIGN_SYSTEM.md`](design/DESIGN_SYSTEM.md), tokens in [`design/tokens.json`](design/tokens.json),
  reference screens in `design/Focus_App_Screens.pdf`
- Phase 1 build brief: [`docs/BUILD_BRIEF.md`](docs/BUILD_BRIEF.md)

## Stack

Next.js 16 (App Router, Cache Components, TypeScript strict) · Tailwind CSS v4 · Supabase (`@supabase/ssr`) ·
Radix primitives in the shadcn/ui pattern, restyled · Lucide · react-hook-form + zod · Vitest · Playwright · pnpm.
Deploy target: Vercel.

## Setup

Requirements: Node 22+, pnpm 10+, Docker (for local Supabase).

```bash
pnpm install
cp .env.example .env.local
pnpm db:start            # starts local Supabase in Docker and applies supabase/migrations
pnpm supabase status     # copy API URL, publishable key and secret key into .env.local
pnpm dev                 # http://localhost:3000
```

Useful local URLs while Supabase runs: Studio http://127.0.0.1:54323, Mailpit (catches magic-link emails)
http://127.0.0.1:54324.

The design gallery lives at `/design` (development only; it returns 404 in production).

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Generates route types, then `tsc --noEmit` |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright smoke tests (builds and starts the app; needs local Supabase running) |
| `pnpm format` | Prettier |
| `pnpm db:start` / `db:stop` / `db:reset` | Local Supabase lifecycle; `db:reset` re-applies migrations |
| `pnpm db:types` | Regenerates `lib/supabase/database.types.ts` from the local database |

## Environment variables

All variables are listed with comments in [`.env.example`](.env.example).

| Variable | Where it's used | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Metadata, sitemap, canonical URLs | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase client (browser + server) | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase client (browser + server) | Yes |
| `SUPABASE_SECRET_KEY` | Admin dashboard, Stripe webhook, and e2e tests (server-only) | Yes |
| `ADMIN_EMAILS` | Comma-separated emails with admin access (in addition to `profiles.role = admin`) | No |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe API and webhook signing (server-only) | For Pro |
| `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY` | Price IDs for Pro ($7.99 / $59.99) | For Pro |
| `ANTHROPIC_API_KEY` | Luna's check-ins and plans (Claude, server-only) | For Luna |
| `DEEPGRAM_API_KEY` / `DEEPGRAM_MODEL` | Voice-note transcription (server-only); without it check-ins are typed | For voice |
| `LUNA_MOCK` | `true` = canned Luna replies for local dev and e2e. Never set in production | No |
| `RATE_LIMIT_SALT` | Hashes IP addresses for the waitlist rate limiter | Yes |
| `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH` | Shows "Continue with Google" unless `false` | No |
| `NEXT_PUBLIC_ENABLE_APPLE_AUTH` | Shows "Continue with Apple" when `true` | No |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `_SECRET`, `SUPABASE_AUTH_EXTERNAL_APPLE_SECRET` | Local Supabase OAuth (read by `supabase/config.toml`) | No |

## Routes

| Route | What it is |
| --- | --- |
| `/` | Landing page with waitlist (static) |
| `/privacy`, `/terms` | Placeholder legal pages |
| `/login`, `/signup` | Shared sign-in screen: email magic link, Google, Apple (flagged) |
| `/auth/callback` | Finishes OAuth (`?code=`) and magic links (`?token_hash=&type=email`) |
| `/auth/check-email`, `/auth/error` | Post-submit and friendly error screens |
| `/onboarding/[step]` | welcome, age, goals, rhythm, sound, guide, done; `/onboarding/not-available` for under 18 |
| `/app` | Home dashboard (the Listen tab) |
| `/app/listen`, `/app/check-in`, `/app/focus`, `/app/rooms` | Coming-soon placeholders with their glow moods |
| `/app/check-in` | Check-in with Luna (voice or text), plan, reset |
| `/app/focus` | Timer: techniques (Pomodoro, Deep work, Ultradian, 52/17, Flowtime, Custom), laps |
| `/app/review` | Day and week review: tasks, timeline, achievement rates, insights, Luna reflection (Pro) |
| `/app/upgrade` | Pro plan checkout (Stripe) |
| `/app/settings` | Name, onboarding answers, plan and billing, delete check-ins, sign out |
| `/admin` | Admin: overview, users (plan/role), waitlist + CSV, limits & settings |
| `/design` | Dev-only design gallery |

Routing rules live in `lib/auth/routing.ts` (unit-tested) and run in `proxy.ts` (Next 16's renamed middleware).
Pages and server actions re-check the session themselves.

## Luna and the focus timer

- **Luna** (`GUIDE_NAME` in `lib/config.ts`) is the AI focus guide. `/app/check-in` takes a voice note
  (transcribed by Deepgram via `POST /api/luna/transcribe`; audio is never stored) or text, then Claude
  (`claude-opus-5-5`, structured outputs, server-side fallbacks) asks up to 3 clarifying questions and returns an
  editable plan. Code: `lib/luna/` (prompt, schema, client, safety), `app/app/check-in/actions.ts`.
- **Safety first**: every message passes a keyword screen before the model; matches, or a model "crisis"
  assessment, skip planning and show 988 and other resources. Flags go to `safety_events` (category only, never
  the conversation). The PRD requires testing this flow with many sample messages and a legal review of all AI copy
  before any public release.
- **Free plan**: one check-in per day (premium unlimited), enforced in the server action.
- **Focus timer** (`/app/focus`): timestamp-based engine in `lib/timer/engine.ts` (accurate in background tabs),
  long break every 4 blocks, chime, Done / Need more time / Stuck between blocks, "I'm stuck" asks Luna for a
  smaller step. Blocks are saved to `focus_blocks` and feed the dashboard's Today card.

## Admin, limits and billing

- **Admins**: anyone in `ADMIN_EMAILS` or with `profiles.role = 'admin'` (set it from `/admin/users`, or in SQL:
  `update profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');`).
  Admins are never limited and can open `/admin`.
- **Daily check-in limits** live in `app_settings` and are edited at `/admin/settings` (free default 1, Pro unlimited).
- **Stripe**: create a product "Pro" with two recurring prices (monthly $7.99, yearly $59.99), put the price IDs and
  secret key in env, and add a webhook endpoint `https://<domain>/api/stripe/webhook` for
  `checkout.session.completed` and `customer.subscription.created/updated/deleted`; copy its signing secret into
  `STRIPE_WEBHOOK_SECRET`. Turn on the Customer Portal (Settings > Billing > Customer portal). New subscribers get a
  7-day trial. Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
- **Global timer**: the timer runs in a provider in the app shell, so a banner (clock, lap, pause, open) shows on
  every app page while a session is on; optional browser notifications when a block ends.

## Production setup (Supabase)

1. Create a Supabase project. Put its URL and publishable key in Vercel env vars (see table above).
2. Apply migrations: `pnpm supabase link --project-ref <ref>` then `pnpm supabase db push`.
3. **Authentication > URL Configuration**: Site URL = your domain; add `https://<domain>/auth/callback**` (and any
   preview domains) to Redirect URLs.
4. **Authentication > Email Templates**: paste `supabase/templates/magic_link.html` into both "Magic Link" and
   "Confirm signup". The link points straight at `/auth/callback` with a token hash, so it works across devices.
5. **Authentication > Providers > Google**: add the OAuth client ID and secret. In Google Cloud, the authorised
   redirect URI is `https://<project-ref>.supabase.co/auth/v1/callback`.
6. **Apple** (later): configure the provider in Supabase, then set `NEXT_PUBLIC_ENABLE_APPLE_AUTH=true`.
7. Set up custom SMTP (e.g. Resend) before launch; Supabase's built-in mailer is rate limited.

## Dev helpers

`scripts/screenshot.mjs`, `scripts/app-shots.mjs`, `scripts/onboarding-shots.mjs` and
`scripts/magic-link-probe.mjs` capture screens at given widths and exercise the real magic-link flow against
local Supabase (Mailpit). They're for local review only.

## Project structure

```
app/                 routes (marketing, auth, onboarding, app shell, /design)
components/ui/       primitives: Button, GlassCard, Chip, Input, Eyebrow, and restyled Radix parts
components/brand/    GlowBackground, SignatureOrb, ProgressRing, Logo
components/*/        feature components (marketing, app, onboarding)
lib/                 config, Supabase clients, validation schemas, seed data
supabase/            config.toml, migrations, email templates
tests/unit, tests/e2e
```

## Design tokens

Tokens from `design/tokens.json` are CSS variables in `app/globals.css` (`@theme static`), so each one is a
Tailwind utility (`bg-surface`, `text-ink-muted`, `border-line`, `rounded-lg`, …). Night is the default; Day is
`data-theme="light"`. Gradient recipes are variables plus utilities (`bg-gradient-primary`, `bg-gradient-orb`,
`bg-state-focus|calm|clear`, `glass`), and typography styles are `type-hero`, `type-h1`, `type-h2`, `type-h3`,
`type-body`, `type-body-sm`, `type-eyebrow`, `type-timer`. A unit test fails if `globals.css` drifts from
`tokens.json`. Components never use raw hex values.
