export type Action = 'left' | 'right' | 'jump' | 'pause' | 'mute' | 'confirm';

const KEYMAP: Record<string, Action> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'jump',
  KeyW: 'jump',
  Space: 'jump',
  KeyP: 'pause',
  Escape: 'pause',
  KeyM: 'mute',
  Enter: 'confirm',
};

const SWIPE_MIN = 28; // px (CSS pixels)
const TAP_MAX_MS = 260;

/**
 * Keyboard + touch/pointer input. Swipes fire as soon as the threshold is crossed
 * (not on release) so lane changes feel instant on phones.
 */
export class Input {
  private handlers: Array<(a: Action) => void> = [];
  private startX = 0;
  private startY = 0;
  private startT = 0;
  private pointerId: number | null = null;
  private didSwipe = false;
  private readonly disposers: Array<() => void> = [];

  constructor(surface: HTMLElement) {
    const onKey = (e: KeyboardEvent) => {
      const action = KEYMAP[e.code];
      if (!action) return;
      // Leave Enter/Space alone on focused buttons so DOM menus stay keyboard-accessible.
      const target = e.target as HTMLElement | null;
      if ((action === 'confirm' || e.code === 'Space') && target?.closest('button, a, input, select, textarea')) return;
      if (e.repeat && action !== 'left' && action !== 'right') return;
      e.preventDefault();
      this.emit(action);
    };
    window.addEventListener('keydown', onKey);
    this.disposers.push(() => window.removeEventListener('keydown', onKey));

    const down = (e: PointerEvent) => {
      if (this.pointerId !== null) return;
      this.pointerId = e.pointerId;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.startT = performance.now();
      this.didSwipe = false;
      surface.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== this.pointerId) return;
      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return;
      this.didSwipe = true;
      if (Math.abs(dx) > Math.abs(dy)) this.emit(dx < 0 ? 'left' : 'right');
      else if (dy < 0) this.emit('jump');
      // Re-anchor so several swipes can chain without lifting the finger.
      this.startX = e.clientX;
      this.startY = e.clientY;
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== this.pointerId) return;
      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;
      const quick = performance.now() - this.startT < TAP_MAX_MS;
      const moved = Math.max(Math.abs(dx), Math.abs(dy)) >= 10;
      if (quick && !moved && !this.didSwipe) this.emit('jump');
      this.pointerId = null;
      this.didSwipe = false;
    };
    const cancel = (e: PointerEvent) => {
      if (e.pointerId === this.pointerId) this.pointerId = null;
      this.didSwipe = false;
    };
    surface.addEventListener('pointerdown', down);
    surface.addEventListener('pointermove', move);
    surface.addEventListener('pointerup', up);
    surface.addEventListener('pointercancel', cancel);
    this.disposers.push(() => {
      surface.removeEventListener('pointerdown', down);
      surface.removeEventListener('pointermove', move);
      surface.removeEventListener('pointerup', up);
      surface.removeEventListener('pointercancel', cancel);
    });
  }

  on(handler: (a: Action) => void): void {
    this.handlers.push(handler);
  }

  private emit(a: Action): void {
    for (const h of this.handlers) h(a);
  }

  dispose(): void {
    for (const d of this.disposers) d();
    this.handlers = [];
  }
}
