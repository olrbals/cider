/* Scroll transition for the Figma KOREA scene.
 * Site-wide liquid physics is isolated in liquid-gel-global.js.
 * The original 1950–1960 Three.js history animation is untouched.
 */
(() => {
  'use strict';
  const korea = document.querySelector('.korea-scene');
  if (!korea) return;

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const ease = value => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let scrollTicking = false;

  function updateSequence() {
    scrollTicking = false;
    if (reducedMotion.matches) return;
    const viewport = Math.max(1, window.innerHeight);
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


})();
