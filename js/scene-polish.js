/* SEVEN STARS: scroll-grown five-point star in the A position,
 * seven staggered outlined companions and shared fixed edge labels.
 * Hero, liquid wipe, FIZZ and history remain in their own modules. */
(() => {
  'use strict';
  const identity = document.getElementById('identity');
  const korea = document.getElementById('korea');
  if (!identity || !korea) return;

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const smooth = value => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const svgNS = 'http://www.w3.org/2000/svg';
  // A recognizable, balanced five-point star instead of the former eight-point sparkle.
  const fivePoint = 'M50 6 L61.7 36 H93 L68 55.3 L77.5 86.5 L50 68.2 L22.5 86.5 L32 55.3 L7 36 H38.3 Z';
  const svgStar = (className) =>
    '<svg class="' + className + '" viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
      '<defs><clipPath id="identity-main-star-clip"><path d="' + fivePoint + '"/></clipPath></defs>' +
      '<path class="identity-main-star-liquid" d="' + fivePoint + '"/>' +
      '<path class="identity-main-star-outline" d="' + fivePoint + '"/>' +
    '</svg>';

  // Cursor masking has already made independent fill/outline DOM copies.
  // Write the same lettering into every copy, so they sway and grow in sync.
  const headline = identity.querySelector('.identity-display');
  if (headline) headline.setAttribute('aria-label', 'SEVEN STARS');
  const copies = headline
    ? [...headline.querySelectorAll('.site-liquid-type-fill, .site-liquid-type-outline')]
    : [];
  if (!copies.length && headline) copies.push(headline);
  const liquidCopy = identity.querySelector('.identity-liquid-type');
  if (liquidCopy) copies.push(liquidCopy);
  const mainStar = svgStar('identity-main-star');
  copies.forEach(copy => {
    copy.innerHTML =
      '<span class="identity-sway-line identity-sway-line--seven">SEVEN</span>' +
      '<span class="identity-sway-line identity-sway-line--stars">' +
        '<span class="identity-star-letters">ST</span>' +
        '<span class="identity-star-slot">' + mainStar + '</span>' +
        '<span class="identity-star-letters">RS</span>' +
      '</span>';
  });

  const stage = identity.querySelector('.identity-stage');
  const sevenStars = [];
  if (stage) {
    const container = document.createElement('div');
    container.className = 'identity-outline-stars';
    container.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 7; i++) {
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.setAttribute('class', 'identity-outline-star');
      svg.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', fivePoint);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
      svg.append(path);
      container.append(svg);
      sevenStars.push(svg);
    }
    stage.append(container);
  }

  function renderSevenStars() {
    if (!stage) return;
    const height = Math.max(1, window.innerHeight);
    const rect = identity.getBoundingClientRect();
    const available = Math.max(1, rect.height - height);
    const p = reduce.matches ? 1 : clamp(-rect.top / available);
    // First a tiny outlined star is born between T and R, then the
    // growing slot pushes them apart rather than overlapping the letters.
    const growth = smooth((p - .075) / .46);
    const reveal = smooth((p - .055) / .18);
    const fill = smooth((p - .53) / .28);
    identity.style.setProperty('--identity-star-slot', (.055 + .86 * growth).toFixed(4) + 'em');
    identity.style.setProperty('--identity-star-scale', (.18 + .82 * growth).toFixed(4));
    identity.style.setProperty('--identity-star-opacity', (.12 + .88 * reveal).toFixed(4));
    identity.style.setProperty('--identity-star-fill', (100 * fill).toFixed(2) + '%');
    // All seven companions remain outline-only, fade in successively and
    // hold their position. Unlike the main star, none receive a fill.
    sevenStars.forEach((star, index) => {
      const fade = smooth((p - (.20 + index * .065)) / .22);
      star.style.opacity = (fade * .58).toFixed(3);
      star.style.transform = 'scale(' + (.74 + .26 * fade).toFixed(3) + ')';
    });
  }

  // A single viewport-anchored overlay serves both scenes. The original
  // per-section labels remain as a no-JavaScript fallback.
  const keys = ['top-left', 'bottom-left', 'top-right', 'bottom-right'];
  const sourceLabels = keys.map(key => identity.querySelector('.section-edge-label--' + key));
  if (sourceLabels.some(label => !label)) return;
  const overlay = document.createElement('div');
  overlay.className = 'scene-edge-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  const labels = keys.map((key, index) => {
    const label = document.createElement('span');
    label.className = 'scene-edge-label scene-edge-label--' + key;
    label.textContent = sourceLabels[index].textContent;
    overlay.append(label);
    return label;
  });
  document.body.append(overlay);
  document.documentElement.classList.add('has-scene-edge-overlay');

  let pending = false;
  function update() {
    pending = false;
    renderSevenStars();
    const height = Math.max(1, window.innerHeight);
    const identityTop = identity.getBoundingClientRect().top;
    const koreaRect = korea.getBoundingClientRect();
    const visible = identityTop < height * .95 && koreaRect.bottom > height * .91;
    overlay.classList.toggle('is-visible', visible);

    // During the yellow wave the lower corners are submerged before the top.
    // Change their text contrast separately without moving their coordinates.
    const topYellow = koreaRect.top <= height * (reduce.matches ? 0 : .2);
    const bottomYellow = koreaRect.top <= height * (reduce.matches ? 0 : .57);
    labels[0].classList.toggle('is-on-yellow', topYellow);
    labels[2].classList.toggle('is-on-yellow', topYellow);
    labels[1].classList.toggle('is-on-yellow', bottomYellow);
    labels[3].classList.toggle('is-on-yellow', bottomYellow);
  }
  function requestUpdate() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(update);
  }
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
  reduce.addEventListener('change', requestUpdate);
  requestUpdate();
})();
