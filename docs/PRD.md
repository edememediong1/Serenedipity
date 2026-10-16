# Focus App PRD (working name)

Oct 15, 2026 · LeapTra · Status: Draft v1

## 1. Overview

**One line:** Tell it how you feel and what's due. It clears your head, plans your day, and keeps you focused, alone or with others.

**What it is:** a subscription productivity app that combines a curated focus-music library, a guided Pomodoro timer, an AI check-in that turns stress and brain fog into a clear plan, and shared focus rooms. It launches as a web app, then ships to the App Store and Google Play. It is the product extension of The Upside's music channels, which act as its main marketing engine.

**The problem:** people with deadlines lose hours to brain fog, overwhelm and distraction. Today they patch it together with separate tools: a music app, a timer app, a to-do list and sometimes a chatbot. None of them connect how the person feels to what they need to get done.

### Target users

| Segment | Situation | What they need |
| --- | --- | --- |
| Knowledge workers and remote employees | Deadlines, meetings, constant context switching | Get unstuck fast and protect deep-work time |
| Students | Assignments, exams, procrastination | Structure, accountability and a calm environment |
| Freelancers and founders | Self-directed work, no one checking in | A plan for the day and company while working |
| Music-channel listeners | Already use our YouTube mixes to focus | The same music without ads, plus tools around it |

Primary market is the US, matching the channels' target audience.

### Positioning

| Product | What it does well | What it lacks that we offer |
| --- | --- | --- |
| Brain.fm, Endel | Functional focus music | No planning, no check-in, no co-working |
| Focusmate, Flow Club | Body-doubling sessions with strangers | No music experience, no AI planning |
| Pomodoro apps (Forest, Focus Keeper) | Timers and streaks | No music, no plan, no emotional starting point |
| lockin.fm | Focus music sessions | No AI check-in or deadline planning |

Our edge is the connected loop: **feeling, then plan, then focus, then reflection**, with music and community wrapped around it.

### Goals for v1

- Ship a web app that delivers the full core loop: listen, check in, plan, focus.
- Convert channel viewers into paying subscribers.
- Prove people pay: target conversion and retention numbers are in section 7.

### Non-goals for v1

- Therapy, diagnosis or any clinical claim. The AI is a productivity and self-care guide, not a therapist (section 5).
- Native mobile apps (planned for phase 3).
- Podcasts, audiobooks and book-to-audio (future roadmap).
- Open, always-on video rooms with strangers (v1 rooms are scheduled and moderated).

**Name:** the app needs its own name before the waitlist page goes live. Working name in this doc: "the app." It can launch under the Serene Pages Music umbrella or as a separate brand that all music channels promote.

## 2. Scope and phases

Version 1 has six modules. Rooms ship last within v1 because they are the most complex and need enough active users to feel alive.

| # | Module | v1 scope | Free or premium |
| --- | --- | --- | --- |
| 1 | Music library and player | Browse, search, play; about 500 tracks loaded by admins over time; mood and activity categories | Limited free, full library premium |
| 2 | Binaural focus layer | Optional binaural tone generated in the app and mixed under any track (headphones) | Premium |
| 3 | Pomodoro timer | Custom work and break lengths, sessions linked to tasks, music changes at breaks | Free |
| 4 | Clarity check-in (AI) | Voice or text check-in, short reset, task breakdown, plan for the deadline, guided blocks | 1 per day free, unlimited premium |
| 5 | Focus rooms | Scheduled group sessions, shared music in sync, mic and camera optional and off by default | Premium (one free trial room) |
| 6 | Accounts, billing, admin | Sign-up, subscriptions, admin panel for music, rooms and safety reports | Core |

### Phase plan

| Phase | Contents | Gate to move on |
| --- | --- | --- |
| 1a: Core | Modules 1, 2, 3, 6; waitlist launch | Users complete focus sessions and come back the next week |
| 1b: AI | Module 4 with safety guardrails | Check-ins lead to completed focus blocks |
| 1c: Rooms beta | Module 5 with scheduled sessions only | Rooms fill reliably at scheduled times |
| 2: Growth | Personal insights, streaks, smarter recommendations, team plans | Paying users ask for it |
| 3: Mobile | iOS and Android apps sharing the web codebase's logic | Web retention and revenue are stable |

