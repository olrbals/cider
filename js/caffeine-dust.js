/* 11-07 — CAFFEINE FREE: the CAFFEINE letters crumble into coffee-coloured
   powder that crumbles and falls straight down where it was (left → right), leaving only a
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
      // Baseline exactly where the browser puts it in the line box (half-leading),
      // so the powder starts on the letters themselves, not above them.
      const fa = m.fontBoundingBoxAscent || m.actualBoundingBoxAscent, fd = m.fontBoundingBoxDescent || m.actualBoundingBoxDescent;
      const base = 2 + (r.height - (fa + fd)) / 2 + fa;
      probe.fillText(el.textContent, (pw - m.width) / 2, base);
      const data = probe.getImageData(0, 0, pw, ph).data;
      for (let y = 0; y < ph; y += step) for (let x = 0; x < pw; x += step) {
        if (data[(y * pw + x) * 4 + 3] < 128) continue;
        const ax = r.left - 2 + x, ay = r.top - 2 + y;
        const sweep = (ax - list[0].r.left) / span;              // dissolve sweeps left → right
        out.push({
          x: ax, y: ay, x0: ax, y0: ay,
          delay: sweep * .48 + Math.random() * .06,
          vx: (Math.random() - .5) * 46, vy: -Math.random() * 40,
          wob: Math.random() * 6.28, s: step * (.8 + Math.random() * .7),
          life: .9 + Math.random() * .8, c: COLORS[(Math.random() * COLORS.length) | 0]
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
    // 11-08: the word is pinned while it plays, so the powder must NOT follow
    // page scroll (that made it look like it flew upward).
    ctx.clearRect(0, 0, w, h);
    let alive = false;
    for (const p of parts) {
      const a = t - p.delay;
      if (a < 0) { alive = true; continue; }
      const k = a / p.life;
      if (k >= 1) continue;
      alive = true;
      // 11-08: crumbles where it is and falls — no flying off upward.
      const drag = Math.exp(-dt * 1.8);
      p.vx = p.vx * drag;
      p.vy = p.vy * drag + 620 * dt;
      p.x += (p.vx + Math.sin(a * 6 + p.wob) * 6) * dt;
      p.y += p.vy * dt;
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
