# public/assets/v2

Drop-in art for issue #8. Wire the **PNG** files. SVGs are the ink-art source. Japanese in the PNGs is already drawn, so it does not depend on a webfont.

No ticker is drawn on any file. The ticker, when copy needs a name, is **$Nori-Chan**.

`koinu.png` (512×512) is the reference already on this branch: the owner's round orange puppy. Do not replace it.

| PNG | Size | Replaces |
| --- | --- | --- |
| nori-chan.png | 1024×1280 | `public/assets/nori-chan.svg` |
| koinu/idle.png, koinu/roll-1.png … roll-4.png | 256×256 | in-game Koinu. Same puppy as `koinu.png`. Roll-1 and roll-3 squash; roll-2 and roll-4 turn ±14°. |
| sushi/maguro salmon tamago maki ikura golden .png | 128×128 | `drawSushi` |
| hazards/wasabi.png, crate.png | 128×128 | wasabi, fish crate (魚) |
| hazards/cart.png | 160×200 | yatai. Taller than the crate. Noren says すし. |
| powerups/bell.png, clock.png | 128×128 | すず, +3 |
| street/shop-left-day.png, shop-right-day.png | 64×340 | day lane edges. Top and bottom bands match so the strip can repeat. |
| street/shop-left-night.png, shop-right-night.png | 64×340 | 夜桜まつり edges, lantern lit |
| street/stone-day.png, stone-night.png | 128×128 | center path. Grout meets the tile edge. |
| share.png | 1200×630 | OG image. Title is こいぬコロコロ！ Filled background. No ticker, no price. |
| live-board.png | 1400×900 | kitchen-board mockup |

Sprites other than the share image and the board have transparent backgrounds.

## Koinu

Idle and the four roll frames are resized and transformed from `koinu.png`. They are not a new cartoon dog. The rest of the set stays ink-outline so it still reads at 40px. The photo puppy still reads as a round face at 40px.

## Live board

Indigo noren with 寿司, one paper column per seat (Claude, Codex, Grok, Muse), blank tickets, status 準備中. Pink headers, cream paper, ink rules. No prices and no ticker.

## Palette

Ink `#4a3036`. Cream `#fff6e8`. Pink `#ff9fbf`. Matcha `#8fb573`. Wood `#d79a62`. Nori green `#2f4a2e`. The puppy's orange is the reference photo, not this palette.
