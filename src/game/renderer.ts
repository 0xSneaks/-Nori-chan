import {
  COMBO_WINDOW,
  JUMP_CLEAR_Z,
  LANE_X,
  PLAYER_Y,
  STREET_LEFT,
  STREET_RIGHT,
  VIEW_H,
  VIEW_W,
} from './config';
import type { CostumeId } from '../premium/costumes';
import {
  drawBell,
  drawBlossom,
  drawCart,
  drawClock,
  drawCrate,
  drawKoinu,
  drawLantern,
  drawPetal,
  drawSparkle,
  drawSushi,
  drawWasabi,
  INK,
} from './sprites';
import { multiplierFor } from './scoring';
import { preloadSprites, sprite, type SpriteKey } from './assets';
import type { World } from './world';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  kind: 'petal' | 'spark' | 'puff' | 'star';
  /** Petals that belong to the ambient layer wrap instead of dying. */
  ambient: boolean;
}

interface Popup {
  x: number;
  y: number;
  text: string;
  sub: string;
  color: string;
  life: number;
  max: number;
  big: boolean;
}

interface Banner {
  jp: string;
  en: string;
  life: number;
  max: number;
}

const FONT_JP = '"Zen Maru Gothic", "M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif';
const FONT_UI = '"M PLUS Rounded 1c", "Zen Maru Gothic", system-ui, sans-serif';

