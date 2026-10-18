import { describe, expect, it } from 'vitest';
import { circleRectOverlap, circlesOverlap, clamp, jumpHeight } from '../src/game/physics';

describe('physics', () => {
  it('detects circle overlap and separation', () => {
    expect(circlesOverlap({ x: 0, y: 0, r: 10 }, { x: 15, y: 0, r: 10 })).toBe(true);
    expect(circlesOverlap({ x: 0, y: 0, r: 10 }, { x: 20, y: 0, r: 10 })).toBe(false); // touching != overlap
    expect(circlesOverlap({ x: 0, y: 0, r: 10 }, { x: 30, y: 0, r: 10 })).toBe(false);
  });

  it('detects circle vs rect overlap on edges and corners', () => {
    const rect = { x: 0, y: 0, w: 40, h: 20 };
    expect(circleRectOverlap({ x: 0, y: 0, r: 5 }, rect)).toBe(true); // inside
    expect(circleRectOverlap({ x: 24, y: 0, r: 5 }, rect)).toBe(true); // right edge
    expect(circleRectOverlap({ x: 26, y: 0, r: 5 }, rect)).toBe(false);
    expect(circleRectOverlap({ x: 23, y: 13, r: 5 }, rect)).toBe(true); // near corner
    expect(circleRectOverlap({ x: 25, y: 15, r: 5 }, rect)).toBe(false); // diagonal miss
  });

  it('jump arc is zero at ends and peaks mid-way', () => {
    expect(jumpHeight(0, 1, 50)).toBe(0);
    expect(jumpHeight(1, 1, 50)).toBe(0);
    expect(jumpHeight(0.5, 1, 50)).toBeCloseTo(50);
    expect(jumpHeight(0.25, 1, 50)).toBeCloseTo(37.5);
  });

  it('clamps', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
});
