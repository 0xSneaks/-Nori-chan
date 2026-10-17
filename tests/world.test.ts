import { describe, expect, it } from 'vitest';
import {
  FESTIVAL_BONUS_STARTS,
  JUMP_DURATION,
  LANE_X,
  MAX_TIME_BONUSES,
  PLAYER_Y,
  RUN_SECONDS,
  STUN_SECONDS,
  SUSHI_POINTS,
} from '../src/game/config';
import { isHazard, World, type Entity, type EntityKind, type GameEvent } from '../src/game/world';

const DT = 1 / 60;

function place(world: World, kind: EntityKind, lane: number, y: number, sushi: Entity['sushi'] = 'maguro'): Entity {
  const e: Entity = { id: 9999 + world.entities.length, kind, sushi, lane, x: LANE_X[lane]!, y, active: true, phase: 0 };
  world.entities.push(e);
  return e;
}

/** World with spawning pushed far away so tests control the field. */
function quietWorld(mode: 'free' | 'festival' = 'free'): World {
  const w = new World({ mode, seed: 1 });
  // @ts-expect-error test hook: delay row spawning
  w.nextRowAt = 1e9;
  return w;
}

function run(world: World, seconds: number): GameEvent[] {
  const events: GameEvent[] = [];
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps && !world.finished; i++) {
    world.update(DT);
    events.push(...world.drainEvents());
  }
  return events;
}

describe('world: collisions & scoring', () => {
  it('collects sushi in Koinu’s lane and scores it', () => {
    const w = quietWorld();
    place(w, 'sushi', 1, PLAYER_Y - 60, 'maki');
    const ev = run(w, 0.5);
    const got = ev.filter((e) => e.type === 'collect');
    expect(got).toHaveLength(1);
    expect(w.score.score).toBe(SUSHI_POINTS.maki);
    expect(w.score.combo).toBe(1);
  });

  it('ignores sushi in other lanes', () => {
    const w = quietWorld();
    place(w, 'sushi', 0, PLAYER_Y - 60);
    place(w, 'sushi', 2, PLAYER_Y - 60);
    run(w, 0.6);
    expect(w.score.sushi).toBe(0);
  });

  it('wasabi hit breaks combo and stuns; hopping clears it', () => {
    const w = quietWorld();
    w.score.combo = 7;
    place(w, 'wasabi', 1, PLAYER_Y - 40);
    const ev = run(w, 0.4);
    expect(ev.some((e) => e.type === 'hit' && e.cause === 'wasabi')).toBe(true);
    expect(w.score.combo).toBe(0);
    expect(w.player.stun).toBeGreaterThan(0);
    expect(w.player.stun).toBeLessThanOrEqual(STUN_SECONDS);

    const w2 = quietWorld();
    place(w2, 'wasabi', 1, PLAYER_Y - 70);
    w2.jump();
    const ev2 = run(w2, JUMP_DURATION);
    expect(ev2.some((e) => e.type === 'hit')).toBe(false);
  });

  it('hopping does NOT clear a tall yatai cart', () => {
    const w = quietWorld();
    place(w, 'cart', 1, PLAYER_Y - 70);
    w.jump();
    const ev = run(w, JUMP_DURATION);
    expect(ev.some((e) => e.type === 'hit' && e.cause === 'cart')).toBe(true);
  });

  it('changing lanes dodges a cart', () => {
    const w = quietWorld();
    place(w, 'cart', 1, PLAYER_Y - 120);
    w.moveLane(1);
    const ev = run(w, 1);
    expect(ev.some((e) => e.type === 'hit')).toBe(false);
    expect(w.player.x).toBe(LANE_X[2]);
  });

  it('invulnerability after a hit prevents chain hits', () => {
    const w = quietWorld();
    place(w, 'crate', 1, PLAYER_Y - 30);
    place(w, 'crate', 1, PLAYER_Y - 90);
    const ev = run(w, 0.6);
    expect(ev.filter((e) => e.type === 'hit')).toHaveLength(1);
  });

  it('lane changes clamp at the edges', () => {
    const w = quietWorld();
    w.moveLane(-1);
    w.moveLane(-1);
    w.moveLane(-1);
    expect(w.player.lane).toBe(0);
    w.moveLane(1);
    w.moveLane(1);
    w.moveLane(1);
    expect(w.player.lane).toBe(2);
  });

  it('bell enables magnet that pulls nearby sushi from other lanes', () => {
    const w = quietWorld();
    place(w, 'bell', 1, PLAYER_Y - 30);
    run(w, 0.2);
    expect(w.player.magnet).toBeGreaterThan(0);
    place(w, 'sushi', 0, PLAYER_Y - 40);
    run(w, 0.6);
    expect(w.score.sushi).toBe(1);
  });

  it('clock adds time', () => {
    const w = quietWorld();
    place(w, 'clock', 1, PLAYER_Y - 30);
    run(w, 0.3);
    expect(w.timeLeft).toBeGreaterThan(RUN_SECONDS - 0.3 + 2.5);
  });
});

