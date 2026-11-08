// 11-08: past the hero the header stays hidden while reading down, and
// slides back in from the top as soon as the visitor scrolls up a little.
(() => {
  const header = document.querySelector('.site-header');
  if (!header) return;
  let lastY = scrollY, upRun = 0, raf = 0;
  const UP = 24, DOWN = 6;
  function check() {
    raf = 0;
    const y = scrollY, d = y - lastY; lastY = y;
    if (!header.classList.contains('is-off-hero')) { header.classList.remove('is-peek'); upRun = 0; return; }
    if (d < 0) { upRun -= d; if (upRun > UP) header.classList.add('is-peek'); }
    else if (d > DOWN) { upRun = 0; header.classList.remove('is-peek'); }
  }
  // Leaving the hero always starts hidden, never with a stale peek.
  let wasOff = header.classList.contains('is-off-hero');
  new MutationObserver(() => {
    const off = header.classList.contains('is-off-hero');
    if (off !== wasOff) { wasOff = off; upRun = 0; header.classList.remove('is-peek'); }
  }).observe(header, { attributes: true, attributeFilter: ['class'] });
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(check); }, { passive: true });
})();
