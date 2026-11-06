/* RICH · "맑고 깨끗함에 과즙의 풍미를 더했다" — the whole screen is clear
 * water (no visible strip or surface line): peaches (left) and green grapes
 * (right) plunge in from the top edge with a burst of bubbles, slow down as
 * if in water, tumble and sink with bubble trails, while soft pink / lime
 * juice glows spread around them — the colours of the product screen that
 * follows. Scroll-driven, eased per frame.
 */
(() => {
  'use strict';
  const root = document.querySelector('#rich-flavors');
  const copy = root?.querySelector('.rich-copy');
  const story = copy?.querySelector('.rich-story');
  if (!root || !copy || !story) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  const DROP_START = 1.38, DROP_END = 2.32;
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
    { src: 'img/flavors/v11-grape-single.png', x: .69, size: 70,  t0: .34, t1: .92, side: 1, spin: 120, sink: .92 }
  ].map(f => ({ ...f, img: Object.assign(new Image(), { src: f.src, decoding: 'async' }), entered: false }));

  const canvas = document.createElement('canvas');
  canvas.className = 'rich-drop';
  canvas.setAttribute('aria-hidden', 'true');
  // Lives above the product backdrop so the fruits stay while the copy fades
  // and hand over to the product screen (fades as the bottles slide in).
  const duo = root.querySelector('.rich-duo');
  (duo || story).after(canvas);
  const ctx = canvas.getContext('2d');

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
    const size = f.size * scale;
    // Fast plunge, then water drag: quick at first, gently settling.
    const k = 1 - (1 - q) ** 2.6;
    const y = -size * .8 + (H * f.sink + size * .8) * k;
    const x = W * f.x + Math.sin(q * 3 + f.x * 9) * size * .14 + (f.side ? 1 : -1) * size * .25 * q; // drift away from the copy
    const angle = (f.spin * k + Math.sin(t * .9 + f.x * 7) * 5 * q) * Math.PI / 180;
    return { q, x, y, size, angle, speed: (1 - q) ** 1.6 };
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
    const visible = s > DROP_START - .1 && s < 2.8;
    canvas.style.opacity = visible ? (1 - smooth(2.42, 2.75, s)).toFixed(3) : '0';
    if (!visible) { prevS = s; bubbles.length = 0; return; }
    const t = now / 1000, p = shown;
    ctx.clearRect(0, 0, W, H);
    const states = FRUITS.map(f => (f.img.complete && f.img.naturalWidth) ? [f, fruitState(f, p, t)] : null).filter(Boolean);
    // Juice glow: soft, borderless colour that follows each fruit and spreads.
    for (const [f, st] of states) {
      if (st.q <= 0) continue;
      const a = .55 * smooth(.05, .9, st.q) * (f.big ? 1 : .6);
      const r = st.size * (1.4 + 2.6 * smooth(.1, 1, st.q));
      const g = ctx.createRadialGradient(st.x, st.y, 0, st.x, st.y, r);
      const rgb = (f.side ? LIME : PINK).join(',');
      g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')');
      g.addColorStop(1, 'rgba(' + rgb + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(st.x - r, st.y - r, r * 2, r * 2);
    }
    for (const [f, st] of states) {
      if (st.q <= 0) { f.entered = false; continue; }
      // Plunge: a cloud of bubbles follows the fruit in from the top edge.
      if (!f.entered && st.q > .02) {
        f.entered = true;
        if (s >= prevS && !reduce.matches) {
          for (let i = 0; i < 34; i++) bubbles.push({ x: st.x + (Math.random() - .5) * st.size * .7, y: Math.max(4, st.y - st.size * (.2 + Math.random() * .9)),
            r: (2 + Math.random() * 6) * scale, vy: -(20 + Math.random() * 50) * scale, life: 0, max: .7 + Math.random() * .9, sway: Math.random() * TAU });
        }
      }
      // Trail: denser while the fruit is still moving fast.
      if (st.q < .98 && bubbles.length < 240 && Math.random() < .25 + .6 * st.speed) {
        bubbles.push({ x: st.x + (Math.random() - .5) * st.size * .5, y: st.y - st.size * (.1 + Math.random() * .35),
          r: (1.5 + Math.random() * 4.5) * scale, vy: -(30 + Math.random() * 60) * scale, life: 0, max: .8 + Math.random() * 1.1, sway: Math.random() * TAU });
      }
      const ar = f.img.naturalHeight / f.img.naturalWidth;
      ctx.save();
      ctx.translate(st.x, st.y); ctx.rotate(st.angle);
      ctx.drawImage(f.img, -st.size / 2, -st.size * ar / 2, st.size, st.size * ar);
      ctx.restore();
    }
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.life += dt; b.y += b.vy * dt; b.x += Math.sin(t * 3 + b.sway) * .4;
      if (b.life > b.max || b.y < -10) { bubbles.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, b.life * 6) * (1 - b.life / b.max) * .95;
      ctx.drawImage(bubble, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    }
    ctx.globalAlpha = 1;
    prevS = s;
    if (shown !== target || bubbles.length) queue();
  }
  function queue() { if (!raf) raf = requestAnimationFrame(draw); }
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', resize, { passive: true });
  resize();
})();
