/* overlay.js — テキストオーバーレイ・背景透過処理 */
window.Overlay = (function () {

  function applyTransparent(canvas, hexColor, tolerance) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const data = ctx.getImageData(0, 0, w, h);
    const px = data.data;
    const tr = parseInt(hexColor.slice(1, 3), 16);
    const tg = parseInt(hexColor.slice(3, 5), 16);
    const tb = parseInt(hexColor.slice(5, 7), 16);
    const tol2 = tolerance * tolerance * 3;
    for (let i = 0; i < px.length; i += 4) {
      const dr = px[i] - tr, dg = px[i+1] - tg, db = px[i+2] - tb;
      if (dr*dr + dg*dg + db*db <= tol2) {
        px[i+3] = 0;
      }
    }
    ctx.putImageData(data, 0, 0);
  }

  function drawText(canvas, text, opts) {
    if (!text) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const fontPx = Math.max(10, Math.round(W * (opts.sizePct || 8) / 100));
    ctx.save();
    ctx.font = `bold ${fontPx}px -apple-system, "Hiragino Sans", "Noto Sans JP", "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(2, fontPx * 0.16);
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;

    const padding = Math.round(fontPx * 0.5);
    let y;
    if (opts.align === 'top') y = padding + fontPx / 2;
    else if (opts.align === 'middle') y = H / 2;
    else y = H - padding - fontPx / 2;

    const lines = String(text).split(/\r?\n/);
    const lineH = fontPx * 1.15;
    const totalH = lineH * lines.length;
    let startY = y;
    if (opts.align === 'top') startY = padding + fontPx / 2;
    else if (opts.align === 'middle') startY = H / 2 - totalH / 2 + fontPx / 2;
    else startY = H - padding - totalH + fontPx / 2;

    lines.forEach((line, i) => {
      const yi = startY + i * lineH;
      ctx.strokeStyle = opts.stroke || '#000';
      ctx.strokeText(line, W / 2, yi);
      ctx.fillStyle = opts.color || '#fff';
      ctx.fillText(line, W / 2, yi);
    });
    ctx.restore();
  }

  // フレームを最終出力サイズへ整形＋オーバーレイ
  function renderFrame(srcCanvas, settings, frameOpts) {
    const { width, height, fit, bgColor, overlay, transparent } = settings;
    const out = document.createElement('canvas');
    out.width = width;
    out.height = height;
    const ctx = out.getContext('2d');

    if (!transparent || !transparent.enabled) {
      ctx.fillStyle = bgColor || '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    const sw = srcCanvas.width, sh = srcCanvas.height;
    let dw, dh, dx, dy;
    if (fit === 'stretch') {
      dw = width; dh = height; dx = 0; dy = 0;
    } else if (fit === 'cover') {
      const s = Math.max(width / sw, height / sh);
      dw = sw * s; dh = sh * s;
      dx = (width - dw) / 2; dy = (height - dh) / 2;
    } else {
      const s = Math.min(width / sw, height / sh);
      dw = sw * s; dh = sh * s;
      dx = (width - dw) / 2; dy = (height - dh) / 2;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(srcCanvas, dx, dy, dw, dh);

    if (overlay && frameOpts && frameOpts.text) {
      drawText(out, frameOpts.text, overlay);
    }

    if (transparent && transparent.enabled) {
      applyTransparent(out, transparent.color, transparent.tolerance);
    }

    return out;
  }

  return { drawText, applyTransparent, renderFrame };
})();
