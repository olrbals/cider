/* Scroll-controlled, reversible folder reveal for the three brand principles.
 * Independent of HERO, HISTORY and RICH and designed for static hosting. */
(() => {
  const section = document.getElementById('principles-folder');
  if (!section) return;
  const cards = [...section.querySelectorAll('.pf-card')];
  const lid = section.querySelector('.pf-folder__lid');
  if (!lid || cards.length !== 3) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.min(1, Math.max(0, value));
  const ease = value => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };
  let queued = false;

  const render = () => {
    queued = false;
    if (reduce.matches) {
      lid.style.setProperty('--pf-angle', '-72deg');
      cards.forEach((card, index) => {
        card.style.setProperty('--pf-x', (index - 1) * 286 + 'px');
        card.style.setProperty('--pf-y', '-93px');
        card.style.setProperty('--pf-rot', (index - 1) * 6 + 'deg');
        card.style.setProperty('--pf-scale', '1');
        card.style.setProperty('--pf-opacity', '1');
      });
      return;
    }

    const rect = section.getBoundingClientRect();
    if (rect.top > window.innerHeight || rect.bottom < 0) return;
    const range = Math.max(1, rect.height - window.innerHeight);
    const progress = clamp(-rect.top / range);
    const folderOpen = ease((progress - .06) / .16);
    lid.style.setProperty('--pf-angle', (-72 * folderOpen).toFixed(2) + 'deg');

    const starts = [.16, .36, .56];
    cards.forEach((card, index) => {
      const lift = ease((progress - starts[index]) / .22);
      const spread = index === 0
        ? ease((progress - .38) / .22)
        : index === 2
          ? ease((progress - .56) / .22)
          : 0;
      const x = (index - 1) * 286 * spread;
      const y = 130 - 223 * lift;
      const scale = .55 + .45 * lift;
      const opacity = ease((lift - .18) / .28);
      const rotation = (index - 1) * 6 * spread;
      card.style.setProperty('--pf-x', x.toFixed(2) + 'px');
      card.style.setProperty('--pf-y', y.toFixed(2) + 'px');
      card.style.setProperty('--pf-rot', rotation.toFixed(2) + 'deg');
      card.style.setProperty('--pf-scale', scale.toFixed(3));
      card.style.setProperty('--pf-opacity', opacity.toFixed(3));
    });
  };

  const schedule = () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(render);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  reduce.addEventListener?.('change', schedule);
  render();
})();
