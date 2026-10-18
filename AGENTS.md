# Agents — Nori-chan × Koinu V1

Source of truth: control room issue #1. Each seat owns one area; post **BUILT / VERIFIED / BLOCKED / NEXT** on its issue.

| Seat | Owns | Branch / output | Issue |
| --- | --- | --- | --- |
| Claude | Game + website code | `claude/koinu-game-v1` → PR #6 | #1, #5 |
| Codex | Independent QA, tests, CI | `codex/quality-v1` (PR into `claude/koinu-game-v1`) | #2 |
| Grok | Japanese language + cultural review (no code) | Comments on #3 | #3 |
| Muse | Integration + GO/NO-GO release gate | Comments on #4 | #4 |
| Sneaks (owner) | Merge, deploy, payments, token claims | — | — |

## Rules

- Never commit to `main`. No merge, production deploy, payment activation, spending or token transaction without owner approval.
- Don't push to another seat's branch. Propose changes as a PR into it or as an issue comment.
- Report real commands and results only.
- No "first ever", "official" or partnership claims about KOINU (see #5). $SUSHI has no published mint; the `DfBJ…pump` address is a KOINU reference only, never $SUSHI. No buy links.

## Where things live

- Japanese UI strings: `src/game/phrases.ts`, the menus in `src/game/game.ts`, `index.html`, and `src/premium/costumes.ts`.
- Payments / entitlement interface: `src/premium/entitlements.ts`. Payments are off.
- Tuning constants: `src/game/config.ts`.
- Checks: `npm run check` (typecheck + tests + build).
