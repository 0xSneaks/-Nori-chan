# のりちゃん × こいぬ — Nori-chan × Koinu

Nori-chan × Koinu is an original community-inspired $SUSHI companion concept and kawaii arcade game, inspired by the Koinu pairing discussion on October 17, 2026.

**こいぬコロコロ！ Koinu Korokoro!** — a mobile-first kawaii arcade game and the $SUSHI companion storefront.

Koinu, Nori-chan's very round puppy, rolls through her little Japanese sushi town collecting sushi, hopping wasabi and fish crates, dodging tall yatai carts and chaining combos in 60-second runs.

> Nori-chan and Koinu are original characters. This project is **not affiliated with, endorsed by, or partnered with any KOINU project or token.**

## Origin

Someone suggested a Japanese-themed companion for Koinu. Our creator said, “I'll do it.” That's how Nori-chan and her sushi shop joined the story.

Original community-inspired fan project. Not presented as officially affiliated with or endorsed by another KOINU project.

## Stack

- Vite + TypeScript, HTML5 Canvas 2D (no game engine, no backend, no paid APIs)
- WebAudio synth for all sound (no audio files)
- Vitest for unit tests
- Static output (`dist/`) — deploys as a plain static site

```
src/
  main.ts              storefront wiring (play buttons, icons, festival status, token copy)
  styles.css           storefront + game dialog styles
  site/sakura.ts       ambient falling blossoms
  game/
    config.ts          all tuning constants
    world.ts           simulation: player, spawning, collisions, timer, festival bonus stages
    scoring.ts         combo/multiplier rules (pure)
    physics.ts         collision + jump math (pure)
    rng.ts             seeded PRNG (deterministic runs/tests)
    renderer.ts        canvas rendering, particles, HUD
    sprites.ts         procedural art (Koinu, sushi, wasabi, carts, lanterns...)
    input.ts           keyboard + swipe/tap
    audio.ts           WebAudio sfx + music
    storage.ts         high scores + settings (localStorage, crash-safe)
    game.ts            game dialog: state machine, menus, pause, game over
    phrases.ts         Japanese phrases with romaji + English
    assets.ts          hook for the original Koinu art
  premium/
    entitlements.ts    payment/entitlement interface (payments OFF)
    costumes.ts        festival cosmetics
tests/                 physics, scoring, world, fairness, storage, premium, autopilot
```

## Run it

```bash
npm install
npm run dev        # local dev (festival dev preview is ON in dev)
npm test           # unit tests
npm run typecheck
npm run test:premium-build # compare actual production/preview bundle hashes
npm run build      # typecheck + production build -> dist/
npm run preview    # serve the production build
```

## Game

| Action | Phone | Keyboard |
| --- | --- | --- |
| Roll left / right | Swipe ← → | ← → / A D |
| Hop | Tap or swipe ↑ | Space / ↑ / W |
| Pause | Ⅱ button | P / Esc |
| Mute | 🔊 button | M |

- 60-second runs; speed ramps up over the run.
- Sushi 8–50 pts. Every 5 in a row adds +0.5× (max ×4). A hit or 2.4 s without a pickup resets the combo; hits cost 15 pts and a short stun.
- Wasabi and fish crates can be hopped; yatai carts are tall and must be avoided by changing lanes.
- Bell = 5 s sushi magnet. Clock = +3 s (max 3 per run).
- Spawn fairness is enforced and tested: max one tall cart per row, never on consecutive rows, at most two hazards per row, sushi never placed on a hazard.
- High scores (top 5 per mode) and mute/costume settings are stored on the device only.

## Free vs. Sakura Night Festival (premium)

- **Free:** the complete core game, unlimited, no wallet or account.
- **Sakura Night Festival:** separate night mode with two golden-sushi bonus stages per run, fireworks, night music, its own leaderboard, and cosmetic costumes unlocked by festival score. Same speed, hitboxes and scoring rules as free play — no pay-to-win, no loot boxes, no gambling.

### Payments are NOT enabled

`src/premium/entitlements.ts` defines the `EntitlementProvider` interface. Production uses `PaymentsNotConfiguredProvider` (festival locked, checkout returns `ok: false`). Nothing charges anyone.

**Dev preview:** the festival can be play-tested when the build-time constant `__PREMIUM_DEV_PREVIEW__` is true:
- always in `npm run dev`;
- on Vercel **preview** builds when `VITE_PREMIUM_DEV_PREVIEW=true`;
- **never** on Vercel production builds (`VERCEL_ENV=production` forces it off in `vite.config.ts`).
- Flagged static builds without explicit `VERCEL_ENV=preview` also stay locked.

**Before turning on real purchases** (needs owner approval of provider, price and checkout flow):
1. Implement `ServerEntitlementProvider`: hosted checkout → provider webhook (signature verified server-side) → entitlement stored server-side → short-lived signed token/session the client presents.
2. Never trust a client-side flag, localStorage value, query param or browser-only wallet check to unlock premium.

## Art

- **Nori-chan:** original SVG at `public/assets/nori-chan.svg`.
- **Koinu:** the original puppy image has **not** been supplied. The site shows `public/assets/koinu-placeholder.svg` (visibly labelled TEMP ART) and the game draws Koinu procedurally.
  To use the original: add `public/assets/koinu.png` (square, transparent, ~512 px), set `KOINU_ART_URL = '/assets/koinu.png'` in `src/game/assets.ts`, and replace the placeholder `<img>` in `index.html`.

## $SUSHI token

**$SUSHI has not launched; no mint is published.** The address `DfBJCoLnaF75GaKPWB4c3TFyMHcXmAShiuWm3dHNpump` is shown only as a **KOINU reference** (reported by third-party indexes as the KOINU mint; not verified on-chain here) and is never presented as $SUSHI. "Pairing" means community branding, not a liquidity pool. No purchase links for any token (see #5).

## Deploy to Vercel

`vercel.json` pins the build (`npm run build` → `dist`) and adds security headers (CSP, nosniff, referrer and permissions policies).

1. Vercel → **Add New → Project** → import `0xSneaks/-Nori-chan`.
2. Framework preset: **Vite** (auto). Build: `npm run build`. Output: `dist`. Node 22.12+ (CI uses Node 22).
3. Optional, Preview environment only: `VITE_PREMIUM_DEV_PREVIEW=true` to play-test the festival. Do **not** set it for Production (it is ignored there anyway).
4. Deploy → open the **preview** URL and test on a phone.
5. Promote to production only after owner approval.

## Quality checks

`npm run check` runs TypeScript, deterministic simulation tests and DOM integration tests, then builds the site. DOM tests cover dialog input scope, keyboard/pointer gestures, pause/resume, restart, countdown cleanup, focus wrapping, full-run score persistence, the locked festival entry point, and high-DPI icon repaints. Only canvas/audio output is mocked in the host tests; they are not browser rendering or real-device tests.

`npm run test:premium-build` verifies actual production output is byte-identical with the preview flag on/off, checks unscoped and development-target static builds stay locked, verifies the explicit preview output differs, and leaves locked production output in `dist`. GitHub Actions runs both commands plus a dependency audit. Real Android/iPhone touch, Safari audio, small-screen menu scrolling and rendered frame rate still require browser/device smoke tests before release. The menu allows vertical scrolling while the canvas owns gameplay gestures.

Only hashed Vite entry assets receive the one-year immutable cache header; the documented unversioned mascot images must remain revalidatable.
