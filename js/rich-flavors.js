/* V6: one scroll position drives every layer; no elapsed-time animation. */
(() => {
  'use strict';
  const root = document.querySelector('#rich-flavors');
  if (!root) return;
  const copy = root.querySelector('.rich-copy');
  const copyWave = copy?.querySelector('.rich-copy__wave-path');
  const copyGlint = copy?.querySelector('.rich-copy__wave-glint');
  const collision = root.querySelector('.rich-new-flavor');
  const panels = [
    {name:'peach',element:root.querySelector('.rich-fg--peach'),start:.46,end:.65,seed:0},
    {name:'grape',element:root.querySelector('.rich-fg--grape'),start:.735,end:.91,seed:1}
  ];
  if (![copy,copyWave,copyGlint,collision].every(Boolean)
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
    panel.sceneMask=panel.element.querySelector('.rich-fg__scene-mask');
    panel.fluidRim=panel.element.querySelector('.rich-fg__fluid-rim');
    panel.fluidBand=panel.element.querySelector('.rich-fg__fluid-band');
    panel.foam=panel.element.querySelector('.rich-fg__foam');
    panel.nameLabel=panel.element.querySelector('.rich-fg__caption-line h2');
    const nameWindow=document.createElement('div');
    nameWindow.className='rich-fg__name-window';
    panel.nameLabel.parentNode.insertBefore(nameWindow,panel.nameLabel);
    nameWindow.append(panel.nameLabel);
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
      if(shell.dataset.role==='fruit' && parseFloat(node.style.left)<720 && parseFloat(node.style.top)>=390) shell.dataset.depth='front';
      bob.className='rich-fg__bob';
      bob.style.setProperty('--float-duration',(6.4+index*.73)+'s');
      bob.style.setProperty('--float-delay',(-index*1.37)+'s');
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

  const introSlots=[{"key":"slice","side":0,"pre":[246.695,388.8275,180,143.59,29.53,0.88],"post":[465.426,394.34,238.152,189.979,29.53,0.88]},{"key":"peach","side":0,"pre":[376.854,438.017,212,530.134,12,1],"post":[591.7145,417.862,247.651,619.284,-8,1]},{"key":"whole","side":0,"pre":[258.122,704.122,140,140,-162.11,0.88],"post":[478.2995,713.2995,180,180,-162.11,0.88]},{"key":"bunch","side":1,"pre":[1107.835,404.835,240,240,-55.55,0.88],"post":[924.447,418.447,320,320,-55.55,0.88]},{"key":"grape","side":1,"pre":[952.233,450.0195,222.965,557.554,-24,1],"post":[823.994,522.649,252.033,630.242,16,1]},{"key":"single","side":1,"pre":[1259.3015,634.3015,100,100,-30,0.88],"post":[987.3015,742.3015,100,100,-30,0.88]}];
  introSlots.forEach((slot,i)=>{
    slot.node=collision.querySelector('[data-r11="'+slot.key+'"]');
    slot.node.style.setProperty('--r11-delay',(-i*1.13)+'s');
    slot.node.style.setProperty('--r11-duration',(slot.key==='peach'||slot.key==='grape'?8:6.5+i*.37)+'s');
  });
  const depthSlots=[...collision.querySelectorAll('.r11-depth-slot')];
  const depthGeometry=[[16.759,626.49,600,478.632,160,.48],[1327.41,1027.41,800,800,-30,.52],[1361.8075,-53.1925,600,600,-30,.56]];
  function geometry(){
    width=window.innerWidth;
    height=window.innerHeight;
    const scale=Math.min(width/(width<750?960:1440),height/900);
    const bandTop=(height-900*scale)/2+648*scale;
    const bandY=bandTop/Math.max(1,height)*1000;
    root.style.setProperty('--rich-design-scale',scale.toFixed(5));
    root.style.setProperty('--rich-intro-scale',Math.min(width/(width<750?760:1440),height/900).toFixed(5));
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

  function updateCollision(p){
    const burstEase=t=>{const x=t-1;return 1+1.9*x*x*x+.9*x*x;};
    const entry=reduce.matches?Number(p>=.25):smooth(.19,.275,p);
    const meet=reduce.matches?Number(p>=.35):smooth(.29,.375,p);
    const ink=reduce.matches?meet:smooth(.335,.44,p);
    const depth=reduce.matches?meet:smooth(.335,.405,p);
    const burst=reduce.matches?meet:burstEase(smooth(.325,.385,p));
    collision.style.visibility=p>.18?'visible':'hidden';
    collision.style.opacity=(smooth(.18,.205,p)*(1-smooth(.46,.65,p))).toFixed(3);
    collision.style.setProperty('--r11-ink',ink.toFixed(4));
    root.classList.toggle('r11-live',p>.18&&p<.515);
    introSlots.forEach(({node,side,pre,post},i)=>{
      const mix=(a,b)=>a+(b-a)*meet;
      const drift=(side?1:-1)*900*(1-entry);
      const swell=reduce.matches?0:Math.sin(entry*Math.PI)*-10*(1-meet);
      const tilt=reduce.matches?0:Math.sin(entry*Math.PI*2)*1.1*(1-meet);
      node.style.left=(mix(pre[0],post[0])+drift).toFixed(3)+'px';
      node.style.top=(mix(pre[1],post[1])+swell).toFixed(3)+'px';
      const fruit = !['peach','grape'].includes(node.dataset?.r11);
      const sizeMix = (a,b)=>a+(b-a)*(fruit?burst:meet);
      node.style.width=sizeMix(pre[2],post[2]).toFixed(3)+'px';
      node.style.height=sizeMix(pre[3],post[3]).toFixed(3)+'px';
      node.style.transform='translate(-50%,-50%) rotate('+(mix(pre[4],post[4])+tilt).toFixed(3)+'deg)';
      node.style.opacity=mix(pre[5],post[5]).toFixed(3);
    });
    depthSlots.forEach((node,i)=>{
      const [x,y,w,h,angle,alpha]=depthGeometry[i];
      const toward=.18+.62*burstEase(depth);
      node.style.left=(720+(x-720)*depth).toFixed(2)+'px';
      node.style.top=(460+(y-460)*depth)+'px';node.style.width=w+'px';node.style.height=h+'px';
      node.style.transform='translate(-50%,-50%) rotate('+angle+'deg) scale('+toward.toFixed(4)+')';
      node.style.opacity=(smooth(0,.18,depth)*(1-(1-alpha*.65)*smooth(.25,1,depth))).toFixed(4);
      node.style.filter='blur('+((i===0?3:5)*depth).toFixed(2)+'px)';
    });
    collision.inert=p<.465||p>=.51;
    collision.setAttribute('aria-hidden',String(collision.inert));
  }

  // Nonperiodic staggered lobes: upper/lower fronts overtake each other.
  // Rounded detached lead sheets merge into the thick body as progress grows.
  function horizontalWave(u,seed){
    if(u<=0)return {mask:'M1040 -40H1100V1040H1040Z',rim:'M1040 -40V1040',x:1040};
    if(u>=1)return {mask:'M-40 -40H1040V1040H-40Z',rim:'M-40 -40V1040',x:-40};
    // A connected advancing body plus seven stretched tongues. Each tongue
    // has its own lead, bend and thickness; the body closes the gaps at the end.
    const front=1100-1180*smooth(.30,1,u);
    const rows=[[-40,88,.00,530,-44],[112,55,.035,840,62],[272,94,.07,650,-72],
      [454,66,.015,1040,48],[619,104,.09,770,-56],[813,64,.045,960,65],[1004,90,.025,610,-40]];
    const bend=50*Math.sin(Math.PI*u);
    let mask=`M1600 -40H${front} C${front-bend} 130 ${front+bend} 245 ${front} 360 S${front-bend} 600 ${front} 740 S${front+bend} 940 ${front} 1040 H1600Z`,rim='';
    rows.forEach(([y,r,delay,length,bend],i)=>{
      const v=smooth(delay,.91,u), swell=Math.sin(Math.PI*v);
      const tip=1120-(1200+length)*v;
      const neck=Math.max(tip+80,front+100);
      const cy=y+bend*swell,thick=r*(.20+.80*smooth(.10,.92,v));
      const tongue=`M1600 ${y-r} C${neck} ${y-r} ${tip+180} ${cy-thick} ${tip+28} ${cy-thick*.45} Q${tip-24} ${cy} ${tip+28} ${cy+thick*.45} C${tip+170} ${cy+thick} ${neck} ${y+r} 1600 ${y+r}Z`;
      mask+=' '+tongue;
      rim+=` M${tip+28} ${cy-thick*.45} Q${tip-24} ${cy} ${tip+28} ${cy+thick*.45}`;
    });
    return {mask,rim,x:front};
  }

  function updateFlavor(panel,p){
    const u=reduce.matches?Number(p>=(panel.start+panel.end)/2):
      clamp((p-panel.start)/(panel.end-panel.start));
    const productU=panel.name==='grape'?(reduce.matches?Number(p>=.82):clamp((p-.745)/.15)):u;
    panel.element.style.visibility=productU>0?'visible':'hidden';
    panel.element.style.transform='none';
    const next=panel.name==='peach'?(reduce.matches?Number(p>=.82):smooth(.755,.91,p)):0;
    panel.element.inert=u<.99 || next>.01;
    panel.element.setAttribute('aria-hidden',String(u<.99 || next>.01));
    const shape=horizontalWave(u,panel.seed);
    // Clip the entire screen with the same liquid edge, including fruit and type.
    panel.sceneMask.setAttribute('d',shape.mask.replace(/-?\d+(?:\.\d+)?/g,n=>(Number(n)/1000).toFixed(5)));
    panel.fluidMask.setAttribute('d',panel.name==='grape'?shape.mask:'M0 0H1000V1000H0Z');
    panel.fluidRim.setAttribute('d',shape.rim);
    panel.fluidRim.setAttribute('stroke-opacity',reduce.matches?'0':(Math.sin(Math.PI*u)*.22).toFixed(3));
    if(panel.foam){
      panel.foam.setAttribute('transform','translate('+shape.x.toFixed(2)+',0)');
      panel.foam.setAttribute('opacity','0');
    }
    const caption=panel.element.querySelector('.rich-fg__caption');
    // Product first, then a shared opposing title slide, then background.
    const titleSwap=reduce.matches?Number(p>=.82):smooth(.775,.855,p);
    const titleX=panel.name==='grape'?440*(1-titleSwap):-440*titleSwap;
    caption.style.transform='none';
    panel.nameLabel.style.transform='translate3d('+titleX.toFixed(2)+'px,0,0)';
    caption.style.opacity=(panel.name==='grape'?1:(reduce.matches?u:smooth(.45,.88,u))).toFixed(3);
    panel.element.classList.toggle('is-buoyant',panel.name==='grape' && productU>0);
    const active=smooth(panel.end,panel.end+.11,p);
    panel.shells.forEach(({shell,index,bottle})=>{
      const angle=index*1.7;
      const enter=reduce.matches?0:(1-productU);
      const orbit=reduce.matches?0:active;
      const roll=reduce.matches?1:smooth(0,.88,productU);
      const travel=(panel.name==='peach'?0:(1-roll)*1000)-next*1120;
      const dx=bottle?travel:travel+Math.cos(angle)*18*Math.sin(Math.PI*productU)+Math.cos(angle)*8*orbit;
      const settle=Math.sin(clamp((productU-.75)/.25)*Math.PI*2)*Math.pow(1-clamp((productU-.75)/.25),2);
      // A broad crest lifts the incoming group; a smaller trough settles it.
      // The scroll envelope returns exactly to zero, while the inner bob keeps floating.
      const crest=reduce.matches?0:Math.sin(Math.PI*productU);
      const swell=panel.name==='grape'?(-5*crest-2*Math.sin(2*Math.PI*productU)*crest):0;
      const rock=reduce.matches?0:1.2*Math.sin(2*Math.PI*productU)*crest;
      const dy=bottle?(swell-5*settle+(panel.name==='peach'?next*8:0)):swell*.9+Math.sin(angle)*14*orbit;
      const bottleTurn=panel.name==='grape'?1.5*(1-roll)+rock+settle*.2:(1-roll)*18-next*7+settle;
      const turn=reduce.matches?0:(bottle?bottleTurn:6*enter+(panel.name==='grape'?rock*.45:0)+Math.sin(angle)*6*orbit);
      shell.style.transform='translate3d('+dx.toFixed(2)+'px,'+dy.toFixed(2)+'px,0) rotate('+turn.toFixed(2)+'deg)';
    });
  }

  // Native buttons follow exactly the same scroll choreography as wheel/touch.
  panels.forEach((panel,index)=>{
    panel.element.querySelector('[data-rich-prev]').addEventListener('click',()=>goTo(index===0?.44:.72));
    panel.element.querySelector('[data-rich-next]').addEventListener('click',()=>goTo(index===0?.96:1));
  });
  function goTo(progress){
    const top=root.getBoundingClientRect().top+window.scrollY;
    const distance=Math.max(1,root.offsetHeight-height);
    window.scrollTo({top:top+distance*progress+(progress===1?height:0),behavior:reduce.matches?'instant':'smooth'});
  }

  function render(){
    raf=0;
    const rect=root.getBoundingClientRect();
    if(rect.top>height||rect.bottom<0)return;
    const distance=Math.max(1,root.offsetHeight-height);
    const progress=clamp(-rect.top/distance);
    updateCopy(progress);
    copy.setAttribute('aria-hidden',String(progress>.26));
    updateCollision(progress);
    root.dataset.richScene=progress>=.94?'grape':progress>=.66?'peach':progress>=.455?'duo':progress>.235?'burst':'copy';
    root.dataset.richProgress=progress.toFixed(5);
    panels.forEach(panel=>updateFlavor(panel,progress));
    window.richPet3D?.update(progress);
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
