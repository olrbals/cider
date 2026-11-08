/* 11-08 — footer: the Chilsung star emblem draws in as a thin outline, then
   fills from the bottom with fizzing white liquid (bubbles riding the
   surface), the star turns to translucent glass and the seven stars twinkle.
   Plays on its own clock each time the footer comes into view. */
(() => {
  'use strict';
  const box = document.querySelector('.footer-emblem');
  if (!box || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = box.querySelector('canvas'), ctx = canvas.getContext('2d');
  const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  let fill, outline, inside, raf = 0, t0 = 0, W = 0, H = 0, dpr = 1, bubbles = [], played = false, lastT = 0;
  // the seven small stars sit at the upper-left of the emblem (fractions of the box)
  const SEVEN = [[.29,.08],[.24,.15],[.33,.17],[.27,.24],[.36,.27],[.3,.32],[.36,.12]];

  function size() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = box.clientWidth; H = box.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
    // ① outline draws in on a diagonal sweep (0–0.8s), fades once full
    const draw = clamp(t / .8), lineFade = 1 - clamp((t - 2.2) / .5);
    if (lineFade > 0) {
      ctx.save();
      ctx.beginPath(); const sweep = (W + H) * ease(draw);
      ctx.moveTo(0, H); ctx.lineTo(sweep, H); ctx.lineTo(0, H - sweep); ctx.closePath(); ctx.clip();
      ctx.globalAlpha = lineFade; ctx.drawImage(outline, 0, 0, W, H);
      ctx.restore();
    }
    // ② liquid rises (0.6–2.2s)
    const k = ease(clamp((t - .6) / 1.6)), level = H * (1.04 - 1.1 * k);
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
      const s = clamp((t - 2 - i * .07) / .45);
      if (s <= 0 || s >= 1) return;
      const r = W * .045 * Math.sin(Math.PI * s), x = fx * W, y = fy * H;
      ctx.globalAlpha = Math.sin(Math.PI * s) * .9; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
      ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill();
    });
    ctx.globalAlpha = 1;
    if (t < 3.2 || bubbles.length) raf = requestAnimationFrame(frame);
    else lastT = 0;
  }
  function play() { size(); bubbles = []; t0 = performance.now(); lastT = 0; if (!raf) raf = requestAnimationFrame(frame); }
  Promise.all([load('img/brand/emblem-fill.png'), load('img/brand/emblem-outline.png'), load('img/brand/emblem-inside.png')]).then(([f, o, i]) => {
    fill = f; outline = o; inside = i; size();
    ctx.drawImage(outline, 0, 0, W, H);         // waits as a thin outline until it plays
    new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio > .5) { if (!played) { played = true; play(); } }
      else if (!e.isIntersecting && played && !raf) { played = false; ctx.clearRect(0, 0, W, H); ctx.drawImage(outline, 0, 0, W, H); }
    }), { threshold: [0, .5] }).observe(box);
    addEventListener('resize', () => { size(); if (!raf) ctx.drawImage(played ? fill : outline, 0, 0, W, H); }, { passive: true });
  });
})();
