# Focus App Design System

Clear head, deep work. A premium, night-first interface where soft blue, violet and orange light glows behind calm, confident type. The machine-readable tokens are in `design/tokens.json`; this file is the brand book plus implementation recipes.

"Focus App" is a working name. Keep it in one config constant so it can be renamed in one place.

## Principles

- **Light in the dark.** Every screen sits on midnight with soft gradient glows behind it, like dawn light. The glow carries the mood; content stays clean and readable on top.
- **Calm before action.** Flows start soft (a check-in, a breath, a slow fade) and only then ask for work. Nothing flashes or bounces.
- **One thing at a time.** One job and one primary button per screen. During a focus block: the task, the timer, the music, nothing else.
- **Premium through restraint.** Generous space, few words, large confident type. Glass cards, never heavy boxes.

## Colour tokens

Night is the default theme. Day is used for settings, billing and legal pages, or by user choice.

| Token | Night (default) | Day | Use |
| --- | --- | --- | --- |
| `surface` | `#0B0D1A` | `#F7F5FC` | Page ground under the glow |
| `surface-glass` | `rgba(255,255,255,0.06)` | `rgba(255,255,255,0.72)` | Frosted cards, player, sheets |
| `surface-deep` | `#131631` | `#EDEAF7` | Solid cards, inputs, empty progress tracks |
| `line` | `rgba(255,255,255,0.12)` | `#E3E1EE` | Hairline borders and dividers |
| `ink` | `#F4F2FF` | `#14152B` | Primary text and icons |
| `ink-muted` | `#B4B2CC` | `#5A5A74` | Secondary text |
| `blue` | `#3F5EF5` | `#3F5EF5` | Gradient stop 1; focus; primary actions |
| `violet` | `#7C4DFF` | `#6E45E8` | Gradient stop 2; the signature; AI moments |
| `orange` | `#FF8A4C` | `#E0662A` | Gradient stop 3; timer ring, progress, streaks (graphic only) |
| `blue-soft` | `#9FB2FF` | `#DCE3FF` | Calm accents, links on night, focus ring |
| `violet-glow` | `#3A2A6E` | `#E6DEFF` | Large blurred violet orb |
| `orange-glow` | `#5A2E2A` | `#FFE3D3` | Warm orb, lower corner |
| `on-brand` | `#FFFFFF` | `#FFFFFF` | Text on the button gradient |
| `critical` | `#FF6B6B` | `#C93838` | Errors, report and block |

Contrast checked: `ink-muted` on midnight 9.4:1 (7:1 over the violet glow); white on `blue` 5.1:1, on `violet` 4.8:1. `orange` is never used for body text.

## Gradient recipes (use exactly)

**Background glow (default screen):**

```css
background:
  radial-gradient(circle at 88% 6%,  rgba(124,77,255,0.60) 0, rgba(124,77,255,0) 52%),
  radial-gradient(circle at 6% 22%,  rgba(63,94,245,0.42) 0, rgba(63,94,245,0) 46%),
  radial-gradient(circle at 12% 104%, rgba(255,138,76,0.38) 0, rgba(255,138,76,0) 48%),
  #0B0D1A;
```

Mood variants move the orbs: **focus** puts a blue orb behind the timer (centre, 0.55), **check-in** puts a violet orb at top centre (0.70), **rooms and finishes** lean orange top-right (0.40). On large screens, scale the gradient stops so orbs stay soft, never banded. Optional: drift orbs a few pixels over 20 to 40 seconds; disable under `prefers-reduced-motion`.

**Primary button:** `background: linear-gradient(135deg, #3F5EF5, #7C4DFF); color: #FFFFFF; box-shadow: 0 10px 30px rgba(124,77,255,0.40);`

**Signature orb (voice check-in, logo mark):** `linear-gradient(135deg, #3F5EF5 0%, #7C4DFF 60%, #FF8A4C 100%)`.

**Timer and progress ring:** SVG stroke with a linear gradient from `#7C4DFF` to `#FF8A4C`, rounded caps, on a `rgba(255,255,255,0.10)` track.

**Glass card:** `background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); backdrop-filter: blur(20px); border-radius: 28px;` (fall back to `surface-deep` where blur is unsupported).

**State cards (Focus / Calm / Clear):** Focus `linear-gradient(160deg, #3F5EF5, #5B3FD0)`; Calm `linear-gradient(160deg, #2A3B8F, #3A2A6E)`; Clear `linear-gradient(160deg, #7C4DFF, #C2563A)`; white text.

## Typography

- **Instrument Serif** (Google Fonts, regular and italic) for greetings, page titles, hero lines and mix names. Use italic on one emphasised word: "Find your *focus*".
- **Plus Jakarta Sans** (Google Fonts, 200 to 700) for everything else.
- Load both with `next/font/google`.

| Style | Family | Size / line | Weight |
| --- | --- | --- | --- |
| hero | Instrument Serif | 52 / 54 (landing hero up to 72 / 74 on desktop) | 400 |
| heading-1 | Instrument Serif | 36 / 40 | 400 |
| heading-2 | Plus Jakarta Sans | 20 / 26 | 600 |
| heading-3 | Plus Jakarta Sans | 16 / 22 | 600 |
| body | Plus Jakarta Sans | 15 / 22 | 400 |
| body-small | Plus Jakarta Sans | 13 / 18 | 500 |
| eyebrow | Plus Jakarta Sans | 11 / 14, letter-spacing 0.08em, sentence case | 600 |
| timer | Plus Jakarta Sans | 84 / 84, tabular numerals | 200 |

## Spacing and shape

- Spacing: 4, 8, 16, 24, 40, 64. Mobile side margins 24px.
- Radius: 10 (inputs, thumbnails), 18 (buttons), 28 (glass cards, sheets, player), 999 (chips, round controls).
- Touch targets at least 44px.

## Voice

- Short, kind and plain. "Feeling foggy? Let's get you moving."
- Describe the experience, never an outcome: "music designed for focus", never "clinically proven" or "boosts productivity 30%".
- The AI is a **focus guide**. Never use therapist, therapy, counselling or treatment anywhere in the interface or marketing.
- Celebrate quietly: "3 blocks done. Nice work."

## Iconography

Lucide icons at a 1.5px stroke in `ink` or `ink-muted`. Every icon-only button has an `aria-label`. No emoji in the interface.

## Motion

Slow and breathing: fades of 300 to 600ms with ease-out; the reset screen's breathing orb grows over 4 seconds and shrinks over 4. With reduced motion, glows stay still and transitions become plain fades.

## Accessibility

2px `blue-soft` focus ring on every interactive element. Real buttons, links and labelled inputs. Text never sits on the brightest part of a glow without the contrast checked. Colour is never the only signal.

## Reference screens

The approved mobile designs (Home, Clarity check-in, Focus block, Focus room) live in the "Focus App Screens" design canvas. Match their layout, spacing and styling.