### Future roadmap (not in v1)

- **Podcasts:** original audio on focus, productivity and wellbeing, including AI-produced episodes.
- **Audiobooks and book-to-audio:** start with public-domain books narrated by AI. Copyrighted books need publisher licences before they can be added.
- **Adaptive music:** tracks that change in real time with the user's session stage.

## 3. Core user flows

### Flow A: Just listen

For people who want music and nothing else.

1. Open the app and land on the **Listen** home: featured mixes and categories (Deep Focus, Calm Mind, Clear the Fog, Creative Flow, Wind Down).
2. Pick a track or mix. Playback starts immediately.
3. Optionally switch on the binaural layer and choose a focus mode.
4. Optionally start a Pomodoro timer from the player without leaving it.

### Flow B: Clarity check-in to deadline

The signature experience. Example user: foggy, stressed, report due today.

1. **Check in.** Tap the microphone and say how they feel and what's due, or type it. Example: "I woke up foggy and stressed, and I have to finish the client report today."
2. **Acknowledge.** The AI reflects it back in one or two warm sentences, without judging or diagnosing.
3. **Reset (optional, about 2 minutes).** A short calming session: Calm Mind music plus a simple breathing or grounding prompt.
4. **Clarify the work.** The AI asks a few short questions: what exactly is due, by when, and what's already done.
5. **Plan.** The AI breaks the work into small, concrete tasks, estimates each, and fits them into focus blocks before the deadline. The user can edit, reorder or delete tasks.
6. **Focus.** The first block starts: timer running, task shown on screen, music matched to the block (for example, Deep Focus while writing, lighter music on breaks).
7. **Between blocks.** A one-tap check: Done, Need more time, or Stuck. If stuck, the AI suggests a smaller next step. The plan updates.
8. **Finish.** A summary: tasks completed, focus time, and a one-line reflection prompt ("How did today go?").

### Flow C: Focus room

1. See the schedule of upcoming rooms (for example, "Deep work sprint, every hour on the hour" or "Morning focus, 9:00 Eastern").
2. Join a room. Mic and camera are off by default; turning them on is the user's choice.
3. Optionally bring today's plan from a check-in; only the user sees it.
4. Everyone hears the same music in sync and works through shared Pomodoro blocks.
5. At breaks, an optional short chat ("What are you working on?").
6. Session ends; everyone leaves. Users can report or block anyone during or after the session.

## 4. Functional requirements

Each module lists what it must do and how we'll know it works (acceptance criteria).

### 4.1 Music library and player

**Must do:**

- Browse by category (Deep Focus, Calm Mind, Clear the Fog, Creative Flow, Wind Down) and by style (piano, jazz, lofi, Afro lounge, ambient, binaural).
- Search by title, mood or style; filter by length and energy.
- Play single tracks and continuous mixes, with shuffle, repeat and a sleep timer.
- Keep playing while the user switches screens; resume where they left off.
- Save favourites and build personal playlists.
- Free users get a rotating subset of the library; premium unlocks everything.

**Acceptance criteria:**

- Playback starts within 2 seconds on a typical broadband connection.
- No gaps or clicks between tracks in a mix.
- Playback continues when the browser tab is in the background.

### 4.2 Binaural focus layer

**Must do:**

- Generate binaural tones in the browser (two slightly different frequencies, one per ear) and mix them quietly under any track, so we don't need separate binaural recordings.
- Offer a few presets (for example Focus, Calm, Deep Rest) with a volume slider.
- Show a "headphones needed" prompt the first time it's switched on.

**Acceptance criteria:**

- The layer can be toggled on and off without interrupting the music.
- Copy describes the experience only; no medical or performance claims (section 5).

### 4.3 Pomodoro timer

**Must do:**

- Default 25 minutes of work and 5 minutes of break, with long breaks every 4 blocks; all lengths adjustable.
- Start, pause, skip and reset; gentle chime at transitions.
- Link each block to a task (from a check-in plan or typed manually).
- Optionally change the music automatically at breaks.
- Track daily focus time and completed blocks.

**Acceptance criteria:**

