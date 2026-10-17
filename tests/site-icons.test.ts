// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';

vi.mock('../src/game/game', () => ({ GameHost: class { isOpen = false; openGame() {} } }));
vi.mock('../src/game/sprites', () => ({
  drawBell: vi.fn(), drawCart: vi.fn(), drawClock: vi.fn(), drawCrate: vi.fn(),
  drawKoinu: vi.fn(), drawSushi: vi.fn(), drawWasabi: vi.fn(),
}));

it('keeps icon CSS size stable when fonts trigger a second high-DPI paint', async () => {
  let loaded!: () => void;
  const ready = new Promise<void>(resolve => { loaded = resolve; });
  Object.defineProperty(document, 'fonts', { configurable: true, value: { ready } });
  vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(2);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ setTransform: vi.fn() } as unknown as CanvasRenderingContext2D);
  document.body.innerHTML = '<canvas data-icon="maguro" width="56" height="56"></canvas>';
  await import('../src/main');
  const icon = document.querySelector('canvas')!;
  expect(icon.style.width).toBe('56px');
  expect(icon.width).toBe(112);
  loaded(); await ready;
  expect(icon.style.width).toBe('56px');
  expect(icon.width).toBe(112);
  vi.restoreAllMocks();
});
