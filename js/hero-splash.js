/* Hero-only SVG liquid. ScrollTrigger supplies reversible progress; every frame derives from that progress. */
(() => {
  'use strict';
  const hero = document.querySelector('#top.hero');
  const stage = hero?.querySelector('.hero-splash-stage');
  const svg = hero?.querySelector('.hero-splash-effects');
  if (!hero || !stage || !svg) return;

  const jet = svg.querySelector('.hs-jet');
  const jetGlow = svg.querySelector('.hs-jet-glow');
  const sheet = svg.querySelector('.hs-sheet');
  const sheetGlint = svg.querySelector('.hs-sheet-glint');
  const refract = stage.querySelector('.hs-refraction');
  const dropsGroup = svg.querySelector('.hs-droplets');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 700px)');
  const ns = 'http://www.w3.org/2000/svg';
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  const phase = (value, start, end) => smooth((value - start) / (end - start));
  const number = value => Number(value.toFixed(2));
  const drops = Array.from({ length: 11 }, (_, index) => {
    const group = document.createElementNS(ns, 'g');
    const body = document.createElementNS(ns, 'circle');
    const glint = document.createElementNS(ns, 'circle');
    body.classList.add('hs-droplet');
    glint.classList.add('hs-droplet-glint');
    group.append(body, glint);
    dropsGroup.append(group);
    return { group, body, glint, index };
  });

  /* Catmull-Rom conversion keeps each varying drip tangent to its neighbour. */
  function curve(points) {
    let path = `M ${number(points[0][0])} ${number(points[0][1])}`;
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[Math.max(0, i - 1)];
      const b = points[i];
      const c = points[i + 1];
      const d = points[Math.min(points.length - 1, i + 2)];
      path += ` C ${number(b[0] + (c[0] - a[0]) / 6)} ${number(b[1] + (c[1] - a[1]) / 6)} ${number(c[0] - (d[0] - b[0]) / 6)} ${number(c[1] - (d[1] - b[1]) / 6)} ${number(c[0])} ${number(c[1])}`;
    }
    return path;
  }

  function render(progress) {
    const p = clamp(progress);
    if (motion.matches) return;
    hero.style.setProperty('--hs-tab', phase(p, .015, .15).toFixed(4));

    const rise = phase(p, .11, .42);
    const jetFade = 1 - phase(p, .49, .69);
    const jetTop = 153 - 265 * rise;
    const width = 13 + 22 * rise;
    const sway = Math.sin(p * 24) * 10 * rise;
    const jetPath = `M ${number(500 - width)} 160 C ${number(470 - width)} 115 ${number(500 - width - sway)} ${number(jetTop + 75)} ${number(500 - width * .42 + sway)} ${number(jetTop)} Q 500 ${number(jetTop - 24 * rise)} ${number(500 + width * .48 + sway)} ${number(jetTop + 3)} C ${number(515 + width + sway)} ${number(jetTop + 72)} ${number(530 + width)} 117 ${number(500 + width)} 160 Z`;
    jet.setAttribute('d', jetPath);
    jetGlow.setAttribute('d', jetPath);
    jet.style.opacity = (rise * jetFade).toFixed(3);
    jetGlow.style.opacity = (rise * jetFade * .64).toFixed(3);

    const spread = phase(p, .36, .69);
    const flow = phase(p, .52, .98);
    const half = 28 + 550 * spread;
    const points = [];
    const count = mobile.matches ? 8 : 14;
    for (let i = 0; i <= count; i++) {
      const u = i / count;
      const x = 500 - half + 2 * half * u;
      const lag = .015 + .16 * (i % 4) / 3 + .07 * Math.abs(u - .5);
      const local = phase(flow, lag, .94);
      const taper = (1 - Math.abs(u - .5) * .26);
      const ripple = Math.sin(u * 26 + p * 19) * 18 * local * (1 - local);
      const depth = 23 + 1120 * local * taper + ripple;
      points.push([x, depth]);
    }
    const edge = curve(points);
    const reverseEdge = curve([...points].reverse());
    const closed = `M ${number(500 - half)} -80 L ${number(500 + half)} -80 L ${number(points[count][0])} ${number(points[count][1])} ${reverseEdge.slice(reverseEdge.indexOf(' C'))} Z`;
    sheet.setAttribute('d', closed);
    sheetGlint.setAttribute('d', edge);
    sheet.style.opacity = spread.toFixed(3);
    sheetGlint.style.opacity = (spread * .76).toFixed(3);

    // The live page is refracted only inside the water silhouette.
    if (!mobile.matches && spread > .01) {
      const polygon = [`${number((500 - half) / 10)}% 0%`, `${number((500 + half) / 10)}% 0%`];
      for (let i = points.length - 1; i >= 0; i--) {
        polygon.push(`${number(points[i][0] / 10)}% ${number(points[i][1] / 10)}%`);
      }
      refract.style.clipPath = `polygon(${polygon.join(',')})`;
      refract.style.opacity = (spread * .82).toFixed(3);
    } else {
      refract.style.opacity = '0';
    }

    drops.forEach(({ group, body, glint, index }) => {
      const initial = .14 + index * .025;
      const flight = phase(p, initial, .39 + index * .012);
      const separate = phase(p, .57 + (index % 4) * .022, .91 + (index % 3) * .025);
      const x = 500 + Math.sin(index * 3.7) * (18 + 110 * flight) + Math.sin(p * 16 + index) * 9;
      const y = 160 - flight * (170 + index * 23) + separate * (240 + index * 39);
      const radius = 3.5 + (index % 4) * 1.9;
      const visible = phase(p, initial, initial + .05) * (1 - phase(p, .85, 1));
      group.style.opacity = visible.toFixed(3);
      body.setAttribute('cx', number(x));
      body.setAttribute('cy', number(y));
      body.setAttribute('r', number(radius * (1 + .12 * Math.sin(p * 30 + index))));
      glint.setAttribute('cx', number(x - radius * .28));
      glint.setAttribute('cy', number(y - radius * .34));
      glint.setAttribute('r', number(radius * .18));
    });

    // The original blue of SEVEN STARS is exposed as the water passes off screen.
    const reveal = phase(p, .84, 1);
    const start = [20, 159, 92], end = [0, 157, 255];
    stage.style.backgroundColor = `rgb(${start.map((value, i) => Math.round(value + (end[i] - value) * reveal)).join(',')})`;
    hero.style.setProperty('--hs-reveal', reveal.toFixed(4));
  }

  function initialize() {
    if (motion.matches) {
      render(0);
      return;
    }
    if (window.gsap && window.ScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      const trigger = window.ScrollTrigger.create({
        id: 'hero-splash-only',
        trigger: hero,
        start: 'top top',
        end: 'bottom bottom',
        invalidateOnRefresh: true,
        onUpdate: self => render(self.progress),
        onRefresh: self => render(self.progress)
      });
      render(trigger.progress);
    } else {
      // A native fallback preserves the scene when GSAP is unavailable.
      const update = () => render(-hero.getBoundingClientRect().top / Math.max(1, hero.offsetHeight - innerHeight));
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update, { passive: true });
      update();
    }
  }

  motion.addEventListener('change', () => {
    if (motion.matches) {
      window.ScrollTrigger?.getById('hero-splash-only')?.kill();
      hero.style.removeProperty('--hs-tab');
      hero.style.removeProperty('--hs-reveal');
      stage.style.removeProperty('background-color');
      refract.style.opacity = '0';
    } else if (!window.ScrollTrigger?.getById('hero-splash-only')) {
      initialize();
    }
  });
  initialize();
})();
