# public/assets/v2

Drop-in art for issue #8. Wire the **PNG** files. Japanese in the PNGs is already drawn, so it does not depend on a webfont.

No ticker is drawn on any file. The ticker, when copy needs a name, is **$Nori-Chan**.

`koinu.png` (512×512) is the reference already on this branch: the owner's round orange puppy. Do not replace it.

| PNG | Size | Notes |
| --- | --- | --- |
| nori-chan.png | 1024×1280 | Pink kimono, matcha apron with のり, white hachimaki, tray of three nigiri. Transparent. |
| koinu/idle.png, koinu/roll-1.png … roll-4.png | 256×256 | Same puppy as `koinu.png`. Roll-1 and roll-3 squash; roll-2 and roll-4 turn ±14°. |
| sushi/maguro salmon tamago maki ikura golden .png | 128×128 | Tiny faces, ink outlines. Transparent. |
| hazards/wasabi.png, crate.png | 128×128 | Crate is marked 魚. |
| hazards/cart.png | 160×200 | Taller than the crate. Noren says すし. Lantern on the roof. |
| powerups/bell.png, clock.png | 128×128 | Bell, and a clock marked +3. |
| street/shop-left-day.png, shop-right-day.png | 64×340 | Day lane edges. Top and bottom bands match so the strip can repeat. |
| street/shop-left-night.png, shop-right-night.png | 64×340 | 夜桜まつり edges, lantern lit. |
| street/stone-day.png, stone-night.png | 128×128 | Center path. Grout meets the tile edge. |
| share.png | 1200×630 | Title is こいぬコロコロ！ Filled background. No ticker, no price. |
| live-board.png | 1400×900 | Kitchen board. Noren says 寿司. Four columns. Blank tickets. 準備中. |

Sprites other than the share image, the board, and the street tiles have transparent backgrounds. The street tiles are opaque so they can repeat.

## Koinu

Idle and the four roll frames are resized and transformed from `koinu.png`. They are not a new cartoon dog. The illustrated sprites around them use thick ink outlines so they still read at 40px. The photo puppy still reads as a round face at 40px.

## Share image

Title string is こいぬコロコロ！ (こいぬ + コロコロ + ！). Subtitle is のりちゃん × こいぬ. Nori-chan is on the left. The puppy on the right is `koinu.png`. No ticker and no price.

## Live board

Indigo noren with 寿司, one column per seat (Claude, Codex, Grok, Muse), blank tickets, status 準備中. No prices and no ticker.

## Palette

Ink `#4a3036`. Cream `#fff6e8`. Pink `#ff9fbf`. Matcha `#8fb573`. Wood `#d79a62`. Nori green `#2f4a2e`. The puppy's orange is the reference photo, not this palette.
