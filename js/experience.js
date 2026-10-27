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
  // Each word/letter has its own stretch of the pinned scroll timeline.
  // Sampled poses (not CSS animations) mean reverse scroll reverses the motion.
  const typeParts = [
    { nodes: [...korea.querySelectorAll('.korea-word-feel')], start: .00, end: .32, angle: -8, rise: 1.02 },
    { nodes: [...korea.querySelectorAll('.korea-word-the')], start: .22, end: .57, angle: 7, rise: 1.08 },
    ...[ -12, 10, -9, 12 ].map((angle, index) => ({
      nodes: [...korea.querySelectorAll('.korea-type-base .korea-letter:nth-child(' + (index + 1) + '), .korea-type-reveal .korea-letter:nth-child(' + (index + 1) + ')')],
      start: .45 + index * .07,
      end: .72 + index * .07,
      angle,
      rise: 1.13
    }))
  ];

  const typePoseKeys = [
    { at: 0,    y: 1,    sx: .86, sy: 1.30, rotate: 1,     opacity: 0 },
    { at: .22,  y: .58,  sx: .94, sy: 1.18, rotate: .56,   opacity: 1 },
    { at: .55,  y: -.18, sx: 1.10, sy: .82, rotate: -.31,  opacity: 1 },
    { at: .77,  y: .053, sx: .96, sy: 1.075, rotate: .16, opacity: 1 },
    { at: 1,    y: 0,    sx: 1,   sy: 1,    rotate: 0,     opacity: 1 }
  ];
  function typePose(t) {
    const p = clamp(t);
    let i = 0;
    while (i < typePoseKeys.length - 2 && p > typePoseKeys[i + 1].at) i++;
    const a = typePoseKeys[i];
    const b = typePoseKeys[i + 1];
    const segment = clamp((p - a.at) / (b.at - a.at));
    const smooth = segment * segment * (3 - 2 * segment);
    const lerp = key => a[key] + (b[key] - a[key]) * smooth;
    return { y: lerp('y'), sx: lerp('sx'), sy: lerp('sy'), rotate: lerp('rotate'), opacity: lerp('opacity') };
  }
  function scrubType(progress) {
    typeParts.forEach(part => {
      const local = clamp((progress - part.start) / (part.end - part.start));
      const pose = typePose(local);
      const transform = 'translate3d(0,' + (pose.y * part.rise).toFixed(4) + 'em,0) ' +
        'rotate(' + (pose.rotate * part.angle).toFixed(3) + 'deg) ' +
        'scale(' + pose.sx.toFixed(4) + ',' + pose.sy.toFixed(4) + ')';
      part.nodes.forEach(node => {
        node.style.transform = transform;
        node.style.opacity = pose.opacity.toFixed(3);
      });
    });
  }

  let scrollTicking = false;

  function updateSequence() {
    scrollTicking = false;
    if (reducedMotion.matches) return;
    const viewport = Math.max(1, window.innerHeight);
    const koreaRect = korea.getBoundingClientRect();
    const available = Math.max(1, koreaRect.height - viewport);
    const progress = clamp(-koreaRect.top / available);
    scrubType(progress);
    korea.style.setProperty('--korea-fill', (ease(progress) * 100).toFixed(2) + '%');
    korea.style.setProperty('--korea-shift', (progress * 55).toFixed(2) + 'px');
  }
  function requestScrollTick() {
    if (!scrollTicking) {
      scrollTicking = true;
      window.requestAnimationFrame(updateSequence);
    }
  }
  // JS is initialized only after the heading is present in the DOM.
  // No timer: motion pauses at its exact scroll position and reverses on scroll-up.
  if (!reducedMotion.matches) {
    scrubType(0);
    korea.classList.add('is-type-ready');
  }

  window.addEventListener('scroll', requestScrollTick, { passive: true });
  window.addEventListener('resize', requestScrollTick, { passive: true });
  reducedMotion.addEventListener('change', requestScrollTick);
  requestScrollTick();


})();
