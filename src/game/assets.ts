/**
 * Art hooks.
 *
 * The original Koinu puppy image has NOT been supplied yet. Until it is, Koinu is drawn
 * procedurally (src/game/sprites.ts) and the website shows public/assets/koinu-placeholder.svg,
 * which is visibly marked as temporary art.
 *
 * When the original art arrives: add it as public/assets/koinu.png (square, transparent
 * background, ~512px) and set KOINU_ART_URL to '/assets/koinu.png'. The renderer will draw it
 * in place of the procedural body; costumes still layer on top.
 */
export const KOINU_ART_URL: string | null = null;

let koinuImage: HTMLImageElement | null = null;

export function loadKoinuArt(): HTMLImageElement | null {
  if (!KOINU_ART_URL || typeof Image === 'undefined') return null;
  if (!koinuImage) {
    koinuImage = new Image();
    koinuImage.decoding = 'async';
    koinuImage.src = KOINU_ART_URL;
  }
  return koinuImage.complete && koinuImage.naturalWidth > 0 ? koinuImage : null;
}
