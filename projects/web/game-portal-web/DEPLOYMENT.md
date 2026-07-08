# 公開準備メモ

Game Shelf は React + Vite の静的サイトです。サーバー処理を使っていないため、まずは Netlify / Cloudflare Pages / Vercel / GitHub Pages のような静的ホスティングで公開できます。

ランダム将棋と四枚麻雀は、ポータルのビルド成果物の中にそれぞれ以下のパスで内包します。

- ランダム将棋: `/games/random-shogi/`
- 四枚麻雀: `/games/yonmai-mahjong/`

## 事前チェック

```powershell
npm.cmd install
npm.cmd run deploy:check
npm.cmd run preview:deploy
```

`dist` が公開対象です。

## 推奨設定

### Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- 付与URL例: `https://<site-name>.netlify.app/`
- このリポジトリでは `netlify.toml` と `public/_redirects` を用意済みです。

### Cloudflare Pages

- Framework preset: Vite
- Root directory: `projects/web/game-portal-web`
- Build command: `npm run build:cloudflare`
- Build output directory: `dist`
- Environment variables: `NODE_VERSION=22`
- 付与URL例: `https://<project-name>.pages.dev/`
- `public/_headers` はビルド時に `dist` へコピーされます。
- `_redirects` は置いていません。Cloudflare Pages では catch-all リダイレクトが既存アセットにも適用されるため、`/games/...` 配下の内包アプリを壊さないようにしています。

Cloudflare Pages のビルド環境で `../random-shogi-web` と `../yonmai-mahjong-web` を参照するため、リポジトリ上では以下の兄弟ディレクトリ構成を維持してください。

```text
repository-root/
  projects/
    web/
      game-portal-web/
      random-shogi-web/
      yonmai-mahjong-web/
```

もし Cloudflare Pages 側でリポジトリルートからビルドする設定にする場合は、以下でも構いません。

- Root directory: 空欄、またはリポジトリルート
- Build command: `npm --prefix projects/web/game-portal-web run build:cloudflare`
- Build output directory: `projects/web/game-portal-web/dist`

ランダム将棋は WASM / Worker を使うため、`public/_headers` で `/games/random-shogi/*` に以下のヘッダーを付与しています。

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`
- `Cross-Origin-Resource-Policy: same-origin`

### Vercel

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- 付与URL例: `https://<project-name>.vercel.app/`
- このリポジトリでは `vercel.json` を用意済みです。

### GitHub Pages

GitHub Pages でも公開できますが、リポジトリ名付きURL、例 `https://<user>.github.io/<repo>/` に公開する場合は、Vite の `base` と画像パスの調整が必要です。独自ドメインなしで手早く公開するなら、Netlify / Cloudflare Pages / Vercel の方が楽です。

## 現時点の注意点

ランダム将棋・四枚麻雀はポータル内に内包する構成へ変更済みです。公開サイト上では `127.0.0.1` を使いません。

ただし、Cloudflareへデプロイするリポジトリには `random-shogi-web` と `yonmai-mahjong-web` も含めてください。

## 公開前の最終確認

- `npm.cmd run deploy:check` が成功する
- `npm.cmd run preview:deploy` で主要ゲームを数本開ける
- ブラウザのコンソールにエラーがない
- スマホ幅で一覧とゲーム画面が崩れない
- `/games/random-shogi/` と `/games/yonmai-mahjong/` が開ける
