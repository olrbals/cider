/* 11-08 — CFC concept "seven upward-ascending stars = carbonation":
   on SEVEN STARS, seven small stars fizz up from the bottom like bubbles and
   gather into the star of ST★RS before it fills and grows. Scroll-driven
   (reversible), reads progress from brand-flow-preview's event. */
(() => {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const STAR = 'M50 6 L61.7 36 H93 L68 55.3 L77.5 86.5 L50 68.2 L22.5 86.5 L32 55.3 L7 36 H38.3 Z';
  const wrap = document.createElement('div');
  wrap.className = 'seven-rising'; wrap.setAttribute('aria-hidden', 'true');
  const lanes = [.14, .3, .44, .57, .7, .82, .93];
  const stars = lanes.map((lane, i) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.setAttribute('viewBox', '0 0 100 100');
    el.innerHTML = '<path d="' + STAR + '"/>';
    wrap.append(el);
    return { el, lane, delay: [0, .05, .02, .08, .035, .1, .065][i], size: [.9, 1.15, .8, 1.3, 1, .85, 1.1][i], wob: i * 1.7 };
  });
  document.body.append(wrap);
  const clamp = v => Math.max(0, Math.min(1, v));
  const easeIO = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  addEventListener('chilsung:star-progress', e => {
    const p = e.detail;
    const target = document.querySelector('#identity .identity-main-star');
    if (!target || p <= .02 || p >= .36) { wrap.classList.remove('is-on'); return; }
    const r = target.getBoundingClientRect();
    const tx = r.left + r.width / 2, ty = r.top + r.height / 2;
    const w = innerWidth, h = innerHeight;
    wrap.classList.add('is-on');
    stars.forEach(s => {
      const t = clamp((p - .03 - s.delay) / .2);
      if (t <= 0 || t >= 1) { s.el.style.opacity = '0'; return; }
      const sx = s.lane * w, sy = h + 30;
      const k = easeIO(t);
      // Rise like a bubble (wobbling), curving in toward the star near the end.
      const pull = Math.pow(t, 2.2);
      const x = sx + (tx - sx) * pull + Math.sin(t * 9 + s.wob) * 18 * (1 - pull);
      const y = sy + (ty - sy) * k;
      const scale = s.size * (1 - .55 * pull);
      const op = Math.min(1, t * 6) * (t > .88 ? (1 - t) / .12 : 1);
      s.el.style.opacity = op.toFixed(3);
      s.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + (t * 160 + s.wob * 20).toFixed(0) + 'deg) scale(' + scale.toFixed(3) + ')';
    });
  });
})();
