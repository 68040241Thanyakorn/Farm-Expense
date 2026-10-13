// Register PWA service worker without changing the existing Farm Expense logic.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(reg => console.log('Farm Expense PWA ready:', reg.scope))
      .catch(err => console.warn('PWA registration failed:', err));
  });
}
