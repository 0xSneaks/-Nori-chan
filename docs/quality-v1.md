# Codex independent V1 review

TESTED REVISION: Claude PR #6 at `4b4cebb169d6ad1dd88fa73d7ddf7fee241dec0e`, plus the targeted quality patch in this PR. Claude's branch, screenshots and pairing/origin copy are preserved.

## VERIFIED

- `npm ci --no-fund`: succeeds from the lockfile.
- `npm run check`: TypeScript clean, **48 tests pass**, Vite production build succeeds. The original baseline passed 33 tests.
- `npm run test:premium-build`: production bundles with the preview flag off/on are byte-identical; unscoped and development-target static builds also stay locked; explicit flagged Vercel Preview differs. The script leaves locked production output in `dist`.
- `npm audit --json`: zero known vulnerabilities, including the new test-only happy-dom dependency. No production dependencies were added.
- `git diff --check`: clean.
- Original score/combo, pickups, obstacle collisions, hop/cart behavior, magnet, clocks and whole-run simulation tests pass. Added actual-host DOM tests cover free/locked festival entry, keyboard handling, pause/resume, restart/reset, countdown cleanup, focus wrapping and a full run saving its result.
- Pointer event tests cover chained left/right/up swipes, taps, cancellation and secondary-pointer movement. These are synthetic DOM events, not physical touch tests.
- Existing row fairness covers 40 seeds × 300 rows. An additional search retains a collision-free route across 5 seeds × 80 successive rows at maximum speed and 20 simulation steps/second, using the real World movement/jump/collision code. This is sampled reachability, not a proof over every seed or human reaction speed.
- High-DPI icon repaint regression reproduces the original 56px → 112px CSS growth, and passes with the fix.
- Fake localStorage payment/entitlement flags and URL parameters do not unlock the locked provider. GameHost also refuses a festival entry without entitlement. Checkout and server entitlement stubs continue to fail closed.

## FAILURES reproduced and fixed

| Finding | Evidence / minimal correction |
| --- | --- |
| P1: slow frames extend a nominal 60-second run | At 10 FPS, 10 seconds of wall time originally deducted only 5 seconds. `src/game/game.ts:188` preserves elapsed time; `src/game/world.ts:152` advances collisions in ≤50ms steps. Countdown completion consumes only the frame remainder. Low-FPS and long-frame obstacle regressions pass. |
| P1 release configuration gap: flagged static builds could unlock premium outside Vercel Production | `vite.config.ts:19` now requires explicit Vercel Preview for flagged build unlocks. Local dev remains available. The real bundle matrix checks the fail-closed cases. |
| P2: game listener intercepts page/form keys | `src/game/input.ts:33` scopes keyboard events to the supplied game dialog and preserves editing keys. |
| P2: paused restart retains Resume label; aborted countdown survives reopening | `src/game/game.ts` resets the pause control and countdown on relevant transitions. |
| P2: Shift+Tab from focused canvas can leave the modal | `src/game/game.ts:537` wraps focus when the active canvas is outside the tabbable control list. DOM test passes; screen-reader/device testing remains open. |
| P2: repaint grows icons on high-DPI phones | `src/main.ts:77` preserves CSS icon size independently of backing-store dimensions. |
| P2: modal ancestor prevents vertical menu panning | `src/styles.css:862` permits vertical menu gestures; the gameplay canvas retains touch-action none. Device verification remains open. |
| Release maintenance: unversioned mascot art cached immutable for a year | `vercel.json:20` narrows that header to hashed Vite entry assets. |

## Architecture and safety assessment

VERIFIED by source inspection: lean Canvas/TypeScript architecture separates simulation, rendering, input, storage and entitlement providers. Rendering caps DPR at 2, particles at 400 and popups at 14; simulation prunes inactive entities. TypeScript is strict. Stored date text is escaped before HTML output. No payment provider, secret, token-buy flow or production backend was introduced.

INTENT: the checked-in GitHub Actions workflow runs clean install, TypeScript/tests/build, the production entitlement build matrix and a dependency audit, using read-only repository permissions. Its remote run must be checked separately from these local results.

## BLOCKERS / remaining release checks

- Independent real-browser rendering was blocked: Chromium/WebKit executables are absent and the browser binary download failed. No independent browser, CSP-in-browser, measured FPS, Android or iPhone pass is claimed. Claude's screenshots/browser evidence remain author-reported.
- Muse must run the phone release smoke checks: small/landscape menu panning, swipe/tap, keyboard focus, background auto-pause, restart, mute/iOS audio unlock, reduced motion, score persistence and production festival lock.
- Payments remain OFF. A real purchase path still needs an approved provider/price and implemented server-side purchase/session/webhook verification. This static V1 is not an implemented paid service; arbitrary local JavaScript modification cannot be prevented by a client-side app.
- Original Koinu art, Japanese/cultural review and token-address verification remain with their assigned seats/owner. The token remains labelled unverified with no buy link.
- No merge, deployment, payment activation, external spending or token transaction performed. Owner approval remains required for release.

NEXT ACTION: review this quality PR into `claude/koinu-game-v1`, rerun checks on the integrated revision, then let Muse complete the device gate. This review does not declare READY FOR OWNER DEPLOY.
