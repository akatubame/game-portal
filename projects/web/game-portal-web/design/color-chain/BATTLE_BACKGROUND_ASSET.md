# 共通対戦背景ランタイム素材

## 採用素材（現在）

- PNG: `/public/backgrounds/color-chain-battle-v2.png`
- WebP: `/public/backgrounds/color-chain-battle-v2.webp`
- サイズ: 1672 × 941 px
- 用途: `/test/color-chain-mascot/` の共通固定対戦背景
- 生成手段: Codex 組み込み画像生成
- 制作日: 2026-07-24

`color-chain-battle-v1.*` は比較・復帰用として保持する。

WebPを実ゲーム用、PNGを高画質の原本・再変換用として残す。WebP読込中
または読込失敗時は、背景色と重ねたCSSグラデーションを使用する。

## 構図上の安全領域

- 中央約42%: 盤面・HUD用の濃紺低コントラスト領域
- 左右: クロマ・敵キャラクター用の明るい魔法工房領域
- 外周5%: スマートフォン横画面でトリミングされても支障がない余白
- 前景粒子: CSS疑似要素として分離し、画面効果OFF時に停止

## 現行素材の生成プロンプト

```text
Use case: stylized-concept
Asset type: 16:9 fixed battle background for a browser puzzle game
Primary request: Create a bright, festive, nearly uniform magical surface
background for the game “Magical Chain.” It must look attractive across the
entire frame even when foreground UI panels cover the center.
Scene/backdrop: A continuous enchanted wall-and-floor texture blending warm
honey-colored wood grain, softly patterned sand-gold plaster, and small rounded
brickwork. Scatter many small jewel crystals and short decorative magic-chain
links evenly across the full scene, with no large focal object and no empty
center.
Style/medium: polished colorful 2D mobile puzzle game background, clean
anime-fantasy illustration, decorative rather than realistic.
Composition/framing: strict 16:9 landscape. Use an even all-over pattern with
gentle variation, suitable for cropping at the left/right edges and for use
behind translucent UI. Keep every region similarly detailed; no central doorway,
arch, pedestal, pillars, large frames, or symmetric stage composition.
Lighting/mood: cheerful magical workshop, warm and bright but low-contrast
enough that dark foreground boards and HUD remain readable.
Color palette: warm wood brown, sand beige, soft brick terracotta, gold, mint,
cyan, violet, and magenta jewel accents.
Materials/textures: subtle wood plank grain, rounded brick texture, sandy
painted wall texture, tiny faceted gems, small linked chains.
Constraints: background-only; no characters, no monsters, no witches, no game
blocks, no UI, no text, no readable runes, no logos, no watermark. Small
ornaments must be distributed evenly and remain secondary to foreground UI.
Avoid: large empty dark area, large architectural structures, a frame around
the image, heavy shadows, perspective floor, dramatic vignette, central focal
point, photorealism.
```
