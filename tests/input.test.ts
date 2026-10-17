// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Input, type Action } from '../src/game/input';

describe('keyboard and pointer input', () => {
  let surface: HTMLCanvasElement;
  let input: Input;
  let actions: Action[];
  beforeEach(() => {
    surface = document.createElement('canvas');
    document.body.append(surface);
    input = new Input(surface);
    actions = [];
    input.on(a => actions.push(a));
  });
  afterEach(() => { input.dispose(); document.body.replaceChildren(); });

  function key(code: string, target: HTMLElement = surface): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event;
  }
  function pointer(type: string, x: number, y: number, id = 1): void {
    surface.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true }));
  }

  it('leaves page keys alone outside the game surface', () => {
    expect(key('Space', document.body).defaultPrevented).toBe(false);
    expect(key('ArrowLeft', document.body).defaultPrevented).toBe(false);
    expect(actions).toEqual([]);
  });
  it('maps keys on the game surface and preserves focused button activation', () => {
    for (const code of ['ArrowLeft', 'KeyD', 'Space', 'KeyP', 'KeyM']) expect(key(code).defaultPrevented).toBe(true);
    expect(actions).toEqual(['left', 'right', 'jump', 'pause', 'mute']);
    const button = document.createElement('button');
    surface.append(button);
    expect(key('Space', button).defaultPrevented).toBe(false);
    expect(key('Enter', button).defaultPrevented).toBe(false);
  });
  it('does not consume editing/navigation keys in form fields', () => {
    const field = document.createElement('input');
    surface.append(field);
    expect(key('ArrowLeft', field).defaultPrevented).toBe(false);
    expect(key('KeyA', field).defaultPrevented).toBe(false);
    expect(actions).toEqual([]);
  });
  it('supports chained swipes, upward swipes and taps without a phantom hop', () => {
    pointer('pointerdown', 180, 400);
    pointer('pointermove', 120, 400);
    pointer('pointermove', 180, 400);
    pointer('pointermove', 180, 330);
    pointer('pointerup', 180, 330);
    expect(actions).toEqual(['left', 'right', 'jump']);
    pointer('pointerdown', 180, 400);
    pointer('pointerup', 180, 400);
    expect(actions).toEqual(['left', 'right', 'jump', 'jump']);
  });
  it('cancels interrupted gestures and ignores secondary pointers', () => {
    pointer('pointerdown', 180, 400);
    pointer('pointermove', 50, 400, 2);
    pointer('pointercancel', 180, 400);
    pointer('pointerup', 180, 400);
    expect(actions).toEqual([]);
    pointer('pointerdown', 180, 400, 3);
    pointer('pointerup', 180, 400, 3);
    expect(actions).toEqual(['jump']);
  });
});
