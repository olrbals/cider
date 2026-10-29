/* Chilsung RICH: scroll-scrubbed product-first, rounded liquid sweep,
   fruit depth and idle hover. Independent of Hero and History modules. */
(() => {
  'use strict';
  const section = document.querySelector('#rich-flavors');
  if (!section) return;
  const intro = section.querySelector('.rich-new-flavor');
  const panels = [
    { name: 'peach', node: section.querySelector('.rich-fg--peach'),
      bottle: [.285, .45], background: [.365, .56], fruit: [.385, .585], caption: [.51, .635] },
    { name: 'grape', node: section.querySelector('.rich-fg--grape'),
      bottle: [.60, .755], background: [.69, .855], fruit: [.715, .88], caption: [.80, .925] }
  ];
  if (!intro || panels.some(p => !p.node)) return;

  // Separate GPU-composited travel from the original Figma image rotations.
  // The inner "bob" layer never changes the layout or original image texture.
  panels.forEach((panel, panelIndex) => {
    panel.sweep = panel.node.querySelector('.rich-fg__sweep');
    panel.captionNode = panel.node.querySelector('.rich-fg__caption');
    const elements = [...panel.node.querySelectorAll(
      '.rich-fg__bottle,.rich-fg__fruit,.rich-fg__fruit-group'
    )];
    panel.shells = elements.map((element, index) => {
      const bottle = element.classList.contains('rich-fg__bottle');
      const shell = document.createElement('span');
      const bob = document.createElement('span');
      shell.className = 'rich-fg__motion-shell';
      shell.dataset.role = bottle ? 'bottle' : 'fruit';
      shell.dataset.ordinal = String(index);
      bob.className = 'rich-fg__bob';
      shell.style.left = element.style.left || '0px';
      shell.style.top = element.style.top || '0px';
      shell.style.width = element.style.width || (element.getAttribute('width') || '96') + 'px';
      shell.style.height = element.style.height || (element.getAttribute('height') || '96') + 'px';
      bob.style.setProperty('--fg-bob-duration', (4 + (index % 4) * .55) + 's');
      bob.style.setProperty('--fg-bob-delay', (-.7 * index - panelIndex) + 's');
      const parent = element.parentElement;
      parent.insertBefore(shell, element);
      shell.appendChild(bob);
      bob.appendChild(element);
      element.style.left = '0';
      element.style.top = '0';
      element.style.width = '100%';
      element.style.height = '100%';
      return { shell, bottle, index };
    });
  });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = x => Math.min(1, Math.max(0, x));
  const ease = (a, b, x) => {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  let frame = 0;
  let pointerX = 0;
  let pointerY = 0;
  let viewportWidth = innerWidth;
  let viewportHeight = innerHeight;

  function geometry() {
    viewportWidth = innerWidth;
    viewportHeight = innerHeight;
    const scale = Math.min(viewportWidth / 1440, viewportHeight / 900);
    const bottomBandTop = (viewportHeight - 900 * scale) / 2 + 648 * scale;
    section.style.setProperty('--rich-design-scale', scale.toFixed(5));
    section.style.setProperty('--rich-band-top', bottomBandTop.toFixed(2) + 'px');
  }

  function updatePanel(panel, p) {
    const bottleProgress = reducedMotion.matches ? Number(p >= panel.bottle[0]) :
      ease(panel.bottle[0], panel.bottle[1], p);
    const backgroundProgress = reducedMotion.matches ? Number(p >= panel.background[0]) :
      ease(panel.background[0], panel.background[1], p);
    const fruitProgress = reducedMotion.matches ? Number(p >= panel.fruit[0]) :
      ease(panel.fruit[0], panel.fruit[1], p);
    const captionProgress = reducedMotion.matches ? Number(p >= panel.caption[0]) :
      ease(panel.caption[0], panel.caption[1], p);

    panel.node.style.visibility = p >= panel.bottle[0] - .025 ? 'visible' : 'hidden';
    panel.sweep.style.setProperty('--fg-sweep-x',
      ((1 - backgroundProgress) * viewportWidth * 1.13).toFixed(1) + 'px');
    panel.captionNode.style.setProperty('--fg-caption-opacity', captionProgress.toFixed(3));
    panel.captionNode.style.setProperty('--fg-caption-x',
      ((1 - captionProgress) * 65).toFixed(1) + 'px');

    panel.shells.forEach(({ shell, bottle, index }) => {
      const stagger = bottle ? 0 : (index % 5) * .022;
      const local = bottle ? bottleProgress :
        reducedMotion.matches ? fruitProgress :
        ease(panel.fruit[0] + stagger, panel.fruit[1] + stagger, p);
      // The bottle crosses ahead of the flavor-color curtain.
      const direction = bottle ? 1 : (index % 3 === 0 ? -1 : 1);
      const initialX = bottle ? viewportWidth * .75 : viewportWidth * (.32 + (index % 4) * .11);
      const entryX = (1 - local) * initialX * direction - pointerX * (bottle ? 22 : 44) * local;
      const entryY = (1 - local) * (bottle ? -48 : (index % 2 ? -96 : 115)) - pointerY * (bottle ? 16 : 36) * local;
      const turnY = bottle ? (1 - local) * (panel.name === 'peach' ? 20 : -18) : (1 - local) * 11;
      const turnZ = bottle ? (1 - local) * (panel.name === 'peach' ? 12 : -13) :
        (1 - local) * (index % 2 ? -12 : 12);
      const scale = bottle ? .86 + .14 * local : .75 + .25 * local;
      shell.style.opacity = local.toFixed(3);
      shell.style.setProperty('--fg-entry-x', entryX.toFixed(1) + 'px');
      shell.style.setProperty('--fg-entry-y', entryY.toFixed(1) + 'px');
      shell.style.setProperty('--fg-turn-y', turnY.toFixed(2) + 'deg');
      shell.style.setProperty('--fg-turn-z', turnZ.toFixed(2) + 'deg');
      shell.style.setProperty('--fg-entry-scale', scale.toFixed(3));
    });
  }

  function render() {
    frame = 0;
    const rect = section.getBoundingClientRect();
    if (rect.top > viewportHeight || rect.bottom < 0) return;
    const range = Math.max(1, section.offsetHeight - viewportHeight);
    const progress = clamp(-rect.top / range);
    const introProgress = reducedMotion.matches ? Number(progress >= .11) :
      ease(0, .22, progress);
    intro.style.transform = 'translate3d(0,' +
      ((1 - introProgress) * 100).toFixed(3) + '%,0)';
    panels.forEach(panel => updatePanel(panel, progress));
  }
  function requestFrame() { if (!frame) frame = requestAnimationFrame(render); }
  function resize() { geometry(); requestFrame(); }
  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pageshow', resize);
  reducedMotion.addEventListener?.('change', requestFrame);
  section.addEventListener('pointermove', event => {
    if (reducedMotion.matches || event.pointerType === 'touch') return;
    pointerX = event.clientX / Math.max(1, viewportWidth) - .5;
    pointerY = event.clientY / Math.max(1, viewportHeight) - .5;
    requestFrame();
  }, { passive: true });
  section.addEventListener('pointerleave', () => {
    pointerX = pointerY = 0;
    requestFrame();
  }, { passive: true });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      section.classList.toggle('is-visible', entries[0]?.isIntersecting ?? false);
      if (entries[0]?.isIntersecting) requestFrame();
    }, { rootMargin: '120px 0px 120px 0px' });
    observer.observe(section);
  } else {
    section.classList.add('is-visible');
  }
  section.classList.add('rich-motion-ready');
  resize();
})();
