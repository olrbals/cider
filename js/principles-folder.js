/* Three translucent water-glass layers. Scroll changes the visible principle:
 * PURE -> CLEAR -> CAFFEINE FREE, then the layers return to one center.
 * Reversible poses, no timers, canvas or heavy blur filters. */
(() => {
  'use strict';
  const section = document.getElementById('principles-folder');
  if (!section) return;
  const layers = [...section.querySelectorAll('.pf-glass')];
  const counter = section.querySelector('.pf-progress__count');
  const track = section.querySelector('.pf-progress__track');
  if (layers.length !== 3 || !counter || !track) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = x => Math.min(1, Math.max(0, x));
  const smooth = x => { const t = clamp(x); return t * t * (3 - 2 * t); };
  const phase = (p, a, b) => smooth((p - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const stages = [
    [{x:0,y:0,s:1,r:0}, {x:38,y:30,s:.94,r:1.1}, {x:-34,y:54,s:.88,r:-1.6}],
    [{x:-145,y:-18,s:.87,r:-3}, {x:0,y:0,s:1,r:0}, {x:48,y:34,s:.94,r:1.5}],
    [{x:-95,y:25,s:.91,r:-1.5}, {x:145,y:-16,s:.87,r:3}, {x:0,y:0,s:1,r:0}],
    [{x:-12,y:7,s:.98,r:-.5}, {x:15,y:-6,s:.98,r:.5}, {x:0,y:0,s:1,r:0}]
  ];
  let requested = false;

  function render() {
    requested = false;
    const rect = section.getBoundingClientRect();
    if (rect.top >= innerHeight || rect.bottom <= 0) return;
    const view = Math.max(1, innerHeight);
    const p = reduced.matches ? 1 : clamp(-rect.top / Math.max(1, rect.height - view));
    const a = phase(p, .16, .37);
    const b = phase(p, .43, .64);
    const c = phase(p, .73, .93);
    const visibility = [
      1 - phase(p, .20, .35),
      phase(p, .20, .35) * (1 - phase(p, .48, .61)),
      phase(p, .48, .61)
    ];
    const active = p < .29 ? 0 : p < .55 ? 1 : 2;
    const current = String(active + 1).padStart(2, '0');
    counter.textContent = current + ' / 03';
    track.style.setProperty('--pf-progress', ((active + 1) / 3).toFixed(3));

    layers.forEach((el, i) => {
      const pose = {};
      for (const k of ['x','y','s','r']) {
        const first = lerp(stages[0][i][k], stages[1][i][k], a);
        const second = lerp(first, stages[2][i][k], b);
        pose[k] = lerp(second, stages[3][i][k], c);
      }
      const mobileScale = Math.min(1, Math.max(.55, innerWidth / 1100));
      el.style.setProperty('--pf-x', (pose.x * mobileScale).toFixed(2) + 'px');
      el.style.setProperty('--pf-y', (pose.y * mobileScale).toFixed(2) + 'px');
      el.style.setProperty('--pf-scale', pose.s.toFixed(4));
      el.style.setProperty('--pf-rotation', pose.r.toFixed(2) + 'deg');
      el.style.setProperty('--pf-word-opacity', visibility[i].toFixed(3));
      el.style.zIndex = i === active ? '4' : String(3 - i);
    });
  }
  function requestRender() {
    if (requested) return;
    requested = true;
    requestAnimationFrame(render);
  }
  addEventListener('scroll', requestRender, {passive: true});
  addEventListener('resize', requestRender, {passive: true});
  reduced.addEventListener?.('change', requestRender);
  render();
})();
