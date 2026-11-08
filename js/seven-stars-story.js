/* 11-08 (c) — SEVEN STARS, after the official renewal film.
   The glossy 2000s star (puffy, two-tone, white rim glow) sits in ST★RS from
   the start. Scrolling scrubs its transformation like a film: the outline
   itself sharpens point by point into the new star while a white glint
   sweeps across it diagonally — then that flat white star grows into the
   white screen (brand-flow-preview aperture), as before. */
(() => {
  'use strict';
  const identity = document.getElementById('identity');
  if (!identity || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const N = 240, TAU = Math.PI * 2;
  // Sharp new-logo star (same geometry as the aperture path: viewBox 100, centre 50,47.5).
  const SHARP = 'M50 6 L61.7 36 H93 L68 55.3 L77.5 86.5 L50 68.2 L22.5 86.5 L32 55.3 L7 36 H38.3 Z';
  const sharpPts = (() => {             // resample the sharp polygon to N points, starting at the top tip
    const v = [[50,6],[61.7,36],[93,36],[68,55.3],[77.5,86.5],[50,68.2],[22.5,86.5],[32,55.3],[7,36],[38.3,36]];
    const seg = v.map((a, i) => { const b = v[(i + 1) % v.length]; return Math.hypot(b[0] - a[0], b[1] - a[1]); });
    const total = seg.reduce((a, b) => a + b, 0), out = [];
    for (let k = 0; k < N; k++) {
      let d = k / N * total, i = 0;
      while (d > seg[i]) { d -= seg[i]; i++; }
      const a = v[i], b = v[(i + 1) % v.length], f = d / seg[i];
      out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
    }
    return out;
  })();
  // Puffy heritage star: fatter inner radius, heavily rounded tips, slight tilt.
  const puffyPts = (() => {
    const cx = 50, cy = 50, R = 45, r = 22.5, raw = [];
    for (let k = 0; k < N; k++) {
      const u = k / N, seg = u * 10, i = Math.floor(seg), f = seg - i;
      const a0 = -Math.PI / 2 + i * TAU / 10, a1 = -Math.PI / 2 + (i + 1) * TAU / 10;
      const r0 = i % 2 ? r : R, r1 = i % 2 ? R : r;
      const p0 = [cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0], p1 = [cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1];
      raw.push([p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f]);
    }
    let pts = raw;
    for (let pass = 0; pass < 2; pass++) {            // rounding: circular moving average (tips stay readable)
      const W = 5, nxt = [];
      for (let k = 0; k < N; k++) {
        let sx = 0, sy = 0;
        for (let j = -W; j <= W; j++) { const q = pts[(k + j + N) % N]; sx += q[0]; sy += q[1]; }
        nxt.push([sx / (2 * W + 1), sy / (2 * W + 1)]);
      }
      pts = nxt;
    }
    return pts.map(([x, y]) => [x, y - 2.5]);          // upright, centred on the new star
  })();
  const pathAt = m => {
    let d = '';
    for (let k = 0; k < N; k++) {
      const a = puffyPts[k], b = sharpPts[k];
      // tips sharpen a little ahead of the body: a bit of "stretch" mid-way
      const x = a[0] + (b[0] - a[0]) * m, y = a[1] + (b[1] - a[1]) * m;
      d += (k ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2);
    }
    return d + 'Z';
  };

  const ns = 'http://www.w3.org/2000/svg';
  const wrap = document.createElement('div');
  wrap.className = 'seven-story'; wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML =
    '<svg class="seven-story__svg" viewBox="-12 -12 124 124" overflow="visible"><defs>' +
      '<clipPath id="ssClip"><path class="ss-clip"/></clipPath>' +
      '<linearGradient id="ssLime" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8cc152"/><stop offset=".75" stop-color="#a9d46c"/><stop offset="1" stop-color="#d6eeb2"/></linearGradient>' +
      '<linearGradient id="ssDeep" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4f9d63"/><stop offset="1" stop-color="#3f8f55"/></linearGradient>' +
      '<linearGradient id="ssSweepGrad" x1="0" y1="0" x2="1" y2="1"><stop class="ss-s1" offset="0" stop-color="#fff"/><stop class="ss-s2" offset="0" stop-color="#000"/></linearGradient>' +
      '<linearGradient id="ssBandGrad" x1="0" y1="0" x2="1" y2="1"><stop class="ss-b1" offset="0" stop-color="#000"/><stop class="ss-b2" offset="0" stop-color="#fff"/><stop class="ss-b3" offset="0" stop-color="#000"/></linearGradient>' +
      '<mask id="ssBand" maskUnits="userSpaceOnUse" x="-12" y="-12" width="124" height="124"><rect x="-12" y="-12" width="124" height="124" fill="url(#ssBandGrad)"/></mask>' +
      '<mask id="ssSweep" maskUnits="userSpaceOnUse" x="-12" y="-12" width="124" height="124"><rect x="-12" y="-12" width="124" height="124" fill="url(#ssSweepGrad)"/></mask>' +
      '<filter id="ssBlur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.4"/></filter>' +
      '<filter id="ssSoft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation=".45"/></filter>' +
    '</defs>' +
    // outer halo · deep-green face · lime face (split on a soft S-curve) · inner bevel light · rim · new white star
    '<path class="ss-glow" fill="none" stroke="#dcf7e4" stroke-width="4.5" stroke-linejoin="round" opacity=".7" filter="url(#ssBlur)"/>' +
    '<path class="ss-body" fill="url(#ssDeep)"/>' +
    '<g clip-path="url(#ssClip)">' +
      '<path class="ss-lime" d="M52 -20 C49 22 41 58 60 130 L140 130 L140 -20 Z" fill="url(#ssLime)"/>' +
      '<path class="ss-crease" d="M52 -20 C49 22 41 58 60 130" fill="none" stroke="#2e7d3f" stroke-width="1.3" opacity=".6"/>' +
      '<path class="ss-bevel" fill="none" stroke="#ffffff" stroke-width="4" stroke-linejoin="round" opacity=".4" filter="url(#ssSoft)"/>' +
    '</g>' +
    '<path class="ss-rim" fill="none" stroke="#f6fff8" stroke-width="1.6" stroke-linejoin="round" opacity=".95"/>' +
    '<g mask="url(#ssBand)"><path class="ss-sheen" fill="#fff" opacity=".8"/></g>' +
    '<path class="ss-white" fill="#fff" mask="url(#ssSweep)"/>' +
    '</svg>';
  document.body.append(wrap);
  const svg = wrap.querySelector('svg');
  const parts = ['glow', 'body', 'bevel', 'clip', 'rim', 'white'].map(k => svg.querySelector('.ss-' + k));
  const sheen = svg.querySelector('.ss-sheen'), b1 = svg.querySelector('.ss-b1'), b2 = svg.querySelector('.ss-b2'), b3 = svg.querySelector('.ss-b3');
  const lime = svg.querySelector('.ss-lime'), crease = svg.querySelector('.ss-crease');
  const s1 = svg.querySelector('.ss-s1'), s2 = svg.querySelector('.ss-s2');
  const clamp = v => Math.max(0, Math.min(1, v));
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  // 11-08 (c): the glossy star sits in ST★RS from the start; scrolling scrubs the
  // transformation like a film (outline sharpens, white glint sweeps across),
  // then the white star grows into the screen exactly as before.
  let p = 0, raf = 0;
  const END = .45;
  function paint() {
    raf = 0;
    const slot = identity.querySelector('.identity-main-star');
    const r = slot && slot.getBoundingClientRect();
    const onScreen = r && r.width > 4 && r.bottom > -innerHeight * .2 && r.top < innerHeight * 1.2;
    const live = !!onScreen && p < END;
    wrap.classList.toggle('is-on', live);
    identity.classList.toggle('has-seven-story', live);
    if (!live) return;
    const size = r.width * 124 / 86;                     // svg box incl. glow margin ≈ star width / .86
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const m = sm(.04, .17, p);                           // ① outline: puffy → sharp
    const w = sm(.15, .29, p);                           // ② then the white sweep, top-left → bottom-right
    const d = pathAt(m);
    parts.forEach(el => el.setAttribute('d', d)); sheen.setAttribute('d', d);
    const edge = -.3 + 1.55 * w;
    s1.setAttribute('offset', Math.max(0, edge).toFixed(3)); s2.setAttribute('offset', Math.max(0, edge + .1).toFixed(3));
    b1.setAttribute('offset', clamp(edge + .08).toFixed(3)); b2.setAttribute('offset', clamp(edge + .16).toFixed(3)); b3.setAttribute('offset', clamp(edge + .3).toFixed(3));   // glint riding ahead of the white
    parts[0].style.opacity = (1 - w).toFixed(3);          // halo fades with the old surface
    parts[2].style.opacity = (.55 * (1 - w)).toFixed(3);
    crease.style.opacity = (.6 * (1 - m)).toFixed(3);
    parts[4].style.opacity = (.9 * (1 - w)).toFixed(3);
    svg.style.width = svg.style.height = size + 'px';
    svg.style.transform = 'translate3d(' + (x - size / 2) + 'px,' + (y - size / 2) + 'px,0)';
    wrap.style.opacity = (1 - sm(.43, .45, p)).toFixed(3);   // the aperture takes over from here
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(paint); };
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick, { passive: true });
  kick();
  addEventListener('chilsung:star-progress', e => { p = e.detail; kick(); });
})();
