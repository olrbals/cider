/* HERO V6 — "Spin · Burst · Splash · Wave".
 * ① The real 3D 2024 can idles, then spins in place with the scroll.
 * ② It stops logo-front; ③ the tab cracks and a water star bursts behind it
 *    (five real jets + droplet-filled star).
 * ④ Real water rushes at the viewer; ⑤ the next page rolls up from the
 *    bottom as a wave and becomes PURE.
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
const SPIN_END = .40;        // ① spins in place
const SETTLE_END = .50;      // ② stops logo-front
const TAB_AT = .48;          // ③ tab cracks + water star bursts (clock-driven)
const FRONT_AT = .80;        // ④ water rushes at the viewer (clock-driven)
const WAVE_START = .86;      // ⑤ next page rolls up from the bottom
const WAVE_END = 1.30;       //    …and covers the screen → PURE

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
  hero.style.setProperty('--hero-type-fade', String(1 - smooth(s, .2, .55)));
  hero.style.setProperty('--hero-type-lift', (-70 * smooth(s, .2, .55)).toFixed(1) + 'px');
  hero.style.setProperty('--hero-wash', s >= WAVE_END ? '1.05' : '-.35');
  if (header) {
    const offHero = nextSection ? boundary <= .08 : s > 1.5;
    header.classList.toggle('is-off-hero', offHero);
    header.classList.toggle('is-on-light', !offHero && s >= 1.2);
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

  // ④ Real footage (Pexels, free licence): water rushing at the lens,
  // screen-blended so black drops out and only lit water remains.
  const front = document.createElement('video');
  front.className = 'hero-front-splash';
  front.src = new URL('../media/hero-front-splash.mp4', import.meta.url).href;
  front.muted = true;
  front.playsInline = true;
  front.preload = 'auto';
  front.setAttribute('aria-hidden', 'true');
  front.setAttribute('muted', '');
  front.setAttribute('playsinline', '');
  stage.append(front);
  let frontOn = false;

  // ⑤ The next page as a rolling wave (same language as the site's other
  // section transitions), drawn above everything in the hero.
  const wave = document.createElement('canvas');
  wave.className = 'hero-next-wave';
  wave.setAttribute('aria-hidden', 'true');
  stage.append(wave);
  const waveCtx = wave.getContext('2d');
  // Real spray riding the crest: looping droplet footage, screen-blended,
  // fading upward so it reads as water thrown off the wave.
  const sprays = [0, 1, 2, 3].map(i => {
    const v = document.createElement('video');
    v.className = 'hero-wave-spray';
    v.src = new URL('../media/hero-star-droplets.mp4', import.meta.url).href;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.setAttribute('aria-hidden', 'true');
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.style.setProperty('--flip', i % 2 ? '-1' : '1');
    stage.append(v);
    return v;
  });

  // Water star: bursts behind the can as the tab cracks open. The original
  // bubble-star artwork + real droplet footage cut to the same silhouette,
  // the whole group screen-blended so only the lit water shows.
  const star = document.createElement('div');
  star.className = 'hero-pop-star';
  star.setAttribute('aria-hidden', 'true');
  star.innerHTML = '<span class="hero-pop-star__glow"></span><span class="hero-pop-star__body"></span>'
    + '<video class="hero-pop-star__drops" muted loop playsinline preload="auto"></video>'
    + [0, 72, 144, 216, 288].map(a => '<video class="hero-pop-star__jet" style="--a:' + a + 'deg" muted playsinline preload="auto"></video>').join('')
    + '<img class="hero-pop-star__art" alt="" src="' + new URL('../img/hero-star/finalstarforgreen.png', import.meta.url).href + '">';
  const drops = star.querySelector('video');
  drops.muted = true;
  drops.src = new URL('../media/hero-star-droplets.mp4', import.meta.url).href;
  star.style.setProperty('--star-mask', 'url("' + new URL('../img/hero-star/star-mask.png', import.meta.url).href + '")');
  const jets = [...star.querySelectorAll('.hero-pop-star__jet')];
  const jetSrc = new URL('../media/hero-star-jet.mp4', import.meta.url).href;
  jets.forEach(jet => { jet.muted = true; jet.src = jetSrc; });
  stage.append(star);
  let starT = 0;
  let jetsFired = false;
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
    wave.width = Math.round(width * ratio);
    wave.height = Math.round(height * ratio);
    waveCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
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

  const centerLocal = new THREE.Vector3(0, 0, 0);
  const center = {};
  const springOut = t => { const k = 2.6, u = Math.min(1, Math.max(0, t)) - 1; return 1 + (k + 1) * u * u * u + k * u * u; };
  function placeStar(s, surge) {
    // ③ "팡": spring pop on a clock; ④ breaks apart as the water rushes forward.
    const opening = tabTarget === 1;
    const pop = opening ? springOut(Math.min(1, starT / .8)) : starT;
    if (opening && !jetsFired) {
      jetsFired = true;
      jets.forEach(jet => { jet.currentTime = 0; jet.play().catch(() => {}); });
    } else if (!opening && starT === 0) jetsFired = false;
    // Jets fade as their burst settles, so no frozen last frame lingers.
    jets.forEach(jet => {
      const k = jet.duration ? jet.currentTime / jet.duration : 1;
      jet.style.opacity = jetsFired && !jet.ended ? (1 - smooth(k, .55, .95)).toFixed(3) : '0';
    });
    if (jetsFired && !jets[0].ended) dirty = true;
    // ④ The star bursts again and surges at the viewer, handing over to
    // the lens splash that grows out of its centre.
    const breakUp = smooth(surge, .12, .42);
    const opacity = (opening ? Math.min(1, starT / .12) : starT) * (1 - breakUp);
    if (opacity <= .001) {
      if (star.style.opacity !== '0') { star.style.opacity = '0'; drops.pause(); }
      return;
    }
    toScreen(centerLocal, center);
    const layout = Math.min(view.width / 1440, view.height / 900);
    const width = 1030 * layout * 1.05;
    const scale = (.18 + .82 * pop) * (1 + 1.6 * (1 - (1 - smooth(surge, 0, .45)) ** 2));
    const flash = opening ? 1 - smooth(starT, .02, .45) : 0;
    star.style.cssText = 'left:' + (center.x - width / 2).toFixed(1) + 'px;top:' + (center.y - width * 900 / 1030 / 2).toFixed(1)
      + 'px;width:' + width.toFixed(1) + 'px;height:' + (width * 900 / 1030).toFixed(1) + 'px;opacity:' + opacity.toFixed(3)
      + ';transform:scale(' + scale.toFixed(4) + ') rotate(' + (-9 * (1 - pop)).toFixed(2) + 'deg);--star-flash:' + flash.toFixed(3)
      + ';--star-mask:' + star.style.getPropertyValue('--star-mask');
    if (drops.paused) drops.play().catch(() => {});
  }

  function drawWave(s, t) {
    const W = view.width, H = view.height, ctx = waveCtx;
    ctx.clearRect(0, 0, W, H);
    const rise = smooth(s, WAVE_START, WAVE_END);
    if (rise <= 0) {
      sprays.forEach(v => { if (!v.paused) v.pause(); v.style.opacity = '0'; });
      return false;
    }
    // Swell grows in the middle of the climb and calms as it fills.
    const swell = H * (.035 + .05 * Math.sin(Math.min(1, rise) * Math.PI));
    const base = H * (1.12 - 1.30 * rise);
    const edge = (x, lag, k) => {
      const u = x / W * TAU;
      return base + lag + swell * (Math.sin(u * 1.1 + t * 1.6 * k + rise * 5) * .55
        + Math.sin(u * 2.3 - t * 2.1 * k + 1.3) * .3 + Math.sin(u * 4.7 + t * 3.2) * .15);
    };
    const fillUnder = (lag, k, style) => {
      ctx.beginPath();
      ctx.moveTo(0, H + 2);
      for (let x = 0; x <= W + 16; x += 16) ctx.lineTo(x, edge(x, lag, k));
      ctx.lineTo(W + 16, H + 2);
      ctx.closePath();
      ctx.fillStyle = style;
      ctx.fill();
    };
    // Back swell (translucent), then the main body with a soft shaded crest.
    fillUnder(-H * .05, 1.35, 'rgba(255,255,255,.38)');
    const body = ctx.createLinearGradient(0, base - swell, 0, base + H * .22);
    body.addColorStop(0, '#f4fbf8');
    body.addColorStop(.18, '#ffffff');
    body.addColorStop(1, '#ffffff');
    fillUnder(0, 1, body);
    // Glossy rim light along the crest.
    ctx.beginPath();
    for (let x = 0; x <= W + 16; x += 16) {
      const y = edge(x, 0, 1);
      if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.save();
    ctx.shadowColor = 'rgba(255,255,255,.95)';
    ctx.shadowBlur = 18;
    ctx.strokeStyle = 'rgba(255,255,255,.95)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    // Spray: four overlapping bands anchored to the highest crest point in
    // their span; strongest mid-climb, gone once the page has filled.
    const sprayAlpha = Math.sin(Math.min(1, rise) * Math.PI) * (1 - smooth(rise, .82, .97));
    sprays.forEach((v, i) => {
      if (sprayAlpha <= .01) { if (!v.paused) v.pause(); v.style.opacity = '0'; return; }
      const w = W * .36, h = H * .34, left = -W * .04 + i * W * .27;
      let crest = H;
      for (let x = Math.max(0, left); x <= Math.min(W, left + w); x += 24) crest = Math.min(crest, edge(x, 0, 1));
      v.style.cssText = 'left:' + left.toFixed(1) + 'px;top:' + (crest - h * .78).toFixed(1) + 'px;width:' + w.toFixed(1)
        + 'px;height:' + h.toFixed(1) + 'px;opacity:' + (sprayAlpha * .95).toFixed(3) + ';--flip:' + (i % 2 ? '-1' : '1');
      if (v.paused) { v.currentTime = (i * .37) % 1.5; v.play().catch(() => {}); }
    });
    return true;
  }

  function placeClips(s, t) {
    // ④ Water rushes at the viewer (plays once). It grows out of the star's
    // centre with an expanding radial reveal, so the burst carries straight on.
    let surge = 0;
    if (s >= FRONT_AT && s < WAVE_END + .04) {
      if (!frontOn) {
        frontOn = true;
        front.currentTime = 0;
        front.play().catch(() => {});
        jets.forEach(jet => { jet.currentTime = 0; jet.play().catch(() => {}); }); // second burst
      }
      const k = front.duration ? front.currentTime / front.duration : 0;
      surge = Math.max(.001, k);
      toScreen(centerLocal, center);
      const grow = 1 - (1 - smooth(k, 0, .5)) ** 3;
      front.style.transformOrigin = center.x.toFixed(1) + 'px ' + center.y.toFixed(1) + 'px';
      front.style.transform = 'scale(' + (1 + .35 * grow).toFixed(4) + ')'; // never smaller than the screen: no visible frame edge
      front.style.setProperty('--reveal-x', center.x.toFixed(1) + 'px');
      front.style.setProperty('--reveal-y', center.y.toFixed(1) + 'px');
      front.style.setProperty('--reveal-r', (5 + 150 * grow).toFixed(1) + 'vmax');
      front.style.opacity = (smooth(k, 0, .06) * (1 - smooth(k, .72, 1))).toFixed(3);
      if (!front.ended) dirty = true;
    } else {
      if (s < FRONT_AT - .04 || s >= WAVE_END + .04) {
        frontOn = false;
        front.pause();
      }
      front.style.opacity = '0';
    }
    placeStar(s, surge);
    if (drawWave(s, t)) dirty = true;
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
    const starGoal = tabTarget;
    if (starT !== starGoal) {
      starT = starGoal ? Math.min(1, starT + dt / .6) : Math.max(0, starT - dt / .32);
      dirty = true;
    }
    if (tabOpen !== tabTarget) {
      tabOpen = tabTarget ? Math.min(1, tabOpen + dt / .38) : Math.max(0, tabOpen - dt / .25);
      dirty = true;
    }
    if (inHero && dirty) {
      dirty = false;
      const t = now / 1000;
      const spin = smooth(s, 0, SPIN_END);
      const settle = smooth(s, SPIN_END, SETTLE_END);

      // ① spin in place (≈1.75 turns) → ② stop logo-front.
      const freeYaw = idleYaw + spin * 3.5 * Math.PI;
      const landingFrom = idleYaw + 3.5 * Math.PI;
      const landingYaw = pourYaw + TAU * Math.ceil((landingFrom - pourYaw) / TAU);
      spinner.rotation.y = lerp(freeYaw, landingYaw, settle);

      const bob = Math.sin(t * 1.6) * .045 * idle;
      // A small recoil when the star bursts sells the "팡".
      const kick = Math.sin(Math.min(1, starT * 2.2) * Math.PI) * (tabTarget ? 1 : 0);
      carrier.scale.setScalar(view.scale * (1 + .05 * settle + .04 * kick));
      carrier.position.set(view.home.x, view.home.y + bob + view.height * view.unit * .04 * settle, 0);
      // Slight tip toward the viewer once stopped, so the tab is visible.
      const sway = Math.sin(spin * Math.PI) * (1 - settle);
      carrier.rotation.set(.18 * settle + sway * .12, 0, (-.10 * (1 - spin) + Math.sin(spin * TAU * 1.5) * .18 * sway) * (1 - settle));

      // Tab lifts (ring end up), the opening appears under its nose.
      const pop = 1 - (1 - tabOpen) ** 3;
      lever.rotation.x = 1.05 * pop;
      opening.scale.set(.13 * pop + .0001, .085 * pop + .0001, 1);

      carrier.updateMatrixWorld(true);
      camera.position.set(0, 0, baseDistance);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      placeClips(s, t);
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