const DAY = {
  street: '#f6e6cc',
  streetEdge: '#e9d2ae',
  stone: '#e7cfa8',
  walls: ['#ffd6e0', '#cfe5bf', '#fff1d6', '#ffe0c2'],
  roof: '#5d6e8c',
  noren: ['#e8504a', '#3f6fb5', '#6a9a4f', '#ff8fab'],
  petal: ['#ffc1d3', '#ffb0c8', '#ffd9e4'],
};
const NIGHT = {
  street: '#3a3159',
  streetEdge: '#2e2648',
  stone: '#463c6b',
  walls: ['#5b4a7a', '#47577a', '#6b4a6e', '#4c4a7a'],
  roof: '#22203a',
  noren: ['#ff6b57', '#ffb3c7', '#ffd36b', '#7fd0c8'],
  petal: ['#ffc1d3', '#ffd9e4', '#fff0f5'],
};

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private popups: Popup[] = [];
  private banner: Banner | null = null;
  private shake = 0;
  private flash = 0;
  private time = 0;
  private dpr = 1;
  private scale = 1;
  /** Logical view height (>= VIEW_H). Extra height shows more street above the field. */
  private viewH = VIEW_H;
  night = false;
  reducedMotion = false;
  costume: CostumeId = 'none';
  koinuArt: HTMLImageElement | null = null;
  /** 3,2,1,0 during countdown; null otherwise. */
  countdown: number | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D not supported');
    this.ctx = ctx;
    preloadSprites();
    this.seedAmbient();
  }

  /** Fit the canvas to its CSS box at device resolution (DPR capped at 2 for perf). */
  resize(cssW: number, cssH: number, logicalH: number): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(cssW * this.dpr);
    this.canvas.height = Math.round(cssH * this.dpr);
    this.scale = cssW / VIEW_W;
    this.viewH = Math.max(VIEW_H, logicalH);
  }

  private get extra(): number {
    return this.viewH - VIEW_H;
  }

  private seedAmbient(): void {
    this.particles = this.particles.filter((p) => !p.ambient);
    const count = this.reducedMotion ? 6 : 18;
    for (let i = 0; i < count; i++) this.particles.push(this.makePetal(Math.random() * this.viewH - this.extra));
  }

  setReducedMotion(v: boolean): void {
    this.reducedMotion = v;
    this.seedAmbient();
  }

  private makePetal(y: number): Particle {
    const pal = this.night ? NIGHT.petal : DAY.petal;
    return {
      x: Math.random() * VIEW_W,
      y,
      vx: -10 + Math.random() * 25,
      vy: 25 + Math.random() * 30,
      life: 1,
      max: 1,
      size: 3 + Math.random() * 3,
      rot: Math.random() * Math.PI * 2,
      vr: -2 + Math.random() * 4,
      color: pal[Math.floor(Math.random() * pal.length)] ?? '#ffc1d3',
      kind: 'petal',
      ambient: true,
    };
  }

  // ---------- effects API (driven by world events) ----------

  burst(x: number, y: number, colors: string[], n: number, kind: Particle['kind'] = 'spark', speed = 140): void {
    if (this.reducedMotion) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 40,
        life: 0.5 + Math.random() * 0.4,
        max: 0.9,
        size: kind === 'puff' ? 6 + Math.random() * 6 : 2.5 + Math.random() * 3,
        rot: Math.random() * 6,
        vr: -6 + Math.random() * 12,
        color: colors[i % colors.length] ?? '#fff',
        kind,
        ambient: false,
      });
    }
    if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
  }

  firework(): void {
    const x = 60 + Math.random() * (VIEW_W - 120);
    const y = 90 + Math.random() * 160;
    const palette = ['#ffd36b', '#ff8fab', '#7fd0c8', '#ffffff', '#ff6b57'];
    const c = palette[Math.floor(Math.random() * palette.length)] ?? '#fff';
    this.burst(x, y, [c, '#ffffff'], 26, 'star', 170);
  }

  popup(x: number, y: number, text: string, sub = '', color = INK, big = false): void {
    this.popups.push({ x, y, text, sub, color, life: big ? 1.2 : 0.8, max: big ? 1.2 : 0.8, big });
    if (this.popups.length > 14) this.popups.shift();
  }

  showBanner(jp: string, en: string, seconds = 1.4): void {
    this.banner = { jp, en, life: seconds, max: seconds };
  }

  hitFx(): void {
    if (!this.reducedMotion) this.shake = 0.25;
    this.flash = 0.18;
  }

  clearEffects(): void {
    this.particles = this.particles.filter((p) => p.ambient);
    this.popups = [];
    this.banner = null;
    this.shake = 0;
    this.flash = 0;
  }

  setNight(n: boolean): void {
    if (this.night === n) return;
    this.night = n;
    this.seedAmbient();
  }

  // ---------- frame ----------

  render(world: World, dt: number, live: boolean): void {
    this.time += dt;
    this.step(dt);
    const ctx = this.ctx;
    const k = this.scale * this.dpr;
    let sx = 0;
    let sy = 0;
    if (this.shake > 0) {
      this.shake -= dt;
      sx = (Math.random() - 0.5) * 8;
      sy = (Math.random() - 0.5) * 8;
    }
    // World layer: shifted down so the standard field sits at the bottom of tall screens.
    ctx.setTransform(k, 0, 0, k, sx * k, (sy + this.extra) * k);

    const pal = this.night ? NIGHT : DAY;
    this.drawStreet(world, pal);
    this.drawShops(world, pal, 'left');
    this.drawShops(world, pal, 'right');
    if (world.bonusActive) this.drawBonusGlow();
    this.drawEntities(world);
    this.drawPlayer(world);
    this.drawParticles();
    this.drawPopups(dt);
    // Screen layer (HUD, banners) anchored to the real top of the view.
    ctx.setTransform(k, 0, 0, k, 0, 0);
    this.drawHud(world, live);
    this.drawBanner(dt);
    this.drawCountdown();

    if (this.flash > 0) {
      this.flash -= dt;
      ctx.fillStyle = `rgba(255, 120, 140, ${Math.max(0, this.flash) * 1.6})`;
      ctx.fillRect(-10, -10, VIEW_W + 20, this.viewH + 20);
    }
  }

  private step(dt: number): void {
    const keep: Particle[] = [];
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.ambient) {
        p.x += Math.sin(this.time * 1.3 + p.rot) * 8 * dt;
        if (p.y > VIEW_H + 10) {
          Object.assign(p, this.makePetal(-this.extra - 10));
        }
        if (p.x < -10) p.x = VIEW_W + 10;
        if (p.x > VIEW_W + 10) p.x = -10;
        keep.push(p);
        continue;
      }
      p.vy += (p.kind === 'puff' ? -20 : 220) * dt;
      p.life -= dt;
      if (p.life > 0) keep.push(p);
    }
    this.particles = keep;
  }

  private drawStreet(world: World, pal: typeof DAY): void {
    const ctx = this.ctx;
    const top = -this.extra - 20;
    const fullH = this.viewH + 40;
    ctx.fillStyle = pal.street;
    ctx.fillRect(0, top, VIEW_W, fullH);
    ctx.fillStyle = pal.streetEdge;
    ctx.fillRect(STREET_LEFT, top, 6, fullH);
    ctx.fillRect(STREET_RIGHT - 6, top, 6, fullH);

    // Stepping stones on lane dividers, scrolling with distance.
    const spacing = 46;
    const off = world.distance % spacing;
    ctx.fillStyle = pal.stone;
    for (const lx of [135, 225]) {
      for (let y = -spacing + off - Math.ceil(this.extra / spacing) * spacing; y < VIEW_H + spacing; y += spacing) {
        ctx.beginPath();
        ctx.ellipse(lx, y, 7, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Faint lane centers dotted with tiny blossoms for texture.
    const tOff = world.distance % 160;
    for (const lx of LANE_X) {
      for (let y = -160 + tOff - Math.ceil(this.extra / 160) * 160; y < VIEW_H + 160; y += 160) {
        drawBlossom(ctx, lx + ((y * 7) % 30) - 15, y + 40, 3, this.night ? 'rgba(255,193,211,0.25)' : 'rgba(255,170,195,0.35)');
      }
    }
  }

  private drawShops(world: World, pal: typeof DAY, side: 'left' | 'right'): void {
    const ctx = this.ctx;
    const seg = 170;
    const off = world.distance % seg;
    const baseIdx = Math.floor(world.distance / seg);
    const x0 = side === 'left' ? 0 : STREET_RIGHT;
    const w = STREET_LEFT;
    const above = Math.ceil(this.extra / seg) + 1;
    for (let i = -above; i <= Math.ceil(VIEW_H / seg) + 1; i++) {
      const y = i * seg + off - seg;
      const idx = baseIdx - i + (side === 'left' ? 0 : 7);
      const wall = pal.walls[((idx % 4) + 4) % 4] ?? '#fff';
      const noren = pal.noren[((idx * 3) % 4 + 4) % 4] ?? '#e8504a';
      ctx.fillStyle = wall;
      ctx.fillRect(x0, y, w, seg);
      ctx.strokeStyle = 'rgba(74,48,54,0.25)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x0 + 0.75, y + 0.75, w - 1.5, seg - 1.5);
      // roof tiles edge (facing street)
      const ex = side === 'left' ? w - 10 : x0;
      ctx.fillStyle = pal.roof;
      ctx.fillRect(ex, y, 10, seg);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      for (let ty = y; ty < y + seg; ty += 12) ctx.fillRect(ex, ty, 10, 2);
      // noren curtain panels
      const nx = side === 'left' ? w - 24 : x0 + 10;
      ctx.fillStyle = noren;
      ctx.fillRect(nx, y + 40, 14, 56);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(nx, y + 66, 14, 2);
      drawBlossom(ctx, nx + 7, y + 54, 3.4, 'rgba(255,255,255,0.85)');
      // hanging lantern
      drawLantern(ctx, side === 'left' ? w - 8 : x0 + 8, y + 128, 0.55, this.time, this.night);
      // window
      ctx.fillStyle = this.night ? 'rgba(255, 214, 140, 0.85)' : 'rgba(255,255,255,0.7)';
      const wx = side === 'left' ? 6 : x0 + 22;
      ctx.fillRect(wx, y + 112, 14, 16);
      ctx.strokeStyle = 'rgba(74,48,54,0.4)';
      ctx.strokeRect(wx, y + 112, 14, 16);
      ctx.beginPath();
      ctx.moveTo(wx + 7, y + 112);
      ctx.lineTo(wx + 7, y + 128);
      ctx.stroke();
    }
  }

  private drawBonusGlow(): void {
    const ctx = this.ctx;
    const a = 0.12 + Math.sin(this.time * 6) * 0.05;
    ctx.fillStyle = `rgba(255, 211, 107, ${a})`;
    ctx.fillRect(STREET_LEFT, -this.extra, STREET_RIGHT - STREET_LEFT, this.viewH);
  }

  private drawEntities(world: World): void {
    const ctx = this.ctx;
    const t = this.time;
    // Draw back-to-front so taller things overlap correctly.
    const list = world.entities.filter((e) => e.active && e.y > -this.extra - 90 && e.y < VIEW_H + 90);
    list.sort((a, b) => a.y - b.y);
    for (const e of list) {
      const bob = Math.sin(t * 4 + e.phase) * 2;
      switch (e.kind) {
        case 'sushi':
          ctx.fillStyle = 'rgba(74,48,54,0.12)';
          ctx.beginPath();
          ctx.ellipse(e.x, e.y + 14, 13, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          if (!this.img(`sushi-${e.sushi}` as SpriteKey, e.x, e.y + bob, e.sushi === 'golden' ? 52 : 40)) {
            drawSushi(ctx, e.sushi, e.x, e.y + bob, t + e.phase);
          }
          break;
        case 'wasabi':
          drawWasabi(ctx, e.x, e.y, t + e.phase);
          break;
        case 'crate':
          if (!this.img('crate', e.x, e.y + 2, 60)) drawCrate(ctx, e.x, e.y);
          break;
        case 'cart':
          drawCart(ctx, e.x, e.y, t, this.night);
          break;
        case 'bell':
          if (!this.img('bell', e.x, e.y + bob, 46, Math.sin(t * 7) * 0.2)) drawBell(ctx, e.x, e.y + bob, t);
          break;
        case 'clock':
          if (!this.img('clock', e.x, e.y + Math.sin(t * 5) * 2, 40)) drawClock(ctx, e.x, e.y, t);
          break;
      }
    }
  }

  /** Draw a pack sprite centered at (x, y), `size` px square. Returns false if not loaded yet. */
  private img(key: SpriteKey, x: number, y: number, size: number, rot = 0): boolean {
    const im = sprite(key);
    if (!im) return false;
    const ctx = this.ctx;
    if (rot) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.drawImage(im, -size / 2, -size / 2, size, size);
      ctx.restore();
    } else {
      ctx.drawImage(im, x - size / 2, y - size / 2, size, size);
    }
    return true;
  }

  private drawPlayer(world: World): void {
    const ctx = this.ctx;
    const p = world.player;
    if (p.magnet > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(255, 201, 60, ${0.25 + Math.sin(this.time * 10) * 0.1})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 8]);
      ctx.lineDashOffset = -this.time * 40;
      ctx.beginPath();
      ctx.arc(p.x, PLAYER_Y - p.z, 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // Blink while invulnerable.
    if (p.invuln > 0 && Math.floor(this.time * 16) % 2 === 0) ctx.globalAlpha = 0.45;
    // Motion lines behind Koinu (he rolls "up" the street).
    if (p.z < JUMP_CLEAR_Z) {
      ctx.strokeStyle = this.night ? 'rgba(255,255,255,0.25)' : 'rgba(74,48,54,0.18)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (const dx of [-12, 0, 12]) {
        const len = 8 + ((this.time * 60 + dx * 3) % 10);
        ctx.beginPath();
        ctx.moveTo(p.x + dx, PLAYER_Y + 30);
        ctx.lineTo(p.x + dx, PLAYER_Y + 30 + len);
        ctx.stroke();
      }
    }
    drawKoinu(ctx, p.x, PLAYER_Y, {
      t: this.time,
      roll: p.roll,
      z: p.z,
      stunned: p.stun > 0,
      jumping: p.jumpT >= 0,
      costume: this.costume,
      art: this.koinuArt,
    });
    ctx.globalAlpha = 1;
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const a = p.ambient ? 0.9 : Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      switch (p.kind) {
        case 'petal':
          drawPetal(ctx, p.x, p.y, p.size, p.rot, p.color);
          break;
        case 'spark':
          drawPetal(ctx, p.x, p.y, p.size, p.rot, p.color);
          break;
        case 'star':
          drawSparkle(ctx, p.x, p.y, p.size + 1, p.color);
          break;
        case 'puff':
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1.4 - a * 0.4), 0, Math.PI * 2);
          ctx.fill();
          break;
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawPopups(dt: number): void {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    this.popups = this.popups.filter((p) => (p.life -= dt) > 0);
    for (const p of this.popups) {
      const k = p.life / p.max;
      const rise = (1 - k) * (p.big ? 30 : 40);
      const pop = k > 0.85 ? 1 + (k - 0.85) * 2 : 1;
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.font = `800 ${(p.big ? 22 : 15) * pop}px ${FONT_JP}`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeText(p.text, p.x, p.y - rise);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y - rise);
      if (p.sub) {
        ctx.font = `700 ${p.big ? 12 : 10}px ${FONT_UI}`;
        ctx.lineWidth = 3;
        ctx.strokeText(p.sub, p.x, p.y - rise + (p.big ? 18 : 14));
        ctx.fillStyle = INK;
        ctx.fillText(p.sub, p.x, p.y - rise + (p.big ? 18 : 14));
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawHud(world: World, live: boolean): void {
    const ctx = this.ctx;
    // Top bar
    const grad = ctx.createLinearGradient(0, 0, 0, 70);
    grad.addColorStop(0, this.night ? 'rgba(34,32,58,0.85)' : 'rgba(255,246,232,0.92)');
    grad.addColorStop(1, this.night ? 'rgba(34,32,58,0)' : 'rgba(255,246,232,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, 70);

    const ink = this.night ? '#fff6e8' : INK;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = this.night ? '#ffb3c7' : '#e8507a';
    ctx.font = `700 10px ${FONT_UI}`;
    ctx.fillText('スコア SCORE', 14, 18);
    ctx.fillStyle = ink;
    ctx.font = `800 22px ${FONT_UI}`;
    ctx.fillText(world.score.score.toLocaleString('en-US'), 14, 40);

    // Combo
    const s = world.score;
    if (s.combo > 0) {
      const m = multiplierFor(s.combo);
      ctx.font = `800 12px ${FONT_UI}`;
      ctx.fillStyle = m >= 3 ? '#e8504a' : m >= 2 ? '#e8507a' : '#6a9a4f';
      ctx.fillText(`×${m.toFixed(1)}  ${s.combo} コンボ`, 14, 58);
      ctx.fillStyle = 'rgba(74,48,54,0.15)';
      ctx.fillRect(14, 63, 90, 4);
      ctx.fillStyle = m >= 2 ? '#ff8fab' : '#8cc152';
      ctx.fillRect(14, 63, 90 * Math.max(0, s.comboTimer / COMBO_WINDOW), 4);
    }

    // Timer ring (center)
    const cx = VIEW_W / 2;
    const cy = 34;
    const tl = Math.max(0, world.timeLeft);
    const frac = Math.min(1, tl / 60);
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fillStyle = this.night ? '#2b2547' : '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 19, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = tl <= 10 ? '#e8504a' : '#8cc152';
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const urgent = live && tl <= 10 && tl > 0;
    const pulse = urgent ? 1 + Math.max(0, Math.sin(this.time * 10)) * 0.15 : 1;
    ctx.font = `800 ${16 * pulse}px ${FONT_UI}`;
    ctx.fillStyle = urgent ? '#e8504a' : ink;
    ctx.fillText(String(Math.ceil(tl)), cx, cy + 1);

    // Magnet timer under the ring
    if (world.player.magnet > 0) {
      ctx.font = `700 10px ${FONT_UI}`;
      ctx.fillStyle = '#c99400';
      ctx.fillText(`🔔 ${world.player.magnet.toFixed(1)}s`, cx, cy + 36);
    }
  }

  private drawBanner(dt: number): void {
    const b = this.banner;
    if (!b) return;
    b.life -= dt;
    if (b.life <= 0) {
      this.banner = null;
      return;
    }
    const ctx = this.ctx;
    const k = b.life / b.max;
    const appear = Math.min(1, (1 - k) * 6);
    const fade = Math.min(1, k * 4);
    ctx.globalAlpha = fade;
    const y = this.viewH * 0.4;
    ctx.save();
    ctx.translate(VIEW_W / 2, y);
    ctx.scale(0.6 + appear * 0.4, 0.6 + appear * 0.4);
    ctx.fillStyle = 'rgba(255, 246, 232, 0.95)';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect?.(-140, -38, 280, 76, 22);
    if (!ctx.roundRect) ctx.rect(-140, -38, 280, 76);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e8507a';
    ctx.font = `900 28px ${FONT_JP}`;
    ctx.fillText(b.jp, 0, -9);
    ctx.fillStyle = INK;
    ctx.font = `700 13px ${FONT_UI}`;
    ctx.fillText(b.en, 0, 20);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  private drawCountdown(): void {
    if (this.countdown === null) return;
    const ctx = this.ctx;
    const n = this.countdown;
    const frac = n - Math.floor(n);
    const label = n > 0 ? String(Math.ceil(n)) : '';
    if (!label) return;
    ctx.save();
    ctx.translate(VIEW_W / 2, this.viewH / 2 - 40);
    const s = 0.8 + frac * 0.6;
    ctx.scale(s, s);
    ctx.globalAlpha = Math.min(1, frac * 3 + 0.2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 96px ${FONT_UI}`;
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(label, 0, 0);
    ctx.fillStyle = '#e8507a';
    ctx.fillText(label, 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
