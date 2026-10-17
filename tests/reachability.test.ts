import { expect, it } from 'vitest';
import { MAX_SPEED, PLAYER_Y, ROW_SPACING } from '../src/game/config';
import { createScore } from '../src/game/scoring';
import { World, isHazard, type Entity, type Player } from '../src/game/world';

it('retains a collision-free path across sampled successive rows at maximum speed', () => {
  const dt = 1 / 20;
  const rows = 80;
  for (let seed = 1; seed <= 5; seed++) {
    const w = new World({ mode: 'free', seed });
    w.elapsed = 60; // maximum difficulty and speed throughout the search
    w.timeLeft = 1e9;
    Reflect.set(w, 'nextRowAt', 1e9);
    const hazards: Entity[] = [];
    for (let row = 0; row < rows; row++) {
      w.entities = [];
      w.spawnRow(-200 - row * ROW_SPACING);
      hazards.push(...w.entities.filter(e => isHazard(e.kind)));
    }
    let reachable = new Map<string, Player>([['start', { ...w.player }]]);
    const frames = Math.ceil((PLAYER_Y + 300 + rows * ROW_SPACING) / MAX_SPEED / dt);
    for (let frame = 0; frame < frames; frame++) {
      const travel = frame * dt * MAX_SPEED;
      const near = hazards.filter(e => Math.abs(e.y + travel - PLAYER_Y) < 110);
      const next = new Map<string, Player>();
      for (const state of reachable.values()) {
        for (const direction of [-1, 0, 1] as const) {
          for (const hop of state.jumpT < 0 ? [false, true] : [false]) {
            w.player = { ...state };
            w.entities = near.map(e => ({ ...e, y: e.y + travel, active: true }));
            w.score = createScore();
            w.events = [];
            if (direction) w.moveLane(direction);
            if (hop) w.jump();
            // Exercise real lane movement, jump timing and collision code.
            w.update(dt);
            if (w.score.hits !== 0) continue;
            const p = w.player;
            const key = `${p.lane}:${p.x}:${Math.round(p.jumpT / dt)}`;
            if (!next.has(key)) next.set(key, { ...p });
          }
        }
      }
      expect(next.size, `seed ${seed}, frame ${frame}`).toBeGreaterThan(0);
      reachable = next;
    }
  }
}, 20_000);
