/* Three principle cards: RIGHT -> LEFT -> BOTTOM, then a quick scroll fan.
 * Every pose is derived from scroll, so reverse scroll cleanly rewinds.
 * No folder, timers, GSAP dependency, or changes to other sections. */
(() => {
  'use strict';
  const section = document.getElementById('principles-folder');
  if (!section) return;
  const cards = [...section.querySelectorAll('.pf-card')];
  if (cards.length !== 3) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = v => Math.max(0, Math.min(1, v));
  const smooth = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a + (b - a) * t;
  // A restrained pop when the cards fan out, followed by a short settle.
  const snap = value => {
    const t = clamp(value);
    return t < .78 ? 1.035 * smooth(t / .78)
      : 1 + .035 * (1 - smooth((t - .78) / .22));
  };
  let queued = false;

  const render = () => {
    queued = false;
    if (motion.matches) {
      cards.forEach((card, i) => {
        card.style.setProperty('--pf-x', ((i - 1) * 303) + 'px');
        card.style.setProperty('--pf-y', (i === 1 ? -15 : 0) + 'px');
        card.style.setProperty('--pf-rot', ((i - 1) * 8) + 'deg');
        card.style.setProperty('--pf-scale', '1');
        card.style.setProperty('--pf-opacity', '1');
      });
      return;
    }
    const rect = section.getBoundingClientRect();
    if (rect.top >= window.innerHeight || rect.bottom <= 0) return;
    const available = Math.max(1, rect.height - window.innerHeight);
    const progress = clamp(-rect.top / available);

    const offsetX = Math.max(window.innerWidth * .6, 690);
    const enters = [
      { fromX: offsetX, fromY: -14, start: .035, end: .225, stackX: -12, stackY: 9, stackRot: -9 },
      { fromX: -offsetX, fromY: 12, start: .195, end: .385, stackX: 0, stackY: 0, stackRot: 6 },
      { fromX: 0, fromY: Math.max(490, window.innerHeight * .65), start: .355, end: .54, stackX: 12, stackY: -9, stackRot: -3 }
    ];
    const fanTo = [
      { x: -303, y: 18, rot: -8 },
      { x: 0, y: -18, rot: 0 },
      { x: 303, y: 18, rot: 8 }
    ];
    cards.forEach((card, index) => {
      const a = enters[index];
      const b = fanTo[index];
      const enter = smooth((progress - a.start) / (a.end - a.start));
      // Leave a readable beat with three cards stacked before the spread.
      const open = snap((progress - (.61 + index * .025)) / .18);
      const x = mix(mix(a.fromX, a.stackX, enter), b.x, open);
      const y = mix(mix(a.fromY, a.stackY, enter), b.y, open);
      const rotation = mix(mix(index === 0 ? 17 : index === 1 ? -16 : 8, a.stackRot, enter), b.rot, open);
      const scale = mix(mix(.89, 1, enter), 1, open);
      const alpha = smooth((progress - a.start) / .065);
      card.style.setProperty('--pf-x', x.toFixed(2) + 'px');
      card.style.setProperty('--pf-y', y.toFixed(2) + 'px');
      card.style.setProperty('--pf-rot', rotation.toFixed(2) + 'deg');
      card.style.setProperty('--pf-scale', scale.toFixed(3));
      card.style.setProperty('--pf-opacity', alpha.toFixed(3));
    });
  };
  function requestRender() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(render);
  }
  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', requestRender, { passive: true });
  motion.addEventListener?.('change', requestRender);
  render();
})();
