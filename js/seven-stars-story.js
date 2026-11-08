/* 11-08 (e) — SEVEN STARS, told with the official renewal film.
   One big glossy 2000s star fills the stage. Scrolling scrubs the official
   film: ① it transforms into the new flat white star, ② the white star
   shrinks and the seven stars rise into the Chilsung constellation. The
   other stars then fade, and the biggest one grows into the white screen
   (brand-flow-preview's aperture starts from it via __sevenStoryAnchor).
   Frames: 125 transparent WebPs keyed from the film (34 morph + 91 stars). */
(() => {
  'use strict';
  const identity = document.getElementById('identity');
  const stage = identity && identity.querySelector('.identity-stage');
  if (!stage || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const N = 125, MORPH = 34, SRC = 1100;
  // Biggest star in the last frame (source px): centre and width of the star itself.
  const BIG = { x: 408.5, y: 818, w: 263 };
  // Scroll map (identity progress). Matches the paging stops in smooth-scroll.js.
  const M0 = .015, M1 = .13, S0 = .15, S1 = .31, FADE0 = .335, FADE1 = .39, HANDOFF = .42, END = .5;
  const STAR = new Path2D('M50 6 L61.7 36 H93 L68 55.3 L77.5 86.5 L50 68.2 L22.5 86.5 L32 55.3 L7 36 H38.3 Z');

  const canvas = document.createElement('canvas');
  canvas.className = 'seven-film';
  canvas.setAttribute('aria-hidden', 'true');
  stage.append(canvas);
  const ctx = canvas.getContext('2d');

  const frames = new Array(N);
  let requested = false;
  function load() {
    if (requested) return;
    requested = true;
    const order = [0, MORPH - 1, N - 1];                 // key frames first, then the rest in order
    for (let i = 0; i < N; i++) if (!order.includes(i)) order.push(i);
    order.forEach(i => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { frames[i] = img; kick(); };
      img.src = 'img/brand/seven-film/' + String(i).padStart(3, '0') + '.webp';
    });
  }
  new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) load(); }, { rootMargin: '200% 0px' }).observe(identity);

  const clamp = v => Math.max(0, Math.min(1, v));
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const lin = (a, b, x) => clamp((x - a) / (b - a));
  let p = 0, raf = 0, lastKey = '', size = 0;

  function frameAt(v) {
    if (v < S0) return lin(M0, M1, v) * (MORPH - 1);
    return MORPH + lin(S0, S1, v) * (N - 1 - MORPH);
  }
  function nearest(i) {                                   // fall back to the closest loaded frame
    for (let d = 0; d < N; d++) { if (frames[i - d]) return frames[i - d]; if (frames[i + d]) return frames[i + d]; }
    return null;
  }
  function stageSize() { return Math.min(stage.clientHeight * .96, stage.clientWidth * .72); }

  // The aperture grows from the biggest star once the constellation is complete.
  window.__sevenStoryAnchor = () => {
    if (p < S1 || p >= END || !size) return null;
    const r = canvas.getBoundingClientRect(), k = r.width / SRC;
    const box = BIG.w * k / .86;                            // slot-star box (star is 86% of its box)
    return { x: r.left + BIG.x * k, y: r.top + BIG.y * k + box * .0375, size: box };
  };

  function paint() {
    raf = 0;
    const live = p < HANDOFF + .005;
    identity.classList.toggle('has-seven-film', p < .75);  // keep the old title/slot star out until the screen is white
    canvas.style.visibility = live ? 'visible' : 'hidden';
    if (!live) return;
    size = stageSize();
    const dpr = Math.min(2, devicePixelRatio || 1);
    const px = Math.round(size * dpr);
    if (canvas.width !== px) { canvas.width = canvas.height = px; lastKey = ''; }
    canvas.style.width = canvas.style.height = size + 'px';
    const f = frameAt(p), i = Math.floor(f), mix = f - i;
    const fade = 1 - sm(FADE0, FADE1, p);                 // the other six stars step back
    const a = nearest(i), b = mix > .01 && i + 1 < N && frames[i + 1];
    const hold = p >= S1 - .004;                            // the biggest star stays solid
    const key = [i, mix.toFixed(2), fade.toFixed(2), px, !!a && a.src, !!b, hold].join('|');
    if (key === lastKey) return;
    lastKey = key;
    ctx.clearRect(0, 0, px, px);
    if (a) { ctx.globalAlpha = fade; ctx.drawImage(a, 0, 0, px, px); }
    if (b) { ctx.globalAlpha = fade * mix; ctx.drawImage(b, 0, 0, px, px); }
    ctx.globalAlpha = 1;
    if (hold) {
      const k = px / SRC, box = BIG.w * k / .86;
      ctx.save();
      ctx.translate(BIG.x * k - box / 2, BIG.y * k + box * .0375 - box / 2);
      ctx.scale(box / 100, box / 100);
      ctx.fillStyle = '#fff';
      ctx.fill(STAR);
      ctx.restore();
    }
  }
  function kick() { if (!raf) raf = requestAnimationFrame(paint); }
  addEventListener('chilsung:star-progress', e => { p = e.detail; kick(); });
  addEventListener('resize', () => { lastKey = ''; kick(); }, { passive: true });
  kick();
})();