- The timer stays accurate when the tab is in the background or the screen sleeps.
- Completed blocks and focus minutes are saved to the user's history.

### 4.4 Clarity check-in (AI)

**Must do:**

- Accept a voice note (transcribed to text) or typed message.
- Respond briefly and warmly, then ask at most 3 clarifying questions.
- Produce a plan: tasks with time estimates, ordered and fitted into focus blocks before the stated deadline.
- Let the user edit the plan before starting.
- Recommend a music category and timer setup for each block.
- Re-plan when the user reports "Stuck" or "Need more time."
- Follow every rule in section 5, including crisis handling.

**Acceptance criteria:**

- From check-in to the first focus block starting takes under 2 minutes for a typical user.
- Plans never exceed the time available before the deadline without telling the user.
- Crisis-related messages always trigger the support flow in section 5.

### 4.5 Focus rooms

**Must do:**

- Scheduled rooms, created by admins at fixed times, with a capacity limit (for example 20 people).
- Music synced for everyone in the room, with shared Pomodoro blocks.
- Mic and camera off by default; users choose to turn them on.
- Short optional text chat during breaks only.
- Report and block buttons always visible; admins can remove users.
- 18+ only.

**Acceptance criteria:**

- Everyone in a room hears the same track within about 1 second of each other.
- A reported user can be removed from the room by an admin in real time.

### 4.6 Accounts and billing

**Must do:**

- Sign up with email, Google or Apple; age confirmation (18+ for rooms).
- Free and premium tiers; monthly and yearly plans; a free trial.
- Upgrade, cancel and manage billing in the app.
- Data export and account deletion.

**Acceptance criteria:**

- Premium features unlock immediately after payment.
- Cancelling keeps premium until the end of the paid period.

### 4.7 Admin panel

**Must do:**

- Upload tracks with metadata: title, category, style, mood tags, energy level, length, and source and rights record (where the track came from and the licence that covers it).
- Build and feature mixes and playlists; mark tracks free or premium.
- Create and schedule rooms.
- Review user reports and crisis-flag logs (without reading private check-ins unless a report requires it).
- View key metrics (section 7).

**Acceptance criteria:**

- A track can't be published without a rights record.
- Bulk upload of at least 50 tracks at a time.

## 5. AI behaviour and safety guardrails

The AI is a **productivity and self-care guide**. It is never called, marketed or designed as a therapist, counsellor or psychologist. This is a legal requirement as well as a safety one: Illinois and Nevada ban AI products that claim to provide mental health treatment, with fines of up to $10,000 and $15,000, and other states are moving in the same direction.

### Naming and language

| Use | Never use |
| --- | --- |
| Clarity check-in, focus guide, reset, self-care | Therapist, therapy, counselling, psychologist, treatment |
| "Feeling foggy or overwhelmed? Let's get you moving." | "Heal your anxiety," "treat depression" |
| "Music designed for focus" | "Clinically proven," "boosts productivity by X%" |

### What the AI does

- Listens, reflects briefly and kindly, and turns the user's situation into a practical plan.
- Offers short, general resets: a breathing minute, a grounding prompt, a smaller first step.
- Keeps responses short so the user gets to work quickly.

### What the AI never does

- Diagnose, label conditions or suggest medication.
- Present itself as a professional or a replacement for one.
- Encourage dependence ("I'm all you need") or discourage seeking help from people.
- Give medical, legal or financial advice.

### Crisis handling (must ship with the AI, not after)

- Every check-in is screened for signs of serious distress, self-harm or danger.
- When detected, the app steps out of productivity mode: it responds with care, encourages reaching out to someone they trust, and shows crisis resources (in the US, the 988 Suicide & Crisis Lifeline; local equivalents by country).
- It never pushes the user back into the task plan in that moment.
- Flagged events are logged for safety review without exposing the full conversation unnecessarily.

### Privacy

- Voice notes are transcribed and the audio deleted; transcripts are stored only as long as needed for the plan and history.
- Users can delete their check-in history at any time.
- Check-in content is never used for advertising or sold.
- Clear consent screen before the first check-in explaining what the AI is and isn't.

### Before launch

- Legal review of all AI-related copy, the terms of service and the privacy policy, including the state laws above.
- Test the crisis flow with a wide set of sample messages before any public release.

