import { describe, expect, it } from 'vitest';
import { COMBO_WINDOW, HIT_PENALTY, MAX_MULTIPLIER } from '../src/game/config';
import { collect, createScore, hit, multiplierFor, tickCombo } from '../src/game/scoring';

describe('scoring', () => {
  it('multiplier steps every 5 pickups and caps at max', () => {
    expect(multiplierFor(0)).toBe(1);
    expect(multiplierFor(4)).toBe(1);
    expect(multiplierFor(5)).toBe(1.5);
    expect(multiplierFor(10)).toBe(2);
    expect(multiplierFor(29)).toBe(3.5);
    expect(multiplierFor(30)).toBe(MAX_MULTIPLIER);
    expect(multiplierFor(500)).toBe(MAX_MULTIPLIER);
  });

  it('awards base points times the multiplier of the new combo', () => {
    const s = createScore();
    for (let i = 0; i < 4; i++) expect(collect(s, 10)).toBe(10);
    expect(collect(s, 10)).toBe(15); // 5th pickup -> x1.5
    expect(s.score).toBe(55);
    expect(s.combo).toBe(5);
    expect(s.sushi).toBe(5);
    expect(s.maxCombo).toBe(5);
  });

  it('hit breaks combo, applies penalty, never goes negative', () => {
    const s = createScore();
    collect(s, 10);
    collect(s, 10);
    const lost = hit(s);
    expect(lost).toBe(Math.min(HIT_PENALTY, 20));
    expect(s.score).toBe(20 - lost);
    expect(s.combo).toBe(0);
    expect(s.maxCombo).toBe(2);
    hit(s);
    hit(s);
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.hits).toBe(3);
  });

  it('combo expires after the window with no pickups', () => {
    const s = createScore();
    collect(s, 10);
    expect(tickCombo(s, COMBO_WINDOW - 0.1)).toBe(false);
    expect(s.combo).toBe(1);
    expect(tickCombo(s, 0.2)).toBe(true);
    expect(s.combo).toBe(0);
    // a fresh pickup refreshes the window
    collect(s, 10);
    tickCombo(s, COMBO_WINDOW - 0.1);
    collect(s, 10);
    tickCombo(s, COMBO_WINDOW - 0.1);
    expect(s.combo).toBe(2);
  });
});
