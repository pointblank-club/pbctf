# PBCTF — Landing Page Design System

Design context for the PBCTF landing page. Use this as the reference when building new
sections, components, or marketing surfaces so they stay visually consistent.

The aesthetic has **two intertwined layers**:

1. **Synthwave / cyberpunk world** — near-black space, a single neon-green accent, a starfield,
   scanlines, CRT flicker, and a perspective synthwave grid. This is the *atmosphere*.
2. **Retro hardware devices** — most content sections are physically modeled gadgets: CRT
   monitors, a Game Boy, a radio tuner, hardware-chassis cards with screws, LEDs, beveled
   plastic, and tactile press states. This is the *furniture* sitting inside the world.

Everything is dark, green-accented, glowing, and skeuomorphic-retro. Premium and restrained
on color (one hue), maximal on tactile detail.

All landing styles live under `components/landing/`, are scoped to the `.pbctf-landing`
wrapper, and are authored as plain component CSS (one `.css` per component folder), **not**
Tailwind. The token source of truth is `components/landing/landing.css` (`:root`).

---

## 1. Color

| Token | Value | Use |
|---|---|---|
| `--bg` | `#050505` | Page background |
| `--bg-elevated` | `#0A0A0A` | Raised surfaces |
| `--bg-card` | `#0D0D0D` | Card background |
| `--bg-card-hover` | `#111111` | Card hover |
| `--secondary` | `#0B0B0B` | Secondary dark fill |
| `--primary` | `#00FF88` | **Primary neon green** — the brand accent |
| `--primary-dim` | `rgba(0,255,136,0.15)` | Tints, faint fills |
| `--primary-glow` | `rgba(0,255,136,0.4)` | Glow shadows |
| `--accent-gold` | `#8CFF00` | Lime/chartreuse secondary accent |
| `--accent-gold-dim` | `rgba(140,255,0,0.15)` | Lime tints |
| `--accent-gold-glow` | `rgba(140,255,0,0.4)` | Lime glow |
| `--text` | `#FFFFFF` | Primary text |
| `--text-secondary` | `#E0E0E0` | Secondary text |
| `--muted` | `#A0A0A0` | Body/muted copy |
| `--muted-dark` | `#666666` | Disabled, hints |
| `--border` | `rgba(255,255,255,0.06)` | Default hairline border |
| `--border-hover` | `rgba(255,255,255,0.12)` | Border on hover |

**Off-palette literals used inside hardware components** (intentional, for skeuomorphism — keep
consistent if you build new gadgets):

- **Chassis / plastic darks:** `#1f2723`→`#0d120f` (device gradient), `#1d221e`, `#2a352f`,
  `#282f2a`, `#2a2c30` (Game Boy body), `#222`/`#111`/`#1a1a1a` (buttons/D-pad).
- **CRT screen darks:** `#010603`, `#050806`, `#030604`, `#081a10` (Game Boy green screen).
- **Screws:** `#0a0e0c` with `inset 0 1px 2px rgba(0,0,0,1), 0 1px 0 rgba(255,255,255,0.1)`.
- **Inactive LED red:** `#440000` / `#550000` / `#3a1e1e`; Game Boy power LED active `#ff0044`.
- **Muted secondary green** (2nd/3rd place, non-hero devices): `#A0E0B0` / `rgba(160,224,176,*)`.
- **macOS window dots:** `#ff5f56` / `#ffbd2e` / `#27c93f`.

**Rules**
- One brand accent. Green (`--primary`) leads; lime (`--accent-gold`) is the only secondary and
  is used sparingly. Don't add new brand hues — the only "extra" colors allowed are the
  skeuomorphic device literals above.
- Backgrounds are near-black, layered by elevation (`--bg` → `--bg-elevated` → `--bg-card`).
- Borders are white at very low opacity, never solid gray.
- Signature gradients: device chassis `linear-gradient(145deg, #1f2723 0%, #0d120f 100%)`;
  CTA/lime `linear-gradient(135deg, var(--accent-gold), #7BE800)`; hero sun
  `#8CFF00 → #00FF88 → #000000`; glass card `linear-gradient(145deg, rgba(13,20,16,.7), rgba(8,13,10,.9))`.

---

## 2. Typography

Loaded in `app/layout.tsx` via Google Fonts (`display=swap`):

| Token | Family | Use |
|---|---|---|
| `--font-body` / `--font-heading` | **Lexend** | Body copy and all headings |
| `--font-hero` | **Space Grotesk** | Hero headline (big display) |
| `--font-mono` | Lexend (mono role) | Eyebrow labels, taglines, technical/screen text |

