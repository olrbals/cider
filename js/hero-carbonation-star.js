/* HERO V4.4 — 1440 × 900 Figma layout.
 * ① still → ② the can buzzes (time-based, so it reads as a real vibration)
 * → ③ a short hush, then the water star pops from behind the can
 * → ④ carbonation rushes up → ⑤ a clear, wavy soda surface fills the
 * screen → ⑥ a white foam head rolls over everything and becomes PURE.
 * ②③ are triggered by scroll and play on a clock; ④–⑥ are scrubbed by scroll.
 */
(() => {
  'use strict';
  const hero = document.querySelector('#top.hero');
  const image = hero?.querySelector('.hero-carbonation-star img');
  const canvas = hero?.querySelector('.hero-carbonation-bubbles');
  const stage = hero?.querySelector('.hero-splash-stage');
  if (!image || !canvas || !stage) return;

  const context = canvas.getContext('2d');
  const starSlot = image.parentElement;
  const nextSection = document.querySelector('#brand-values');
  const header = document.querySelector('.site-header');
  const wipe = document.createElement('canvas');
  const wipeContext = nextSection && wipe.getContext('2d');
  let wipeWidth = 1;
  let wipeHeight = 1;
  let bubbleSprites;
  let rising = [];
  let foam = [];
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
  // Overshoot ease: the star springs slightly past full size, then settles.
  const springOut = t => {
    const s = 1.9;
    const u = clamp(t) - 1;
    return 1 + (s + 1) * u * u * u + s * u * u;
  };
  const originX = 719.5;
  const originY = 593.5;
  const burstStart = .32;
  const burstEnd = .49;
  const dissolveStart = .70;
  // The soda sequence (④–⑥) starts once PURE is 0.95 screens away, so the
  // hero length itself is unchanged.
  const wipeDistance = .95;

  // ②③ timing (ms) and the scroll positions that trigger / reset it.
  const SHAKE = 540;
  const HUSH = 120;
  const POP = 720;
  const UNPOP = 520;
  const triggerAt = .06;
  const resetAt = .02;
  let popState = 'idle';
  let popStart = 0;
  let started = false;

  // A brief liquid ripple applied to the star only while it pops.
  const svgNS = 'http://www.w3.org/2000/svg';
  const filterHost = document.createElementNS(svgNS, 'svg');
  filterHost.setAttribute('aria-hidden', 'true');
  filterHost.setAttribute('width', '0');
  filterHost.setAttribute('height', '0');
  filterHost.style.position = 'absolute';
  filterHost.innerHTML = '<filter id="hero-star-liquid" x="-10%" y="-10%" width="120%" height="120%">'
    + '<feTurbulence type="fractalNoise" baseFrequency=".011 .019" numOctaves="2" seed="7" result="n"/>'
    + '<feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter>';
  document.body.append(filterHost);
  const ripple = filterHost.querySelector('feDisplacementMap');

  let frame = 0;
  let lastKey;
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
    const ratio = Math.min(devicePixelRatio || 1, 1);
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
    const gauss = () => (random() + random() + random() - 1.5) / 1.5;
    // Small / medium / large bubbles. About 40% rise in a column behind
    // the can so the rush visibly comes out of the soda itself.
    const layers = [[230, 4, 12, .85], [220, 10, 28, 1.05], [48, 26, 56, 1.3]];
    rising = layers.flatMap(([count, minSize, maxSize, speed], depth) =>
      Array.from({ length: count }, () => {
        const column = random() < .4;
        return {
          x: column ? .5 + gauss() * .13 : random(),
          start: random() * 1.3,
          size: minSize + random() ** 1.6 * (maxSize - minSize),
          speed: speed + random() * .7,
          sway: random() * Math.PI * 2,
          drift: 3 + depth * 5 + random() * 7,
          alpha: .6 + random() * .38,
          sprite: bubbleSprites[depth]
        };
      }));
    // Foam head: dense small bubbles riding the white crest.
    foam = Array.from({ length: 170 }, () => ({
      x: random(), lift: random() ** 1.7, size: 5 + random() ** 1.4 * 20,
      wobble: random() * Math.PI * 2, alpha: .55 + random() * .4,
      sprite: bubbleSprites[random() < .7 ? 0 : 1]
    }));
  }

  // One broad, slowly rolling soda surface (two sines, no small ripples).
  function surface(x, base, amp, swell) {
    const u = x / wipeWidth * Math.PI * 2;
    return base + amp * (Math.sin(u * 1.15 + swell) * .62 + Math.sin(u * 2.4 - swell * 1.35 + 1.2) * .38);
  }
  function surfacePath(ctx, base, amp, swell) {
    ctx.beginPath();
    ctx.moveTo(0, wipeHeight + 2);
    for (let x = 0; x <= wipeWidth + 24; x += 24) ctx.lineTo(x, surface(x, base, amp, swell));
    ctx.lineTo(wipeWidth + 24, wipeHeight + 2);
    ctx.closePath();
  }

  function drawWipe(progress, active, seconds = 0) {
    if (!wipeContext) return;
    if (wipe.hidden === active) wipe.hidden = !active;
    if (!active) return;

    const width = wipeWidth;
    const height = wipeHeight;
    const ctx = wipeContext;
    // ④ rush → ⑤ soda level → ⑥ foam head. Each scrubs with the scroll.
    const rush = smooth(progress, 0, .26);
    const level = smooth(progress, .08, .50);
    const head = smooth(progress, .44, .80);
    const front = height * (1.10 - 1.34 * level);
    const crest = height * (1.20 - 1.46 * head);
    const swell = seconds * 1.5 + progress * 7;
    const amp = height * .032 * (.55 + .45 * rush);
    ctx.clearRect(0, 0, width, height);

    // ⑤ Clear soda below a rolling surface: the hero stays visible through it.
    if (front < height + amp) {
      surfacePath(ctx, front, amp, swell);
      const water = ctx.createLinearGradient(0, Math.max(0, front - amp), 0, height);
      water.addColorStop(0, 'rgba(238,255,249,.30)');
      water.addColorStop(.5, 'rgba(206,248,230,.36)');
      water.addColorStop(1, 'rgba(160,234,202,.48)');
      ctx.fillStyle = water;
      ctx.fill();
      // Bright meniscus line along the surface.
      ctx.beginPath();
      for (let x = 0; x <= width + 24; x += 24) {
        const y = surface(x, front, amp, swell);
        if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,.82)';
      ctx.lineWidth = 2.4;
      ctx.shadowColor = 'rgba(255,255,255,.9)';
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.restore();
    }

    // ④ Carbonation: fast, dense, and alive on its own clock.
    const reach = height * (.30 + .75 * rush);
    for (const bubble of rising) {
      const rise = (seconds * .30 * bubble.speed + progress * 1.25 * bubble.speed + bubble.start) % 1.3;
      const y = height * (1.1 - rise);
      if (y < -60 || y > height + 60) continue;
      const x = bubble.x * width + Math.sin(rise * 12 + bubble.sway) * bubble.drift;
      const water = surface(x, front, amp, swell);
      let alpha = bubble.alpha * smooth(rise, 0, .08);
      if (y < water) alpha *= rush * (1 - smooth(water - y, 0, reach));
      if (y > surface(x, crest, amp * .8, swell * 1.2 + 2)) alpha *= .3;
      if (alpha <= .01) continue;
      const size = bubble.size * (.8 + .4 * rush);
      const stretch = 1 + .22 * rush * (bubble.speed - .8);
      ctx.globalAlpha = alpha;
      ctx.drawImage(bubble.sprite, x - size / 2, y - size * stretch / 2, size, size * stretch);
    }
    ctx.globalAlpha = 1;

    // ⑥ Foam head: soft layered white crest, solid white beneath = PURE.
    if (crest < height + 120) {
      const crestSwell = swell * 1.2 + 2;
      const crestAmp = amp * .8;
      [[-58, .28], [-30, .55], [0, 1]].forEach(([offset, alpha]) => {
        surfacePath(ctx, crest + offset, crestAmp, crestSwell);
        ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
        ctx.fill();
      });
      for (const bubble of foam) {
        const x = bubble.x * width + Math.sin(seconds * 2 + bubble.wobble) * 4;
        const y = surface(x, crest, crestAmp, crestSwell) - 8 - bubble.lift * 78;
        if (y > height + 30) continue;
        ctx.globalAlpha = bubble.alpha * (1 - bubble.lift * .55);
        ctx.drawImage(bubble.sprite, x - bubble.size / 2, y - bubble.size / 2, bubble.size, bubble.size);
      }
      ctx.globalAlpha = 1;
    }
    // Once the screen is white, dissolve the layer to reveal PURE beneath.
    wipe.style.opacity = String(1 - smooth(progress, .80, .94));
  }

  function heroPop(time, intro, transition) {
    if (!started) {
      started = true;
      if (intro > triggerAt) popState = 'shown';
    }
    if (transition > 0) popState = 'shown';
    else if (intro > triggerAt && (popState === 'idle' || popState === 'unpopping')) {
      popState = 'shaking';
      popStart = time;
    } else if (intro < resetAt) {
      if (popState === 'shaking') popState = 'idle';
      else if (popState === 'popping' || popState === 'shown') {
        popState = 'unpopping';
        popStart = time;
      }
    }
    if (popState === 'shaking' && time - popStart >= SHAKE + HUSH) {
      popState = 'popping';
      popStart += SHAKE + HUSH;
    }
    if (popState === 'popping' && time - popStart >= POP) popState = 'shown';
    if (popState === 'unpopping' && time - popStart >= UNPOP) popState = 'idle';

    const elapsed = time - popStart;
    const state = { progress: 0, shakeX: 0, shakeY: 0, tilt: 0, scale: 1, flash: 1, ripple: 0, opacity: null };
    if (popState === 'shaking' && elapsed < SHAKE) {
      // ② A tight buzz: quick attack, steady hold, hard stop.
      const e = elapsed / SHAKE;
      const envelope = Math.min(1, e / .07) * (e > .9 ? (1 - e) / .1 : 1);
      const ms = elapsed / 1000;
      state.shakeX = (Math.sin(ms * Math.PI * 2 * 26) * 7 + Math.sin(ms * Math.PI * 2 * 41) * 3) * envelope;
      state.shakeY = Math.sin(ms * Math.PI * 2 * 33 + 1) * 2.2 * envelope;
      state.tilt = Math.sin(ms * Math.PI * 2 * 19 + .6) * 1.8 * envelope;
    } else if (popState === 'popping') {
      // ③ Pop: bubbles fly out into the star shape as it springs open.
      const k = clamp(elapsed / POP);
      state.progress = burstStart + (burstEnd - burstStart) * Math.min(1, k * 1.3);
      state.opacity = smooth(k, 0, .16);
      state.scale = .42 + .58 * springOut(Math.min(1, k / .72));
      state.flash = 1 + .55 * (1 - smooth(k, .04, .5));
      state.ripple = 46 * (1 - smooth(k, 0, .75));
    } else if (popState === 'shown') {
      state.progress = .55;
    } else if (popState === 'unpopping') {
      // Reverse: the star breaks back into rising bubbles and fades.
      const k = clamp(elapsed / UNPOP);
      state.progress = dissolveStart + k * (1.04 - dissolveStart);
      state.scale = 1 + .06 * k;
    }
    return state;
  }

  function render(now) {
    frame = 0;
    const time = now || performance.now();
    const bounds = hero.getBoundingClientRect();
    const stageHeight = stage.offsetHeight || innerHeight;
    const boundary = nextSection ? nextSection.getBoundingClientRect().top / stageHeight : 0;
    const transition = reduced.matches ? 0 : phase(wipeDistance - boundary, 0, wipeDistance);
    if (header) {
      if (header.hidden) header.hidden = false;
      const offHero = nextSection ? boundary <= .08 : bounds.bottom <= 0;
      header.classList.toggle('is-off-hero', offHero);
      header.classList.toggle('is-on-light', !offHero && transition >= .67);
    }
    const wipeActive = Boolean(wipeContext && !reduced.matches && boundary > .002
      && transition > .01 && transition < .995);
    drawWipe(transition, wipeActive, time / 1000);
    if (transition !== lastTransition) {
      lastTransition = transition;
      hero.classList.toggle('is-submerged', Boolean(wipeContext && transition >= .76));
      if (wipeContext) {
        hero.style.setProperty('--hero-outgoing-opacity', 1 - smooth(transition, .70, .76));
        nextSection.style.setProperty('--hero-principles-reveal',
          transition === 0 ? 1 : smooth(transition, .76, .86));
      }
    }

    let state;
    if (reduced.matches) {
      state = { progress: .55, shakeX: 0, shakeY: 0, tilt: 0, scale: 1, flash: 1, ripple: 0, opacity: null };
    } else {
      state = heroPop(time, -bounds.top / stageHeight, transition);
      // ④ The star bursts into the rising soda as the rush begins.
      if (transition > 0) state.progress = dissolveStart + smooth(transition, .04, .40) * (1.12 - dissolveStart);
    }
    const animating = wipeActive || popState === 'shaking' || popState === 'popping' || popState === 'unpopping';
    if (animating) schedule();

    const opacity = state.opacity ?? smooth(state.progress, .36, .425) * (1 - smooth(state.progress, dissolveStart, .88));
    const key = [state.progress, state.shakeX, state.shakeY, state.tilt, state.scale, state.flash, state.ripple, opacity].join();
    if (key === lastKey) return;
    lastKey = key;
    hero.style.setProperty('--hero-shake', state.shakeX.toFixed(2) + 'px');
    hero.style.setProperty('--hero-shake-y', state.shakeY.toFixed(2) + 'px');
    hero.style.setProperty('--hero-tilt', state.tilt.toFixed(3) + 'deg');
    hero.style.setProperty('--hero-star-opacity', opacity.toFixed(4));
    hero.style.setProperty('--hero-star-scale', state.scale.toFixed(4));
    hero.style.setProperty('--hero-star-flash', state.flash.toFixed(3));
    starSlot.classList.toggle('is-popping', state.ripple > .5);
    if (state.ripple > .5) {
      ripple.setAttribute('scale', state.ripple.toFixed(1));
    }
    drawBubbles(state.progress);
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
    lastKey = undefined;
    lastTransition = undefined;
    schedule();
  }
  image.decode().then(() => {
    particles = collectBubbles();
    lastKey = undefined;
    schedule();
  }).catch(error => console.warn('Hero carbonation:', error));
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', resize, { passive: true });
  reduced.addEventListener('change', schedule);
  resize();
})();