## 6. Tech stack and architecture

The stack favours managed services so a small team can ship fast and the same backend can later serve iOS and Android.

| Layer | Recommended | Why | Alternatives |
| --- | --- | --- | --- |
| Web app | Next.js (React) + TypeScript + Tailwind, installable as a PWA | Fast to build, works on phones from day one | Remix, SvelteKit |
| Mobile (phase 3) | React Native with Expo | Reuses web logic and skills | Flutter |
| Backend, database, auth | Supabase (Postgres, auth, storage, realtime) | One service covers most needs; realtime powers rooms | Firebase |
| Music storage and delivery | Cloudflare R2 + CDN | Low cost for heavy audio streaming | AWS S3 + CloudFront |
| AI planning and check-ins | Claude or OpenAI API, behind our own server | Strong reasoning for plans; server-side keeps keys and safety checks private | Gemini |
| Speech to text | Deepgram or OpenAI Whisper API | Accurate, low-cost transcription of voice notes | AssemblyAI |
| Rooms (audio and video) | LiveKit Cloud or Daily | Managed real-time audio and video; no need to build our own | 100ms, Agora |
| Payments (web) | Stripe Billing | Subscriptions, trials, tax handling | Paddle |
| Payments (mobile, phase 3) | RevenueCat | Manages App Store and Google Play subscriptions in one place | Native store APIs |
| Analytics | PostHog | Product analytics, funnels, feature flags | Mixpanel |
| Errors and monitoring | Sentry | Catch bugs early | LogRocket |
| Email | Resend | Waitlist, onboarding, receipts | Postmark |
| Admin panel | Built into the Next.js app (role-based) | One codebase; full control over rights records | Retool |

### How the main pieces fit

- **Web app** talks to **Supabase** for accounts, data and realtime updates.
- **Music** files live in **R2** and stream to the player through the CDN; the player and the binaural layer run in the browser (Web Audio API).
- **Check-ins** go from the app to **our server**, which runs transcription, the safety screen and the AI planner, then saves the plan to Supabase.
- **Rooms** use **LiveKit or Daily** for optional voice and video, and **Supabase realtime** for the shared timer and music sync.
- **Stripe** sends payment events to our server, which unlocks or removes premium access.

### Music sync in rooms

Music is **not** streamed through the video call, which would cost more and sound worse. Instead, the room server broadcasts "track X started at time T." Each person's app plays the same file from the CDN, starting at the right position for the shared clock, and re-syncs if it drifts. Everyone hears the same thing at high quality.

### Data model (core tables)

| Table | Key fields |
| --- | --- |
| users | id, email, name, age_confirmed, plan, created_at |
| tracks | id, title, file_url, length, category, style, mood_tags, energy, is_premium, source, license_record, status |
| playlists | id, owner_id or admin, title, track_ids, is_featured |
| checkins | id, user_id, transcript, mood_summary, safety_flag, created_at |
| plans | id, checkin_id, user_id, deadline, status |
| tasks | id, plan_id, title, estimate_minutes, order, status |
| focus_blocks | id, user_id, task_id, room_id, start, end, completed, track_ids |
| rooms | id, title, scheduled_start, length, capacity, music_playlist_id |
| room_participants | room_id, user_id, joined_at, left_at, mic_on, camera_on |
| reports | id, reporter_id, reported_user_id, room_id, reason, status |
| subscriptions | user_id, provider, status, plan, renews_at |

### Non-functional requirements

- **Performance:** pages load in under 2 seconds; music starts in under 2 seconds.
- **Accessibility:** keyboard navigation, screen-reader labels, readable contrast.
- **Security:** AI and payment keys stay server-side; row-level security on all user data.
- **Privacy:** GDPR and CCPA basics: consent, export, deletion.

## 7. Pricing, metrics and roadmap

### Pricing (starting point, to test)

| Plan | Price | Includes |
| --- | --- | --- |
| Free | $0 | Rotating music selection, Pomodoro timer, 1 AI check-in a day, 1 trial room |
| Premium monthly | $7.99 | Full library, binaural layer, unlimited check-ins and re-plans, all rooms, history and insights |
| Premium yearly | $59.99 | Same as monthly, about 37% cheaper |
| Free trial | 7 days | Full premium, card required |