> **JetBrains Mono** is also preloaded and is the right pick for genuinely monospaced terminal/
> screen readouts (CRT text, barcodes, badges). `--font-mono` currently maps to Lexend for the label role.

**Type scale:** `--text-xs` `0.75rem` → `--text-6xl` `4rem`, plus `--text-hero`
`clamp(2.5rem,6vw,5rem)`. Section titles `clamp(2rem,4vw,3.25rem)`; hero headline
`clamp(4.5rem,9.5vw,7.5rem)` @800.

- Headings: weight 600–700, `line-height: 1.15`, `letter-spacing: -0.02em` (tight).
- Body: weight 400, `line-height: 1.6`.
- **Eyebrow/section labels** are the one intentional ALL-CAPS + wide-tracking place: mono,
  `--text-xs`, `letter-spacing: 0.2em`, uppercase, green, with a 24px green leading rule
  (`.section__label`). Deliberate CTF/terminal motif.
- **Screen/badge text** inside devices: mono, small (`8px–14px`), often `letter-spacing: 0.1em–0.2em`,
  uppercase, in green with a faint `text-shadow`.

---

## 3. Spacing, layout, radius

- **Spacing scale:** `--space-1` (0.25rem) → `--space-40` (10rem), 4px-based.
- **Containers:** `--container-max` 1200px, `--container-wide` 1400px (`.container`, `.container--wide`).
- **Sections:** `.section`, vertical rhythm `--section-padding-y` `clamp(5rem,10vh,8rem)`
  (reduced on mobile), horizontal `--section-padding-x` `clamp(1.25rem,4vw,2.5rem)`.
- **Radius:** `--radius-sm` 6px (buttons), `--radius-md` 10px, `--radius-lg` 16px (cards),
  `--radius-xl` 24px, `--radius-full`. Device chassis use bespoke larger radii (12–30px) and
  asymmetric corners (e.g. Game Boy `12px 12px 60px 12px`).

---

## 4. Core shared components

### Buttons (`.btn`)
- Base: inline-flex, uppercase, weight 600, `letter-spacing: 0.04em`, `--radius-sm`,
  padding `--space-4 --space-8`.
- `.btn--primary`: solid green on dark; hover lifts 1px + green glow
  `0 0 30px var(--primary-glow), 0 0 60px rgba(0,255,136,0.15)`.
- `.btn--secondary`: transparent + hairline border; hover → green border + green text.
- `.btn--gold`: lime gradient fill; hover lime glow.
- "Pill" CTA variant (Sponsors): `border-radius: 999px`, faint green gradient fill, hover
  brightens + `0 0 30px rgba(0,255,136,0.12)` + lift 2px.

### Section header pattern
`.section__label` (green mono eyebrow + rule) → `.section__title` (large, 700) →
`.section__subtitle` (muted, `--text-lg`, max 600px). Reuse this trio for every new section.

### Glass card (used by Categories, Sponsors, Venue, About)
- Background `linear-gradient(145deg, rgba(13,20,16,.7), rgba(8,13,10,.8–.95))` +
  `backdrop-filter: blur(10–12px)`.
- Border `1px solid rgba(0,255,136,0.05–0.15)` (or low-opacity white); radius 12–20px.
- Optional top accent line via `::before`: `height:1–2px; background: linear-gradient(90deg,
  transparent, var(--primary), transparent)`, `opacity:0` → `1` on hover.
- Hover: `translateY(-4px to -6px)`, border brightens to `rgba(0,255,136,0.15–0.25)`, soft
  green-tinted shadow `0 10–20px 40–60px -10px rgba(0,255,136,0.06–0.1)`.

### Plain `.card`
`--bg-card`, hairline `--border`, `--radius-lg`, padding `--space-8`. Hover brightens border +
background. No colored left-accent stripes.

---

## 5. The retro hardware-device language (the defining motif)

Most sections are modeled as physical gadgets. When building a new "device" section, compose
from this kit so it reads as the same hardware family:

**Chassis**
- Body gradient `linear-gradient(145deg, #1f2723 0%, #0d120f 100%)`, border `1px solid #2a352f`
  with a thicker (`4px`) bottom border for depth.
