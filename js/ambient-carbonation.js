/* Continuous, full-viewport rising soda carbonation.
 * Reference: translucent air bubbles with bright rims and dark refracted edges.
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

  // Cached illustrated glass bubbles: translucent interior, silver shadow rim,
  // asymmetric white reflective crescents. Only drawImage runs each animation frame.
  function makeBubbleSprite(variant) {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 96;
    const brush = sprite.getContext('2d');
    if (!brush) return sprite;
    const center = 48, radius = 32;

    const halo = brush.createRadialGradient(center + 1, center + 2, 26, center, center, 39);
    halo.addColorStop(0, 'rgba(12,30,38,0)');
    halo.addColorStop(.52, 'rgba(12,30,38,0)');
    halo.addColorStop(.82, variant === 0 ? 'rgba(32,47,57,.22)' : 'rgba(32,47,57,.34)');
    halo.addColorStop(1, 'rgba(32,47,57,0)');
    brush.fillStyle = halo;
    brush.fillRect(0, 0, 96, 96);

    // The inner area stays transparent so typography and images remain visible.
    const sheen = brush.createRadialGradient(center - 11, center - 13, 0, center, center, radius);
    sheen.addColorStop(0, 'rgba(255,255,255,.13)');
    sheen.addColorStop(.63, 'rgba(255,255,255,.015)');
    sheen.addColorStop(1, 'rgba(255,255,255,.035)');
    brush.beginPath();
    brush.arc(center, center, radius, 0, Math.PI * 2);
    brush.fillStyle = sheen;
    brush.fill();

    const rim = brush.createLinearGradient(15, 12, 82, 86);
    rim.addColorStop(0, 'rgba(255,255,255,.96)');
    rim.addColorStop(.34, 'rgba(245,252,255,.6)');
    rim.addColorStop(.59, 'rgba(37,49,63,.46)');
    rim.addColorStop(1, 'rgba(10,23,31,.78)');
    brush.beginPath();
    brush.arc(center, center, radius, 0, Math.PI * 2);
    brush.strokeStyle = rim;
    brush.lineWidth = variant === 0 ? 2.1 : 3;
    brush.stroke();

    brush.beginPath();
    brush.arc(center - .4, center - .4, radius - 2.9, Math.PI * 1.03, Math.PI * 1.52);
    brush.strokeStyle = 'rgba(255,255,255,.97)';
    brush.lineWidth = variant === 0 ? 3.5 : 4.5;
    brush.lineCap = 'round';
    brush.stroke();

    brush.beginPath();
    brush.arc(center + .8, center + .8, radius - 2.4, -.13, 1.12);
    brush.strokeStyle = 'rgba(29,40,50,.35)';
    brush.lineWidth = 2.2;
    brush.stroke();

    brush.beginPath();
    brush.ellipse(center - 13, center - 18, 5.4, 2.8, -.6, 0, Math.PI * 2);
    brush.fillStyle = 'rgba(255,255,255,.82)';
    brush.fill();

    brush.beginPath();
    brush.arc(center + 17, center + 17, 2.1, 0, Math.PI * 2);
    brush.fillStyle = 'rgba(255,255,255,.52)';
    brush.fill();

    return sprite;
  }
  const sprites = [makeBubbleSprite(0), makeBubbleSprite(1)];

  function desiredCount() {
    // Full-screen distribution like the reference, subdued enough for legible type.
    return clamp(Math.round((width * height / 5600) * densityFactor), 80, lowPower ? 150 : 280);
  }

  function makeParticle(distribute = false, around = null) {
    const choice = Math.random();
    // Fine, densely distributed soda bubbles: mostly tiny rings, rare medium bubbles.
    const radius = choice < .55 ? random(.9, 2.2) :
      choice < .88 ? random(2.3, 4.6) :
      choice < .975 ? random(4.7, 7.2) : random(7.3, 10.2);
    const depth = choice < .65 ? 0 : 1;
    const rise = random(55, 145) * (depth ? 1.1 : .9);
    const x = around === null ? random(-8, width + 8) : around + random(-28, 28);
    const y = distribute ? random(-radius, height + radius) : height + radius * random(2, 7);
    return {
      x, y, radius, rise,
      side: random(-11, 11),
      phase: random(0, Math.PI * 2),
      wobble: random(.35, 1.3),
      amp: random(2, 11),
      alpha: random(depth ? .48 : .35, depth ? .91 : .68),
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

      // Asymmetric drift: no rigid columns, with an occasional tiny bubble cluster.
      const sway = Math.sin(p.age * p.wobble + p.phase) * p.amp;
      const topFade = clamp((p.y + p.radius * 3) / 80, 0, 1);
      const bottomFade = clamp((height + p.radius - p.y) / 75, 0, 1);
      ctx.globalAlpha = p.alpha * topFade * bottomFade;
      const drawSize = p.radius * 2.85;
      ctx.drawImage(sprites[p.kind], p.x + sway - drawSize / 2,
        p.y - drawSize / 2, drawSize, drawSize);
    }
    ctx.globalAlpha = 1;

    // Keep a steady density; replacement bubbles originate below the viewport.
    // 22% of new bubbles join small streams, instead of all being evenly spaced.
    spawnCredit += (targetCount / Math.max(2, height / 110)) * dt;
    while (spawnCredit >= 1 && particles.length < targetCount) {
      const cluster = Math.random() < .22 && particles.length > 0 ?
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
    const show = beyondHero && !document.hidden && !reducedMotion.matches;
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
