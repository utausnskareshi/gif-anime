/* share.js — 共有 / ダウンロード / クリップボード */
window.ShareUtil = (function () {

  function isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  async function shareBlob(blob, filename, text) {
    const file = new File([blob], filename, { type: blob.type || 'image/gif' });
    const canShareFiles = navigator.canShare && navigator.canShare({ files: [file] });
    if (canShareFiles || (navigator.share && isIOS())) {
      try {
        await navigator.share({ files: [file], title: 'GIFアニメ', text: text || '' });
        return 'shared';
      } catch (e) {
        if (e && e.name === 'AbortError') return 'abort';
        // iOS may throw if files aren't supported; fall through to fallback
        if (!canShareFiles) return 'unsupported';
        throw e;
      }
    }
    return 'unsupported';
  }

  // iOS用: GIFを新しいタブで開き、ユーザーが長押しで「写真に保存」できるようにする
  function openForLongPress(blob) {
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      // ポップアップブロックされた場合、現在のタブで開く
      location.href = url;
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return !!win;
  }

  function downloadBlob(blob, filename) {
    // iOSではaタグのdownload属性がほぼ効かないため、新タブで開いて長押し保存に誘導
    if (isIOS()) {
      return openForLongPress(blob) ? 'opened' : 'navigated';
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return 'downloaded';
  }

  async function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); ta.remove(); return true; }
    catch (e) { ta.remove(); return false; }
  }

  return { isIOS, shareBlob, downloadBlob, copyText };
})();
