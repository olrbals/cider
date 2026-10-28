/* One fluid surge at EVERY section boundary after Hero.
 * The next real section moves upward in normal document flow while an oversized
 * solid-colored asymmetric crest extends into the outgoing screen.
 * All geometry is sampled from scroll progress, so reverse scrolling reverses it.
 */
(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ns = 'http://www.w3.org/2000/svg';
  const palette = [
    { id: 'identity', color: '#ffffff', rim: 'rgba(75,176,124,.40)', foam: 'rgba(205,244,223,.94)', glint: 'rgba(255,255,255,.95)' },
    { id: 'korea', color: '#ffdd00', rim: 'rgba(255,254,187,.88)', foam: 'rgba(255,245,149,.85)', glint: 'rgba(255,255,237,.8)' },
    { id: 'history', color: '#0b6038', rim: 'rgba(193,250,207,.80)', foam: 'rgba(172,235,197,.68)', glint: 'rgba(241,255,249,.8)' },
    { id: 'products', color: '#f9f4e7', rim: 'rgba(255,255,255,.92)', foam: 'rgba(255,255,255,.84)', glint: 'rgba(255,255,255,.88)' },
    { id: 'pop', color: '#ece4d5', rim: 'rgba(255,255,255,.86)', foam: 'rgba(255,255,255,.65)', glint: 'rgba(255,255,255,.84)' },
    { id: 'footer', color: '#0e6b3c', rim: 'rgba(175,244,201,.78)', foam: 'rgba(186,237,202,.60)', glint: 'rgba(247,255,251,.75)' }
  ];
  const clamp = v => Math.min(1, Math.max(0, v));
  const ease = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
  const number = v => Number(v.toFixed(2));

  // Continuous cubic Bézier segments keep the large asymmetric crest liquid,
  // avoiding the small repetitive sine curve seen in the previous preview.
  function curve(points) {
    let d = 'M ' + number(points[0][0]) + ' ' + number(points[0][1]);
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[Math.max(0, i - 1)];
      const b = points[i];
      const c = points[i + 1];
      const dNext = points[Math.min(points.length - 1, i + 2)];
      d += ' C ' + number(b[0] + (c[0] - a[0]) / 6) + ' ' +
        number(b[1] + (c[1] - a[1]) / 6) + ' ' +
        number(c[0] - (dNext[0] - b[0]) / 6) + ' ' +
        number(c[1] - (dNext[1] - b[1]) / 6) + ' ' +
        number(c[0]) + ' ' + number(c[1]);
    }
    return d;
  }

  function svgNode(name, className) {
    const node = document.createElementNS(ns, name);
    node.setAttribute('class', className);
    return node;
  }

  const sections = palette.map((item, index) => {
    const section = document.getElementById(item.id);
    if (!section) return null;
    const svg = svgNode('svg', 'section-wave');
    svg.setAttribute('viewBox', '0 0 1000 1000');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.style.setProperty('--wave-color', item.color);
    svg.style.setProperty('--wave-rim', item.rim);
    svg.style.setProperty('--wave-foam', item.foam);
    svg.style.setProperty('--wave-glint', item.glint);
    const body = svgNode('path', 'section-wave-body');
    const wake = svgNode('path', 'section-wave-wake');
    const foam = svgNode('path', 'section-wave-foam');
    const sheen = svgNode('path', 'section-wave-sheen');
    svg.append(body, wake, foam, sheen);
    section.insertBefore(svg, section.firstChild);
    return { section, body, wake, foam, sheen, index };
  }).filter(Boolean);

  let scheduled = false;
  function render() {
    scheduled = false;
    if (reduced.matches) return;
    const viewport = Math.max(1, window.innerHeight);
    sections.forEach(({ section, body, wake, foam, sheen, index }) => {
      const rect = section.getBoundingClientRect();
      // Start as the next section approaches the viewport bottom.
      // Finish after it rises past the top: deterministic and reversible.
      const progress = clamp((viewport * 1.07 - rect.top) / (viewport * 1.42));
      const swell = Math.sin(Math.PI * progress);
      const baseY = 932 - 164 * ease(progress / .55) + 62 * ease((progress - .67) / .33);
      const crestCenter = index % 2 === 0
        ? .29 + .13 * ease(progress)
        : .72 - .14 * ease(progress);
      const curlHeight = 35 + 485 * Math.max(0, swell);
      const current = progress * Math.PI * 2.2 + index * .72;

      const points = Array.from({ length: 29 }, (_, i) => {
        const u = i / 28;
        // Fast-rising face, broad hanging lip and a lagging secondary swell.
        const delta = u - crestCenter;
        const width = delta < 0 ? .26 : .15;
        const primary = Math.exp(-Math.pow(delta / width, 2));
        const secondaryCenter = index % 2 === 0 ? .84 : .14;
        const secondary = Math.exp(-Math.pow((u - secondaryCenter) / .17, 2));
        const troughCenter = crestCenter + (index % 2 === 0 ? .21 : -.21);
        const trough = Math.exp(-Math.pow((u - troughCenter) / .11, 2));
        const slope = (u - .5) * 95 * Math.sin(current * .58);
        const smaller = (Math.sin(u * 14 + current) + Math.sin(u * 24 - current * .52) * .32) * (5 + 9 * swell);
        const y = Math.min(975, Math.max(160,
          baseY - curlHeight * primary - 112 * swell * secondary +
          84 * swell * trough + slope + smaller
        ));
        return [u * 1000, y];
      });
      const edge = curve(points);
      const wakeEdge = curve(points.map(([x, y]) => [x, Math.min(990, y + 42)]));
      body.setAttribute('d', edge + ' L 1000 1002 L 0 1002 Z');
      foam.setAttribute('d', edge);
      sheen.setAttribute('d', edge);
      wake.setAttribute('d', wakeEdge);
    });
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