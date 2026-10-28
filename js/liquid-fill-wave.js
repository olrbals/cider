/* Final liquid-fill detail: a slow waterline replaces straight clipping on
 * the growing SEVEN STARS A-star and FEEL THE FIZZ's green reveal.
 * This is a presentation-only layer: scroll timing, movement, Hero, history,
 * cursor effects and existing no-JS/reduced-motion fallbacks are untouched. */
(() => {
  'use strict';

  const identity = document.getElementById('identity');
  const korea = document.getElementById('korea');
  if (!identity || !korea) return;

  const clamp = (value, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, value));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const starLiquids = [...identity.querySelectorAll('.identity-main-star-liquid')];
  const typeReveal = korea.querySelector('.korea-type-reveal');
  if (!starLiquids.length && !typeReveal) return;

  // Clip the already printed path/typography, rather than painting another
  // layer. The original green and cream typography therefore stay aligned.
  function waveClip(fill, amplitude, cycles, phase) {
    const level = clamp(fill);
    if (level <= .001) return 'inset(100% 0 0 0)';
    if (level >= .999) return 'inset(0 0 0 0)';

    // At the beginning and end, gently flatten the waterline. The wave never
    // leaves a sliver unfilled after the scroll-driven reveal completes.
    const edge = 100 * (1 - level);
    const strength = Math.min(1, level * 12, (1 - level) * 12);
    const points = [];
    const samples = 40;
    for (let i = 0; i <= samples; i++) {
      const x = 100 * i / samples;
      const y = clamp(
        (edge + Math.sin((i / samples) * Math.PI * 2 * cycles + phase) * amplitude * strength) / 100
      ) * 100;
      points.push(x.toFixed(2) + '% ' + y.toFixed(2) + '%');
    }
    points.push('100% 100%', '0% 100%');
    return 'polygon(' + points.join(',') + ')';
  }

  let queued = false;
  function request() {
    if (queued || document.hidden) return;
    queued = true;
    requestAnimationFrame(render);
  }

  function render(now) {
    queued = false;
    if (reducedMotion.matches) {
      starLiquids.forEach(path => { path.style.clipPath = ''; });
      if (typeReveal) typeReveal.style.clipPath = '';
      return;
    }

    // The existing scroll modules own the percentages. Reading them here
    // avoids changing the layout, the star's growth, or the FIZZ dance.
    const starFill = clamp(parseFloat(identity.style.getPropertyValue('--identity-star-fill')) / 100 || 0);
    const textFill = clamp(parseFloat(korea.style.getPropertyValue('--korea-fill')) / 100 || 0);
    const height = Math.max(1, window.innerHeight);
    const starRect = identity.getBoundingClientRect();
    const textRect = korea.getBoundingClientRect();
    const starVisible = starRect.top < height && starRect.bottom > 0;
    const textVisible = textRect.top < height && textRect.bottom > 0;

    if (starLiquids.length) {
      const clip = waveClip(starFill, 4.2, 2.1, now * .00105);
      starLiquids.forEach(path => { path.style.clipPath = clip; });
    }
    if (typeReveal) {
      const typeHeight = Math.max(1, typeReveal.getBoundingClientRect().height);
      const wavePixels = clamp(10 + typeHeight * .003, 8, 14);
      const clip = waveClip(textFill, 100 * wavePixels / typeHeight, 2.35, now * .0012 + .6);
      typeReveal.style.clipPath = clip;
    }

    // A paused scroll keeps only the partly filled visible waterline moving.
    // Once the fill finishes or the user leaves the section, stop all frames.
    const starActive = starVisible && starFill > .001 && starFill < .999;
    const textActive = textVisible && textFill > .001 && textFill < .999;
    if (starActive || textActive) request();
  }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request, { passive: true });
  reducedMotion.addEventListener('change', request);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) request();
  });
  request();
})();
