/* CHILSUNG: seven actual star-shaped apertures tear the yellow FIZZ
 * scene open to reveal the REAL principles stage behind them.
 * No colored curtain or translucent wash. Scroll/reverse-scroll reversible. */
(() => {
  'use strict';
  const fizz = document.getElementById('korea');
  const incoming = document.getElementById('principles-folder');
  const stage = incoming?.querySelector('.principles-folder__stage');
  if (!fizz || !incoming || !stage) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ns = 'http://www.w3.org/2000/svg';
  const clamp = n => Math.max(0, Math.min(1, n));
  const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
  const phase = (n,a,b) => smooth((n-a)/(b-a));
  const mix = (a,b,t) => a+(b-a)*t;
  const make = (tag, className) => {
    const node = document.createElementNS(ns,tag);
    if(className)node.setAttribute('class',className);
    return node;
  };
  // Original seven-star arrangement: 2 + 2 + 2 + 1. Only these
  // seven stars are cut into the current screen.
  const formation = [
    {x:-99,y:-142,r:81}, {x:74,y:-155,r:75},
    {x:-124,y:-20,r:88}, {x:49,y:-16,r:80},
    {x:-162,y:122,r:98}, {x:11,y:111,r:91},
    {x:-210,y:262,r:111}
  ];
  const overlay = document.createElement('div');
  overlay.className = 'seven-stars-transition';
  overlay.setAttribute('aria-hidden','true');
  const defsSvg = make('svg','seven-stars-transition__defs');
  const defs = make('defs');
  const clip = make('clipPath');
  clip.id = 'seven-stars-actual-scene-cut';
  clip.setAttribute('clipPathUnits','userSpaceOnUse');
  const cutStars = formation.map(() => {
    const path = make('path');
    clip.append(path);
    return path;
  });
  const fusedCut = make('path');
  clip.append(fusedCut);
  defs.append(clip);
  defsSvg.append(defs);

  // Clone the actual next stage so words, glass and its background become
  // visible through the holes BEFORE the real section reaches the viewport.
  // No IDs, controls or event handlers are duplicated.
  const reveal = document.createElement('div');
  reveal.className = 'seven-stars-transition__reveal';
  const replica = stage.cloneNode(true);
  replica.removeAttribute('id');
  replica.setAttribute('aria-hidden','true');
  reveal.append(replica);

  const rims = make('svg','seven-stars-transition__rims');
  rims.setAttribute('aria-hidden','true');
  rims.setAttribute('preserveAspectRatio','none');
  const rimStars = formation.map(() => {
    const path = make('path','seven-stars-transition__rim');
    rims.append(path);
    return path;
  });
  const fusedRim = make('path','seven-stars-transition__rim seven-stars-transition__rim--fused');
  rims.append(fusedRim);
  overlay.append(defsSvg,reveal,rims);
  document.body.append(overlay);

  let width = 1, height = 1, scheduled = false;
  function resize() {
    width = Math.max(1,window.innerWidth);
    height = Math.max(1,window.innerHeight);
    rims.setAttribute('viewBox','0 0 '+width+' '+height);
  }
  const point = (x,y) => x.toFixed(1)+' '+y.toFixed(1);
  // A star with seven different elastic deformations, rather than rigid
  // stars flying like stickers. Pointed slits pull and knead the old scene.
  function starPath(cx,cy,r,index,p,rotation=0) {
    if(r <= .2) return '';
    const points = [];
    const stretch = Math.sin(p*Math.PI);
    for(let k=0;k<10;k++){
      const tip = k%2===0;
      const a = -Math.PI/2 + k*Math.PI/5 + rotation;
      const tension = 1 + (tip?.067:.042)*Math.sin(k*1.83+index*1.91+p*7.8);
      const radial = r * (tip?1:.48) * tension;
      const sx = 1+.14*stretch;
      const sy = 1-.055*stretch;
      const shear = (tip? .10 : .04) * r * Math.sin(p*5.8+index*.8);
      points.push([cx+Math.cos(a)*radial*sx-shear*.16,
                   cy+Math.sin(a)*radial*sy+shear*.06]);
    }
    return 'M '+point(...points[0])+' '+points.slice(1).map(v=>'L '+point(...v)).join(' ')+' Z';
  }
  function render() {
    scheduled = false;
    const top = incoming.getBoundingClientRect().top;
    const active = !reduced.matches && !document.hidden && top > 0 && top < height;
    overlay.classList.toggle('is-active',active);
    fizz.classList.toggle('is-seven-star-tearing',active);
    if(!active) return;

    const p = clamp((height-top)/height);
    const unit = Math.max(.60,Math.min(1.2,Math.min(width/1440,height/900)));
    formation.forEach((star,i) => {
      const delay = i*.024;
      const motion = phase(p,.03+delay,.76+delay);
      const appear = phase(p,.035+delay,.18+delay);
      const x = mix(width*1.13,-width*.28,motion) + star.x*unit;
      const y = mix(-height*.18,height*1.25,motion) + star.y*unit;
      const radius = star.r*unit*appear*(.55+2.35*Math.pow(motion,1.36));
      const rotation = (-.085+i*.013)+.12*Math.sin(p*6+i*.8);
      const d = starPath(x,y,radius,i,p,rotation);
      cutStars[i].setAttribute('d',d);
      rimStars[i].setAttribute('d',d);
      rimStars[i].style.opacity = (1-phase(p,.70,.94)).toFixed(3);
    });

    // The seven slits join into one stretchy star-shaped tear.
    // Its inner valleys grow past the screen corners just as the real
    // incoming stage reaches the top, for a seamless handoff.
    const merge = phase(p,.47,.96);
    const centerX = mix(width*.78,width*.51,merge);
    const centerY = mix(height*.22,height*.53,merge);
    const radius = Math.max(width,height)*5.6*Math.pow(merge,2.7);
    const joint = starPath(centerX,centerY,radius,8,p,.07);
    fusedCut.setAttribute('d',joint);
    fusedRim.setAttribute('d',joint);
    fusedRim.style.opacity = (Math.sin(merge*Math.PI)*.55).toFixed(3);
  }
  function requestRender() {
    if(scheduled)return;
    scheduled = true;
    requestAnimationFrame(render);
  }
  window.addEventListener('scroll',requestRender,{passive:true});
  window.addEventListener('resize',()=>{resize();requestRender();},{passive:true});
  reduced.addEventListener?.('change',requestRender);
  document.addEventListener('visibilitychange',requestRender);
  resize();
  render();
})();
