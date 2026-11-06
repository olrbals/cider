/* HERO V5.1 — "Can Pour".
 * ① The real 3D 2024 can idles with a slow spin in the Figma position.
 * ② Scrolling spins it fast while it drops and rocks.
 * ③ It lands logo-front, tips toward the viewer and the tab cracks open.
 * ④ It tips over and pours; ⑤ the soda pools and rises until the screen
 *    is the solid white of PURE.
 * Reuses the History can's geometry, label and studio lighting recipe.
 * The original PNG can stays as the fallback (no WebGL / reduced motion).
 */
import * as THREE from './vendor/three.module.js';

const hero = document.querySelector('#top.hero');
const stage = hero?.querySelector('.hero-splash-stage');
const nextSection = document.querySelector('#brand-values');
const header = document.querySelector('.site-header');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

const clamp = v => Math.min(1, Math.max(0, v));
const smooth = (v, a, b) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;

// Label UV positions (2024 artwork, after its -0.03 UV shift).
const UV_SHIFT = -0.03;
const LOGO_U = 0.5 + UV_SHIFT;   // star logo + "Chilsung"
const faceYaw = u => -u * TAU;   // rotation.y that turns label-u toward +Z

// Scroll timeline in viewport heights (PURE reaches the top at 1.6).
const SPIN_END = .50;
const SETTLE_END = .74;      // landed logo-front, tipped toward the viewer
const TAB_AT = .72;          // the tab cracks open (clock-driven)
const POUR_START = .78;
const POUR_END = .98;        // fully tipped
const POUR_FLOW = .84;       // stream leaves the can
const FILL_START = .90;
const FILL_END = 1.28;       // screen is solid white → PURE
const POUR_SPOT = { x: .40, y: .36 }; // can center while pouring (viewport)

function setLayoutScale() {
  hero.style.setProperty('--hero-layout-scale',
    Math.min(innerWidth / 1440, innerHeight / 900).toFixed(6));
}

