/* 11-08 (b) — footer: a thin line travels along the emblem's outline and draws
   it (pen-like, both ways from the top of each shape), then
   fills from the bottom with fizzing white liquid (bubbles riding the
   surface), the star turns to translucent glass and the seven stars twinkle.
   Plays on its own clock each time the footer comes into view. */
(() => {
  'use strict';
  const box = document.querySelector('.footer-emblem');
  if (!box || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = box.querySelector('canvas'), ctx = canvas.getContext('2d');
  const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  let fill, outline, inside, pen = null, raf = 0, t0 = 0, W = 0, H = 0, dpr = 1, bubbles = [], played = false, lastT = 0;
  // the seven small stars sit at the upper-left of the emblem (fractions of the box)
  const SEVEN = [[.29,.08],[.24,.15],[.33,.17],[.27,.24],[.36,.27],[.3,.32],[.36,.12]];

  function size() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = box.clientWidth; H = box.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  // Line drawing: order every outline pixel by its distance along the line
  // (BFS from the top of each connected stroke), then reveal in that order.
  function buildPen() {
    const w = Math.round(W * dpr), h = Math.round(H * dpr);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(outline, 0, 0, w, h);
    const src = cx.getImageData(0, 0, w, h), a = src.data, n = w * h;
    const dist = new Float32Array(n).fill(-1), comp = new Int32Array(n).fill(-1), q = new Int32Array(n);
    const maxD = [];
    for (let start = 0; start < n; start++) {
      if (a[start * 4 + 3] < 40 || comp[start] >= 0) continue;   // first unvisited pixel = topmost of its stroke
      const id = maxD.length; let head = 0, tail = 0, m = 0;
      q[tail++] = start; comp[start] = id; dist[start] = 0;
      while (head < tail) {
        const i = q[head++], x = i % w, y = (i / w) | 0, d = dist[i];
        if (d > m) m = d;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx; if (comp[j] >= 0 || a[j * 4 + 3] < 40) continue;
          comp[j] = id; dist[j] = d + (dx && dy ? 1.414 : 1); q[tail++] = j;
        }
      }
      maxD.push(m || 1);
    }
    const idx = [], ord = [];
    for (let i = 0; i < n; i++) if (comp[i] >= 0) { idx.push(i); ord.push(dist[i] / maxD[comp[i]]); }
    const order = Array.from(idx.keys()).sort((p1, p2) => ord[p1] - ord[p2]);
    const out = cx.createImageData(w, h);
    pen = { w, h, canvas: c, cx, out, src: a, idx: Int32Array.from(order.map(k => idx[k])), ord: Float32Array.from(order.map(k => ord[k])), done: 0 };
  }
  function penTo(f) {                        // reveal outline pixels up to fraction f
    const P = pen; if (!P) return;
    if (f * 1 < (P.done ? P.ord[P.done - 1] : 0)) { P.out.data.fill(0); P.done = 0; }
    const d = P.out.data, before = P.done;
    while (P.done < P.idx.length && P.ord[P.done] <= f) {
      const i = P.idx[P.done++] * 4; d[i] = P.src[i]; d[i + 1] = P.src[i + 1]; d[i + 2] = P.src[i + 2]; d[i + 3] = P.src[i + 3];
    }
    if (P.done !== before || !before) P.cx.putImageData(P.out, 0, 0);
  }
  const ease = t => 1 - Math.pow(1 - t, 3);
  const clamp = v => Math.max(0, Math.min(1, v));
  function surface(x, level, t) {           // wavy liquid line (y in px)
    return level + Math.sin(x / W * 9 + t * 5) * H * .012 + Math.sin(x / W * 17 - t * 7) * H * .006;
  }
  function clipBelow(level, t) {
    ctx.beginPath(); ctx.moveTo(0, H + 2);
    for (let x = 0; x <= W; x += 6) ctx.lineTo(x, surface(x, level, t));
    ctx.lineTo(W, H + 2); ctx.closePath(); ctx.clip();
  }
  function frame(now) {
    raf = 0;
    const t = (now - t0) / 1000, dt = Math.min(.05, (now - (lastT || now)) / 1000); lastT = now;
    ctx.clearRect(0, 0, W, H);
    // ① a thin line runs along the outline and draws it (0–1.5s); fades once filled
    const draw = clamp(t / 1.5), lineFade = 1 - clamp((t - 3.1) / .5);
    if (lineFade > 0 && pen) {
      penTo(draw < 1 ? draw * (2 - draw) : 1.01);
      ctx.globalAlpha = lineFade; ctx.drawImage(pen.canvas, 0, 0, W, H); ctx.globalAlpha = 1;
    }
    // ② liquid rises (0.6–2.2s)
    const k = ease(clamp((t - 1.3) / 1.8)), level = H * (1.04 - 1.1 * k);   // ② then the inside fills, gradually
    if (k > 0) {
      ctx.save(); clipBelow(level, t);
      ctx.globalAlpha = .22; ctx.drawImage(inside, 0, 0, W, H);        // glassy star body
      ctx.globalAlpha = 1; ctx.drawImage(fill, 0, 0, W, H);            // wordmark + star line + seven stars
      ctx.restore();
      // bubbles riding up through the liquid
      if (k < 1 && bubbles.length < 70) for (let i = 0; i < 3; i++) {
        const x = W * (.12 + Math.random() * .76);
        bubbles.push({ x, y: Math.min(H, surface(x, level, t) + Math.random() * H * .4), r: 1.5 + Math.random() * 4, v: 40 + Math.random() * 90, life: 0, max: .5 + Math.random() * .7 });
      }
    }
    bubbles = bubbles.filter(b => (b.life += dt) < b.max);
    for (const b of bubbles) {
      b.y -= b.v * dt; b.x += Math.sin(b.life * 9 + b.r) * 10 * dt;
      ctx.globalAlpha = (1 - b.life / b.max) * .9;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // ③ the seven stars twinkle once the liquid has reached them (2.0–2.9s)
    SEVEN.forEach(([fx, fy], i) => {
      const s = clamp((t - 2.9 - i * .07) / .45);
      if (s <= 0 || s >= 1) return;
      const r = W * .045 * Math.sin(Math.PI * s), x = fx * W, y = fy * H;
      ctx.globalAlpha = Math.sin(Math.PI * s) * .9; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
      ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill();
    });
    ctx.globalAlpha = 1;
    if (t < 4 || bubbles.length) raf = requestAnimationFrame(frame);
    else lastT = 0;
  }
  function play() { size(); buildPen(); bubbles = []; t0 = performance.now(); lastT = 0; if (!raf) raf = requestAnimationFrame(frame); }
  Promise.all([load('img/brand/emblem-fill.png'), load('img/brand/emblem-outline.png'), load('img/brand/emblem-inside.png')]).then(([f, o, i]) => {
    fill = f; outline = o; inside = i; size();
    // stays empty until it plays — the line draws the emblem
    new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio > .5) { if (!played) { played = true; play(); } }
      else if (!e.isIntersecting && played && !raf) { played = false; ctx.clearRect(0, 0, W, H); }
    }), { threshold: [0, .5] }).observe(box);
    addEventListener('resize', () => { size(); if (!raf && played) ctx.drawImage(fill, 0, 0, W, H); }, { passive: true });
  });
})();
