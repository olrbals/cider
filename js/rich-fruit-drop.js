/* RICH · "맑고 깨끗함에 과즙의 풍미를 더했다" — the copy screen becomes clear
 * water: peaches (left) and green grapes (right) drop through the surface,
 * splash (real footage, inverted + tinted so it reads on white), sink with
 * bubble trails and dye the water pink / lime — the exact colours of the
 * product screen that follows. Scroll-driven, eased per frame.
 * Window: rich-flavors progress s ∈ [DROP_START, DROP_END] (screens).
 */
(() => {
  'use strict';
  const root = document.querySelector('#rich-flavors');
  const copy = root?.querySelector('.rich-copy');
  const story = copy?.querySelector('.rich-story');
  if (!root || !copy || !story) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  const DROP_START = 1.38, DROP_END = 2.32;
  const SURFACE = .67;              // just below the copy, never through it                         // water line, fraction of viewport height
  const PINK = [255, 204, 211], LIME = [233, 229, 140];
  const clamp = v => Math.max(0, Math.min(1, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const TAU = Math.PI * 2;

  // x: fraction of width, size: px at 1440×900, t0/t1: local window, side: 0 peach / 1 grape.
  const FRUITS = [
    { src: 'img/flavors/v11-peach.png',        x: .27, size: 230, t0: .00, t1: .62, side: 0, spin: -40, sink: .86, big: true },
    { src: 'img/flavors/v11-grape-bunch.png',  x: .73, size: 250, t0: .07, t1: .70, side: 1, spin: 34,  sink: .84, big: true },
    { src: 'img/flavors/v11-peach-piece.png',  x: .16, size: 165, t0: .20, t1: .80, side: 0, spin: 70,  sink: .95 },
    { src: 'img/flavors/v11-grape-single.png', x: .86, size: 92,  t0: .26, t1: .86, side: 1, spin: -90, sink: .97 },
    { src: 'img/flavors/v11-grape-single.png', x: .61, size: 70,  t0: .34, t1: .92, side: 1, spin: 120, sink: .92 },
    { src: 'img/flavors/v5-ice-cube.png',      x: .43, size: 120, t0: .40, t1: .98, side: 0, spin: -55, sink: .80, ice: true }
  ].map(f => ({ ...f, img: Object.assign(new Image(), { src: f.src, decoding: 'async' }), entered: false }));

  const canvas = document.createElement('canvas');
  canvas.className = 'rich-drop';
  canvas.setAttribute('aria-hidden', 'true');
  copy.insertBefore(canvas, story);
  const ctx = canvas.getContext('2d');

  const makeClip = name => {
    const v = document.createElement('video');
    v.className = 'rich-drop-splash';
    v.src = 'media/' + name + '.mp4';
    v.muted = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
    copy.insertBefore(v, story);
    v.addEventListener('play', () => { v.style.opacity = '1'; });
    v.addEventListener('ended', () => { v.style.opacity = '0'; });
    return v;
  };
  // [video, origin x fraction, origin y fraction] in the square clip.
  const splashes = [[makeClip('rich-drop-jet'), .59, .99], [makeClip('rich-drop-splash'), .37, .99],
    [makeClip('rich-drop-splash'), .37, .99], [makeClip('rich-drop-splash'), .37, .99]];
  let nextSplash = 0;

  // A real-looking bubble on white: faint teal rim, bright highlight.
  const bubble = document.createElement('canvas');
  bubble.width = bubble.height = 32;
  {
    const c = bubble.getContext('2d');
    const g = c.createRadialGradient(16, 16, 6, 16, 16, 15);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(.7, 'rgba(120,190,175,.10)');
    g.addColorStop(.9, 'rgba(70,150,135,.55)');
    g.addColorStop(1, 'rgba(70,150,135,0)');
    c.fillStyle = g; c.beginPath(); c.arc(16, 16, 15, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.95)'; c.beginPath(); c.arc(11, 11, 3, 0, TAU); c.fill();
  }

  let W = 1, H = 1, scale = 1, ratio = 1, raf = 0, shown = 0, lastNow = 0, prevS = -1;
  const bubbles = [];
  function resize() {
    W = copy.clientWidth || innerWidth; H = copy.clientHeight || innerHeight;
    scale = Math.min(W / 1440, H / 900);
    ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(W * ratio); canvas.height = Math.round(H * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    queue();
  }

  function fruitState(f, p, t) {
    const q = clamp((p - f.t0) / (f.t1 - f.t0));
    const surf = H * SURFACE, size = f.size * scale;
    const fall = clamp(q / .34);                                  // in the air
    const under = clamp((q - .34) / .66);                         // underwater
    const yAir = -size + (surf + size) * fall * fall;             // accelerating
    const deep = surf + (H * f.sink - surf + size * .2) * (1 - (1 - under) ** 2.4); // drag
    const bob = Math.sin(under * Math.PI) * size * .08;           // small rebound
    const y = q < .34 ? yAir : deep - bob;
    const x = W * f.x + Math.sin(q * 3 + f.x * 9) * size * .12 + (f.side ? -1 : 1) * size * .25 * under;
    const angle = (f.spin * q + Math.sin(t * .9 + f.x * 7) * 6 * under) * Math.PI / 180;
    return { q, x, y, size, angle, under, inAir: q > 0 && q < .34 };
  }

  function draw(now) {
    raf = 0;
    const dt = Math.min(.05, (now - (lastNow || now)) / 1000); lastNow = now;
    const r = root.getBoundingClientRect();
    const s = -r.top / innerHeight;
    const target = reduce.matches ? 1 : clamp((s - DROP_START) / (DROP_END - DROP_START));
    // Ease toward the scroll target so wheel steps become smooth motion.
    shown += (target - shown) * (1 - Math.exp(-dt * 9));
    if (Math.abs(target - shown) < .0005) shown = target;
    const visible = s > DROP_START - .1 && s < DROP_END + .3;
    canvas.style.opacity = visible ? '1' : '0';
    if (!visible) { prevS = s; bubbles.length = 0; return; }
    const t = now / 1000, p = shown, surf = H * SURFACE;
    ctx.clearRect(0, 0, W, H);

    // Water body: very clear, appears as the first fruit approaches.
    const water = smooth(0, .08, p);
    if (water > 0) {
      const dyeL = smooth(.25, 1, p), dyeR = smooth(.3, 1, p);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, H + 2);
      for (let x = 0; x <= W + 16; x += 16) ctx.lineTo(x, surf + Math.sin(x / W * TAU * 1.3 + t * 1.4) * 4 * scale);
      ctx.lineTo(W + 16, H + 2); ctx.closePath();
      const base = ctx.createLinearGradient(0, surf, 0, H);
      base.addColorStop(0, 'rgba(220,242,236,' + (.35 * water) + ')');
      base.addColorStop(1, 'rgba(200,232,224,' + (.55 * water) + ')');
      ctx.fillStyle = base; ctx.fill();
      ctx.clip();
      // Juice dyeing the water: pink spreads on the left, lime on the right.
      const blot = (cx, rgb, a) => {
        const g = ctx.createRadialGradient(cx, H * .95, 0, cx, H * .95, W * .75);
        g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')');
        g.addColorStop(1, 'rgba(' + rgb + ',0)');
        ctx.fillStyle = g; ctx.fillRect(0, surf - 20, W, H - surf + 20);
      };
      blot(W * .22, PINK.join(','), .9 * dyeL);
      blot(W * .78, LIME.join(','), .9 * dyeR);
      ctx.restore();
    }

    // Fruits: draw, then a light water veil over the submerged part.
    for (const f of FRUITS) {
      if (!f.img.complete || !f.img.naturalWidth) continue;
      const st = fruitState(f, p, t);
      if (st.q <= 0) { f.entered = false; continue; }
      // Splash + bubble burst the moment a fruit breaks the surface (going down).
      if (!f.entered && st.q >= .34) {
        f.entered = true;
        if (s >= prevS && !reduce.matches) {
          const [v, ox, oy] = splashes[f.big ? 0 : 1 + (nextSplash++ % 3)];
          const w = st.size * (f.big ? 2.6 : 2.1);
          Object.assign(v.style, { width: w + 'px', height: w + 'px', left: (st.x - w * ox) + 'px', top: (surf - w * oy + w * .06) + 'px' });
          v.currentTime = 0; v.play().catch(() => {});
          for (let i = 0; i < 26; i++) bubbles.push({ x: st.x + (Math.random() - .5) * st.size * .6, y: surf + Math.random() * st.size * .7,
            r: (2 + Math.random() * 6) * scale, vy: -(30 + Math.random() * 60) * scale, life: 0, max: .6 + Math.random() * .7, sway: Math.random() * TAU });
        }
      } else if (st.q < .34) f.entered = false;
      // Trail of bubbles while sinking.
      if (st.under > 0 && st.under < .98 && bubbles.length < 220 && Math.random() < .55) {
        bubbles.push({ x: st.x + (Math.random() - .5) * st.size * .5, y: st.y + (Math.random() - .3) * st.size * .4,
          r: (1.5 + Math.random() * 4.5) * scale, vy: -(40 + Math.random() * 70) * scale, life: 0, max: 1 + Math.random() * 1.2, sway: Math.random() * TAU });
      }
      const ar = f.img.naturalHeight / f.img.naturalWidth;
      ctx.save();
      ctx.translate(st.x, st.y); ctx.rotate(st.angle);
      ctx.globalAlpha = f.ice ? .9 : 1;
      ctx.drawImage(f.img, -st.size / 2, -st.size * ar / 2, st.size, st.size * ar);
      ctx.restore();
    }
    // Water veil over submerged fruit (refraction-ish softening).
    if (water > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(236,248,244,' + (.18 * water) + ')';
      ctx.fillRect(0, surf, W, H - surf);
      ctx.restore();
    }
    // Bubbles rise and pop at the surface.
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.life += dt; b.y += b.vy * dt; b.x += Math.sin(t * 3 + b.sway) * .4;
      if (b.life > b.max || b.y < surf + 2) { bubbles.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, b.life * 6) * (1 - b.life / b.max) * .95;
      ctx.drawImage(bubble, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    }
    ctx.globalAlpha = 1;
    // Glassy surface line.
    if (water > 0) {
      ctx.beginPath();
      for (let x = 0; x <= W + 16; x += 16) {
        const y = surf + Math.sin(x / W * TAU * 1.3 + t * 1.4) * 4 * scale;
        if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.strokeStyle = 'rgba(120,190,175,' + (.55 * water) + ')';
      ctx.lineWidth = 1.5; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,' + (.9 * water) + ')';
      ctx.lineWidth = 3; ctx.translate(0, 3); ctx.stroke(); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    prevS = s;
    if (shown !== target || bubbles.length || splashes.some(([v]) => !v.paused)) queue();
  }
  function queue() { if (!raf) raf = requestAnimationFrame(draw); }
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', resize, { passive: true });
  resize();
})();