function updateChrome(s, boundary) {
  // Shared hooks from hero-carbonation-star.css: section overlap + PURE reveal.
  hero.style.setProperty('--hero-outgoing-opacity', String(1 - smooth(s, 1.28, 1.34)));
  hero.classList.toggle('is-submerged', s >= 1.34);
  nextSection?.style.setProperty('--hero-principles-reveal',
    s < .02 ? 1 : smooth(s, 1.34, 1.48));
  hero.style.setProperty('--hero-type-fade', String(1 - smooth(s, .25, .70)));
  hero.style.setProperty('--hero-type-lift', (-70 * smooth(s, .25, .70)).toFixed(1) + 'px');
  hero.style.setProperty('--hero-white', String(smooth(s, 1.24, 1.30)));
  if (header) {
    const offHero = nextSection ? boundary <= .08 : s > 1.5;
    header.classList.toggle('is-off-hero', offHero);
    header.classList.toggle('is-on-light', !offHero && s >= 1.18);
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

async function start() {
  if (!hero || !stage) return;
  hero.classList.add('has-carbonation-wipe', 'has-can-dive');
  setLayoutScale();

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (error) {
    console.warn('Hero can dive: WebGL unavailable, keeping the PNG can.', error);
  }

  const white = document.createElement('div');
  white.className = 'hero-dive-white';
  white.setAttribute('aria-hidden', 'true');
  stage.append(white);

  const fallbackLoop = () => {
    const s = Math.max(0, scrollY / Math.max(1, innerHeight));
    const boundary = nextSection ? nextSection.getBoundingClientRect().top / innerHeight : 0;
    updateChrome(reduced.matches ? 0 : s, boundary);
  };
  if (!renderer || reduced.matches) {
    addEventListener('scroll', fallbackLoop, { passive: true });
    addEventListener('resize', () => { setLayoutScale(); fallbackLoop(); }, { passive: true });
    fallbackLoop();
    return;
  }

  // --- Label texture (same recipe as History's 2024 can) ---
  const image = await loadImage(new URL('../img/history/2024packaging-uv.png', import.meta.url).href);
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 2048;
  labelCanvas.height = 1024;
  const paint = labelCanvas.getContext('2d', { alpha: false });
  const offset = UV_SHIFT * labelCanvas.width;
  paint.fillStyle = '#f4f3ee';
  paint.fillRect(0, 0, labelCanvas.width, labelCanvas.height);
  paint.drawImage(image, offset, 0, labelCanvas.width, labelCanvas.height);
  paint.drawImage(image, offset + labelCanvas.width, 0, labelCanvas.width, labelCanvas.height);
  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  labelTexture.colorSpace = THREE.SRGBColorSpace;
  labelTexture.anisotropy = 8;

  // --- Scene / camera / studio light ---
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .01, 60);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.className = 'hero-can-webgl';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  stage.append(renderer.domElement);

  const studio = new THREE.Scene();
  studio.background = new THREE.Color('#252c30');
  const softbox = (x, y, z, w, h, intensity) => {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(intensity), side: THREE.DoubleSide }));
    panel.position.set(x, y, z);
    panel.lookAt(0, 0, 0);
    studio.add(panel);
  };
  softbox(-4, 2, 4, 2, 8, 5);
  softbox(4, 1, 2, 1, 7, 3);
  softbox(0, 6, 0, 5, 4, 4);
  softbox(0, 0, -5, 4, 6, 1.5);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studio, .04).texture;
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2f6b4c, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(-3, 5, 6);
  scene.add(key);

  // --- Can (History geometry) ---
  const canLength = 2.88;
  const capCenter = canLength / 2 + .0375;
  const rimCenter = capCenter + .045;
  const carrier = new THREE.Group();   // position / tilt
  const spinner = new THREE.Group();   // yaw only
  carrier.add(spinner);
  scene.add(carrier);
  const label = new THREE.Mesh(new THREE.CylinderGeometry(.68, .68, canLength, 160, 1, true),
    new THREE.MeshPhysicalMaterial({ map: labelTexture, metalness: .36, roughness: .36, clearcoat: .35, clearcoatRoughness: .25 }));
  spinner.add(label);
  const metal = new THREE.MeshStandardMaterial({ color: 0xd4dade, metalness: 1, roughness: .23 });
  const inset = new THREE.MeshStandardMaterial({ color: 0xc6ced0, metalness: .9, roughness: .29 });
  for (const sign of [-1, 1]) {
    const end = new THREE.Mesh(new THREE.CylinderGeometry(.70, .70, .075, 128), metal);
    end.position.y = sign * capCenter;
    spinner.add(end);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(.59, .59, .012, 96), inset);
    disc.position.y = sign * rimCenter;
    spinner.add(disc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.63, .027, 12, 96), metal);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = sign * rimCenter;
    spinner.add(rim);
  }
  // Pull tab + opening. The opening sits on the rim that becomes the lowest
  // lip while pouring (world +X once the can lands logo-front).
  const pourYaw = faceYaw(LOGO_U);
  const mouthDir = new THREE.Vector3(Math.cos(pourYaw), 0, Math.sin(pourYaw));
  const tab = new THREE.Group();
  tab.position.set(0, rimCenter + .012, 0);
  tab.rotation.y = Math.atan2(mouthDir.x, mouthDir.z);
  spinner.add(tab);
  const lever = new THREE.Group();          // hinge at the rivet
  tab.add(lever);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.13, .022, 8, 40), metal);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 0, -.16);
  lever.add(ring);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(.15, .014, .26), metal);
  plate.position.set(0, .004, .04);
  lever.add(plate);
  const opening = new THREE.Mesh(new THREE.CircleGeometry(1, 40),
    new THREE.MeshStandardMaterial({ color: 0x14231d, roughness: .6, metalness: .2 }));
  opening.rotation.x = -Math.PI / 2;
  opening.position.set(0, -.004, .33);
  opening.scale.set(.0001, .0001, 1);
  tab.add(opening);
  renderer.initTexture(labelTexture);

  // 2D liquid layer above the WebGL can: stream + rising fill.
  const liquid = document.createElement('canvas');
  liquid.className = 'hero-pour-liquid';
  liquid.setAttribute('aria-hidden', 'true');
  stage.append(liquid);
  const pourCtx = liquid.getContext('2d');
  let tabOpen = 0;        // 0 → 1, played on a clock once triggered
  let tabTarget = 0;

  // --- Placement matching the Figma PNG can (center ≈ 722,620; ≈470px tall) ---
  const baseDistance = 11;
  const view = { width: 1, height: 1, unit: 1, home: new THREE.Vector3(), scale: 1 };
  function resize() {
    setLayoutScale();
    const width = stage.clientWidth || innerWidth;
    const height = stage.clientHeight || innerHeight;
    renderer.setSize(width, height, false);
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    liquid.width = Math.round(width * ratio);
    liquid.height = Math.round(height * ratio);
    pourCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const layout = Math.min(width / 1440, height / 900);
    const worldHeight = 2 * baseDistance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const unit = worldHeight / height; // world units per CSS px at the can plane
    view.width = width;
    view.height = height;
    view.unit = unit;
    view.home.set((722 - 720) * layout * unit, -(620 - 450) * layout * unit, 0);
    view.scale = 470 * layout * unit / (canLength + .16);
    dirty = true;
  }

  // Idle spin accumulates only near the top; once the visitor scrolls the
  // idle angle freezes so the landing yaw stays deterministic both ways.
  let idleYaw = faceYaw(LOGO_U) - .5;
  let lastTime = performance.now();
  let dirty = true;
  const v = new THREE.Vector3();
  const toScreen = (local, out) => {
    v.copy(local).applyMatrix4(spinner.matrixWorld).project(camera);
    out.x = (v.x + 1) / 2 * view.width;
    out.y = (1 - v.y) / 2 * view.height;
    return out;
  };
  const mouthLocal = new THREE.Vector3(mouthDir.x * .36, rimCenter, mouthDir.z * .36);
  const topLocal = new THREE.Vector3(0, rimCenter, 0);
  const bottomLocal = new THREE.Vector3(0, -rimCenter, 0);
  const mouth = {}, top = {}, bottom = {};

  // ---- Realistic soda: clear water, rim highlights, micro-bubbles, caustics.
  let seed = 7;
  const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  // A real bubble: transparent core, bright rim, a tiny specular dot.
  const bubble = document.createElement('canvas');
  bubble.width = bubble.height = 32;
  {
    const c = bubble.getContext('2d');
    const g = c.createRadialGradient(16, 16, 4, 16, 16, 15);
    g.addColorStop(0, 'rgba(255,255,255,.05)');
    g.addColorStop(.62, 'rgba(255,255,255,.16)');
    g.addColorStop(.86, 'rgba(255,255,255,.95)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(16, 16, 15, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.95)';
    c.beginPath(); c.arc(11, 11, 2.6, 0, TAU); c.fill();
  }
  // Soft caustic light lines, tiled.
  const caustic = document.createElement('canvas');
  caustic.width = caustic.height = 384;
  {
    const c = caustic.getContext('2d');
    c.filter = 'blur(1.6px)';
    c.strokeStyle = 'rgba(255,255,255,.75)';
    for (let i = 0; i < 46; i++) {
      const x = rand() * 384, y = rand() * 384, r = 20 + rand() * 60;
      c.lineWidth = .8 + rand() * 1.8;
      c.beginPath();
      c.ellipse(x, y, r, r * (.35 + rand() * .5), rand() * Math.PI, rand() * 3, rand() * 3 + 2.4);
      c.stroke();
    }
  }
  const causticPattern = pourCtx.createPattern(caustic, 'repeat');
  const micro = Array.from({ length: 300 }, () => ({
    x: rand(), column: rand() < .35, offset: (rand() - .5) * .16,
    size: 1.2 + rand() ** 2.2 * 6, speed: .25 + rand() * .55,
    phase: rand(), sway: rand() * TAU, alpha: .45 + rand() * .5
  }));
  const spray = Array.from({ length: 34 }, () => ({
    vx: (rand() - .5) * 1.6, vy: -(.6 + rand() * 1.2), phase: rand(), size: 1.5 + rand() * 4.5
  }));
  const streamFizz = Array.from({ length: 26 }, () => ({ phase: rand(), side: rand() - .5, size: 1 + rand() * 3 }));

  function surfaceAt(x, base, t, impactX, splash) {
    const u = x / view.width * TAU;
    const amp = view.height * .012;
    let y = base + amp * (Math.sin(u * 1.3 + t * 1.9) * .55 + Math.sin(u * 3.1 - t * 2.6 + 1) * .3
      + Math.sin(u * 7.3 + t * 4.1) * .15);
    if (splash > 0) {
      const d = (x - impactX) / (view.width * .045);
      y -= view.height * .028 * splash * Math.exp(-d * d) * (.75 + .25 * Math.sin(t * 13));
    }
    return y;
  }

  function offsetLine(ctx, path, offset) {
    ctx.beginPath();
    for (let i = 0; i < path.length; i++) {
      const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
      let nx = -(b[1] - a[1]), ny = b[0] - a[0];
      const n = Math.hypot(nx, ny) || 1;
      const x = path[i][0] + nx / n * offset, y = path[i][1] + ny / n * offset;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
  }

  function drawLiquid(s, t) {
    const W = view.width, H = view.height, ctx = pourCtx;
    ctx.clearRect(0, 0, W, H);
    const flow = smooth(s, POUR_FLOW, POUR_FLOW + .09);
    const level = smooth(s, FILL_START, FILL_END);
    if (flow <= 0 && level <= 0) return;
    const base = H * (1.04 - 1.12 * level);
    const solid = smooth(level, .45, .92);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // ④ Stream: a clear glassy ribbon defined by its highlights, not a fill.
    let impactX = mouth.x, impactY = H;
    if (flow > 0) {
      let dx = top.x - bottom.x, dy = top.y - bottom.y;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const speed = H * .55, gravity = H * 3.2;
      const points = [];
      for (let i = 0; i <= 60; i++) {
        const u = i / 60 * .9;
        const x = mouth.x + dx * speed * u + Math.sin(t * 9 + i * .5) * .8;
        const y = mouth.y + dy * speed * u + gravity * u * u / 2;
        points.push([x, y]);
        if (y >= Math.min(H + 20, surfaceAt(x, base, t, x, 0))) break;
      }
      const path = points.slice(0, Math.max(2, Math.ceil(points.length * flow)));
      [impactX, impactY] = path[path.length - 1];
      const w = Math.max(14, H * .038) * (.6 + .4 * flow);
      const trace = (width, style) => { ctx.lineWidth = width; ctx.strokeStyle = style; ctx.stroke(); };
      offsetLine(ctx, path, 0);
      trace(w, 'rgba(225,255,240,.16)');                 // clear body
      trace(w * .55, 'rgba(255,255,255,.10)');
      offsetLine(ctx, path, -w * .36); trace(Math.max(1.2, w * .07), 'rgba(255,255,255,.85)'); // lit rim
      offsetLine(ctx, path, w * .40); trace(Math.max(1, w * .05), 'rgba(255,255,255,.42)');   // far rim
      // Travelling glints read as flowing liquid.
      offsetLine(ctx, path, -w * .12);
      ctx.setLineDash([w * .9, w * 2.4]);
      ctx.lineDashOffset = -t * H * .9;
      trace(Math.max(1.2, w * .11), 'rgba(255,255,255,.9)');
      ctx.setLineDash([]);
      // Fizz carried inside the stream.
      for (const f of streamFizz) {
        const k = ((t * 1.3 + f.phase) % 1) * (path.length - 1);
        const p0 = path[Math.floor(k)], p1 = path[Math.min(path.length - 1, Math.floor(k) + 1)];
        const x = p0[0] + (p1[0] - p0[0]) * (k % 1) + f.side * w * .6;
        const y = p0[1] + (p1[1] - p0[1]) * (k % 1);
        ctx.globalAlpha = .85;
        ctx.drawImage(bubble, x - f.size, y - f.size, f.size * 2, f.size * 2);
      }
      ctx.globalAlpha = 1;
    }

    // ⑤ Pool: clear soda first (green shows through), whitening to PURE.
    if (level > 0) {
      const splash = flow * (1 - smooth(level, .75, 1));
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, H + 2);
      for (let x = 0; x <= W + 16; x += 16) ctx.lineTo(x, surfaceAt(x, base, t, impactX, splash));
      ctx.lineTo(W + 16, H + 2);
      ctx.closePath();
      const fill = ctx.createLinearGradient(0, base, 0, H);
      fill.addColorStop(0, 'rgba(246,255,251,' + (.16 + .84 * solid) + ')');
      fill.addColorStop(1, 'rgba(214,248,232,' + (.26 + .74 * solid) + ')');
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.clip();
      // Caustic light drifting through the water.
      if (solid < 1) {
        causticPattern.setTransform(new DOMMatrix().translate(Math.sin(t * .4) * 40, -t * 18).scale(1.6));
        ctx.globalAlpha = .06 * (1 - solid);
        ctx.fillStyle = causticPattern;
        ctx.fillRect(0, base - 40, W, H - base + 40);
      }
      // Dense rising micro-bubbles, densest under the stream.
      const depth = H - base + 30;
      for (const m of micro) {
        const x = (m.column ? impactX / W + m.offset : m.x) * W + Math.sin(t * 3 + m.sway) * 3;
        const y = H + 10 - ((t * m.speed * .5 + m.phase) % 1) * depth;
        ctx.globalAlpha = m.alpha * (1 - solid * .75);
        ctx.drawImage(bubble, x - m.size, y - m.size, m.size * 2, m.size * 2);
      }
      ctx.restore();
      // Bright meniscus with a soft glow, plus a thin foam of tiny bubbles.
      ctx.beginPath();
      for (let x = 0; x <= W + 16; x += 16) {
        const y = surfaceAt(x, base, t, impactX, splash);
        if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,.9)';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
      for (let i = 0; i < 120; i++) {
        const x = ((i * 0.618034 + t * .01) % 1) * W;
        const y = surfaceAt(x, base, t, impactX, splash) + 2 + ((i * .4142) % 1) * 7;
        const r = 1 + ((i * .7071) % 1) * 2.6;
        ctx.globalAlpha = .7;
        ctx.drawImage(bubble, x - r, y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
    }

    // Spray where the stream hits the surface.
    if (flow > 0 && level > 0 && solid < .95) {
      const w = Math.max(12, H * .03);
      for (const d of spray) {
        const k = (t * 1.5 + d.phase) % 1;
        const x = impactX + d.vx * w * 4 * k;
        const y = impactY + d.vy * w * 4 * k + w * 5 * k * k;
        ctx.globalAlpha = (1 - k) * .9 * (1 - solid);
        const r = d.size * (1 - k * .4);
        ctx.drawImage(bubble, x - r, y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
    }
  }

  function frame(now) {
    const dt = Math.min(.05, (now - lastTime) / 1000);
    lastTime = now;
    const s = Math.max(0, scrollY / Math.max(1, innerHeight));
    const boundary = nextSection ? nextSection.getBoundingClientRect().top / innerHeight : 0;
    updateChrome(s, boundary);
    const inHero = s < 1.62;
    const idle = 1 - smooth(s, 0, .06);
    if (idle > 0) {
      idleYaw += dt * .55 * idle;
      dirty = true;
    }
    // ③ Crack the tab on a clock once the can has tipped forward.
    if (s >= TAB_AT) tabTarget = 1;
    else if (s < TAB_AT - .05) tabTarget = 0;
    if (tabOpen !== tabTarget) {
      tabOpen = tabTarget ? Math.min(1, tabOpen + dt / .38) : Math.max(0, tabOpen - dt / .25);
      dirty = true;
    }
    if (s > POUR_FLOW - .02 && s < FILL_END + .06) dirty = true; // liquid keeps moving
    if (inHero && dirty) {
      dirty = false;
      const t = now / 1000;
      const spin = smooth(s, 0, SPIN_END);
      const settle = smooth(s, SPIN_END, SETTLE_END);
      const pour = smooth(s, POUR_START, POUR_END);

      // ① spin (≈1.75 turns) → ② land logo-front, tipped toward the viewer.
      const freeYaw = idleYaw + spin * 3.5 * Math.PI;
      const landingFrom = idleYaw + 3.5 * Math.PI;
      const landingYaw = pourYaw + TAU * Math.ceil((landingFrom - pourYaw) / TAU);
      spinner.rotation.y = lerp(freeYaw, landingYaw, settle);

      const drop = Math.sin(spin * Math.PI) * (1 - settle);
      const bob = Math.sin(t * 1.6) * .045 * idle;
      const pourX = (POUR_SPOT.x - .5) * view.width * view.unit;
      const pourY = (.5 - POUR_SPOT.y) * view.height * view.unit;
      carrier.scale.setScalar(view.scale);
      carrier.position.set(
        lerp(view.home.x, pourX, settle),
        lerp(view.home.y, pourY, settle) + bob - drop * view.height * view.unit * .16,
        0);
      // Euler XYZ: tip sideways (Z) first, then toward the viewer (X).
      const forward = .42 * settle * (1 - .45 * pour);
      const sideways = (-.10 * (1 - spin) + Math.sin(spin * TAU * 1.5) * .32 * drop) * (1 - settle)
        - 1.95 * pour;
      carrier.rotation.set(drop * .32 * (1 - settle) + forward, 0, sideways);

      // Tab lifts (ring end up), the opening appears under its nose.
      const pop = 1 - (1 - tabOpen) ** 3;
      lever.rotation.x = 1.05 * pop;
      opening.scale.set(.13 * pop + .0001, .085 * pop + .0001, 1);

      carrier.updateMatrixWorld(true);
      toScreen(mouthLocal, mouth);
      toScreen(topLocal, top);
      toScreen(bottomLocal, bottom);
      camera.position.set(0, 0, baseDistance);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      drawLiquid(s, t);
    }
    requestAnimationFrame(frame);
  }

  addEventListener('scroll', () => { dirty = true; }, { passive: true });
  addEventListener('resize', resize, { passive: true });
  resize();
  hero.classList.add('has-can-3d');
  requestAnimationFrame(frame);
}

start().catch(error => {
  console.warn('Hero can dive:', error);
  hero?.classList.remove('has-can-3d');
});
