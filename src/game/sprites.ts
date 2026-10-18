import type { SushiKind } from './config';
import type { CostumeId } from '../premium/costumes';

type Ctx = CanvasRenderingContext2D;

export const INK = '#4a3036';
const BLUSH = 'rgba(255, 128, 150, 0.55)';

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fillStroke(ctx: Ctx, fill: string, lw = 2.2): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function tinyFace(ctx: Ctx, x: number, y: number, s: number, happy = true): void {
  ctx.fillStyle = INK;
  ellipse(ctx, x - 4 * s, y, 1.4 * s, 1.8 * s);
  ctx.fill();
  ellipse(ctx, x + 4 * s, y, 1.4 * s, 1.8 * s);
  ctx.fill();
  ctx.beginPath();
  ctx.lineWidth = 1.2 * s;
  ctx.strokeStyle = INK;
  if (happy) ctx.arc(x, y + 1.2 * s, 1.8 * s, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = BLUSH;
  ellipse(ctx, x - 7 * s, y + 2.5 * s, 2 * s, 1.2 * s);
  ctx.fill();
  ellipse(ctx, x + 7 * s, y + 2.5 * s, 2 * s, 1.2 * s);
  ctx.fill();
}

// ---------------------------------------------------------------- Koinu

export interface KoinuPose {
  t: number; // seconds, for idle animation
  roll: number; // px rolled
  z: number; // jump height
  stunned: boolean;
  jumping: boolean;
  costume: CostumeId;
  art?: HTMLImageElement | null;
}

/** Draws Koinu centered at (x, y) where y is the ground contact center. Radius ~24. */
export function drawKoinu(ctx: Ctx, x: number, y: number, pose: KoinuPose, scale = 1): void {
  const R = 24 * scale;
  const bounce = pose.jumping ? 0 : Math.abs(Math.sin(pose.roll / 18)) * 3 * scale;
  const squash = pose.jumping ? 1.04 : 1 - Math.abs(Math.cos(pose.roll / 18)) * 0.05;
  const cy = y - pose.z - bounce;

  // Ground shadow
  const shadowK = Math.max(0.35, 1 - pose.z / 120);
  ctx.fillStyle = 'rgba(74, 48, 54, 0.18)';
  ellipse(ctx, x, y + R * 0.85, R * 0.95 * shadowK, R * 0.28 * shadowK);
  ctx.fill();

  ctx.save();
  ctx.translate(x, cy);
  ctx.scale(1 / squash, squash);

  if (pose.art) {
    // Gentle side-to-side wobble reads as rolling without turning his face upside down.
    const wobble = pose.stunned ? Math.sin(pose.t * 40) * 0.12 : pose.jumping ? 0 : Math.sin(pose.roll / 14) * 0.18;
    ctx.rotate(wobble);
    ctx.drawImage(pose.art, -R * 1.15, -R * 1.15, R * 2.3, R * 2.3);
    drawCostume(ctx, pose.costume, R, pose.t);
    ctx.restore();
    return;
  }

  // Tail (wags)
  const wag = Math.sin(pose.t * 14) * 0.5;
  ctx.save();
  ctx.translate(R * 0.75, R * 0.45);
  ctx.rotate(-0.6 + wag);
  ellipse(ctx, R * 0.25, 0, R * 0.3, R * 0.14);
  fillStroke(ctx, '#f4c28a', 2);
  ctx.restore();

  // Ears (floppy, behind head)
  const flop = pose.jumping ? -0.35 : Math.sin(pose.roll / 18) * 0.15;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * R * 0.72, -R * 0.5);
    ctx.rotate(side * (0.55 + flop));
    ellipse(ctx, 0, R * 0.25, R * 0.3, R * 0.5);
    fillStroke(ctx, '#e9a86b', 2.2);
    ctx.restore();
  }

  // Body
  ellipse(ctx, 0, 0, R, R);
  ctx.fillStyle = '#fff6e8';
  ctx.fill();

  // Rolling spots, clipped to the body (scroll downward as he rolls forward)
  ctx.save();
  ellipse(ctx, 0, 0, R - 1, R - 1);
  ctx.clip();
  const cycle = R * 2.6;
  const off = ((pose.roll * 0.6) % cycle) - R * 1.3;
  ctx.fillStyle = '#f4c28a';
  ellipse(ctx, -R * 0.45, off, R * 0.32, R * 0.22);
  ctx.fill();
  ellipse(ctx, R * 0.5, off - R * 1.2, R * 0.28, R * 0.2);
  ctx.fill();
  ellipse(ctx, R * 0.1, off + R * 1.3, R * 0.25, R * 0.18);
  ctx.fill();
  ctx.restore();

  ellipse(ctx, 0, 0, R, R);
  ctx.lineWidth = 2.6 * scale;
  ctx.strokeStyle = INK;
  ctx.stroke();

  // Muzzle
  ellipse(ctx, 0, R * 0.32, R * 0.42, R * 0.3);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Eyes
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2 * scale;
  ctx.lineCap = 'round';
  const ex = R * 0.36;
  const ey = -R * 0.02;
  if (pose.stunned) {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * ex - 4 * scale, ey - 4 * scale);
      ctx.lineTo(s * ex + 4 * scale, ey);
      ctx.lineTo(s * ex - 4 * scale, ey + 4 * scale);
      ctx.stroke();
    }
  } else if (pose.jumping) {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * ex, ey + 2 * scale, 4 * scale, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
  } else {
    for (const s of [-1, 1]) {
      ellipse(ctx, s * ex, ey, 3.6 * scale, 4.6 * scale);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ellipse(ctx, s * ex + 1.2 * scale, ey - 1.6 * scale, 1.3 * scale, 1.5 * scale);
      ctx.fill();
      ctx.fillStyle = INK;
    }
  }

  // Nose + ω mouth
  ellipse(ctx, 0, R * 0.2, 3 * scale, 2.2 * scale);
  ctx.fill();
  ctx.beginPath();
  ctx.lineWidth = 1.8 * scale;
  ctx.arc(-2.6 * scale, R * 0.32, 2.6 * scale, 0, Math.PI);
  ctx.arc(2.6 * scale, R * 0.32, 2.6 * scale, 0, Math.PI);
  ctx.stroke();
  if (pose.stunned) {
    ellipse(ctx, 0, R * 0.52, 2.6 * scale, 3 * scale);
    ctx.fillStyle = '#ff7a8a';
    ctx.fill();
  }

  // Blush
  ctx.fillStyle = BLUSH;
  ellipse(ctx, -R * 0.62, R * 0.22, R * 0.16, R * 0.1);
  ctx.fill();
  ellipse(ctx, R * 0.62, R * 0.22, R * 0.16, R * 0.1);
  ctx.fill();

  drawCostume(ctx, pose.costume, R, pose.t);
  ctx.restore();
}

