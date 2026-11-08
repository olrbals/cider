/* 11-08 (g) — SEVEN STARS, after the planning brief:
   gel star → (changes, like the official film) → splits into seven stars →
   they twinkle and fizz away into carbonation → the screen turns white →
   "모두와 함께 큰 별" (seven-stars-pop.js) rises in.
   No zoom-to-cover: the brand-flow aperture is switched off while this runs
   (window.__sevenStoryNoAperture). Everything is a pure function of the
   identity progress, so reverse scrolling simply plays it backwards.
   Reuses: chilsung:star-progress, smooth-scroll paging, seven-stars-pop copy.
   SVG ids are prefixed per instance (no collisions). */
(() => {
  'use strict';
  const identity = document.getElementById('identity');
  const stage = identity && identity.querySelector('.identity-stage');
  if (!stage) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  window.__sevenStoryNoAperture = true;
  window.__sevenStoryBubbles = true;                         // seven-stars-pop: skip its clock burst

  // Constellation (stage units 0–1100, after the official mark): centre x, centre y, star width.
  const LAYOUT = [
    [579.5, 226.5, 129], [764, 227, 130],
    [526.5, 408.5, 165], [710.5, 408.5, 165],
    [462, 622, 208], [647.5, 622, 208],
    [408.5, 818, 263]                                       // the biggest = the gel star itself
  ];
  const UNIT = 1100, BIG = 6, GEL_SCALE = 1.35;
  const STAR_W = 493 / 600, STAR_CX = 301.5 / 600, STAR_CY = 302.5 / 600;

  // Scroll map (identity progress). Paging stops: 0 · .14 · .32 · white line (smooth-scroll.js).
  const SWEEP = [.04, .13];                                  // ① the gel star turns into the new white star
  const SPLIT = [.15, .29];                                  // ② it parts into seven
  const STAGGER = [0, .014, .006, .019, .003, .011, 0];
  const FIZZ = [.36, .56];                                   // ③ stars fizz into bubbles
  const WHITE = [.43, .63];                                  //    and the screen turns white (paper is white at .68)

  const SHAPE = 'M300 64C314 64 323 74 329 91L369 209C373 221 380 227 393 228L520 232C537 232 548 243 548 257C548 267 542 275 534 281L431 357C420 365 416 376 420 389L456 506C461 522 454 536 441 541C433 544 425 542 417 536L313 466C304 460 296 460 287 466L183 536C169 545 154 540 149 526C146 518 147 510 150 501L187 388C191 375 187 365 176 357L68 280C55 271 55 255 65 244C72 236 80 233 92 232L205 228C218 228 226 221 230 210L271 91C277 74 286 64 300 64Z';

  // GLOSSY GEL (experiments/water-star-test.html), lightly refined, plus a white sweep layer.
  function gelSVG(u) {
    const id = k => u + '-' + k, url = k => 'url(#' + id(k) + ')';
    return '<svg class="seven-gel__svg" viewBox="0 0 600 600" overflow="visible" aria-hidden="true" focusable="false"><defs>' +
      '<path id="' + id('shape') + '" d="' + SHAPE + '"/>' +
      '<clipPath id="' + id('clip') + '"><use href="#' + id('shape') + '"/></clipPath>' +
      '<linearGradient id="' + id('base') + '" x1="115" y1="130" x2="480" y2="480" gradientUnits="userSpaceOnUse">' +
        '<stop offset="0" stop-color="#00a868"/><stop offset=".48" stop-color="#00a95e"/><stop offset=".53" stop-color="#70bd3e"/><stop offset="1" stop-color="#92cc45"/></linearGradient>' +
      '<radialGradient id="' + id('lime') + '" cx="0" cy="0" r="1" gradientTransform="translate(397 330) rotate(130) scale(220 185)" gradientUnits="userSpaceOnUse">' +
        '<stop offset="0" stop-color="#d9f48b" stop-opacity=".56"/><stop offset=".44" stop-color="#9cd850" stop-opacity=".28"/><stop offset="1" stop-color="#71c546" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="' + id('edge') + '" x1="160" y1="92" x2="431" y2="530" gradientUnits="userSpaceOnUse">' +
        '<stop offset="0" stop-color="#dffff0"/><stop offset=".18" stop-color="#00754c"/><stop offset=".47" stop-color="#b6f070"/><stop offset=".72" stop-color="#006d48"/><stop offset="1" stop-color="#e9ffd2"/></linearGradient>' +
      '<linearGradient id="' + id('streak') + '" x1="220" y1="104" x2="416" y2="472" gradientUnits="userSpaceOnUse">' +
        '<stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset=".45" stop-color="#eaffdd" stop-opacity=".48"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<filter id="' + id('glow') + '" x="-35%" y="-35%" width="170%" height="175%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="11" result="b"/>' +
        '<feColorMatrix in="b" values="1 0 0 0 .82  0 1 0 0 1  0 0 1 0 .88  0 0 0 .82 0"/></filter>' +
      '<filter id="' + id('soft') + '" x="-35%" y="-35%" width="170%" height="170%"><feGaussianBlur stdDeviation="8"/></filter>' +
      '<filter id="' + id('tight') + '" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.2"/></filter>' +
      '<filter id="' + id('shadow') + '" x="-30%" y="-30%" width="160%" height="175%"><feGaussianBlur stdDeviation="14"/></filter>' +
      '<linearGradient id="' + id('sweepg') + '" x1="0" y1="0" x2="1" y2="1"><stop class="seven-gel__s1" offset="0" stop-color="#fff"/><stop class="seven-gel__s2" offset="0" stop-color="#000"/></linearGradient>' +
      '<mask id="' + id('sweep') + '" maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="600"><rect width="600" height="600" fill="' + url('sweepg') + '"/></mask>' +
      '</defs>' +
      '<g class="seven-gel__body">' +
        '<use href="#' + id('shape') + '" fill="#004c37" opacity=".24" transform="translate(0 19)" filter="' + url('shadow') + '"/>' +
        '<use href="#' + id('shape') + '" fill="none" stroke="#f5fff3" stroke-width="26" opacity=".8" filter="' + url('glow') + '"/>' +
        '<use href="#' + id('shape') + '" fill="' + url('base') + '"/>' +
        '<g clip-path="' + url('clip') + '">' +
          '<path d="M301 28C355 165 359 292 304 393C274 449 231 493 190 534L64 540V30Z" fill="#00a760"/>' +
          '<path d="M310 35C353 157 359 273 321 357C296 414 259 466 213 523" fill="none" stroke="#006344" stroke-width="48" opacity=".55" filter="' + url('soft') + '"/>' +
          '<path d="M311 40C344 159 346 269 313 353C290 411 257 458 220 508" fill="none" stroke="#007e4d" stroke-width="18" opacity=".62" filter="' + url('tight') + '"/>' +
          '<rect x="220" y="120" width="330" height="390" fill="' + url('lime') + '"/>' +
          '<use href="#' + id('shape') + '" fill="none" stroke="#004936" stroke-width="24" opacity=".32" filter="' + url('soft') + '"/>' +
          '<path d="M365 227C408 232 458 237 507 247" fill="none" stroke="#006a43" stroke-width="22" stroke-linecap="round" opacity=".42" filter="' + url('soft') + '"/>' +
          '<path class="seven-gel__sheen seven-gel__sheen--top" d="M289 100C278 136 265 179 248 216C240 234 232 245 224 253" fill="none" stroke="' + url('streak') + '" stroke-width="15" stroke-linecap="round" opacity=".66" filter="' + url('tight') + '"/>' +
          '<path d="M319 101C330 139 341 180 358 213C364 224 371 231 380 235" fill="none" stroke="#fff" stroke-width="15" stroke-linecap="round" opacity=".6" filter="' + url('tight') + '"/>' +
          '<path class="seven-gel__sheen seven-gel__sheen--side" d="M443 283C398 297 378 326 365 366C351 409 331 435 296 454" fill="none" stroke="#fff8d7" stroke-width="44" stroke-linecap="round" opacity=".5" filter="' + url('soft') + '"/>' +
          '<path class="seven-gel__sheen seven-gel__sheen--base" d="M181 508C218 474 252 447 286 424" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" opacity=".52" filter="' + url('tight') + '"/>' +
          '<ellipse cx="395" cy="262" rx="18" ry="7" transform="rotate(-18 395 262)" fill="#fff" opacity=".55" filter="' + url('tight') + '"/>' +
        '</g>' +
        '<use href="#' + id('shape') + '" fill="none" stroke="#006c48" stroke-width="3.5" stroke-linejoin="round" opacity=".66"/>' +
        '<use href="#' + id('shape') + '" fill="none" stroke="' + url('edge') + '" stroke-width="1.6" stroke-linejoin="round" opacity=".7"/>' +
      '</g>' +
      '<use href="#' + id('shape') + '" fill="#fff" mask="' + url('sweep') + '"/>' +
      '</svg>';
  }
  const whiteSVG = '<svg class="seven-gel__svg" viewBox="0 0 600 600" overflow="visible" aria-hidden="true" focusable="false"><path d="' + SHAPE + '" fill="#fff"/></svg>';

  const layer = document.createElement('div');
  layer.className = 'seven-gel';
  layer.setAttribute('aria-hidden', 'true');
  const uid = 'sg' + Math.random().toString(36).slice(2, 7);
  const stars = LAYOUT.map((_, i) => {
    const el = document.createElement('div');
    el.className = 'seven-gel__star' + (i === BIG ? ' seven-gel__star--gel' : '');
    el.style.setProperty('--twinkle-delay', (i * .23).toFixed(2) + 's');
    el.innerHTML = i === BIG ? gelSVG(uid) : whiteSVG;
    layer.append(el);
    return el;
  });
  const canvas = document.createElement('canvas');
  canvas.className = 'seven-gel__fizz';
  stage.append(layer, canvas);
  const ctx = canvas.getContext('2d');
  const gel = stars[BIG];
  const s1 = gel.querySelector('.seven-gel__s1'), s2 = gel.querySelector('.seven-gel__s2');
  const body = gel.querySelector('.seven-gel__body');

  const clamp = v => Math.max(0, Math.min(1, v));
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const lin = (a, b, x) => clamp((x - a) / (b - a));
  const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  // Deterministic bubbles (seeded) so scrolling back replays them exactly.
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const STARPOLY = [[50,6],[61.7,36],[93,36],[68,55.3],[77.5,86.5],[50,68.2],[22.5,86.5],[32,55.3],[7,36],[38.3,36]];
  const inStar = (x, y) => {                                 // point in the five-point polygon (0–100 box)
    let inside = false;
    for (let i = 0, j = STARPOLY.length - 1; i < STARPOLY.length; j = i++) {
      const [xi, yi] = STARPOLY[i], [xj, yj] = STARPOLY[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const bubbles = [];
  LAYOUT.forEach(([, , w], si) => {
    const n = Math.round(12 + w * .13);                     // bigger star, more bubbles
    for (let k = 0; k < n; k++) {
      let x, y;
      do { x = rnd() * 100; y = rnd() * 100; } while (!inStar(x, y));
      const a = Math.atan2(y - 50, x - 50) + (rnd() - .5) * 1.2;
      bubbles.push({ si, ux: (x - 50) / 86, uy: (y - 47) / 86, a, d: .25 + rnd() * 1.6, rise: .15 + rnd() * .55,
        r: .006 + rnd() * rnd() * .022, delay: rnd() * .07, life: .1 + rnd() * .09, ring: rnd() < .55, wob: rnd() * 6.28 });
    }
  });
  // A second, wider wave that spreads over the whole screen as it turns white.
  const field = [];
  for (let k = 0; k < 80; k++) field.push({ x: rnd(), y: .15 + rnd() * .95, r: .004 + rnd() * rnd() * .03, delay: rnd() * .12, rise: .12 + rnd() * .3, ring: rnd() < .6 });

  let p = 0, raf = 0, W = 0, H = 0, dpr = 1;
  function stageBox() {
    const w = stage.clientWidth, h = stage.clientHeight;
    return Math.min(h * .92, w * (w < 700 ? .96 : .72));
  }
  function starPos(i, box) {                                 // stage-pixel centre, width and alpha of star i
    const k = box / UNIT, ox = (stage.clientWidth - box) / 2, oy = (stage.clientHeight - box) / 2;
    const [cx, cy, w] = LAYOUT[i];
    const tx = ox + cx * k, ty = oy + cy * k, mx = stage.clientWidth / 2, my = stage.clientHeight / 2;
    const s0 = SPLIT[0] + STAGGER[i], f = easeIO(lin(s0, s0 + (SPLIT[1] - SPLIT[0]) - .02, p));
    const still = reduced.matches;
    const g = still ? (p >= SPLIT[0] ? 1 : 0) : f;
    const scale = i === BIG ? GEL_SCALE + (1 - GEL_SCALE) * g : 1;
    return { x: mx + (tx - mx) * g, y: my + (ty - my) * g, w: w * k * scale, appear: i === BIG ? 1 : (still ? g : clamp(g * 3)) };
  }

  function paint() {
    raf = 0;
    const live = p < .7;
    identity.classList.toggle('has-seven-film', p < .75);   // old title / slot star stay hidden
    layer.style.display = canvas.style.display = live ? '' : 'none';
    if (!live) return;
    const box = stageBox();
    // ① gel → new white star (diagonal sweep)
    const sw = sm(SWEEP[0], SWEEP[1], p), edge = -.3 + 1.55 * sw;
    s1.setAttribute('offset', Math.max(0, edge).toFixed(3));
    s2.setAttribute('offset', Math.max(0, edge + .12).toFixed(3));
    body.style.opacity = (1 - sm(SWEEP[1] - .02, SWEEP[1] + .02, p)).toFixed(3);
    const resting = p >= SPLIT[1] - .005 && p < FIZZ[0] + .03 && !reduced.matches;
    layer.classList.toggle('is-resting', resting);
    const pos = [];
    stars.forEach((el, i) => {
      const s = starPos(i, box);
      pos.push(s);
      const size = s.w / STAR_W;
      // ③ each star fizzes away in turn (no scaling up)
      const f0 = FIZZ[0] + (6 - Math.min(6, i)) * .008 + (i === BIG ? .02 : 0);
      const gone = sm(f0, f0 + .08, p);
      const alpha = s.appear * (1 - gone);
      el.style.width = el.style.height = size + 'px';
      el.style.opacity = alpha.toFixed(3);
      el.style.visibility = alpha > .005 ? 'visible' : 'hidden';
      el.style.transform = 'translate3d(' + (s.x - size * STAR_CX).toFixed(1) + 'px,' + (s.y - size * STAR_CY).toFixed(1) + 'px,0) scale(' + (1 - .12 * gone).toFixed(3) + ')';
      el.style.zIndex = i === BIG ? '3' : '2';
    });

    // Bubbles + white wash, drawn on one canvas over the stage.
    const cw = stage.clientWidth, ch = stage.clientHeight;
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    if (W !== cw || H !== ch) { W = cw; H = ch; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const wash = sm(WHITE[0], WHITE[1], p);
    if (wash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + wash.toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    if (p > FIZZ[0] && p < .7 && !reduced.matches) {
      const unit = Math.min(W, H);
      for (const b of bubbles) {
        const s = pos[b.si];
        const f0 = FIZZ[0] + (6 - Math.min(6, b.si)) * .008 + (b.si === BIG ? .02 : 0) + b.delay;
        const t = lin(f0, f0 + b.life + .06, p);
        if (t <= 0 || t >= 1) continue;
        const e = easeOut(t);
        const x = s.x + b.ux * s.w + Math.cos(b.a) * b.d * s.w * .55 * e + Math.sin(b.wob + t * 5) * 4;
        const y = s.y + b.uy * s.w + Math.sin(b.a) * b.d * s.w * .45 * e - b.rise * unit * .5 * e;
        draw(x, y, b.r * unit * (1 + 1.6 * t), (t < .12 ? t / .12 : 1) * (1 - sm(.55, 1, t)) * (1 - wash * .6), b.ring);
      }
      for (const b of field) {
        const t = lin(WHITE[0] - .04 + b.delay, WHITE[0] + .14 + b.delay, p);
        if (t <= 0 || t >= 1) continue;
        draw(b.x * W, (b.y - b.rise * easeOut(t)) * H, b.r * unit * (1 + 2.2 * t), Math.sin(Math.PI * t) * .9 * (1 - wash * .5), b.ring);
      }
    }
  }
  function draw(x, y, r, a, ring) {
    if (a <= .01 || r <= .2) return;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (ring) { ctx.lineWidth = Math.max(1, r * .18); ctx.strokeStyle = 'rgba(255,255,255,' + (a * .95).toFixed(3) + ')'; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,' + (a * .18).toFixed(3) + ')'; ctx.fill(); }
    else { ctx.fillStyle = 'rgba(255,255,255,' + (a * .85).toFixed(3) + ')'; ctx.fill(); }
  }
  function kick() { if (!raf) raf = requestAnimationFrame(paint); }
  addEventListener('chilsung:star-progress', e => { p = e.detail; kick(); });
  addEventListener('resize', () => { W = 0; kick(); }, { passive: true });
  reduced.addEventListener?.('change', kick);
  kick();
})();
