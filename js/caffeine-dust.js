/* 11-07 — CAFFEINE FREE: the CAFFEINE letters crumble into coffee-coloured
   powder that blows away on the wind (left → right sweep), leaving only a
   faint trace of the word — caffeine gone; FREE stays solid.
   Triggered when brand-flow-preview marks the word `.is-playing`. */
(() => {
  'use strict';
  const word = document.querySelector('#brand-values .brand-values__word[data-brand-value="2"]');
  if (!word || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'caffeine-dust';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const COLORS = ['107,68,40', '128,86,54', '86,54,32', '150,108,72'];
  let lastScroll = 0, parts = [], raf = 0, t0 = 0, prev = 0, w = 0, h = 0, dpr = 1;

  function size() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    w = innerWidth; h = innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  // One visible span per CAFFEINE letter (the liquid-type layers duplicate them).
  function letters() {
    const seen = new Map();
    word.querySelectorAll('.bv-l').forEach(el => {
      if (el.closest('.bv-free')) return;
      const i = el.style.getPropertyValue('--i');
      const r = el.getBoundingClientRect();
      if (r.width < 2 || seen.has(i)) return;
      seen.set(i, { el, r });
    });
    return [...seen.values()];
  }
  function build() {
    const list = letters();
    if (!list.length) return [];
    const cs = getComputedStyle(list[0].el);
    const font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    const step = Math.max(2, Math.round(parseFloat(cs.fontSize) / 64));
    const span = Math.max(1, list[list.length - 1].r.right - list[0].r.left);
    const out = [];
    list.forEach(({ el, r }) => {
      const pw = Math.ceil(r.width) + 4, ph = Math.ceil(r.height) + 4;
      probe.canvas.width = pw; probe.canvas.height = ph;
      probe.clearRect(0, 0, pw, ph);
      probe.font = font; probe.textBaseline = 'alphabetic'; probe.fillStyle = '#000';
      const m = probe.measureText(el.textContent);
      const base = (ph + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent)) / 2;
      probe.fillText(el.textContent, (pw - m.width) / 2, base);
      const data = probe.getImageData(0, 0, pw, ph).data;
      for (let y = 0; y < ph; y += step) for (let x = 0; x < pw; x += step) {
        if (data[(y * pw + x) * 4 + 3] < 128) continue;
        const ax = r.left - 2 + x, ay = r.top - 2 + y;
        const sweep = (ax - list[0].r.left) / span;              // dissolve sweeps left → right
        out.push({
          x: ax, y: ay, x0: ax, y0: ay,
          delay: sweep * .48 + Math.random() * .06,
          vx: (Math.random() - .35) * 260, vy: (Math.random() - .65) * 260,
          wob: Math.random() * 6.28, s: step * (.8 + Math.random() * .7),
          life: 1.1 + Math.random() * 1, c: COLORS[(Math.random() * COLORS.length) | 0]
        });
        if (out.length > 16000) return out;
      }
    });
    return out;
  }
  function frame(now) {
    raf = 0;
    const dt = Math.min(.05, (now - (prev || now)) / 1000); prev = now;
    const t = (now - t0) / 1000;
    const dy = scrollY - lastScroll; lastScroll = scrollY;     // powder stays with the page
    if (dy) for (const p of parts) p.y -= dy;
    ctx.clearRect(0, 0, w, h);
    let alive = false;
    for (const p of parts) {
      const a = t - p.delay;
      if (a < 0) { alive = true; continue; }
      const k = a / p.life;
      if (k >= 1) continue;
      alive = true;
      // Bursts apart in place, then the wind takes it up and to the right.
      const drag = Math.exp(-dt * 2.6);
      p.vx = p.vx * drag + 190 * dt * Math.min(1, a * 1.6);
      p.vy = p.vy * drag - 95 * dt;
      p.x += (p.vx + Math.sin(a * 5 + p.wob) * 40) * dt;
      p.y += (p.vy + Math.cos(a * 4 + p.wob) * 22) * dt;
      ctx.fillStyle = 'rgba(' + p.c + ',' + (Math.min(1, a * 12) * (1 - k) ** 1.2).toFixed(3) + ')';
      const s = p.s * (1 - k * .5);
      ctx.fillRect(p.x, p.y, s, s);
    }
    if (alive) raf = requestAnimationFrame(frame);
    else { ctx.clearRect(0, 0, w, h); prev = 0; canvas.classList.remove('is-on'); }
  }
  function play() {
    size();
    parts = build();
    if (!parts.length) return;
    t0 = performance.now(); prev = 0; lastScroll = scrollY;
    canvas.classList.add('is-on');
    if (!raf) raf = requestAnimationFrame(frame);
  }
  let was = word.classList.contains('is-playing');
  new MutationObserver(() => {
    const now = word.classList.contains('is-playing');
    if (now && !was) requestAnimationFrame(play);
    was = now;
  }).observe(word, { attributes: true, attributeFilter: ['class'] });
})();
