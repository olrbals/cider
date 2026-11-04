/* Three equal white cards float, merge into one statement, then turn
 * together to reveal the green Chilsung Cider panorama. Scroll controls
 * every transition, so the complete sequence remains reversible. */
(() => {
  'use strict';
  const section = document.getElementById('principles-folder');
  const stage = section?.querySelector('.pf-scene');
  const mergeMessage = section?.querySelector('.pf-merge-message');
  const panels = [...(section?.querySelectorAll('.pf-panel') || [])];
  if (!section || !stage || !mergeMessage || panels.length !== 3) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = x => Math.min(1, Math.max(0, x));
  const smooth = x => { const t=clamp(x); return t*t*(3-2*t); };
  const phase = (p,a,b) => smooth((p-a)/(b-a));
  const backOut = (x, amount=.82) => {
    const t=clamp(x)-1;
    return 1+(amount+1)*t*t*t+amount*t*t;
  };
  let queued = false;

  function render() {
    queued = false;
    const rect = section.getBoundingClientRect();
    const viewport = Math.max(1,window.innerHeight);
    const focus = rect.top < viewport*.46 && rect.bottom > viewport*.46;
    document.body.classList.toggle('is-principles-focus',focus);
    if (rect.top >= viewport || rect.bottom <= 0) return;

    const p = reduced.matches ? 0 :
      clamp(-rect.top/Math.max(1,rect.height-viewport));
    const joinRaw = reduced.matches ? 0 : phase(p,.13,.37);
    const join = clamp(backOut(joinRaw,.9));
    const flipRaw = reduced.matches ? 0 : phase(p,.55,.80);
    const flipArc = reduced.matches ? 0 : Math.sin(flipRaw*Math.PI);
    const faceSwap = phase(flipRaw,.46,.54);
    const statementIn = reduced.matches ? 0 : phase(p,.23,.34);
    const statementOpacity = statementIn*(1-faceSwap);
    const labelsOut = reduced.matches ? 0 : phase(p,.18,.29);
    const exit = reduced.matches ? 0 : phase(p,.89,.99);

    section.classList.toggle('is-pf-intro',!reduced.matches && p < .13);
    stage.style.setProperty('--pf-scene-scale',(1-.025*join-.045*exit).toFixed(4));
    stage.style.setProperty('--pf-scene-flip',(flipArc*90).toFixed(2)+'deg');
    stage.style.setProperty('--pf-corner',(14*(1-join)).toFixed(2)+'px');
    mergeMessage.style.setProperty('--pf-merge-opacity',statementOpacity.toFixed(3));
    mergeMessage.style.setProperty('--pf-merge-flip','0deg');

    const panelWidth = panels[0].offsetWidth;
    const initialGap = window.innerWidth <= 800 ? 15 : 28;
    const gap = initialGap*(1-join);
    const overlap = 3*join;
    panels.forEach((panel,index) => {
      const mergeHop = reduced.matches ? 0 : -Math.sin(joinRaw*Math.PI)*(index===1 ? 8 : 5);
      const x = (index-1)*(panelWidth+gap-overlap);
      const y = mergeHop+(-144-Math.abs(index-1)*20)*exit;
      const opacity = 1-phase(p,.91,.995);
      panel.style.setProperty('--pf-x',x.toFixed(2)+'px');
      panel.style.setProperty('--pf-y',y.toFixed(2)+'px');
      panel.style.setProperty('--pf-z','0px');
      panel.style.setProperty('--pf-flip','0deg');
      panel.style.setProperty('--pf-front-opacity',faceSwap.toFixed(3));
      panel.style.setProperty('--pf-back-opacity',(1-faceSwap).toFixed(3));
      panel.style.setProperty('--pf-principle-content-opacity',(1-labelsOut).toFixed(3));
      panel.style.setProperty('--pf-rotation','0deg');
      panel.style.setProperty('--pf-opacity',opacity.toFixed(3));
      panel.style.setProperty('--pf-scale',(1-.02*exit).toFixed(3));
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
