/* One panorama splits into three columns and flip-reveals the
 * three principles. Motion is scrubbed by scroll and fully reversible. */
(() => {
  'use strict';
  const section = document.getElementById('principles-folder');
  const stage = section?.querySelector('.pf-scene');
  const message = section?.querySelector('.principles-folder__message');
  const panels = [...(section?.querySelectorAll('.pf-panel') || [])];
  if (!section || !stage || !message || panels.length !== 3) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = x => Math.min(1, Math.max(0, x));
  const smooth = x => { const t=clamp(x); return t*t*(3-2*t); };
  const phase = (p,a,b) => smooth((p-a)/(b-a));
  let queued = false;

  function render() {
    queued = false;
    const rect = section.getBoundingClientRect();
    const viewport = Math.max(1, window.innerHeight);
    const focus = rect.top < viewport*.42 && rect.bottom > viewport*.48;
    document.body.classList.toggle('is-principles-focus',focus);
    if (rect.top >= viewport || rect.bottom <= 0) return;

    // Reveal the headline only after most of the incoming water wave.
    // Match the wave renderer's (viewport*1.02 - top)/(viewport*1.02).
    const waveProgress = clamp((viewport*1.02 - rect.top) / (viewport*1.02));
    const messageReveal = reduced.matches ? 1 : phase(waveProgress,.73,.95);
    message.style.setProperty('--pf-message-opacity',messageReveal.toFixed(3));
    message.style.setProperty('--pf-message-offset',((1-messageReveal)*15).toFixed(1)+'px');

    const p = reduced.matches ? .73 :
      clamp(-rect.top/Math.max(1,rect.height-viewport));
    const split = reduced.matches ? 1 : phase(p,.09,.29);
    const exit = reduced.matches ? 0 : phase(p,.82,.96);
    stage.style.setProperty('--pf-corner', (split*14).toFixed(2)+'px');

    const panelWidth = panels[0].offsetWidth;
    const gap = 27 * split;
    // 1.4px joined-state overlap conceals subpixel antialias seams.
    // It reaches zero once the panels are separated.
    const overlap = 1.4 * (1-split);
    panels.forEach((panel,index) => {
      const flip = reduced.matches ? 1 : phase(p,.36+index*.026,.59+index*.026);
      const rotation = (index-1)*4*phase(p,.51,.70);
      const x = (index-1)*(panelWidth+gap-overlap);
      const y = (-135 - Math.abs(index-1)*24)*exit;
      const opacity = 1-phase(p,.88,.99);
      const scale = 1-.05*exit;
      panel.style.setProperty('--pf-x', x.toFixed(2)+'px');
      panel.style.setProperty('--pf-y', y.toFixed(2)+'px');
      panel.style.setProperty('--pf-flip', (flip*180).toFixed(2)+'deg');
      panel.style.setProperty('--pf-rotation',rotation.toFixed(2)+'deg');
      panel.style.setProperty('--pf-opacity',opacity.toFixed(3));
      panel.style.setProperty('--pf-scale',scale.toFixed(3));
    });
  }
  function schedule() {
    if(queued)return;
    queued=true;
    requestAnimationFrame(render);
  }
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  reduced.addEventListener?.('change',schedule);
  render();
})();
