import * as THREE from './vendor/three.module.js';

// Consistent archive panels use 1440 x 480 proportions; labels keep the original 2:1 UV maps.
const HISTORY_ERAS = [
  { year: '1950', packaging: 'img/history/1950packaging.png', fallback: 'img/history/1950-horizontal-reference.png', horizontalFallback: true },
  { year: '1960', packaging: 'img/history/1960packaging.png', fallback: 'img/display/era-1960.png' },
  { year: '1970', packaging: 'img/history/1970packaging.png', fallback: 'img/display/era-1970.png' },
  { year: '1987', packaging: 'img/history/1987packaging.png', fallback: 'img/display/era-1987.png' },
  { year: '1994', packaging: 'img/history/1994packaging.png', fallback: 'img/display/era-1994.png' },
  { year: '2000', packaging: 'img/history/2000packaging.png', fallback: 'img/display/era-2000.png', uvShift: -0.11 },
  { year: '2014', packaging: 'img/history/2014packaging-uv.png', fallback: 'img/display/era-2014.png' },
  { year: '2024', packaging: 'img/history/2024packaging-uv.png', fallback: 'img/display/hero-can.png', uvShift: -0.03 }
]

const assetURL = path => new URL(`../${path}`, import.meta.url).href;

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

function makeCan(stage, track, images) {
  const width = 1024;
  const height = 512;
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = width;
  labelCanvas.height = height;
  const context = labelCanvas.getContext('2d', { alpha: false });
  let lastPair = -1;
  let lastBlend = -1;

  function drawLabel(index, alpha = 1) {
    // Rotate the flat UV around the same cylinder to center each era's front artwork.
    const offset = (HISTORY_ERAS[index].uvShift || 0) * width;
    context.globalAlpha = alpha;
    context.drawImage(images[index], offset, 0, width, height);
    if (offset < 0) context.drawImage(images[index], offset + width, 0, width, height);
    if (offset > 0) context.drawImage(images[index], offset - width, 0, width, height);
  }

  function blendLabels(index, blend) {
    const nextBlend = Math.round(blend * 128) / 128;
    if (index === lastPair && nextBlend === lastBlend) return;
    drawLabel(index);
    if (nextBlend > 0 && images[index + 1]) {
      drawLabel(index + 1, nextBlend);
    }
    context.globalAlpha = 1;
    lastPair = index;
    lastBlend = nextBlend;
    labelTexture.needsUpdate = true;
  }

  drawLabel(0);
  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  labelTexture.colorSpace = THREE.SRGBColorSpace;
  labelTexture.anisotropy = 4;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 40);
  camera.position.set(0.9, 0, 8.5);
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
  // Scale the entire can (body, rims and tab) to 70% of the previous preview.
  carrier.scale.setScalar(0.7);
  carrier.rotation.z = -Math.PI / 2; // Blender's horizontal X-axis can.
  scene.add(carrier);
  const rolling = new THREE.Group();
  carrier.add(rolling);

  // Reduce the cylinder's axial length by about 8% without changing its diameter.
  const canLength = 2.88;
  const capCenter = canLength / 2 + 0.0375;
  const rimCenter = capCenter + 0.045;
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.68, canLength, 128, 1, true),
    new THREE.MeshStandardMaterial({ map: labelTexture, metalness: 0.22, roughness: 0.42 })
  );
  rolling.add(label);

  const metal = new THREE.MeshStandardMaterial({ color: 0xc5cdd0, metalness: 0.88, roughness: 0.24 });
  const inset = new THREE.MeshStandardMaterial({ color: 0xc2c9ca, emissive: 0x343a3a, metalness: 0.58, roughness: 0.31 });
  for (const sign of [-1, 1]) {
    const end = new THREE.Mesh(new THREE.CylinderGeometry(0.70, 0.70, 0.075, 128), metal);
    end.position.y = sign * capCenter;
    rolling.add(end);
    const innerDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.59, 0.59, 0.012, 96), inset);
    innerDisc.position.y = sign * rimCenter;
    rolling.add(innerDisc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.63, 0.027, 12, 96), metal);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = sign * rimCenter;
    rolling.add(rim);
  }

  // A restrained ring on the visible end adds depth without altering either label.
  const pullRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.018, 8, 40), metal);
  pullRing.rotation.x = Math.PI / 2;
  pullRing.position.set(0, rimCenter + 0.014, 0.05);
  rolling.add(pullRing);

  let frustumHeight = 3.1;
  let viewportHeight = 1;
  let panelHeight = 1;
  let scrollDistance = 1;
  function resize() {
    const bounds = stage.getBoundingClientRect();
    const viewportWidth = Math.max(1, bounds.width);
    viewportHeight = Math.max(1, bounds.height);
    const aspect = viewportWidth / viewportHeight;
    panelHeight = Math.max(1, track.firstElementChild?.getBoundingClientRect().height || 1);
    scrollDistance = Math.max(0, track.getBoundingClientRect().height - viewportHeight);
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
    // In document space the can passes through each connected frame's center.
    // Its screen position gradually descends while the backgrounds scroll behind it.
    const documentY = panelHeight * (0.5 + progress * (images.length - 1));
    const screenY = documentY - progress * scrollDistance;
    carrier.position.y = frustumHeight * (0.5 - screenY / viewportHeight);
    // Scrolling down always rolls in the same direction: two turns per era.
    rolling.rotation.y = Math.PI + 0.28 + progress * Math.PI * 4 * (images.length - 1);
    renderer.render(scene, camera);
  }

  resize();
  return { render, resize };
}

