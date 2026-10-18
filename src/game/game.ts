import { MAX_EXTRA_VIEW, VIEW_H, VIEW_W } from './config';
import { Sfx } from './audio';
import { loadKoinuArt } from './assets';
import { Input, type Action } from './input';
import { comboPhrase, PHRASES, SUSHI_NAMES } from './phrases';
import { Renderer } from './renderer';
import { HighScores, Settings, browserStore } from './storage';
import { World, type GameMode } from './world';
import { COSTUMES, isCostumeId, unlockedCostumes, type CostumeId } from '../premium/costumes';

export type Phase = 'menu' | 'countdown' | 'playing' | 'paused' | 'over';

const SUSHI_COLORS: Record<string, string[]> = {
  maguro: ['#ec5b5b', '#ffffff'],
  salmon: ['#ff9a62', '#ffe1cc'],
  tamago: ['#ffd65c', '#ffffff'],
  maki: ['#2f4a2e', '#ff8fa3'],
  ikura: ['#ff7b2e', '#ffd36b'],
  golden: ['#ffcf3f', '#fff4b8', '#ffffff'],
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  html = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (html) node.innerHTML = html;
  return node;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export interface GameHostOptions {
  /** Returns true only if the festival is entitled (server or dev preview). */
  canPlayFestival: () => boolean;
  festivalLabel: () => string;
}

/**
 * Owns the full-screen game dialog: canvas, HUD buttons and DOM menus.
 * The simulation lives in World; rendering in Renderer; this class wires state transitions.
 */
export class GameHost {
  private readonly root: HTMLElement;
  private readonly frame: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly panel: HTMLElement;
  private readonly live: HTMLElement;
  private readonly pauseBtn: HTMLButtonElement;
  private readonly muteBtn: HTMLButtonElement;
  private readonly renderer: Renderer;
  private readonly input: Input;
  private readonly sfx: Sfx;
  private readonly scores = new HighScores(browserStore());
  private readonly settings = new Settings(browserStore());

  private world: World;
  private mode: GameMode = 'free';
  private phase: Phase = 'menu';
  private countdownLeft = 0;
  private raf = 0;
  private last = 0;
  private open = false;
  private returnFocus: HTMLElement | null = null;
  private fireworkTimer = 0;

  constructor(private readonly opts: GameHostOptions) {
    this.root = el('div', {
      class: 'game-shell',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Koinu Korokoro game',
      hidden: '',
    });
    this.frame = el('div', { class: 'game-frame' });
    this.canvas = el('canvas', {
      class: 'game-canvas',
      'aria-label': 'Game field. Swipe or use arrow keys to roll, tap or press space to hop.',
      role: 'img',
      tabindex: '-1',
    });
    const bar = el('div', { class: 'game-buttons' });
    this.pauseBtn = el('button', { class: 'gbtn', type: 'button', 'aria-label': 'Pause' }, '<span aria-hidden="true">Ⅱ</span>');
    this.muteBtn = el('button', { class: 'gbtn', type: 'button', 'aria-label': 'Mute sound' });
    const closeBtn = el('button', { class: 'gbtn', type: 'button', 'aria-label': 'Close game' }, '<span aria-hidden="true">✕</span>');
    bar.append(this.pauseBtn, this.muteBtn, closeBtn);
    this.panel = el('div', { class: 'game-panel' });
    this.live = el('div', { class: 'sr-only', 'aria-live': 'polite' });
    this.frame.append(this.canvas, bar, this.panel, this.live);
    this.root.append(this.frame);
    document.body.append(this.root);

    this.renderer = new Renderer(this.canvas);
    this.sfx = new Sfx(this.settings.muted);
    this.input = new Input(this.canvas, this.root);
    this.input.on((a) => this.onAction(a));
    this.world = new World({ mode: 'free' });

    this.pauseBtn.addEventListener('click', () => {
      if (this.phase === 'playing' || this.phase === 'countdown') this.pause();
      else if (this.phase === 'paused') this.resume();
    });
    this.muteBtn.addEventListener('click', () => this.toggleMute());
    closeBtn.addEventListener('click', () => this.close());
    this.updateMuteBtn();

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.renderer.setReducedMotion(mq.matches);
    mq.addEventListener?.('change', (e) => this.renderer.setReducedMotion(e.matches));

    window.addEventListener('resize', () => this.fit());
    window.visualViewport?.addEventListener('resize', () => this.fit());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && (this.phase === 'playing' || this.phase === 'countdown')) this.pause();
    });
    this.root.addEventListener('keydown', (e) => this.trapFocus(e));
  }

  get isOpen(): boolean {
    return this.open;
  }

  openGame(mode: GameMode): void {
    if (mode === 'festival' && !this.opts.canPlayFestival()) mode = 'free';
    this.mode = mode;
    this.returnFocus = document.activeElement as HTMLElement | null;
    this.root.hidden = false;
    this.open = true;
    document.documentElement.classList.add('game-open');
    this.root.classList.toggle('night', mode === 'festival');
    this.renderer.setNight(mode === 'festival');
    this.sfx.night = mode === 'festival';
    this.renderer.costume = mode === 'festival' ? this.currentCostume() : 'none';
    this.renderer.koinuArt = loadKoinuArt();
    this.world = new World({ mode });
    this.renderer.clearEffects();
    this.fit();
    this.showMenu();
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame((t) => this.loop(t));
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    cancelAnimationFrame(this.raf);
    this.sfx.stopMusic();
    this.root.hidden = true;
    document.documentElement.classList.remove('game-open');
    if (location.hash === '#play-now' || location.hash === '#festival-play') {
      history.replaceState(null, '', location.pathname + location.search);
    }
    this.returnFocus?.focus?.();
  }

  // ---------- layout ----------

  private fit(): void {
    if (!this.open) return;
    const vw = window.visualViewport?.width ?? window.innerWidth;
    const vh = window.visualViewport?.height ?? window.innerHeight;
    // Tall phones get a taller logical view (more street) instead of letterboxing.
    const logicalH = Math.min(VIEW_H + MAX_EXTRA_VIEW, Math.max(VIEW_H, (VIEW_W * vh) / vw));
    const aspect = VIEW_W / logicalH;
    let w = vw;
    let h = vw / aspect;
    if (h > vh) {
      h = vh;
      w = vh * aspect;
    }
    w = Math.floor(w);
    h = Math.floor(h);
    this.frame.style.width = `${w}px`;
    this.frame.style.height = `${h}px`;
    this.frame.style.setProperty('--k', String(w / VIEW_W));
    this.renderer.resize(w, h, logicalH);
  }

  // ---------- loop ----------

  private loop(now: number): void {
    if (!this.open) return;
    let dt = Math.max(0, (now - this.last) / 1000);
    this.last = now;

    if (this.phase === 'countdown') {
      const remaining = this.countdownLeft;
      const before = Math.ceil(this.countdownLeft);
      this.countdownLeft -= dt;
      const after = Math.ceil(this.countdownLeft);
      this.renderer.countdown = this.countdownLeft;
      if (after !== before && after > 0) this.sfx.countdown(false);
      if (this.countdownLeft <= 0) {
        dt = Math.max(0, dt - remaining);
        this.renderer.countdown = null;
        this.phase = 'playing';
        this.sfx.countdown(true);
        this.renderer.showBanner(PHRASES.ready.jp, `${PHRASES.ready.romaji} — ${PHRASES.ready.en}`, 1.1);
        this.sfx.startMusic();
      }
    }

    if (this.phase === 'playing') {
      this.world.update(dt);
      this.handleEvents();
      if (this.mode === 'festival') {
        this.fireworkTimer -= dt;
        if (this.fireworkTimer <= 0) {
          this.renderer.firework();
          this.fireworkTimer = this.world.bonusActive ? 0.35 : 2.2 + Math.random() * 2;
        }
      }
      if (this.world.finished) this.gameOver();
    }

    this.renderer.render(this.world, Math.min(0.05, dt), this.phase === 'playing');
    this.raf = requestAnimationFrame((t) => this.loop(t));
  }

  private handleEvents(): void {
    const r = this.renderer;
    for (const ev of this.world.drainEvents()) {
      switch (ev.type) {
        case 'collect': {
          this.sfx.collect(ev.combo);
          if (ev.kind === 'golden') this.sfx.golden();
          r.burst(ev.x, ev.y, SUSHI_COLORS[ev.kind] ?? ['#fff'], ev.kind === 'golden' ? 16 : 8);
          const name = SUSHI_NAMES[ev.kind];
          r.popup(ev.x, ev.y - 10, `+${ev.points}`, ev.kind === 'golden' || ev.kind === 'ikura' ? name.jp : '', ev.kind === 'golden' ? '#d99a00' : '#e8507a');
          break;
        }
        case 'combo': {
          const ph = comboPhrase(ev.combo);
          r.showBanner(ph.jp, `${ph.romaji} — ${ph.en} ${ev.combo} in a row!`);
          this.sfx.fanfare();
          break;
        }
        case 'hit': {
          this.sfx.hit();
          r.hitFx();
          r.burst(ev.x, ev.y, ev.cause === 'wasabi' ? ['#8cc152', '#c5e1a5'] : ['#d79a62', '#fff6e8'], 12, 'puff', 90);
          const ph = ev.cause === 'wasabi' ? PHRASES.karai : PHRASES.itai;
          r.popup(this.world.player.x, 470, ph.jp, `${ph.romaji} ${ph.en}${ev.lost ? `  −${ev.lost}` : ''}`, '#e8504a', true);
          break;
        }
        case 'jump':
          this.sfx.jump();
          break;
        case 'land':
          r.burst(this.world.player.x, 545, ['rgba(255,255,255,0.8)'], 5, 'puff', 50);
          break;
        case 'lane':
          this.sfx.lane();
          break;
        case 'powerup': {
          this.sfx.powerup();
          const ph = ev.power === 'magnet' ? PHRASES.suzu : PHRASES.jikan;
          r.popup(ev.x, ev.y - 10, ph.jp, ph.en, '#d99a00', true);
          r.burst(ev.x, ev.y, ['#ffd36b', '#ffffff'], 14, 'star');
          break;
        }
        case 'bonusStart':
          r.showBanner('ボーナス！', `Bonus stage — ${PHRASES.matsuri.en}`, 1.8);
          this.sfx.fanfare();
          this.announce('Bonus stage! Golden sushi everywhere.');
          break;
        case 'bonusEnd':
          r.showBanner('おしまい', 'Bonus over — watch out!', 1.0);
          break;
        case 'poof':
          r.burst(ev.x, ev.y, ['#ffffff', '#ffc1d3'], 8, 'puff', 70);
          break;
        case 'timeUp':
          break;
      }
    }
  }

  // ---------- input / state ----------

  private onAction(a: Action): void {
    if (!this.open) return;
    if (a === 'mute') return this.toggleMute();
    if (a === 'pause') {
      if (this.phase === 'playing' || this.phase === 'countdown') this.pause();
      else if (this.phase === 'paused') this.resume();
      else if (this.phase === 'menu') this.close();
      return;
    }
    if (a === 'confirm') {
      if (this.phase === 'menu' || this.phase === 'over') this.start();
      else if (this.phase === 'paused') this.resume();
      return;
    }
    if (this.phase !== 'playing') return;
    if (a === 'left') this.world.moveLane(-1);
    else if (a === 'right') this.world.moveLane(1);
    else if (a === 'jump') this.world.jump();
  }

  private start(): void {
    this.sfx.unlock();
    this.sfx.stopMusic();
    this.world = new World({ mode: this.mode });
    this.renderer.costume = this.mode === 'festival' ? this.currentCostume() : 'none';
    this.renderer.clearEffects();
    this.settings.tutorialSeen = true;
    this.hidePanel();
    this.phase = 'countdown';
    this.countdownLeft = 3;
    this.renderer.countdown = this.countdownLeft;
    this.fireworkTimer = 0.5;
    this.sfx.countdown(false);
    this.pauseBtn.disabled = false;
    this.pauseBtn.setAttribute('aria-label', 'Pause');
    this.pauseBtn.innerHTML = '<span aria-hidden="true">Ⅱ</span>';
    this.canvas.focus?.();
    this.announce(this.mode === 'festival' ? 'Sakura Night Festival starting' : 'Run starting in 3 seconds');
  }

  private pause(): void {
    if (this.phase !== 'playing' && this.phase !== 'countdown') return;
    this.phase = 'paused';
    this.renderer.countdown = null;
    this.sfx.stopMusic();
    this.pauseBtn.setAttribute('aria-label', 'Resume');
    this.pauseBtn.innerHTML = '<span aria-hidden="true">▶</span>';
    this.showPanel(`
      <div class="gp-card">
        <p class="gp-jp">${PHRASES.pause.jp}</p>
        <h2 class="gp-title">${PHRASES.pause.romaji} — Paused</h2>
        <div class="gp-actions">
          <button type="button" class="btn btn-primary" data-act="resume">Resume</button>
          <button type="button" class="btn btn-ghost" data-act="restart">Restart</button>
          <button type="button" class="btn btn-ghost" data-act="quit">Quit to menu</button>
        </div>
      </div>`);
    this.announce('Paused');
  }

  private resume(): void {
    if (this.phase !== 'paused') return;
    this.hidePanel();
    this.pauseBtn.setAttribute('aria-label', 'Pause');
    this.pauseBtn.innerHTML = '<span aria-hidden="true">Ⅱ</span>';
    this.sfx.unlock();
    // Short countdown so the player isn't hit the instant play resumes.
    this.phase = 'countdown';
    this.countdownLeft = this.world.elapsed > 0 ? 1.5 : 3;
    this.last = performance.now();
    this.canvas.focus?.();
  }

  private gameOver(): void {
    this.phase = 'over';
    this.sfx.stopMusic();
    this.sfx.gameOver();
    this.pauseBtn.disabled = true;
    const s = this.world.score;
    const prevBest = this.scores.best(this.mode);
    const prevUnlocked = this.mode === 'festival' ? unlockedCostumes(prevBest) : [];
    const rank = this.scores.submit(this.mode, {
      score: s.score,
      sushi: s.sushi,
      maxCombo: s.maxCombo,
      date: new Date().toISOString().slice(0, 10),
    });
    const isBest = s.score > prevBest && s.score > 0;
    let unlockedMsg = '';
    if (this.mode === 'festival') {
      const nowUnlocked = unlockedCostumes(this.scores.best('festival'));
      const fresh = nowUnlocked.filter((c) => !prevUnlocked.includes(c));
      if (fresh.length) {
        const names = fresh.map((id) => COSTUMES.find((c) => c.id === id)).filter(Boolean);
        unlockedMsg = `<p class="gp-unlock">🎀 New costume: ${names.map((c) => `${c!.jp} ${escapeHtml(c!.name)}`).join(', ')}</p>`;
      }
    }
    const list = this.scores
      .list(this.mode)
      .map(
        (h, i) =>
          `<li${i + 1 === rank ? ' class="me"' : ''}><span>${i + 1}.</span><b>${h.score.toLocaleString('en-US')}</b><small>${h.sushi} 🍣 · ×${h.maxCombo} · ${escapeHtml(h.date)}</small></li>`,
      )
      .join('');
    this.showPanel(`
      <div class="gp-card">
        <p class="gp-jp">${PHRASES.otsukare.jp}</p>
        <h2 class="gp-title">${PHRASES.otsukare.romaji} — ${PHRASES.otsukare.en}</h2>
        ${isBest ? '<p class="gp-best">✨ New high score! しんきろく！</p>' : ''}
        <div class="gp-stats">
          <div><span>Score</span><b>${s.score.toLocaleString('en-US')}</b></div>
          <div><span>Sushi</span><b>${s.sushi}</b></div>
          <div><span>Best combo</span><b>${s.maxCombo}</b></div>
        </div>
        ${unlockedMsg}
        <h3 class="gp-sub">${this.mode === 'festival' ? 'Festival' : 'Free play'} high scores <small>(this device)</small></h3>
        <ol class="gp-scores">${list || '<li>No scores yet</li>'}</ol>
        <div class="gp-actions">
          <button type="button" class="btn btn-primary" data-act="start">Play again</button>
          <button type="button" class="btn btn-ghost" data-act="menu">Menu</button>
          <button type="button" class="btn btn-ghost" data-act="close">Back to shop</button>
        </div>
      </div>`);
    this.announce(`Time up! Score ${s.score}. ${isBest ? 'New high score!' : ''}`);
  }

  private showMenu(): void {
    this.phase = 'menu';
    this.renderer.countdown = null;
    this.sfx.stopMusic();
    this.pauseBtn.disabled = true;
    const festival = this.mode === 'festival';
    const best = this.scores.best(this.mode);
    const costumePicker = festival ? this.costumePickerHtml() : '';
    this.showPanel(`
      <div class="gp-card">
        <p class="gp-mode">${festival ? '🏮 夜桜まつり · Sakura Night Festival' : '🌸 Free play · むりょう'}</p>
        <h2 class="gp-logo">こいぬコロコロ！<span>Koinu Korokoro!</span></h2>
        ${festival ? `<p class="gp-note">${escapeHtml(this.opts.festivalLabel())}</p>` : ''}
        <ol class="gp-howto">
          <li><span class="k">← →</span><span><b>Swipe</b> left or right to roll between lanes</span></li>
          <li><span class="k">↑</span><span><b>Tap</b> or swipe up to hop over wasabi &amp; crates</span></li>
          <li><span class="k">🍣</span><span>Grab sushi in a row to build combos, up to <b>×4</b>!</span></li>
          <li><span class="k">🏮</span><span>Yatai carts are too tall to hop over. <b>Change lanes!</b></span></li>
          ${festival ? '<li><span class="k">🎆</span><span>Golden sushi rains down in two bonus stages</span></li>' : ''}
        </ol>
        ${costumePicker}
        <p class="gp-best-line">Best: <b>${best.toLocaleString('en-US')}</b> · 60-second run · <span class="kbd-hint">Keys: ←/→ A/D move · Space/↑ hop · P pause · M mute</span></p>
        <div class="gp-actions">
          <button type="button" class="btn btn-primary btn-big" data-act="start">はじめる！ Start!</button>
          <button type="button" class="btn btn-ghost" data-act="close">Back to shop</button>
        </div>
      </div>`);
  }

  private costumePickerHtml(): string {
    const best = this.scores.best('festival');
    const unlocked = unlockedCostumes(best);
    const current = this.currentCostume();
    const items = COSTUMES.map((c) => {
      const open = unlocked.includes(c.id);
      return `<button type="button" class="costume${c.id === current ? ' on' : ''}" data-costume="${c.id}" ${open ? '' : 'disabled'} aria-pressed="${c.id === current}">
          <span class="cj">${c.jp}</span><span class="ce">${escapeHtml(c.name)}</span>${open ? '' : `<span class="cl">🔒 ${c.unlockScore.toLocaleString('en-US')}</span>`}
        </button>`;
    }).join('');
    return `<fieldset class="gp-costumes"><legend>Costume (cosmetic only)</legend><div class="costume-grid">${items}</div></fieldset>`;
  }

  private currentCostume(): CostumeId {
    const saved = this.settings.costume;
    const unlocked = unlockedCostumes(this.scores.best('festival'));
    return isCostumeId(saved) && unlocked.includes(saved) ? saved : 'hachimaki';
  }

  private showPanel(html: string): void {
    this.panel.innerHTML = html;
    this.panel.hidden = false;
    this.panel.querySelectorAll<HTMLButtonElement>('[data-act]').forEach((b) =>
      b.addEventListener('click', () => {
        this.sfx.unlock();
        switch (b.dataset.act) {
          case 'start':
          case 'restart':
            this.start();
            break;
          case 'resume':
            this.resume();
            break;
          case 'menu':
          case 'quit':
            this.world = new World({ mode: this.mode });
            this.renderer.clearEffects();
            this.pauseBtn.setAttribute('aria-label', 'Pause');
            this.pauseBtn.innerHTML = '<span aria-hidden="true">Ⅱ</span>';
            this.showMenu();
            break;
          case 'close':
            this.close();
            break;
        }
      }),
    );
    this.panel.querySelectorAll<HTMLButtonElement>('[data-costume]').forEach((b) =>
      b.addEventListener('click', () => {
        const id = b.dataset.costume ?? 'none';
        if (!isCostumeId(id)) return;
        this.settings.costume = id;
        this.renderer.costume = id;
        this.panel.querySelectorAll('[data-costume]').forEach((o) => {
          o.classList.toggle('on', o === b);
          o.setAttribute('aria-pressed', String(o === b));
        });
      }),
    );
    const first = this.panel.querySelector<HTMLElement>('[data-act]');
    first?.focus();
  }

  private hidePanel(): void {
    this.panel.hidden = true;
    this.panel.innerHTML = '';
  }

  private toggleMute(): void {
    this.sfx.unlock();
    const m = !this.sfx.muted;
    this.sfx.setMuted(m);
    this.settings.muted = m;
    this.updateMuteBtn();
  }

  private updateMuteBtn(): void {
    const m = this.sfx.muted;
    this.muteBtn.setAttribute('aria-label', m ? 'Unmute sound' : 'Mute sound');
    this.muteBtn.setAttribute('aria-pressed', String(m));
    this.muteBtn.innerHTML = `<span aria-hidden="true">${m ? '🔇' : '🔊'}</span>`;
  }

  private announce(msg: string): void {
    this.live.textContent = '';
    window.setTimeout(() => (this.live.textContent = msg), 30);
  }

  private trapFocus(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;
    const focusables = Array.from(
      this.root.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'),
    ).filter((n) => n.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    if (!focusables.includes(document.activeElement as HTMLElement)) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}
