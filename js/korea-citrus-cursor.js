/* Figma 03scroll citrus pair. Runs only within FEEL THE FIZZ on fine pointers.
 * The existing liquid gel, typography effects and carbonation stay active.
 */
(() => {
  'use strict';
  const scene = document.querySelector('.korea-stage');
  if (!scene) return;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!finePointer.matches || reduceMotion.matches) return;

  const cursor = document.createElement('div');
  cursor.className = 'korea-citrus-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML =
    '<img class="citrus-lemon" src="img/figma/citrus-lemon.svg" alt="" width="100" height="100" draggable="false">' +
    '<img class="citrus-lime" src="img/figma/citrus-lime.svg" alt="" width="105" height="105" draggable="false">';
  document.body.append(cursor);

  let targetX = 0, targetY = 0, x = 0, y = 0;
  let pointerX = -1, pointerY = -1, tilt = 0;
  let active = false, frame = 0;
  const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi);
  function within(px, py) {
    if (px < 0 || py < 0) return false;
    const hit = document.elementFromPoint(px, py);
    return hit instanceof Element && hit.closest('.korea-stage') === scene;
  }
  function anchor(px, py) {
    return {
      x: clamp(px - 55, 8, Math.max(8, innerWidth - 159)),
      y: clamp(py + 17, 8, Math.max(8, innerHeight - 129))
    };
  }
  function hide() {
    active = false;
    cursor.classList.remove('is-visible');
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }
  function render() {
    frame = 0;
    if (!active || document.hidden || reduceMotion.matches || !finePointer.matches) return hide();
    x += (targetX - x) * .17;
    y += (targetY - y) * .17;
    tilt *= .83;
    cursor.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' +
      y.toFixed(2) + 'px,0) rotate(' + tilt.toFixed(2) + 'deg)';
    if (Math.abs(targetX - x) > .12 || Math.abs(targetY - y) > .12 || Math.abs(tilt) > .04)
      frame = requestAnimationFrame(render);
  }
  function follow(event) {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!within(pointerX, pointerY)) return hide();
    const next = anchor(pointerX, pointerY);
    targetX = next.x;
    targetY = next.y;
    if (!active) {
      x = targetX;
      y = targetY;
      tilt = 0;
      active = true;
      cursor.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' +
        y.toFixed(2) + 'px,0)';
      cursor.classList.add('is-visible');
    } else {
      tilt = clamp(tilt + (targetX - x) * .006, -6, 6);
    }
    if (!frame) frame = requestAnimationFrame(render);
  }
  function recheck() {
    if (active && !within(pointerX, pointerY)) hide();
  }

  window.addEventListener('pointermove', follow, { passive: true });
  window.addEventListener('scroll', recheck, { passive: true });
  window.addEventListener('resize', recheck, { passive: true });
  document.addEventListener('pointerleave', hide);
  window.addEventListener('blur', hide);
  document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); });
  finePointer.addEventListener('change', () => { if (!finePointer.matches) hide(); });
  reduceMotion.addEventListener('change', () => { if (reduceMotion.matches) hide(); });
})();
