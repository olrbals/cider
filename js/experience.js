/* Scroll transitions for the Figma HERO → 02 → 03 scenes.
 * Site-wide liquid physics is isolated in liquid-gel-global.js.
 * The original 1950–1960 Three.js history animation is untouched.
 */
(() => {
  'use strict';
  const hero = document.querySelector('.hero');
  const identity = document.querySelector('.experience-02');
  const stars = [...document.querySelectorAll('.identity-scroll-stars img')];
  const korea = document.querySelector('.korea-scene');
  if (!hero || !identity || !korea) return;

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const ease = value => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // The seven Figma vectors converge on their 02cursor positions as the
  // SEVEN STARS scene is scrolled. Reversing the scroll reverses the paths.
  const starOrigins = [
    [-.60, -.56, -115], [-.38, -.80, 92], [-.28, -.20, -70],
    [.15, -.73, 130], [-.68, .11, -90], [.07, -.36, 65], [-.46, -.43, 105]
  ];
  let scrollTicking = false;

  function updateSequence() {
    scrollTicking = false;
    if (reducedMotion.matches) return;
    const viewport = Math.max(1, window.innerHeight);
    const heroRect = hero.getBoundingClientRect();
    const flowProgress = ease(-heroRect.top / (viewport * 0.84));
    hero.style.setProperty('--liquid-offset', (-112 + flowProgress * 112).toFixed(2) + '%');

    const identityRect = identity.getBoundingClientRect();
    const identityTravel = Math.max(1, identityRect.height - viewport);
    const identityProgress = clamp(-identityRect.top / identityTravel);
    stars.forEach((star, index) => {
      const arrival = ease((identityProgress - .04 - index * .035) / .62);
      const [originX, originY, rotation] = starOrigins[index];
      const dx = originX * Math.min(window.innerWidth, 1440) * (1 - arrival);
      const dy = originY * viewport * (1 - arrival);
      star.style.opacity = (arrival * .96).toFixed(3);
      star.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) rotate(${(rotation * (1 - arrival)).toFixed(1)}deg) scale(${(.5 + .5 * arrival).toFixed(3)})`;
    });

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
