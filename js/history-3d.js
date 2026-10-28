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
    // A very subtle phase lead makes rolling feel ~8% snappier at the start
    // of each era, while preserving exactly two turns and the label's
    // front-facing orientation at every year marker.
    const rollPoint = progress * (images.length - 1);
    const rollFraction = rollPoint - Math.floor(rollPoint);
    const phaseLead = 0.025 * Math.sin(Math.PI * rollFraction);
    rolling.rotation.y = Math.PI + 0.28 + (rollPoint + phaseLead) * Math.PI * 4;
    renderer.render(scene, camera);
  }

  resize();
  return { render, resize };
}

// A single pinned four-column counter. Every column keeps its position;
// only a digit that changes between adjacent years gets a vertical reel.
function createArchiveCounter(stage, years) {
  const labels = [
    '칠성사이다의 시작',
    '새로운 패키지',
    '시대를 따라 변화하는 디자인',
    '이어지는 패키징의 변화',
    '또 다른 모습의 칠성사이다',
    '새로운 밀레니엄',
    '계속되는 청량함',
    '오늘의 칠성사이다'
  ];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const overlay = document.createElement('div');
  overlay.className = 'history-3d-overlay';
  const caption = document.createElement('div');
  caption.className = 'history-3d-caption';
  const eyebrow = document.createElement('span');
  eyebrow.className = 'history-3d-caption-eyebrow';
  eyebrow.textContent = 'CHILSUNG CIDER  /  BRAND HISTORY';
  const copyWindow = document.createElement('div');
  copyWindow.className = 'history-3d-caption-window';
  const copyCurrent = document.createElement('span');
  const copyNext = document.createElement('span');
  copyCurrent.className = 'history-3d-caption-copy';
  copyNext.className = 'history-3d-caption-copy';
  copyWindow.append(copyCurrent, copyNext);
  caption.append(eyebrow, copyWindow);

  const yearWindow = document.createElement('div');
  yearWindow.className = 'history-3d-odometer';
  yearWindow.setAttribute('aria-hidden', 'true');
  const digits = years[0].split('').map(() => {
    const window = document.createElement('span');
    window.className = 'history-3d-digit';
    const reel = document.createElement('span');
    reel.className = 'history-3d-digit-reel';
    window.append(reel);
    yearWindow.append(window);
    return { reel, changing: false };
  });
  const screenReaderYear = document.createElement('span');
  screenReaderYear.className = 'visually-hidden';
  screenReaderYear.textContent = years[0];
  overlay.append(caption, yearWindow, screenReaderYear);
  stage.append(overlay);

  const makeGlyph = character => {
    const glyph = document.createElement('span');
    glyph.className = 'history-3d-digit-glyph';
    glyph.textContent = character;
    return glyph;
  };
  let lastPair = -1;
  let lastStaticYear = '';

  function setYear(pair, blend) {
    if (reducedMotion.matches) {
      const selected = blend < 0.5 ? pair : pair + 1;
      if (lastStaticYear !== years[selected]) {
        years[selected].split('').forEach((digit, index) => {
          digits[index].reel.replaceChildren(makeGlyph(digit));
          digits[index].changing = false;
          digits[index].reel.style.transform = '';
        });
        lastStaticYear = years[selected];
        lastPair = -1;
      }
      copyCurrent.textContent = labels[selected];
      copyCurrent.style.opacity = '1';
      copyNext.style.opacity = '0';
      screenReaderYear.textContent = years[selected];
      return;
    }

    if (lastPair !== pair || lastStaticYear) {
      years[pair].split('').forEach((digit, index) => {
        const next = years[pair + 1][index];
        const changing = digit !== next;
        const reel = digits[index].reel;
        reel.replaceChildren(makeGlyph(digit), ...(changing ? [makeGlyph(next)] : []));
        digits[index].changing = changing;
        reel.style.transform = '';
      });
      copyCurrent.textContent = labels[pair];
      copyNext.textContent = labels[pair + 1];
      lastPair = pair;
      lastStaticYear = '';
    }

    // 0 -> -50% moves one glyph height across a two-glyph vertical stack.
    // When a digit is unchanged its reel never moves.
    digits.forEach(({ reel, changing }) => {
      if (changing) reel.style.transform = `translate3d(0,-${(blend * 50).toFixed(3)}%,0)`;
    });
    copyCurrent.style.opacity = (1 - blend).toFixed(3);
    copyNext.style.opacity = blend.toFixed(3);
    screenReaderYear.textContent = years[blend < 0.5 ? pair : pair + 1];
  }
  return setYear;
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
    // Keep the 480px scroll panel but render its year in one pinned overlay.
    track.append(era);
    return era;
  });
  // Keep the global carbonation canvas off only while archive content
  // occupies the viewport center; unaffected elsewhere.
  const syncArchiveFocus = () => {
    const rect = section.getBoundingClientRect();
    const center = window.innerHeight * 0.5;
    document.body.classList.toggle('is-history-archive-focused',
      rect.top <= center && rect.bottom >= center);
  };
  window.addEventListener('scroll', syncArchiveFocus, { passive: true });
  window.addEventListener('resize', syncArchiveFocus, { passive: true });
  syncArchiveFocus();
  const years = eras.map(era => era.dataset.year);
  const renderArchiveCounter = createArchiveCounter(stage, years);
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
    // The can and all four digit columns use the SAME reversible blend.
    // Only columns whose character changes are vertically scrolled.
    renderArchiveCounter(pair, blend);
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
