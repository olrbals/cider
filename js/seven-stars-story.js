/* 11-08 — SEVEN STARS, after the official renewal film: the glossy 2000s
   star (soft, puffy, two-tone with a white rim glow) sits in ST★RS; as you
   scroll it stretches and melts, and a clean white sweep runs diagonally
   across it, leaving the sharp, flat new star — which then fills the slot
   and grows into the white screen as before. Scroll-driven, reversible. */
(() => {
  'use strict';
  const identity = document.getElementById('identity');
  if (!identity || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const STAR = 'M50 6 L61.7 36 H93 L68 55.3 L77.5 86.5 L50 68.2 L22.5 86.5 L32 55.3 L7 36 H38.3 Z';
  const wrap = document.createElement('div');
  wrap.className = 'seven-story'; wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML =
    '<img class="seven-story__old" src="img/brand/star-heritage.png" alt="" decoding="async">' +
    '<svg class="seven-story__new" viewBox="0 0 100 100"><path d="' + STAR + '"/></svg>';
  document.body.append(wrap);
  const oldStar = wrap.querySelector('.seven-story__old'), newStar = wrap.querySelector('.seven-story__new');
  const clamp = v => Math.max(0, Math.min(1, v));
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  addEventListener('chilsung:star-progress', e => {
    const p = e.detail;
    const live = p > .012 && p < .27;
    wrap.classList.toggle('is-on', live);
    identity.classList.toggle('has-seven-story', live);
    if (!live) return;
    const target = identity.querySelector('.identity-main-star');
    if (!target) return;
    const r = target.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2, S = r.width;
    const appear = sm(.012, .06, p);
    const melt = sm(.09, .2, p);                 // puffy → stretched, softening
    const sweep = sm(.15, .245, p);              // diagonal white sweep, top-left → bottom-right
    const bob = Math.sin(p * 90) * 2 * (1 - melt);
    // Heritage star: tilted, glowing; stretches taller and blurs as it melts.
    const hw = S * 1.0 * (.7 + .3 * appear);
    oldStar.style.width = hw + 'px';
    oldStar.style.opacity = (appear * (1 - sm(.23, .25, p))).toFixed(3);
    oldStar.style.transform = 'translate3d(' + (cx - hw / 2) + 'px,' + (cy - hw * .505 + bob) + 'px,0) rotate(' + (-10 * (1 - melt)).toFixed(2) +
      'deg) scale(' + (1 - .04 * melt).toFixed(3) + ',' + (1 + .12 * melt).toFixed(3) + ')';
    oldStar.style.filter = 'blur(' + (melt * 2.4 * (1 - sweep)).toFixed(2) + 'px) saturate(' + (1 + .25 * melt).toFixed(2) + ')';
    // The sweep: where it has passed, the new flat star shows; ahead of it, the glossy one.
    const edge = -20 + 140 * sweep, soft = 22;
    const m1 = 'linear-gradient(135deg,#000 ' + edge + '%,transparent ' + (edge + soft) + '%)';
    const m2 = 'linear-gradient(135deg,transparent ' + edge + '%,#000 ' + (edge + soft) + '%)';
    newStar.style.webkitMaskImage = newStar.style.maskImage = m1;
    oldStar.style.webkitMaskImage = oldStar.style.maskImage = sweep > 0 && sweep < 1 ? m2 : 'none';
    newStar.style.width = newStar.style.height = S + 'px';
    newStar.style.opacity = sweep > 0 ? '1' : '0';
    newStar.style.transform = 'translate3d(' + (cx - S / 2) + 'px,' + (cy - S / 2) + 'px,0) scale(' + (1 + .1 * (1 - sweep) * melt).toFixed(3) + ',' + (1 + .14 * (1 - sweep) * melt).toFixed(3) + ')';
  });
})();