- Layered shadow recipe: `0 15px 35px rgba(0,0,0,0.6)` (drop) + `inset 0 2px 5px rgba(255,255,255,0.05)`
  (top highlight). Bigger devices add `0 10px 0 0 #121513` (hard bottom edge) and
  `0 25px 50px rgba(0,0,0,0.85)`.

**Screws** — `6px` circle, `#0a0e0c`, `inset 0 1px 2px rgba(0,0,0,1), 0 1px 0 rgba(255,255,255,0.1)`,
placed in chassis corners (`top/left: 8px`, etc.).

**LED indicator** — small rounded rect/dot. Inactive `#440000`/`#550000` with inset shadow;
active `var(--primary)` (or `#A0E0B0` for secondary devices, `#ff0044` for Game Boy power) with
`box-shadow: 0 0 10px <color>`. Often animated with a 2s pulse.

**CRT screen** — inset dark panel (`#050806`/`#010603`), `border-radius: 6–8px`,
`box-shadow: inset 0 0 20–40px rgba(0,0,0,0.8)`, green border when "on"
(`rgba(0,255,136,0.4–0.5)` + inner green glow). Always overlaid with **scanlines**:
`repeating-linear-gradient(... rgba(0,0,0,0.25) 50%)`, `background-size: 100% 4px`, `opacity ~0.6`.
Screen text is mono green with `text-shadow`.

**Tactile press** — interactive hardware (power buttons, action buttons, play button) uses a
fast `~0.1–0.15s ease` transition and presses *into* the chassis on `:active`:
`transform: translateY(1.5–3px)` with the box-shadow swapping outer drop-shadow for inset.

**macOS window chrome** — terminal/window panels get three 8px dots `#ff5f56 / #ffbd2e / #27c93f`.

**Barcodes / tech badges** — decorative `repeating-linear-gradient` barcode strips and mono
`font-size:8–11px` uppercase badges with wide tracking, green on hero devices.

---

## 6. Section-by-section aesthetic catalog

**Header** — fixed nav, transparent → on scroll glassy `rgba(5,5,5,0.75)` + `blur(20px)` +
faint green border + `0 10px 40px rgba(0,0,0,0.5)`. Logo is gradient text
`linear-gradient(135deg, var(--text), var(--primary))` with green drop-shadow; hover rotates the
mark `90deg`. Uppercase nav links (13px, weight 600) glow white on hover. Mobile: full-screen
overlay `rgba(5,5,5,0.95)` with a corner green radial; animated hamburger (lines 24/14/20px → X).

**Loader** (first visit only, gated by `sessionStorage` `pbctf_loader_seen`) — full-screen
`#030604`, panning 40px green grid (`bg-pan` 20s), vignette, thin green progress bar with
`0 0 10px` glow + a blurred glow layer beneath, pulsing brand wordmark (`pulse-glow` 2s,
text-shadow 10px→30px), tabular-nums percentage. Exits with `translateY(-40px) scale(1.02)` fade.

**Hero** — synthwave scene: black→green vertical sky, a circular "sun" (green→lime→black) sliced
by horizontal scanlines, a glowing neon horizon line (`0 0 35px #00FF88`), and a perspective grid
`rotateX(55deg)` scrolling toward the viewer (`grid-scroll-straight` 2.5s). Centered headline in
Space Grotesk 800 with multi-layer neon `text-shadow`; mono uppercase tagline; bouncing scroll
chevron; cinematic letterbox bars.

**MissionBrief** — a full **CRT monitor on a stand** (beveled `30px`-radius housing, neck + base),
with a power button, knobs, LED, and a playable Flappy-Bird-style minigame on a green phosphor
screen. Power on/off plays CRT distortion animations (`crt-power-on` 0.35s flash; `crt-power-off`
0.45s collapse to a line then a dot). Blinking cursor terminal text.

**Timeline** — vertical spine with a glowing green progress line driven by scroll
(`linear-gradient(to bottom, dim, primary)` + glow). Each event is a small **CRT-screen device**
(chassis + screws + LED + scanline screen). Active node pulses (`pulse-shadow` 2s ring), its
screen flickers on activate (`screen-flicker` 0.4s) and lifts `translateY(-4px)`. Desktop:
alternating left/right around center; mobile: single left-aligned rail.

**Categories** — a **cyber-database UI**: glass container split into a left matrix nav sidebar
(320px) and a right readout panel with a radial green wash + scanlines. Animated dual **orbital
rings** around a 48px line-drawn icon (`rotate-slow` 10s / 15s reverse), an **audio-wave** equalizer
(`audio-wave` 1.2s, staggered bars with green glow), blinking nav indicators, difficulty pips,
and a green underline divider with glow.