Launch on the web with Stripe so no app store commission applies. Revisit prices after the first 100 paying users.

### Success metrics

Targets below are starting benchmarks to beat, not forecasts.

| Metric | Definition | v1 target |
| --- | --- | --- |
| Activation | New users who complete one full focus block in their first visit | 40% |
| Week-1 return | Users who come back within 7 days | 30% |
| Free to paid | Free users who start paying within 30 days | 3 to 5% |
| Trial conversion | Trials that become paid | 40% |
| Check-in completion | Check-ins that lead to a finished focus block | 60% |
| Room fill | Scheduled rooms with at least 5 people | 70% |
| Channel referral | Sign-ups that come from YouTube links | Track from day one |

### Build roadmap (about 10 weeks)

| Weeks | Phase | Deliverables |
| --- | --- | --- |
| 1 | Foundations | Final name, brand, waitlist page live and linked from every channel, design system |
| 2 to 3 | Design | Clickable prototype of all three flows, tested with 5 to 10 waitlist users |
| 3 to 5 | Core build (1a) | Accounts, music library and player, binaural layer, Pomodoro, admin upload, Stripe |
| 6 to 7 | AI build (1b) | Voice check-in, planner, re-planning, safety screen and crisis flow, legal review of copy |
| 8 to 9 | Rooms beta (1c) | Scheduled rooms, music sync, reporting and moderation tools |
| 10 | Launch | Invite the waitlist, onboarding emails, analytics dashboards, bug fixing |

### Team

| Role | Commitment |
| --- | --- |
| Product lead (owner of this PRD) | Part-time to full-time |
| Product designer | Full-time for weeks 1 to 4, then part-time |
| Full-stack engineers | 2, full-time |
| AI engineer | Part-time; owns prompts, planner logic and safety testing |
| QA | Part-time from week 4 |
| Music and content | Ongoing: produces and uploads tracks with rights records |
| Legal | Short engagement before the AI and payments launch |

### Running costs to plan for

Most services have free tiers that cover development. After launch, costs grow with usage:

- **Database and auth:** Supabase's paid plan starts at around $25 a month.
- **Music storage:** Cloudflare R2 charges for storage but not for streaming bandwidth, which keeps audio cheap.
- **AI and transcription:** charged per check-in; set daily limits on the free tier to control cost.
- **Rooms:** voice and video are billed by participant minutes; keep rooms scheduled and capped.
- **Payments:** Stripe takes about 2.9% plus 30 cents per transaction in the US.

Check each provider's current pricing before finalising the budget.

## 8. Risks and open questions

### Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| AI positioned or perceived as therapy | Legal penalties in some US states; app store rejection | Strict language rules, crisis flow, legal review (section 5) |
| Music rights for in-app streaming | Takedowns or disputes | Confirm Suno's terms cover app streaming, not just YouTube; rights record required for every track |
| Health claims about binaural beats | Consumer-protection and app store issues | Describe the experience only, never outcomes |
| Empty focus rooms | Poor first impression, churn | Scheduled sessions only, start with a few time slots, promote from the YouTube channels |
| Strangers misbehaving in rooms | User harm, reputational damage | Mic and camera off by default, 18+, report and block, admin removal |
| AI and room costs grow faster than revenue | Losses per user | Free-tier limits, capped rooms, monitor cost per active user weekly |
| Channels not yet monetized or grown | Slow user acquisition | Waitlist from day one; launch only when the waitlist shows demand |

### Open questions

1. **Name and brand:** does the app launch under Serene Pages Music or as its own brand promoted by all music channels?
2. **Music source:** which tracks come from Suno, which from musicians, and does each source's licence allow streaming inside a paid app?
3. **AI provider:** which model best balances plan quality, speed and cost? Test two before committing.
4. **Rooms at launch:** ship rooms in v1 as planned, or hold them until there are enough active users?
5. **Markets:** US-only at launch, or open globally with local crisis resources?
6. **Budget and team:** is this built by LeapTra's own product team, and what monthly budget is available for services?
7. **Pricing:** test $7.99 against a lower price point with the first waitlist cohort?
