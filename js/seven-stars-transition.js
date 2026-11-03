/* 칠성사이다 / seven-star meteor sweep.
 * Only the FIZZ -> PRINCIPLES transition. Exact seven stars, each independently
 * delayed along a diagonal from top-right to bottom-left.
 * Reversible scroll-scrub; other section waves are untouched. */
(() => {
  'use strict';
  const next = document.getElementById('principles-folder');
  const fizz = document.getElementById('korea');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!next || !fizz || reduced.matches) return;
  const ns = 'http://www.w3.org/2000/svg';
  const clamp = x => Math.max(0, Math.min(1, x));
  const smooth = x => { const t = clamp(x); return t*t*(3-2*t); };
  const phase = (p, a, b) => smooth((p-a)/(b-a));
  const mix = (a, b, t) => a+(b-a)*t;
  const element = (name, cls) => {
    const node = document.createElementNS(ns, name);
    if(cls) node.setAttribute('class',cls);
    return node;
  };
  const overlay = document.createElement('div');
  overlay.className = 'seven-stars-transition';
  overlay.setAttribute('aria-hidden','true');
  const svg = element('svg');
  svg.setAttribute('preserveAspectRatio','none');
  svg.setAttribute('focusable','false');
  const defs = element('defs');
  const starGradient=element('linearGradient');
  starGradient.id='seven-meteor-star-fill';
  starGradient.setAttribute('x1','0');starGradient.setAttribute('y1','0');
  starGradient.setAttribute('x2','1');starGradient.setAttribute('y2','1');
  [[0,'#eafff1'],[.5,'#adebc9'],[1,'#65d89f']].forEach(([offset,color])=>{
    const stop=element('stop');stop.setAttribute('offset',String(offset));
    stop.setAttribute('stop-color',color);starGradient.append(stop);
  });
  const trailGradient=element('linearGradient');
  trailGradient.id='seven-meteor-trail';
  trailGradient.setAttribute('x1','0%');trailGradient.setAttribute('y1','100%');
  trailGradient.setAttribute('x2','100%');trailGradient.setAttribute('y2','0%');
  [[0,'#eafff2',.62],[.45,'#b7f2d2',.24],[1,'#b7f2d2',0]].forEach(([off,color,alpha])=>{
    const stop=element('stop');stop.setAttribute('offset',String(off));
    stop.setAttribute('stop-color',color);stop.setAttribute('stop-opacity',String(alpha));
    trailGradient.append(stop);
  });
  defs.append(starGradient,trailGradient);
  svg.append(defs);
  const wash = element('path','seven-stars-transition__wash');
  const edge = element('path','seven-stars-transition__edge');
  svg.append(wash,edge);
  // A subtle constellation: 2 + 2 + 2 + 1 stars, referencing the supplied logo.
  const formation = [
    {x:-96,y:-144,size:71}, {x:72,y:-161,size:64},
    {x:-121,y:-18,size:83}, {x:51,y:-26,size:72},
    {x:-170,y:126,size:93}, {x:0,y:119,size:84},
    {x:-208,y:265,size:107}
  ];
  const pathData='M50 6 L61.7 36 H93 L68 55.3 L77.5 86.5 L50 68.2 L22.5 86.5 L32 55.3 L7 36 H38.3 Z';
  const stars=formation.map((shape,i)=>{
    const group=element('g');
    const trail=element('path','seven-stars-transition__trail');
    trail.setAttribute('d','M 74 28 Q 135 -28 216 -112');
    const fine=element('path','seven-stars-transition__trail seven-stars-transition__trail--fine');
    fine.setAttribute('d','M 86 44 Q 155 -7 240 -90');
    const halo=element('path','seven-stars-transition__halo');
    halo.setAttribute('d',pathData);
    halo.setAttribute('transform','translate(-2 -2) scale(1.04)');
    const main=element('path','seven-stars-transition__star');
    main.setAttribute('d',pathData);
    group.append(trail,fine,halo,main);
    svg.append(group);
    return {node:group,...shape,index:i};
  });
  overlay.append(svg);
  document.body.append(overlay);
  let w=0,h=0,queued=false;
  function resize() {
    w=Math.max(1,window.innerWidth);
    h=Math.max(1,window.innerHeight);
    svg.setAttribute('viewBox','0 0 '+w+' '+h);
  }
  function render() {
    queued=false;
    if (reduced.matches || document.hidden) { overlay.classList.remove('is-active'); return; }
    const top=next.getBoundingClientRect().top;
    // One viewport of natural scrolling, ending as the new scene locks in.
    const p=clamp((h*1.04-top)/(h*1.04));
    const active=p>.015&&p<.998;
    overlay.classList.toggle('is-active',active);
    if(!active) return;

    // x-y threshold: the mint wash reaches the upper-right first, then
    // progressively sweeps towards the lower-left. Curve adds a liquid shoulder.
    const advance=smooth(p);
    const threshold=mix(w+h*.50,-h-w*.30,advance);
    const samples=[];
    for(let i=0;i<=28;i++){
      const x=(i/28)*w;
      const curl=Math.sin(i/28*Math.PI*1.45+advance*2.3)*h*.042*Math.sin(advance*Math.PI);
      samples.push([x,x-threshold+curl]);
    }
    const down=samples.slice().reverse();
    const boundary=down.map(v=>v[0].toFixed(1)+','+v[1].toFixed(1)).join(' L ');
    wash.setAttribute('d','M0,-40 L'+w+',-40 L'+boundary+' Z');
    edge.setAttribute('d','M'+samples[0][0].toFixed(1)+','+samples[0][1].toFixed(1)+' L '+
      samples.slice(1).map(v=>v[0].toFixed(1)+','+v[1].toFixed(1)).join(' L '));
    const endFade=1-phase(p,.81,.98);
    const washAlpha=(.80*endFade).toFixed(3);
    wash.style.opacity=washAlpha;
    edge.style.opacity=(.40*endFade).toFixed(3);

    const unit=Math.min(1.18,Math.max(.47,Math.min(w/1440,h/900)));
    stars.forEach(({node,x,y,size,index})=>{
      const delay=index*.024;
      const travel=phase(p,.045+delay,.73+delay);
      const cx=mix(w*1.20,-w*.21,travel)+x*unit;
      const cy=mix(-h*.28,h*1.20,travel)+y*unit;
      const fadeIn=phase(p,.045+delay,.17+delay);
      const fadeOut=1-phase(p,.75+delay*.35,.94+delay*.2);
      const scale=unit*(size/100)*( .80+.20*travel );
      node.setAttribute('transform','translate('+(cx-50*scale).toFixed(1)+' '+(cy-50*scale).toFixed(1)+') scale('+scale.toFixed(4)+')');
      node.style.opacity=(fadeIn*fadeOut*.92).toFixed(3);
    });
  }
  function update() {
    if(queued) return;
    queued=true;
    window.requestAnimationFrame(render);
  }
  window.addEventListener('scroll',update,{passive:true});
  window.addEventListener('resize',()=>{resize();update();},{passive:true});
  reduced.addEventListener?.('change',update);
  document.addEventListener('visibilitychange',update);
  resize();render();
})();
