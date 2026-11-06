/* Archive year handoff → downward NEW reel → unchanged product choreography → logo. */
(() => {
  'use strict';
  const root=document.querySelector('#rich-flavors');if(!root)return;
  const viewport=root.querySelector('.rich-flavors__viewport');
  const copy=root.querySelector('.rich-copy'),duo=root.querySelector('.rich-duo'),ending=root.querySelector('.rich-signoff');
  if(!copy||!duo||!ending)return;
  const year=copy.querySelector('.rich-year'),archiveYear=copy.querySelector('.rich-year__archive'),currentYear=copy.querySelector('.rich-year__current');
  const newCopy=copy.querySelector('.rich-story__new'),message=copy.querySelector('.rich-story__message');
  const history=document.querySelector('#history-3d');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=t=>Math.min(1,Math.max(0,t));
  const smooth=(a,b,p)=>{const t=clamp((p-a)/(b-a));return t*t*(3-2*t);};
  const mix=(a,b,t)=>a+(b-a)*t;
  const cubic=(a,b,c,d,t)=>(1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t*t*t*d;
  let width=innerWidth,height=innerHeight,designScale=1,raf=0,anchor=null;
  const productStart=1.98,signoffStart=4.03; // V8: copy reel, then the '건배' product scene
  const slots=[
    {key:'slice',side:0,pre:[246.695,388.8275,180,143.59,29.53],post:[465.426,394.34,180,143.59,29.53]},
    {key:'peach',side:0,pre:[376.854,438.017,212,530.134,7],post:[591.7145,417.862,212,530.134,-8]},
    {key:'whole',side:0,pre:[258.122,704.122,140,140,-162.11],post:[478.2995,713.2995,140,140,-162.11]},
    {key:'bunch',side:1,pre:[1107.835,404.835,240,240,-55.55],post:[924.447,418.447,240,240,-55.55]},
    {key:'grape',side:1,pre:[952.233,450.0195,222.965,557.554,-7],post:[823.994,522.649,222.965,557.554,12]},
    {key:'single',side:1,pre:[1259.3015,634.3015,100,100,-30],post:[987.3015,742.3015,100,100,-30]}
  ].map(s=>({...s,node:duo.querySelector('[data-rich-slot="'+s.key+'"]'),fruit:!['peach','grape'].includes(s.key)}));
  const depth=[[16.759,737.49,600,478.632,160,.52],[1362.41,936.41,800,800,-30,.52],[1361.8075,-53.1925,600,600,-30,.56],[241.229,45.229,313.054,313.054,-25.16,.48],[240.807,449.807,89.915,89.915,-25.16,.32],[674.5055,80.5055,77.146,77.146,72.23,.20],[1258.1805,466.1805,150,150,76.76,.32],[789.713,92.713,100,100,-81.46,.20]];
  const depthNodes=[...duo.querySelectorAll('[data-rich-depth]')];

  function captureAnchor(){
    const source=history?.querySelector('.history-3d-odometer');if(!source)return false;
    const a=source.getBoundingClientRect(),v=viewport.getBoundingClientRect(),stage=history.querySelector('.history-3d-stage').getBoundingClientRect();
    const css=getComputedStyle(source);
    anchor={x:a.left+a.width/2-v.left,y:a.top+a.height/2-stage.top,fontSize:parseFloat(css.fontSize)};
    Object.assign(archiveYear.style,{fontFamily:css.fontFamily,fontWeight:css.fontWeight,fontSize:css.fontSize,lineHeight:css.lineHeight,letterSpacing:css.letterSpacing});
    return true;
  }
  function geometry(){
    width=viewport.clientWidth;height=innerHeight;
    designScale=Math.min(width/1440,height/900);
    root.style.height=(height*5.65).toFixed(2)+'px';
    root.style.setProperty('--rich-design-scale',designScale.toFixed(6));
    root.style.setProperty('--rich-duo-scale',Math.min(innerWidth/(innerWidth<750?1100:1440),height/900).toFixed(6));
    captureAnchor();
    findClink();
    depthNodes.forEach((n,i)=>{const [x,y,w,h,r]=depth[i];Object.assign(n.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px',transform:'translate(-50%,-50%) rotate('+r+'deg)'});});
  }
  function setAccessible(el,on){el.inert=!on;el.setAttribute('aria-hidden',String(!on));}
  function updateStory(s){
    if(!anchor)captureAnchor();
    const a=anchor||{x:width*.28,y:height*.56,fontSize:100};
    const morph=reduce.matches?Number(s>=.55):smooth(0,.55,s);
    const change=smooth(.55,.68,s),appear=smooth(.67,.83,s),roll=smooth(1.02,1.40,s);
    const end=1-smooth(1.88,2.05,s),paper=smooth(0,.38,s);
    const destinationY=(height-900*designScale)/2+406*designScale;
    Object.assign(year.style,{left:mix(a.x,width/2,morph).toFixed(3)+'px',top:mix(a.y,destinationY,morph).toFixed(3)+'px',opacity:s>0?String(end):'0'});
    const shrink=mix(1,40*designScale/a.fontSize,morph);
    archiveYear.style.transform='translate(-50%,-50%) scale('+shrink.toFixed(6)+')';
    archiveYear.style.opacity=(1-change).toFixed(4);
    currentYear.style.transform='translate(-50%,-50%) scale('+designScale.toFixed(6)+')';
    currentYear.style.opacity=change.toFixed(4);
    copy.style.setProperty('--rich-paper',paper.toFixed(4));
    copy.style.setProperty('--rich-copy-opacity',end.toFixed(4));
    copy.style.visibility=s>=0&&end>0?'visible':'hidden';
    newCopy.style.transform='translateY('+(reduce.matches?0:136*roll).toFixed(3)+'px)';
    newCopy.style.opacity=(appear*(1-roll)).toFixed(4);
    message.style.transform='translateY('+(reduce.matches?0:-136*(1-roll)).toFixed(3)+'px)';
    message.style.opacity=(appear*roll).toFixed(4);
    newCopy.setAttribute('aria-hidden',String(appear===0||roll>.5));
    message.setAttribute('aria-hidden',String(roll<=.5));
    copy.setAttribute('aria-hidden',String(s<=0||end===0));
    const handoff=s>0&&root.getBoundingClientRect().bottom>0;
    history?.classList.toggle('rich-year-handoff',handoff);
    history?.style.setProperty('--rich-archive-opacity',(1-smooth(0,.28,s)).toFixed(4));
  }
  // Bottle/fruit pose at duo-time t (unchanged choreography), plus the
  // '건배' clink: the two bottles tilt their necks together where they cross.
  function pose({side,pre,post,fruit},t){
    const delay=side*.055+(fruit?.06:0);
    const entry=reduce.matches?1:smooth(.025+delay,.51+delay,t);
    const cross=reduce.matches?1:smooth(.65+(fruit?.04:0),1.25+(fruit?.04:0),t);
    const bend=fruit?mix(pre[0],post[0],cross):cubic(pre[0],side?700:750,side?450:950,post[0],cross);
    const flight=reduce.matches?0:Math.sin(Math.PI*smooth(.70,1.60,t));
    const drift=reduce.matches?0:smooth(1.28,1.60,t);
    const x=bend+(side?760:-760)*(1-entry)+(fruit?(side?1:-1)*160*flight:0);
    const y=mix(pre[1],post[1],cross)+(side?1:-1)*(fruit?10:32)*Math.sin(Math.PI*cross)
      -(fruit?(side?190:145)*flight:0)+(fruit?Math.sin(t*5+pre[0]) * 20 * drift:0);
    let angle=mix(pre[4],post[4],cross)+(fruit?(side?1:-1)*48*flight+Math.sin(t*4)*9*drift:0);
    if(!fruit&&!reduce.matches){const b=Math.exp(-(((t-clinkT)/.07)**2));angle+=(side?-1:1)*16*b;}
    return {x,y,angle};
  }
  let clinkT=.95;
  function findClink(){
    const peach=slots.find(s=>s.key==='peach'),grape=slots.find(s=>s.key==='grape');
    let best=1e9;for(let t=.55;t<=1.4;t+=.005){const d=Math.abs(pose(peach,t).x-pose(grape,t).x);if(d<best){best=d;clinkT=t;}}
  }
  // Clink = the hero's splash, re-made for the pastel scene: the hero's
  // water-star burst (five real jets) from between the necks, then the
  // hero's lens splash rushing at the viewer. Footage is high-passed
  // (neutral grey + highlights/shadows) and hard-light blended so clear
  // water reads on light backgrounds.
  const art=duo.querySelector('.rich-duo__art');
  const clip=(cls,src,parent)=>{const v=document.createElement('video');v.className=cls;v.src=src;
    v.muted=true;v.playsInline=true;v.preload='auto';v.setAttribute('muted','');v.setAttribute('playsinline','');v.setAttribute('aria-hidden','true');
    parent.append(v);return v;};
  const burst=clip('rich-cheers-burst','media/rich-cheers-burst.mp4',art);
  const front=clip('rich-cheers-front','media/rich-cheers-front.mp4',duo);

  let clinked=false,clinkAt=0,fxRaf=0,lastT=-1,frontAt=0;
  function drawFx(now){
    fxRaf=0;
    if(lastDuoT>=0)placeDepth(lastDuoT);
    if(!clinked){burst.style.opacity='0';front.style.opacity='0';return;}
    const kb=burst.duration?burst.currentTime/burst.duration:0;
    burst.style.opacity=(burst.ended?0:Math.min(1,kb*12)*(1-smooth(.55,.95,kb))).toFixed(3);
    // Lens splash follows once the jets are ~1/3 out, exactly like the hero.
    if(!frontAt&&(kb>=.32||burst.ended)){frontAt=now;front.currentTime=0;front.play().catch(()=>{});}
    const kf=front.duration&&frontAt?front.currentTime/front.duration:0;
    front.style.opacity=(frontAt&&!front.ended?.85*smooth(0,.04,kf)*(1-smooth(.62,1,kf)):0).toFixed(3);
    front.style.transform='scale('+(1+.35*(1-(1-smooth(0,.5,kf))**3)).toFixed(4)+')';
    if(!(burst.ended&&(front.ended||!frontAt))||now-clinkAt<950)fxRaf=requestAnimationFrame(drawFx);
    else{burst.style.opacity='0';front.style.opacity='0';}
  }
  // Background fruits burst out of the splash and fly toward the viewer:
  // they start tiny at the clink point and grow past their resting size
  // (overshoot = "coming at you") on a ~0.9s clock, so every scroll speed
  // sees the same 파앙. Before the clink they are hidden.
  let lastDuoT=-1,clinkPt={x:720,y:420};
  const burstOut=k=>{const c=1.7,u=Math.min(1,k)-1;return 1+(c+1)*u*u*u+c*u*u;};
  function placeDepth(t){
    const k=reduce.matches?1:clinked?Math.min(1,(performance.now()-clinkAt)/900):(t>=clinkT+.02?1:0);
    const drift=reduce.matches?0:smooth(clinkT+.3,clinkT+.8,t);
    depthNodes.forEach((n,i)=>{
      const [x,y,w,h,rotation,alpha]=depth[i];
      const ki=Math.max(0,Math.min(1,(k-i*.035)/(1-i*.035)));   // tiny stagger
      const e=burstOut(ki);
      const px=mix(clinkPt.x,x,Math.min(1,e))+Math.sin(t*4.5+i*1.3)*22*drift;
      const py=mix(clinkPt.y,y,Math.min(1,e))+Math.cos(t*3.7+i)*18*drift;
      const scale=.12+.88*e;                                     // overshoots > 1: flies at the viewer
      const angle=rotation+(i%2?1:-1)*(120*(1-ki))+Math.sin(t*3+i)*8*drift;
      n.style.left=px.toFixed(2)+'px';n.style.top=py.toFixed(2)+'px';
      n.style.transform='translate(-50%,-50%) rotate('+angle.toFixed(2)+'deg) scale('+scale.toFixed(4)+')';
      n.style.opacity=(alpha*Math.min(1,ki*5)).toFixed(4);
    });
  }
  function cheers(t,poses){
    // Fire once when scrolling down through the clink; re-arm when scrolling back.
    if(t<clinkT-.05){clinked=false;frontAt=0;}
    if(!clinked&&t>=clinkT&&lastT<clinkT&&lastT>=0&&t-clinkT<.4&&!reduce.matches){
      clinked=true;clinkAt=performance.now();frontAt=0;
      const p=poses.peach,g=poses.grape;
      const x=(p.x+g.x)/2,y=(p.y+g.y)/2-150;
      clinkPt={x,y:y+60};
      burst.style.left=x+'px';burst.style.top=y+'px';
      burst.currentTime=0;burst.play().catch(()=>{});
      if(!fxRaf)fxRaf=requestAnimationFrame(drawFx);
    }
    lastT=t;
  }
  function updateDuo(t){
    const alpha=smooth(0,.10,t)*(1-smooth(1.75,2.05,t));
    duo.style.visibility=alpha>0?'visible':'hidden';duo.style.opacity=alpha.toFixed(4);
    duo.style.transform='translate3d(0,'+(-14*smooth(1.75,2.05,t)).toFixed(2)+'px,0)';
    // Background blooms pink/lime right at the clink.
    duo.style.setProperty('--rich-bloom',smooth(clinkT-.04,clinkT+.28,t).toFixed(4));
    const poses={};
    slots.forEach(slot=>{
      const {node,key,pre,fruit}=slot;
      const {x,y,angle}=pose(slot,t);poses[key]={x,y};
      Object.assign(node.style,{left:x.toFixed(3)+'px',top:y.toFixed(3)+'px',width:pre[2]+'px',height:pre[3]+'px',transform:'translate(-50%,-50%) rotate('+angle.toFixed(3)+'deg)',opacity:String(fruit?.88:1)});
    });
    lastDuoT=t;
    placeDepth(t);
    cheers(t,poses);
    setAccessible(duo,alpha>.9);
  }

  function updateEnding(s){
    const paper=smooth(signoffStart,signoffStart+.25,s),logo=smooth(signoffStart+.20,signoffStart+.45,s);
    ending.style.visibility=paper>0?'visible':'hidden';ending.style.opacity=paper.toFixed(4);
    ending.style.setProperty('--rich-logo-opacity',logo.toFixed(4));setAccessible(ending,logo>.99);
  }
  function render(){
    raf=0;
    const r=root.getBoundingClientRect(),s=-r.top/height;
    // Also restore the archive on a fast reverse jump beyond the RICH viewport.
    if(r.top>height||r.bottom<0){history?.classList.toggle('rich-year-handoff',r.bottom<0);return;}
    updateStory(s);updateDuo(s-productStart);updateEnding(s);
    root.dataset.richProgress=clamp(s/4.65).toFixed(5);
    root.dataset.richScene=s>=4.48?'logo':s>=signoffStart?'signoff':s>=productStart?'products':s>=1.40?'message':s>=1.02?'copy-roll':s>=.83?'new':s>=.55?'year-change':'year-move';
  }
  function queue(){if(!raf)raf=requestAnimationFrame(render);}
  function resize(){geometry();queue();}
  addEventListener('scroll',queue,{passive:true});addEventListener('resize',resize,{passive:true});
  addEventListener('pageshow',resize);reduce.addEventListener?.('change',queue);
  if(history){
    const observer=new MutationObserver(()=>{if(history.querySelector('.history-3d-odometer')){captureAnchor();queue();observer.disconnect();}});
    if(!history.querySelector('.history-3d-odometer'))observer.observe(history,{childList:true,subtree:true});
  }
  root.classList.add('rich-motion-ready');resize();
  document.fonts?.ready.then(resize);
})();