**Prizes** — three **hardware-device podium cards** (desktop order 2nd/1st/3rd, align-end for a
podium; mobile 1st/2nd/3rd stacked). Each is a chassis with screws, LED, and an inset scanline
screen showing the amount. 1st place is hero-sized (380px) with full neon green glow; 2nd/3rd use
muted `#A0E0B0` green. Barcode strip + tech badges. Total prize headline `clamp(2.5rem,6vw,4rem)`
@800 in green with `0 0 30px` glow and a fading green divider.

**Sponsors** — radial green wash background; horizontal **glass logo cards** (260×120) with a
spring hover (`cubic-bezier(0.34,1.56,0.64,1)`, lift + `scale(1.03)`) and a one-shot diagonal
**shimmer** sweep (`sponsors-shimmer` 0.65s). A masked **marquee ticker** of names
(`ticker-scroll` 28s linear, pauses on hover) with 4px dot separators. "Become a sponsor" glass
CTA block with a top accent line and a pill button.

**AboutPointBlank** — centered glass content box (`blur(10px)`, green border, inner green glow,
masked radial vignette) with a video modal. Hardware-style circular **play button** (`#222`
casing, layered inset shadows, green icon with drop-shadow) that presses in on `:active`
(`translateY(2px)`). 16:9 video wrapper with green border; close button hovers red `#ff4444`.

**Venue** — glass venue cards (radius 20px, `blur(12px)`) with 16/10 map images
(`scale(1.05)` on hover, bottom gradient scrim) and a top green accent line on hover. Includes a
**retro radio-tuner module**: a 3D **knob** (60px, layered inset/outset shadows, green indicator
dot, `cursor: grab`), a pulsing green status readout (`pulse-status` 2s), and a volume-bar
equalizer (rising 8→24px bars, active bars green-glowing).

**FAQ** — a classic **Game Boy**: dark matte body `#2a2c30` with the signature
`12px 12px 60px 12px` corner notch and heavy layered shadows, a `#111` bezel, and a retro-green
screen `#081a10` with green text `#00FF88`, scanlines, a styled green scrollbar, and accordion
items (green-bordered, brighten when open). Functional **D-pad** (cross of `#111` bars) and
circular green **action buttons** (press in `translateY(3px)`), angled **speaker slits**, and a
red power light (`#ff0044` glow when active).

**FinalCTA** — centered headline `clamp(2rem,5vw,3.5rem)` @700 + muted description over a
breathing radial glow (`radial-gradient(ellipse, var(--accent-gold-dim), transparent 70%)`,
`cta-pulse` 4s alternate opacity 0.3↔0.6) and the primary/secondary button group.

**Footer** — minimal bar on `--bg-card` with a top accent gradient line; 36px square social
icons (hairline border) that lift `translateY(-2px)` and turn green on hover; muted xs legal
links; faded brand logo. Desktop grid `1fr auto 1fr`.

**StarsBackground** — fixed full-viewport `<canvas>` starfield, `opacity: 0.8`, `z-index: -5`,
`pointer-events: none`. JS-animated.

**GridScan** — uses the webcam (`face-api.js`): a small mirrored (`scaleX(-1)`) camera preview
window (220×132, bottom-right, `pointer-events: none`) with a blurred badge label. A canvas
scanning effect; non-interactive overlay.

---

## 7. Motion & keyframe library

Libraries: **GSAP + ScrollTrigger** (scroll reveals, hero grid, timeline progress) and
**Framer Motion** (`MotionConfig reducedMotion="user"`).

- **Easing tokens:** `--ease-out` `cubic-bezier(0.16,1,0.3,1)` (entrances, the house curve),
  `--ease-in-out` `cubic-bezier(0.65,0,0.35,1)`. Spring hover (cards): `cubic-bezier(0.34,1.56,0.64,1)`.
  Loader exit: `cubic-bezier(0.77,0,0.175,1)`.
- **Durations:** `--duration-fast` 150ms, `--duration-normal` 300ms, `--duration-slow` 500ms.
  Tactile hardware uses ~100–150ms; hover transitions use `--duration-normal var(--ease-out)`.

Named keyframes already in use (reuse rather than reinvent):

