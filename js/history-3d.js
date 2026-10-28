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
  carrier.position.set(0, 0, 0); // Responsive centered placement is set in resize().
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
    // reserve enough vertical room for the headline and upright can.
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
      // Keep the upright can horizontally centered; only its position changes.
      const canCenterPx = viewportWidth / 2;
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
    return { reel, animation: null };
  });
  const screenReaderYear = document.createElement('span');
  screenReaderYear.className = 'visually-hidden';
  screenReaderYear.textContent = years[0];
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
  let currentIndex = -1;
  let captionPair = -1;

  function settle(index) {
    const year = years[index];
    year.split('').forEach((value, digitIndex) => {
      const item = digits[digitIndex];
      item.animation?.cancel();
      item.animation = null;
      item.reel.replaceChildren(makeGlyph(value));
      item.reel.style.filter = '';
    });
  }

  // Each transition spins all four physical reels forward or backward.
  // Twenty full digit steps + up to nine aligning steps = 2–3 revolutions,
  // then an exact landing on the destination year, once per year change.
  function spin(fromIndex, toIndex) {
    const from = years[fromIndex];
    const to = years[toIndex];
    const direction = toIndex >= fromIndex ? 1 : -1;
    digits.forEach((item, index) => {
      item.animation?.cancel();
      item.animation = null;
      // Unchanged places stay perfectly still (e.g. 1950 → 1960 spins only 5 → 6).
      // Also clear any reel left mid-animation by a rapid reverse scroll.
      if (from[index] === to[index]) {
        item.reel.replaceChildren(makeGlyph(to[index]));
        item.reel.style.filter = '';
        return;
      }
      const startDigit = Number(from[index]);
      const endDigit = Number(to[index]);
      const remainder = direction > 0
        ? (endDigit - startDigit + 10) % 10
        : (startDigit - endDigit + 10) % 10;
      const steps = 20 + remainder;
      const frames = [makeGlyph(String(startDigit))];
      for (let step = 1; step <= steps; step++) {
        frames.push(makeGlyph(String((startDigit + direction * step + 1000) % 10)));
      }
      item.reel.replaceChildren(...frames);
      item.reel.style.filter = 'blur(.7px)';
      const animation = item.reel.animate([
        { transform: 'translate3d(0,0,0)' },
        { transform: 'translate3d(0,-' + (100 * steps / (steps + 1)).toFixed(5) + '%,0)' }
      ], {
        duration: 450 + index * 27,
        delay: index * 16,
        easing: 'cubic-bezier(.17,.82,.24,1)',
        fill: 'forwards'
      });
      item.animation = animation;
      animation.onfinish = () => {
        if (item.animation !== animation) return;
        item.reel.replaceChildren(makeGlyph(to[index]));
        animation.cancel();
        item.animation = null;
        item.reel.style.filter = '';
      };
    });
  }

  function setYear(pair, blend) {
    const selected = Math.min(years.length - 1, pair + (blend < .5 ? 0 : 1));

    if (currentIndex === -1) {
      settle(selected);
    } else if (selected !== currentIndex) {
      if (reducedMotion.matches || !digits[0].reel.animate) settle(selected);
      else spin(currentIndex, selected);
    }
    currentIndex = selected;

    if (captionPair !== pair) {
      copyCurrent.textContent = labels[pair];
      copyNext.textContent = labels[pair + 1];
      captionPair = pair;
    }
    copyCurrent.style.opacity = (1 - blend).toFixed(3);
    copyNext.style.opacity = blend.toFixed(3);
    screenReaderYear.textContent = years[selected];
  }

  reducedMotion.addEventListener('change', () => {
    if (currentIndex >= 0) settle(currentIndex);
  });
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
    // The extended scroll panels share one pinned year/caption overlay.
    track.append(era);
    return era;
  });
  const years = eras.map(era => era.dataset.year);
  const renderArchiveCounter = createArchiveCounter(stage, years);
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
