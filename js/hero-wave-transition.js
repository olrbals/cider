/* Every section after Hero enters with a scroll-scrubbed liquid boundary.
 * Real DOM sections push in from below; no cloned screens, positioning hacks,
 * automatic playback, timers, or modifications to sticky section content.
 */
(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ns = 'http://www.w3.org/2000/svg';
  const palette = [
    { id: 'identity', color: '#ffffff', rim: 'rgba(62,173,115,.34)', glint: 'rgba(255,255,255,.96)' },
    { id: 'korea', color: '#ffdd00', rim: 'rgba(255,246,153,.82)', glint: 'rgba(255,249,201,.68)' },
    { id: 'history', color: '#0b6038', rim: 'rgba(165,238,193,.60)', glint: 'rgba(218,255,230,.42)' },
    { id: 'products', color: '#f9f4e7', rim: 'rgba(255,255,255,.85)', glint: 'rgba(255,255,255,.68)' },
    { id: 'pop', color: '#ece4d5', rim: 'rgba(255,255,255,.81)', glint: 'rgba(255,255,255,.57)' },
    { id: 'footer', color: '#0e6b3c', rim: 'rgba(157,236,190,.63)', glint: 'rgba(255,255,255,.40)' }
  ];
  const clamp = x => Math.max(0, Math.min(1, x));
  const fix = x => Number(x.toFixed(2));

  function smoothEdge(pts) {
    let d = 'M ' + fix(pts[0][0]) + ' ' + fix(pts[0][1]);
    for (let i = 0; i < pts.length - 1; i++) {
      const prev = pts[Math.max(0, i - 1)];
      const p = pts[i];
      const next = pts[i + 1];
      const after = pts[Math.min(pts.length - 1, i + 2)];
      d += ' C ' + fix(p[0] + (next[0] - prev[0]) / 6) + ' ' +
        fix(p[1] + (next[1] - prev[1]) / 6) + ' ' +
        fix(next[0] - (after[0] - p[0]) / 6) + ' ' +
        fix(next[1] - (after[1] - p[1]) / 6) + ' ' +
        fix(next[0]) + ' ' + fix(next[1]);
    }
    return d;
  }

  const sections = palette.map((item, index) => {
    const scene = document.getElementById(item.id);
    if (!scene) return null;
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'section-wave');
    svg.setAttribute('viewBox', '0 0 1000 244');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.style.setProperty('--wave-color', item.color);
    svg.style.setProperty('--wave-rim', item.rim);
    svg.style.setProperty('--wave-glint', item.glint);
    const fill = document.createElementNS(ns, 'path');
    fill.setAttribute('class', 'section-wave-fill');
    const rim = document.createElementNS(ns, 'path');
    rim.setAttribute('class', 'section-wave-rim');
    const glint = document.createElementNS(ns, 'path');
    glint.setAttribute('class', 'section-wave-glint');
    svg.append(fill, glint, rim);
    scene.insertBefore(svg, scene.firstChild);
    return { scene, fill, rim, glint, index };
  }).filter(Boolean);

  let requested = false;
  function render() {
    requested = false;
    if (reduced.matches) return;
    const viewport = Math.max(1, window.innerHeight);
    sections.forEach(({ scene, fill, rim, glint, index }) => {
      const rect = scene.getBoundingClientRect();
      // The wave advances during the exact scroll distance that brings the next
      // screen up from the viewport bottom to its top. Reverse scroll reverses it.
      const progress = clamp((viewport + 120 - rect.top) / (viewport + 120));
      const phase = progress * Math.PI * 2.6 + index * .73;
      const amplitude = 1 - .31 * progress;
      const pts = Array.from({ length: 21 }, (_, i) => {
        const u = i / 20;
        const wide = Math.sin(u * Math.PI * 2.05 + phase) * 23;
        const shallow = Math.sin(u * Math.PI * 5.4 - phase * .66) * 7.5;
        const crest = Math.sin(u * Math.PI * 1.12 + phase * .37) * 9;
        return [u * 1000, 91 + (wide + shallow + crest) * amplitude];
      });
      const edge = smoothEdge(pts);
      fill.setAttribute('d', edge + ' L 1000 252 L 0 252 Z');
      rim.setAttribute('d', edge);
      glint.setAttribute('d', edge);
    });
  }
  function requestRender() {
    if (requested) return;
    requested = true;
    requestAnimationFrame(render);
  }
  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', requestRender, { passive: true });
  reduced.addEventListener('change', () => {
    sections.forEach(({ scene }) => scene.querySelector('.section-wave')?.classList.toggle('wave-motion-reduced', reduced.matches));
    requestRender();
  });
  render();
})();