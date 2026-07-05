# 四枚麻雀 Web

Android版「四枚麻雀」を基にした、広告・課金なしのブラウザゲームです。

牌画像は `E:\SD\Codex\mahjong-hai-illust.jpg` の牌一覧を34種のPNGへ切り出し、`public/tiles` に登録しています。

## 開発

```powershell
npm.cmd install
npm.cmd run dev
```

Windowsでは `start-dev.cmd` をダブルクリックしても起動できます。表示されたコンソール画面は、プレイ中は閉じないでください。

ブラウザからは次のURLを開きます。

```text
http://127.0.0.1:4173/
```

## テストとビルド

```powershell
npm.cmd test
npm.cmd run build
```

本番用ファイルは `dist` に生成されます。静的サイトとして配信でき、PWAとしてホーム画面追加とオフライン起動に対応します。

本番ビルドをローカル確認する場合は `start-preview.cmd` を利用できます。
