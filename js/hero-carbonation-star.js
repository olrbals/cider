/* Scroll-driven carbonation in the existing 1440 × 900 hero layout. */
(() => {
  'use strict';
  const hero = document.querySelector('#top.hero');
  const image = hero?.querySelector('.hero-carbonation-star img');
  const canvas = hero?.querySelector('.hero-carbonation-bubbles');
  const stage = hero?.querySelector('.hero-splash-stage');
  if (!image || !canvas || !stage) return;

  const context = canvas.getContext('2d');
  const nextSection = document.querySelector('#brand-values');
  const header = document.querySelector('.site-header');
  const wipe = document.createElement('canvas');
  const wipeContext = nextSection && wipe.getContext('2d');
  let wipeWidth = 1;
  let wipeHeight = 1;
  let bubbleSprites;
  let foamPattern;
  let rising = [];
  if (wipeContext) {
    wipe.className = 'hero-carbonation-wipe';
    wipe.hidden = true;
    wipe.setAttribute('aria-hidden', 'true');
    document.body.append(wipe);
    hero.classList.add('has-carbonation-wipe');
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.max(0, Math.min(1, value));
  const phase = (progress, start, end) => clamp((progress - start) / (end - start));
  const smooth = (progress, start, end) => {
    const t = phase(progress, start, end);
    return t * t * (3 - 2 * t);
  };
  const originX = 719.5;
  const originY = 593.5;
  const burstStart = .32;
  const burstEnd = .49;
  const dissolveStart = .70;
  const wipeDistance = .28;
  let frame = 0;
  let lastProgress;
  let lastTransition;
  const headerSurfaces = [...document.querySelectorAll('main > section')];
  let particles = [];

  // Find connected bubbles in the PNG once, then reuse their original pixels
  // as sprites. The still image remains the reference at the peak of the burst.
  function collectBubbles() {
    if (!context) return [];
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    const sampler = document.createElement('canvas');
    sampler.width = width;
    sampler.height = height;
    const reader = sampler.getContext('2d', { willReadFrequently: true });
    reader.drawImage(image, 0, 0);
    const rgba = reader.getImageData(0, 0, width, height).data;
    const visited = new Uint8Array(width * height);
    const queue = new Int32Array(width * height);
    const slot = getComputedStyle(image.parentElement);
    const slotWidth = parseFloat(slot.width);
    const slotHeight = parseFloat(slot.height);
    const fit = Math.min(slotWidth / width, slotHeight / height);
    const left = parseFloat(slot.left) + (slotWidth - width * fit) / 2;
    const top = parseFloat(slot.top) + (slotHeight - height * fit) / 2;
    const bubbles = [];
    let seed = 518;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let pixel = 0; pixel < visited.length; pixel++) {
      if (visited[pixel] || rgba[pixel * 4 + 3] < 20) continue;
      let count = 1;
      queue[0] = pixel;
      visited[pixel] = 1;
      let minX = width, minY = height, maxX = 0, maxY = 0;
      for (let i = 0; i < count; i++) {
        const index = queue[i];
        const x = index % width;
        const y = Math.floor(index / width);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
            const next = index + dy * width + dx;
            if (visited[next] || rgba[next * 4 + 3] < 20) continue;
            visited[next] = 1;
            queue[count++] = next;
          }
        }
      }
      const sw = maxX - minX + 1;
      const sh = maxY - minY + 1;
      if (count < 4 || sw > 32 || sh > 32) continue;
      bubbles.push({
        sx: minX, sy: minY, sw, sh,
        x: left + (minX + sw / 2) * fit,
        y: top + (minY + sh / 2) * fit,
        width: sw * fit, height: sh * fit,
        delay: random(), drift: random() * 2 - 1,
        lift: 100 + random() * 310, wave: random() * Math.PI * 2
      });
    }
    for (let i = bubbles.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [bubbles[i], bubbles[j]] = [bubbles[j], bubbles[i]];
    }
    return bubbles.slice(0, 520);
  }

  function drawBubbles(progress) {
    const active = Boolean(context && particles.length && progress > burstStart && progress < 1.12
      && (progress < burstEnd || progress > dissolveStart));
    canvas.hidden = !active;
    if (!active) return;

    context.clearRect(0, 0, 1440, 900);
    const limit = innerWidth <= 600 ? 150 : particles.length;
    for (let i = 0; i < Math.min(limit, particles.length); i++) {
      const bubble = particles[i];
      let x, y, alpha, scale;
      if (progress < burstEnd) {
        const t = phase(progress, burstStart + bubble.delay * .018, .415 + bubble.delay * .023);
        const spread = 1 - (1 - t) ** 4;
        x = originX + (bubble.x - originX) * spread;
        y = originY + (bubble.y - originY) * spread;
        alpha = smooth(t, 0, .13) * (1 - smooth(progress, .405, burstEnd));
        scale = .8 + .8 * spread;
      } else {
        const start = dissolveStart + bubble.delay * .09;
        const t = phase(progress, start, 1.02 + bubble.delay * .10);
        x = bubble.x + bubble.drift * 66 * t
          + Math.sin(bubble.wave + t * 9) * 13 * t;
        y = bubble.y - bubble.lift * t;
        alpha = smooth(progress, dissolveStart, .81) * (1 - smooth(t, .25, 1));
        scale = 1 - .2 * t;
      }
      if (alpha <= 0) continue;
      const width = bubble.width * scale;
      const height = bubble.height * scale;
      context.globalAlpha = alpha;
      context.drawImage(image, bubble.sx, bubble.sy, bubble.sw, bubble.sh,
        x - width / 2, y - height / 2, width, height);
    }
    context.globalAlpha = 1;
  }

  function prepareWipe() {
    wipeWidth = Math.max(1, document.documentElement.clientWidth);
    wipeHeight = Math.max(1, innerHeight);
    const compact = wipeWidth <= 600;
    const ratio = Math.min(devicePixelRatio || 1, compact ? .9 : 1);
    wipe.width = Math.max(1, Math.round(wipeWidth * ratio));
    wipe.height = Math.max(1, Math.round(wipeHeight * ratio));
    wipeContext.setTransform(wipe.width / wipeWidth, 0, 0, wipe.height / wipeHeight, 0, 0);
    if (!bubbleSprites) {
      bubbleSprites = [.47, .62, .70].map((strength, depth) => {
        const texture = document.createElement('canvas');
        texture.width = texture.height = 96;
        const sprite = texture.getContext('2d');
        const rim = sprite.createRadialGradient(44, 43, 18, 48, 48, 43);
        rim.addColorStop(0, depth === 0 ? 'rgba(210,247,232,.64)' : 'rgba(255,255,255,0)');
        rim.addColorStop(.48, depth === 0 ? 'rgba(234,255,247,.54)' : 'rgba(255,255,255,.02)');
        rim.addColorStop(.67, 'rgba(242,255,251,.16)');
        rim.addColorStop(.83, 'rgba(32,132,103,' + strength + ')');
        rim.addColorStop(.94, 'rgba(207,251,235,.38)');
        rim.addColorStop(1, 'rgba(236,255,248,0)');
        sprite.fillStyle = rim;
        sprite.fillRect(0, 0, 96, 96);
        sprite.strokeStyle = 'rgba(255,255,255,.94)';
        sprite.lineWidth = depth === 2 ? 3 : 4;
        if (depth === 2) sprite.filter = 'blur(1.1px)';
        sprite.beginPath();
        sprite.arc(47, 47, 33, 3.62, 4.94);
        sprite.stroke();
        return texture;
      });
    }

    let seed = 1049;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const lanes = compact ? 20 : 40;
    const layers = compact
      ? [[160, 3, 10, .85], [110, 7, 22, 1.12], [12, 18, 36, 1.45]]
      : [[390, 3, 11, .85], [230, 8, 25, 1.12], [24, 20, 43, 1.45]];
    rising = layers.flatMap(([count, minSize, maxSize, speed], depth) =>
      Array.from({ length: count }, (_, index) => ({
        x: ((index % lanes) + random()) / lanes,
        start: random() * .72,
        size: minSize + random() ** 1.6 * (maxSize - minSize),
        speed: speed + random() * .6,
        sway: random() * Math.PI * 2,
        drift: 3 + depth * 5 + random() * 7,
        alpha: .38 + random() * .54,
        sprite: bubbleSprites[depth]
      })));

    // A light repeating texture supplies depth, not an opaque field of noise.
    // The liquid fog below supplies immersion; individual rings remain legible.
    const tile = document.createElement('canvas');
    const span = compact ? 260 : 384;
    tile.width = tile.height = span;
    const foam = tile.getContext('2d');
    for (let i = 0; i < (compact ? 680 : 1550); i++) {
      const x = random() * span;
      const y = random() * span;
      const size = 3 + random() ** 1.5 * 13;
      foam.globalAlpha = .35 + random() * .4;
      const half = size / 2;
      const offsetsX = x < half ? [0, span] : x > span - half ? [0, -span] : [0];
      const offsetsY = y < half ? [0, span] : y > span - half ? [0, -span] : [0];
      for (const dy of offsetsY) {
        for (const dx of offsetsX) {
          foam.drawImage(bubbleSprites[0], x + dx - size / 2, y + dy - size / 2, size, size);
        }
      }
    }
    foamPattern = wipeContext.createPattern(tile, 'repeat');
  }

  function drawWipe(progress, active) {
    if (!wipeContext) return;
    if (wipe.hidden === active) wipe.hidden = !active;
    if (!active) return;

    const width = wipeWidth;
    const height = wipeHeight;
    // A short upward curtain: fill with sparkling soda, then uncover PURE.
    // Every position is derived from scroll so pausing cannot run a hidden loop.
    const approach = smooth(progress, .06, .46);
    const exit = smooth(progress, .57, .975);
    const front = height * (1.10 - approach * 1.29);
    const back = height * (1.14 - exit * 1.34);
    const flow = progress * 2.6;
    const ctx = wipeContext;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    // The transparent mint wash gives the impression of being inside soda.
    // Its soft edge follows the bubble curtain; no flat white flash.
    const water = ctx.createLinearGradient(0, 0, 0, height);
    water.addColorStop(0, 'rgba(223,255,241,.92)');
    water.addColorStop(.55, 'rgba(169,239,210,.95)');
    water.addColorStop(1, 'rgba(110,210,168,.96)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = water;
    ctx.fillRect(0, 0, width, height);
    if (foamPattern) {
      const zoom = .82 + approach * .18;
      foamPattern.setTransform(new DOMMatrix().translate(-width * (zoom - 1) / 2,
        -flow * height * .13).scale(zoom));
      ctx.globalAlpha = .32 + approach * .18;
      ctx.fillStyle = foamPattern;
      ctx.fillRect(0, 0, width, height);
    }

    for (const bubble of rising) {
      const age = flow - bubble.start;
      if (age <= 0) continue;
      const rise = (age * bubble.speed) % 1.28;
      const y = height * (1.08 - rise);
      const size = bubble.size * (.50 + approach * .72);
      if (y < front - size || y > Math.min(height, back + height * .12) + size) continue;
      const x = bubble.x * width + Math.sin(age * 5 + bubble.sway) * bubble.drift;
      ctx.globalAlpha = bubble.alpha * smooth(age, 0, .12) * smooth(rise, 0, .13);
      ctx.drawImage(bubble.sprite, x - size / 2, y - size / 2, size, size);
    }
    ctx.restore();

    // Mask particle density at both edges; no painted liquid boundary.
    function feather(start, end, entering) {
      const edge = ctx.createLinearGradient(0, start, 0, end);
      edge.addColorStop(0, entering ? 'transparent' : '#fff');
      edge.addColorStop(1, entering ? '#fff' : 'transparent');
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = edge;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (approach < 1) feather(front - height * .12, front + height * .16, true);
    if (exit > 0) feather(back - height * .12, back + height * .12, false);
  }

  function render(now) {
    frame = 0;
    const bounds = hero.getBoundingClientRect();
    const stageHeight = stage.offsetHeight || innerHeight;
    // Read the native section boundary. Once PURE reaches the top, every
    // later position clamps to one and the frame loop stays shut down.
    const boundary = nextSection ? nextSection.getBoundingClientRect().top / stageHeight : 0;
    const transition = reduced.matches ? 0 : phase(wipeDistance - boundary, 0, wipeDistance);
    // Keep the requested fixed header visible. Switch navigation contrast as
    // light/dark sections pass behind it, including the carbonation handoff.
    if (header) {
      if (header.hidden) header.hidden = false;
      const sampleY = Math.min(64, Math.max(30, innerHeight * .085));
      let onLight = false;
      for (const section of headerSurfaces) {
        const box = section.getBoundingClientRect();
        if (box.top <= sampleY && box.bottom > sampleY) {
          onLight = !['top', 'footer', 'rich-flavors'].includes(section.id);
        }
      }
      if (boundary > 0 && transition > 0) onLight = transition >= .54;
      header.classList.toggle('is-on-light', onLight);
    }
    const wipeActive = Boolean(wipeContext && boundary > .002 && transition > .06 && transition < .997);
    if (wipeActive) {
      drawWipe(transition, true);
    } else {
      drawWipe(transition, false);
    }
    if (transition !== lastTransition) {
      lastTransition = transition;
      hero.classList.toggle('is-submerged', Boolean(wipeContext && transition >= .54));
      if (wipeContext) {
        hero.style.setProperty('--hero-outgoing-opacity', 1 - smooth(transition, .42, .54));
        nextSection.style.setProperty('--hero-principles-reveal',
          transition === 0 ? 1 : smooth(transition, .64, .82));
      }
    }
    // Keep the original scroll distance through the held star. Compress only
    // its dissolution and handoff into the shorter overlap with PURE.
    const intro = -bounds.top / (stageHeight * 1.8);
    const progress = reduced.matches ? 0 : wipeContext && transition > 0
      ? dissolveStart + transition * (1.12 - dissolveStart)
      : Math.max(0, Math.min(1.12, intro));
    if (progress === lastProgress) return;
    lastProgress = progress;

    const strength = smooth(progress, .015, .235) * (1 - smooth(progress, .235, .255));
    const vibration = progress * Math.PI * 112;
    hero.style.setProperty('--hero-shake', (Math.sin(vibration) * strength * 9).toFixed(3) + 'px');
    hero.style.setProperty('--hero-tilt', (Math.sin(vibration + .65) * strength * 1).toFixed(3) + 'deg');
    const opacity = smooth(progress, .36, .425) * (1 - smooth(progress, dissolveStart, .88));
    hero.style.setProperty('--hero-star-opacity', opacity.toFixed(4));
    drawBubbles(progress);
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
  }
  function resize() {
    const scale = Math.min(innerWidth / 1440, innerHeight / 900);
    hero.style.setProperty('--hero-layout-scale', scale.toFixed(6));
    if (context) {
      const resolution = Math.min(1.25, scale * Math.min(devicePixelRatio || 1, 1.5));
      canvas.width = Math.max(1, Math.round(1440 * resolution));
      canvas.height = Math.max(1, Math.round(900 * resolution));
      context.setTransform(canvas.width / 1440, 0, 0, canvas.height / 900, 0, 0);
    }
    if (wipeContext) prepareWipe();
    lastProgress = undefined;
    lastTransition = undefined;
    schedule();
  }
  image.decode().then(() => {
    particles = collectBubbles();
    lastProgress = undefined;
    schedule();
  }).catch(error => console.warn('Hero carbonation:', error));
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', resize, { passive: true });
  reduced.addEventListener('change', schedule);
  resize();
})();
