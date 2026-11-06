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
  const fizz = Array.from({ length: 90 }, (_, i) => ({
    x: (i * 0.6180339) % 1, speed: .5 + ((i * 0.381966) % 1) * .9,
    size: 3 + ((i * 0.7548776) % 1) * 9, phase: (i * 0.5698403) % 1
  }));

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

  function surfaceAt(x, base, t, impactX, splash) {
    const u = x / view.width * TAU;
    const amp = view.height * .016;
    let y = base + amp * (Math.sin(u * 1.2 + t * 1.7) * .6 + Math.sin(u * 2.6 - t * 2.3 + 1) * .4);
    if (splash > 0) {
      const d = (x - impactX) / (view.width * .05);
      y -= view.height * .03 * splash * Math.exp(-d * d) * (.7 + .3 * Math.sin(t * 11));
    }
    return y;
  }

  function drawLiquid(s, t) {
    const W = view.width, H = view.height, ctx = pourCtx;
    ctx.clearRect(0, 0, W, H);
    const flow = smooth(s, POUR_FLOW, POUR_FLOW + .09);
    const level = smooth(s, FILL_START, FILL_END);
    if (flow <= 0 && level <= 0) return;
    const base = H * (1.04 - 1.12 * level);
    // ④ Stream: leaves the lowest lip along the can axis, then falls.
    let impactX = mouth.x;
    if (flow > 0) {
      let dx = top.x - bottom.x, dy = top.y - bottom.y;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const speed = H * .55, gravity = H * 3.2;
      const points = [];
      for (let i = 0; i <= 48; i++) {
        const u = i / 48 * .9;
        const x = mouth.x + dx * speed * u;
        const y = mouth.y + dy * speed * u + gravity * u * u / 2;
        points.push([x, y]);
        if (y >= Math.min(H + 20, surfaceAt(x, base, t, x, 0))) break;
      }
      const shown = Math.max(2, Math.ceil(points.length * flow));
      const path = points.slice(0, shown);
      impactX = path[path.length - 1][0];
      const width = Math.max(14, H * .034) * (.55 + .45 * flow);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      path.forEach(([x, y], i) => {
        const wobble = Math.sin(t * 14 + i * .7) * width * .08;
        if (i) ctx.lineTo(x + wobble, y); else ctx.moveTo(x, y);
      });
      ctx.strokeStyle = 'rgba(232,255,245,.50)';
      ctx.lineWidth = width;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.72)';
      ctx.lineWidth = width * .58;
      ctx.stroke();
      ctx.save();
      ctx.translate(-width * .16, 0);
      ctx.strokeStyle = 'rgba(255,255,255,.98)';
      ctx.lineWidth = width * .14;
      ctx.stroke();
      ctx.restore();
      // Splash droplets where the stream meets the pool.
      if (level > 0) {
        const [ix, iy] = path[path.length - 1];
        for (let i = 0; i < 7; i++) {
          const k = (t * 1.8 + i / 7) % 1;
          const dir = (i % 2 ? 1 : -1) * (.4 + (i % 3) * .3);
          ctx.beginPath();
          ctx.arc(ix + dir * width * 2.2 * k, iy - width * 2.4 * Math.sin(k * Math.PI), width * .16 * (1 - k * .6), 0, TAU);
          ctx.fillStyle = 'rgba(255,255,255,' + (.85 * (1 - k)) + ')';
          ctx.fill();
        }
      }
      // Fizz travelling down the stream.
      for (let i = 0; i < 14; i++) {
        const k = ((t * 1.6 + i / 14) % 1) * (path.length - 1);
        const a = path[Math.floor(k)], b = path[Math.min(path.length - 1, Math.floor(k) + 1)];
        const f = k % 1;
        const r = width * (.12 + (i % 3) * .06);
        ctx.beginPath();
        ctx.arc(a[0] + (b[0] - a[0]) * f + Math.sin(i * 3.1) * width * .25, a[1] + (b[1] - a[1]) * f, r, 0, TAU);
        ctx.strokeStyle = 'rgba(20,159,92,.35)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }
    // ⑤ Pool: the poured soda rises, clear first, then the solid white of PURE.
    if (level > 0) {
      const splash = flow * (1 - smooth(level, .75, 1));
      const solid = smooth(level, .30, .85);
      ctx.beginPath();
      ctx.moveTo(0, H + 2);
      for (let x = 0; x <= W + 20; x += 20) ctx.lineTo(x, surfaceAt(x, base, t, impactX, splash));
      ctx.lineTo(W + 20, H + 2);
      ctx.closePath();
      const fill = ctx.createLinearGradient(0, base - H * .05, 0, H);
      fill.addColorStop(0, 'rgba(255,255,255,' + (.66 + .34 * solid) + ')');
      fill.addColorStop(1, 'rgba(226,249,238,' + (.74 + .26 * solid) + ')');
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.save();
      ctx.clip();
      for (const b of fizz) {
        const y = H - ((t * .18 * b.speed + b.phase) % 1) * (H - base + 40);
        const x = b.x * W + Math.sin(t * 2 + b.phase * 9) * 6;
        ctx.beginPath();
        ctx.arc(x, y, b.size * (.6 + .4 * (1 - solid)), 0, TAU);
        ctx.strokeStyle = 'rgba(20,159,92,' + (.28 * (1 - solid * .7)) + ')';
        ctx.lineWidth = 1.3;
        ctx.stroke();
      }
      ctx.restore();
      ctx.beginPath();
      for (let x = 0; x <= W + 20; x += 20) {
        const y = surfaceAt(x, base, t, impactX, splash);
        if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.strokeStyle = 'rgba(255,255,255,1)';
      ctx.lineWidth = 3;
      ctx.stroke();
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
