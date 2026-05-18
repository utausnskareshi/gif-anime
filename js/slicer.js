/* slicer.js — 画像入力＆コマ割り */
window.Slicer = (function () {

  function fileToImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
      img.src = url;
    });
  }

  function dataUrlToImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  // クリップボードから画像を取得
  async function readClipboardImage() {
    if (!navigator.clipboard || !navigator.clipboard.read) {
      throw new Error('この端末ではクリップボード読み取りに対応していません。');
    }
    const items = await navigator.clipboard.read();
    for (const item of items) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type);
          return await fileToImage(blob);
        }
      }
    }
    throw new Error('クリップボードに画像がありません。');
  }

  function drawGridOverlay(canvas, img, opts) {
    const ctx = canvas.getContext('2d');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);

    const { rows, cols, marginTop, marginLeft, marginBottom, marginRight, inset } = opts;
    const usableW = img.naturalWidth - marginLeft - marginRight;
    const usableH = img.naturalHeight - marginTop - marginBottom;
    const cellW = usableW / cols;
    const cellH = usableH / rows;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 64, 220, 0.85)';
    ctx.lineWidth = Math.max(2, img.naturalWidth / 320);
    ctx.setLineDash([Math.max(6, img.naturalWidth/80), Math.max(4, img.naturalWidth/120)]);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = marginLeft + c * cellW + inset;
        const y = marginTop + r * cellH + inset;
        const w = cellW - inset * 2;
        const h = cellH - inset * 2;
        ctx.strokeRect(x, y, w, h);
      }
    }
    ctx.restore();
  }

  // 切り出して各コマを canvas として返す
  function extractFrames(img, opts) {
    const { rows, cols, marginTop, marginLeft, marginBottom, marginRight, inset,
            flipOrder, columnFirst } = opts;
    const usableW = img.naturalWidth - marginLeft - marginRight;
    const usableH = img.naturalHeight - marginTop - marginBottom;
    const cellW = usableW / cols;
    const cellH = usableH / rows;

    const cells = [];
    const ordered = [];

    if (columnFirst) {
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          ordered.push({ r, c });
        }
      }
    } else {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ordered.push({ r, c });
        }
      }
    }
    if (flipOrder) {
      // 各行ごとに反転 / 縦優先なら各列ごとに反転
      const groups = [];
      const groupSize = columnFirst ? rows : cols;
      for (let i = 0; i < ordered.length; i += groupSize) {
        groups.push(ordered.slice(i, i + groupSize).reverse());
      }
      ordered.length = 0;
      groups.forEach(g => ordered.push(...g));
    }

    for (const { r, c } of ordered) {
      const sx = marginLeft + c * cellW + inset;
      const sy = marginTop + r * cellH + inset;
      const sw = cellW - inset * 2;
      const sh = cellH - inset * 2;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(sw));
      canvas.height = Math.max(1, Math.round(sh));
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      cells.push(canvas);
    }
    return cells;
  }

  return { fileToImage, dataUrlToImage, readClipboardImage, drawGridOverlay, extractFrames };
})();
