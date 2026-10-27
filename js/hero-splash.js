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
  const jetRefract = stage.querySelector('.hs-jet-refraction');
  const canSlot = stage.querySelector('.hero-can-top-slot');
  const dropsGroup = svg.querySelector('.hs-droplets');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 700px)');
  const ns = 'http://www.w3.org/2000/svg';
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  const phase = (value, start, end) => smooth((value - start) / (end - start));
  const number = value => Number(value.toFixed(2));
  const drops = Array.from({ length: 5 }, (_, index) => {
    const group = document.createElementNS(ns, 'g');
    const body = document.createElementNS(ns, 'circle');
    const glint = document.createElementNS(ns, 'circle');
    body.classList.add('hs-droplet');
    body.setAttribute('fill', 'url(#hs-drop-water)');
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
    const settle = phase(p, .025, .23);
    hero.style.setProperty('--hs-can-scale', (1 - .1 * settle).toFixed(4));
    hero.style.setProperty('--hs-can-shift', `${Math.round(stage.clientHeight * .065 * settle)}px`);

    // Read the transformed opening so the liquid stays attached to the can.
    const stageBox = stage.getBoundingClientRect();
    const opening = canSlot.getBoundingClientRect();
    const mouthX = (opening.left + opening.width * .5 - stageBox.left) / stageBox.width * 1000;
    const mouthY = (opening.top + opening.height * .53 - stageBox.top) / stageBox.height * 1000;

    const spread = phase(p, .46, .70);
    const rise = phase(p, .10, .47);
    const fork = phase(p, .28, .45);
    const jetFade = 1 - phase(p, .56, .74);
    const height = Math.max(0, mouthY - 18) * rise;
    const jetTop = mouthY - height;
    const base = Math.max(11, opening.width / stageBox.width * 140);
    const width = base + 29 * rise + 130 * spread;
    const sway = Math.sin(p * 21) * 8 * rise;
    const cx = mouthX + sway;
    // A single thick stem flows into three connected, rounded tips.
    const jetPath = [
      `M ${number(mouthX - base)} ${number(mouthY + 5)}`,
      `C ${number(mouthX - base * 1.25)} ${number(mouthY - height * .35)} ${number(cx - base * 1.3)} ${number(jetTop + 82)} ${number(cx - base * 1.35)} ${number(jetTop + 62)}`,
      `C ${number(cx - base * 1.4)} ${number(jetTop + 40)} ${number(cx - width * .8)} ${number(jetTop + 18)} ${number(cx - width * .74)} ${number(jetTop + 33)}`,
      `C ${number(cx - width * 1.25)} ${number(jetTop + 4)} ${number(cx - width * 1.55 - 12 * fork)} ${number(jetTop + 28)} ${number(cx - width * 1.12 - 12 * fork)} ${number(jetTop + 35)}`,
      `C ${number(cx - width * .8)} ${number(jetTop + 42)} ${number(cx - width * .72)} ${number(jetTop + 5)} ${number(cx - width * .27)} ${number(jetTop + 10)}`,
      `C ${number(cx - width * .1)} ${number(jetTop - 10 - 17 * fork)} ${number(cx + width * .22)} ${number(jetTop - 13 - 19 * fork)} ${number(cx + width * .4)} ${number(jetTop + 10)}`,
      `C ${number(cx + width * .7)} ${number(jetTop + 37)} ${number(cx + width * 1.27 + 14 * fork)} ${number(jetTop + 5)} ${number(cx + width * 1.18 + 14 * fork)} ${number(jetTop + 34)}`,
      `C ${number(cx + width * .9)} ${number(jetTop + 48)} ${number(cx + base * 1.4)} ${number(jetTop + 40)} ${number(cx + base * 1.35)} ${number(jetTop + 62)}`,
      `C ${number(cx + base * 1.3)} ${number(jetTop + 82)} ${number(mouthX + base * 1.25)} ${number(mouthY - height * .35)} ${number(mouthX + base * 1.4)} ${number(mouthY - height * .25)}`,
      `Q ${number(mouthX + base * 1.05)} ${number(mouthY + 7)} ${number(mouthX - base)} ${number(mouthY + 5)} Z`
    ].join(' ');
    jet.setAttribute('d', jetPath);
    jetGlow.setAttribute('d', jetPath);
    jet.style.opacity = (phase(p, .11, .18) * jetFade).toFixed(3);
    jetGlow.style.opacity = (phase(p, .11, .18) * jetFade * .38).toFixed(3);
    if (!mobile.matches && rise > .01) {
      const outline = [
        [mouthX - base, mouthY + 5], [cx - base * 1.3, jetTop + 68],
        [cx - width * .76, jetTop + 35], [cx - width * 1.2, jetTop + 28],
        [cx - width * .28, jetTop + 10], [cx + width * .22, jetTop - 12],
        [cx + width * 1.2, jetTop + 32], [cx + width * .8, jetTop + 54],
        [cx + base * 1.3, jetTop + 68], [mouthX + base, mouthY + 5]
      ];
      jetRefract.style.clipPath = `polygon(${outline.map(([x, y]) => `${number(x / 10)}% ${number(y / 10)}%`).join(',')})`;
      jetRefract.style.opacity = (phase(p, .11, .18) * jetFade * .78).toFixed(3);
    } else {
      jetRefract.style.opacity = '0';
    }

    const flow = phase(p, .60, .98);
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
      const surfaceWave = (Math.sin(u * 16 + p * 9) * 19 + 18 * (1 - Math.abs(u - .5) * 2)) * spread;
      const depth = -12 + 68 * spread + surfaceWave + 1120 * local * taper + ripple;
      points.push([x, depth]);
    }
    const edge = curve(points);
    const reverseEdge = curve([...points].reverse());
    const closed = `M ${number(500 - half)} -80 L ${number(500 + half)} -80 L ${number(points[count][0])} ${number(points[count][1])} ${reverseEdge.slice(reverseEdge.indexOf(' C'))} Z`;
    sheet.setAttribute('d', closed);
    sheetGlint.setAttribute('d', edge);
    const film = spread * phase(p, .60, .68);
    sheet.style.opacity = film.toFixed(3);
    sheetGlint.style.opacity = (film * flow * .76).toFixed(3);

    // The live page is refracted only inside the water silhouette.
    if (!mobile.matches && spread > .01) {
      const polygon = [`${number((500 - half) / 10)}% 0%`, `${number((500 + half) / 10)}% 0%`];
      for (let i = points.length - 1; i >= 0; i--) {
        polygon.push(`${number(points[i][0] / 10)}% ${number(points[i][1] / 10)}%`);
      }
      refract.style.clipPath = `polygon(${polygon.join(',')})`;
      refract.style.opacity = (film * .82).toFixed(3);
    } else {
      refract.style.opacity = '0';
      jetRefract.style.opacity = '0';
    }

    drops.forEach(({ group, body, glint, index }) => {
      const initial = .19 + index * .047;
      const flight = phase(p, initial, .43 + index * .018);
      const separate = phase(p, .57 + (index % 4) * .022, .91 + (index % 3) * .025);
      const x = mouthX + Math.sin(index * 3.7) * (10 + 56 * flight) + Math.sin(p * 16 + index) * 5;
      const y = mouthY - flight * (115 + index * 28) + separate * (240 + index * 39);
      const radius = 3 + (index % 3) * 1.6;
      const visible = phase(p, initial, initial + .05) * (1 - phase(p, .85, 1));
      group.style.opacity = visible.toFixed(3);
      body.setAttribute('cx', number(x));
      body.setAttribute('cy', number(y));
      body.setAttribute('r', number(radius * (1 + .12 * Math.sin(p * 30 + index))));
      glint.setAttribute('cx', number(x - radius * .28));
      glint.setAttribute('cy', number(y - radius * .34));
      glint.setAttribute('r', number(radius * .18));
    });

    // The clear film brightens the hero into the updated white Seven Stars scene.
    const brighten = phase(p, .68, 1);
    const reveal = phase(p, .82, 1);
    const start = [20, 159, 92], end = [255, 255, 255];
    stage.style.backgroundColor = `rgb(${start.map((value, i) => Math.round(value + (end[i] - value) * brighten)).join(',')})`;
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
      hero.style.removeProperty('--hs-can-scale');
      hero.style.removeProperty('--hs-can-shift');
      hero.style.removeProperty('--hs-reveal');
      stage.style.removeProperty('background-color');
      refract.style.opacity = '0';
    } else if (!window.ScrollTrigger?.getById('hero-splash-only')) {
      initialize();
    }
  });
  initialize();
})();
