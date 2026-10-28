/* Slosh-like, bottom-up LIQUID WIPE at every post-Hero boundary.
 * The incoming real section remains in document flow. A giant fluid-colored
 * SVG sheet is attached flush to its top and advances with the scroll.
 * Reversing scroll reverses the same geometry: no autoplay or timeouts.
 */
(() => {
  'use strict';
  const ns = 'http://www.w3.org/2000/svg';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const palette = [
    { id: 'identity', color: '#ffffff', accent: '#b9ebce', edge: '#a3debf' },
    { id: 'korea', color: '#ffdd00', accent: '#fff4a0', edge: '#fff0a7' },
    { id: 'history', color: '#0b6038', accent: '#44b879', edge: '#a8edc8' },
    { id: 'products', color: '#f9f4e7', accent: '#ffffff', edge: '#ffffff' },
    { id: 'pop', color: '#ece4d5', accent: '#ffffff', edge: '#fff9eb' },
    { id: 'footer', color: '#0e6b3c', accent: '#48b77e', edge: '#9fe0b8' }
  ];
  const clamp = v => Math.max(0, Math.min(1, v));
  const smooth = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
  const number = v => Number(v.toFixed(2));

  function make(name, className) {
    const node = document.createElementNS(ns, name);
    node.setAttribute('class', className);
    return node;
  }

  // Catmull–Rom through changing samples makes one broad organic S-curve,
  // without the little repeated peaks that made the old version look like
  // a wavy border rather than the screen itself washing in.
  function curve(points) {
    let d = 'M ' + number(points[0][0]) + ' ' + number(points[0][1]);
    for (let i = 0; i < points.length - 1; i++) {
      const prev = points[Math.max(0, i - 1)];
      const a = points[i];
      const b = points[i + 1];
      const next = points[Math.min(points.length - 1, i + 2)];
      d += ' C ' + number(a[0] + (b[0] - prev[0]) / 6) + ' ' +
        number(a[1] + (b[1] - prev[1]) / 6) + ' ' +
        number(b[0] - (next[0] - a[0]) / 6) + ' ' +
        number(b[1] - (next[1] - a[1]) / 6) + ' ' +
        number(b[0]) + ' ' + number(b[1]);
    }
    return d;
  }

  const scenes = palette.map((spec, index) => {
    const section = document.getElementById(spec.id);
    if (!section) return null;
    const svg = make('svg', 'section-wave');
    svg.setAttribute('viewBox', '0 0 1000 1000');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.style.setProperty('--wave-color', spec.color);
    svg.style.setProperty('--wave-accent', spec.accent);
    svg.style.setProperty('--wave-edge', spec.edge);
    const body = make('path', 'section-wave-body');
    const shimmer = make('path', 'section-wave-shimmer');
    const edge = make('path', 'section-wave-edge');
    svg.append(body, shimmer, edge);
    section.insertBefore(svg, section.firstChild);
    return { section, svg, body, shimmer, edge, index };
  }).filter(Boolean);

  function draw(scene, p) {
    const { body, shimmer, edge, index } = scene;
    // Let the whole wave travel with the entering section. A broad sweeping
    // shoulder leads the fill; the other side follows with a soft curved wake.
    const lift = Math.sin(p * Math.PI);
    const base = 991 - 126 * smooth(p);
    const leadLeft = index % 2 === 0;
    const points = [];
    const inset = [];
    const count = 26;

    for (let i = 0; i <= count; i++) {
      const u = i / count;
      const front = leadLeft ? 1 - u : u;
      const diagonal = smooth(front);
      const lip = Math.exp(-Math.pow((front - (.74 + .06 * p)) / .20, 2));
      const trailingDip = Math.exp(-Math.pow((front - .36) / .19, 2));
      // Rise spans the full viewport width, not just a narrow central crest.
      const rise = (0.20 + 0.67 * diagonal + 0.27 * lip - 0.10 * trailingDip);
      const swell = 782 * lift * rise;
      const flow = 18 * lift * Math.sin(front * Math.PI * 2.1 + p * 2.4);
      const y = Math.max(48, Math.min(997, base - swell + flow));
      points.push([u * 1000, y]);
      // A low-contrast narrow layer just inside the leading color front gives
      // it a thick, liquid surface without foam or ocean-wave styling.
      inset.push([u * 1000, Math.min(1000, y + 30 + 24 * lift)]);
    }

    const leadingEdge = curve(points);
    const innerReverse = curve([...inset].reverse());
    const last = inset[inset.length - 1];
    const innerReturn = innerReverse.slice(innerReverse.indexOf(' C '));
    body.setAttribute('d', leadingEdge + ' L 1000 1002 L 0 1002 Z');
    shimmer.setAttribute('d', leadingEdge + ' L ' + number(last[0]) +
      ' ' + number(last[1]) + innerReturn + ' Z');
    edge.setAttribute('d', leadingEdge);
  }

  let scheduled = false;
  function render() {
    scheduled = false;
    const viewport = Math.max(1, window.innerHeight);
    for (const scene of scenes) {
      if (reduced.matches) continue;
      const top = scene.section.getBoundingClientRect().top;
      // At the beginning the next screen is just below view; by the time its
      // section hits the viewport top, the wipe has swept fully across.
      const progress = clamp((viewport * 1.02 - top) / (viewport * 1.02));
      draw(scene, progress);
    }
  }
  function requestRender() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(render);
  }
  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', requestRender, { passive: true });
  reduced.addEventListener('change', requestRender);
  requestRender();
})();