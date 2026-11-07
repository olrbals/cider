/* 11-07 — site-wide smooth wheel scrolling.
   Mouse wheels move the page in ~100px steps, which makes every scroll-driven
   scene judder. Here wheel input only moves a target; the page eases toward
   it every frame. Scenes that hold the scroll themselves (hero sequence, wave
   glides) cancel the wheel first — those events are left alone. Keyboard,
   scrollbar and touch keep the browser's native behaviour. */
(() => {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let target = scrollY, current = scrollY, raf = 0, last = 0, written = -1;
  const maxY = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);
  function step(now) {
    raf = 0;
    if (window.__chilsungGlide) { target = current = scrollY; last = 0; return; }
    // Someone else moved the page (scrollbar, keys, scrollTo): follow it.
    if (written >= 0 && Math.abs(scrollY - written) > 1.5) { target = current = scrollY; last = 0; written = -1; return; }
    const dt = last ? Math.min(.05, (now - last) / 1000) : 1 / 60;
    last = now;
    current += (target - current) * (1 - Math.exp(-dt * 11));
    if (Math.abs(target - current) < .5) current = target;
    written = Math.round(current);
    window.scrollTo(0, current);
    written = scrollY;
    if (current !== target) raf = requestAnimationFrame(step);
    else { last = 0; written = -1; }
  }
  addEventListener('wheel', e => {
    if (e.defaultPrevented || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (e.target.closest && e.target.closest('textarea, select, [data-native-scroll]')) return;
    e.preventDefault();
    if (!raf) { target = current = scrollY; }
    const unit = e.deltaMode === 1 ? 36 : e.deltaMode === 2 ? innerHeight : 1;
    target = Math.max(0, Math.min(maxY(), target + e.deltaY * unit));
    if (!raf) { last = 0; raf = requestAnimationFrame(step); }
  }, { passive: false });
})();
