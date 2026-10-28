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
  // liquid-typography-global.js clones and replaces headline markup.
  // Bind only after all defer scripts finish, so we animate the live DOM nodes,
  // never detached originals (or hidden clones with copied inline opacity).
  let typeParts = [];
  let danceLetters = [];
  function bindTypeParts() {
    // Run after the global cursor module has cloned the headlines.
    // Preserve each word wrapper for the existing entrance animation,
    // but give FEEL and THE independent letter spans for the dance.
    ['feel', 'the'].forEach(word => {
      korea.querySelectorAll('.korea-word-' + word).forEach(node => {
        if (node.querySelector('.korea-dance-letter')) return;
        const letters = node.textContent.trim().split('');
        node.replaceChildren(...letters.map(letter => {
          const span = document.createElement('span');
          span.className = 'korea-dance-letter';
          span.textContent = letter;
          return span;
        }));
      });
    });
    danceLetters = ['feel', 'the'].flatMap(word =>
      Array.from(word === 'feel' ? 'FEEL' : 'THE', (_, index) => ({
        word,
        index,
        nodes: [...korea.querySelectorAll('.korea-word-' + word + ' > .korea-dance-letter:nth-child(' + (index + 1) + ')')],
        direction: index % 2 === 0 ? 1 : -1
      }))
    );
    typeParts = [
    { nodes: [...korea.querySelectorAll('.korea-word-feel')], start: .03, end: .27, angle: -8, rise: 1.02, dance: 'feel' },
    { nodes: [...korea.querySelectorAll('.korea-word-the')], start: .16, end: .39, angle: 7, rise: 1.08, dance: 'the' },
    ...[ -12, 10, -9, 12 ].map((angle, index) => ({
      nodes: [...korea.querySelectorAll('.korea-type-base .korea-word-fizz > .korea-letter:nth-child(' + (index + 1) + '), .korea-type-reveal .korea-word-fizz > .korea-letter:nth-child(' + (index + 1) + ')')],
      start: .30 + index * .035,
      end: .455 + index * .035,
      angle,
      rise: 1.13,
      dance: 'fizz',
      direction: index % 2 === 0 ? 1 : -1
    }))
    ];
  }

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
  // The last Z finishes entering at progress ~.56.
  // After a short resting moment, start a subtle, autonomous two-way dance.
  // Unlike the entrance, this animation keeps playing even when scroll stops.
  const DANCE_START = .565;
  const DANCE_END = .985;
  const DANCE_HOLD_MS = 480;
  const DANCE_PERIOD_MS = 2400;
  let danceElapsed = 0;
  let danceLastFrame = 0;
  function scrubType(progress, beat = 0, danceTime = 0, danceStrength = 0) {
    // F↓ / I↑ / Z↓ / Z↑. No lateral motion or rotation for FIZZ.
    const letterRise = Math.min(20, Math.max(12, window.innerHeight * .022));
    typeParts.forEach(part => {
      const local = clamp((progress - part.start) / (part.end - part.start));
      const pose = typePose(local);
      const dx = part.dance === 'the' ? beat * 8 : 0;
      const dy = part.dance === 'feel' ? beat * 10 :
        part.dance === 'fizz' ? beat * letterRise * part.direction : 0;
      const transform = 'translate3d(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px,0) ' +
        'translate3d(0,' + (pose.y * part.rise).toFixed(4) + 'em,0) ' +
        'rotate(' + (pose.rotate * part.angle).toFixed(3) + 'deg) ' +
        'scale(' + pose.sx.toFixed(4) + ',' + pose.sy.toFixed(4) + ')';
      part.nodes.forEach(node => {
        node.style.transform = transform;
        node.style.opacity = pose.opacity.toFixed(3);
      });
    });
    // Independent up/down beats create the fizzy stagger, rather than
    // translating FEEL/THE as static blocks. Each word uses the same
    // restrained cadence so no letters drift sideways or overlap wildly.
    danceLetters.forEach(part => {
      const amplitude = part.word === 'feel' ? 28 : 24;
      const phase = part.index * .34 + (part.word === 'the' ? .55 : 0);
      const wave = Math.sin((danceTime / DANCE_PERIOD_MS) * Math.PI * 2 + phase);
      const offset = wave * amplitude * part.direction * danceStrength;
      const stretch = 1 + (.035 * Math.cos((danceTime / DANCE_PERIOD_MS) * Math.PI * 2 + phase)) * danceStrength;
      part.nodes.forEach(node => {
        node.style.transform = 'translate3d(0,' + offset.toFixed(2) + 'px,0) scaleY(' + stretch.toFixed(4) + ')';
      });
    });
  }

  let scrollTicking = false;

  function updateSequence(now) {
    scrollTicking = false;
    if (reducedMotion.matches || document.hidden) return;
    const viewport = Math.max(1, window.innerHeight);
    const koreaRect = korea.getBoundingClientRect();
    const available = Math.max(1, koreaRect.height - viewport);
    // Preserve the original scroll-scrubbed FEEL → THE → FIZZ entrance.
    const entryOffset = viewport * .12;
    const textProgress = clamp((entryOffset - koreaRect.top) / (entryOffset + available));

    // Only animate autonomously once every word has settled and while the
    // pinned yellow scene is on screen. Ease back to rest before the exit.
    const danceActive = textProgress >= DANCE_START &&
      textProgress < DANCE_END &&
      koreaRect.top < 0 &&
      koreaRect.bottom >= viewport;
    if (danceActive) {
      if (danceLastFrame) danceElapsed += Math.min(50, now - danceLastFrame);
      danceLastFrame = now;
    } else {
      danceElapsed = 0;
      danceLastFrame = 0;
    }
    const danceTime = Math.max(0, danceElapsed - DANCE_HOLD_MS);
    const danceStrength = danceActive
      ? ease(danceTime / 420) * ease((DANCE_END - textProgress) / .06)
      : 0;
    const beat = danceStrength * Math.sin((danceTime / DANCE_PERIOD_MS) * Math.PI * 2);
    scrubType(textProgress, beat, danceTime, danceStrength);

    // Preserve the original independent cream-to-green fill timeline.
    const progress = clamp(-koreaRect.top / available);
    korea.style.setProperty('--korea-fill', (ease(progress) * 100).toFixed(2) + '%');
    korea.style.setProperty('--korea-shift', (progress * 55).toFixed(2) + 'px');

    // Only keep a frame loop alive while the text is actually dancing.
    if (danceActive) requestScrollTick();
  }
  function requestScrollTick() {
    if (!scrollTicking) {
      scrollTicking = true;
      window.requestAnimationFrame(updateSequence);
    }
  }
  // Important: the global cursor effect replaces .korea-type children in a
  // later deferred script. Wait for DOMContentLoaded before binding live spans.
  // Without this, the cloned markup keeps opacity:0 forever.
  function initKoreaMotion() {
    bindTypeParts();
    if (!reducedMotion.matches && typeParts.every(part => part.nodes.length > 0)) {
      korea.classList.add('is-type-ready');
    }
    requestScrollTick();
  }

  window.addEventListener('scroll', requestScrollTick, { passive: true });
  window.addEventListener('resize', requestScrollTick, { passive: true });
  document.addEventListener('visibilitychange', () => {
    danceElapsed = 0;
    danceLastFrame = 0;
    if (!document.hidden) requestScrollTick();
  });
  reducedMotion.addEventListener('change', () => {
    danceElapsed = 0;
    danceLastFrame = 0;
    if (reducedMotion.matches) {
      korea.classList.remove('is-type-ready');
      typeParts.forEach(part => part.nodes.forEach(node => {
        node.style.opacity = '';
        node.style.transform = '';
      }));
      danceLetters.forEach(part => part.nodes.forEach(node => {
        node.style.transform = '';
      }));
      korea.style.removeProperty('--korea-fill');
      korea.style.removeProperty('--korea-shift');
    } else {
      korea.classList.add('is-type-ready');
      requestScrollTick();
    }
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initKoreaMotion, { once: true });
  } else if (document.readyState === 'interactive') {
    // Deferred scripts are still pending while readyState is interactive.
    document.addEventListener('DOMContentLoaded', initKoreaMotion, { once: true });
  } else {
    initKoreaMotion();
  }
})();
