# Third-Party Notices

このプロジェクトは以下のオープンソースソフトウェアを同梱しています。

---

## gif.js

- **バージョン**: 0.2.0
- **配置場所**: `js/lib/gif.js`, `js/lib/gif.worker.js`
- **リポジトリ**: https://github.com/jnordberg/gif.js
- **作者**: Johan Nordberg
- **ライセンス**: MIT License

```
The MIT License (MIT)

Copyright (c) 2013 Johan Nordberg

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

---

## 使用しているフォント

本プロジェクトはOSが標準で備える日本語フォントを CSS の `font-family` で指定しているのみで、
**フォントファイル自体は同梱していません**。指定しているフォントは以下のとおりです：

- `-apple-system`, `BlinkMacSystemFont` … OSのシステムフォント（Apple系）
- `"Hiragino Sans"` … macOS / iOS 標準
- `"Noto Sans JP"` … 多くのAndroid / Linux に同梱
- `"Segoe UI"`, `"Yu Gothic UI"`, `"Meiryo"` … Windows 標準
- フォールバック: `sans-serif`

---

## アイコン

`icons/` 配下の各画像はプロジェクト独自に作成したものです。
ユーザーが自前のアイコンに差し替えても問題ありません。
