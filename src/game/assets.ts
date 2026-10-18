/**
 * Art hooks.
 *
 * Koinu uses the owner's original puppy image (public/assets/koinu.webp, 512px, transparent,
 * from the hand-off on branch grok/graphics, issue #8). Until it has loaded — or if it fails —
 * the renderer falls back to the procedural Koinu in src/game/sprites.ts.
 */
export const KOINU_ART_URL: string | null = `${import.meta.env.BASE_URL}assets/koinu.webp`;

let koinuImage: HTMLImageElement | null = null;

export function loadKoinuArt(onReady?: () => void): HTMLImageElement | null {
  if (!KOINU_ART_URL || typeof Image === 'undefined') return null;
  if (!koinuImage) {
    koinuImage = new Image();
    koinuImage.decoding = 'async';
    koinuImage.src = KOINU_ART_URL;
  }
  if (onReady && !(koinuImage.complete && koinuImage.naturalWidth > 0)) {
    koinuImage.addEventListener('load', onReady, { once: true });
  }
  return koinuImage.complete && koinuImage.naturalWidth > 0 ? koinuImage : null;
}

/**
 * Sprite sheet from the issue #8 graphics pack (public/assets/sprites, copied from
 * grok/graphics public/assets/v2). Each draw falls back to the procedural sprite until
 * its image has loaded, so the game never shows a blank item.
 */
export type SpriteKey =
  | 'sushi-maguro'
  | 'sushi-salmon'
  | 'sushi-tamago'
  | 'sushi-maki'
  | 'sushi-ikura'
  | 'sushi-golden'
  | 'bell'
  | 'clock'
  | 'crate'
  | 'wasabi'
  | 'cart'
  | 'shop-left-day'
  | 'shop-right-day'
  | 'shop-left-night'
  | 'shop-right-night'
  | 'stone-day'
  | 'stone-night';

const SPRITE_KEYS: SpriteKey[] = [
  'sushi-maguro',
  'sushi-salmon',
  'sushi-tamago',
  'sushi-maki',
  'sushi-ikura',
  'sushi-golden',
  'bell',
  'clock',
  'crate',
  'wasabi',
  'cart',
  'shop-left-day',
  'shop-right-day',
  'shop-left-night',
  'shop-right-night',
  'stone-day',
  'stone-night',
];

const sprites = new Map<SpriteKey, HTMLImageElement>();

export function preloadSprites(onAnyLoad?: () => void): void {
  if (typeof Image === 'undefined') return;
  for (const key of SPRITE_KEYS) {
    if (sprites.has(key)) continue;
    const img = new Image();
    img.decoding = 'async';
    if (onAnyLoad) img.addEventListener('load', onAnyLoad, { once: true });
    img.src = `${import.meta.env.BASE_URL}assets/sprites/${key}.webp`;
    sprites.set(key, img);
  }
}

export function sprite(key: SpriteKey): HTMLImageElement | null {
  const img = sprites.get(key);
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}
