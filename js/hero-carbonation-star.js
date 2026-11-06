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
  // Reserve enough native scroll distance for the bubbling curtain in BOTH directions.
  const wipeDistance = .72;
  let frame = 0;
  let lastProgress;
  let lastTransition;
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
      bubbleSprites = [.55, .66, .77].map((strength, depth) => {
        const texture = document.createElement('canvas');
        texture.width = texture.height = 96;
        const sprite = texture.getContext('2d');
        const rim = sprite.createRadialGradient(44, 43, 18, 48, 48, 43);
        rim.addColorStop(0, depth === 0 ? 'rgba(237,255,247,.16)' : 'rgba(255,255,255,0)');
        rim.addColorStop(.57, 'rgba(245,255,251,.11)');
        rim.addColorStop(.72, 'rgba(255,255,255,.22)');
        rim.addColorStop(.83, 'rgba(20,124,84,' + strength + ')');
        rim.addColorStop(.94, 'rgba(244,255,250,.68)');
        rim.addColorStop(1, 'rgba(236,255,248,0)');
        sprite.fillStyle = rim;
        sprite.fillRect(0, 0, 96, 96);
        sprite.strokeStyle = 'rgba(255,255,255,.98)';
        sprite.lineWidth = depth === 2 ? 3.8 : 4.4;
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
      ? [[140, 4, 12, .82], [115, 10, 24, 1.05], [18, 23, 43, 1.28]]
      : [[280, 4, 13, .82], [210, 12, 30, 1.05], [35, 28, 53, 1.28]];
    rising = layers.flatMap(([count, minSize, maxSize, speed], depth) =>
      Array.from({ length: count }, (_, index) => ({
        x: ((index % lanes) + random()) / lanes,
        start: random() * .72,
        size: minSize + random() ** 1.6 * (maxSize - minSize),
        speed: speed + random() * .6,
        sway: random() * Math.PI * 2,
        drift: 3 + depth * 5 + random() * 7,
        alpha: .56 + random() * .40,
        sprite: bubbleSprites[depth]
      })));

    // A light repeating texture supplies depth, not an opaque field of noise.
    // The liquid fog below supplies immersion; individual rings remain legible.
    const tile = document.createElement('canvas');
    const span = compact ? 260 : 384;
    tile.width = tile.height = span;
    const foam = tile.getContext('2d');
    for (let i = 0; i < (compact ? 260 : 580); i++) {
      const x = random() * span;
      const y = random() * span;
      const size = 4 + random() ** 1.5 * 12;
      foam.globalAlpha = .20 + random() * .24;
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
    // Scrub both entrances identically; the leading edge rises from below and
    // the trailing edge clears upward to reveal PURE (no autoplay/timers).
    const approach = smooth(progress, .04, .47);
    const exit = smooth(progress, .59, .98);
    const front = height * (1.10 - approach * 1.29);
    const back = height * (1.14 - exit * 1.34);
    const flow = progress * 2.6;
    const ctx = wipeContext;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    // The transparent mint wash gives the impression of being inside soda.
    // Its soft edge follows the bubble curtain; no flat white flash.
    const water = ctx.createLinearGradient(0, 0, 0, height);
    water.addColorStop(0, 'rgba(236,255,247,.86)');
    water.addColorStop(.55, 'rgba(175,241,214,.90)');
    water.addColorStop(1, 'rgba(114,213,170,.92)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = water;
    ctx.fillRect(0, 0, width, height);
    if (foamPattern) {
      const zoom = .82 + approach * .18;
      foamPattern.setTransform(new DOMMatrix().translate(-width * (zoom - 1) / 2,
        -flow * height * .13).scale(zoom));
      ctx.globalAlpha = .22 + approach * .17;
      ctx.fillStyle = foamPattern;
      ctx.fillRect(0, 0, width, height);
    }

    for (const bubble of rising) {
      const age = flow - bubble.start;
      if (age <= 0) continue;
      const rise = (age * bubble.speed) % 1.28;
      const y = height * (1.08 - rise);
      const size = bubble.size * (.65 + approach * .72);
      if (y < front - size || y > Math.min(height, back + height * .12) + size) continue;
      const x = bubble.x * width + Math.sin(age * 5 + bubble.sway) * bubble.drift;
      ctx.globalAlpha = bubble.alpha * smooth(age, 0, .08) * smooth(rise, 0, .12);
      ctx.drawImage(bubble.sprite, x - size / 2, y - size / 2, size, size);
    }
    ctx.restore();

    // IMPORTANT: clip the WHOLE canvas to the rising front/trailing edge.
    // V4.1 only faded a narrow strip and accidentally left the rest of the
    // full-screen mint layer visible, making bubbles look like a flat flash.
    function feather(start, end, entering) {
      const edge = ctx.createLinearGradient(0, start, 0, end);
      edge.addColorStop(0, entering ? 'rgba(255,255,255,0)' : 'rgba(255,255,255,1)');
      edge.addColorStop(1, entering ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0)');
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = edge;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';
    }
    feather(front - height * .10, front + height * .13, true);
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
    // Header belongs to the HERO only: hide near the completed handoff,
    // and restore immediately on reverse scroll without moving page layout.
    if (header) {
      if (header.hidden) header.hidden = false;
      const offHero = nextSection ? boundary <= .08 : bounds.bottom <= 0;
      header.classList.toggle('is-off-hero', offHero);
      header.classList.toggle('is-on-light', !offHero && transition >= .53);
    }
    const wipeActive = Boolean(wipeContext && boundary > .002 && transition > .03 && transition < .995);
    if (wipeActive) {
      drawWipe(transition, true);
    } else {
      drawWipe(transition, false);
    }
    if (transition !== lastTransition) {
      lastTransition = transition;
      hero.classList.toggle('is-submerged', Boolean(wipeContext && transition >= .64));
      if (wipeContext) {
        hero.style.setProperty('--hero-outgoing-opacity', 1 - smooth(transition, .48, .64));
        nextSection.style.setProperty('--hero-principles-reveal',
          transition === 0 ? 1 : smooth(transition, .70, .87));
      }
    }
    // Bring the bubbling star up before the curtain. Keep it visible while
    // the first bubbles climb, then dissolve only once the foreground fills.
    const intro = -bounds.top / (stageHeight * 1.55);
    const progress = reduced.matches ? 0 : wipeContext && transition > 0
      ? dissolveStart + smooth(transition, .16, .69) * (1.12 - dissolveStart)
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