function drawCostume(ctx: Ctx, costume: CostumeId, R: number, t: number): void {
  switch (costume) {
    case 'none':
      return;
    case 'hachimaki': {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, -R * 0.52, R * 0.92, R * 0.2, 0, Math.PI * 1.02, Math.PI * 1.98);
      ctx.lineWidth = R * 0.2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ellipse(ctx, 0, -R * 0.7, R * 0.11, R * 0.11);
      ctx.fillStyle = '#e8504a';
      ctx.fill();
      // knot tails
      ctx.translate(R * 0.85, -R * 0.55);
      ctx.rotate(Math.sin(t * 6) * 0.2);
      ellipse(ctx, R * 0.22, -R * 0.05, R * 0.22, R * 0.08, -0.4);
      fillStroke(ctx, '#ffffff', 1.4);
      ellipse(ctx, R * 0.2, R * 0.12, R * 0.2, R * 0.07, 0.4);
      fillStroke(ctx, '#ffffff', 1.4);
      ctx.restore();
      return;
    }
    case 'happi': {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-R * 0.95, R * 0.35);
      ctx.quadraticCurveTo(-R * 0.3, R * 1.25, 0, R * 0.98);
      ctx.quadraticCurveTo(R * 0.3, R * 1.25, R * 0.95, R * 0.35);
      ctx.lineTo(R * 0.7, R * 0.95);
      ctx.quadraticCurveTo(0, R * 1.2, -R * 0.7, R * 0.95);
      ctx.closePath();
      fillStroke(ctx, '#3f6fb5', 2);
      ctx.beginPath();
      ctx.moveTo(-R * 0.5, R * 0.62);
      ctx.lineTo(0, R * 0.98);
      ctx.lineTo(R * 0.5, R * 0.62);
      ctx.lineWidth = R * 0.12;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.restore();
      return;
    }
    case 'kitsune': {
      ctx.save();
      ctx.translate(R * 0.62, -R * 0.62);
      ctx.rotate(0.45);
      ctx.beginPath();
      ctx.moveTo(-R * 0.36, -R * 0.1);
      ctx.lineTo(-R * 0.3, -R * 0.52);
      ctx.lineTo(-R * 0.08, -R * 0.22);
      ctx.lineTo(R * 0.08, -R * 0.22);
      ctx.lineTo(R * 0.3, -R * 0.52);
      ctx.lineTo(R * 0.36, -R * 0.1);
      ctx.quadraticCurveTo(R * 0.3, R * 0.3, 0, R * 0.42);
      ctx.quadraticCurveTo(-R * 0.3, R * 0.3, -R * 0.36, -R * 0.1);
      ctx.closePath();
      fillStroke(ctx, '#ffffff', 1.8);
      ctx.strokeStyle = '#e8504a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-R * 0.22, -R * 0.02);
      ctx.lineTo(-R * 0.08, R * 0.04);
      ctx.moveTo(R * 0.22, -R * 0.02);
      ctx.lineTo(R * 0.08, R * 0.04);
      ctx.stroke();
      ellipse(ctx, 0, R * 0.3, R * 0.06, R * 0.05);
      ctx.fillStyle = '#e8504a';
      ctx.fill();
      ctx.restore();
      return;
    }
    case 'yukata': {
      ctx.save();
      ctx.translate(-R * 0.55, -R * 0.78);
      ctx.rotate(-0.3);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(s * R * 0.5, -R * 0.45, s * R * 0.55, R * 0.05);
        ctx.quadraticCurveTo(s * R * 0.4, R * 0.25, 0, 0);
        fillStroke(ctx, '#ff9fbf', 1.8);
      }
      ellipse(ctx, 0, 0, R * 0.12, R * 0.12);
      fillStroke(ctx, '#ff7aa2', 1.6);
      drawBlossom(ctx, 0, 0, R * 0.08, '#ffffff');
      ctx.restore();
      return;
    }
    case 'chochin': {
      ctx.save();
      ctx.translate(0, -R * 1.12);
      const sway = Math.sin(t * 3) * 0.08;
      ctx.rotate(sway);
      roundRect(ctx, -R * 0.12, -R * 0.42, R * 0.24, R * 0.08, 2);
      fillStroke(ctx, '#2b2547', 1.4);
      ellipse(ctx, 0, -R * 0.12, R * 0.3, R * 0.26);
      fillStroke(ctx, '#e8504a', 1.8);
      ctx.strokeStyle = 'rgba(74,48,54,0.5)';
      ctx.lineWidth = 1;
      for (const k of [-0.1, 0, 0.1]) {
        ctx.beginPath();
        ctx.moveTo(-R * 0.28, -R * 0.12 + k * R);
        ctx.lineTo(R * 0.28, -R * 0.12 + k * R);
        ctx.stroke();
      }
      roundRect(ctx, -R * 0.12, R * 0.12, R * 0.24, R * 0.07, 2);
      fillStroke(ctx, '#2b2547', 1.4);
      ctx.restore();
      return;
    }
  }
}

