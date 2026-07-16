# 検索・アクセス解析の運用手順

## 公開後に必要な手動設定

### 1. Google Search Console

1. Search Consoleで `https://game-portal-4nw.pages.dev/` をURLプレフィックスプロパティとして追加する。
2. HTMLタグ方式を選び、表示された確認用metaタグを `index.html` の `<head>` に追加する。
3. Cloudflare Pagesへ再デプロイしてから、Search Consoleで「確認」を実行する。
4. 「サイトマップ」で `sitemap.xml` を送信する。
5. URL検査で次の代表ページを検査し、「インデックス登録をリクエスト」する。
   - `https://game-portal-4nw.pages.dev/`
   - `https://game-portal-4nw.pages.dev/play/2048/`
   - `https://game-portal-4nw.pages.dev/play/sudoku/`
   - `https://game-portal-4nw.pages.dev/games/random-shogi/`
   - `https://game-portal-4nw.pages.dev/games/yonmai-mahjong/`

確認用metaタグはGoogleアカウント固有なので、値を推測して追加しないこと。

### 2. GA4とSearch Consoleの連携

1. GA4の「管理」を開く。
2. 「サービス間のリンク設定」から「Search Consoleのリンク」を開く。
3. 上記Search Consoleプロパティと、Game Shelfのウェブストリームを選択する。
4. 連携後、「レポート」→「ライブラリ」でSearch Consoleコレクションを公開する。

検索クエリのデータ反映には通常、公開直後から一定の時間が必要になる。

## URL構成

- ポータル: `/`
- 内部ゲーム: `/play/{game-id}/`
- ランダム将棋: `/games/random-shogi/`
- 四枚麻雀本体: `/games/yonmai-mahjong/`
- 旧URL `/?game={game-id}` も互換性のため利用可能だが、canonicalは固定URLを示す。

ビルド時に `scripts/generate-search-pages.mjs` が以下を自動生成する。

- 全公開ゲームを列挙した `sitemap.xml`
- 内部ゲームごとの静的HTML入口
- ページ固有のtitle、description、canonical、OGP、X Card
- `VideoGame`構造化データ

## UTMパラメータの命名規則

外部へ掲載するURLには、投稿元を判別できるUTMパラメータを付ける。

| 掲載先 | `utm_source` | `utm_medium` |
| --- | --- | --- |
| X | `x` | `social` |
| YouTube Shorts | `youtube` | `video` |
| Bluesky | `bluesky` | `social` |
| Reddit | `reddit` | `community` |
| Androidアプリ | `yonmai_android` | `app` |

`utm_campaign` は企画単位で統一する。例: `portal_launch`、`solitaire_update`、`summer_games_2026`。

例:

```text
https://game-portal-4nw.pages.dev/play/2048/?utm_source=x&utm_medium=social&utm_campaign=portal_launch
```

```text
https://game-portal-4nw.pages.dev/play/yonmai-mahjong/?utm_source=yonmai_android&utm_medium=app&utm_campaign=web_portal
```

投稿ごとの差を比較したい場合だけ `utm_content` を追加する。

```text
utm_content=gameplay_clip_01
```

URL短縮サービスを使う場合も、短縮前のリンクへUTMパラメータを付ける。

## GA4で確認する項目

- 集客 → トラフィック獲得 → セッションの参照元／メディア
- エンゲージメント → ランディングページ
- `game_open` イベント数
- ランディングページ別の平均エンゲージメント時間
- `utm_campaign` 別のゲーム起動率

サイト管理者自身の確認アクセスが多い期間は、ユーザー数や滞在時間を一般訪問者の傾向として扱わない。