async function initHistory(section) {
  const stage = section.querySelector('.history-3d-stage');
  const track = section.querySelector('.history-3d-track');
  if (!stage || !track) return;
  const fallbackImage = stage.querySelector('.history-3d-fallback img');
  const eras = HISTORY_ERAS.map(({ year, packaging }) => {
    const era = document.createElement('article');
    era.className = 'history-3d-era';
    era.dataset.year = year;
    era.dataset.packaging = packaging;
    const yearLabel = document.createElement('span');
    yearLabel.className = 'history-3d-year';
    yearLabel.textContent = year;
    if (year === '1950') {
      // Pilot art direction: a single orbit, an archival caption and one
      // eight-point Chilsung star (the existing pinned star is hidden here).
      const orbit = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      orbit.classList.add('history-3d-1950-orbit');
      orbit.setAttribute('viewBox', '0 0 1440 480');
      orbit.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      orbit.setAttribute('aria-hidden', 'true');
      const orbitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      orbitPath.setAttribute('d', 'M -80 360 C 160 402 322 258 552 270 S 910 377 1158 228 S 1430 112 1518 150');
      orbitPath.setAttribute('fill', 'none');
      orbitPath.setAttribute('stroke', '#4b8667');
      orbitPath.setAttribute('stroke-width', '1.6');
      orbitPath.setAttribute('opacity', '.43');
      orbit.append(orbitPath);
      const star = document.createElement('span');
      star.className = 'history-3d-1950-star';
      star.setAttribute('aria-hidden', 'true');
      const eyebrow = document.createElement('span');
      eyebrow.className = 'history-3d-1950-eyebrow';
      eyebrow.textContent = 'CHILSUNG CIDER  /  BRAND ARCHIVE';
      const title = document.createElement('span');
      title.className = 'history-3d-1950-title';
      title.textContent = '칠성사이다의 시작';
      const index = document.createElement('span');
      index.className = 'history-3d-1950-index';
      index.textContent = '01 / 08  ·  SINCE 1950';
      const footer = document.createElement('span');
      footer.className = 'history-3d-1950-footer';
      footer.textContent = 'ROLLING THROUGH TIME';
      era.append(orbit, star, yearLabel, eyebrow, title, index, footer);
    } else {
      era.append(yearLabel);
    }
    track.append(era);
    return era;
  });
  const years = eras.map(era => era.dataset.year);
  section.setAttribute('aria-label', `${years[0]}년부터 ${years.at(-1)}년까지 패키징이 바뀌는 3D 캔`);
  let can = null;

  try {
    const images = await Promise.all(eras.map(era => loadImage(assetURL(era.dataset.packaging))));
    can = makeCan(stage, track, images);
    section.dataset.ready = 'true';
  } catch (error) {
    section.dataset.fallback = 'true';
    console.error('History 3D:', error);
  }

  let progress = 0;
  let fallbackYear = '';
  function render(value) {
    progress = clamp(value);
    const point = progress * (eras.length - 1);
    const pair = Math.min(eras.length - 2, Math.floor(point));
    const local = point - pair;
    const blend = smoothstep(0.38, 0.62, local);
    section.dataset.progress = progress.toFixed(3);
    const activeIndex = blend < 0.5 ? pair : pair + 1;
    section.dataset.activeYear = years[activeIndex];
    if (fallbackImage && fallbackYear !== years[activeIndex]) {
      fallbackImage.src = assetURL(HISTORY_ERAS[activeIndex].fallback);
      fallbackImage.classList.toggle('is-horizontal', !!HISTORY_ERAS[activeIndex].horizontalFallback);
      fallbackYear = years[activeIndex];
    }
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
