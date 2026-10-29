/* RICH V4 / scroll-scrubbed four-scene choreography.
  History 2024 → 2026 copy rises on a wave → hold → opposed flavor collision
  + water burst → hold → PEACH swept in as a unit → hold → GRAPE over PEACH → hold.
  Every transition is a pure function of scroll position, so reverse scrolling
  precisely unwinds the collision, water spray, and incoming scenes.
  Hero and History scroll controllers are intentionally untouched. */
(() => {
  'use strict';
  const root = document.querySelector('#rich-flavors');
  if (!root) return;
  const copy = root.querySelector('.rich-copy');
  const copyWave = copy?.querySelector('.rich-copy__wave-path');
  const copyGlint = copy?.querySelector('.rich-copy__wave-glint');
  const collision = root.querySelector('.rich-new-flavor');
  const peachTeam = collision?.querySelector('.rich-collision__team--peach');
  const grapeTeam = collision?.querySelector('.rich-collision__team--grape');
  const splash = collision?.querySelector('.rich-collision__water');
  const particlesLayer = collision?.querySelector('.rich-collision__droplets');
  const panels = [
    {name:'peach',element:root.querySelector('.rich-fg--peach'),start:.51,end:.66,seed:0},
    {name:'grape',element:root.querySelector('.rich-fg--grape'),start:.80,end:.94,seed:1}
  ];
  if (![copy,copyWave,copyGlint,collision,peachTeam,grapeTeam,splash,particlesLayer].every(Boolean)
      || panels.some(p=>!p.element)) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = t => Math.min(1,Math.max(0,t));
  const smooth = (a,b,p) => {
    const t=clamp((p-a)/(b-a));
    return t*t*(3-2*t);
  };
  const backOut = (t) => {
    const x=clamp(t)-1;
    return 1 + 1.9*x*x*x + .9*x*x;
  };
  let width=window.innerWidth;
  let height=window.innerHeight;
  let raf=0;

  panels.forEach(panel=>{
    panel.fluidMask=panel.element.querySelector('.rich-fg__fluid-mask');
    panel.fluidRim=panel.element.querySelector('.rich-fg__fluid-rim');
    panel.fluidBand=panel.element.querySelector('.rich-fg__fluid-band');
    panel.foam=panel.element.querySelector('.rich-fg__foam');
    const figmaImages=[...panel.element.querySelectorAll(
      '.rich-fg__bottle,.rich-fg__fruit,.rich-fg__fruit-group'
    )];
    // Inner containers only ever wobble a few pixels. The outer article carries
    // background + bottle + all fruits + title with ONE shared translation.
    panel.shells=figmaImages.map((node,index)=>{
      const shell=document.createElement('span');
      const bob=document.createElement('span');
      shell.className='rich-fg__motion-shell';
      shell.dataset.role=node.classList.contains('rich-fg__bottle')?'bottle':'fruit';
      bob.className='rich-fg__bob';
      shell.style.left=node.style.left||'0px';
      shell.style.top=node.style.top||'0px';
      shell.style.width=node.style.width||(node.getAttribute('width')||'96')+'px';
      shell.style.height=node.style.height||(node.getAttribute('height')||'96')+'px';
      node.parentElement.insertBefore(shell,node);
      shell.appendChild(bob);
      bob.appendChild(node);
      node.style.left='0';node.style.top='0';
      node.style.width='100%';node.style.height='100%';
      return {shell,index,bottle:shell.dataset.role==='bottle'};
    });
  });

  let randomSeed=47418;
  const random=()=>{
    randomSeed=(1664525*randomSeed+1013904223)>>>0;
    return randomSeed/4294967296;
  };
  const droplets=[];
  // The main splash uses translucent SVG ribbons; these small refraction drops
  // and 8 star glints add the sparkling detail without a heavy fluid simulator.
  for(let i=0;i<44;i++){
    const spark=i>=35;
    const angle=random()*Math.PI*2;
    const reach=(spark?110:85)+random()*(spark?360:450);
    const baseX=720+Math.cos(angle)*reach;
    const baseY=435+Math.sin(angle)*reach*.85;
    const size=spark?9+random()*16:4+random()*27;
    const e=document.createElement('span');
    e.className='rich-collision__drop';
    if(spark)e.dataset.type='spark';
    e.style.setProperty('--drop-size',size.toFixed(1)+'px');
    particlesLayer.appendChild(e);
    droplets.push({
      node:e,x:baseX,y:baseY,angle,
      delay:random()*.11,
      rotation:(random()-.5)*80,
      scale:.6+random()*.6,
      spark
    });
  }

  function geometry(){
    width=window.innerWidth;
    height=window.innerHeight;
    const scale=Math.min(width/1440,height/900);
    const bandTop=(height-900*scale)/2+648*scale;
    const bandY=bandTop/Math.max(1,height)*1000;
    root.style.setProperty('--rich-design-scale',scale.toFixed(5));
    root.style.setProperty('--rich-band-top',bandTop.toFixed(2)+'px');
    panels.forEach(panel=>{
      panel.fluidBand.setAttribute('y',bandY.toFixed(2));
      panel.fluidBand.setAttribute('height',Math.max(0,1000-bandY).toFixed(2));
    });
  }

  function riseWave(u){
    const intensity=Math.sin(Math.PI*u);
    const h=1100-1280*u;
    const m=[
      'M -40',(h+38*intensity).toFixed(2),
      'C 120',(h-105*intensity).toFixed(2),
      '280',(h+85*intensity).toFixed(2),
      '484',(h-24*intensity).toFixed(2),
      'S 845',(h-96*intensity).toFixed(2),
      '1040',(h+27*intensity).toFixed(2)
    ].join(' ');
    return {fill:m+' L 1040 1040 L -40 1040 Z',rim:m,opacity:(.45*intensity).toFixed(3)};
  }

  function updateCopy(progress){
    const u=reduce.matches?Number(progress>=.075):smooth(0,.135,progress);
    const wave=riseWave(u);
    copyWave.setAttribute('d',wave.fill);
    copyGlint.setAttribute('d',wave.rim);
    copyGlint.setAttribute('stroke-opacity',reduce.matches?'0':wave.opacity);
    const textIn=reduce.matches?u:smooth(.085,.14,progress);
    copy.style.setProperty('--copy-opacity',textIn.toFixed(3));
  }

  function updateCollision(progress){
    // Fruit and both PET bottles enter together from opposite sides.
    const c=reduce.matches?Number(progress>=.33):smooth(.255,.38,progress);
    const travel=reduce.matches?c:backOut(c);
    const pX= -1090*(1-travel);
    const gX=  1090*(1-travel);
    const sway=reduce.matches?0:Math.sin(Math.PI*c)*(1-c)*4;
    const size=reduce.matches?1:.94+.06*c;
    peachTeam.style.transform='translate3d('+pX.toFixed(2)+'px,0,0) rotate('+
      (sway).toFixed(2)+'deg) scale('+size.toFixed(3)+')';
    grapeTeam.style.transform='translate3d('+gX.toFixed(2)+'px,0,0) rotate('+
      (-sway).toFixed(2)+'deg) scale('+size.toFixed(3)+')';
    collision.style.visibility=progress>.228?'visible':'hidden';
    collision.style.opacity=(reduce.matches?Number(progress>=.3):
      smooth(.228,.275,progress)).toFixed(3);
    collision.style.setProperty('--collision-ellipse-alpha',
      (reduce.matches?1:smooth(.24,.34,progress)).toFixed(3));

    // Water impact begins at near-contact and disperses outward.
    const impact=reduce.matches?0:
      smooth(.335,.37,progress)*(1-smooth(.434,.49,progress));
    const expand=reduce.matches?1:smooth(.342,.437,progress);
    collision.style.setProperty('--impact-opacity',(.87*impact).toFixed(3));
    collision.style.setProperty('--impact-scale',(.68+.40*expand).toFixed(3));
    droplets.forEach(({node,x,y,angle,delay,rotation,scale,spark})=>{
      const t=clamp((expand-delay)/(1-delay));
      const outward=smooth(0,.97,t);
      const dropX=720+(x-720)*(.12+.88*outward);
      const dropY=435+(y-435)*(.12+.88*outward);
      const fade=impact*(spark ? (1-smooth(.70,1,t)*.65) : 1);
      node.style.opacity=(fade*(spark?.9:.75)).toFixed(3);
      node.style.transform='translate3d('+(dropX).toFixed(2)+'px,'+
        dropY.toFixed(2)+'px,0) translate(-50%,-50%) rotate('+
        (rotation*outward).toFixed(1)+'deg) scale('+
        (scale*(.65+.35*outward)).toFixed(3)+')';
    });
  }

  // Strong bowed front: the middle of the wave surges ahead, top and bottom
  // catch up, then the left boundary clears the canvas to reveal exact Figma.
  function horizontalWave(u,seed){
    const strength=Math.sin(Math.PI*u);
    const x=95-360*u;
    const wobble=Math.sin((2.1*u+.27*seed)*Math.PI);
    const top=x+(95+20*wobble)*strength;
    const middle=x-(185+27*wobble)*strength;
    const bottom=x+(83-14*wobble)*strength;
    const path=[
      'M',top.toFixed(2),'-40',
      'C',(x+92*strength).toFixed(2),'130',
      (x-30*strength).toFixed(2),'236',
      (middle+16*strength).toFixed(2),'347',
      'C',(middle-24*strength).toFixed(2),'468',
      (middle-32*strength).toFixed(2),'601',
      (x-63*strength).toFixed(2),'702',
      'C',(x+27*strength).toFixed(2),'834',
      (x+99*strength).toFixed(2),'934',
      bottom.toFixed(2),'1040'
    ].join(' ');
    return {mask:path+' L 1040 1040 L 1040 -40 Z',rim:path,x};
  }

  function updateFlavor(panel,p){
    const u=reduce.matches?Number(p>=(panel.start+panel.end)/2):
      smooth(panel.start,panel.end,p);
    panel.element.style.visibility=p>=panel.start-.001?'visible':'hidden';
    // EVERYTHING (color, image, fruit and footer type) shares this value.
    panel.element.style.transform='translate3d('+((1-u)*100).toFixed(3)+'%,0,0)';
    const shape=horizontalWave(u,panel.seed);
    panel.fluidMask.setAttribute('d',shape.mask);
    panel.fluidRim.setAttribute('d',shape.rim);
    panel.fluidRim.setAttribute('stroke-opacity',
      (reduce.matches?0:Math.sin(Math.PI*u)*.37).toFixed(3));
    if(panel.foam){
      panel.foam.setAttribute('transform','translate('+shape.x.toFixed(2)+',0)');
      panel.foam.setAttribute('opacity',(reduce.matches?0:Math.sin(Math.PI*u)*.73).toFixed(3));
    }
    const lean=reduce.matches?0:Math.sin(Math.PI*u);
    panel.shells.forEach(({shell,index,bottle})=>{
      const drift=(bottle?-9:(index%2?6:-7))*lean;
      const yDrift=(bottle?-5:((index%3)-1)*5)*lean;
      const turn=(bottle?-2.1:(index%2?2.6:-2.4))*lean;
      shell.style.opacity='1';
      shell.style.transform='translate3d('+drift.toFixed(2)+'px,'+
        yDrift.toFixed(2)+'px,0) rotate('+turn.toFixed(2)+'deg)';
    });
  }

  function render(){
    raf=0;
    const rect=root.getBoundingClientRect();
    if(rect.top>height||rect.bottom<0)return;
    const distance=Math.max(1,root.offsetHeight-height);
    const progress=clamp(-rect.top/distance);
    updateCopy(progress);
    updateCollision(progress);
    panels.forEach(panel=>updateFlavor(panel,progress));
  }
  function queue(){if(!raf)raf=requestAnimationFrame(render);}
  function resize(){geometry();queue();}
  window.addEventListener('scroll',queue,{passive:true});
  window.addEventListener('resize',resize,{passive:true});
  window.addEventListener('pageshow',resize);
  reduce.addEventListener?.('change',queue);
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(([entry])=>{
      root.classList.toggle('is-visible',!!entry?.isIntersecting);
      if(entry?.isIntersecting)queue();
    },{rootMargin:'140px 0px 140px 0px'});
    observer.observe(root);
  }else root.classList.add('is-visible');
  root.classList.add('rich-motion-ready');
  resize();
})();
