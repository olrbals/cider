import * as THREE from './vendor/three.module.js';

const clamp = value => Math.min(1, Math.max(0, value));
const smoothstep = (start, end, value) => {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${url}`));
    image.src = url;
  });
}

function makeCan(stage, images) {
  const width = 1024;
  const height = 512;
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = width;
  labelCanvas.height = height;
  const context = labelCanvas.getContext('2d', { alpha: false });
  let lastPair = -1;
  let lastBlend = -1;

  function blendLabels(index, blend) {
    const nextBlend = Math.round(blend * 128) / 128;
    if (index === lastPair && nextBlend === lastBlend) return;
    context.globalAlpha = 1;
    context.drawImage(images[index], 0, 0, width, height);
    if (nextBlend > 0 && images[index + 1]) {
      context.globalAlpha = nextBlend;
      context.drawImage(images[index + 1], 0, 0, width, height);
      context.globalAlpha = 1;
    }
    lastPair = index;
    lastBlend = nextBlend;
    labelTexture.needsUpdate = true;
  }

  context.drawImage(images[0], 0, 0, width, height);
  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  labelTexture.colorSpace = THREE.SRGBColorSpace;
  labelTexture.anisotropy = 4;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 40);
  camera.position.set(2.5, 0, 8.5);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;
  stage.querySelector('.history-3d-canvas').append(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x928c81, 2.7));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
  keyLight.position.set(-3, 5, 7);
  scene.add(keyLight);
  const edgeLight = new THREE.DirectionalLight(0xffffff, 1.3);
  edgeLight.position.set(4, -2, -4);
  scene.add(edgeLight);

  const carrier = new THREE.Group();
  carrier.rotation.z = -Math.PI / 2; // Blender's horizontal X-axis can.
  scene.add(carrier);
  const rolling = new THREE.Group();
  carrier.add(rolling);

  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.68, 3.14, 128, 1, true),
    new THREE.MeshStandardMaterial({ map: labelTexture, metalness: 0.22, roughness: 0.42 })
  );
  rolling.add(label);

  const metal = new THREE.MeshStandardMaterial({ color: 0xc5cdd0, metalness: 0.88, roughness: 0.24 });
  const inset = new THREE.MeshStandardMaterial({ color: 0xc2c9ca, emissive: 0x343a3a, metalness: 0.58, roughness: 0.31 });
  for (const sign of [-1, 1]) {
    const end = new THREE.Mesh(new THREE.CylinderGeometry(0.70, 0.70, 0.075, 128), metal);
    end.position.y = sign * 1.60;
    rolling.add(end);
    const innerDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.59, 0.59, 0.012, 96), inset);
    innerDisc.position.y = sign * 1.645;
    rolling.add(innerDisc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.63, 0.027, 12, 96), metal);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = sign * 1.645;
    rolling.add(rim);
  }

  // A restrained ring on the visible end adds depth without altering either label.
  const pullRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.018, 8, 40), metal);
  pullRing.rotation.x = Math.PI / 2;
  pullRing.position.set(0, 1.659, 0.05);
  rolling.add(pullRing);

  let frustumHeight = 3.1;
  let narrow = false;
  function resize() {
    const bounds = stage.getBoundingClientRect();
    const viewportWidth = Math.max(1, bounds.width);
    const viewportHeight = Math.max(1, bounds.height);
    const aspect = viewportWidth / viewportHeight;
    narrow = aspect < 0.75;
    frustumHeight = Math.max(3.1, 3.85 / aspect);
    camera.left = -frustumHeight * aspect / 2;
    camera.right = frustumHeight * aspect / 2;
    camera.top = frustumHeight / 2;
    camera.bottom = -frustumHeight / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(viewportWidth, viewportHeight, false);
  }

  function render(progress, pair, blend) {
    blendLabels(pair, blend);
    const travel = smoothstep(0, 1, progress);
    carrier.position.y = frustumHeight * (narrow ? 0.10 - 0.30 * travel : 0.18 - 0.36 * travel);
    // Two turns put the printed face forward at the package handoff and at 1960.
    rolling.rotation.y = Math.PI + 0.28 + progress * Math.PI * 4 * (images.length - 1);
    renderer.render(scene, camera);
  }

  resize();
  return { render, resize };
}

async function initHistory(section) {
  const stage = section.querySelector('.history-3d-stage');
  const eras = [...section.querySelectorAll('.history-3d-era')];
  if (eras.length < 2) return;
  section.style.height = `${eras.length * 100 + 70}svh`;
  const years = eras.map(era => era.dataset.year);
  section.setAttribute('aria-label', `${years[0]}년부터 ${years.at(-1)}년까지 패키징이 바뀌는 3D 캔`);
  stage.querySelector('.history-3d-status > span').textContent = years.join(' → ');
  const progressLabel = stage.querySelector('.history-3d-progress');
  const progressTrack = stage.querySelector('.history-3d-status-track i');
  let can = null;

  try {
    const images = await Promise.all(eras.map(era => loadImage(new URL(era.dataset.packaging, document.baseURI))));
    can = makeCan(stage, images);
    section.dataset.ready = 'true';
  } catch (error) {
    section.dataset.fallback = 'true';
    console.error('History 3D:', error);
  }

  let progress = 0;
  function render(value) {
    progress = clamp(value);
    const point = progress * (eras.length - 1);
    const pair = Math.min(eras.length - 2, Math.floor(point));
    const local = point - pair;
    const blend = smoothstep(0.38, 0.62, local);
    const backgroundReveal = smoothstep(0.38, 0.62, local);
    const outgoingText = 1 - smoothstep(0.38, 0.48, local);
    const incomingText = smoothstep(0.52, 0.62, local);

    eras.forEach((era, index) => {
      const background = era.querySelector('.history-3d-era-background');
      const opacity = index === pair ? outgoingText : index === pair + 1 ? incomingText : 0;
      background.style.setProperty('--wipe-top', index <= pair ? '-10%' : index === pair + 1 ? `${110 - backgroundReveal * 120}%` : '110%');
      era.querySelector('.history-3d-year').style.opacity = String(opacity);
      era.querySelector('.history-3d-copy').style.opacity = String(opacity);
      era.setAttribute('aria-hidden', opacity > 0.5 ? 'false' : 'true');
    });
    progressLabel.textContent = `${String(Math.round(progress * 100)).padStart(2, '0')}%`;
    progressTrack.style.transform = `scaleX(${progress})`;
    section.dataset.progress = progress.toFixed(3);
    section.dataset.activeYear = years[blend < 0.5 ? pair : pair + 1];
    can?.render(progress, pair, blend);
  }

  if (window.gsap && window.ScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);
    window.ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: self => render(self.progress),
      onRefresh: self => render(self.progress)
    });
    window.ScrollTrigger.refresh();
  } else {
    const sync = () => {
      const rect = section.getBoundingClientRect();
      render(-rect.top / Math.max(1, rect.height - window.innerHeight));
    };
    window.addEventListener('scroll', sync, { passive: true });
    sync();
  }
  const observer = new ResizeObserver(() => { can?.resize(); render(progress); });
  observer.observe(stage);
  render(progress);
}

document.querySelectorAll('.history-3d').forEach(section => { initHistory(section); });