// ---------------------------------------------------------------- Sushi & items

const TOPPING: Record<Exclude<SushiKind, 'maki' | 'ikura'>, { fill: string; stripe: string | null }> = {
  maguro: { fill: '#ec5b5b', stripe: '#f78a86' },
  salmon: { fill: '#ff9a62', stripe: '#ffe1cc' },
  tamago: { fill: '#ffd65c', stripe: null },
  golden: { fill: '#ffcf3f', stripe: '#fff4b8' },
};

/** Draws a sushi centered at (x, y), ~18px radius at scale 1. */
export function drawSushi(ctx: Ctx, kind: SushiKind, x: number, y: number, t: number, scale = 1): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  if (kind === 'golden') {
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 28);
    glow.addColorStop(0, 'rgba(255, 230, 120, 0.75)');
    glow.addColorStop(1, 'rgba(255, 230, 120, 0)');
    ctx.fillStyle = glow;
    ellipse(ctx, 0, 0, 28, 28);
    ctx.fill();
  }

  if (kind === 'maki') {
    ellipse(ctx, 0, 0, 15, 15);
    fillStroke(ctx, '#2f4a2e', 2.2);
    ellipse(ctx, 0, 0, 11.5, 11.5);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ellipse(ctx, 0, -3, 5, 4);
    ctx.fillStyle = '#ff8fa3';
    ctx.fill();
    ellipse(ctx, -3, -2, 2, 2);
    ctx.fillStyle = '#7cc26a';
    ctx.fill();
    tinyFace(ctx, 0, 4, 0.7);
  } else if (kind === 'ikura') {
    roundRect(ctx, -15, -6, 30, 18, 8);
    fillStroke(ctx, '#2f4a2e', 2.2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(-12, 0, 24, 2);
    const beads: Array<[number, number]> = [
      [-8, -8],
      [0, -10],
      [8, -8],
      [-4, -13],
      [4, -13],
    ];
    for (const [bx, by] of beads) {
      ellipse(ctx, bx, by, 4.2, 4.2);
      fillStroke(ctx, '#ff7b2e', 1.4);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ellipse(ctx, bx - 1.3, by - 1.3, 1.1, 1.1);
      ctx.fill();
    }
    tinyFace(ctx, 0, 4, 0.7);
  } else {
    // Nigiri: rice + topping
    ellipse(ctx, 0, 4, 15, 9);
    fillStroke(ctx, '#ffffff', 2.2);
    const top = TOPPING[kind];
    ctx.save();
    roundRect(ctx, -17, -9, 34, 13, 6.5);
    ctx.fillStyle = top.fill;
    ctx.fill();
    ctx.clip();
    if (top.stripe) {
      ctx.strokeStyle = top.stripe;
      ctx.lineWidth = 2;
      for (let i = -14; i <= 14; i += 7) {
        ctx.beginPath();
        ctx.moveTo(i - 3, -10);
        ctx.lineTo(i + 3, 5);
        ctx.stroke();
      }
    }
    ctx.restore();
    roundRect(ctx, -17, -9, 34, 13, 6.5);
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = INK;
    ctx.stroke();
    if (kind === 'tamago') {
      ctx.fillStyle = '#2f4a2e';
      ctx.fillRect(-3.5, -9, 7, 21);
      ctx.strokeRect(-3.5, -9, 7, 21);
    }
    tinyFace(ctx, 0, 7, 0.65);
  }

  if (kind === 'golden') {
    drawSparkle(ctx, 13, -12, 4 + Math.sin(t * 8) * 1.5, '#ffffff');
  }
  ctx.restore();
}

