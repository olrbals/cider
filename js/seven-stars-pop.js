/* 11-07 — SEVEN STARS → history: the moment the star has filled the screen
   white, a carbonation "팡" (shock ring + bubbles flung outward, then drifting
   up) and the line "모두와 함께 큰 별". Copy follows scroll (reversible);
   the burst plays on a clock once per downward pass. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pop = document.createElement('div');
  pop.className = 'seven-stars-pop';
  pop.setAttribute('aria-hidden', 'true');
  pop.innerHTML = '<canvas></canvas><p class="seven-stars-pop__copy">시대를 깨운 청량함, 모두와 함께 큰 별</p>';
  document.body.append(pop);
  const canvas = pop.querySelector('canvas');
  const copy = pop.querySelector('.seven-stars-pop__copy');
  const ctx = canvas.getContext('2d');
  const BURST_AT = .655, COPY_IN = [.62, .69], COPY_OUT = [.715, .76];
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  let last = 0, armed = true, parts = [], born = 0, raf = 0, w = 0, h = 0, dpr = 1;

  function size() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    w = innerWidth; h = innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function burst() {
    size();
    born = performance.now();
    const cx = w / 2, cy = h / 2, n = Math.round(Math.min(170, w / 9));
    parts = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (900 + Math.random() * 1500) * (Math.random() < .3 ? .45 : 1);
      parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .82,
        r: 1.5 + Math.random() ** 2 * 9, rise: 40 + Math.random() * 90, wob: Math.random() * 6.28,
        life: .9 + Math.random() * .9, fill: Math.random() < .35 });
    }
    if (!raf) raf = requestAnimationFrame(draw);
  }
  let prev = 0;
  function draw(now) {
    raf = 0;
    const dt = Math.min(.05, (now - (prev || now)) / 1000); prev = now;
    const age = (now - born) / 1000;
    ctx.clearRect(0, 0, w, h);
    // Shock star: one quick "팡" from the centre.
    if (age < .55) {
      const k = age / .55, e = 1 - (1 - k) ** 3;
      // Star-shaped shock wave (five points, slight turn as it bursts out).
      const R = 30 + e * Math.hypot(w, h) * .5, rot = -Math.PI / 2 + e * .18;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? R * .42 : R, an = rot + i * Math.PI / 5;
        ctx.lineTo(w / 2 + Math.cos(an) * rr, h / 2 + Math.sin(an) * rr);
      }
      ctx.closePath(); ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(20,159,92,' + (.38 * (1 - k)).toFixed(3) + ')';
      ctx.lineWidth = 2 + 14 * (1 - k);
      ctx.stroke();
    }
    let alive = false;
    for (const p of parts) {
      const t = age / p.life;
      if (t >= 1) continue;
      alive = true;
      const drag = Math.exp(-dt * 3.2);
      p.vx *= drag; p.vy = p.vy * drag - p.rise * dt * 6;       // fling, then fizz upward
      p.x += (p.vx + Math.sin(age * 7 + p.wob) * 14) * dt; p.y += p.vy * dt;
      const a = (t < .1 ? t / .1 : 1) * (1 - t) ** 1.4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      if (p.fill) { ctx.fillStyle = 'rgba(61,187,126,' + (.45 * a).toFixed(3) + ')'; ctx.fill(); }
      else {
        ctx.strokeStyle = 'rgba(20,159,92,' + (.7 * a).toFixed(3) + ')';
        ctx.lineWidth = Math.max(1, p.r * .18); ctx.stroke();
        ctx.beginPath(); ctx.arc(p.x - p.r * .35, p.y - p.r * .35, p.r * .22, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,' + (.9 * a).toFixed(3) + ')'; ctx.fill();
      }
    }
    if (alive || age < .55) raf = requestAnimationFrame(draw);
    else { ctx.clearRect(0, 0, w, h); prev = 0; }
  }
  addEventListener('chilsung:star-progress', e => {
    const p = e.detail;
    const o = sm(COPY_IN[0], COPY_IN[1], p) * (1 - sm(COPY_OUT[0], COPY_OUT[1], p));
    pop.style.setProperty('--pop-copy', o.toFixed(3));
    pop.classList.toggle('is-on', o > 0 || raf !== 0);
    if (p < BURST_AT - .08) armed = true;
    if (armed && last < BURST_AT && p >= BURST_AT && p < BURST_AT + .12 && !reduced.matches) { armed = false; pop.classList.add('is-on'); burst(); }
    last = p;
  });
  addEventListener('resize', () => { if (raf) size(); }, { passive: true });
})();
