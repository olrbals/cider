// Adapted from the supplied React Bits BlobCursor behavior for this static site.
// The translucent surface and bubbles use one lightweight 2D canvas.
(() => {
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!finePointer.matches || reducedMotion.matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'jelly-cursor-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  document.body.classList.add('has-jelly-cursor');

  const context = canvas.getContext('2d', { alpha: true });
  const mask = document.createElement('canvas');
  const maskContext = mask.getContext('2d', { alpha: true });
  if (!context || !maskContext) {
    canvas.remove();
    document.body.classList.remove('has-jelly-cursor');
    return;
  }

  const cursor = { x: 0, y: 0, targetX: 0, targetY: 0, radius: 64, alpha: 0, seen: false, inside: false, hover: false, pulse: 0 };
  const trail = Array.from({ length: 22 }, () => ({ x: 0, y: 0 }));
  const bubbles = [];
  const rings = [];
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let frame = 0;
  let previousTime = 0;
  let lastMovement = 0;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, width > 2200 ? 0.75 : 1);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    mask.width = canvas.width;
    mask.height = canvas.height;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    maskContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    requestFrame();
  }

  function requestFrame() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function place(x, y) {
    cursor.x = cursor.targetX = x;
    cursor.y = cursor.targetY = y;
    for (const bead of trail) {
      bead.x = x;
      bead.y = y;
    }
    cursor.seen = true;
  }

  function onMove(event) {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    if (!cursor.seen) place(event.clientX, event.clientY);
    cursor.targetX = event.clientX;
    cursor.targetY = event.clientY;
    cursor.inside = true;
    cursor.hover = Boolean(event.target instanceof Element && event.target.closest('a, button, [role="button"]'));
    lastMovement = performance.now();
    requestFrame();
  }

  function pop(x, y) {
    const count = 24;
    const offset = Math.random() * Math.PI * 2;
    cursor.pulse = 1;
    rings.push({ x, y, age: 0, life: 0.35 });
    for (let index = 0; index < count; index++) {
      const angle = offset + (index / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.18;
      const speed = 105 + Math.random() * 165;
      bubbles.push({
        x: x + Math.cos(angle) * 12,
        y: y + Math.sin(angle) * 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 45,
        radius: 2 + Math.random() * 5,
        life: 0.45 + Math.random() * 0.4,
        age: 0,
        star: index % 5 === 0
      });
    }
    if (bubbles.length > 85) bubbles.splice(0, bubbles.length - 85);
    requestFrame();
  }

  function onDown(event) {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    if (!cursor.seen) place(event.clientX, event.clientY);
    cursor.inside = true;
    lastMovement = performance.now();
    pop(event.clientX, event.clientY);
  }

  function drawBead(x, y, radius, opacity) {
    const fill = context.createRadialGradient(x - radius * 0.35, y - radius * 0.4, 0, x, y, radius);
    fill.addColorStop(0, `rgba(255,255,255,${0.42 * opacity})`);
    fill.addColorStop(0.58, `rgba(255,255,255,${0.08 * opacity})`);
    fill.addColorStop(1, `rgba(255,255,255,${0.22 * opacity})`);
    context.fillStyle = fill;
    context.strokeStyle = `rgba(255,255,255,${0.85 * opacity})`;
    context.lineWidth = 1.2;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }

  function drawLiquid(time) {
    const centers = [cursor, ...trail];
    const radius = cursor.radius * (1 - cursor.pulse * 0.08);
    maskContext.clearRect(0, 0, width, height);
    maskContext.fillStyle = '#fff';
    maskContext.strokeStyle = '#fff';
    maskContext.lineCap = 'round';
    maskContext.lineJoin = 'round';

    const profile = index => {
      const progress = index / (centers.length - 1);
      const swell = 0.9 + 0.44 * Math.sin(Math.PI * progress) - 0.84 * Math.pow(progress, 3);
      return Math.max(0.06, swell * (1 + Math.sin(time * 0.0018 + index * 0.63) * 0.055));
    };
    for (let index = centers.length - 2; index >= 0; index--) {
      const first = centers[index];
      const second = centers[index + 1];
      const reach = radius * (profile(index) + profile(index + 1));
      maskContext.lineWidth = reach;
      maskContext.beginPath();
      maskContext.moveTo(first.x, first.y);
      maskContext.lineTo(second.x, second.y);
      maskContext.stroke();
    }
    for (let index = centers.length - 1; index >= 0; index--) {
      const point = centers[index];
      maskContext.beginPath();
      maskContext.arc(point.x, point.y, radius * profile(index), 0, Math.PI * 2);
      maskContext.fill();
    }

    context.save();
    context.globalAlpha = cursor.alpha * 0.2;
    context.filter = 'blur(15px)';
    context.drawImage(mask, 0, 0, width, height);
    context.restore();
    context.save();
    context.globalAlpha = cursor.alpha * 0.43;
    context.drawImage(mask, 0, 0, width, height);

    const gleam = context.createRadialGradient(cursor.x - radius * 0.3, cursor.y - radius * 0.4, 0, cursor.x, cursor.y, radius * 1.3);
    gleam.addColorStop(0, 'rgba(255,255,255,0.16)');
    gleam.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gleam;
    context.beginPath();
    context.arc(cursor.x, cursor.y, radius * 1.3, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawBubble(bubble) {
    const opacity = Math.max(0, 1 - bubble.age / bubble.life);
    context.save();
    context.globalAlpha = opacity;
    if (bubble.star) {
      const span = bubble.radius * 2.1;
      context.strokeStyle = 'rgba(255,255,255,0.95)';
      context.lineWidth = 1.4;
      context.beginPath();
      context.moveTo(bubble.x - span, bubble.y);
      context.lineTo(bubble.x + span, bubble.y);
      context.moveTo(bubble.x, bubble.y - span);
      context.lineTo(bubble.x, bubble.y + span);
      context.stroke();
    } else {
      drawBead(bubble.x, bubble.y, bubble.radius, 1);
    }
    context.restore();
  }

  function draw(now) {
    frame = 0;
    const dt = Math.min(0.04, (now - (previousTime || now)) / 1000);
    previousTime = now;
    context.clearRect(0, 0, width, height);

    const follow = 1 - Math.exp(-dt * 14);
    cursor.x += (cursor.targetX - cursor.x) * follow;
    cursor.y += (cursor.targetY - cursor.y) * follow;
    cursor.radius += ((cursor.hover ? 72 : 64) - cursor.radius) * (1 - Math.exp(-dt * 10));
    cursor.pulse *= Math.exp(-dt * 8);
    const active = cursor.seen && cursor.inside;
    cursor.alpha += ((active ? 1 : 0) - cursor.alpha) * (1 - Math.exp(-dt * 10));
    trail.forEach((bead, index) => {
      const leader = index ? trail[index - 1] : cursor;
      const ease = 1 - Math.exp(-dt * (14 - index * 0.35));
      bead.x += (leader.x - bead.x) * ease;
      bead.y += (leader.y - bead.y) * ease;
    });
    if (cursor.alpha > 0.01) drawLiquid(now);

    for (let index = rings.length - 1; index >= 0; index--) {
      const ring = rings[index];
      ring.age += dt;
      if (ring.age >= ring.life) {
        rings.splice(index, 1);
        continue;
      }
      const progress = ring.age / ring.life;
      context.beginPath();
      context.arc(ring.x, ring.y, 25 + progress * 105, 0, Math.PI * 2);
      context.strokeStyle = `rgba(255,255,255,${(1 - progress) * 0.55})`;
      context.lineWidth = 2.5 - progress * 1.5;
      context.stroke();
    }

    for (let index = bubbles.length - 1; index >= 0; index--) {
      const bubble = bubbles[index];
      bubble.age += dt;
      if (bubble.age >= bubble.life) {
        bubbles.splice(index, 1);
        continue;
      }
      const drag = Math.exp(-dt * 3.5);
      bubble.vx *= drag;
      bubble.vy = bubble.vy * drag - dt * 55;
      bubble.x += bubble.vx * dt;
      bubble.y += bubble.vy * dt;
      drawBubble(bubble);
    }

    const settling = Math.abs(cursor.alpha - Number(active)) > 0.01 || Math.abs(cursor.radius - (cursor.hover ? 72 : 64)) > 0.2;
    const following = Math.abs(cursor.x - cursor.targetX) > 0.2 || Math.abs(cursor.y - cursor.targetY) > 0.2;
    const tailSettling = trail.some((bead, index) => {
      const leader = index ? trail[index - 1] : cursor;
      return Math.hypot(bead.x - leader.x, bead.y - leader.y) > 0.5;
    });
    if (bubbles.length || rings.length || settling || following || tailSettling || cursor.pulse > 0.01 || (active && now - lastMovement < 500)) requestFrame();
  }

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('pointerout', event => {
    if (event.relatedTarget || (event.clientX >= 0 && event.clientX <= width && event.clientY >= 0 && event.clientY <= height)) return;
    cursor.inside = false;
    requestFrame();
  });
  window.addEventListener('blur', () => { cursor.inside = false; requestFrame(); });
  resize();
})();
