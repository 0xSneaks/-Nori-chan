import { describe, expect, it } from 'vitest';
import { HighScores, Settings, memoryStore, type KeyValueStore } from '../src/game/storage';
import {
  DevPreviewProvider,
  PaymentsNotConfiguredProvider,
  ServerEntitlementProvider,
  createEntitlements,
} from '../src/premium/entitlements';
import { COSTUMES, unlockedCostumes } from '../src/premium/costumes';

const entry = (score: number) => ({ score, sushi: 1, maxCombo: 1, date: '2026-10-17' });

describe('high scores', () => {
  it('keeps top 5 per mode, sorted, and reports rank', () => {
    const hs = new HighScores(memoryStore());
    expect(hs.submit('free', entry(100))).toBe(1);
    expect(hs.submit('free', entry(300))).toBe(1);
    expect(hs.submit('free', entry(200))).toBe(2);
    for (const s of [50, 60, 70]) hs.submit('free', entry(s));
    expect(hs.list('free').map((e) => e.score)).toEqual([300, 200, 100, 70, 60]);
    expect(hs.submit('free', entry(10))).toBe(0);
    expect(hs.best('free')).toBe(300);
    expect(hs.best('festival')).toBe(0);
  });

  it('rejects zero/invalid scores', () => {
    const hs = new HighScores(memoryStore());
    expect(hs.submit('free', entry(0))).toBe(0);
    expect(hs.submit('free', entry(Number.NaN))).toBe(0);
    expect(hs.list('free')).toEqual([]);
  });

  it('survives corrupted or throwing storage', () => {
    const corrupt: KeyValueStore = { getItem: () => '{not json', setItem: () => {} };
    expect(new HighScores(corrupt).list('free')).toEqual([]);
    const wrongShape: KeyValueStore = { getItem: () => '[{"score":"lots"}]', setItem: () => {} };
    expect(new HighScores(wrongShape).list('free')).toEqual([]);
    const throwing: KeyValueStore = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    const hs = new HighScores(throwing);
    expect(() => hs.submit('free', entry(5))).not.toThrow();
    const st = new Settings(throwing);
    expect(st.muted).toBe(false);
    expect(() => (st.muted = true)).not.toThrow();
  });

  it('persists settings', () => {
    const store = memoryStore();
    const st = new Settings(store);
    st.muted = true;
    st.costume = 'kitsune';
    const again = new Settings(store);
    expect(again.muted).toBe(true);
    expect(again.costume).toBe('kitsune');
  });
});

describe('premium entitlements', () => {
  it('production default is locked and checkout never succeeds', async () => {
    const p = createEntitlements(false);
    expect(p).toBeInstanceOf(PaymentsNotConfiguredProvider);
    const status = await p.getStatus();
    expect(status.festival).toBe(false);
    expect(status.source).toBe('none');
    const co = await p.startCheckout();
    expect(co.ok).toBe(false);
  });

  it('dev preview unlocks play but processes no payment', async () => {
    const p = createEntitlements(true);
    expect(p).toBeInstanceOf(DevPreviewProvider);
    expect((await p.getStatus()).festival).toBe(true);
    expect((await p.getStatus()).source).toBe('dev-preview');
    expect((await p.startCheckout()).ok).toBe(false);
  });

  it('server provider stub stays locked until implemented', async () => {
    const p = new ServerEntitlementProvider();
    expect((await p.getStatus()).festival).toBe(false);
    expect((await p.startCheckout()).ok).toBe(false);
  });

  it('client storage cannot grant premium', async () => {
    // Even if someone writes a fake flag into storage, the provider ignores it.
    globalThis.localStorage?.setItem?.('premium', 'true');
    expect((await createEntitlements(false).getStatus()).festival).toBe(false);
  });
});

describe('costumes', () => {
  it('unlock by festival best score; base costumes always available', () => {
    expect(unlockedCostumes(0)).toEqual(['none', 'hachimaki']);
    const all = unlockedCostumes(1_000_000);
    expect(all).toHaveLength(COSTUMES.length);
    const thresholds = COSTUMES.map((c) => c.unlockScore);
    expect([...thresholds].sort((a, b) => a - b)).toEqual(thresholds);
  });
});
