/* V6: one scroll position drives every layer; no elapsed-time animation. */
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
  const particlesLayer = collision?.querySelector('.rich-collision__droplets');
  const ice=[...root.querySelectorAll('.rich-collision__ice')];
  const panels = [
    {name:'peach',element:root.querySelector('.rich-fg--peach'),start:.51,end:.66,seed:0},
    {name:'grape',element:root.querySelector('.rich-fg--grape'),start:.85,end:.94,seed:1}
  ];
  if (![copy,copyWave,copyGlint,collision,peachTeam,grapeTeam,particlesLayer].every(Boolean)
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

  const NS='http://www.w3.org/2000/svg';
  const defs=document.createElementNS(NS,'svg');
  defs.setAttribute('width','0');defs.setAttribute('height','0');defs.setAttribute('aria-hidden','true');
  defs.innerHTML='<defs><clipPath id="rich-intro-surge" clipPathUnits="objectBoundingBox"><path/></clipPath></defs>';
  root.prepend(defs);
  const collisionMask=defs.querySelector('path');
  while(ice.length<5){const node=ice[0].cloneNode();node.className='rich-collision__ice';collision.querySelector('.rich-new-flavor__art').append(node);ice.push(node);}
  ice.forEach((node,i)=>{node.style.left='0';node.style.top='0';node.style.width=(i%2?102:76)+'px';node.style.height=node.style.width;node.style.zIndex=i%2?'4':'1';node.style.setProperty('--ice-delay',(-i*1.3)+'s');});
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
    const wave=reduce.matches?Number(p>=.28):clamp((p-.23)/.12);
    const shape=horizontalWave(wave,0);
    collisionMask.setAttribute('d',shape.mask.replace(/-?\d+(?:\.\d+)?/g,n=>(Number(n)/1000).toFixed(5)));
    const entry=reduce.matches?Number(p>=.30):smooth(.245,.365,p);
    // One stream carries both products from the right. No collision impulse.
    [peachTeam,grapeTeam].forEach((node,i)=>{
      const travel=1180*(1-entry);
      const lean=reduce.matches?0:(1-entry)*(i?7:5);
      node.style.transform=`translate3d(${travel.toFixed(2)}px,${(-14*Math.sin(Math.PI*entry)).toFixed(2)}px,0) rotate(${lean.toFixed(2)}deg)`;
    });
    collision.style.visibility=p>.23?'visible':'hidden';
    collision.style.opacity='1';
    collision.style.setProperty('--collision-ellipse-alpha',smooth(.23,.34,p).toFixed(3));
    const spots=[[345,150],[1080,210],[285,615],[1125,650],[890,70]];
    ice.forEach((node,i)=>{
      const q=reduce.matches?entry:smooth(.25+i*.002,.38+i*.002,p);
      const [x,y]=spots[i];
      node.style.opacity=(smooth(0,.25,q)*(i%2?.84:.65)).toFixed(3);
      node.style.transform=`translate3d(${x+1180*(1-q)}px,${y-36*(1-q)}px,0) rotate(${(i-2)*17+(1-q)*35}deg)`;
    });
    collision.inert=p<.38||p>=.51;
    collision.setAttribute('aria-hidden',String(collision.inert));
  }

  // Nonperiodic staggered lobes: upper/lower fronts overtake each other.
  // Rounded detached lead sheets merge into the thick body as progress grows.
  function horizontalWave(u,seed){
    if(u<=0)return {mask:'M1040 -40H1100V1040H1040Z',rim:'M1040 -40V1040',x:1040};
    if(u>=1)return {mask:'M-40 -40H1040V1040H-40Z',rim:'M-40 -40V1040',x:-40};
    const ys=[-100,0,110,230,365,490,620,740,865,1000,1100];
    const delays=[.02,.025,.04,.065,.10,.12,.09,.045,.015,.02,.02];
    const xs=ys.map((y,i)=>{
      const v=smooth(delays[(i+seed*2)%delays.length],.94,u);
      const pulse=smooth(.08,.35,u)*(1-smooth(.62,.96,u));
      return 1120-1480*v + [10,-25,-110,-155,15,90,30,-100,-175,-55,10][i]*pulse;
    });
    let rim=`M${xs[0]} ${ys[0]}`;
    for(let i=0;i<ys.length-1;i++){
      const prev=Math.max(0,i-1),next=Math.min(ys.length-1,i+2);
      rim+=` C${xs[i]+(xs[i+1]-xs[prev])/6} ${ys[i]+(ys[i+1]-ys[prev])/6} ${xs[i+1]-(xs[next]-xs[i])/6} ${ys[i+1]-(ys[next]-ys[i])/6} ${xs[i+1]} ${ys[i+1]}`;
    }
    let mask=rim+' L1600 1100L1600 -100Z';
    const lead=smooth(.04,.28,u)*(1-smooth(.48,.72,u));
    [2,8].forEach((i,j)=>{
      const x=xs[i]-80*lead, y=ys[i],rx=(28+j*8)*lead,ry=(14+j*5)*lead;
      mask+=` M${x-rx} ${y} a${rx} ${ry} 0 1 0 ${rx*2} 0 a${rx} ${ry} 0 1 0 ${-rx*2} 0Z`;
    });
    return {mask,rim,x:xs[5]};
  }

  function updateFlavor(panel,p){
    const u=reduce.matches?Number(p>=(panel.start+panel.end)/2):
      clamp((p-panel.start)/(panel.end-panel.start));
    const productU=panel.name==='grape'?(reduce.matches?Number(p>=.85):clamp((p-.77)/.115)):u;
    panel.element.style.visibility=productU>0?'visible':'hidden';
    panel.element.style.transform='none';
    const next=panel.name==='peach'?smooth(.795,.89,p):0;
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
    panel.element.querySelector('.rich-fg__caption').style.opacity=(reduce.matches?u:smooth(.45,.88,u)*(1-next)).toFixed(3);
    const active=smooth(panel.end,panel.end+.11,p);
    panel.shells.forEach(({shell,index,bottle})=>{
      const angle=index*1.7;
      const enter=reduce.matches?0:(1-productU);
      const orbit=reduce.matches?0:active;
      const roll=reduce.matches?1:smooth(0,.88,productU);
      const travel=(1-roll)*760-next*960;
      const dx=bottle?travel:travel+Math.cos(angle)*18*Math.sin(Math.PI*productU)+Math.cos(angle)*8*orbit;
      const settle=Math.sin(clamp((productU-.75)/.25)*Math.PI*2)*Math.pow(1-clamp((productU-.75)/.25),2);
      const dy=bottle?-8*settle:Math.sin(angle)*14*orbit;
      const turn=reduce.matches?0:(bottle?travel/620*180/Math.PI+settle*1.5:12*enter+Math.sin(angle)*6*orbit);
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
