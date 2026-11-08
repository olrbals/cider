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
  let targetCount = 0, spawnCredit = 0, frame = 0, lastTime = 0, historyFade = 1;
  let active = false;
  let richProductsActive = false;

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
  // 11-08 — every so often a tiny star rises among the bubbles (CFC: stars = fizz).
  function makeStarSprite() {
    const c = document.createElement('canvas'); c.width = c.height = 96;
    const g = c.getContext('2d'); if (!g) return c;
    const path = new Path2D('M48 10 L57.8 36 H85 L63.5 52.5 L71.5 79 L48 63 L24.5 79 L32.5 52.5 L11 36 H38.2 Z');
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fill(path);
    g.lineJoin = 'round'; g.lineWidth = 4.5; g.strokeStyle = 'rgba(5,148,91,.75)'; g.stroke(path);
    return c;
  }
  const sprites = [makeBubbleSprite(0), makeBubbleSprite(1), makeStarSprite()];

  function desiredCount() {
    return clamp(Math.round((width * height / 20200) * densityFactor), 30, lowPower ? 60 : 90);
  }

  function makeParticle(distribute = false, around = null) {
    const choice = Math.random();
    // Readable rings with a few small companion bubbles, never pixel-sized dots.
    const radius = choice < .18 ? random(3.2, 4) :
      choice < .75 ? random(4.2, 6.2) : random(6.3, 8.125 * 1.22);
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
      kind: Math.random() < .04 ? 2 : depth,
      age: random(0, 10)
    };
  }

  function resize() {
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    dpr = 1;   // 11-07: soft bubbles don't need retina pixels — big saving on laptops
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
      p.y -= p.rise * dt * (richProductsActive ? .25 : 1);
      p.x += p.side * dt;
      if (p.y < -p.radius * 4 || p.x < -60 || p.x > width + 60) {
        particles.splice(i, 1);
        continue;
      }

      // Uneven floating paths and a few small bubble streams.
      const sway = Math.sin(p.age * p.wobble + p.phase) * p.amp;
      const topFade = clamp((p.y + p.radius * 3) / 80, 0, 1);
      const bottomFade = clamp((height + p.radius - p.y) / 75, 0, 1);
      if (richProductsActive && i % 3 !== 0) continue;
      ctx.globalAlpha = p.alpha * topFade * bottomFade;
      const drawSize = p.radius * 3.05 * (richProductsActive ? .7 : 1);
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

  // V5.2: fade the carbonation in as soon as the hero can starts spinning
  // (first ~third of a screen of scroll) and keep it running from then on.
  function syncHeroBoundary() {
    const heroScroll = hero ? -hero.getBoundingClientRect().top / Math.max(1, innerHeight) : 1;
    const h = Math.max(0, Math.min(1, (heroScroll - .02) / .33));
    const heroFade = h * h * (3 - 2 * h);
    const beyondHero = heroFade > 0;
    const rich = document.querySelector('#rich-flavors');
    const rect = rich?.getBoundingClientRect();
    const progress = rect ? clamp(-rect.top / Math.max(1, rich.offsetHeight - innerHeight), 0, 1) : 0;
    const story = rect ? -rect.top / innerHeight : 0;
    const t = Math.max(0, Math.min(1, story / .38));
    const fade = t * t * (3 - 2 * t);
    richProductsActive = story >= 1.98 && story < 3.45 && rect.bottom > innerHeight;
    // 11-07: rising carbonation on every screen — hero first screen through the footer.
    void heroFade; void beyondHero; void fade;
    // Bubbles end at SEVEN STARS (below); RICH and the footer stay clear.
    // 11-08 (b): fade out in SEVEN STARS as the star turns white; none from then on.
    const ident = document.querySelector('#identity');
    const ir = ident?.getBoundingClientRect();
    const iBase = ir ? Math.max(1, ir.height - innerHeight * 1.7) : 1;   // same scroll base as the star story
    const ip = ir ? -ir.top / iBase : -1;
    const hk = Math.max(0, Math.min(1, (ip - .02) / .28));   // fades gently while the star turns white and splits
    historyFade = 1 - hk * hk * (3 - 2 * hk);
    targetCount = Math.max(0, Math.round(desiredCount() * (.25 + .75 * historyFade)));
    canvas.style.opacity = String((richProductsActive ? .55 : .84) * historyFade);
    const show = historyFade > .01 && !document.hidden && !reducedMotion.matches;
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
