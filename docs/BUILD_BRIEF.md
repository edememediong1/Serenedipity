# Build brief: Focus App, phase 1 (landing page, onboarding, authentication, dashboard layout)

You are the lead engineer building the first release of a premium focus and productivity web app. Work like a senior full-stack engineer with a strong eye for design: plan first, build in small verified milestones, and match the design system exactly.

## 1. Read these first

Before writing any code, read both attached files completely:

- `docs/PRD.md`: the product requirements. Sections 1 to 6 matter most for this phase.
- `design/DESIGN_SYSTEM.md` and `design/tokens.json`: the brand, colour tokens, gradient recipes, typography, spacing, voice and accessibility rules.

Put these files in the repo at exactly those paths. Treat them as the source of truth. If anything in this brief conflicts with them, follow the PRD for product behaviour and the design system for visuals, and tell me about the conflict.

Then reply with a short build plan (milestones, folder structure, packages, open questions) and wait for my go-ahead before starting milestone 1.

## 2. What we are building now

Only these four things in this phase:

1. **Marketing landing page** with a waitlist and sign-up path.
2. **Authentication** (email magic link, Google, Apple) with protected routes.
3. **Onboarding flow** for new users.
4. **Dashboard layout**: the logged-in app shell, navigation and a home dashboard with placeholder content.

**Out of scope for now** (build clean stubs or placeholders only, no real logic): the music player and audio engine, the binaural layer, the Pomodoro timer logic, the AI check-in, focus rooms, Stripe billing and the admin panel. Leave clearly named components, routes and TODO comments so they slot in later.

## 3. Tech stack

- **Next.js** (latest stable, App Router) with **TypeScript** in strict mode.
- **Tailwind CSS**, with every design token from `design/tokens.json` exposed as CSS variables and mapped into the Tailwind theme. No hard-coded hex values in components; use the tokens.
- **Supabase** for auth and Postgres, using `@supabase/ssr` for server-side sessions.
- **shadcn/ui** (Radix primitives) for accessible building blocks, fully restyled to the design system. Do not ship default shadcn styling.
- **Lucide** icons, **react-hook-form** + **zod** for forms, **next/font/google** for Instrument Serif and Plus Jakarta Sans.
- **pnpm**, ESLint, Prettier.
- **Vitest** for unit tests and **Playwright** for end-to-end smoke tests.
- Deploy target: Vercel.

Keep the app name in a single config constant (`APP_NAME = "Focus App"`); it is a working name and will change.

## 4. Design requirements

- Night theme is the default. Every app and marketing screen uses the **background glow** recipe from the design system, with the mood variants it describes. Glass cards, gradient primary buttons, the signature orb and the violet-to-orange progress ring must match the recipes exactly.
- Build a small set of reusable primitives first and use them everywhere: `GlowBackground` (with mood variants), `GlassCard`, `Button` (primary gradient, secondary glass, ghost), `Chip` (single and multi-select), `Input`, `Eyebrow`, `ProgressRing`, `SignatureOrb`, `Logo` (wordmark plus orb, using `APP_NAME`).
- Typography: Instrument Serif for hero lines and page titles (one italic emphasis word where it fits), Plus Jakarta Sans for everything else, tabular numerals for any timer or number.
- Mobile first. Everything must look excellent at 375px wide and scale up to 1440px.
- Respect `prefers-reduced-motion`: glows still, plain fades only.
- Accessibility: real buttons, links and labelled inputs; visible 2px focus ring; touch targets at least 44px; contrast as specified. Aim for zero axe violations.
- Copy rules from the design system apply everywhere: short and kind; describe experiences, never outcomes; never use the words therapist, therapy, counselling or treatment; no medical or productivity-percentage claims; no invented stats, testimonials or user counts. Where real content is missing, use clear placeholders like `[TESTIMONIAL]`.

## 5. Milestones

Commit at the end of each milestone with a clear message. After each one, run lint, type check and tests, then give me a short summary and anything you need from me.

### Milestone 0: Foundation

- Scaffold the project, add the docs, configure tokens, fonts, Tailwind theme, the primitives in section 4, and a `/design` route (development only) that shows every primitive and token so I can review them.
- `.env.example` listing every variable; no secrets in the repo.
- README with setup steps.

### Milestone 1: Landing page (`/`)

Sections, in order:

1. **Nav:** logo, links (How it works, Features, Pricing, FAQ), "Log in" and a primary "Start free" button; collapses to a menu on mobile.
2. **Hero:** serif headline ("Clear head. Deep *work*." or similar in the brand voice), one-line subhead from the PRD's one-liner, primary CTA "Start free", secondary CTA "Join the waitlist". Beside or below it, a phone mockup built in code (not an image) showing the Home screen from the design system.
3. **How it works:** three steps: Check in, Get a plan, Focus with music.
4. **Features:** focus music library, binaural focus layer, guided Pomodoro, focus rooms. Each as a glass card with an icon and two lines of copy.
5. **Focus together:** a short section about scheduled focus rooms (cameras optional and off by default).
6. **Pricing:** Free, Premium monthly ($7.99) and Premium yearly ($59.99) from PRD section 7, with a monthly and yearly toggle. CTAs go to sign-up; no payment yet.
7. **FAQ:** an accessible accordion. Include "Is this therapy?" answered plainly: no; the AI is a focus guide that helps plan work, and it points to real support resources when someone needs them.
8. **Final CTA with waitlist form:** email field, honeypot field, success and error states.
9. **Footer:** Privacy, Terms (placeholder pages), contact email placeholder, copyright with `APP_NAME`.

