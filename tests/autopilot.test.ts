import { expect, it } from 'vitest';
import { World } from '../src/game/world';
import { PLAYER_Y, LANE_X } from '../src/game/config';
let r = 12345;
const rand = () => ((r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

/** Simple greedy autopilot used as a whole-run smoke test (and to sanity-check score ranges). */
function bot(w: World, skill: number) {
  const p = w.player;
  // look ahead
  const ahead = w.entities.filter(e => e.active && e.y < PLAYER_Y + 10 && e.y > PLAYER_Y - 220);
  const tall = (lane: number) => ahead.some(e => e.lane===lane && e.kind==='cart' && e.y > PLAYER_Y-170);
  if (rand() > skill) return;
  if (tall(p.lane)) { const opts=[p.lane-1,p.lane+1].filter(l=>l>=0&&l<3&&!tall(l)); if(opts.length) w.moveLane((opts[0]!-p.lane) as -1|1); return; }
  const low = ahead.find(e=>e.lane===p.lane&&(e.kind==='crate'||e.kind==='wasabi')&&e.y>PLAYER_Y-75&&e.y<PLAYER_Y-30);
  if (low) { w.jump(); return; }
  const sushi = ahead.filter(e=>e.kind==='sushi').sort((a,b)=>b.y-a.y)[0];
  if (sushi && sushi.lane!==p.lane && !tall(sushi.lane) && p.x===LANE_X[p.lane]) w.moveLane(sushi.lane>p.lane?1:-1);
}
it('autopilot completes full runs in both modes with sane results', () => {
  for (const mode of ['free', 'festival'] as const) {
    for (let seed = 1; seed <= 5; seed++) {
      const w = new World({ mode, seed });
      let frames = 0;
      while (!w.finished && frames < 60 * 90) {
        bot(w, 0.9);
        w.update(1 / 60);
        w.drainEvents();
        frames++;
      }
      expect(w.finished).toBe(true);
      expect(w.score.score).toBeGreaterThan(0);
      expect(w.score.sushi).toBeGreaterThan(30);
      expect(Number.isFinite(w.score.score)).toBe(true);
      // entity list stays bounded (no leaks)
      expect(w.entities.length).toBeLessThan(80);
    }
  }
});
