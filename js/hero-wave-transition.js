/* Scroll-linked liquid wave at the Hero → Seven Stars boundary.
 * The next real section rises from below: no fixed overlay, clone, autoplay
 * or timing dependency. Reverse scroll naturally reverses the wave.
 */
(() => {
  'use strict';
  const scene = document.getElementById('identity');
  const wave = scene?.querySelector('.identity-transition-wave');
  if (!scene || !wave) return;

  const fill = wave.querySelector('.identity-wave-fill');
  const rim = wave.querySelector('.identity-wave-rim');
  const glint = wave.querySelector('.identity-wave-glint');
  if (!fill || !rim || !glint) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.max(0, Math.min(1, value));
  const round = number => Number(number.toFixed(2));
  let pending = false;

  // Cubic curves instead of polygon edges keep the surface fluid and smooth.
  function smoothLine(points) {
    let d = 'M ' + round(points[0][0]) + ' ' + round(points[0][1]);
    for (let i = 0; i < points.length - 1; i++) {
      const prev = points[Math.max(0, i - 1)];
      const a = points[i];
      const b = points[i + 1];
      const next = points[Math.min(points.length - 1, i + 2)];
      d += ' C ' + round(a[0] + (b[0] - prev[0]) / 6) + ' ' +
        round(a[1] + (b[1] - prev[1]) / 6) + ' ' +
        round(b[0] - (next[0] - a[0]) / 6) + ' ' +
        round(b[1] - (next[1] - a[1]) / 6) + ' ' +
        round(b[0]) + ' ' + round(b[1]);
    }
    return d;
  }

  function render() {
    pending = false;
    if (reduced.matches) return;

    const viewport = Math.max(1, window.innerHeight);
    const top = scene.getBoundingClientRect().top;
    // 0 as the rising crest first approaches the lower viewport edge;
    // 1 once Seven Stars has reached the top and completely replaced Hero.
    const t = clamp((viewport + 92 - top) / (viewport + 92));
    const settle = t * t * (3 - 2 * t);
    const amplitude = 1 - .5 * settle;
    const drift = t * Math.PI * 2.2;

    const points = [];
    const segments = 20;
    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      const broad = Math.sin(u * Math.PI * 2.15 + .25 + drift) * 27;
      const small = Math.sin(u * Math.PI * 5.15 - drift * .64 + .8) * 9;
      const slant = (u - .5) * Math.sin(drift * .55) * 13;
      points.push([1000 * u, 82 + amplitude * (broad + small + slant)]);
    }

    const edge = smoothLine(points);
    fill.setAttribute('d', edge + ' L 1000 240 L 0 240 Z');
    rim.setAttribute('d', edge);
    glint.setAttribute('d', edge);
    // The pale foamy crest becomes clearer as the new white section settles.
    wave.style.setProperty('--identity-wave-progress', t.toFixed(4));
  }

  function requestRender() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(render);
  }

  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', requestRender, { passive: true });
  reduced.addEventListener('change', requestRender);
  requestRender();
})();