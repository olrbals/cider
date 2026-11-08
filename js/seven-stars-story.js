/* 11-08 (d) — SEVEN STARS, using the official renewal film itself.
   The glossy 2000s star → new white star transformation is cut from the
   official film (1.2s, 36 frames, background keyed out to transparent WebP)
   and scrubbed by scroll, sitting exactly in the ST★RS slot. Its last frame
   lines up with the slot's white star, which then grows into the white screen
   (brand-flow-preview aperture) as before. */
(() => {
  'use strict';
  const identity = document.getElementById('identity');
  if (!identity || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const N = 36, SRC = 480;
  // Final frame: star bbox in source px (left 47, top 55, width 387).
  const FX = 47, FY = 55, FW = 387;
  // Slot star (scene-polish fivePoint, viewBox 100): left 7%, top 6%, width 86%.
  const SX = .07, SY = .06, SW = .86;
  const START = .03, DONE = .27, END = .45;

  const frames = [];
  let loaded = 0, ready = false;
  for (let i = 0; i < N; i++) {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { if (++loaded === N) { ready = true; kick(); } };
    img.src = 'img/brand/star-morph/' + String(i).padStart(2, '0') + '.webp';
    frames.push(img);
  }

  const wrap = document.createElement('div');
  wrap.className = 'seven-story';
  wrap.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  canvas.className = 'seven-story__film';
  wrap.append(canvas);
  document.body.append(wrap);
  const ctx = canvas.getContext('2d');

  const clamp = v => Math.max(0, Math.min(1, v));
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  let p = 0, raf = 0, lastKey = '';

  function paint() {
    raf = 0;
    const slot = identity.querySelector('.identity-main-star');
    const r = slot && slot.getBoundingClientRect();
    const onScreen = r && r.width > 4 && r.bottom > -innerHeight * .2 && r.top < innerHeight * 1.2;
    const live = ready && !!onScreen && p < END;
    wrap.classList.toggle('is-on', live);
    identity.classList.toggle('has-seven-story', live);
    if (!live) return;

    const s = SW * r.width / FW;                 // css px per source px
    const size = SRC * s;
    const left = r.left + SX * r.width - FX * s;
    const top = r.top + SY * r.height - FY * s;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const px = Math.round(size * dpr);
    if (canvas.width !== px) { canvas.width = canvas.height = px; lastKey = ''; }
    canvas.style.width = canvas.style.height = size + 'px';
    canvas.style.transform = 'translate3d(' + left + 'px,' + top + 'px,0)';

    // Scroll scrubs the film; neighbouring frames are blended for smoothness.
    const f = clamp((p - START) / (DONE - START)) * (N - 1);
    const i = Math.floor(f), mix = f - i;
    const key = i + ':' + mix.toFixed(2) + ':' + px;
    if (key !== lastKey) {
      lastKey = key;
      ctx.clearRect(0, 0, px, px);
      ctx.globalAlpha = 1;
      ctx.drawImage(frames[i], 0, 0, px, px);
      if (mix > .01 && i + 1 < N) { ctx.globalAlpha = mix; ctx.drawImage(frames[i + 1], 0, 0, px, px); ctx.globalAlpha = 1; }
    }
    wrap.style.opacity = (1 - sm(.43, .45, p)).toFixed(3);   // the aperture takes over from here
  }
  function kick() { if (!raf) raf = requestAnimationFrame(paint); }
  addEventListener('chilsung:star-progress', e => { p = e.detail; kick(); });
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick, { passive: true });
  kick();
})();
