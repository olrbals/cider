/* Scroll sequence derived from the Figma 02main, 02cursor, 03 and 03scroll states.
 * Isolated from the existing jelly-cursor.js and Three.js can renderer.
 * This is a safe pointer-preview layer, NOT the missing local V6 WebGL source.
 */
(() => {
  'use strict';
  const hero = document.querySelector('.hero');
  const identity = document.querySelector('.experience-02');
  const korea = document.querySelector('.korea-scene');
  if (!hero || !identity || !korea) return;

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const ease = value => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const precisePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let scrollTicking = false;

  function updateSequence() {
    scrollTicking = false;
    if (reducedMotion.matches) return;
    const viewport = Math.max(1, window.innerHeight);
    const heroRect = hero.getBoundingClientRect();
    const flowProgress = ease(-heroRect.top / (viewport * 0.84));
    hero.style.setProperty('--liquid-offset', (-112 + flowProgress * 112).toFixed(2) + '%');

    const koreaRect = korea.getBoundingClientRect();
    const available = Math.max(1, koreaRect.height - viewport);
    const progress = clamp(-koreaRect.top / available);
    korea.style.setProperty('--korea-fill', (ease(progress) * 100).toFixed(2) + '%');
    korea.style.setProperty('--korea-shift', (progress * 55).toFixed(2) + 'px');
  }
  function requestScrollTick() {
    if (!scrollTicking) {
      scrollTicking = true;
      window.requestAnimationFrame(updateSequence);
    }
  }
  window.addEventListener('scroll', requestScrollTick, { passive: true });
  window.addEventListener('resize', requestScrollTick, { passive: true });
  reducedMotion.addEventListener('change', requestScrollTick);
  requestScrollTick();

  if (!precisePointer.matches || reducedMotion.matches) return;

  const target = { x: 0, y: 0 };
  const current = { x: 0, y: 0 };
  let active = false;
  let initialized = false;
  let intensity = 0;
  let lastTime = 0;
  let frame = 0;
  let hoverPressure = 0;

  function schedule() {
    if (!frame) frame = window.requestAnimationFrame(tick);
  }
  function tick(time) {
    frame = 0;
    const dt = Math.min(64, Math.max(8, time - (lastTime || time)));
    lastTime = time;
    // A stable exponential response instead of a spring avoids overshoot/vibration.
    const tracking = 1 - Math.exp(-dt / 112);
    current.x += (target.x - current.x) * tracking;
    current.y += (target.y - current.y) * tracking;
    const desiredIntensity = active ? 1 : 0;
    intensity += (desiredIntensity - intensity) * (1 - Math.exp(-dt / 155));
    hoverPressure += ((active ? 1 : 0) - hoverPressure) * (1 - Math.exp(-dt / 240));

    identity.style.setProperty('--cursor-x', current.x.toFixed(1) + 'px');
    identity.style.setProperty('--cursor-y', current.y.toFixed(1) + 'px');
    identity.style.setProperty('--cursor-intensity', intensity.toFixed(3));
    identity.style.setProperty('--cursor-pressure', hoverPressure.toFixed(3));
    identity.style.setProperty('--cursor-shift-x', ((target.x - current.x) * .42).toFixed(1) + 'px');
    identity.style.setProperty('--cursor-shift-y', ((target.y - current.y) * .42).toFixed(1) + 'px');

    if (active || intensity > .004 ||
        Math.abs(target.x - current.x) > .25 ||
        Math.abs(target.y - current.y) > .25) {
      schedule();
    }
  }
  function updatePointer(event) {
    const rect = identity.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left, 0, rect.width);
    const y = clamp(event.clientY - rect.top, 0, rect.height);
    if (!initialized) {
      current.x = x;
      current.y = y;
      initialized = true;
    }
    target.x = x;
    target.y = y;
    schedule();
  }
  identity.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    active = true;
    document.body.dataset.experienceHover = 'true';
    updatePointer(event);
  });
  identity.addEventListener('pointermove', event => {
    if (!active) return;
    updatePointer(event);
  }, { passive: true });
  identity.addEventListener('pointerleave', () => {
    active = false;
    document.body.dataset.experienceHover = 'false';
    schedule();
  });
  window.addEventListener('blur', () => {
    active = false;
    document.body.dataset.experienceHover = 'false';
    schedule();
  });
})();
