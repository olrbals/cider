/* Continuous, full-viewport rising soda carbonation.
 * Sparse, readable soda rings instead of a field of snow-like white specks.
 * Independent of mouse-local V6 bubbles, citrus fountain and page scroll effects.
 */
(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hero = document.querySelector('.hero');
  if (reducedMotion.matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'site-ambient-carbonation';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!ctx) return;
  document.body.append(canvas);

  const random = (min, max) => min + Math.random() * (max - min);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const particles = [];
  const maxFrameInterval = 1000 / 30; // Keep existing Three.js and cursor animations responsive.
  const lowPower = Boolean(
    window.navigator.connection && window.navigator.connection.saveData
  ) || (typeof window.navigator.deviceMemory === 'number' && window.navigator.deviceMemory < 4);
  const densityFactor = lowPower ? .55 : 1;
  let width = 0, height = 0, dpr = 1;
  let targetCount = 0, spawnCredit = 0, frame = 0, lastTime = 0;
  let active = false;

  // Cache two sizes of the same clear bubble. A green outer rim reads on white
  // sections, while the white inner rim and glint read on green sections.
  function makeBubbleSprite(variant) {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 96;
    const brush = sprite.getContext('2d');
    if (!brush) return sprite;
    const center = 48, radius = 31;
    const small = variant === 1;

    const sheen = brush.createRadialGradient(38, 35, 2, center, center, radius);
    sheen.addColorStop(0, 'rgba(255,255,255,.34)');
    sheen.addColorStop(.62, 'rgba(255,255,255,.06)');
    sheen.addColorStop(1, 'rgba(91,204,154,.12)');
    brush.beginPath();
    brush.arc(center, center, radius, 0, Math.PI * 2);
    brush.fillStyle = sheen;
    brush.fill();

    brush.beginPath();
    brush.arc(center, center, radius, 0, Math.PI * 2);
    brush.strokeStyle = 'rgba(5,148,91,.72)';
    brush.lineWidth = small ? 4 : 3.5;
    brush.stroke();

    brush.beginPath();
    brush.arc(center - 1, center - 1, radius - 4, Math.PI * 1.06, Math.PI * 1.7);
    brush.strokeStyle = 'rgba(255,255,255,.98)';
    brush.lineWidth = small ? 6 : 5;
    brush.lineCap = 'round';
    brush.stroke();

    brush.beginPath();
    brush.ellipse(center - 12, center - 15, 5, 2.6, -.6, 0, Math.PI * 2);
    brush.fillStyle = 'rgba(255,255,255,.96)';
    brush.fill();

    return sprite;
  }
  const sprites = [makeBubbleSprite(0), makeBubbleSprite(1)];

  function desiredCount() {
    return clamp(Math.round((width * height / 14230) * densityFactor), 46, lowPower ? 85 : 143);
  }

  function makeParticle(distribute = false, around = null) {
    const choice = Math.random();
    // Readable rings with a few small companion bubbles, never pixel-sized dots.
    const radius = choice < .18 ? random(3.2, 4) :
      choice < .75 ? random(4.2, 6.2) : random(6.3, 8.125);
    const depth = choice < .18 ? 1 : 0;
    const rise = random(70, 150) * (depth ? 1.18 : 1);
    const x = around === null ? random(-8, width + 8) : around + random(-28, 28);
    const y = distribute ? random(-radius, height + radius) : height + radius * random(2, 7);
    return {
      x, y, radius, rise,
      side: random(-8, 8),
      phase: random(0, Math.PI * 2),
      wobble: random(.8, 1.7),
      amp: random(4, 14),
      alpha: random(depth ? .63 : .74, depth ? .8 : 1),
      kind: depth,
      age: random(0, 10)
    };
  }

  function resize() {
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    targetCount = desiredCount();
    while (particles.length > targetCount) particles.pop();
    while (particles.length < targetCount) particles.push(makeParticle(true));
  }

  function step(now) {
    frame = 0;
    if (!active) return;
    frame = window.requestAnimationFrame(step);
    if (now - lastTime < maxFrameInterval) return;
    const dt = lastTime ? clamp((now - lastTime) / 1000, .001, .06) : .033;
    lastTime = now;

    ctx.clearRect(0, 0, width, height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      p.y -= p.rise * dt;
      p.x += p.side * dt;
      if (p.y < -p.radius * 4 || p.x < -60 || p.x > width + 60) {
        particles.splice(i, 1);
        continue;
      }

      // Uneven floating paths and a few small bubble streams.
      const sway = Math.sin(p.age * p.wobble + p.phase) * p.amp;
      const topFade = clamp((p.y + p.radius * 3) / 80, 0, 1);
      const bottomFade = clamp((height + p.radius - p.y) / 75, 0, 1);
      ctx.globalAlpha = p.alpha * topFade * bottomFade;
      const drawSize = p.radius * 3.05;
      ctx.drawImage(sprites[p.kind], p.x + sway - drawSize / 2,
        p.y - drawSize / 2, drawSize, drawSize);
    }
    ctx.globalAlpha = 1;

    // Keep a steady density; replacement bubbles originate below the viewport.
    // Some bubbles travel together as carbonation streams.
    spawnCredit += (targetCount / Math.max(2, height / 135)) * dt;
    while (spawnCredit >= 1 && particles.length < targetCount) {
      const cluster = Math.random() < .38 && particles.length > 0 ?
        particles[Math.floor(Math.random() * particles.length)].x : null;
      particles.push(makeParticle(false, cluster));
      spawnCredit -= 1;
    }
    // If rapid particles left screen, replace their slots without a large burst.
    if (particles.length >= targetCount) spawnCredit = Math.min(spawnCredit, 1);
  }

  function suspend() {
    active = false;
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  }
  function resume() {
    if (active || document.hidden || reducedMotion.matches) return;
    active = true;
    lastTime = 0;
    frame = window.requestAnimationFrame(step);
  }

  // Show ambient carbonation after HERO has fully left the viewport.
  function syncHeroBoundary() {
    const beyondHero = !hero || hero.getBoundingClientRect().bottom <= 0;
    const history = document.querySelector('#history-3d');
    const hp = Number(history?.dataset.progress || 0);
    const fade = Math.max(0, Math.min(1, (hp - .88) / .09));
    canvas.style.opacity = String(.84 * (1 - fade));
    const show = beyondHero && fade < 1 && !document.hidden && !reducedMotion.matches;
    canvas.classList.toggle('is-active', show);
    if (show) resume();
    else suspend();
  }

  let scrollFrame = 0;
  window.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = 0;
      syncHeroBoundary();
    });
  }, { passive: true });

  let resizeFrame = 0;
  window.addEventListener('resize', () => {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      resize();
      syncHeroBoundary();
    });
  }, { passive: true });
  document.addEventListener('visibilitychange', syncHeroBoundary);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      suspend();
      canvas.style.display = 'none';
    } else {
      canvas.style.display = '';
      resize();
    }
    syncHeroBoundary();
  });

  resize();
  syncHeroBoundary();
})();
