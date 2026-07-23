# 共通対戦背景ランタイム素材

## 採用素材

- PNG: `/public/backgrounds/color-chain-battle-v1.png`
- WebP: `/public/backgrounds/color-chain-battle-v1.webp`
- サイズ: 1672 × 941 px
- 用途: `/test/color-chain-mascot/` の共通固定対戦背景
- 生成手段: Codex 組み込み画像生成
- 制作日: 2026-07-24

WebPを実ゲーム用、PNGを高画質の原本・再変換用として残す。WebP読込中
または読込失敗時は、背景色と重ねたCSSグラデーションを使用する。

## 構図上の安全領域

- 中央約42%: 盤面・HUD用の濃紺低コントラスト領域
- 左右: クロマ・敵キャラクター用の明るい魔法工房領域
- 外周5%: スマートフォン横画面でトリミングされても支障がない余白
- 前景粒子: CSS疑似要素として分離し、画面効果OFF時に停止

## 最終生成プロンプト

```text
Use case: stylized-concept
Asset type: 16:9 fixed battle background for a browser puzzle game
Primary request: Create a polished, colorful fantasy battle-stage background
for “Magical Chain,” themed around luminous magical chains, jewel-like color
magic, and a cheerful enchanted workshop/arena.
Scene/backdrop: A wide symmetrical magical arena with warm wood-and-brass
architectural framing, subtle brick and carved-stone details, glowing colored
crystals and chain-shaped magical ornaments. No characters, enemies, game
blocks, UI, text, logos, or symbols that resemble readable writing.
Style/medium: high-quality vibrant 2D game background illustration, clean
anime-fantasy mobile game aesthetic, painterly but crisp, suitable behind
translucent UI panels.
Composition/framing: strict 16:9 landscape. Preserve a broad dark navy central
safe area covering roughly the middle 42% of the image for the puzzle board and
HUD. The left and right thirds should be brighter, colorful character-stage
zones with balanced visual interest. Keep important details away from the
outermost 5% so the image can crop safely on PC and smartphone landscape.
Strong visual symmetry without looking mechanically mirrored.
Lighting/mood: energetic, friendly magical duel, rich but readable; luminous
cyan, violet, magenta, gold, and mint highlights against deep blue shadows.
Materials/textures: polished wood, antique brass, soft stone, translucent
crystals, faint magical particles, decorative chain links.
Constraints: background-only asset; the central gameplay area must remain dark,
low-contrast, and uncluttered; left and right zones may be brighter but must
still support foreground character art; no foreground floor that creates
perspective conflict; no text; no watermark; no border; no frame around the
entire image.
Avoid: characters, silhouettes, faces, monsters, witches, game pieces, UI
panels, score displays, readable runes, logos, excessive bloom, visual clutter
in the center, photorealism.
```
