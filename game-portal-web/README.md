# Game Shelf

- イラストロジック: ポータル内ゲーム `?game=nonogram`

ローカル環境だけで動く、ブラウザゲーム用のポータルです。

外部プロジェクトとして動くゲームへのリンクと、ポータル内に直接実装した小さなゲームを同じ一覧に並べます。

## 登録済みゲーム

- ランダム将棋: `http://127.0.0.1:4174/`
- 四枚麻雀: `http://127.0.0.1:4173/`
- 2048: ポータル内ゲーム `?game=2048`
- 数独: ポータル内ゲーム `?game=sudoku`
- マインスイーパー: ポータル内ゲーム `?game=minesweeper`
- 神経衰弱: ポータル内ゲーム `?game=memory`
- 15パズル: ポータル内ゲーム `?game=slide15`
- ライツアウト: ポータル内ゲーム `?game=lightsOut`
- 反射神経テスト: ポータル内ゲーム `?game=reaction`
- タイピングゲーム: ポータル内ゲーム `?game=typing`
- 計算ゲーム: ポータル内ゲーム `?game=mentalMath`
- エイム練習: ポータル内ゲーム `?game=aimTrainer`
- スネーク: ポータル内ゲーム `?game=snake`
- ブロック崩し: ポータル内ゲーム `?game=breakout`
- ポン: ポータル内ゲーム `?game=pong`
- もぐらたたき: ポータル内ゲーム `?game=whackMole`
- 三目並べ: ポータル内ゲーム `?game=ticTacToe`
- オセロ / リバーシ: ポータル内ゲーム `?game=reversi`
- カラー判定ゲーム: ポータル内ゲーム `?game=colorJudge`
- ハングマン: ポータル内ゲーム `?game=hangman`
- ブラックジャック: ポータル内ゲーム `?game=blackjack`
- タワー・オブ・ハノイ: ポータル内ゲーム `?game=hanoi`
- コネクトフォー: ポータル内ゲーム `?game=connectFour`
- 迷路脱出: ポータル内ゲーム `?game=mazeEscape`
- Simon Says: ポータル内ゲーム `?game=simonSays`
- Nim: ポータル内ゲーム `?game=nim`
- Hit & Blow: ポータル内ゲーム `?game=hitBlow`
- ヨットダイス: ポータル内ゲーム `?game=yachtDice`
- Flood Fill: ポータル内ゲーム `?game=floodFill`
- さめがめ: ポータル内ゲーム `?game=sameGame`
- ペグ・ソリティア: ポータル内ゲーム `?game=pegSolitaire`
- Word Guess: ポータル内ゲーム `?game=wordGuess`
- 1to50: ポータル内ゲーム `?game=oneToFifty`
- Water Sort Puzzle: ポータル内ゲーム `?game=waterSort`
- ポーカー: ポータル内ゲーム `?game=poker`

## 開発サーバ

```powershell
npm.cmd install
npm.cmd run dev
```

ブラウザで `http://127.0.0.1:4172/` を開きます。

ルートにある `start-game-portal.cmd` を使うと、ポータル・四枚麻雀・ランダム将棋をまとめて起動できます。

## ビルド

```powershell
npm.cmd run build
```

成果物は `dist` に生成されます。

## 公開準備

静的ホスティングへの公開手順と注意点は [DEPLOYMENT.md](./DEPLOYMENT.md) にまとめています。

```powershell
npm.cmd run deploy:check
npm.cmd run preview:deploy
```

公開版では、ランダム将棋と四枚麻雀も `dist/games/` 配下に内包されます。

## ゲームの追加方針

ゲーム一覧は `src/games/gamesRegistry.ts` で管理します。

- 別プロジェクトで動くゲーム: `kind: "external"`
- ポータル内に実装するゲーム: `kind: "internal"`
- まだ実装前のカード: `status: "coming-soon"`

内蔵ゲームは `src/games/<game-id>/` 以下に、UIとロジックを分けて追加していく方針です。
