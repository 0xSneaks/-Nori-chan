import './styles.css';
import { GameHost } from './game/game';
import { HighScores, browserStore } from './game/storage';
import { drawBell, drawCart, drawClock, drawCrate, drawKoinu, drawSushi, drawWasabi } from './game/sprites';
import type { SushiKind } from './game/config';
import { loadKoinuArt } from './game/assets';
import { createEntitlements, type EntitlementStatus } from './premium/entitlements';
import { startSakura } from './site/sakura';

const provider = createEntitlements(__PREMIUM_DEV_PREVIEW__);
let festival: EntitlementStatus = { festival: false, source: 'none', reason: '' };

const sakuraCanvas = document.getElementById('sakura');
const sakura = sakuraCanvas instanceof HTMLCanvasElement ? startSakura(sakuraCanvas) : null;

const game = new GameHost({
  canPlayFestival: () => festival.festival,
  festivalLabel: () =>
    festival.source === 'dev-preview' ? 'DEV PREVIEW — festival unlocked for testing. No purchase was made.' : '',
});

function openGame(mode: 'free' | 'festival'): void {
  sakura?.setPaused(true);
  game.openGame(mode);
}

// Resume the background when the dialog closes.
new MutationObserver(() => {
  if (!game.isOpen) {
    sakura?.setPaused(false);
    renderBest();
  }
}).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

document.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-play]');
  if (!target) return;
  const mode = target.dataset.play === 'festival' ? 'festival' : 'free';
  openGame(mode);
});

// Copy token address
document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const src = document.querySelector(btn.dataset.copy ?? '');
    const text = src?.textContent?.trim() ?? '';
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Copied!';
    } catch {
      const range = document.createRange();
      if (src) range.selectNodeContents(src);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      btn.textContent = 'Selected';
    }
    window.setTimeout(() => (btn.textContent = 'Copy'), 1600);
  });
});

// Best scores on the page
const scores = new HighScores(browserStore());
function renderBest(): void {
  document.querySelectorAll<HTMLElement>('[data-best]').forEach((n) => {
    const mode = n.dataset.best === 'festival' ? 'festival' : 'free';
    const best = scores.best(mode);
    n.textContent = best > 0 ? `Your best: ${best.toLocaleString('en-US')} 🍣` : '';
  });
}
renderBest();

// Item icons drawn with the same sprites the game uses
function paintIcons(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  document.querySelectorAll<HTMLCanvasElement>('canvas[data-icon]').forEach((c) => {
    // The width attribute becomes the backing-store size after the first paint.
    const size = Number(c.dataset.iconSize ?? c.getAttribute('width')) || 56;
    c.dataset.iconSize = String(size);
    c.style.width = `${size}px`;
    c.style.height = `${size}px`;
    c.width = size * dpr;
    c.height = size * dpr;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const icon = c.dataset.icon ?? '';
    const s = size / 56;
    ctx.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);
    switch (icon) {
      case 'wasabi':
        drawWasabi(ctx, 28, 32, 0.3);
        break;
      case 'crate':
        ctx.translate(28, 28);
        ctx.scale(0.85, 0.85);
        drawCrate(ctx, 0, 0);
        break;
      case 'cart':
        ctx.translate(28, 34);
        ctx.scale(0.5, 0.5);
        drawCart(ctx, 0, 0, 0, false);
        break;
      case 'bell':
        drawBell(ctx, 28, 30, 0.2);
        break;
      case 'clock':
        drawClock(ctx, 26, 30, 0);
        break;
      case 'koinu':
        drawKoinu(ctx, 28, 36, { t: 0, roll: 0, z: 0, stunned: false, jumping: false, costume: 'none', art: loadKoinuArt() }, 0.8);
        break;
      default:
        drawSushi(ctx, icon as SushiKind, 28, 30, 0.4);
    }
  });
}
document.fonts?.ready.then(paintIcons).catch(paintIcons);
// Repaint the Koinu icon once the original art has loaded.
loadKoinuArt(paintIcons);
paintIcons();

// Festival status
function renderFestival(): void {
  const status = document.querySelector<HTMLElement>('[data-fest-status]');
  const actions = document.querySelector<HTMLElement>('[data-fest-actions]');
  const why = document.querySelector<HTMLElement>('[data-fest-why]');
  if (!status || !actions || !why) return;
  if (festival.festival && festival.source === 'dev-preview') {
    status.innerHTML = '<span class="chip chip-dev">DEV PREVIEW · not a purchase · payments off</span>';
    actions.innerHTML =
      '<button type="button" class="btn btn-night btn-big" data-play="festival">🏮 Play festival (dev preview)</button><p class="best" data-best="festival"></p>';
    why.textContent =
      'This build has the development preview enabled. Production builds keep the festival locked until a server-verified purchase exists.';
    renderBest();
  } else if (festival.festival && festival.source === 'server') {
    status.innerHTML = '<span class="chip chip-ok">Unlocked</span>';
    actions.innerHTML = '<button type="button" class="btn btn-night btn-big" data-play="festival">🏮 Play festival</button>';
  } else {
    status.innerHTML = '<span class="chip chip-wait">Coming soon</span>';
    actions.innerHTML =
      '<button type="button" class="btn btn-night" disabled aria-describedby="fest-why">🔒 Unlock festival</button>';
    why.textContent = 'The festival isn’t available yet. We’ll announce it here when it is.';
  }
}

void provider.getStatus().then((s) => {
  festival = s;
  renderFestival();
  handleHash();
});

function handleHash(): void {
  if (location.hash === '#play-now') openGame('free');
  if (location.hash === '#festival-play' && festival.festival) openGame('festival');
}
window.addEventListener('hashchange', handleHash);
