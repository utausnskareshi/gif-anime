/* app.js — メインコントローラ */
(function () {
  'use strict';

  // ===== Service Worker =====
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW reg:', e));
  }

  // ===== ユーティリティ =====
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  let toastTimer = null;
  function toast(msg, kind = '') {
    const el = $('#toast');
    el.textContent = msg;
    el.className = 'toast show' + (kind ? ' ' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  // ===== 状態 =====
  const state = {
    sourceImage: null,        // <img>
    sourceCanvas: null,       // CanvasImageSource for slicing preview
    frames: [],               // [{canvas, excluded, text}]
    multiFiles: false,        // 複数画像直接モード
    lastBlob: null,
    lastFilename: 'anime.gif',
  };

  // ===== タブ =====
  function activateTab(name) {
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    $$('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + name));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  $$('.tab').forEach(t => t.addEventListener('click', () => activateTab(t.dataset.tab)));

  // ===== リセット =====
  $('#resetBtn').addEventListener('click', async () => {
    if (!confirm('作業内容をすべて破棄しますか？')) return;
    state.sourceImage = null;
    state.frames = [];
    state.lastBlob = null;
    await SessionStore.clear();
    location.reload();
  });

  // ============================================================
  // ① プロンプト生成
  // ============================================================
  $('#pBuild').addEventListener('click', () => {
    const text = PromptBuilder.build({
      subject: $('#pSubject').value,
      frames: $('#pFrames').value,
      gridMode: $('#pGrid').value,
      style: $('#pStyle').value,
      bgColor: $('#pBgColor').value,
      consistent: $('#pConsistent').checked,
      pingpong: $('#pPingpong').checked,
      extra: $('#pExtra').value,
    });
    $('#pResult').value = text;
    $('#pResultCard').hidden = false;
    $('#pResultCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    persistInputs();
  });

  $('#pCopy').addEventListener('click', async () => {
    const ok = await ShareUtil.copyText($('#pResult').value);
    toast(ok ? 'コピーしました' : 'コピーに失敗', ok ? 'ok' : 'err');
  });

  $('#pShare').addEventListener('click', async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: $('#pResult').value, title: 'コマ割り画像生成プロンプト' });
      } catch (e) { /* abort ok */ }
    } else {
      const ok = await ShareUtil.copyText($('#pResult').value);
      toast(ok ? '共有非対応のためコピーしました' : '失敗', ok ? 'ok' : 'err');
    }
  });

  // 入力の永続化
  function persistInputs() {
    SessionStore.save({
      prompt: {
        subject: $('#pSubject').value,
        frames: $('#pFrames').value,
        gridMode: $('#pGrid').value,
        style: $('#pStyle').value,
        bgColor: $('#pBgColor').value,
        consistent: $('#pConsistent').checked,
        pingpong: $('#pPingpong').checked,
        extra: $('#pExtra').value,
      }
    });
  }
  ['pSubject','pFrames','pGrid','pStyle','pBgColor','pConsistent','pPingpong','pExtra']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', persistInputs);
    });

  // ============================================================
  // ② 画像取込・コマ割り
  // ============================================================
  const dz = $('#dropzone');
  dz.addEventListener('click', () => $('#fileInput').click());
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop', async e => {
    e.preventDefault(); dz.classList.remove('over');
    const f = e.dataTransfer.files[0];
    if (f) await loadImageFromFile(f);
  });
  $('#fileInput').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (f) await loadImageFromFile(f);
    e.target.value = '';
  });

  // ドキュメントレベルでのペースト
  document.addEventListener('paste', async e => {
    if (!$('#panel-slice').classList.contains('active')) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) { await loadImageFromFile(blob); break; }
      }
    }
  });

  $('#pasteBtn').addEventListener('click', async () => {
    try {
      const img = await Slicer.readClipboardImage();
      onImageLoaded(img);
    } catch (e) {
      toast(e.message || '読み取り失敗', 'err');
    }
  });

  $('#multiInputBtn').addEventListener('click', () => $('#multiInput').click());
  $('#multiInput').addEventListener('change', async e => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    state.multiFiles = true;
    state.sourceImage = null;
    const frames = [];
    for (const f of files) {
      const img = await Slicer.fileToImage(f);
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      frames.push({ canvas: c, excluded: false, text: '' });
    }
    state.frames = frames;
    $('#sliceCard').hidden = true;
    renderFramesGrid();
    rebuildPerFrameUI();
    rebuildOverlayUI();
    $('#framesCard').hidden = false;
    toast(`${frames.length} 枚を取り込みました`, 'ok');
    e.target.value = '';
  });

  async function loadImageFromFile(file) {
    try {
      const img = await Slicer.fileToImage(file);
      state.multiFiles = false;
      onImageLoaded(img);
    } catch (e) {
      toast('画像を読み込めませんでした', 'err');
    }
  }

  function onImageLoaded(img) {
    state.sourceImage = img;
    state.frames = [];
    $('#sliceCard').hidden = false;
    $('#framesCard').hidden = true;
    redrawSlicePreview();
    $('#sliceCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // プリセットチップ
  $$('#presetChips .chip').forEach(c => {
    c.addEventListener('click', () => {
      $('#sRows').value = c.dataset.r;
      $('#sCols').value = c.dataset.c;
      redrawSlicePreview();
    });
  });

  // 詳細スライダーの値表示
  function bindRange(id, outId) {
    const el = document.getElementById(id);
    const out = document.getElementById(outId);
    if (!el || !out) return;
    const upd = () => { out.value = el.value; redrawSlicePreview(); };
    el.addEventListener('input', upd);
    upd();
  }
  bindRange('sInset', 'sInsetOut');
  bindRange('sMt', 'sMtOut');
  bindRange('sMl', 'sMlOut');
  bindRange('sMb', 'sMbOut');
  bindRange('sMr', 'sMrOut');
  ['sRows','sCols','sFlipOrder','sColumnFirst'].forEach(id => {
    document.getElementById(id).addEventListener('input', redrawSlicePreview);
    document.getElementById(id).addEventListener('change', redrawSlicePreview);
  });

  function getSliceOpts() {
    return {
      rows: Math.max(1, parseInt($('#sRows').value, 10) || 1),
      cols: Math.max(1, parseInt($('#sCols').value, 10) || 1),
      inset: parseInt($('#sInset').value, 10) || 0,
      marginTop: parseInt($('#sMt').value, 10) || 0,
      marginLeft: parseInt($('#sMl').value, 10) || 0,
      marginBottom: parseInt($('#sMb').value, 10) || 0,
      marginRight: parseInt($('#sMr').value, 10) || 0,
      flipOrder: $('#sFlipOrder').checked,
      columnFirst: $('#sColumnFirst').checked,
    };
  }

  function redrawSlicePreview() {
    if (!state.sourceImage) return;
    Slicer.drawGridOverlay($('#sliceCanvas'), state.sourceImage, getSliceOpts());
  }

  $('#sliceApply').addEventListener('click', () => {
    if (!state.sourceImage) return;
    const cells = Slicer.extractFrames(state.sourceImage, getSliceOpts());
    state.frames = cells.map(c => ({ canvas: c, excluded: false, text: '' }));
    renderFramesGrid();
    rebuildPerFrameUI();
    rebuildOverlayUI();
    $('#framesCard').hidden = false;
    $('#framesCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast(`${cells.length} コマ切り出しました`, 'ok');
  });

  function renderFramesGrid() {
    const grid = $('#framesGrid');
    grid.innerHTML = '';
    state.frames.forEach((f, i) => {
      const tile = document.createElement('div');
      tile.className = 'frame-tile' + (f.excluded ? ' excluded' : '');
      tile.draggable = true;
      tile.dataset.idx = i;
      const img = document.createElement('img');
      img.src = f.canvas.toDataURL('image/png');
      tile.appendChild(img);
      const badge = document.createElement('div');
      badge.className = 'badge';
      badge.textContent = (i + 1);
      tile.appendChild(badge);
      const x = document.createElement('button');
      x.className = 'x';
      x.textContent = f.excluded ? '↺' : '×';
      x.title = f.excluded ? '戻す' : '除外';
      x.addEventListener('click', e => {
        e.stopPropagation();
        f.excluded = !f.excluded;
        renderFramesGrid();
        rebuildPerFrameUI();
        rebuildOverlayUI();
      });
      tile.appendChild(x);
      setupDrag(tile);
      grid.appendChild(tile);
    });
    $('#frameCount').textContent = state.frames.length;
  }

  // ドラッグ並べ替え
  let dragSrcIdx = null;
  function setupDrag(tile) {
    tile.addEventListener('dragstart', e => {
      dragSrcIdx = +tile.dataset.idx;
      tile.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    tile.addEventListener('dragend', () => {
      tile.classList.remove('dragging');
      $$('.frame-tile').forEach(t => t.classList.remove('drop-target'));
    });
    tile.addEventListener('dragover', e => {
      e.preventDefault();
      tile.classList.add('drop-target');
    });
    tile.addEventListener('dragleave', () => tile.classList.remove('drop-target'));
    tile.addEventListener('drop', e => {
      e.preventDefault();
      tile.classList.remove('drop-target');
      const dst = +tile.dataset.idx;
      if (dragSrcIdx == null || dragSrcIdx === dst) return;
      const [moved] = state.frames.splice(dragSrcIdx, 1);
      state.frames.splice(dst, 0, moved);
      renderFramesGrid();
      rebuildPerFrameUI();
      rebuildOverlayUI();
    });
    // タッチドラッグの簡易代替（長押しで前後に移動）
    let touchStartY = 0;
    tile.addEventListener('touchstart', e => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
  }

  $('#reverseFrames').addEventListener('click', () => {
    state.frames.reverse();
    renderFramesGrid();
    rebuildPerFrameUI();
    rebuildOverlayUI();
  });
  $('#restoreFrames').addEventListener('click', () => {
    state.frames.forEach(f => f.excluded = false);
    renderFramesGrid();
    rebuildPerFrameUI();
    rebuildOverlayUI();
  });
  $('#gotoExport').addEventListener('click', () => activateTab('export'));

  // ============================================================
  // ③ 生成・プレビュー・保存
  // ============================================================
  function activeFrames() {
    return state.frames.filter(f => !f.excluded);
  }

  // 値表示バインド
  function bindOut(id, outId, transform) {
    const el = document.getElementById(id);
    const out = document.getElementById(outId);
    if (!el || !out) return;
    const upd = () => out.value = transform ? transform(el.value) : el.value;
    el.addEventListener('input', upd);
    upd();
  }
  bindOut('eDelay', 'eDelayOut');
  bindOut('eColors', 'eColorsOut');
  bindOut('eQual', 'eQualOut');
  bindOut('eTransTol', 'eTransTolOut');
  bindOut('oSize', 'oSizeOut');

  // 速さセレクト → スライダー連動
  $('#eSpeed').addEventListener('change', () => {
    $('#eDelay').value = $('#eSpeed').value;
    $('#eDelay').dispatchEvent(new Event('input'));
    rebuildPerFrameUI();
  });
  $('#eDelay').addEventListener('input', () => {
    rebuildPerFrameUI(true);
  });

  // プラットフォームプリセット
  const PRESETS = {
    x: { aspect: '1:1', size: 512, delay: 200, loop: 0, fit: 'cover' },
    threads: { aspect: '4:5', size: 640, delay: 220, loop: 0, fit: 'cover' },
    square: { aspect: '1:1', size: 640, delay: 200, loop: 0, fit: 'contain' },
    story: { aspect: '9:16', size: 720, delay: 200, loop: 0, fit: 'cover' },
  };
  $$('#platformChips .chip').forEach(c => {
    c.addEventListener('click', () => {
      const p = PRESETS[c.dataset.preset];
      if (!p) return;
      $$('#platformChips .chip').forEach(x => x.classList.toggle('active', x === c));
      $('#eAspect').value = p.aspect;
      $('#eSize').value = String(p.size);
      $('#eDelay').value = p.delay;
      $('#eDelay').dispatchEvent(new Event('input'));
      $('#eLoop').value = String(p.loop);
      $('#eFit').value = p.fit;
      toast('プリセット適用: ' + c.textContent.trim(), 'ok');
    });
  });

  // ハッシュタグchip
  $$('#tagChips .chip').forEach(c => {
    c.addEventListener('click', () => {
      c.classList.toggle('active');
      const tags = $$('#tagChips .chip.active').map(x => x.dataset.tag);
      const cap = $('#postCaption');
      const cur = cap.value.split('\n').filter(l => !l.startsWith('#')).join('\n').trimEnd();
      cap.value = (cur ? cur + '\n' : '') + tags.join(' ');
    });
  });

  // コマごとのdelay UI
  function rebuildPerFrameUI(updateValuesOnly = false) {
    const root = $('#perFrameDelays');
    const frames = activeFrames();
    const base = parseInt($('#eDelay').value, 10) || 200;
    if (!updateValuesOnly) {
      root.innerHTML = '<p class="muted small">↓ コマごとに個別調整（タメや緩急に）</p>';
      frames.forEach((f, i) => {
        const row = document.createElement('div');
        row.className = 'pf-row';
        const img = document.createElement('img');
        img.src = f.canvas.toDataURL('image/png');
        const range = document.createElement('input');
        range.type = 'range';
        range.min = 20; range.max = 2000; range.step = 10; range.value = base;
        range.dataset.idx = i;
        const v = document.createElement('div');
        v.className = 'v';
        v.textContent = base + 'ms';
        range.addEventListener('input', () => { v.textContent = range.value + 'ms'; });
        row.appendChild(img); row.appendChild(range); row.appendChild(v);
        root.appendChild(row);
      });
    } else {
      root.querySelectorAll('input[type=range]').forEach(r => {
        r.value = base;
        r.dispatchEvent(new Event('input'));
      });
    }
  }

  function rebuildOverlayUI() {
    const root = $('#overlayList');
    if (!root) return;
    root.innerHTML = '';
    activeFrames().forEach((f, i) => {
      const row = document.createElement('div');
      row.className = 'ov-row';
      const img = document.createElement('img');
      img.src = f.canvas.toDataURL('image/png');
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.placeholder = `${i + 1}コマ目の文字（空欄=表示しない）`;
      inp.value = f.text || '';
      inp.addEventListener('input', () => { f.text = inp.value; });
      row.appendChild(img); row.appendChild(inp);
      root.appendChild(row);
    });
  }

  function getExportSettings() {
    const aspect = $('#eAspect').value;
    const sizeSel = $('#eSize').value;
    let baseSize = sizeSel === 'original' ? null : parseInt(sizeSel, 10);
    let width, height;

    if (aspect === 'original' && state.frames[0]) {
      const c = state.frames[0].canvas;
      const scale = baseSize ? baseSize / Math.max(c.width, c.height) : 1;
      width = Math.round(c.width * scale);
      height = Math.round(c.height * scale);
    } else {
      const [aw, ah] = (aspect === 'original' ? '1:1' : aspect).split(':').map(Number);
      const long = baseSize || 512;
      if (aw >= ah) { width = long; height = Math.round(long * ah / aw); }
      else { height = long; width = Math.round(long * aw / ah); }
    }

    return {
      width, height,
      fit: $('#eFit').value,
      bgColor: $('#eBg').value,
      quality: parseInt($('#eQual').value, 10),
      dither: $('#eDither').checked,
      paletteColors: parseInt($('#eColors').value, 10),
      loop: parseInt($('#eLoop').value, 10),
      playback: $('#ePlayback').value,
      delayMs: parseInt($('#eDelay').value, 10),
      easing: $('#eEasing').checked,
      transparent: {
        enabled: $('#eTransparent').checked,
        color: $('#eTransColor').value,
        tolerance: parseInt($('#eTransTol').value, 10),
      },
      overlay: {
        sizePct: parseInt($('#oSize').value, 10),
        color: $('#oColor').value,
        stroke: $('#oStroke').value,
        align: $('#oAlign').value,
      },
      targetSize: parseInt($('#eTargetSize').value, 10) || 0,
    };
  }

  // ===== 生成 =====
  $('#generateBtn').addEventListener('click', async () => {
    const frames = activeFrames();
    if (frames.length < 2) { toast('コマが2つ以上必要です', 'err'); return; }

    const s = getExportSettings();
    const progressEl = $('#genProgress');
    const bar = $('#genBar');
    const text = $('#genText');
    progressEl.hidden = false; bar.style.width = '0%'; text.textContent = '準備中…';
    $('#generateBtn').disabled = true;

    try {
      // コマごとdelay
      const pfRanges = $$('#perFrameDelays input[type=range]');
      let perFrameDelays = pfRanges.length === frames.length
        ? pfRanges.map(r => parseInt(r.value, 10)) : null;
      let delays = GifEncoder.makeDelays(frames, {
        delayMs: s.delayMs,
        easing: s.easing,
        perFrameDelays
      });

      // 整形＋オーバーレイ
      const rendered = frames.map((f, i) => Overlay.renderFrame(f.canvas, {
        width: s.width, height: s.height, fit: s.fit, bgColor: s.bgColor,
        overlay: s.overlay,
        transparent: s.transparent,
      }, { text: f.text }));

      // 再生方向（ピンポン/逆再生）
      const expanded = GifEncoder.expandForPlayback(rendered, delays, s.playback);

      const encodeSettings = {
        quality: s.quality,
        dither: s.dither,
        loop: s.loop,
        delays: expanded.delays,
        bgColor: s.bgColor,
        transparent: s.transparent,
      };

      const blob = s.targetSize
        ? await GifEncoder.encodeWithTarget({
            frames: expanded.frames,
            settings: encodeSettings,
            target: s.targetSize,
            onProgress: p => {
              bar.style.width = Math.round(p * 100) + '%';
              text.textContent = Math.round(p * 100) + '%';
            },
            onAttempt: (n, info) => {
              text.textContent = `再エンコード ${n} 回目 (品質=${info.quality})`;
            },
          })
        : await GifEncoder.encode({
            frames: expanded.frames,
            settings: encodeSettings,
            onProgress: p => {
              bar.style.width = Math.round(p * 100) + '%';
              text.textContent = Math.round(p * 100) + '%';
            }
          });

      state.lastBlob = blob;
      const url = URL.createObjectURL(blob);
      $('#previewImg').src = url;
      $('#previewCard').hidden = false;
      $('#downloadBtn').href = url;
      state.lastFilename = makeFilename();
      $('#downloadBtn').download = state.lastFilename;

      const mb = (blob.size / 1024 / 1024).toFixed(2);
      const overLimit = blob.size > 15 * 1024 * 1024;
      $('#previewMeta').textContent =
        `${s.width}×${s.height}px / ${expanded.frames.length}コマ / ${mb} MB` +
        (overLimit ? ' ⚠ Xの上限15MB超' : '');
      toast(overLimit ? '生成完了（サイズが大きめです）' : '生成完了', overLimit ? 'err' : 'ok');
      $('#previewCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      console.error(e);
      toast('生成失敗: ' + (e.message || e), 'err');
    } finally {
      $('#generateBtn').disabled = false;
      setTimeout(() => { progressEl.hidden = true; }, 800);
    }
  });

  function makeFilename() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `anime_${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.gif`;
  }

  // 共有 / ダウンロード / キャプションコピー
  $('#shareBtn').addEventListener('click', async () => {
    if (!state.lastBlob) return;
    try {
      const result = await ShareUtil.shareBlob(state.lastBlob, state.lastFilename, $('#postCaption').value);
      if (result === 'unsupported') {
        const r = ShareUtil.downloadBlob(state.lastBlob, state.lastFilename);
        if (r === 'opened' || r === 'navigated') {
          toast('新しいタブで開きました。画像を長押し→「写真に保存」', 'ok');
        } else {
          toast('共有非対応のためダウンロードしました', 'ok');
        }
      } else if (result === 'shared') {
        toast('共有しました', 'ok');
      }
    } catch (e) {
      toast('共有失敗: ' + (e.message || e), 'err');
    }
  });

  // ダウンロードボタン: iOSではaタグのdownloadが効かないため長押し保存案内に変更
  $('#downloadBtn').addEventListener('click', (e) => {
    if (!state.lastBlob) return;
    if (ShareUtil.isIOS()) {
      e.preventDefault();
      ShareUtil.downloadBlob(state.lastBlob, state.lastFilename);
      toast('画像を長押し→「写真に保存」で保存できます', 'ok');
    }
  });

  $('#copyCaptionBtn').addEventListener('click', async () => {
    const cap = $('#postCaption').value.trim();
    if (!cap) { toast('キャプションが空です', 'err'); return; }
    const ok = await ShareUtil.copyText(cap);
    toast(ok ? 'キャプションをコピー' : 'コピー失敗', ok ? 'ok' : 'err');
  });

  // ===== セッション復元 =====
  (async function restore() {
    const data = await SessionStore.load();
    if (!data || !data.prompt) return;
    const p = data.prompt;
    if (p.subject != null) $('#pSubject').value = p.subject;
    if (p.frames != null) $('#pFrames').value = p.frames;
    if (p.gridMode != null) $('#pGrid').value = p.gridMode;
    if (p.style != null) $('#pStyle').value = p.style;
    if (p.bgColor != null) $('#pBgColor').value = p.bgColor;
    if (p.consistent != null) $('#pConsistent').checked = p.consistent;
    if (p.pingpong != null) $('#pPingpong').checked = p.pingpong;
    if (p.extra != null) $('#pExtra').value = p.extra;
  })();

  // ===== インストールバナー =====
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone;
    if (!standalone) $('#installModal').hidden = false;
  });
  $('#installModalBtn')?.addEventListener('click', async () => {
    $('#installModal').hidden = true;
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => {});
    deferredPrompt = null;
  });
  $('#installModalClose')?.addEventListener('click', () => {
    $('#installModal').hidden = true;
  });

})();
