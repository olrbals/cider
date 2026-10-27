/* FEEL THE FIZZ: cursor-positioned fruit fountain using six lemon/lime slices.
 * Tripled emission versus the original fountain; no attached fruit pair.
 * Bounded canvas keeps V6 carbonation, gel, typography and scroll intact.
 */
(() => {
  'use strict';
  const stage = document.querySelector('.korea-stage');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!stage || !finePointer.matches || reducedMotion.matches) return;

  const SOURCES = [
    'img/fruit/lemon.webp', 'img/fruit/lemon-half.webp',
    'img/fruit/lemon-side.webp', 'img/fruit/lime.webp',
    'img/fruit/lime-half.webp', 'img/fruit/lime-side.webp'
  ];
  const images = SOURCES.map(src => {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    return img;
  });
  const canvas = document.createElement('canvas');
  canvas.className = 'korea-fruit-fountain';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;
  document.body.append(canvas);

  const MAX_FRUIT = 120; // Triple original capacity; bounded for performance.
  const particles = [];
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const random = (a, b) => a + Math.random() * (b - a);
  let bag = [];
  let visible = false;
  let targetX = 0, targetY = 0, cursorX = 0, cursorY = 0;
  let pointerX = -1, pointerY = -1;
  let lastPointerTime = 0, lastMoveTime = 0, lastSpawnTime = 0;
  let headingX = 1, headingY = 0, speed = 0;
  let lastFrameTime = 0, frame = 0;
  let pixelRatio = 1;

  function resize() {
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    canvas.width = Math.round(w * pixelRatio);
    canvas.height = Math.round(h * pixelRatio);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function containsPointer(x, y) {
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return false;
    const hit = document.elementFromPoint(x, y);
    return hit instanceof Element && hit.closest('.korea-stage') === stage;
  }

  // Shuffle bags distribute all six fruit views naturally, without long repeats.
  function nextImage() {
    if (!bag.length) {
      bag = images.map((_, i) => i);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return images[bag.pop()];
  }

  function emit(count, movement) {
    for (let i = 0; i < count && particles.length < MAX_FRUIT; i++) {
      const img = nextImage();
      if (!img.complete || !img.naturalWidth) continue;
      const size = random(movement ? 26 : 24, movement ? 115 : 100);
      const horizontal = random(-100, 100) - headingX * movement * random(8, 38);
      particles.push({
        img,
        x: cursorX + random(-42, 42) - headingX * movement * random(0, 15),
        y: cursorY + random(8, 42),
        vx: horizontal,
        vy: random(-370, -215),
        gravity: random(280, 430),
        angle: random(-Math.PI, Math.PI),
        spin: random(-2.8, 2.8),
        size,
        age: 0,
        lifetime: random(1.05, 1.7),
        opacity: random(.84, 1)
      });
    }
  }

  function stop() {
    visible = false;
    particles.length = 0;
    canvas.classList.remove('is-visible');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastFrameTime = 0;
    lastPointerTime = 0;
    speed = 0;
  }

  function tick(now) {
    frame = 0;
    if (!visible || document.hidden || reducedMotion.matches || !finePointer.matches ||
        !containsPointer(pointerX, pointerY)) return stop();

    const dt = Math.min(48, Math.max(1, now - (lastFrameTime || now - 16))) / 1000;
    lastFrameTime = now;
    const follow = 1 - Math.exp(-dt * 13);
    cursorX += (targetX - cursorX) * follow;
    cursorY += (targetY - cursorY) * follow;

    const moving = now - lastMoveTime < 135;
    const gap = moving ? 60 : 185;
    if (now - lastSpawnTime >= gap) {
      // Triple each emission: moving 6/9/12, idle 3, without a fixed cursor image.
      emit(moving ? (speed > 1.15 ? 12 : speed > .5 ? 9 : 6) : 3, moving ? 1 : 0);
      lastSpawnTime = now;
    }

    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      if (p.age >= p.lifetime) {
        particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
      const life = p.age / p.lifetime;
      const fadeIn = Math.min(1, life / .1);
      const fadeOut = clamp((1 - life) / .34, 0, 1);
      const alpha = p.opacity * fadeIn * fadeOut;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      const size = p.size * (1 - .2 * life);
      ctx.drawImage(p.img, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
    frame = requestAnimationFrame(tick);
  }

  function move(event) {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    const now = performance.now();
    const px = event.clientX, py = event.clientY;
    if (!containsPointer(px, py)) return stop();
    const dx = px - pointerX, dy = py - pointerY;
    const distance = Math.hypot(dx, dy);
    if (lastPointerTime && distance > .5) {
      const elapsed = Math.max(8, now - lastPointerTime);
      speed = distance / elapsed;
      headingX = dx / distance;
      headingY = dy / distance;
      lastMoveTime = now;
    }
    pointerX = px; pointerY = py;
    targetX = px; targetY = py;
    lastPointerTime = now;
    if (!visible) {
      visible = true;
      cursorX = px;
      cursorY = py;
      lastSpawnTime = now - 200;
      lastMoveTime = now - 200;
      canvas.classList.add('is-visible');
      if (!frame) frame = requestAnimationFrame(tick);
    }
  }

  function recheck() {
    if (visible && !containsPointer(pointerX, pointerY)) stop();
  }

  resize();
  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('scroll', recheck, { passive: true });
  window.addEventListener('resize', () => { resize(); recheck(); }, { passive: true });
  document.addEventListener('pointerleave', stop);
  window.addEventListener('blur', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  finePointer.addEventListener('change', () => { if (!finePointer.matches) stop(); });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) stop(); });
})();
