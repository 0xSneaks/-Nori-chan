import {
  DESPAWN_Y,
  FESTIVAL_BONUS_SECONDS,
  FESTIVAL_BONUS_STARTS,
  INVULN_SECONDS,
  JUMP_CLEAR_Z,
  JUMP_DURATION,
  JUMP_HEIGHT,
  LANE_COUNT,
  LANE_SWITCH_TIME,
  LANE_X,
  MAGNET_RADIUS,
  MAGNET_SECONDS,
  MAX_SPEED,
  MAX_TIME_BONUSES,
  PLAYER_R,
  PLAYER_Y,
  ROW_SPACING,
  RUN_SECONDS,
  SPAWN_Y,
  START_SPEED,
  STUN_SECONDS,
  STUN_SLOW,
  SUSHI_POINTS,
  TIME_BONUS_SECONDS,
  type SushiKind,
} from './config';
import { circleRectOverlap, circlesOverlap, clamp, jumpHeight } from './physics';
import { createRng, type Rng } from './rng';
import { collect, createScore, hit, tickCombo, type ScoreState } from './scoring';

export type GameMode = 'free' | 'festival';
export type EntityKind = 'sushi' | 'wasabi' | 'crate' | 'cart' | 'bell' | 'clock';

export interface Entity {
  id: number;
  kind: EntityKind;
  sushi: SushiKind;
  lane: number;
  x: number;
  y: number;
  active: boolean;
  /** Animation phase offset. */
  phase: number;
}

export interface Player {
  lane: number;
  x: number;
  /** Height above ground (jump). */
  z: number;
  jumpT: number; // -1 when grounded
  jumpBuffer: number;
  stun: number;
  invuln: number;
  magnet: number;
  /** Accumulated roll distance, used for rolling animation. */
  roll: number;
}

export type GameEvent =
  | { type: 'collect'; x: number; y: number; points: number; kind: SushiKind; combo: number }
  | { type: 'combo'; combo: number }
  | { type: 'hit'; x: number; y: number; cause: 'wasabi' | 'crate' | 'cart'; lost: number }
  | { type: 'jump' }
  | { type: 'land' }
  | { type: 'lane'; dir: -1 | 1 }
  | { type: 'powerup'; x: number; y: number; power: 'magnet' | 'time' }
  | { type: 'bonusStart' }
  | { type: 'bonusEnd' }
  | { type: 'poof'; x: number; y: number }
  | { type: 'timeUp' };

const SUSHI_PICKUP_R = 16;
const LOW_R = 15;
const CRATE = { w: 52, h: 40 };
const CART = { w: 72, h: 58 };

export const COMBO_MILESTONES = [10, 20, 30, 50, 75, 100] as const;

export interface WorldOptions {
  mode: GameMode;
  seed?: number;
}

export class World {
  readonly mode: GameMode;
  readonly rng: Rng;
  elapsed = 0;
  timeLeft = RUN_SECONDS;
  speed = START_SPEED;
  distance = 0;
  finished = false;
  bonusActive = false;
  bonusLeft = 0;
  timeBonusesUsed = 0;
  player: Player;
  entities: Entity[] = [];
  score: ScoreState = createScore();
  events: GameEvent[] = [];

  private nextRowAt = 0;
  private rowIndex = 0;
  private lastTallRow = -10;
  private trailLane = 1;
  private nextId = 1;
  private bonusIndex = 0;

  constructor(opts: WorldOptions) {
    this.mode = opts.mode;
    this.rng = createRng(opts.seed ?? (Date.now() & 0x7fffffff));
    this.player = {
      lane: 1,
      x: LANE_X[1] ?? 180,
      z: 0,
      jumpT: -1,
      jumpBuffer: 0,
      stun: 0,
      invuln: 0,
      magnet: 0,
      roll: 0,
    };
    // First row spawns immediately far up the street; it reaches Koinu after ~3s of calm lead-in.
    this.nextRowAt = 0;
  }

  // ---------- input ----------

  moveLane(dir: -1 | 1): void {
    if (this.finished) return;
    const next = clamp(this.player.lane + dir, 0, LANE_COUNT - 1);
    if (next !== this.player.lane) {
      this.player.lane = next;
      this.events.push({ type: 'lane', dir });
    }
  }

  jump(): void {
    if (this.finished) return;
    const p = this.player;
    if (p.stun > 0) return;
    if (p.jumpT >= 0) {
      p.jumpBuffer = 0.15; // pressed slightly early: jump again on landing
      return;
    }
    p.jumpT = 0;
    this.events.push({ type: 'jump' });
  }

  // ---------- simulation ----------

  update(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    // Keep collision steps small without discarding wall time on slow phones.
    while (dt > 0 && !this.finished) {
      const step = Math.min(dt, 1 / 20);
      this.step(step);
      dt -= step;
    }
  }

