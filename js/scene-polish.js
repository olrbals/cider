/* Focused polish for the two post-Hero brand scenes.
 * No changes to the Hero wave, mouse particles, fountain or 3D history. */
(() => {
  'use strict';
  const identity = document.getElementById('identity');
  const korea = document.getElementById('korea');
  if (!identity || !korea) return;

  // The cursor typography layer may have cloned the original headline.
  // Wrap the LIVE text in both visible clones and the separate cursor layer.
  // Keeping the exact same keyframes on all copies prevents mask drift.
  const identityHeadline = identity.querySelector('.identity-display');
  const twins = identityHeadline
    ? [...identityHeadline.querySelectorAll('.site-liquid-type-fill, .site-liquid-type-outline')]
    : [];
  if (twins.length === 0 && identityHeadline) twins.push(identityHeadline);
  const liquidType = identity.querySelector('.identity-liquid-type');
  if (liquidType) twins.push(liquidType);
  twins.forEach(node => {
    if (node.querySelector('.identity-sway-line')) return;
    const words = node.innerHTML.split(/<br\s*\/?\s*>/i);
    if (words.length !== 2) return;
    node.innerHTML =
      '<span class="identity-sway-line identity-sway-line--seven">' + words[0] + '</span>' +
      '<span class="identity-sway-line identity-sway-line--stars">' + words[1] + '</span>';
  });

  const stage = identity.querySelector('.identity-stage');
  if (stage) {
    const stars = document.createElement('div');
    stars.className = 'identity-outline-stars';
    stars.setAttribute('aria-hidden', 'true');
    const namespace = 'http://www.w3.org/2000/svg';
    // Same eight-pointed Chilsung outline geometry used by the existing brand assets.
    const outline = 'M22.4209 13.0879L22.5762 13.7812L23.1758 13.4004L32.5244 7.47461L26.5996 16.8242L26.2188 17.4238L26.9121 17.5791L37.7119 20L26.9121 22.4209L26.2188 22.5762L26.5996 23.1758L32.5244 32.5244L23.1758 26.5996L22.5762 26.2188L22.4209 26.9121L20 37.7119L17.5791 26.9121L17.4238 26.2188L16.8242 26.5996L7.47461 32.5244L13.4004 23.1758L13.7812 22.5762L13.0879 22.4209L2.28711 20L13.0879 17.5791L13.7812 17.4238L13.4004 16.8242L7.47461 7.47461L16.8242 13.4004L17.4238 13.7812L17.5791 13.0879L20 2.28711L22.4209 13.0879Z';
    for (let index = 0; index < 7; index++) {
      const svg = document.createElementNS(namespace, 'svg');
      svg.setAttribute('viewBox', '0 0 40 40');
      svg.setAttribute('class', 'identity-outline-star');
      svg.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS(namespace, 'path');
      path.setAttribute('d', outline);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
      svg.append(path);
      stars.append(svg);
    }
    stage.append(stars);

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        identity.classList.toggle('is-seven-active', entries[0].isIntersecting);
      }, { threshold: 0.03 });
      observer.observe(identity);
    } else {
      identity.classList.add('is-seven-active');
    }
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

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let pending = false;
  function update() {
    pending = false;
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
