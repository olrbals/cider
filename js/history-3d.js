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

// Halfway through one 360-degree turn the rear of the can faces the viewer.
// Switch the opaque label exactly then; never crossfade two artworks.
const LABEL_SWITCH_POINT = 0.5;
const ROLL_START = 0.2;
const ROLL_END = 0.8;

// Very light era-specific color temperatures, not eight competing backgrounds.
const ERA_AMBIENCE = [
  { surface: [249, 248, 243], halo: [231, 213, 172] }, // 1950 · vintage cream
  { surface: [246, 249, 246], halo: [196, 224, 203] }, // 1960
  { surface: [244, 249, 244], halo: [178, 221, 186] }, // 1970
  { surface: [247, 250, 243], halo: [211, 230, 169] }, // 1987
  { surface: [245, 250, 246], halo: [185, 218, 191] }, // 1994
  { surface: [245, 250, 248], halo: [175, 221, 205] }, // 2000
  { surface: [241, 250, 247], halo: [163, 223, 203] }, // 2014
  { surface: [238, 250, 246], halo: [145, 225, 195] }  // 2024
];

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
  let currentLabel = 0;

  function paintLabel(index) {
    // Paint one complete UV texture: never composite an era over its predecessor.
    // The opaque base also clears any transparent pixels left by the prior label.
    const offset = (HISTORY_ERAS[index].uvShift || 0) * width;
    context.globalAlpha = 1;
    context.fillStyle = '#f4f3ee';
    context.fillRect(0, 0, width, height);
    context.drawImage(images[index], offset, 0, width, height);
    if (offset < 0) context.drawImage(images[index], offset + width, 0, width, height);
    if (offset > 0) context.drawImage(images[index], offset - width, 0, width, height);
  }

  function setLabel(index) {
    if (index === currentLabel) return;
    paintLabel(index);
    currentLabel = index;
    labelTexture.needsUpdate = true;
  }

  paintLabel(0);
  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  labelTexture.colorSpace = THREE.SRGBColorSpace;
  labelTexture.anisotropy = 4;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 40);
  // View the standing can from slightly above to reveal the real lid.
  // Keep the camera nearly frontal so the printed labels are easy to read.
  camera.position.set(0.2, 0.72, 8.5);
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
  // At 1440px and above, the can is 84% of its previous model scale.
  // Compact desktop sizes adapt slightly further to keep the side gutters clear.
  const baseCanScale = 0.7056;
  carrier.scale.setScalar(baseCanScale);
  // The CylinderGeometry is built along local Y. Leave that axis upright:
  // rolling.rotation.y now spins the standing can side-to-side on scroll.
  carrier.rotation.z = 0;
  scene.add(carrier);
  carrier.position.set(0, 0, 0); // Responsive right-column placement is set in resize().
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
  function resize() {
    const bounds = stage.getBoundingClientRect();
    const viewportWidth = Math.max(1, bounds.width);
    const viewportHeight = Math.max(1, bounds.height);
    const aspect = viewportWidth / viewportHeight;
    // An upright can is narrower than the old horizontal model. On phones,
    // reserve enough vertical room for the headline above and timeline below.
    frustumHeight = viewportWidth <= 760
      ? Math.max(4.4, 2.3 / aspect)
      : Math.max(3.1, 3.85 / aspect);
    camera.left = -frustumHeight * aspect / 2;
    camera.right = frustumHeight * aspect / 2;
    camera.top = frustumHeight / 2;
    camera.bottom = -frustumHeight / 2;
    camera.updateProjectionMatrix();
    // Figma-inspired two-column history: both elements stay within the
    // desktop 200px side gutters at a 1440px viewport.
    const desktopFit = Math.min(1, viewportWidth / 1440);
    if (viewportWidth <= 760) {
      // Mobile: keep the standing can centered below the stacked copy,
      // without shrinking it twice as the viewport aspect gets narrower.
      carrier.scale.setScalar(baseCanScale);
      carrier.position.set(0, -frustumHeight * 0.14, 0);
    } else {
      const gutter = Math.min(200, viewportWidth * (200 / 1440));
      const contentWidth = viewportWidth - gutter * 2;
      // The standing can is slimmer: use its *radius* for horizontal fitting
      // (the old calculation used its horizontal half-length).
      const canCenterPx = gutter + contentWidth * 0.69;
      const worldPerPixel = (camera.right - camera.left) / viewportWidth;
      const halfCanPx = 0.74 * baseCanScale * desktopFit / worldPerPixel;
      const gutterFit = Math.min(1, (viewportWidth - gutter - canCenterPx) / halfCanPx);
      carrier.scale.setScalar(baseCanScale * desktopFit * gutterFit);
      carrier.position.set((canCenterPx - viewportWidth / 2) * worldPerPixel, 0, 0);
    }
    renderer.setSize(viewportWidth, viewportHeight, false);
  }

  function render(pair, local) {
    // Keep one 360-degree rotation per historical transition.
    // With the can upright, this is a horizontal spin around its vertical axis.
    // Rest at both ends and replace the art only while the rear faces us.
    const rotationFraction = smoothstep(ROLL_START, ROLL_END, local);
    const labelIndex = Math.min(images.length - 1, pair + (local >= LABEL_SWITCH_POINT ? 1 : 0));
    setLabel(labelIndex);
    rolling.rotation.y = Math.PI + 0.28 + (pair + rotationFraction) * Math.PI * 2;
    renderer.render(scene, camera);
  }

  resize();
  return { render, resize };
}