export function drawWasabi(ctx: Ctx, x: number, y: number, t: number): void {
  ctx.save();
  ctx.translate(x, y);
  const wob = Math.sin(t * 6) * 1.2;
  ctx.beginPath();
  ctx.moveTo(-16, 8);
  ctx.quadraticCurveTo(-18 - wob, -6, -6, -10);
  ctx.quadraticCurveTo(0, -20 - wob, 6, -10);
  ctx.quadraticCurveTo(18 + wob, -6, 16, 8);
  ctx.quadraticCurveTo(0, 14, -16, 8);
  ctx.closePath();
  fillStroke(ctx, '#8cc152', 2.4);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ellipse(ctx, -6, -6, 3, 2);
  ctx.fill();
  // angry face
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-8, -3);
  ctx.lineTo(-3, -1);
  ctx.moveTo(8, -3);
  ctx.lineTo(3, -1);
  ctx.stroke();
  ctx.fillStyle = INK;
  ellipse(ctx, -5, 2, 1.6, 2);
  ctx.fill();
  ellipse(ctx, 5, 2, 1.6, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-3, 7);
  ctx.lineTo(-1, 5.5);
  ctx.lineTo(1, 7);
  ctx.lineTo(3, 5.5);
  ctx.stroke();
  // steam
  ctx.strokeStyle = 'rgba(140, 193, 82, 0.7)';
  ctx.lineWidth = 1.6;
  for (const sx of [-6, 6]) {
    ctx.beginPath();
    const base = -16 - ((t * 20 + sx * 3) % 8);
    ctx.moveTo(sx, base);
    ctx.quadraticCurveTo(sx + 3, base - 4, sx, base - 8);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawCrate(ctx: Ctx, x: number, y: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(74,48,54,0.15)';
  ellipse(ctx, 0, 22, 28, 6);
  ctx.fill();
  roundRect(ctx, -26, -20, 52, 40, 5);
  fillStroke(ctx, '#d79a62', 2.4);
  ctx.strokeStyle = '#b07345';
  ctx.lineWidth = 1.6;
  for (const yy of [-7, 6]) {
    ctx.beginPath();
    ctx.moveTo(-24, yy);
    ctx.lineTo(24, yy);
    ctx.stroke();
  }
  ellipse(ctx, 0, 0, 10, 10);
  fillStroke(ctx, '#fff6e8', 1.8);
  ctx.fillStyle = '#3b6fb0';
  ctx.font = 'bold 12px "Zen Maru Gothic", "Hiragino Maru Gothic ProN", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('魚', 0, 1);
  ctx.restore();
}

/** Yatai food cart — tall, must be avoided by changing lanes. Hitbox 72x58 centered at (x, y). */
export function drawCart(ctx: Ctx, x: number, y: number, t: number, night: boolean): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(74,48,54,0.18)';
  ellipse(ctx, 0, 30, 40, 7);
  ctx.fill();
  // counter
  roundRect(ctx, -34, -4, 68, 32, 4);
  fillStroke(ctx, '#b9774a', 2.4);
  ctx.strokeStyle = '#94592f';
  ctx.lineWidth = 1.4;
  for (let i = -22; i <= 22; i += 11) {
    ctx.beginPath();
    ctx.moveTo(i, -2);
    ctx.lineTo(i, 26);
    ctx.stroke();
  }
  // posts
  ctx.fillStyle = '#7a4a2a';
  ctx.fillRect(-32, -40, 4, 38);
  ctx.fillRect(28, -40, 4, 38);
  // noren curtain
  roundRect(ctx, -30, -28, 60, 20, 3);
  fillStroke(ctx, '#e8504a', 2);
  ctx.fillStyle = '#fff6e8';
  ctx.font = 'bold 12px "Zen Maru Gothic", "Hiragino Maru Gothic ProN", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('すし', 0, -18);
  ctx.strokeStyle = '#fff6e8';
  ctx.lineWidth = 1;
  for (const cx of [-15, 15]) {
    ctx.beginPath();
    ctx.moveTo(cx, -24);
    ctx.lineTo(cx, -9);
    ctx.stroke();
  }
  // striped roof
  ctx.beginPath();
  ctx.moveTo(-40, -36);
  ctx.lineTo(40, -36);
  ctx.lineTo(32, -50);
  ctx.lineTo(-32, -50);
  ctx.closePath();
  fillStroke(ctx, '#fff6e8', 2.2);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#e8504a';
  for (let i = -40; i < 40; i += 16) ctx.fillRect(i, -52, 8, 18);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(-40, -36);
  ctx.lineTo(40, -36);
  ctx.lineTo(32, -50);
  ctx.lineTo(-32, -50);
  ctx.closePath();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // lantern on top
  drawLantern(ctx, 0, -62, 0.55, t, night);
  // wheels
  for (const wx of [-22, 22]) {
    ellipse(ctx, wx, 28, 6, 6);
    fillStroke(ctx, '#5a3d3d', 2);
  }
  ctx.restore();
}

