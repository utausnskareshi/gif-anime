/* gif-encoder.js — gif.jsラッパー（イージング・ピンポン・最適化） */
window.GifEncoder = (function () {

  // イージング関数: ease-in-out
  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  // delayプロファイルを作成（個別delay指定があればそれを優先、なければ一括/イージング）
  function makeDelays(frames, opts) {
    const n = frames.length;
    if (Array.isArray(opts.perFrameDelays) && opts.perFrameDelays.length === n) {
      return opts.perFrameDelays.slice();
    }
    const base = opts.delayMs || 200;
    if (opts.easing) {
      const arr = [];
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0 : i / (n - 1);
        const e = easeInOut(t);
        const factor = 1.0 + 1.4 * Math.abs(e - 0.5) * 2;
        arr.push(Math.round(base * factor));
      }
      return arr;
    }
    return new Array(n).fill(base);
  }

  function expandForPlayback(frames, delays, mode) {
    if (mode === 'reverse') {
      return { frames: frames.slice().reverse(), delays: delays.slice().reverse() };
    }
    if (mode === 'pingpong') {
      const fwdFrames = frames.slice();
      const fwdDelays = delays.slice();
      const bwdFrames = frames.slice(1, -1).reverse();
      const bwdDelays = delays.slice(1, -1).reverse();
      return { frames: fwdFrames.concat(bwdFrames), delays: fwdDelays.concat(bwdDelays) };
    }
    return { frames, delays };
  }

  function encode({ frames, settings, onProgress }) {
    return new Promise((resolve, reject) => {
      if (!window.GIF) return reject(new Error('gif.js が読み込まれていません'));
      if (!frames.length) return reject(new Error('コマがありません'));

      const w = frames[0].width;
      const h = frames[0].height;

      const gif = new GIF({
        workers: Math.min(4, navigator.hardwareConcurrency || 2),
        quality: settings.quality || 10,
        width: w,
        height: h,
        workerScript: 'js/lib/gif.worker.js',
        dither: settings.dither ? 'FloydSteinberg' : false,
        repeat: (settings.loop != null) ? settings.loop : 0,
        transparent: settings.transparent && settings.transparent.enabled ? 0x00FF00FF : null,
        background: settings.bgColor || '#ffffff'
      });

      frames.forEach((c, i) => {
        gif.addFrame(c, { delay: settings.delays[i] || 200, copy: true });
      });

      gif.on('progress', p => onProgress && onProgress(p));
      gif.on('finished', blob => resolve(blob));
      gif.on('abort', () => reject(new Error('aborted')));
      try { gif.render(); } catch (e) { reject(e); }
    });
  }

  // 目標サイズに収まるまでパレット色数/品質を下げて再エンコード
  async function encodeWithTarget({ frames, settings, target, onProgress, onAttempt }) {
    let attempt = 0;
    let q = settings.quality || 10;
    let pal = settings.paletteColors || 128; // 参考（gif.jsは内部でNeuQuant）
    let curSettings = { ...settings };

    while (true) {
      onAttempt && onAttempt(attempt + 1, { quality: q });
      const blob = await encode({ frames, settings: curSettings, onProgress });
      if (!target || blob.size <= target) return blob;
      attempt++;
      if (attempt >= 4) return blob;
      // 品質を下げる（数値を上げると低品質・速い）
      q = Math.min(30, q + 6);
      curSettings = { ...curSettings, quality: q };
    }
  }

  return { encode, encodeWithTarget, makeDelays, expandForPlayback };
})();