// A single pinned four-column counter. Every column keeps its position;
// only a digit that changes between adjacent years gets a vertical reel.
function createArchiveCounter(stage, years) {
  const labels = [
    '국산 사이다의 시작',
    '사이다 한 병의 행복',
    '일상을 식힌 청량함',
    '레몬라임향의 시작',
    '자연을 담은 디자인',
    '50주년 라벨 리뉴얼',
    '맑고 깨끗한 역사',
    '큰 별로 새롭게'
  ];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const overlay = document.createElement('div');
  overlay.className = 'history-3d-overlay';
  const caption = document.createElement('div');
  caption.className = 'history-3d-caption';
  const copyWindow = document.createElement('div');
  copyWindow.className = 'history-3d-caption-window';
  const copyCurrent = document.createElement('span');
  const copyNext = document.createElement('span');
  copyCurrent.className = 'history-3d-caption-copy';
  copyNext.className = 'history-3d-caption-copy';
  copyWindow.append(copyCurrent, copyNext);
  caption.append(copyWindow);

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
  // One aligned editorial group: the year is centered under its caption.
  const infoGroup = document.createElement('div');
  infoGroup.className = 'history-3d-info';
  infoGroup.append(caption, yearWindow);
  overlay.append(infoGroup, screenReaderYear);
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

// Eight passive progress markers keep the period legible without competing
// with the animated typography or interfering with the page's scroll.
function createArchiveTimeline(stage, years) {
  const timeline = document.createElement('div');
  timeline.className = 'history-3d-timeline';
  timeline.setAttribute('aria-hidden', 'true');
  const rail = document.createElement('div');
  rail.className = 'history-3d-timeline-rail';
  const fill = document.createElement('div');
  fill.className = 'history-3d-timeline-fill';
  rail.append(fill);
  const row = document.createElement('div');
  row.className = 'history-3d-timeline-years';
  const markers = years.map(year => {
    const marker = document.createElement('span');
    marker.className = 'history-3d-timeline-item';
    const dot = document.createElement('span');
    dot.className = 'history-3d-timeline-dot';
    const label = document.createElement('span');
    label.className = 'history-3d-timeline-label';
    label.textContent = year;
    marker.append(dot, label);
    row.append(marker);
    return marker;
  });
  timeline.append(rail, row);
  stage.append(timeline);
  let previous = -1;
  return (progress, activeIndex) => {
    fill.style.transform = `scaleX(${progress.toFixed(4)})`;
    if (activeIndex === previous) return;
    markers.forEach((marker, index) => {
      marker.classList.toggle('is-active', index === activeIndex);
      marker.classList.toggle('is-past', index < activeIndex);
    });
    previous = activeIndex;
  };
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
    // The extended scroll panels share one pinned year/caption overlay.
    track.append(era);
    return era;
  });
  const years = eras.map(era => era.dataset.year);
  const renderArchiveCounter = createArchiveCounter(stage, years);
  const renderTimeline = createArchiveTimeline(stage, years);
  const historyRoot = section.closest('.history') || section;
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
    // Hold → roll → hold, with exactly one texture/year switch at 180°.
    // All values are functions of scroll progress: reverse scroll stays in sync.
    const digitBlend = smoothstep(0.43, 0.57, local);
    renderArchiveCounter(pair, digitBlend);
    section.dataset.progress = progress.toFixed(3);
    const activeIndex = Math.min(eras.length - 1, pair + (local >= LABEL_SWITCH_POINT ? 1 : 0));
    section.dataset.activeYear = years[activeIndex];
    renderTimeline(progress, activeIndex);

    // Interpolate the quiet background through the same transition, instead
    // of jumping between independent sections or adding distracting graphics.
    const from = ERA_AMBIENCE[pair];
    const to = ERA_AMBIENCE[pair + 1];
    const mix = smoothstep(ROLL_START, ROLL_END, local);
    const mixChannel = (a, b) => Math.round(a + (b - a) * mix);
    const surface = from.surface.map((value, index) => mixChannel(value, to.surface[index]));
    const halo = from.halo.map((value, index) => mixChannel(value, to.halo[index]));
    historyRoot.style.setProperty('--history-surface', `rgb(${surface.join(',')})`);
    historyRoot.style.setProperty('--history-halo', `rgba(${halo.join(',')},0.2)`);
    if (fallbackImage && fallbackYear !== years[activeIndex]) {
      fallbackImage.src = assetURL(HISTORY_ERAS[activeIndex].fallback);
      fallbackImage.classList.toggle('is-horizontal', !!HISTORY_ERAS[activeIndex].horizontalFallback);
      fallbackYear = years[activeIndex];
    }
    can?.render(pair, local);
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
