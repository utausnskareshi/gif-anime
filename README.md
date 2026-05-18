# gif-anime

X / Threads 投稿用のアニメーションGIFを、スマホだけで作成できる **オフライン対応 PWA** です。

ChatGPT などのAIで生成した「コマ割り画像」を取り込み、グリッド分割 → GIF化 → 端末へ保存までを完結します。

---

## 主な機能

- 📱 iPhone / Android で「ホーム画面に追加」してアプリのように使用可能
- 📦 一度開けばオフライン（機内モード）でも全機能動作（Service Worker）
- 🪄 **コマ割り画像生成プロンプト**を自動組み立て（ChatGPT等にコピペ）
- 📋 クリップボード貼り付け / ファイル選択 / ドラッグ&ドロップ / 複数画像直接モード
- ✂️ 行×列指定、境界線インセット、外周マージン、読み順反転、縦/横優先
- 🔁 並べ替え（ドラッグ）・除外・全反転
- 🎞️ 速度・ループ・順/逆/**ピンポン再生**・**イージング**・コマごとdelay
- 🎨 パレット色数・ディザリング・品質・**背景透過**・**テキストオーバーレイ**
- 🪧 **X / Threads / 正方形 / 9:16** ワンタップ最適化プリセット
- 🐤 64〜800px の幅広い出力サイズ（絵文字サイズもOK）
- 💾 共有シート（iOS: 写真へ）/ ダウンロード（Android）
- 💬 投稿用キャプション＋ハッシュタグ候補
- 🔄 入力内容を IndexedDB に自動保存

---

## 構成・技術

- **HTML5 + CSS3 + Vanilla JavaScript (ES2022)** — フレームワーク・ビルドツールなし
- **gif.js** (MIT) — GIFエンコーディング（同梱・オフライン動作）
- **Service Worker** — オフラインキャッシュ + 自動更新（stale-while-revalidate）
- **IndexedDB** — 作業セッション自動保存
- **Web Share API** — iOS の写真アプリ保存 / Android の共有先送出
- **Web Manifest** — ホーム画面追加 / スプラッシュ

```
gif-anime/
├── index.html              ランディング（導入手順 + 使い方）
├── app.html                PWA本体（3タブUI）
├── manifest.webmanifest    PWAマニフェスト
├── sw.js                   Service Worker
├── .nojekyll               GitHub Pages 用
├── css/
│   ├── landing.css
│   └── app.css
├── js/
│   ├── landing.js
│   ├── app.js              メインコントローラ
│   ├── prompt.js           プロンプト組み立て
│   ├── slicer.js           画像入力・分割
│   ├── overlay.js          テキスト・透過・整形
│   ├── gif-encoder.js      gif.js ラッパー
│   ├── storage.js          IndexedDB
│   ├── share.js            共有 / ダウンロード
│   └── lib/
│       ├── gif.js          gif.js (MIT)
│       └── gif.worker.js
├── icons/                  アイコン（独自）
├── LICENSE                 MIT
├── THIRD-PARTY-NOTICES.md
├── .gitignore
└── README.md
```

---

## ローカル動作確認

Service Worker のため `file://` では動かないので、静的 HTTP サーバーが必要です：

```bash
# Python があれば
python -m http.server 8080
# → http://localhost:8080/ を開く
```

Node 派なら `npx serve .` でも可。

---

## 使い方の流れ

1. **① プロンプト**：被写体・コマ数・グリッドなどを入力 → 「プロンプトを作る」 → コピー
2. **AIへ貼り付け**：ChatGPT 等にコピペし、コマ割り画像を生成 → スマホに保存
3. **② 画像取込**：貼り付け / ファイル選択 → 行×列指定 → 「切り出す」 → 並べ替え・除外
4. **③ 生成・保存**：プリセット選択 or 詳細設定 → 「GIFを生成」 → プレビュー確認 → 共有/保存

「簡単操作」のチップ＋プルダウンと、「詳細設定（こだわる人向け）」の二段構えUIで、初心者から細かく追い込みたい人まで対応します。

---

## カスタマイズ

### アイコンを差し替える

`icons/` 配下を独自の画像で上書きしてください。必要なファイルは以下です：

| ファイル名 | サイズ | 形式 |
|---|---|---|
| `icon-192.png` | 192×192 | PNG |
| `icon-512.png` | 512×512 | PNG |
| `icon-maskable-512.png` | 512×512 | PNG（セーフゾーン80%） |
| `apple-touch-icon.png` | 180×180 | PNG |
| `favicon-32.png` | 32×32 | PNG |
| `icon.svg` | 任意 | SVG（任意） |

差し替え後は `sw.js` の `CACHE_VERSION` を上げてからデプロイすると、既存ユーザーにも反映されます。

### テーマカラー

[`manifest.webmanifest`](manifest.webmanifest) の `theme_color` と [`css/app.css`](css/app.css) / [`css/landing.css`](css/landing.css) の `--accent` を編集してください。

---

## プライバシー

- 画像・キャプション等は **すべてブラウザ内で処理** されます
- 外部サーバーへの送信は一切ありません（GitHub Pages からのアセット取得を除く）
- ネットワーク接続なしでも全機能利用可能（初回キャッシュ後）

---

## ライセンス

- 本プロジェクト: [MIT License](LICENSE)
- 同梱ライブラリ: [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) を参照