export function drawLantern(ctx: Ctx, x: number, y: number, scale: number, t: number, glow: boolean): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 2.2 + x * 0.05) * 0.06);
  ctx.scale(scale, scale);
  if (glow) {
    const g = ctx.createRadialGradient(0, 4, 4, 0, 4, 42);
    g.addColorStop(0, 'rgba(255, 170, 110, 0.55)');
    g.addColorStop(1, 'rgba(255, 170, 110, 0)');
    ctx.fillStyle = g;
    ellipse(ctx, 0, 4, 42, 42);
    ctx.fill();
  }
  roundRect(ctx, -9, -14, 18, 5, 2);
  fillStroke(ctx, '#2b2547', 1.6);
  ellipse(ctx, 0, 4, 15, 15);
  fillStroke(ctx, glow ? '#ff6b57' : '#e8504a', 2);
  ctx.strokeStyle = 'rgba(74,48,54,0.45)';
  ctx.lineWidth = 1.1;
  for (const k of [-7, 0, 7]) {
    ctx.beginPath();
    ctx.moveTo(-14, 4 + k);
    ctx.lineTo(14, 4 + k);
    ctx.stroke();
  }
  roundRect(ctx, -9, 17, 18, 5, 2);
  fillStroke(ctx, '#2b2547', 1.6);
  ctx.restore();
}