| Animation | What it does | Timing |
|---|---|---|
| `grid-scroll-straight` | Hero synthwave grid scrolls toward viewer | 2.5s linear ∞ |
| `hero-bounce` | Scroll-indicator chevron bob | 2s ∞ |
| `crt-flicker-anim` | Global CRT opacity jitter | 0.15s ∞ |
| `bg-pan` | Loader grid pan | 20s linear ∞ |
| `pulse-glow` | Loader brand text-shadow breathe | 2s ease-in-out ∞ alt |
| `crt-power-on` / `crt-power-off` | MissionBrief monitor on/off distortion | 0.35s / 0.45s |
| `cursor-blink` | Terminal cursor | 1s step-end ∞ |
| `power-glow` | Power LED breathe | 2s alt ∞ |
| `rotate-slow` | Categories orbital rings (one reversed) | 10s / 15s linear ∞ |
| `draw-icon` | Categories SVG stroke draw-on | 1.5s ease-out |
| `audio-wave` | Categories equalizer bars | 1.2s ease-in-out ∞ (staggered) |
| `blink` | Nav/indicator blink | 1s step-end ∞ |
| `pulse-shadow` | Timeline active node ring pulse | 2s ∞ |
| `screen-flicker` | Timeline screen flicker on activate | 0.4s ease-out |
| `sponsors-shimmer` | Sponsor card diagonal shimmer sweep | 0.65s ease (hover) |
| `ticker-scroll` | Sponsor marquee | 28s linear ∞ (pause on hover) |
| `pulse-status` | Venue radio status opacity pulse | 2s ∞ |
| `cta-pulse` | FinalCTA glow breathe | 4s ease-in-out ∞ alt |

**Always honor `prefers-reduced-motion`** — `landing.css` already kills animations/transitions
under it, and `MotionConfig` respects it. New animations must degrade gracefully.

---

## 8. Global atmosphere overlays & z-index

Applied in `LandingPage.tsx` over the whole page:

- **Starfield** (`StarsBackground`, `z-index: -5`) behind everything.
- **Cyber grid** (`.cyber-grid`): faint fixed 40px green grid, `z-index: -2`.
- **Scanlines** (`.scanlines`): fixed full-screen 4px repeating dark gradient,
  `z-index: 9999`, `pointer-events: none`.
- **CRT flicker** (`.crt-flicker`): tiny opacity oscillation.
- **Cinematic letterbox** + glitch **Loader**: first-visit intro framing.
- **Custom scrollbar & selection**: 6px green thumb (hover lime); green text selection.

**Z-index scale:** `--z-3d:0` · `--z-content:1` · `--z-header:100` · `--z-overlay:200` ·
`--z-modal:300`. Texture overlays intentionally sit at `9999`; background canvases use negative
z-index. The `.pbctf-landing` wrapper sets `isolation: isolate` so the starfield paints correctly.

---

## 9. Page composition

`LandingPage.tsx` order: `StarsBackground` → scanlines → (`Loader`) → fixed `Header` →
`main`( `Hero` → `MissionBrief` → `Timeline` → `Categories` → `Prizes` → `Sponsors` →
`AboutPointBlank` → `Venue` → `FAQ` → `FinalCTA` ) → `Footer`. Each section is a folder with
`.jsx` + scoped `.css`.

---

## 10. Conventions & guardrails

- **Scope everything to `.pbctf-landing`.** All selectors are prefixed so landing styles never
  leak into the app/dashboard. Keep new landing CSS prefixed.
- **Tokens over literals** for brand color/spacing/radius — add a token in `landing.css` rather
  than hardcoding. The only sanctioned literals are the skeuomorphic device colors in §1/§5.
- **One CSS file per component**, colocated in the component folder.
- **New "device" sections** must reuse the hardware kit (§5): chassis gradient, screws, LED,
  scanline screen, tactile press. Don't invent a different gadget visual language.
- **Mobile**: primary breakpoint `max-width: 768px` (some components use 640/800/480/1024).
  Devices scale chassis/screen/control dimensions down proportionally and stack to single column.
- **Accessibility**: keep reduced-motion fallbacks; reserve glow for display/screen type and use
  `--text`/`--text-secondary` for readable body copy on the dark ground.
- **Brand note:** the neon-green-on-black, ALL-CAPS-mono labels, glow, scanlines, synthwave grid,
  and retro-hardware skeuomorphism are the *intended* brand for this landing surface. The general
  "avoid AI design tells" guidance (no glows, no uppercase eyebrows, no glassmorphism) does **not**
  override it here — but keep it tasteful, consistent, and performance-conscious.
</content>
