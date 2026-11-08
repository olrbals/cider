/* 11-08 — SEVEN STARS, after the official renewal film:
   the 2000s glossy two-tone star sits in ST★RS → flips over into the new
   flat white star → shrinks to the first of seven stars and the other six
   pop in up the diagonal, like the new logo → the seven gather back into
   the star, which then fills and grows as before. Scroll-driven. */
(() => {
  'use strict';
  const identity = document.getElementById('identity');
  if (!identity || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const STAR = 'M50 6 L61.7 36 H93 L68 55.3 L77.5 86.5 L50 68.2 L22.5 86.5 L32 55.3 L7 36 H38.3 Z';
  const ns = 'http://www.w3.org/2000/svg';
  const wrap = document.createElement('div');
  wrap.className = 'seven-story'; wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML =
    '<div class="seven-story__flip">' +
      '<svg class="seven-story__old" viewBox="0 0 100 100"><defs>' +
        '<linearGradient id="ss-old-l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1fae5d"/><stop offset="1" stop-color="#007f3d"/></linearGradient>' +
        '<linearGradient id="ss-old-r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b6e06a"/><stop offset="1" stop-color="#6cb43c"/></linearGradient>' +
        '<clipPath id="ss-left"><path d="M0 0 H54 L46 100 H0 Z"/></clipPath><clipPath id="ss-right"><path d="M54 0 H100 V100 H46 Z"/></clipPath>' +
        '<filter id="ss-rim" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.6"/></filter>' +
      '</defs>' +
      '<path d="' + STAR + '" fill="url(#ss-old-l)" clip-path="url(#ss-left)"/>' +
      '<path d="' + STAR + '" fill="url(#ss-old-r)" clip-path="url(#ss-right)"/>' +
      '<path d="' + STAR + '" fill="none" stroke="#e9fff1" stroke-width="3.2" stroke-linejoin="round" filter="url(#ss-rim)" opacity=".9"/>' +
      '<path d="M44 20 L50 9 L54 22 Z M33 40 L22 38 L36 46 Z" fill="#fff" opacity=".55" filter="url(#ss-rim)"/>' +
      '</svg>' +
      '<svg class="seven-story__new" viewBox="0 0 100 100"><path d="' + STAR + '"/></svg>' +
    '</div>';
  // Seven-star stack (from the new logo): bottom-left is the biggest, two columns climbing up-right.
  const STACK = [[0, 0, 1], [.36, -.42, .78], [.74, -.42, .78], [.5, -.82, .66], [.86, -.82, .66], [.62, -1.16, .54], [.96, -1.16, .54]];
  const small = STACK.map(() => {
    const s = document.createElementNS(ns, 'svg'); s.setAttribute('viewBox', '0 0 100 100');
    s.innerHTML = '<path d="' + STAR + '"/>'; s.classList.add('seven-story__s'); wrap.append(s); return s;
  });
  document.body.append(wrap);
  const flip = wrap.querySelector('.seven-story__flip'), oldStar = wrap.querySelector('.seven-story__old'), newStar = wrap.querySelector('.seven-story__new');
  const clamp = v => Math.max(0, Math.min(1, v));
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const pop = t => t <= 0 ? 0 : t >= 1 ? 1 : 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

  addEventListener('chilsung:star-progress', e => {
    const p = e.detail;
    const live = p > .015 && p < .36;
    wrap.classList.toggle('is-on', live);
    identity.classList.toggle('has-seven-story', live);
    if (!live) return;
    const target = identity.querySelector('.identity-main-star');
    if (!target) return;
    const r = target.getBoundingClientRect();
    // Full-size star from the start (the slot itself only grows later), anchored on the slot.
    const fs = parseFloat(getComputedStyle(identity.querySelector('.identity-display') || target).fontSize) || 160;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2, S = fs * .9;
    // ① old glossy star, gently tilted (appears)  ② flips into the new white star
    const appear = sm(.015, .06, p), turn = sm(.12, .2, p);
    const angle = turn * 180;
    const shrink = sm(.22, .27, p);                       // white star becomes star #1 of the stack
    const merge = sm(.31, .355, p);                       // the seven gather back into the slot
    const size = S * (1 - .62 * shrink);
    flip.style.cssText = 'width:' + size + 'px;height:' + size + 'px;opacity:' + (appear * (1 - merge * .0)).toFixed(3) +
      ';transform:translate3d(' + (cx - size / 2) + 'px,' + (cy - size / 2) + 'px,0) rotate(' + (-12 * (1 - turn)).toFixed(2) + 'deg) rotateY(' + angle.toFixed(1) + 'deg)';
    oldStar.style.opacity = angle < 90 ? '1' : '0';
    newStar.style.opacity = angle < 90 ? '0' : '1';
    newStar.style.transform = 'rotateY(180deg)';
    // ③ six more stars pop in up the diagonal; ④ all fly back into the slot
    const unit = S * .46;
    small.forEach((s, i) => {
      const [dx, dy, k] = STACK[i];
      const t = i === 0 ? (shrink >= 1 ? 1 : 0) : pop(clamp((p - .24 - i * .011) / .03));
      const sz = unit * k * (1 - .5 * merge);
      const x = cx + dx * unit * 1.25 * (1 - merge), y = cy + dy * unit * 1.25 * (1 - merge);
      s.style.cssText = 'width:' + sz + 'px;height:' + sz + 'px;opacity:' + (t > 0 ? Math.min(1, t) * (1 - merge) : 0).toFixed(3) +
        ';transform:translate3d(' + (x - sz / 2) + 'px,' + (y - sz / 2) + 'px,0) scale(' + Math.max(0, t).toFixed(3) + ')';
    });
    if (shrink >= 1) flip.style.opacity = '0';
  });
})();
