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
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Very light era-specific color temperatures, not eight competing backgrounds.
const ERA_AMBIENCE = [
  { surface: [255, 255, 255], halo: [231, 213, 172] }, // white star aperture → 1950
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
  let currentLabel = 0;

  const labelTextures = images.map((image, index) => {
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = width;
    labelCanvas.height = height;
    const context = labelCanvas.getContext('2d', { alpha: false });
    // Paint one complete UV texture: never composite an era over its predecessor.
    // The opaque base also clears any transparent pixels left by the prior label.
    const offset = (HISTORY_ERAS[index].uvShift || 0) * width;
    context.globalAlpha = 1;
    context.fillStyle = '#f4f3ee';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, offset, 0, width, height);
    if (offset < 0) context.drawImage(image, offset + width, 0, width, height);
    if (offset > 0) context.drawImage(image, offset - width, 0, width, height);
    const texture = new THREE.CanvasTexture(labelCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  });

  function setLabel(index) {
    if (index === currentLabel) return;
    label.material.map = labelTextures[index];
    currentLabel = index;
  }

  const labelTexture = labelTextures[0];

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 40);
  // View the standing can from slightly above to reveal the real lid.
  // Keep the camera nearly frontal so the printed labels are easy to read.
  camera.position.set(0.2, 0.72, 8.5);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));   // 11-07: lighter on laptops
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // Slightly brighter than Hero (1.15) to keep vintage label inks readable.
  renderer.toneMappingExposure = 1.28;
  // Upload once at initialization, never at the midpoint of a scroll rotation.
  labelTextures.forEach(texture => renderer.initTexture(texture));
  stage.querySelector('.history-3d-canvas').append(renderer.domElement);

  // Reuse the Hero can's four studio softboxes as a real PMREM environment.
  // Unlike simple directional lighting, these highlight strips glide across
  // the cylindrical metal and glossy printed label as the archive can rotates.
  const studio = new THREE.Scene();
  studio.background = new THREE.Color('#252c30');
  const softbox = (x, y, z, w, h, intensity) => {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color().setScalar(intensity),
        side: THREE.DoubleSide
      })
    );
    panel.position.set(x, y, z);
    panel.lookAt(0, 0, 0);
    studio.add(panel);
  };
  softbox(-4, 2, 4, 2, 8, 5);
  softbox(4, 1, 2, 1, 7, 3);
  softbox(0, 6, 0, 5, 4, 4);
  softbox(0, 0, -5, 4, 6, 1.5);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, 0.04);
  scene.environment = environment.texture;
  studio.traverse(object => {
    object.geometry?.dispose();
    object.material?.dispose();
  });
  pmrem.dispose();

  // Keep the illustrated archive cans legible under their pale era backdrops.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x527269, 1.35));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
  keyLight.position.set(-3, 6, 5);
  scene.add(keyLight);
  const edgeLight = new THREE.DirectionalLight(0xffffff, 0.7);
  edgeLight.position.set(4, -2, -4);
  scene.add(edgeLight);

  const carrier = new THREE.Group();
  // At 1440px and above, the can is 84% of its previous model scale.
  // Compact desktop sizes adapt slightly further to keep the side gutters clear.
  const baseCanScale = 0.7056 * 0.8;
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
    // Hero-style physically based print: soft metallic response + clear lacquer.
    new THREE.MeshPhysicalMaterial({
      map: labelTexture,
      metalness: 0.36,
      roughness: 0.36,
      clearcoat: 0.35,
      clearcoatRoughness: 0.25
    })
  );
  rolling.add(label);

  // Use Hero's brushed aluminum and a slightly darker pressed lid groove.
  const metal = new THREE.MeshStandardMaterial({
    color: 0xd4dade, metalness: 1, roughness: 0.23
  });
  const inset = new THREE.MeshStandardMaterial({
    color: 0xc6ced0, metalness: 0.9, roughness: 0.29
  });
  const groove = new THREE.MeshStandardMaterial({
    color: 0x79868c, metalness: 1, roughness: 0.32
  });
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
    // A narrow stamped concentric groove gives the lid an authentic edge
    // while retaining every year's original packaging geometry and position.
    const stampedSeam = new THREE.Mesh(
      new THREE.TorusGeometry(0.555, 0.009, 12, 96), groove
    );
    stampedSeam.rotation.x = Math.PI / 2;
    stampedSeam.position.y = sign * (rimCenter + 0.007);
    rolling.add(stampedSeam);
  }

  // A restrained ring on the visible end adds depth without altering either label.
  const pullRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.018, 8, 40), metal);
  pullRing.rotation.x = Math.PI / 2;
  pullRing.position.set(0, rimCenter + 0.014, 0.05);
  rolling.add(pullRing);

  let frustumHeight = 3.1;
  let lastRotation = NaN;
  function resize() {
    lastRotation = NaN;
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
    camera.clearViewOffset();
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
    // Keep the full-stage projection, but render only the pixels around the can.
    // The bounds enclose every Y rotation and leave room for the lid and AA.
    carrier.updateMatrixWorld(true);
    const corners = [];
    for (const x of [-.75, .75]) {
      for (const y of [-1.65, 1.65]) {
        for (const z of [-.75, .75]) {
          const point = new THREE.Vector3(x, y, z).applyMatrix4(carrier.matrixWorld).project(camera);
          corners.push([(point.x + 1) * viewportWidth / 2, (1 - point.y) * viewportHeight / 2]);
        }
      }
    }
    const xs = corners.map(point => point[0]);
    const ys = corners.map(point => point[1]);
    const left = Math.max(0, Math.floor(Math.min(...xs)) - 12);
    const top = Math.max(0, Math.floor(Math.min(...ys)) - 12);
    const width = Math.max(1, Math.min(Math.ceil(viewportWidth), Math.ceil(Math.max(...xs)) + 12) - left);
    const height = Math.max(1, Math.min(Math.ceil(viewportHeight), Math.ceil(Math.max(...ys)) + 12) - top);
    camera.setViewOffset(viewportWidth, viewportHeight, left, top, width, height);
    renderer.setSize(width, height, false);
    Object.assign(renderer.domElement.style, {
      position: 'absolute', left: left + 'px', top: top + 'px',
      width: width + 'px', height: height + 'px'
    });
  }

  function render(pair, local) {
    // Keep one 360-degree rotation per historical transition.
    // With the can upright, this is a horizontal spin around its vertical axis.
    // Rest at both ends and replace the art only while the rear faces us.
    const rotationFraction = reducedMotion.matches
      ? (local >= LABEL_SWITCH_POINT ? 1 : 0)
      : smoothstep(ROLL_START, ROLL_END, local);
    const labelIndex = Math.min(images.length - 1, pair + (local >= LABEL_SWITCH_POINT ? 1 : 0));
    const rotation = Math.PI + 0.28 + (pair + rotationFraction) * Math.PI * 2;
    if (rotation === lastRotation && labelIndex === currentLabel) return;
    setLabel(labelIndex);
    rolling.rotation.y = rotation;
    lastRotation = rotation;
    renderer.render(scene, camera);
  }

  // Star point projected from the first can label's actual 3D transform.
  // Front-facing texture is wrapped around -Z at the initial Y rotation.
  // The UV artwork's red star is near upper center of the 1950 can.
  function getStarPoint() {
    carrier.updateMatrixWorld(true);
    const bounds=renderer.domElement.getBoundingClientRect();
    // Measured on the existing 1774×887 artwork: u=.5, image y=.255.
    // CylinderGeometry maps u to theta and v to height; project its footprint too.
    const project=(u,v)=>{
      const point=new THREE.Vector3(Math.sin(u*Math.PI*2)*.684,(.5-v)*canLength,Math.cos(u*Math.PI*2)*.684);
      point.applyMatrix4(rolling.matrixWorld).project(camera);
      return {x:bounds.left+(point.x+1)*bounds.width*.5,y:bounds.top+(1-point.y)*bounds.height*.5};
    };
    const landmark=project(.5,.255);
    const top=project(.5,.128),bottom=project(.5,.384);
    const left=project(.431,.229),right=project(.569,.229);
    return {
      x:landmark.x,y:landmark.y,
      size:Math.max(12,Math.abs(bottom.y-top.y)/.805),
      width:Math.max(12,Math.abs(right.x-left.x)/.86)
    };
  }
  resize();
  return { render, resize, getStarPoint };
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
  let lastBlend = -1;

  function settle(index) {
    const year = years[index];
    year.split('').forEach((value, digitIndex) => {
      const item = digits[digitIndex];
      item.animation?.cancel();
      item.animation = null;
      item.reel.replaceChildren(makeGlyph(value));
      item.reel.style.filter = '';
      item.reel.style.transform = '';
    });
  }

  // Reels and captions share the can's scroll-derived handoff, including reverse.
  function setYear(pair, blend) {
    if (captionPair === pair && lastBlend === blend) return;
    lastBlend = blend;
    const selected = Math.min(years.length - 1, pair + (blend < .5 ? 0 : 1));

    // 11-07 — slot-machine year: on each switch, every changed digit whips
    // top → bottom through a few full turns of 0–9, then lands on the new year.
    if (reducedMotion.matches || currentIndex === -1) {
      if (currentIndex !== selected) settle(selected);
    } else if (currentIndex !== selected) {
      const from = years[currentIndex], to = years[selected];
      const down = selected > currentIndex;
      digits.forEach((item, i) => {
        item.animation?.cancel(); item.animation = null;
        if (from[i] === to[i]) { item.reel.replaceChildren(makeGlyph(to[i])); item.reel.style.transform = ''; return; }
        const turns = 2 + (digits.length - 1 - i) * .5;            // right-hand digits spin a little longer
        const count = Math.round(10 * turns);
        const a = +from[i], seq = [];
        // Reel reads top → bottom: new … filler … old. Sliding it down makes the
        // numbers fall from above; scrolling back up reverses the direction.
        for (let k = 1; k <= count; k++) seq.push(String((a + (down ? k : -k) + 100) % 10));
        seq[seq.length - 1] = to[i];
        const glyphs = [from[i], ...seq].reverse().map(makeGlyph);
        item.reel.replaceChildren(...glyphs);
        const h = 1.3, end = 0, start = -(glyphs.length - 1) * h;
        const frames = down
          ? [{ transform: 'translateY(' + start + 'em)', filter: 'blur(0px)' }, { transform: 'translateY(' + (start * .25) + 'em)', filter: 'blur(1.6px)', offset: .55 }, { transform: 'translateY(' + end + 'em)', filter: 'blur(0px)' }]
          : [{ transform: 'translateY(' + end + 'em)', filter: 'blur(0px)' }, { transform: 'translateY(' + (start * .75) + 'em)', filter: 'blur(1.6px)', offset: .55 }, { transform: 'translateY(' + start + 'em)', filter: 'blur(0px)' }];
        if (!down) item.reel.replaceChildren(...glyphs.reverse());
        item.reel.style.transform = '';
        item.animation = item.reel.animate(frames, {
          duration: 640 + i * 70, easing: 'cubic-bezier(.18,.7,.24,1.06)', fill: 'forwards'
        });
      });
    }
    if(currentIndex !== selected) screenReaderYear.textContent = years[selected];
    currentIndex = selected;

    if (captionPair !== pair) {
      copyCurrent.textContent = labels[pair];
      copyNext.textContent = labels[pair + 1];
      captionPair = pair;
    }
    copyCurrent.style.opacity = (1 - blend).toFixed(3);
    copyNext.style.opacity = blend.toFixed(3);
  }

  reducedMotion.addEventListener('change', () => {
    if (currentIndex >= 0) settle(currentIndex);
    captionPair = -1;
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

  // Expose only a read-only screen-space landmark for the star handoff.
  window.__chilsungHistoryStarAnchor = () => can?.getStarPoint() || null;
  window.dispatchEvent(new Event('chilsung:history-star-ready'));

  let progress = 0;
  let fallbackYear = '';
  let lastSurface = '', lastHalo = '';
  function render(value) {
    progress = clamp(value);
    const point = progress * (eras.length - 1);   // 11-07: driven by the era bar, not scroll
    const pair = Math.min(eras.length - 2, Math.floor(point));
    const local = point - pair;
    // Hold → roll → hold, with exactly one texture/year switch at 180°.
    // All values are functions of scroll progress: reverse scroll stays in sync.
    const digitBlend = reducedMotion.matches ? (local >= LABEL_SWITCH_POINT ? 1 : 0) : smoothstep(0.43, 0.57, local);
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
    const surfaceColor = `rgb(${surface.join(',')})`;
    const haloColor = `rgba(${halo.join(',')},0.2)`;
    if(surfaceColor !== lastSurface){historyRoot.style.setProperty('--history-surface', surfaceColor);lastSurface=surfaceColor;}
    if(haloColor !== lastHalo){historyRoot.style.setProperty('--history-halo', haloColor);lastHalo=haloColor;}
    if (!can && fallbackImage && fallbackYear !== years[activeIndex]) {
      fallbackImage.src = assetURL(HISTORY_ERAS[activeIndex].fallback);
      fallbackImage.classList.toggle('is-horizontal', !!HISTORY_ERAS[activeIndex].horizontalFallback);
      fallbackYear = years[activeIndex];
    }
    can?.render(pair, local);
  }

  // 11-07 — era bar: the user drags along a timeline at the bottom instead of
  // scrolling through ~5 screens. A damped follow keeps the can rolling smoothly;
  // releasing settles on the nearest era so the can never rests mid-turn.
  const bar = document.createElement('div');
  bar.className = 'history-era-bar';
  bar.setAttribute('role', 'slider');
  bar.setAttribute('tabindex', '0');
  bar.setAttribute('aria-label', '연도 선택');
  bar.setAttribute('aria-valuemin', years[0]);
  bar.setAttribute('aria-valuemax', years.at(-1));
  bar.innerHTML = '<div class="history-era-bar__rail"><span class="history-era-bar__fill"></span>'
    + years.map((y, i) => '<button type="button" tabindex="-1" class="history-era-bar__tick" data-era="' + i + '" style="left:'
      + (i / (years.length - 1) * 100) + '%"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 1.6l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.7l-6.4 3.5L7 14.1 1.7 9.1l7.2-.9z\"/></svg><span>' + y + '</span></button>').join('')
    + '<span class="history-era-bar__trail"></span><span class="history-era-bar__thumb"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.7l-6.4 3.5L7 14.1 1.7 9.1l7.2-.9z"/></svg></span></div>';
  stage.append(bar);
  const rail = bar.querySelector('.history-era-bar__rail');
  const fill = bar.querySelector('.history-era-bar__fill');
  const thumb = bar.querySelector('.history-era-bar__thumb');
  const trail = bar.querySelector('.history-era-bar__trail');
  // Soft glowing star comet behind the thumb while it travels between eras.
  let trailAt = -1;
  function dropTrail(v, dir) {
    trailAt = v;
    const sp = document.createElement('i');
    sp.className = 'history-era-bar__spark';
    const size = 9 + Math.random() * 8;
    sp.style.cssText = 'left:' + (v * 100).toFixed(3) + '%;width:' + size.toFixed(1) + 'px;height:' + size.toFixed(1)
      + 'px;--dy:' + ((Math.random() - .5) * 26).toFixed(1) + 'px;--dx:' + (-dir * (6 + Math.random() * 10)).toFixed(1)
      + 'px;--r:' + (Math.random() * 70 - 35).toFixed(0) + 'deg';
    sp.innerHTML = '<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 1.6l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.7l-6.4 3.5L7 14.1 1.7 9.1l7.2-.9z\"/></svg>';
    trail.append(sp);
    sp.addEventListener('animationend', () => sp.remove(), { once: true });
    while (trail.childElementCount > 40) trail.firstChild.remove();
  }
  const ticks = [...bar.querySelectorAll('.history-era-bar__tick')];
  const last = years.length - 1;
  let target = 0, shown = 0, dragging = false, raf = 0, prev = 0, autoEnd = false, lastActive = -1;
  const snap = v => Math.round(clamp(v) * last) / last;
  function paintBar(v) {
    const pct = (v * 100).toFixed(3) + '%';
    fill.style.width = pct;
    thumb.style.left = pct;
    const active = Math.round(v * last);
    if (active !== lastActive) {
      lastActive = active;
      ticks.forEach((t, i) => { t.classList.toggle('is-active', i === active); t.classList.toggle('is-past', i < active); });
      bar.setAttribute('aria-valuenow', years[active]);
      bar.setAttribute('aria-valuetext', years[active] + '년');
    }
  }
  function tick(now) {
    const dt = Math.min(.05, (now - (prev || now)) / 1000); prev = now;
    // 샤샤샥: each era change is a quick whip-spin on a clock (≈0.3s per
    // era, faster across several eras), then the can and year stop dead.
    const d = target - shown, dist = Math.abs(d) * last;
    // The can's own hold→roll→hold (smoothstep .2–.8 per era) supplies the ease.
    const rate = Math.min(dragging ? 16 : 12, 4.6 + dist * 2.2) / last;   // eras/sec → progress/sec
    const step = Math.min(Math.abs(d), rate * dt);
    shown += Math.sign(d) * step;
    if (step > 0 && !reducedMotion.matches) {
      // Fill the whole stretch covered this frame, so slow frames still leave a comet.
      const dir = Math.sign(d), from = trailAt < 0 ? shown - dir * step : trailAt;
      for (let v = from + dir * .011; dir > 0 ? v <= shown : v >= shown; v += dir * .011) dropTrail(v, dir);
    }
    if (Math.abs(target - shown) < .0006) shown = target;
    render(shown); paintBar(shown);
    raf = shown !== target ? requestAnimationFrame(tick) : 0;
    if (!raf) trailAt = -1;
    if (!raf) prev = 0;
  }
  function goTo(v) { target = clamp(v); if (!raf) raf = requestAnimationFrame(tick); }
  // Scroll steps through the eras: each equal slice of the section is one
  // year, so crossing a slice fires the next whip-spin.
  let scrollEra = -1;
  function fromScroll() {
    const r = section.getBoundingClientRect();
    const p = clamp(-r.top / Math.max(1, r.height - innerHeight));
    const era = Math.min(last, Math.floor(p * years.length));
    if (era !== scrollEra) { scrollEra = era; if (!dragging) goTo(era / last); }
  }
  const valueAt = x => { const r = rail.getBoundingClientRect(); return clamp((x - r.left) / Math.max(1, r.width)); };
  bar.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    dragging = true; autoEnd = false;
    bar.setPointerCapture(e.pointerId); bar.classList.add('is-dragging');
    goTo(valueAt(e.clientX)); e.preventDefault();
  });
  bar.addEventListener('pointermove', e => { if (dragging) goTo(valueAt(e.clientX)); });
  const release = () => { if (!dragging) return; dragging = false; bar.classList.remove('is-dragging'); goTo(snap(target)); };
  bar.addEventListener('pointerup', release);
  bar.addEventListener('pointercancel', release);
  bar.addEventListener('keydown', e => {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (e.key === 'Home') goTo(0); else if (e.key === 'End') goTo(1);
    else if (step) goTo(snap(target + step / last)); else return;
    e.preventDefault();
  });
  // Leaving toward RICH: glide to 2024 so the 2024 → 2026 year handoff still lines up.
  const toEnd = () => {
    fromScroll();
    const r = section.getBoundingClientRect();
    if (r.bottom < innerHeight * .75 && !autoEnd && !dragging) { autoEnd = true; goTo(1); }
    else if (r.bottom >= innerHeight * .75) autoEnd = false;
    // RICH's transparent sticky viewport overlaps this screen: let the bar
    // receive the cursor until RICH actually takes over.
    const live = r.top < innerHeight && r.bottom > innerHeight * .75 && !section.classList.contains('rich-year-handoff');
    document.documentElement.classList.toggle('history-bar-live', live);
  };
  addEventListener('scroll', toEnd, { passive: true });
  toEnd();
  paintBar(0);

  const observer = new ResizeObserver(() => { can?.resize(); render(progress); });
  observer.observe(stage);
  reducedMotion.addEventListener('change', () => render(progress));
  render(progress);
}

document.querySelectorAll('.history-3d').forEach(section => { initHistory(section); });
