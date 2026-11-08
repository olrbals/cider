/* 11-07 — SEVEN STARS → history.
   ① When the star has filled the screen white: a carbonation pop (bubbles
      flung outward, then fizzing upward) and the line
      "시대를 깨운 청량함, 모두와 함께 큰 별".
   ② Then the white recedes upward like an ebbing tide — a wavy, foamy edge
      with bubbles riding it — uncovering the history scene underneath.
   The tide and copy follow scroll (fully reversible); the pop plays on a
   clock once per downward pass. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pop = document.createElement('div');
  pop.className = 'seven-stars-pop';
  pop.setAttribute('aria-hidden', 'true');
  pop.innerHTML = '<canvas></canvas><p class="seven-stars-pop__copy"><span>대한민국이 사랑한 사이다</span><b>모두와 함께 큰 별</b></p>';
  document.body.append(pop);
  const canvas = pop.querySelector('canvas');
  const ctx = canvas.getContext('2d');

  // Progress marks on the SEVEN STARS scroll (paper is fully white at .68).
  const COVER_AT = .665;          // our white sheet takes over the screen
  const BURST_AT = .67;
  const COPY_IN = [.62, .69];
  const TIDE = [.72, .93];        // white sheet ebbs from bottom to top
  window.__sevenStarsTideStart = COVER_AT;

  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  let p = 0, last = 0, armed = true, parts = [], foam = [], born = -1e9, raf = 0, prev = 0;
  let w = 0, h = 0, dpr = 1;

  function size() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    if (w === innerWidth && h === innerHeight) return;
    w = innerWidth; h = innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function burst() {
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
  }

  function bubble(x, y, r, a, fill) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = 'rgba(61,187,126,' + (.45 * a).toFixed(3) + ')'; ctx.fill(); return; }
    ctx.strokeStyle = 'rgba(20,159,92,' + (.7 * a).toFixed(3) + ')';
    ctx.lineWidth = Math.max(1, r * .18); ctx.stroke();
    ctx.beginPath(); ctx.arc(x - r * .35, y - r * .35, r * .22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,' + (.9 * a).toFixed(3) + ')'; ctx.fill();
  }

  // Wavy tide line: base height plus two rolling swells.
  const edge = (x, base, t, amp, phase) =>
    base + amp * Math.sin(x * .0062 + t * 1.7 + phase) + amp * .55 * Math.sin(x * .0141 - t * 2.4 + phase * 1.7);

  function sheet(base, t, amp, phase, style) {
    ctx.beginPath();
    ctx.moveTo(0, -10);
    for (let x = 0; x <= w + 24; x += 24) ctx.lineTo(x, edge(x, base, t, amp, phase));
    ctx.lineTo(w, -10);
    ctx.closePath();
    ctx.fillStyle = style;
    ctx.fill();
  }

  function draw(now) {
    raf = 0;
    size();
    const dt = Math.min(.05, (now - (prev || now)) / 1000); prev = now;
    const t = now / 1000;
    const tide = sm(TIDE[0], TIDE[1], p);
    const covering = p >= COVER_AT && tide < 1;
    ctx.clearRect(0, 0, w, h);

    let base = 0;
    if (covering) {
      // Edge travels from just below the screen to just above it.
      const amp = 16 + 22 * Math.sin(Math.PI * Math.min(1, tide * 1.15));
      base = (h + 60) - tide * (h + 160);
      sheet(base + 26, t, amp * .8, 1.3, 'rgba(255,255,255,.45)');   // trailing foam
      sheet(base, t, amp, 0, '#ffffff');                              // the receding sheet
      // Bubbles ride and shed off the edge while it moves.
      if (tide > 0 && tide < 1 && !reduced.matches && foam.length < 140) {
        const n = 2 + Math.round(dt * 160);
        for (let i = 0; i < n; i++) {
          const x = Math.random() * w;
          foam.push({ x, y: edge(x, base, t, amp, 0) + Math.random() * 30, r: 1.5 + Math.random() ** 2 * 8,
            vy: -(60 + Math.random() * 160), wob: Math.random() * 6.28, life: .7 + Math.random() * .8, age: 0,
            fill: Math.random() < .3 });
        }
      }
    }
    // Edge bubbles fizz upward and fade.
    foam = foam.filter(b => (b.age += dt) < b.life);
    for (const b of foam) {
      b.y += b.vy * dt; b.x += Math.sin(t * 6 + b.wob) * 18 * dt;
      const k = b.age / b.life;
      bubble(b.x, b.y, b.r, (k < .15 ? k / .15 : 1) * (1 - k), b.fill);
    }
    // Pop: bubbles flung from the centre, then rising.
    const age = (now - born) / 1000;
    let alive = false;
    for (const q of parts) {
      const k = age / q.life;
      if (k >= 1) continue;
      alive = true;
      const drag = Math.exp(-dt * 3.2);
      q.vx *= drag; q.vy = q.vy * drag - q.rise * dt * 6;
      q.x += (q.vx + Math.sin(age * 7 + q.wob) * 14) * dt; q.y += q.vy * dt;
      bubble(q.x, q.y, q.r, (k < .1 ? k / .1 : 1) * (1 - k) ** 1.4, q.fill);
    }
    if (!alive) parts = [];

    // Copy sits on the white sheet and leaves with it.
    const copyIn = sm(COPY_IN[0], COPY_IN[1], p);
    const lift = covering ? Math.min(0, base - h) : 0;
    pop.style.setProperty('--pop-copy', (copyIn * (1 - sm(.55, .85, tide))).toFixed(3));
    pop.style.setProperty('--pop-lift', lift.toFixed(1) + 'px');

    const tideMoving = covering && tide > 0;
    const busy = alive || foam.length > 0 || tideMoving;
    pop.classList.toggle('is-on', covering || busy || copyIn > 0);
    if (busy) raf = requestAnimationFrame(draw); else prev = 0;
  }
  const schedule = () => { if (!raf) raf = requestAnimationFrame(draw); };

  addEventListener('chilsung:star-progress', e => {
    p = e.detail;
    if (p < BURST_AT - .08) armed = true;
    if (armed && last < BURST_AT && p >= BURST_AT && p < BURST_AT + .12 && !reduced.matches) {
      armed = false; size(); burst();
    }
    last = p;
    schedule();
  });
  addEventListener('resize', schedule, { passive: true });
})();
