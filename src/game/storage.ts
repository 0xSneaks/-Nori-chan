import type { GameMode } from './world';

/** Minimal storage surface so tests can inject a fake and Safari private mode can't crash us. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface HighScore {
  score: number;
  sushi: number;
  maxCombo: number;
  date: string; // ISO date
}

const MAX_ENTRIES = 5;
const KEY_PREFIX = 'koinu-korokoro:v1:';

export function memoryStore(): KeyValueStore {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

export function browserStore(): KeyValueStore {
  try {
    const ls = globalThis.localStorage;
    const probe = `${KEY_PREFIX}probe`;
    ls.setItem(probe, '1');
    return ls;
  } catch {
    return memoryStore();
  }
}

function safeRead<T>(store: KeyValueStore, key: string, fallback: T, valid: (v: unknown) => v is T): T {
  try {
    const raw = store.getItem(KEY_PREFIX + key);
    if (raw == null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return valid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(store: KeyValueStore, key: string, value: unknown): void {
  try {
    store.setItem(KEY_PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota / private mode: ignore */
  }
}

function isHighScoreList(v: unknown): v is HighScore[] {
  return (
    Array.isArray(v) &&
    v.every(
      (e) =>
        typeof e === 'object' &&
        e !== null &&
        Number.isFinite((e as HighScore).score) &&
        Number.isFinite((e as HighScore).sushi) &&
        Number.isFinite((e as HighScore).maxCombo) &&
        typeof (e as HighScore).date === 'string',
    )
  );
}

export class HighScores {
  constructor(private readonly store: KeyValueStore) {}

  list(mode: GameMode): HighScore[] {
    return safeRead(this.store, `scores:${mode}`, [], isHighScoreList).slice(0, MAX_ENTRIES);
  }

  best(mode: GameMode): number {
    return this.list(mode)[0]?.score ?? 0;
  }

  /** Inserts a result; returns its rank (1-based) or 0 if it didn't place. */
  submit(mode: GameMode, entry: HighScore): number {
    if (!Number.isFinite(entry.score) || entry.score <= 0) return 0;
    const list = this.list(mode);
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    const trimmed = list.slice(0, MAX_ENTRIES);
    safeWrite(this.store, `scores:${mode}`, trimmed);
    const rank = trimmed.indexOf(entry);
    return rank === -1 ? 0 : rank + 1;
  }
}

export class Settings {
  constructor(private readonly store: KeyValueStore) {}

  get muted(): boolean {
    return safeRead(this.store, 'muted', false, (v): v is boolean => typeof v === 'boolean');
  }
  set muted(v: boolean) {
    safeWrite(this.store, 'muted', v);
  }

  get tutorialSeen(): boolean {
    return safeRead(this.store, 'tutorialSeen', false, (v): v is boolean => typeof v === 'boolean');
  }
  set tutorialSeen(v: boolean) {
    safeWrite(this.store, 'tutorialSeen', v);
  }

  get costume(): string {
    return safeRead(this.store, 'costume', '', (v): v is string => typeof v === 'string');
  }
  set costume(v: string) {
    safeWrite(this.store, 'costume', v);
  }
}
