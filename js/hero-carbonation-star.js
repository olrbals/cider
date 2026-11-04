/* Blender carbonation star, driven exclusively by the existing hero scroll progress. */
(() => {
  'use strict';
  const hero = document.querySelector('#top.hero');
  const field = hero?.querySelector('.hero-carbonation-bubbles');
  if (!hero || !field) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 700px)');
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };
  const phase = (value, start, end) => smooth((value - start) / (end - start));
  const mix = (from, to, amount) => from + (to - from) * amount;

  const bubbles = Array.from({ length: 18 }, (_, index) => {
    const node = document.createElement('i');
    node.className = 'hero-carbonation-bubble';
    const angle = (index * 2.3999632297) + .34;
    const radius = 150 + (index % 6) * 38;
    const size = 3 + (index % 4) * 2.15;
    node.style.width = `${size}px`;
    node.style.height = `${size}px`;
    field.append(node);
    return {
      node,
      angle,
      radius,
      delay: (index % 7) * .014,
      lift: 22 + (index % 5) * 12
    };
  });

  function render(value) {
    const p = reduced.matches ? 0 : clamp(value);
    const enter = phase(p, .20, .43);
    const settle = phase(p, .43, .57);
    const leave = phase(p, .69, .82);
    const visible = enter * (1 - leave);
    hero.style.setProperty('--hero-star-progress', enter.toFixed(4));
    hero.style.setProperty('--hero-star-opacity', (visible * mix(.72, .94, settle)).toFixed(4));
    hero.style.setProperty('--hero-star-scale', mix(.62, 1.035, enter).toFixed(4));
    hero.style.setProperty('--hero-star-rotation', `${mix(-2.5, .65, enter).toFixed(3)}deg`);
    hero.style.setProperty('--hero-star-blur', `${mix(10, 0, phase(p, .20, .37)).toFixed(2)}px`);
    hero.style.setProperty('--hero-intro-opacity', (1 - phase(p, .035, .16)).toFixed(4));

    const burst = phase(p, .24, .50);
    const bubbleFade = 1 - phase(p, .65, .80);
    const viewportScale = mobile.matches ? .68 : Math.min(innerWidth / 1440, innerHeight / 900);
    bubbles.forEach(({ node, angle, radius, delay, lift }, index) => {
      const local = phase(burst, delay, .72 + delay);
      const distance = radius * viewportScale * local;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance - lift * viewportScale * local;
      const wobble = Math.sin(p * 8 + index * 1.7) * 3 * local;
      const opacity = visible * bubbleFade * phase(local, .04, .32) * (1 - phase(local, .82, 1)) * (.35 + (index % 5) * .1);
      node.style.transform = `translate3d(${(x + wobble).toFixed(2)}px, ${(y - wobble * .4).toFixed(2)}px, 0) scale(${mix(.45, 1.08, local).toFixed(3)})`;
      node.style.opacity = opacity.toFixed(3);
    });
  }

  hero.addEventListener('hero-splash:progress', event => render(event.detail?.progress ?? 0));
  const refresh = () => {
    const trigger = window.ScrollTrigger?.getById('hero-splash-only');
    const progress = trigger?.progress ?? clamp(-hero.getBoundingClientRect().top / Math.max(1, hero.offsetHeight - innerHeight));
    render(progress);
  };
  addEventListener('resize', refresh, { passive: true });
  reduced.addEventListener('change', refresh);
  mobile.addEventListener('change', refresh);
  refresh();
})();
