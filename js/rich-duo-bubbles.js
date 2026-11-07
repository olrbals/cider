/* RICH duo · carbonation rising behind and around the bottles.
 * Soft clear bubbles (thin rim + highlight, readable on pastel) drift up
 * with a little sway, denser around the two bottles. Runs only while the
 * product scene is visible.
 */
(() => {
  'use strict';
  const duo = document.querySelector('#rich-flavors .rich-duo');
  if (!duo || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const slots = ['peach', 'grape'].map(k => duo.querySelector('[data-rich-slot="' + k + '"]'));

  const canvas = document.createElement('canvas');
  canvas.className = 'rich-duo-bubbles';
  canvas.setAttribute('aria-hidden', 'true');
  duo.append(canvas);
  const ctx = canvas.getContext('2d');

  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 48;
  {
    const c = sprite.getContext('2d');
    const g = c.createRadialGradient(24, 24, 10, 24, 24, 23);
    g.addColorStop(0, 'rgba(255,255,255,.10)');
    g.addColorStop(.72, 'rgba(255,255,255,.22)');
    g.addColorStop(.88, 'rgba(255,255,255,.95)');
    g.addColorStop(.95, 'rgba(120,170,160,.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(24, 24, 23, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,.95)'; c.beginPath(); c.ellipse(16, 15, 5, 3.5, -.6, 0, Math.PI * 2); c.fill();
  }

  let W = 1, H = 1, raf = 0, last = 0;
  const bubbles = [];
  function resize() {
    W = duo.clientWidth; H = duo.clientHeight;
    const r = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(W * r); canvas.height = Math.round(H * r);
    ctx.setTransform(r, 0, 0, r, 0, 0);
  }
  function spawn(nearBottle) {
    const s = Math.min(W / 1440, H / 900);
    let x = Math.random() * W, y = H + 20;
    if (nearBottle) {
      const r = slots[Math.random() < .5 ? 0 : 1].getBoundingClientRect(), v = duo.getBoundingClientRect();
      x = r.left - v.left + r.width * (.2 + Math.random() * .6);
      y = r.top - v.top + r.height * (.4 + Math.random() * .6);
    }
    const size = (4 + Math.random() ** 2.2 * 20) * s;
    bubbles.push({ x, y, size, vy: (40 + Math.random() * 70 + size * 2) * (nearBottle ? 1.2 : 1),
      sway: Math.random() * 6.28, swayAmp: 6 + Math.random() * 14, life: 0, max: 2 + Math.random() * 3 });
  }
  function frame(now) {
    raf = 0;
    if (duo.style.visibility !== 'visible') { ctx.clearRect(0, 0, W, H); bubbles.length = 0; last = 0; return; }
    { const r = duo.getBoundingClientRect(); if (r.bottom <= 0 || r.top >= innerHeight) { last = 0; return; } }
    if (W !== duo.clientWidth || H !== duo.clientHeight) resize();
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
    const t = now / 1000;
    if (bubbles.length < 90) { if (Math.random() < .55) spawn(false); if (Math.random() < .45) spawn(true); }
    ctx.clearRect(0, 0, W, H);
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.life += dt; b.y -= b.vy * dt;
      if (b.y < -40 || b.life > b.max) { bubbles.splice(i, 1); continue; }
      const x = b.x + Math.sin(t * 1.8 + b.sway) * b.swayAmp;
      ctx.globalAlpha = Math.min(1, b.life * 3) * Math.min(1, (b.max - b.life) * 2) * .85;
      ctx.drawImage(sprite, x - b.size, b.y - b.size, b.size * 2, b.size * 2);
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }
  const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };
  new MutationObserver(wake).observe(duo, { attributes: true, attributeFilter: ['style'] });
  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', () => { resize(); wake(); }, { passive: true });
  resize(); wake();
})();