  private step(dt: number): void {
    this.elapsed += dt;
    this.timeLeft -= dt;

    this.updateBonus(dt);
    this.updatePlayer(dt);

    const progress = clamp(this.elapsed / RUN_SECONDS, 0, 1);
    const base = START_SPEED + (MAX_SPEED - START_SPEED) * progress;
    this.speed = this.player.stun > 0 ? base * STUN_SLOW : base;
    const travel = this.speed * dt;
    this.distance += travel;
    this.player.roll += travel;

    for (const e of this.entities) {
      if (!e.active) continue;
      e.y += travel;
      if (e.y > DESPAWN_Y) e.active = false;
    }

    while (this.distance >= this.nextRowAt) {
      // Spawn so rows keep exact spacing even on long frames.
      const overshoot = this.distance - this.nextRowAt;
      this.spawnRow(SPAWN_Y + overshoot);
      this.nextRowAt += ROW_SPACING;
    }

    this.applyMagnet(dt);
    this.checkCollisions();
    tickCombo(this.score, dt);

    if (this.entities.length > 64) this.entities = this.entities.filter((e) => e.active);

    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.finished = true;
      this.events.push({ type: 'timeUp' });
    }
  }

  drainEvents(): GameEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  private updatePlayer(dt: number): void {
    const p = this.player;
    const target = LANE_X[p.lane] ?? 180;
    const laneGap = (LANE_X[1] ?? 180) - (LANE_X[0] ?? 90);
    const step = (laneGap / LANE_SWITCH_TIME) * dt;
    if (Math.abs(target - p.x) <= step) p.x = target;
    else p.x += Math.sign(target - p.x) * step;

    if (p.jumpT >= 0) {
      p.jumpT += dt;
      if (p.jumpT >= JUMP_DURATION) {
        p.jumpT = -1;
        p.z = 0;
        this.events.push({ type: 'land' });
        if (p.jumpBuffer > 0) {
          p.jumpBuffer = 0;
          this.jump();
        }
      } else {
        p.z = jumpHeight(p.jumpT, JUMP_DURATION, JUMP_HEIGHT);
      }
    }
    p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
    p.stun = Math.max(0, p.stun - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.magnet = Math.max(0, p.magnet - dt);
  }

  private updateBonus(dt: number): void {
    if (this.mode !== 'festival') return;
    if (this.bonusActive) {
      this.bonusLeft -= dt;
      if (this.bonusLeft <= 0) {
        this.bonusActive = false;
        this.bonusLeft = 0;
        this.events.push({ type: 'bonusEnd' });
      }
      return;
    }
    const start = FESTIVAL_BONUS_STARTS[this.bonusIndex];
    if (start !== undefined && this.elapsed >= start) {
      this.bonusIndex += 1;
      this.bonusActive = true;
      this.bonusLeft = FESTIVAL_BONUS_SECONDS;
      // Clear hazards on screen so the bonus stage is a pure celebration.
      for (const e of this.entities) {
        if (e.active && isHazard(e.kind)) {
          e.active = false;
          this.events.push({ type: 'poof', x: e.x, y: e.y });
        }
      }
      this.events.push({ type: 'bonusStart' });
    }
  }

  private applyMagnet(dt: number): void {
    const p = this.player;
    if (p.magnet <= 0) return;
    const r2 = MAGNET_RADIUS * MAGNET_RADIUS;
    for (const e of this.entities) {
      if (!e.active || e.kind !== 'sushi') continue;
      const dx = p.x - e.x;
      const dy = PLAYER_Y - e.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < r2 && d2 > 1) {
        const d = Math.sqrt(d2);
        const pull = 520 * dt;
        e.x += (dx / d) * Math.min(pull, d);
        e.y += (dy / d) * Math.min(pull, d);
      }
    }
  }

  private checkCollisions(): void {
    const p = this.player;
    const body = { x: p.x, y: PLAYER_Y, r: PLAYER_R };
    for (const e of this.entities) {
      if (!e.active) continue;
      if (Math.abs(e.y - PLAYER_Y) > 70) continue;
      switch (e.kind) {
        case 'sushi': {
          if (circlesOverlap(body, { x: e.x, y: e.y, r: SUSHI_PICKUP_R })) {
            e.active = false;
            const points = collect(this.score, SUSHI_POINTS[e.sushi]);
            this.events.push({ type: 'collect', x: e.x, y: e.y, points, kind: e.sushi, combo: this.score.combo });
            if ((COMBO_MILESTONES as readonly number[]).includes(this.score.combo)) {
              this.events.push({ type: 'combo', combo: this.score.combo });
            }
          }
          break;
        }
        case 'bell':
        case 'clock': {
          if (circlesOverlap(body, { x: e.x, y: e.y, r: SUSHI_PICKUP_R })) {
            e.active = false;
            if (e.kind === 'bell') {
              p.magnet = MAGNET_SECONDS;
              this.events.push({ type: 'powerup', x: e.x, y: e.y, power: 'magnet' });
            } else {
              this.timeLeft += TIME_BONUS_SECONDS;
              this.timeBonusesUsed += 1;
              this.events.push({ type: 'powerup', x: e.x, y: e.y, power: 'time' });
            }
          }
          break;
        }
        case 'wasabi': {
          if (p.z < JUMP_CLEAR_Z && p.invuln <= 0 && circlesOverlap(body, { x: e.x, y: e.y, r: LOW_R })) {
            this.applyHit(e, 'wasabi');
          }
          break;
        }
        case 'crate': {
          if (p.z < JUMP_CLEAR_Z && p.invuln <= 0 && circleRectOverlap(body, { x: e.x, y: e.y, ...CRATE })) {
            this.applyHit(e, 'crate');
          }
          break;
        }
        case 'cart': {
          if (p.invuln <= 0 && circleRectOverlap(body, { x: e.x, y: e.y, ...CART })) {
            this.applyHit(e, 'cart');
          }
          break;
        }
      }
    }
  }

  private applyHit(e: Entity, cause: 'wasabi' | 'crate' | 'cart'): void {
    e.active = false;
    const lost = hit(this.score);
    this.player.stun = STUN_SECONDS;
    this.player.invuln = INVULN_SECONDS;
    this.events.push({ type: 'hit', x: e.x, y: e.y, cause, lost });
  }

  // ---------- spawning ----------

  /** Exposed for tests: generate one row at y. */
  spawnRow(y: number): void {
    const row = this.rowIndex++;
    if (this.bonusActive) {
      this.spawnBonusRow(y);
      return;
    }
    const d = clamp(this.elapsed / 50, 0, 1);
    const rng = this.rng;
    const hazardLanes = new Set<number>();

    // Tall obstacle: at most one per row and never in consecutive rows -> always a reachable lane.
    if (row - this.lastTallRow >= 2 && row > 1 && rng.chance(0.2 + 0.2 * d)) {
      const lane = rng.int(LANE_COUNT);
      this.add('cart', lane, y);
      hazardLanes.add(lane);
      this.lastTallRow = row;
    }

    // Low (jumpable) hazard. Total hazards per row capped at 2 so one lane is always clear.
    if (row > 0 && hazardLanes.size < 2 && rng.chance(0.25 + 0.3 * d)) {
      const free = [0, 1, 2].filter((l) => !hazardLanes.has(l));
      const lane = rng.pick(free);
      this.add(rng.chance(0.5) ? 'wasabi' : 'crate', lane, y);
      hazardLanes.add(lane);
    }

    // Sushi trail that drifts between lanes; reroute around hazards.
    if (rng.chance(0.25)) this.trailLane = clamp(this.trailLane + (rng.chance(0.5) ? -1 : 1), 0, LANE_COUNT - 1);
    let sushiLane = this.trailLane;
    if (hazardLanes.has(sushiLane)) {
      const free = [0, 1, 2].filter((l) => !hazardLanes.has(l));
      sushiLane = rng.pick(free);
      this.trailLane = sushiLane;
    }
    if (rng.chance(0.85)) this.addSushi(sushiLane, y, this.rollSushi());

    // Occasional power-up in another free lane.
    const others = [0, 1, 2].filter((l) => !hazardLanes.has(l) && l !== sushiLane);
    if (others.length > 0 && row > 3) {
      const roll = rng.next();
      if (roll < 0.03) this.add('bell', rng.pick(others), y);
      else if (roll < 0.055 && this.timeBonusesUsed + this.pendingClocks() < MAX_TIME_BONUSES) {
        this.add('clock', rng.pick(others), y);
      }
    }
  }

  private spawnBonusRow(y: number): void {
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      if (this.rng.chance(0.7)) this.addSushi(lane, y, this.rng.chance(0.35) ? 'golden' : 'ikura');
    }
  }

  private rollSushi(): SushiKind {
    const r = this.rng.next();
    const festival = this.mode === 'festival';
    if (r < (festival ? 0.06 : 0.035)) return 'golden';
    if (r < (festival ? 0.18 : 0.11)) return 'ikura';
    if (r < 0.3) return 'maki';
    if (r < 0.5) return 'salmon';
    if (r < 0.72) return 'tamago';
    return 'maguro';
  }

  private pendingClocks(): number {
    let n = 0;
    for (const e of this.entities) if (e.active && e.kind === 'clock') n++;
    return n;
  }

  private addSushi(lane: number, y: number, sushi: SushiKind): void {
    const e = this.add('sushi', lane, y);
    e.sushi = sushi;
  }

  private add(kind: EntityKind, lane: number, y: number): Entity {
    const e: Entity = {
      id: this.nextId++,
      kind,
      sushi: 'maguro',
      lane,
      x: LANE_X[lane] ?? 180,
      y,
      active: true,
      phase: this.rng.next() * Math.PI * 2,
    };
    this.entities.push(e);
    return e;
  }
}

export function isHazard(kind: EntityKind): boolean {
  return kind === 'wasabi' || kind === 'crate' || kind === 'cart';
}
