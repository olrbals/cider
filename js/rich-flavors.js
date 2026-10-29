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
    {name:'grape',element:root.querySelector('.rich-fg--grape'),start:.80,end:.94,seed:1}
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

  const NS='http://www.w3.org/2000/svg';
  const water=document.createElementNS(NS,'svg');
  water.setAttribute('viewBox','0 0 1440 900');
  water.classList.add('rich-impact-fluid');
  water.setAttribute('aria-hidden','true');
  water.innerHTML='<defs><linearGradient id="v6-water" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".85"/><stop offset=".25" stop-color="#d3f7f2" stop-opacity=".10"/><stop offset=".55" stop-color="#fff" stop-opacity=".55"/><stop offset=".8" stop-color="#7bbfb5" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity=".85"/></linearGradient></defs>';
  collision.querySelector('.rich-new-flavor__art').prepend(water);
  const jets=Array.from({length:8},(_,i)=>{
    const node=document.createElementNS(NS,'path');
    node.setAttribute('fill','url(#v6-water)');node.setAttribute('stroke','rgba(255,255,255,.82)');
    node.setAttribute('stroke-width',i%3===0?'2.2':'1.3');
    water.append(node);return node;
  });
  const frontWater=document.createElementNS(NS,'svg');
  frontWater.setAttribute('viewBox','0 0 1440 900');frontWater.setAttribute('aria-hidden','true');
  frontWater.classList.add('rich-impact-fluid','rich-impact-fluid--front');
  const frontJets=[1,4,6].map(i=>{const node=jets[i].cloneNode();frontWater.append(node);return {node,index:i};});
  collision.querySelector('.rich-new-flavor__art').append(frontWater);
  // Five reused alpha ice sprites; each has an independent ballistic trajectory.
  while(ice.length<5){const node=ice[0].cloneNode();node.className='rich-collision__ice';collision.querySelector('.rich-new-flavor__art').append(node);ice.push(node);}
  ice.forEach((node,i)=>{node.style.left='0';node.style.top='0';node.style.width=(i%2?102:76)+'px';node.style.height=node.style.width;node.style.zIndex=i%2?'4':'1';});
  const droplets=Array.from({length:22},(_,i)=>{
    const node=document.createElement('span');node.className='rich-collision__drop';
    node.style.setProperty('--drop-size',(3+(i*7%9))+'px');particlesLayer.append(node);
    return {node,angle:i*2.39996,reach:170+(i*73%240),delay:(i%5)*.035};
  });
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
    const entry=reduce.matches?Number(p>=.29):smooth(.265,.315,p);
    const contact=clamp((p-.310)/.125);
    const hit=reduce.matches?0:Math.sin(contact*17)*Math.exp(-contact*6)*smooth(0,.06,contact)*(1-smooth(.7,1,contact));
    [peachTeam,grapeTeam].forEach((node,i)=>{
      const side=i?1:-1;
      const x=side*(1090*(1-entry)+hit*22);
      const turn=reduce.matches?0:side*(-9*(1-entry)+hit*4);
      node.style.transform='translate3d('+x.toFixed(2)+'px,0,0) rotate('+turn.toFixed(2)+'deg)';
    });
    collision.style.visibility=p>.23?'visible':'hidden';
    collision.style.opacity=smooth(.23,.25,p).toFixed(3);
    collision.style.setProperty('--collision-ellipse-alpha',smooth(.23,.32,p).toFixed(3));
    const t=clamp((p-.312)/.135);
    const fade=reduce.matches?0:smooth(0,.07,t)*(1-smooth(.62,1,t));
    water.style.opacity=fade.toFixed(3);
    frontWater.style.opacity='0';
    // A compressed core opens into sheets, then thins and falls under gravity.
    jets.forEach((node,i)=>{
      const q=clamp((t-i%3*.045)/(1-i%3*.045));
      const grow=1-Math.pow(1-q,2.7);
      const angle=[-2.75,-2.12,-1.35,-.65,.12,.65,2.0,2.7][i];
      const reach=[370,380,400,395,350,330,340,390][i]*grow;
      const ex=720+Math.cos(angle)*reach,ey=435+Math.sin(angle)*reach+155*q*q;
      const nx=-Math.sin(angle),ny=Math.cos(angle);
      const thick=(12+(i%3)*5)*(1-.82*q);
      const mx=720+(ex-720)*.48+nx*(18+i%2*18)*grow;
      const my=435+(ey-435)*.36+ny*35*grow;
      const r=(4+i%3*2)*(1-.45*q);
      node.setAttribute('d',`M ${720+nx*thick} ${435+ny*thick} C ${720+nx*thick*1.2} ${410+ny*thick} ${mx+nx*thick} ${my+ny*thick} ${ex+nx*r} ${ey+ny*r} Q ${ex+Math.cos(angle)*r*2} ${ey+Math.sin(angle)*r*2} ${ex-nx*r} ${ey-ny*r} C ${mx-nx*thick*.6} ${my-ny*thick*.6} ${710-nx*thick} ${420-ny*thick} ${720-nx*thick} ${435-ny*thick} Q 710 448 ${720+nx*thick} ${435+ny*thick}Z`);
    });
    frontJets.forEach(({node,index})=>node.setAttribute('d',jets[index].getAttribute('d')));
    droplets.forEach(({node,angle,reach,delay})=>{
      const q=clamp((t-.18-delay)/(.82-delay));
      node.style.opacity=(fade*smooth(0,.12,q)*(1-smooth(.7,1,q))*.8).toFixed(3);
      node.style.transform=`translate3d(${720+Math.cos(angle)*reach*q}px,${435+Math.sin(angle)*reach*q+190*q*q}px,0)`;
    });
    ice.forEach((node,i)=>{
      const q=clamp((t-.045-i*.018)/(.955-i*.018));
      const angle=[-2.6,-.7,2.7,.35,-1.5][i];
      const reach=[390,420,340,390,335][i];
      const flight=1-Math.pow(1-q,2.2);
      const x=690+Math.cos(angle)*reach*flight;
      const y=395+Math.sin(angle)*reach*flight+230*q*q;
      node.style.opacity=(reduce.matches?0:smooth(.08,.28,q)*(1-smooth(.55,1,q))*(i%2?.85:.62)).toFixed(3);
      node.style.transform=`translate3d(${x}px,${y}px,0) rotate(${(i-2)*13+(i%2?140:-110)*q}deg) scale(${.65+.35*q})`;
    });
    collision.inert=p<.455||p>=.51;
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
    panel.element.style.visibility=u>0?'visible':'hidden';
    panel.element.style.transform='none';
    const next=panel.name==='peach'?smooth(.795,.925,p):0;
    panel.element.inert=u<.99 || next>.01;
    panel.element.setAttribute('aria-hidden',String(u<.99 || next>.01));
    const shape=horizontalWave(u,panel.seed);
    // Clip the entire screen with the same liquid edge, including fruit and type.
    panel.sceneMask.setAttribute('d',shape.mask.replace(/-?\d+(?:\.\d+)?/g,n=>(Number(n)/1000).toFixed(5)));
    panel.fluidMask.setAttribute('d','M0 0H1000V1000H0Z');
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
      const enter=reduce.matches?0:(1-u);
      const orbit=reduce.matches?0:active;
      const roll=reduce.matches?1:smooth(0,.88,u);
      const travel=(1-roll)*760-next*960;
      const dx=bottle?travel:travel+Math.cos(angle)*18*Math.sin(Math.PI*u)+Math.cos(angle)*8*orbit;
      const settle=Math.sin(clamp((u-.75)/.25)*Math.PI*2)*Math.pow(1-clamp((u-.75)/.25),2);
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
