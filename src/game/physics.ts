export interface Circle {
  x: number;
  y: number;
  r: number;
}

export interface Rect {
  x: number; // center
  y: number; // center
  w: number;
  h: number;
}

export function circlesOverlap(a: Circle, b: Circle): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const rr = a.r + b.r;
  return dx * dx + dy * dy < rr * rr;
}

export function circleRectOverlap(c: Circle, r: Rect): boolean {
  const left = r.x - r.w / 2;
  const top = r.y - r.h / 2;
  const nx = Math.max(left, Math.min(c.x, left + r.w));
  const ny = Math.max(top, Math.min(c.y, top + r.h));
  const dx = c.x - nx;
  const dy = c.y - ny;
  return dx * dx + dy * dy < c.r * c.r;
}

/** Jump arc: 0 at start/end, `height` at the apex. t in [0, duration]. */
export function jumpHeight(t: number, duration: number, height: number): number {
  if (t <= 0 || t >= duration) return 0;
  const p = t / duration;
  return 4 * height * p * (1 - p);
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
