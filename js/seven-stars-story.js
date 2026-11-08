/* 11-08 (f) — SEVEN STARS with the GLOSSY GEL star (experiments/water-star-test.html).
   Seven glossy gel stars stand in the Chilsung constellation. Scrolling sends
   them, one after another, swelling toward the viewer and past the screen.
   The biggest star stays, glides to the centre and twinkles; a white sweep
   turns it into the new flat star, and brand-flow-preview's aperture grows
   from it into the white screen (via __sevenStoryAnchor), as before.
   Reuses: identity progress (chilsung:star-progress), smooth-scroll stops,
   brand-flow aperture. Every SVG gets its own id prefix (no id collisions). */
(() => {
  'use strict';
  const identity = document.getElementById('identity');
  const stage = identity && identity.querySelector('.identity-stage');
  if (!stage) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  // Constellation layout (stage units 0–1100, from the official mark): centre x, centre y, star width.
  const LAYOUT = [
    [579.5, 226.5, 129], [764, 227, 130],
    [526.5, 408.5, 165], [710.5, 408.5, 165],
    [462, 622, 208], [647.5, 622, 208],
    [408.5, 818, 263]                                       // the biggest — it stays
  ];
  const UNIT = 1100;
  // Gel star bbox inside its 600 viewBox: x 55–548, y 64–541.
  const STAR_W = 493 / 600, STAR_CX = 301.5 / 600, STAR_CY = 302.5 / 600;

  // Scroll map (identity progress); paging stops sit at .14 and .32 (smooth-scroll.js).
  const FLY0 = .03, FLY_STEP = .036, FLY_DUR = .085;
  const GO0 = .19, GO1 = .31;                               // biggest star → centre
  const SWEEP0 = .335, SWEEP1 = .395, HANDOFF = .42;

  const SHAPE = 'M300 64C314 64 323 74 329 91L369 209C373 221 380 227 393 228L520 232C537 232 548 243 548 257C548 267 542 275 534 281L431 357C420 365 416 376 420 389L456 506C461 522 454 536 441 541C433 544 425 542 417 536L313 466C304 460 296 460 287 466L183 536C169 545 154 540 149 526C146 518 147 510 150 501L187 388C191 375 187 365 176 357L68 280C55 271 55 255 65 244C72 236 80 233 92 232L205 228C218 228 226 221 230 210L271 91C277 74 286 64 300 64Z';

  // GLOSSY GEL, refined: same body/fold/sheen language, a softer milky halo,
  // and (big star only) a white sweep layer that turns it into the new star.
  function gelSVG(u, big) {
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
      (big ? '<linearGradient id="' + id('sweepg') + '" x1="0" y1="0" x2="1" y2="1"><stop class="seven-gel__s1" offset="0" stop-color="#fff"/><stop class="seven-gel__s2" offset="0" stop-color="#000"/></linearGradient>' +
        '<mask id="' + id('sweep') + '" maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="600"><rect width="600" height="600" fill="' + url('sweepg') + '"/></mask>' : '') +
      '</defs>' +
      '<use href="#' + id('shape') + '" fill="#004c37" opacity=".24" transform="translate(0 19)" filter="' + url('shadow') + '"/>' +
      '<use class="seven-gel__halo" href="#' + id('shape') + '" fill="none" stroke="#f5fff3" stroke-width="26" opacity=".8" filter="' + url('glow') + '"/>' +
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
        // a small crisp catch-light on the upper lime face — refinement
        '<ellipse cx="395" cy="262" rx="18" ry="7" transform="rotate(-18 395 262)" fill="#fff" opacity=".55" filter="' + url('tight') + '"/>' +
      '</g>' +
      '<use href="#' + id('shape') + '" fill="none" stroke="#006c48" stroke-width="3.5" stroke-linejoin="round" opacity=".66"/>' +
      '<use href="#' + id('shape') + '" fill="none" stroke="' + url('edge') + '" stroke-width="1.6" stroke-linejoin="round" opacity=".7"/>' +
      (big ? '<use class="seven-gel__white" href="#' + id('shape') + '" fill="#fff" mask="' + url('sweep') + '"/>' : '') +
      '</svg>';
  }

  const layer = document.createElement('div');
  layer.className = 'seven-gel';
  layer.setAttribute('aria-hidden', 'true');
  const uid = 'sg' + Math.random().toString(36).slice(2, 7);
  const stars = LAYOUT.map((_, i) => {
    const el = document.createElement('div');
    const big = i === LAYOUT.length - 1;
    el.className = 'seven-gel__star' + (big ? ' seven-gel__star--big' : '');
    el.innerHTML = gelSVG(uid + i, big);
    layer.append(el);
    return el;
  });
  const glint = document.createElement('span');
  glint.className = 'seven-gel__glint';
  stars[6].append(glint);
  stage.append(layer);
  const bigStar = stars[6];
  const s1 = bigStar.querySelector('.seven-gel__s1'), s2 = bigStar.querySelector('.seven-gel__s2');
  const halo = bigStar.querySelector('.seven-gel__halo');

  const clamp = v => Math.max(0, Math.min(1, v));
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const lin = (a, b, x) => clamp((x - a) / (b - a));
  let p = 0, raf = 0, box = 0, lastRect = null;

  function stageBox() {
    const w = stage.clientWidth, h = stage.clientHeight;
    return Math.min(h * .92, w * (w < 700 ? .96 : .72));    // phones: use nearly the full width
  }

  // Aperture origin = the biggest star once it has settled at the centre.
  window.__sevenStoryAnchor = () => {
    if (p < GO1 || p >= .5) return null;
    const live = bigStar.getBoundingClientRect();
    if (live.width >= 4) lastRect = live;                    // after hand-off the layer is gone; keep its last place
    const r = lastRect;
    if (!r) return null;
    const starW = r.width * STAR_W, size = starW / .86;   // aperture star is 86% of its box
    return { x: r.left + r.width * STAR_CX, y: r.top + r.height * STAR_CY + size * .0375, size };
  };

  function paint() {
    raf = 0;
    const live = p < HANDOFF + .005;
    identity.classList.toggle('has-seven-film', p < .75);  // old title/slot star stay out until the screen is white
    layer.style.display = live ? '' : 'none';               // (children set their own visibility)
    if (!live) return;
    box = stageBox();
    const k = box / UNIT, still = reduced.matches;
    layer.style.width = layer.style.height = box + 'px';
    const mid = box / 2;
    LAYOUT.forEach(([cx, cy, w], i) => {
      const el = stars[i], size = w * k / STAR_W;
      el.style.width = el.style.height = size + 'px';
      let x = cx * k, y = cy * k, scale = 1, alpha = 1;
      if (i < 6) {
        if (still) alpha = 1 - sm(.25, .31, p);
        else {
          // One after another, each star swells toward the viewer and passes the screen.
          const f = lin(FLY0 + i * FLY_STEP, FLY0 + i * FLY_STEP + FLY_DUR, p), e = Math.pow(f, 2.3);
          scale = 1 + e * 15;
          x = mid + (x - mid) * (1 + e * 4.5);
          y = mid + (y - mid) * (1 + e * 4.5);
          alpha = 1 - sm(.62, 1, f);
        }
      } else {
        const g = still ? sm(GO0, GO1, p) : sm(GO0, GO1, p);
        x += (mid - x) * g; y += (mid - y) * g;
        scale = 1 + .5 * g;                                   // settles a little larger, centre stage
      }
      el.style.opacity = alpha.toFixed(3);
      el.style.visibility = alpha > .005 ? 'visible' : 'hidden';
      el.style.transform = 'translate3d(' + (x - size * STAR_CX).toFixed(1) + 'px,' + (y - size * STAR_CY).toFixed(1) + 'px,0) scale(' + scale.toFixed(4) + ')';
      el.style.zIndex = String(i < 6 ? 10 + Math.round(scale * 10) : 5);
    });
    // Resting at the centre: it twinkles, hinting that it is the one that grows.
    bigStar.classList.toggle('is-twinkling', p >= GO1 - .005 && p < SWEEP0 && !still);
    // White sweep: the gel star becomes the new flat white star.
    const w = sm(SWEEP0, SWEEP1, p), edge = -.3 + 1.55 * w;
    s1.setAttribute('offset', Math.max(0, edge).toFixed(3));
    s2.setAttribute('offset', Math.max(0, edge + .12).toFixed(3));
    halo.style.opacity = (.8 * (1 - w)).toFixed(3);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(paint); }
  addEventListener('chilsung:star-progress', e => { p = e.detail; kick(); });
  addEventListener('resize', kick, { passive: true });
  reduced.addEventListener?.('change', kick);
  kick();
})();
