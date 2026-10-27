/* Shared liquid cursor: section glow + organic Fill/Outline typography masks.
   Works alongside liquid-gel-global.js without changing Three.js, scrolling,
   product click targets or the original Figma text measurements. */
(() => {
  'use strict';

  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!finePointer.matches || reducedMotion.matches) return;

  const SCENES = [
    '.hero', '.experience-02', '.korea-stage', '.history-3d-stage',
    '.era', '.product-explorer', '.rich-scene', '.outro'
  ].join(', ');
  const HEADLINES = [
    '.hero-type', '.identity-display', '.korea-type',
    '.era-year', '.product-backtype', '.rich-giant'
  ].join(', ');
  const svgNS = 'http://www.w3.org/2000/svg';
  const makeSVG = name => document.createElementNS(svgNS, name);
  const all = [];
  const full = 'M0 0 H1 V1 H0 Z';
  const empty = 'M0 0 Z';
  const glow = document.createElement('div');
  glow.className = 'site-liquid-cursor-glow';
  glow.setAttribute('aria-hidden', 'true');
  document.body.append(glow);

  const svg = makeSVG('svg');
  svg.classList.add('site-liquid-clip-defs');
  svg.setAttribute('aria-hidden', 'true');
  const defs = makeSVG('defs');
  svg.append(defs);
  document.body.append(svg);

  document.querySelectorAll(HEADLINES).forEach((node, index) => {
    // Preserve every existing <br> and the original element's dimensions.
    if (node.querySelector('.site-liquid-type-fill')) return;
    const markup = node.innerHTML;
    const fill = document.createElement('span');
    const outline = document.createElement('span');
    fill.className = 'site-liquid-type-fill';
    outline.className = 'site-liquid-type-outline';
    fill.innerHTML = markup;
    outline.innerHTML = markup;
    outline.setAttribute('aria-hidden', 'true');

    const paths = [];
    ['fill', 'outline'].forEach((kind) => {
      const clip = makeSVG('clipPath');
      const path = makeSVG('path');
      const id = 'site-liquid-type-' + kind + '-' + index;
      clip.id = id;
      clip.setAttribute('clipPathUnits', 'objectBoundingBox');
      path.setAttribute('clip-rule', 'evenodd');
      path.setAttribute('fill-rule', 'evenodd');
      path.setAttribute('d', kind === 'fill' ? full : empty);
      clip.append(path);
      defs.append(clip);
      (kind === 'fill' ? fill : outline).style.clipPath = 'url(#' + id + ')';
      paths.push(path);
    });
    // Outline must use the original headline color, not its transparent fill.
    node.style.setProperty('--site-liquid-stroke-color', getComputedStyle(node).color);
    node.replaceChildren(fill, outline);
    node.classList.add('site-liquid-outline-target');
    all.push({ node, fillPath: paths[0], outlinePath: paths[1], active: false });
  });

  let targetX = innerWidth * .5;
  let targetY = innerHeight * .5;
  let x = targetX;
  let y = targetY;
  let activeScene = null;
  let frame = 0;
  let lastRender = 0;

  function clear(item) {
    if (!item.active) return;
    item.active = false;
    item.fillPath.setAttribute('d', full);
    item.outlinePath.setAttribute('d', empty);
  }

  function sceneAt(clientX, clientY) {
    const hit = document.elementFromPoint(clientX, clientY);
    return hit instanceof Element ? hit.closest(SCENES) : null;
  }

  function colorFor(scene) {
    if (scene.matches('.experience-02, .korea-stage')) return '210, 245, 255';
    if (scene.matches('.product-explorer')) return '166, 255, 198';
    if (scene.matches('.rich-scene')) return '255, 250, 228';
    return '208, 255, 223';
  }

  function updatePointer(event) {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    targetX = event.clientX;
    targetY = event.clientY;
    const next = sceneAt(targetX, targetY);
    if (next !== activeScene) {
      activeScene = next;
      glow.classList.toggle('is-visible', Boolean(activeScene));
      if (activeScene) glow.style.setProperty('--liquid-glow-rgb', colorFor(activeScene));
      if (!activeScene) all.forEach(clear);
    }
    if (activeScene && !frame) frame = requestAnimationFrame(render);
  }

  function render(now) {
    frame = requestAnimationFrame(render);
    if (document.hidden || !activeScene || reducedMotion.matches || !finePointer.matches) {
      cancelAnimationFrame(frame);
      frame = 0;
      return;
    }
    const easing = .19;
    x += (targetX - x) * easing;
    y += (targetY - y) * easing;
    glow.style.setProperty('--liquid-glow-x', x.toFixed(1) + 'px');
    glow.style.setProperty('--liquid-glow-y', y.toFixed(1) + 'px');

    // Limit SVG clipping updates to roughly 30fps.
    if (now - lastRender < 32) return;
    lastRender = now;
    all.forEach(item => {
      const rect = item.node.getBoundingClientRect();
      const radiusX = Math.min(240, innerWidth * .18);
      const radiusY = radiusX * .88;
      const px = x - rect.left;
      const py = y - rect.top;
      if (rect.width < 1 || rect.height < 1 ||
          Math.max(rect.top, 0) >= Math.min(rect.bottom, innerHeight) ||
          px < -radiusX || px > rect.width + radiusX ||
          py < -radiusY || py > rect.height + radiusY ||
          !activeScene.contains(item.node)) {
        clear(item);
        return;
      }

      const points = [];
      const count = 40;
      for (let i = 0; i < count; i++) {
        const angle = Math.PI * 2 * i / count;
        const variation =
          1 + .095 * Math.sin(angle * 3 + now * .0013)
            + .055 * Math.cos(angle * 5 - now * .0011)
            + .035 * Math.sin(angle * 7 + now * .0009);
        const bx = (px + Math.cos(angle) * radiusX * variation) / rect.width;
        const by = (py + Math.sin(angle) * radiusY * variation) / rect.height;
        points.push(bx.toFixed(4) + ' ' + by.toFixed(4));
      }
      const blob = 'M' + points.join(' L') + ' Z';
      item.fillPath.setAttribute('d', full + ' ' + blob);
      item.outlinePath.setAttribute('d', blob);
      item.active = true;
    });
  }

  function reset() {
    activeScene = null;
    glow.classList.remove('is-visible');
    all.forEach(clear);
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }
  window.addEventListener('pointermove', updatePointer, { passive: true });
  document.addEventListener('pointerleave', reset);
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  reducedMotion.addEventListener('change', reset);
  finePointer.addEventListener('change', reset);
  // Pointer can remain stationary while the user scrolls to another section.
  window.addEventListener('scroll', () => {
    if (!activeScene) return;
    const next = sceneAt(targetX, targetY);
    if (next !== activeScene) {
      activeScene = next;
      glow.classList.toggle('is-visible', Boolean(activeScene));
      all.forEach(clear);
      if (activeScene) glow.style.setProperty('--liquid-glow-rgb', colorFor(activeScene));
      else reset();
    }
  }, { passive: true });
})();
