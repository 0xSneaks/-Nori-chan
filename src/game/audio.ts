/**
 * Tiny WebAudio synth: no audio files, no network. Pentatonic plucks that rise with the combo.
 * Must be unlocked from a user gesture (iOS Safari).
 */
const PENTA = [0, 2, 4, 7, 9]; // major pentatonic semitone offsets

function noteHz(base: number, step: number): number {
  const octave = Math.floor(step / PENTA.length);
  const deg = PENTA[((step % PENTA.length) + PENTA.length) % PENTA.length] ?? 0;
  return base * Math.pow(2, (deg + octave * 12) / 12);
}

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private nextNoteTime = 0;
  private _muted: boolean;
  night = false;

  constructor(muted: boolean) {
    this._muted = muted;
  }

  get muted(): boolean {
    return this._muted;
  }

  setMuted(m: boolean): void {
    this._muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.02);
  }

  /** Call from a click/tap/keydown handler. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this._muted ? 0 : 0.5;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, when = 0, slideTo?: number): void {
    const ctx = this.ctx;
    const out = this.master;
    if (!ctx || !out || this._muted) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  collect(combo: number): void {
    const step = Math.min(combo, 14);
    this.tone(noteHz(523.25, step), 0.12, 'triangle', 0.22);
    this.tone(noteHz(523.25, step + 2), 0.1, 'sine', 0.1, 0.04);
  }
  golden(): void {
    [0, 2, 4, 5].forEach((s, i) => this.tone(noteHz(659.25, s), 0.14, 'triangle', 0.18, i * 0.05));
  }
  jump(): void {
    this.tone(330, 0.16, 'sine', 0.18, 0, 620);
  }
  lane(): void {
    this.tone(880, 0.04, 'sine', 0.05);
  }
  hit(): void {
    this.tone(160, 0.25, 'sawtooth', 0.16, 0, 70);
    this.tone(90, 0.2, 'square', 0.08, 0.02);
  }
  powerup(): void {
    [0, 3, 5, 7].forEach((s, i) => this.tone(noteHz(523.25, s), 0.12, 'square', 0.08, i * 0.06));
  }
  countdown(final: boolean): void {
    this.tone(final ? 1046.5 : 523.25, final ? 0.3 : 0.12, 'triangle', 0.22);
  }
  gameOver(): void {
    [7, 5, 4, 2, 0].forEach((s, i) => this.tone(noteHz(392, s), 0.22, 'triangle', 0.18, i * 0.12));
  }
  fanfare(): void {
    [0, 2, 4, 7, 9, 10].forEach((s, i) => this.tone(noteHz(523.25, s), 0.16, 'triangle', 0.2, i * 0.07));
  }

  /** Gentle koto-ish loop scheduled ahead with a lookahead timer. */
  startMusic(): void {
    if (!this.ctx || this.musicTimer !== null) return;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    const melodyDay = [0, 2, 4, 2, 5, 4, 2, 0, 3, 4, 5, 7, 5, 4, 2, 1];
    const melodyNight = [5, 4, 2, 4, 0, 2, 4, 5, 7, 5, 4, 2, 4, 2, 0, -1];
    const schedule = () => {
      const ctx = this.ctx;
      if (!ctx) return;
      while (this.nextNoteTime < ctx.currentTime + 0.25) {
        const mel = this.night ? melodyNight : melodyDay;
        const step = mel[this.musicStep % mel.length] ?? 0;
        const when = this.nextNoteTime - ctx.currentTime;
        if (step >= 0) this.tone(noteHz(this.night ? 293.66 : 392, step), 0.35, 'triangle', 0.05, when);
        if (this.musicStep % 4 === 0) this.tone(noteHz(this.night ? 146.83 : 196, 0), 0.5, 'sine', 0.06, when);
        this.musicStep++;
        this.nextNoteTime += 0.24;
      }
    };
    schedule();
    this.musicTimer = window.setInterval(schedule, 80);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }
}