describe('world: run lifecycle', () => {
  it('ends after 60 seconds with a timeUp event', () => {
    const w = new World({ mode: 'free', seed: 42 });
    const ev = run(w, RUN_SECONDS + 15);
    expect(w.finished).toBe(true);
    expect(ev.filter((e) => e.type === 'timeUp')).toHaveLength(1);
    expect(w.elapsed).toBeGreaterThanOrEqual(RUN_SECONDS - 0.01);
    expect(w.elapsed).toBeLessThanOrEqual(RUN_SECONDS + MAX_TIME_BONUSES * 3 + 0.1);
    // ignores input after finishing
    w.moveLane(1);
    w.jump();
    expect(w.drainEvents()).toHaveLength(0);
  });

  it('is deterministic for a given seed', () => {
    const a = new World({ mode: 'free', seed: 7 });
    const b = new World({ mode: 'free', seed: 7 });
    run(a, 20);
    run(b, 20);
    expect(a.entities.map((e) => `${e.kind}${e.lane}`)).toEqual(b.entities.map((e) => `${e.kind}${e.lane}`));
    expect(a.score).toEqual(b.score);
  });

  it('speeds up over the run', () => {
    const w = new World({ mode: 'free', seed: 3 });
    // keep Koinu out of trouble so stun doesn't distort speed
    w.player.invuln = 999;
    run(w, 1);
    const early = w.speed;
    run(w, 45);
    expect(w.speed).toBeGreaterThan(early);
  });
});

describe('world: spawn fairness', () => {
  it('never blocks all lanes and never stacks tall carts on consecutive rows', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const w = new World({ mode: 'free', seed });
      w.elapsed = 55; // max difficulty
      let lastTallRow = -10;
      for (let row = 0; row < 300; row++) {
        const before = w.entities.length;
        w.spawnRow(-50);
        const rowEntities = w.entities.slice(before);
        const hazards = rowEntities.filter((e) => isHazard(e.kind));
        const hazardLanes = new Set(hazards.map((e) => e.lane));
        expect(hazardLanes.size).toBeLessThanOrEqual(2);
        expect(hazards.length).toBe(hazardLanes.size); // one hazard per lane max
        const tall = rowEntities.filter((e) => e.kind === 'cart');
        expect(tall.length).toBeLessThanOrEqual(1);
        if (tall.length) {
          expect(row - lastTallRow).toBeGreaterThanOrEqual(2);
          lastTallRow = row;
        }
        // sushi never shares a lane with a hazard on the same row
        for (const s of rowEntities.filter((e) => e.kind === 'sushi')) expect(hazardLanes.has(s.lane)).toBe(false);
        w.entities = [];
      }
    }
  });
});

describe('festival mode', () => {
  it('runs bonus stages that clear hazards and spawn only sushi', () => {
    const w = new World({ mode: 'festival', seed: 5 });
    w.player.invuln = 999;
    run(w, FESTIVAL_BONUS_STARTS[0]! - 0.5);
    expect(w.bonusActive).toBe(false);
    const ev = run(w, 1);
    expect(ev.some((e) => e.type === 'bonusStart')).toBe(true);
    expect(w.bonusActive).toBe(true);
    expect(w.entities.filter((e) => e.active && isHazard(e.kind))).toHaveLength(0);
    run(w, 3);
    expect(w.entities.filter((e) => e.active && isHazard(e.kind))).toHaveLength(0);
    const ev2 = run(w, 3);
    expect(ev2.some((e) => e.type === 'bonusEnd')).toBe(true);
  });

  it('free mode never triggers bonus stages', () => {
    const w = new World({ mode: 'free', seed: 5 });
    const ev = run(w, 50);
    expect(ev.some((e) => e.type === 'bonusStart')).toBe(false);
  });
});
