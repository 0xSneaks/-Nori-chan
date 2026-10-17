// @vitest-environment happy-dom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { GameHost } from '../src/game/game';
import type { World } from '../src/game/world';
import type { Renderer } from '../src/game/renderer';

// Keep the actual host, input, World, scoring and storage. Only canvas/audio output is mocked.
vi.mock('../src/game/renderer', () => ({ Renderer: class {
  countdown: number | null = null;
  setReducedMotion() {} setNight() {} resize() {} clearEffects() {} render() {}
  showBanner() {} burst() {} popup() {} firework() {} hitFx() {}
} }));

describe('game host lifecycle', () => {
  let game: GameHost;
  let now = 1000;
  let frame: FrameRequestCallback | null = null;
  const world = () => Reflect.get(game, 'world') as World;
  const renderer = () => Reflect.get(game, 'renderer') as Renderer;
  const phase = () => Reflect.get(game, 'phase') as string;
  const button = (selector: string) => document.querySelector<HTMLButtonElement>(selector)!;
  const pauseButton = () => button('.game-buttons button');
  const click = (action: string) => button(`[data-act="${action}"]`).click();
  const tick = (seconds: number, fps = 60) => {
    for (let i = 0; i < Math.ceil(seconds * fps); i++) {
      now += 1000 / fps;
      frame?.(now);
    }
  };
  function start() { game.openGame('free'); click('start'); tick(3.1); expect(phase()).toBe('playing'); }

  beforeAll(() => {
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frame = callback; return 1; });
    vi.stubGlobal('cancelAnimationFrame', () => { frame = null; });
    game = new GameHost({ canPlayFestival: () => false, festivalLabel: () => '' });
  });
  afterEach(() => { game.close(); localStorage.clear(); });

  it('plays free without an entitlement and refuses festival mode', () => {
    game.openGame('festival');
    expect(world().mode).toBe('free');
    expect(document.querySelector('.gp-mode')?.textContent).toContain('Free play');
  });
  it('freezes simulation during pause and resume countdown', () => {
    start(); tick(1);
    pauseButton().click();
    const elapsed = world().elapsed;
    const score = { ...world().score };
    tick(5);
    expect(world().elapsed).toBe(elapsed);
    expect(world().score).toEqual(score);
    click('resume'); tick(1);
    expect(world().elapsed).toBe(elapsed);
    tick(1); expect(world().elapsed).toBeGreaterThan(elapsed);
  });
  it('handles keys inside the dialog and keeps focus in the dialog from the canvas', () => {
    start();
    const canvas = document.querySelector<HTMLCanvasElement>('.game-canvas')!;
    canvas.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft', bubbles: true, cancelable: true }));
    expect(world().player.lane).toBe(0);
    canvas.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true, cancelable: true }));
    expect(world().player.jumpT).toBe(0);
    // happy-dom has no layout; supply visibility for the three toolbar buttons.
    for (const control of document.querySelectorAll('.game-buttons button')) {
      Object.defineProperty(control, 'offsetParent', { configurable: true, get: () => document.body });
    }
    const tab = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    canvas.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Close game');
    canvas.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP', bubbles: true }));
    expect(phase()).toBe('paused');
  });
  it('restarts a paused run with fresh state and the correct pause control', () => {
    start();
    const previous = world();
    previous.score.score = 100;
    previous.score.combo = 9;
    previous.player.magnet = 5;
    pauseButton().click(); click('restart');
    expect(world()).not.toBe(previous);
    expect(world().score.score).toBe(0);
    expect(world().score.combo).toBe(0);
    expect(world().timeLeft).toBe(60);
    expect(world().player.magnet).toBe(0);
    expect(pauseButton().getAttribute('aria-label')).toBe('Pause');
    tick(3.1); pauseButton().click(); expect(phase()).toBe('paused');
  });
  it('keeps the run timer tied to wall time at 10 FPS', () => {
    start();
    const w = world();
    w.entities = [];
    Reflect.set(w, 'nextRowAt', 1e9);
    const before = w.timeLeft;
    tick(10, 10);
    expect(w.timeLeft).toBeCloseTo(before - 10, 6);
  });
  it('clears a cancelled countdown on close and reopen', () => {
    game.openGame('free'); click('start'); tick(0.5);
    expect(renderer().countdown).not.toBeNull();
    game.close(); game.openGame('free');
    expect(phase()).toBe('menu');
    expect(renderer().countdown).toBeNull();
  });
  it('ends a full run, saves the result and starts again from zero', () => {
    start();
    world().score.score = 100;
    world().player.invuln = 999;
    tick(70);
    expect(phase()).toBe('over');
    expect(world().finished).toBe(true);
    expect(localStorage.getItem('koinu-korokoro:v1:scores:free')).toContain('score');
    click('start');
    expect(phase()).toBe('countdown');
    expect(world().score.score).toBe(0);
  });
});
