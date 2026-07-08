# ランダム将棋 Web

Android版「ランダム将棋」をベースにした、スマートフォン・PC向けブラウザゲームです。

## 起動

```powershell
npm install
npm run dev
```

開発サーバー: `http://127.0.0.1:4174`

## ビルド

```powershell
npm run build
```

生成物は `dist` に出力されます。

## 外部エンジン

難易度「難」では、GPL-3.0ライセンスの
[Fairy-Stockfish](https://github.com/fairy-stockfish/Fairy-Stockfish) と
[fairy-stockfish.wasm](https://github.com/fairy-stockfish/fairy-stockfish.wasm)
を使用します。配布時はGPL-3.0の条件に従い、対応するソースコードへの案内を維持してください。

## 主な機能

- 中終盤・終盤のランダム局面
- プレイヤー有利かつプレイヤー手番の開始局面
- 易・普通・難のCOM
- 難は約2.5秒の反復深化・αβ探索・静止探索
- Web Workerによる非同期思考
- 持ち駒、成り、王手・詰み判定
- 待った、投了、棋譜再生、任意局面からの再開
- 評価値、最終手ハイライト、終了音・終了ポップアップ
- 難易度と設定の保存
- スマートフォン・PC対応レイアウト
