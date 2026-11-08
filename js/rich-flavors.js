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
  const productStart=1.98,signoffStart=99; // V9: no in-section signoff; the green footer waves in after RICH
  const slots=[
    {key:'slice',side:0,pre:[200,360,180,143.59,29.53],post:[392,352,180,143.59,29.53]},
    {key:'peach',side:0,pre:[376.854,438.017,212,530.134,7],post:[591.7145,417.862,212,530.134,-8]},
    {key:'whole',side:0,pre:[210,700,140,140,-162.11],post:[398,690,140,140,-162.11]},
    {key:'bunch',side:1,pre:[1250,380,240,240,-55.55],post:[1078,372,240,240,-55.55]},
    {key:'grape',side:1,pre:[952.233,450.0195,222.965,557.554,-7],post:[823.994,522.649,222.965,557.554,12]},
    {key:'single',side:1,pre:[1260,640,100,100,-30],post:[1092,636,100,100,-30]}
  ].map(s=>({...s,node:duo.querySelector('[data-rich-slot="'+s.key+'"]'),fruit:!['peach','grape'].includes(s.key)}));
  // 11-08: spread out so nothing piles up (two background fruits retired: alpha 0).
  const depth=[[16.759,737.49,600,478.632,160,.52],[1480,1020,700,700,-30,.52],[1361.8075,-53.1925,600,600,-30,.56],[241.229,45.229,313.054,313.054,-25.16,.48],[240.807,449.807,89.915,89.915,-25.16,0],[674.5055,80.5055,77.146,77.146,72.23,.24],[1258.1805,466.1805,150,150,76.76,0],[789.713,92.713,100,100,-81.46,.24],[110,395,220,175.5,20,.42],[1330,560,160,160,-25,.38],[600,860,140,140,40,.40],[1000,840,170,170,-60,.36]];
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
    root.style.height=(height*4.45).toFixed(2)+'px';
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
    const destinationY=(height-900*designScale)/2+374*designScale;   // 11-08: year + copy centred as one group
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
    const cross=reduce.matches?1:smooth(.46+(fruit?.04:0),.98+(fruit?.04:0),t);
    const bend=mix(pre[0],post[0],cross);   // 11-08: bottles glide to their places side by side — they no longer cross
    const flight=reduce.matches?0:Math.sin(Math.PI*smooth(.50,1.25,t));
    const drift=reduce.matches?0:smooth(1.0,1.3,t);
    const x=bend+(side?760:-760)*(1-entry)+(fruit?(side?1:-1)*160*flight:0);
    const y=mix(pre[1],post[1],cross)+(side?1:-1)*(fruit?10:32)*Math.sin(Math.PI*cross)
      -(fruit?(side?190:145)*flight:0)+(fruit?Math.sin(t*5+pre[0]) * 20 * drift:0);
    let angle=mix(pre[4],post[4],cross)+(fruit?(side?1:-1)*48*flight+Math.sin(t*4)*9*drift:0);
    let fy=y,fx=x,spin=0;
    if(!fruit&&!reduce.matches){
      // '챠악': snaps in fast as if swept by a wave — rides up a crest and
      // the 3D PET spins on its own axis (1.5 turns) to land label-front.
      // Flowing entry: one long, soft ease (no snap), riding a gentle swell
      // up from below while the PET turns once on its axis like it's carried
      // by water, landing label-front.
      const k=clamp((t-(.02+delay))/.62), e=k*k*k*(k*(6*k-15)+10);   // smootherstep
      fx=bend+(side?760:-760)*(1-e);
      fy+=200*(1-e)**2 - 46*Math.sin(Math.PI*e)*(1-e*.5);
      spin=(side?-1:1)*(1-e)*Math.PI*2;
      angle+=(side?1:-1)*(22*(1-e)+8*Math.sin(e*Math.PI*1.5)*(1-e));
    }
    return {x:fx,y:fy,angle,spin};
  }
  let clinkT=.95;
  function findClink(){
    const peach=slots.find(s=>s.key==='peach'),grape=slots.find(s=>s.key==='grape');
    let best=1e9;for(let t=.45;t<=1.2;t+=.005){const d=Math.abs(pose(peach,t).x-pose(grape,t).x);if(d<best){best=d;clinkT=t;}}
  }
  // Clink: no water. The bottles tap necks, the background blooms and the
  // fruits pop out from between the bottles toward the viewer.
  let clinked=false,clinkAt=0,fxRaf=0,lastT=-1;
  function drawFx(now){
    fxRaf=0;
    if(lastDuoT>=0)placeDepth(lastDuoT);
    // Juicy squash-and-pop on the bottles and fruits at the tap.
    const k=clinked?Math.min(1,(now-clinkAt)/480):1;
    const pop=Math.sin(k*Math.PI)*(1-k)*1.6;
    duo.style.setProperty('--rich-pop',pop.toFixed(4));
    if(clinked&&now-clinkAt<1000)fxRaf=requestAnimationFrame(drawFx);
    else duo.style.setProperty('--rich-pop','0');
  }
  // Background fruits pop out from the clink and fly toward the viewer:
  // they start tiny at the clink point and grow past their resting size
  // (overshoot = "coming at you") on a ~0.9s clock, so every scroll speed
  // sees the same 파앙. Before the clink they are hidden.
  let lastDuoT=-1,clinkPt={x:720,y:420};
  const DEPTH_DELAY=[0,.12,.05,.2,.09,.16,.03,.22,.14,.07,.18,.1];
  const burstOut=k=>{const c=2.4,u=Math.min(1,k)-1;return 1+(c+1)*u*u*u+c*u*u;};
  function placeDepth(t){
    const k=reduce.matches?1:clinked?Math.min(1,(performance.now()-clinkAt)/500):(t>=clinkT-.53?1:0);
    const drift=reduce.matches?0:smooth(clinkT+.3,clinkT+.8,t);
    depthNodes.forEach((n,i)=>{
      const [x,y,w,h,rotation,alpha]=depth[i];
      // 파팍: scattered pops, not one clump — each fruit starts already spread
      // out on its own side and lands on its own beat.
      const delay=DEPTH_DELAY[i%DEPTH_DELAY.length]*.7;
      const ki=Math.max(0,Math.min(1,(k-delay)/(1-delay)));
      // 11-08 '슈우우우웅!': like a ball thrown from far away — a perspective
      // approach (z 9 → 1): it stays small in the distance, then rushes up to
      // full size in the last moment, lands with a tiny overshoot.
      const Z0=16,z=Z0-(Z0-1)*ki,persp=(1/z-1/Z0)/(1-1/Z0);        // 0 → 1, accelerating
      const land=ki>=1?0:Math.max(0,Math.sin(Math.PI*Math.min(1,(ki-.78)/.22)))*.28;   // rushes up close, then eases back
      const px=mix(clinkPt.x,x,persp)+Math.sin(t*4.5+i*1.3)*22*drift;
      const py=mix(clinkPt.y,y,persp)+Math.cos(t*3.7+i)*18*drift;
      const scale=(.02+.98*persp)*(1+land);
      const speed=ki<1?(1/(z*z))*(Z0-1)/(1-1/Z0):0;               // d(persp)/dk — motion blur follows speed
      const blur=Math.min(7,speed*1.6)*(ki<.98?1:0);
      const twist=(i%2?1:-1)*30*(1-persp);
      n.style.left=px.toFixed(2)+'px';n.style.top=py.toFixed(2)+'px';
      n.style.transform='translate(-50%,-50%) rotate('+(rotation+twist).toFixed(2)+'deg) scale('+scale.toFixed(4)+')';
      n.style.filter=blur>.2?'blur('+blur.toFixed(1)+'px)':'';
      n.style.opacity=(alpha*Math.min(1,ki*8)).toFixed(4);
    });
  }
  function cheers(t,poses){
    // Fire once when scrolling down through the clink; re-arm when scrolling back.
    // 11-08: fire while the bottles are still flying in, so the fruits have
    // all arrived by the time the bottles land.
    const fire=clinkT-.55;
    if(t<fire-.05)clinked=false;
    if(!clinked&&t>=fire&&lastT<fire&&lastT>=0&&t-fire<.5&&!reduce.matches){
      clinked=true;clinkAt=performance.now();
      const p=poses.peach,g=poses.grape;
      clinkPt={x:(p.x+g.x)/2,y:(p.y+g.y)/2-90};
      if(!fxRaf)fxRaf=requestAnimationFrame(drawFx);
    }
    lastT=t;
  }
  // Scroll-driven again, but fluid: the scene time glides toward the
  // scroll position (critically damped follow) instead of jumping with
  // each wheel step, so it reacts to scroll and still moves like water.
  const DUO_END=1.45, DUO_PER_SCREEN=1.6;
  let duoClock=0,duoTarget=0,duoRaf=0,duoLast=0,scrollDuo=0;
  function tickDuo(now){
    duoRaf=0;
    const dt=Math.min(.05,(now-(duoLast||now))/1000);duoLast=now;
    duoClock+=(duoTarget-duoClock)*(1-Math.exp(-dt*3.6));   // 11-08: bottles glide in a little slower
    if(Math.abs(duoTarget-duoClock)<.0008)duoClock=duoTarget;
    paintDuo(duoClock,scrollDuo);
    if(duoClock!==duoTarget)duoRaf=requestAnimationFrame(tickDuo);else duoLast=0;
  }
  function updateDuo(t){
    scrollDuo=t;
    duoTarget=reduce.matches?(t>0?DUO_END:0):Math.max(0,Math.min(DUO_END,t*DUO_PER_SCREEN));
    if(t<-.3)duoClock=0;
    if(duoClock!==duoTarget&&!duoRaf)duoRaf=requestAnimationFrame(tickDuo);
    paintDuo(duoClock,t);
  }
  function paintDuo(t,st){
    const exit=smooth(signoffStart-productStart-.3,signoffStart-productStart,st);
    const alpha=smooth(0,.10,t)*(st>-.05?1:0)*(1-exit);
    duo.style.visibility=alpha>0?'visible':'hidden';duo.style.opacity=alpha.toFixed(4);
    duo.style.transform='translate3d(0,'+(-14*exit).toFixed(2)+'px,0)';
    // Background blooms pink/lime right at the clink.
    duo.style.setProperty('--rich-bloom',smooth(clinkT-.04,clinkT+.28,t).toFixed(4));
    const poses={};
    slots.forEach(slot=>{
      const {node,key,pre,fruit}=slot;
      const {x,y,angle,spin}=pose(slot,t);poses[key]={x,y};
      if(!fruit){node.richSpin=spin;node.richAngle=angle;}
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
    root.dataset.richProgress=clamp(s/3.45).toFixed(5);
    root.dataset.richScene=s>=3.75?'logo':s>=signoffStart?'signoff':s>=productStart?'products':s>=1.40?'message':s>=1.02?'copy-roll':s>=.83?'new':s>=.55?'year-change':'year-move';
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
