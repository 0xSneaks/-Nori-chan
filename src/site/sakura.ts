import { drawPetal } from '../game/sprites';

interface Petal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rot: number;
  vr: number;
  sway: number;
  color: string;
}

const COLORS = ['#ffc1d3', '#ffb0c8', '#ffd9e4', '#fbe3ea'];

/** Ambient falling cherry blossoms behind the storefront. Pauses when hidden or when told to. */
export function startSakura(canvas: HTMLCanvasElement): { setPaused(p: boolean): void } {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { setPaused: () => {} };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w = 0;
  let h = 0;
  let petals: Petal[] = [];
  let paused = false;
  let raf = 0;
  let last = performance.now();

  const make = (y: number): Petal => ({
    x: Math.random() * w,
    y,
    vx: -8 + Math.random() * 20,
    vy: 20 + Math.random() * 35,
    r: 4 + Math.random() * 5,
    rot: Math.random() * Math.PI * 2,
    vr: -1.5 + Math.random() * 3,
    sway: Math.random() * Math.PI * 2,
    color: COLORS[Math.floor(Math.random() * COLORS.length)] ?? '#ffc1d3',
  });

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = reduce ? 0 : Math.round(Math.min(40, (w * h) / 26000));
    petals = Array.from({ length: count }, () => make(Math.random() * h));
  };

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, w, h);
    for (const p of petals) {
      p.sway += dt;
      p.x += (p.vx + Math.sin(p.sway * 1.4) * 14) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.y > h + 12) Object.assign(p, make(-12));
      if (p.x < -12) p.x = w + 12;
      if (p.x > w + 12) p.x = -12;
      ctx.globalAlpha = 0.85;
      drawPetal(ctx, p.x, p.y, p.r, p.rot, p.color);
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  };

  const run = () => {
    cancelAnimationFrame(raf);
    if (paused || document.hidden || petals.length === 0) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  resize();
  window.addEventListener('resize', () => {
    resize();
    run();
  });
  document.addEventListener('visibilitychange', run);
  run();

  return {
    setPaused(p: boolean) {
      paused = p;
      run();
    },
  };
}
