/* prompt.js — コマ割り画像生成プロンプトの組み立て */
window.PromptBuilder = (function () {

  function pickGrid(frames, mode) {
    if (mode && mode !== 'auto') {
      if (mode === '1xN') return { rows: 1, cols: frames };
      if (mode === 'Nx1') return { rows: frames, cols: 1 };
      if (mode === '2xN') return { rows: 2, cols: Math.ceil(frames / 2) };
      const m = mode.match(/^(\d+)x(\d+)$/);
      if (m) return { rows: +m[1], cols: +m[2] };
    }
    // auto
    const sqrt = Math.sqrt(frames);
    const rows = Math.round(sqrt);
    const cols = Math.ceil(frames / rows);
    return { rows, cols };
  }

  function build(opts) {
    const subject = (opts.subject || '').trim() || '何かが動いている短いアニメーション';
    const frames = Math.max(2, Math.min(64, parseInt(opts.frames || 4, 10)));
    const grid = pickGrid(frames, opts.gridMode);
    const style = (opts.style || '').trim();
    const bgColor = opts.bgColor || 'white';
    const consistent = !!opts.consistent;
    const pingpong = !!opts.pingpong;
    const extra = (opts.extra || '').trim();

    const bgDesc = {
      'white': '白い背景で、各コマの間を黒い細い線で区切る',
      'black': '黒い背景で、各コマの間を白い細い線で区切る',
      'transparent': '透過背景（または非常に薄いグレー背景）で、各コマの間を黒い細い線で区切る',
      'none': '各コマは隙間なく接合し、境界線は描かない'
    }[bgColor] || '白い背景で、各コマの間を黒い細い線で区切る';

    const lines = [];
    lines.push(`【目的】アニメーションGIF用の連続コマ画像を1枚にまとめて生成してください。`);
    lines.push('');
    lines.push(`【被写体・シーン】`);
    lines.push(subject);
    if (style) lines.push(`画風 / テイスト: ${style}`);
    lines.push('');
    lines.push(`【コマ割り】`);
    lines.push(`- コマ数: ${frames} コマ`);
    lines.push(`- 配置: ${grid.rows} 行 × ${grid.cols} 列 のグリッド`);
    lines.push(`- 各コマは同じサイズ・同じアスペクト比（推奨: 正方形 1:1）`);
    lines.push(`- 読み順: 左上から右へ、右端まで来たら次の行の左端へ（横優先）`);
    lines.push(`- ${bgDesc}`);
    lines.push('');
    lines.push(`【動きの作り方】`);
    lines.push(`- 連続した自然な動きを ${frames} 段階で表現する`);
    lines.push(`- 各コマの差分（動きの量）はだいたい等間隔`);
    if (pingpong) lines.push(`- 最後のコマから最初のコマへ自然に戻れる動き（ピンポン再生想定）`);
    if (consistent) {
      lines.push(`- キャラクターの顔・服装・体型・色味は全コマで完全に統一する`);
      lines.push(`- カメラ位置・構図・被写体の大きさは大きく変えない`);
    }
    lines.push('');
    lines.push(`【出力時の注意】`);
    lines.push(`- 文字・吹き出し・透かしは入れない`);
    lines.push(`- 余白は最小限、各コマの内容を縁いっぱいまで描く`);
    lines.push(`- 画像全体は正方形に近い比率で出力する`);
    if (extra) {
      lines.push('');
      lines.push(`【追加指示】`);
      lines.push(extra);
    }
    lines.push('');
    lines.push(`生成された画像は別のツールで自動的に ${grid.rows} × ${grid.cols} に分割してGIFアニメ化します。グリッドの整列を厳密に守ってください。`);
    return lines.join('\n');
  }

  return { build, pickGrid };
})();
