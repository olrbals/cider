/* Shared liquid cursor: section glow + organic Fill/Outline typography masks.
   Works alongside liquid-gel-global.js without changing Three.js, scrolling,
   product click targets or the original Figma text measurements. */
(() => {
  'use strict';

  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!finePointer.matches || reducedMotion.matches) return;

  const SCENES = [
    '.hero', '.identity-stage', '.korea-stage', '.history-3d-stage',
    '.era', '.product-explorer', '.pop-stage', '.rich-scene', '.outro'
  ].join(', ');
  const HEADLINES = [
    '.hero-type', '.identity-display', '.korea-type',
    '.era-year', '.product-backtype', '.rich-giant'
  ].join(', ');
  const svgNS = 'http://www.w3.org/2000/svg';
  const makeSVG = name => document.createElementNS(svgNS, name);
  const all = [];
  const full = 'M0 0 H1 V1 H0 Z';
  const empty = 'M0 0 Z';
  const glow = document.createElement('div');
  glow.className = 'site-liquid-cursor-glow';
  glow.setAttribute('aria-hidden', 'true');
  document.body.append(glow);

  // Lightweight CSS-animated ring bubbles, independent of the WebGL/DOM gel.
  // They do not intercept pointer, click, scroll, or Three.js events.
  const bubbles = document.createElement('div');
  bubbles.className = 'site-liquid-cursor-particles';
  bubbles.setAttribute('aria-hidden', 'true');
  document.body.append(bubbles);

  const svg = makeSVG('svg');
  svg.classList.add('site-liquid-clip-defs');
  svg.setAttribute('aria-hidden', 'true');
  const defs = makeSVG('defs');
  svg.append(defs);
  document.body.append(svg);

  document.querySelectorAll(HEADLINES).forEach((node, index) => {
    // Preserve every existing <br> and the original element's dimensions.
    if (node.querySelector('.site-liquid-type-fill')) return;
    const markup = node.innerHTML;
    const fill = document.createElement('span');
    const outline = document.createElement('span');
    fill.className = 'site-liquid-type-fill';
    outline.className = 'site-liquid-type-outline';
    fill.innerHTML = markup;
    outline.innerHTML = markup;
    outline.setAttribute('aria-hidden', 'true');

    const paths = [];
    ['fill', 'outline'].forEach((kind) => {
      const clip = makeSVG('clipPath');
      const path = makeSVG('path');
      const id = 'site-liquid-type-' + kind + '-' + index;
      clip.id = id;
      clip.setAttribute('clipPathUnits', 'objectBoundingBox');
      path.setAttribute('clip-rule', 'evenodd');
      path.setAttribute('fill-rule', 'evenodd');
      path.setAttribute('d', kind === 'fill' ? full : empty);
      clip.append(path);
      defs.append(clip);
      (kind === 'fill' ? fill : outline).style.clipPath = 'url(#' + id + ')';
      paths.push(path);
    });
    // Outline must use the original headline color, not its transparent fill.
    node.style.setProperty('--site-liquid-stroke-color', getComputedStyle(node).color);
    node.replaceChildren(fill, outline);
    node.classList.add('site-liquid-outline-target');
    all.push({ node, fillPath: paths[0], outlinePath: paths[1], active: false });
  });

  // The original 240px mask had a fixed size. Now size follows mouse speed
  // and slowly settles into a small droplet after movement stops.
  const MOTION = {
    restRadius: 18,
    movingRadius: 105,
    maxSpeed: .8,
    idleDelayMs: 145,
    expandMs: 100,
    shrinkMs: 390,
    followMs: 155
  };
  let targetX = innerWidth * .5;
  let targetY = innerHeight * .5;
  let x = targetX;
  let y = targetY;
  let previousX = null;
  let previousY = null;
  let previousMoveTime = 0;
  let lastMotionTime = 0;
  let directionX = 1;
  let directionY = 0;
  let velocity = 0;
  let radius = MOTION.restRadius;
  let activeScene = null;
  let frame = 0;
  let lastRender = 0;
  let lastFrame = 0;
  let burstAt = 0;
  let afterFizzAt = 0;
  let stopArmed = false;
  let recoil = 0;
  let recoilVelocity = 0;

  function spawnParticle(isRipple = false) {
    // Small rings appear behind the moving droplet, never as a confetti cloud.
    if (!activeScene || bubbles.childElementCount >= 90) return;
    const particle = document.createElement('span');
    particle.className = isRipple
      ? 'site-liquid-cursor-ripple' : 'site-liquid-cursor-bubble';
    const darkBackground = !activeScene.matches('.product-explorer, .pop-stage');
    const tint = darkBackground
      ? 'rgba(255, 255, 255, .96)' : 'rgba(19, 131, 91, .8)';
    const angle = Math.random() * Math.PI * 2;
    const trail = isRipple ? 0 : Math.random() * (14 + velocity * 42);
    const scatter = isRipple ? 0 : 9 + Math.random() * (21 + velocity * 16);
    const size = isRipple ? 22 : 3.5 + Math.random() * 7;
    particle.style.left = (x - directionX * trail +
      Math.cos(angle) * scatter).toFixed(1) + 'px';
    particle.style.top = (y - directionY * trail +
      Math.sin(angle) * scatter).toFixed(1) + 'px';
    particle.style.width = size.toFixed(1) + 'px';
    particle.style.height = size.toFixed(1) + 'px';
    particle.style.setProperty('--liquid-particle-color', tint);
    particle.style.setProperty('--liquid-bubble-dx',
      (Math.random() * 54 - 27).toFixed(1) + 'px');
    particle.style.setProperty('--liquid-bubble-dy',
      (-22 - Math.random() * 35).toFixed(1) + 'px');
    particle.style.setProperty('--liquid-bubble-duration',
      (650 + Math.random() * 400).toFixed(0) + 'ms');
    particle.addEventListener('animationend', () => particle.remove(), { once: true });
    bubbles.append(particle);
  }

  function spawnBubbles(count) {
    for (let i = 0; i < count; i++) spawnParticle();
  }

  function clear(item) {
    if (!item.active) return;
    item.active = false;
    item.fillPath.setAttribute('d', full);
    item.outlinePath.setAttribute('d', empty);
  }

  function sceneAt(clientX, clientY) {
    const hit = document.elementFromPoint(clientX, clientY);
    return hit instanceof Element ? hit.closest(SCENES) : null;
  }

  function colorFor(scene) {
    if (scene.matches('.identity-stage, .korea-stage')) return '210, 245, 255';
    if (scene.matches('.pop-stage')) return '255, 248, 210';
    if (scene.matches('.product-explorer')) return '166, 255, 198';
    if (scene.matches('.rich-scene')) return '255, 250, 228';
    return '208, 255, 223';
  }

  function updatePointer(event) {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    const now = performance.now();
    const nx = event.clientX;
    const ny = event.clientY;
    let instantaneousSpeed = 0;
    if (previousX !== null && previousMoveTime) {
      const dx = nx - previousX;
      const dy = ny - previousY;
      const distance = Math.hypot(dx, dy);
      if (distance > .45) {
        const elapsed = Math.max(8, now - previousMoveTime);
        instantaneousSpeed = Math.min(1, distance / elapsed / MOTION.maxSpeed);
        velocity = Math.max(velocity, instantaneousSpeed);
        if (instantaneousSpeed > .18) stopArmed = true;
        directionX = dx / distance;
        directionY = dy / distance;
        lastMotionTime = now;
      }
    }
    previousX = nx;
    previousY = ny;
    previousMoveTime = now;
    targetX = nx;
    targetY = ny;
    const next = sceneAt(nx, ny);
    if (next !== activeScene) {
      activeScene = next;
      glow.classList.toggle('is-visible', Boolean(activeScene));
      if (activeScene) glow.style.setProperty('--liquid-glow-rgb', colorFor(activeScene));
      if (!activeScene) all.forEach(clear);
    }
    // Denser, speed-responsive carbonation without filling the whole screen.
    if (activeScene && instantaneousSpeed > .14 && now - burstAt > 52) {
      spawnBubbles(instantaneousSpeed > .68 ? 8 : instantaneousSpeed > .35 ? 6 : 5);
      burstAt = now;
      afterFizzAt = 0;
    }
    if (activeScene && !frame) frame = requestAnimationFrame(render);
  }

  function render(now) {
    frame = requestAnimationFrame(render);
    if (document.hidden || !activeScene || reducedMotion.matches || !finePointer.matches) {
      cancelAnimationFrame(frame);
      frame = 0;
      lastFrame = 0;
      return;
    }
    const dt = Math.min(48, Math.max(8, now - (lastFrame || now - 16)));
    lastFrame = now;

    // Fast expansion on movement, slow viscous contraction at rest.
    const idle = now - lastMotionTime > MOTION.idleDelayMs;
    if (idle && stopArmed) {
      stopArmed = false;
      // One restrained 5-8% squash followed by damped restoration.
      recoilVelocity = -.042;
      spawnBubbles(9);
      spawnParticle(true);
      afterFizzAt = now + 215;
    }
    if (idle && afterFizzAt && now >= afterFizzAt) {
      spawnBubbles(5);
      afterFizzAt = 0;
    }
    const units = dt / 16.667;
    recoilVelocity += -recoil * .19 * units;
    recoilVelocity *= Math.pow(.79, units);
    recoil += recoilVelocity * units;
    if (Math.abs(recoil) < .0002 && Math.abs(recoilVelocity) < .0002) {
      recoil = 0;
      recoilVelocity = 0;
    }
    velocity *= Math.exp(-dt / (idle ? 205 : 495));
    const desired = MOTION.restRadius + (MOTION.movingRadius - MOTION.restRadius) * velocity;
    const responseMs = desired > radius ? MOTION.expandMs : MOTION.shrinkMs;
    radius += (desired - radius) * (1 - Math.exp(-dt / responseMs));
    const follow = 1 - Math.exp(-dt / MOTION.followMs);
    x += (targetX - x) * follow;
    y += (targetY - y) * follow;

    glow.style.setProperty('--liquid-glow-x', x.toFixed(1) + 'px');
    glow.style.setProperty('--liquid-glow-y', y.toFixed(1) + 'px');
    const squash = Math.max(.92, Math.min(1.06, 1 + recoil));
    const lightSize = 32 + radius * 1.1 * squash;
    glow.style.setProperty('--liquid-glow-radius-x', lightSize.toFixed(1) + 'px');
    glow.style.setProperty('--liquid-glow-radius-y', (lightSize * .88).toFixed(1) + 'px');

    // 30fps for SVG masks; cursor positioning remains smooth at display refresh rate.
    if (now - lastRender < 32) return;
    lastRender = now;
    all.forEach(item => {
      const rect = item.node.getBoundingClientRect();
      const radiusX = Math.min(radius * Math.max(.92, Math.min(1.06, 1 + recoil)), innerWidth * .16);
      const radiusY = radiusX * (.9 - velocity * .08);
      const px = x - rect.left;
      const py = y - rect.top;
      if (rect.width < 1 || rect.height < 1 ||
          Math.max(rect.top, 0) >= Math.min(rect.bottom, innerHeight) ||
          px < -radiusX || px > rect.width + radiusX ||
          py < -radiusY || py > rect.height + radiusY ||
          !activeScene.contains(item.node)) {
        clear(item);
        return;
      }
      const points = [];
      const count = 40;
      for (let i = 0; i < count; i++) {
        const angle = Math.PI * 2 * i / count;
        const variation =
          1 + (.028 + .055 * velocity) * Math.sin(angle * 3 + now * .0012)
            + (.016 + .034 * velocity) * Math.cos(angle * 5 - now * .001);
        const ca = Math.cos(angle);
        const sa = Math.sin(angle);
        // The trailing half stretches like thick gel and slowly recovers.
        const tail = 1 + velocity * (ca < 0 ? .31 : .13);
        const along = ca * radiusX * variation * tail;
        const across = sa * radiusY * variation;
        const bx = (px + along * directionX - across * directionY) / rect.width;
        const by = (py + along * directionY + across * directionX) / rect.height;
        points.push(bx.toFixed(4) + ' ' + by.toFixed(4));
      }
      const blob = 'M' + points.join(' L') + ' Z';
      item.fillPath.setAttribute('d', full + ' ' + blob);
      item.outlinePath.setAttribute('d', blob);
      item.active = true;
    });
  }

  function reset() {
    activeScene = null;
    glow.classList.remove('is-visible');
    bubbles.replaceChildren();
    all.forEach(clear);
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = 0;
    previousX = null;
    previousY = null;
    previousMoveTime = 0;
    velocity = 0;
    radius = MOTION.restRadius;
    stopArmed = false;
    recoil = 0;
    recoilVelocity = 0;
    burstAt = 0;
    afterFizzAt = 0;
  }
  window.addEventListener('pointermove', updatePointer, { passive: true });
  document.addEventListener('pointerleave', reset);
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  reducedMotion.addEventListener('change', reset);
  finePointer.addEventListener('change', reset);
  // Pointer can remain stationary while the user scrolls to another section.
  window.addEventListener('scroll', () => {
    if (!activeScene) return;
    const next = sceneAt(targetX, targetY);
    if (next !== activeScene) {
      activeScene = next;
      glow.classList.toggle('is-visible', Boolean(activeScene));
      all.forEach(clear);
      if (activeScene) {
        glow.style.setProperty('--liquid-glow-rgb', colorFor(activeScene));
        if (!frame) frame = requestAnimationFrame(render);
      } else reset();
    }
  }, { passive: true });
})();
