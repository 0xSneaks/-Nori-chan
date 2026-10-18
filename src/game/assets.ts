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
