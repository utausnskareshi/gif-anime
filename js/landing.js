// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW reg failed:', err));
  });
}

// Tab switch
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const pane = btn.dataset.pane;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === btn));
    document.querySelectorAll('.pane').forEach(p => p.classList.toggle('active', p.id === 'pane-' + pane));
  });
});

// Install prompt (Android Chrome 限定 / iOSなど非対応端末では常に非表示)
let deferredPrompt = null;
const installPrompt = document.getElementById('installPrompt');
const installBtn = document.getElementById('installBtn');
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || '');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  if (isIOS) return; // iOSではこのイベントは発火しない想定だが、念のため抑止
  deferredPrompt = e;
  if (installPrompt) installPrompt.hidden = false;
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (installPrompt) installPrompt.hidden = true;
    void outcome;
  });
}

window.addEventListener('appinstalled', () => {
  if (installPrompt) installPrompt.hidden = true;
});

// Auto-detect platform and switch tab
(function autoTab() {
  const ua = navigator.userAgent || '';
  if (/Android/i.test(ua)) {
    document.querySelector('[data-pane="android"]')?.click();
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    document.querySelector('[data-pane="ios"]')?.click();
  }
})();
