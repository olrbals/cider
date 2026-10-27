(() => {
  'use strict';
  const scene = document.querySelector('.pop-scene');
  if (!scene) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.min(1, Math.max(0, value));
  const ease = value => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };
  let frame = 0;

  function update() {
    frame = 0;
    const viewport = Math.max(1, window.innerHeight);
    const scale = window.innerWidth <= 700
      ? Math.max(.4, window.innerWidth / 1440)
      : Math.min(window.innerWidth / 1440, viewport / 774);
    scene.style.setProperty('--pop-scale', scale.toFixed(4));
    scene.style.setProperty('--pop-left', ((window.innerWidth - 1440 * scale) / 2).toFixed(2) + 'px');
    scene.style.setProperty('--pop-top', ((viewport - 774 * scale) / 2).toFixed(2) + 'px');
    if (motion.matches) return;
    const rect = scene.getBoundingClientRect();
    const distance = Math.max(1, rect.height - viewport);
    const progress = clamp(-rect.top / distance);
    scene.style.setProperty('--pop-together', ease((progress - .47) / .07).toFixed(4));
    scene.style.setProperty('--pop-spark', ease((progress - .53) / .05).toFixed(4));
  }
  function requestUpdate() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
  motion.addEventListener('change', requestUpdate);
  requestUpdate();
})();