export function drawBell(ctx: Ctx, x: number, y: number, t: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 7) * 0.2);
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 26);
  glow.addColorStop(0, 'rgba(255, 220, 120, 0.6)');
  glow.addColorStop(1, 'rgba(255, 220, 120, 0)');
  ctx.fillStyle = glow;
  ellipse(ctx, 0, 0, 26, 26);
  ctx.fill();
  ctx.strokeStyle = '#e8504a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(0, -12);
  ctx.stroke();
  ellipse(ctx, 0, 0, 13, 13);
  fillStroke(ctx, '#ffc93c', 2.2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-12, -1);
  ctx.lineTo(12, -1);
  ctx.stroke();
  ellipse(ctx, 0, 5, 3, 2.5);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 7);
  ctx.lineTo(0, 12);
  ctx.stroke();
  drawSparkle(ctx, 12, -10, 3 + Math.sin(t * 9), '#ffffff');
  ctx.restore();
}

export function drawClock(ctx: Ctx, x: number, y: number, t: number): void {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 5) * 2);
  ellipse(ctx, 0, 0, 15, 15);
  fillStroke(ctx, '#fff6e8', 2.2);
  ellipse(ctx, 0, 0, 15, 15);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ff8fab';
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -8);
  ctx.moveTo(0, 0);
  ctx.lineTo(6, 2);
  ctx.stroke();
  ctx.fillStyle = '#e8504a';
  ctx.font = 'bold 11px "M PLUS Rounded 1c", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+3', 14, -14);
  ctx.restore();
}

export function drawSparkle(ctx: Ctx, x: number, y: number, r: number, color: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.quadraticCurveTo(0, 0, 0, r);
  ctx.quadraticCurveTo(0, 0, -r, 0);
  ctx.quadraticCurveTo(0, 0, 0, -r);
  ctx.fill();
  ctx.restore();
}

export function drawBlossom(ctx: Ctx, x: number, y: number, r: number, color: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    ctx.rotate((Math.PI * 2) / 5);
    ellipse(ctx, 0, -r, r * 0.6, r);
    ctx.fill();
  }
  ctx.fillStyle = '#ffd85e';
  ellipse(ctx, 0, 0, r * 0.35, r * 0.35);
  ctx.fill();
  ctx.restore();
}

export function drawPetal(ctx: Ctx, x: number, y: number, size: number, rot: number, color: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.quadraticCurveTo(size * 0.9, -size * 0.2, 0, size);
  ctx.quadraticCurveTo(-size * 0.9, -size * 0.2, 0, -size);
  ctx.fill();
  ctx.restore();
}
