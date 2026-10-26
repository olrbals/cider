/*
 * Liquid Gel V4 — site-wide live-DOM adapter.
 * Physics/injection/viscosity adapted from:
 *   experiments/liquid-gel-surface-v4-favorite.html (GitHub main).
 *
 * IMPORTANT: The original demo samples a pre-rendered poster through WebGL.
 * That would freeze/duplicate live DOM and Three.js. This adapter converts
 * the V4 wave-height slopes into an SVG feDisplacementMap, filtering the
 * ACTUAL rendered page section. Native links, buttons, scroll and WebGL
 * continue to exist and receive input normally.
 */
(() => {
  'use strict';

  const precision = window.matchMedia('(hover: hover) and (pointer: fine)');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!precision.matches || motion.matches) return;

  const targets = '.hero, .experience-02, .korea-stage, .history-3d-stage, .era, .product-explorer, .rich-scene, .outro, .site-header';
  const svgNS = 'http://www.w3.org/2000/svg';
  const makeSVG = name => document.createElementNS(svgNS, name);
  const svg = makeSVG('svg');
  svg.setAttribute('xmlns', svgNS);
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('site-liquid-definitions');

  const defs = makeSVG('defs');
  const filter = makeSVG('filter');
  filter.id = 'site-liquid-gel-filter';
  filter.setAttribute('x', '-8%');
  filter.setAttribute('y', '-8%');
  filter.setAttribute('width', '116%');
  filter.setAttribute('height', '116%');
  filter.setAttribute('color-interpolation-filters', 'sRGB');

  const surface = makeSVG('feImage');
  // feImage primitive sizes must use *pixel* units for CSS-filtered HTML.
  // Using 100% here shifts the entire scene by half the displacement scale.
  surface.setAttribute('x', '0');
  surface.setAttribute('y', '0');
  surface.setAttribute('width', '1');
  surface.setAttribute('height', '1');
  surface.setAttribute('preserveAspectRatio', 'none');
  surface.setAttribute('result', 'siteGel');

  const displacement = makeSVG('feDisplacementMap');
  displacement.setAttribute('in', 'SourceGraphic');
  displacement.setAttribute('in2', 'siteGel');
  displacement.setAttribute('scale', '0');
  displacement.setAttribute('xChannelSelector', 'R');
  displacement.setAttribute('yChannelSelector', 'G');
  filter.append(surface, displacement);
  defs.append(filter);
  svg.append(defs);
  document.body.append(svg);

  const panel = document.createElement('div');
  panel.className = 'site-liquid-tool';
  panel.innerHTML = [
    '<button class="site-liquid-toggle" type="button" aria-label="액체 효과 설정" aria-controls="site-liquid-panel" aria-expanded="false">⚙</button>',
    '<div class="site-liquid-panel" id="site-liquid-panel" hidden>',
    '<label><span class="site-liquid-label">점성 · 회복 지연 <output id="site-gel-viscosity-value">17</output></span>',
    '<input id="site-gel-viscosity" type="range" min="1" max="25" step="1" value="17"></label>',
    '<label><span class="site-liquid-label">굴절 강도 <output id="site-gel-refraction-value">1</output></span>',
    '<input id="site-gel-refraction" type="range" min="-5" max="10" step="1" value="1"></label>',
    '<button class="site-liquid-reset" type="button">표면 초기화</button>',
    '</div>'
  ].join('');
  document.body.append(panel);

  const toggle = panel.querySelector('.site-liquid-toggle');
  const settings = panel.querySelector('.site-liquid-panel');
  const sticky = panel.querySelector('#site-gel-viscosity');
  const refraction = panel.querySelector('#site-gel-refraction');
  const stickyOutput = panel.querySelector('#site-gel-viscosity-value');
  const refractionOutput = panel.querySelector('#site-gel-refraction-value');

  toggle.addEventListener('click', () => {
    settings.hidden = !settings.hidden;
    toggle.setAttribute('aria-expanded', String(!settings.hidden));
  });
  sticky.addEventListener('input', () => {
    stickyOutput.textContent = sticky.value;
    schedule();
  });
  refraction.addEventListener('input', () => {
    refractionOutput.textContent = refraction.value;
    setAmount();
    schedule();
  });

  const mapCanvas = document.createElement('canvas');
  const ctx = mapCanvas.getContext('2d', { alpha: false, willReadFrequently: false });
  if (!ctx) {
    panel.remove();
    svg.remove();
    return;
  }

  let cols = 180;
  let rows = 100;
  let width = 1;
  let height = 1;
  let heights;
  let speeds;
  let nextHeights;
  let nextSpeeds;
  let pixelData;
  let active = null;
  let last = null;
  const pending = [];
  let pointerX = -1;
  let pointerY = -1;
  let lastTime = 0;
  let animation = 0;
  let mapStamp = 0;
  let motionEnergy = 0;
  let interacting = false;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function setAmount() {
    // V4 used uAmount = refraction / 8 and displacement proportional
    // to surface slope; scale here is measured in rendered CSS pixels.
    displacement.setAttribute('scale', (Number(refraction.value) * 55).toFixed(2));
  }

  function initializeField() {
    if (!active) return;
    const rect = active.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    surface.setAttribute('width', String(width));
    surface.setAttribute('height', String(height));
    rows = clamp(Math.round(cols * height / width), 66, 170);
    const count = cols * rows;

    heights = new Float32Array(count);
    speeds = new Float32Array(count);
    nextHeights = new Float32Array(count);
    nextSpeeds = new Float32Array(count);
    mapCanvas.width = cols;
    mapCanvas.height = rows;
    pixelData = ctx.createImageData(cols, rows);
    for (let i = 0; i < count; i++) {
      const j = i * 4;
      pixelData.data[j] = 128;
      pixelData.data[j + 1] = 128;
      pixelData.data[j + 2] = 128;
      pixelData.data[j + 3] = 255;
    }
    pending.length = 0;
    last = null;
    motionEnergy = 0;
    writeTexture(true);
  }

  function setTarget(next) {
    if (active === next) return;
    if (active) active.classList.remove('site-liquid-target');
    active = next;
    last = null;
    pending.length = 0;
    if (active) {
      initializeField();
      active.classList.add('site-liquid-target');
      setAmount();
      schedule();
    }
  }

  function nearestTarget(x, y) {
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return null;
    const hit = document.elementFromPoint(x, y);
    if (!(hit instanceof Element) || panel.contains(hit)) return null;
    return hit.closest(targets);
  }

  // V4's normalized, connected mouse strokes, now relative to the
  // affected real DOM section rather than a fullscreen demo canvas.
  function pushPointer(x, y, injectStroke = true) {
    if (!active) return;
    const rect = active.getBoundingClientRect();
    const current = {
      x: clamp((x - rect.left) / Math.max(1, rect.width), 0, 1),
      y: clamp((y - rect.top) / Math.max(1, rect.height), 0, 1)
    };
    if (last && injectStroke) {
      const dx = (current.x - last.x) * width;
      const dy = (current.y - last.y) * height;
      const distance = Math.hypot(dx, dy);
      if (distance > .5 && distance < 450) {
        const count = Math.min(50, Math.ceil(distance / 13));
        const speed = Math.min(1, distance / 35);
        for (let i = 1; i <= count; i++) {
          const t = i / count;
          pending.push({
            x: last.x + (current.x - last.x) * t,
            y: last.y + (current.y - last.y) * t,
            nx: dx / distance,
            ny: dy / distance,
            amount: speed / count
          });
        }
        if (pending.length > 600) pending.splice(0, pending.length - 600);
      }
    }
    last = current;
    schedule();
  }

  function onPointerMove(e) {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    pointerX = e.clientX;
    pointerY = e.clientY;
    const target = nearestTarget(pointerX, pointerY);
    setTarget(target);
    interacting = Boolean(target);
    pushPointer(pointerX, pointerY);
  }

  function pushGel(stroke) {
    const cx = stroke.x * (cols - 1);
    const cy = stroke.y * (rows - 1);
    const radius = Math.max(10, cols * .083); // Original V4 radius.
    const radiusSq = radius * radius;
    const minX = Math.max(1, Math.floor(cx - radius * 2));
    const maxX = Math.min(cols - 2, Math.ceil(cx + radius * 2));
    const minY = Math.max(1, Math.floor(cy - radius * 2));
    const maxY = Math.min(rows - 2, Math.ceil(cy + radius * 2));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const ox = x - cx;
        const oy = (y - cy) * cols / rows * height / width;
        const r2 = ox * ox + oy * oy;
        if (r2 > 4 * radiusSq) continue;
        const gaussian = Math.exp(-r2 / (radiusSq * .52));
        const along = (ox * stroke.nx + oy * stroke.ny) / radius;
        speeds[y * cols + x] += gaussian * (.125 * along + .055) * stroke.amount;
      }
    }
  }

  function simulate(dt) {
    // V4 viscous surface. Extend 1..20 -> 1..25 without changing
    // its damping/restore/diffusion endpoints.
    const viscosity = (Number(sticky.value) - 1) / 24;
    const damp = Math.pow(.927 + viscosity * .060, dt);
    const restore = (.018 - viscosity * .0168) * dt;
    const spread = (.165 - viscosity * .045) * dt;
    motionEnergy = 0;

    for (let y = 1; y < rows - 1; y++) {
      const line = y * cols;
      for (let x = 1; x < cols - 1; x++) {
        const i = line + x;
        const h = heights[i];
        const lap = heights[i-1] + heights[i+1] +
          heights[i-cols] + heights[i+cols] - 4 * h;
        const v = (speeds[i] + lap * spread - h * restore) * damp;
        nextSpeeds[i] = v;
        nextHeights[i] = clamp(h + v * dt, -1.1, 1.1);
        motionEnergy = Math.max(motionEnergy, Math.abs(v), Math.abs(nextHeights[i]));
      }
    }

    for (let x = 0; x < cols; x++) {
      nextHeights[x] = nextHeights[x + cols];
      nextHeights[(rows - 1)*cols + x] = nextHeights[(rows - 2)*cols + x];
      nextSpeeds[x] = nextSpeeds[x + cols];
      nextSpeeds[(rows - 1)*cols + x] = nextSpeeds[(rows - 2)*cols + x];
    }
    for (let y = 0; y < rows; y++) {
      const i = y * cols;
      nextHeights[i] = nextHeights[i + 1];
      nextHeights[i + cols - 1] = nextHeights[i + cols - 2];
      nextSpeeds[i] = nextSpeeds[i + 1];
      nextSpeeds[i + cols - 1] = nextSpeeds[i + cols - 2];
    }
    [heights, nextHeights] = [nextHeights, heights];
    [speeds, nextSpeeds] = [nextSpeeds, speeds];
  }

  function writeTexture(force = false) {
    if (!active || !pixelData) return;
    // V4 originally takes the height gradient in a WebGL shader.
    // Encode that same gradient into feDisplacementMap's RG channels.
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const l = y * cols + Math.max(0,x-1);
        const r = y * cols + Math.min(cols-1,x+1);
        const u = Math.max(0,y-1)*cols + x;
        const d = Math.min(rows-1,y+1)*cols + x;
        const dx = heights[r] - heights[l];
        const dy = heights[d] - heights[u];
        const j = i * 4;
        pixelData.data[j] = Math.round(clamp(127.5 + dx * 90, 0, 255));
        pixelData.data[j+1] = Math.round(clamp(127.5 + dy * 90, 0, 255));
      }
    }
    ctx.putImageData(pixelData, 0, 0);
    // Tiny texture only (180x66..170). Browser resolves this data URL
    // in the SVG filter; no screenshot or frozen poster is involved.
    surface.setAttribute('href', mapCanvas.toDataURL('image/png'));
    if (force) setAmount();
  }

  function draw(time) {
    animation = 0;
    if (document.hidden || !active || motion.matches) return;
    const elapsed = lastTime ? time - lastTime : 16.667;
    lastTime = time;
    const dt = clamp(elapsed / 16.667, .35, 1.4);
    const strokes = pending.splice(0, 150);
    for (const stroke of strokes) pushGel(stroke);
    simulate(dt);
    // 30Hz image uploads keep text, 3D and scrolling responsive.
    if (time - mapStamp >= 33 || strokes.length > 0) {
      writeTexture();
      mapStamp = time;
    }
    if (interacting || pending.length || motionEnergy > .00025) schedule();
  }

  function schedule() {
    if (!animation && !document.hidden && !motion.matches && active) {
      animation = requestAnimationFrame(draw);
    }
  }

  function clearSurface() {
    pending.length = 0;
    last = null;
    if (heights) {
      heights.fill(0);
      speeds.fill(0);
      nextHeights.fill(0);
      nextSpeeds.fill(0);
      writeTexture(true);
    }
  }

  panel.querySelector('.site-liquid-reset').addEventListener('click', clearSurface);

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', () => { last = null; }, { passive: true });
  document.addEventListener('pointerleave', () => {
    interacting = false;
    pointerX = -1;
    pointerY = -1;
    setTarget(null);
  });
  window.addEventListener('blur', () => {
    interacting = false;
    setTarget(null);
  });
  let resizeFrame = 0;
  function syncPosition() {
    resizeFrame = 0;
    if (pointerX < 0 || pointerY < 0) return;
    const next = nearestTarget(pointerX, pointerY);
    if (next !== active) {
      setTarget(next);
    } else if (active) {
      const rect = active.getBoundingClientRect();
      if (Math.abs(rect.width-width) > 2 || Math.abs(rect.height-height) > 2) {
        initializeField();
      }
    }
    // Scrolling moves page under the cursor; don't inject false strokes.
    if (active) pushPointer(pointerX, pointerY, false);
  }
  function requestSync() {
    if (!resizeFrame) resizeFrame = requestAnimationFrame(syncPosition);
  }
  window.addEventListener('scroll', requestSync, { passive: true });
  window.addEventListener('resize', requestSync, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      lastTime = 0;
      schedule();
    }
  });
  motion.addEventListener('change', () => {
    if (motion.matches) {
      interacting = false;
      setTarget(null);
      panel.hidden = true;
    } else {
      panel.hidden = false;
      requestSync();
    }
  });

  setAmount();
})();
