/* Hero-only scroll scene. No canvas, globals, or listeners shared with site effects. */
(() => {
  'use strict';
  const hero = document.querySelector('#top.hero');
  if (!hero) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.max(0, Math.min(1, value));
  const phase = (value, start, end) => clamp((value - start) / (end - start));
  const smooth = value => value * value * (3 - 2 * value);
  let pending = false;

  function update() {
    pending = false;
    const travel = Math.max(1, hero.offsetHeight - window.innerHeight);
    const progress = clamp(-hero.getBoundingClientRect().top / travel);
    const set = (name, value) => hero.style.setProperty(name, value.toFixed(4));

    if (motion.matches) {
      set('--hs-tab', 0);
      set('--hs-jet', 0);
      set('--hs-spread', 0);
      set('--hs-curtain', 0);
      return;
    }

    set('--hs-tab', smooth(phase(progress, .02, .16)));
    set('--hs-jet', smooth(phase(progress, .12, .43)));
    set('--hs-spread', smooth(phase(progress, .36, .66)));
    set('--hs-curtain', smooth(phase(progress, .60, .98)));
  }

  function schedule() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(update);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  motion.addEventListener('change', schedule);
  schedule();
})();
