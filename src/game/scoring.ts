import { COMBO_STEP, COMBO_STEP_BONUS, COMBO_WINDOW, HIT_PENALTY, MAX_MULTIPLIER } from './config';

export interface ScoreState {
  score: number;
  combo: number;
  maxCombo: number;
  comboTimer: number;
  sushi: number;
  hits: number;
}

export function createScore(): ScoreState {
  return { score: 0, combo: 0, maxCombo: 0, comboTimer: 0, sushi: 0, hits: 0 };
}

/** 1x, then +0.5x every COMBO_STEP pickups, capped at MAX_MULTIPLIER. */
export function multiplierFor(combo: number): number {
  const steps = Math.floor(Math.max(0, combo) / COMBO_STEP);
  return Math.min(1 + steps * COMBO_STEP_BONUS, MAX_MULTIPLIER);
}

/** Collect a pickup worth `base` points. Returns points awarded. Mutates state. */
export function collect(s: ScoreState, base: number): number {
  s.combo += 1;
  s.maxCombo = Math.max(s.maxCombo, s.combo);
  s.comboTimer = COMBO_WINDOW;
  s.sushi += 1;
  const points = Math.round(base * multiplierFor(s.combo));
  s.score += points;
  return points;
}

/** Obstacle / wasabi hit: combo breaks and a small penalty applies (score never < 0). */
export function hit(s: ScoreState): number {
  s.hits += 1;
  s.combo = 0;
  s.comboTimer = 0;
  const lost = Math.min(HIT_PENALTY, s.score);
  s.score -= lost;
  return lost;
}

/** Advance combo timer; returns true if the combo just expired. */
export function tickCombo(s: ScoreState, dt: number): boolean {
  if (s.combo === 0) return false;
  s.comboTimer -= dt;
  if (s.comboTimer <= 0) {
    s.combo = 0;
    s.comboTimer = 0;
    return true;
  }
  return false;
}