Also: SEO metadata, Open Graph image, favicon from the signature orb, sitemap and robots. Target Lighthouse 90+ on performance, accessibility, best practices and SEO on mobile.

**Waitlist:** a `waitlist` table (email unique, source, utm fields, created_at). Insert through a server action with zod validation, the honeypot and basic rate limiting. Capture UTM parameters from the URL. Anonymous users can insert only; nobody can read the table from the client.

### Milestone 2: Authentication

- Routes: `/login` and `/signup` (one shared, polished screen with a toggle is fine), `/auth/callback`, `/auth/check-email`, `/auth/error`.
- Methods: **email magic link** (primary), **Continue with Google**, **Continue with Apple**. Put Apple behind an environment flag so it can be switched on once credentials exist.
- Server-side sessions with `@supabase/ssr` and Next.js middleware.
- Routing rules:
  - Logged out and visiting `/app/*` or `/onboarding/*`: redirect to `/login`, then return to the original page after sign-in.
  - Logged in without finished onboarding: always land in `/onboarding` at the step they reached.
  - Logged in with finished onboarding: `/login` and `/signup` redirect to `/app`.
- Sign out from the app's account menu.
- Clear, friendly error states (expired link, cancelled OAuth, network error).

**Database (Supabase migrations in `supabase/migrations`):**

- `profiles`: `id` (references `auth.users`, primary key), `display_name`, `age_confirmed` (boolean), `age_confirmed_at`, `goals` (text array), `work_style`, `default_focus_minutes` (default 25), `default_break_minutes` (default 5), `music_prefs` (text array), `has_headphones`, `ai_guide_consent` (boolean), `ai_guide_consent_at`, `onboarding_step` (int, default 0), `onboarding_completed_at`, `plan` (default `free`), `timezone`, `created_at`, `updated_at`.
- A trigger that creates the profile row when a user signs up.
- Row-level security on every table: users read and update only their own profile.
- Generated TypeScript types for the database.

### Milestone 3: Onboarding (`/onboarding`)

A calm, one-question-per-screen flow on the glow background, with a slim progress bar, Back, and Skip where a step is optional. Each step saves to `profiles` immediately, so a user who leaves can resume where they stopped.

1. **Welcome:** "Let's set up your space." Ask for a first name (optional).
2. **Age:** confirm 18 or older (required; focus rooms are 18+). If they are under 18, explain kindly that the app isn't available to them yet and stop there.
3. **Goals** (multi-select chips): Deep work, Studying, Beating procrastination, Calm and stress relief, Creative work.
4. **Your rhythm:** when they usually work (Morning, Afternoon, Evening, It varies) and a preferred focus length (25, 50 or 90 minutes) with the matching break length.
5. **Your sound** (multi-select): Piano, Jazz, Lofi, Afro lounge, Ambient, Binaural. Then "Do you use headphones?" with one line noting the binaural layer works best with them.
6. **Meet your focus guide:** explain what the AI does (listens, helps you plan, keeps you on track) and what it isn't (not a therapist or medical service; it points you to real support if you need it). Require a consent checkbox before continuing, and store the timestamp.
7. **All set:** a short summary of their choices, then "Go to my space", which sets `onboarding_completed_at` and opens `/app`.

Validate every step with zod. Animate transitions softly. Make it fully keyboard accessible.

### Milestone 4: Dashboard layout (`/app`)

**App shell:**

- **Desktop (1024px and up):** a left sidebar with the logo, navigation (Listen, Check in, Focus, Rooms), a divider, Settings, and a plan badge with an "Upgrade" link (placeholder). A top bar with a greeting, a search field (UI only) and an avatar menu (Profile, Settings, Sign out).
- **Mobile:** a top bar with the logo and avatar, and a bottom tab bar (Listen, Check in, Focus, Rooms) styled as in the design system.
- A **persistent mini player** slot above the bottom tab bar on mobile and docked at the bottom of the content on desktop. UI only for now, driven by a mock state, so the real player can replace it later.

**Home dashboard (`/app`):**

- Greeting with the user's name and the time of day, and a serif headline ("Find your *focus*").
- The **check-in card**: the signature orb microphone button, "How are you feeling?", and mood chips. For now it routes to a `/app/check-in` placeholder.
- **State cards:** Focus, Calm, Clear (gradient recipes from the design system), routing to placeholder pages.
- **Picked for you:** a row of mix cards from a local seed file (title, category, length). No audio.
- **Today:** focus minutes and blocks completed, showing zeros with a friendly empty state.

**Placeholder pages:** `/app/listen`, `/app/check-in`, `/app/focus`, `/app/rooms` and `/app/settings`, each with the right glow mood, a serif title and an elegant "coming soon" empty state. Settings should already let the user edit the onboarding answers and their name.

## 6. Quality bar and definition of done

- `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm test:e2e` all pass.
- Playwright smoke tests cover: the landing page renders and the waitlist form submits; logged-out users are redirected away from `/app`; the full onboarding happy path ends on `/app`.
- No console errors or hydration warnings.
- Lighthouse mobile scores of 90+ on the landing page.
- Every screen reviewed at 375px, 768px and 1440px.
- No secrets committed; every environment variable documented in `.env.example` and the README.

## 7. How to work with me

- Stop and ask before: adding a paid service, changing the stack, changing the data model beyond what's described, or deviating from the design system.
- When you need something from me (Supabase project URL and keys, Google OAuth credentials, Apple credentials, a domain), say exactly what and where it goes, and keep building whatever doesn't depend on it.
- Keep summaries short: what was built, what to check, what's next.
