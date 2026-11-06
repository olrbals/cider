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
  const productStart=2.30,signoffStart=4.35; // V7: copy reel shortened, fruit drop fills it
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
    root.style.height=(height*6.0).toFixed(2)+'px';
    root.style.setProperty('--rich-design-scale',designScale.toFixed(6));
    root.style.setProperty('--rich-duo-scale',Math.min(innerWidth/(innerWidth<750?1100:1440),height/900).toFixed(6));
    captureAnchor();
    depthNodes.forEach((n,i)=>{const [x,y,w,h,r]=depth[i];Object.assign(n.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px',transform:'translate(-50%,-50%) rotate('+r+'deg)'});});
  }
  function setAccessible(el,on){el.inert=!on;el.setAttribute('aria-hidden',String(!on));}
  function updateStory(s){
    if(!anchor)captureAnchor();
    const a=anchor||{x:width*.28,y:height*.56,fontSize:100};
    const morph=reduce.matches?Number(s>=.55):smooth(0,.55,s);
    const change=smooth(.55,.68,s),appear=smooth(.67,.83,s),roll=smooth(1.02,1.40,s);
    const end=1-smooth(2.22,2.40,s),paper=smooth(0,.38,s);
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
  function updateDuo(t){
    const alpha=smooth(0,.10,t)*(1-smooth(1.75,2.05,t));
    duo.style.visibility=alpha>0?'visible':'hidden';duo.style.opacity=alpha.toFixed(4);
    duo.style.transform='translate3d(0,'+(-14*smooth(1.75,2.05,t)).toFixed(2)+'px,0)';
    duo.style.setProperty('--rich-bloom',smooth(.65,1.25,t).toFixed(4));
    slots.forEach(({node,side,pre,post,fruit})=>{
      const delay=side*.055+(fruit?.06:0);
      const entry=reduce.matches?1:smooth(.025+delay,.51+delay,t);
      const cross=reduce.matches?1:smooth(.65+(fruit?.04:0),1.25+(fruit?.04:0),t);
      // Fixed-size bottles slip past in different depth layers; no impact impulse.
      const bend=fruit?mix(pre[0],post[0],cross):cubic(pre[0],side?700:750,side?450:950,post[0],cross);
      const flight=reduce.matches?0:Math.sin(Math.PI*smooth(.70,1.60,t));
      const drift=reduce.matches?0:smooth(1.28,1.60,t);
      const x=bend+(side?760:-760)*(1-entry)+(fruit?(side?1:-1)*160*flight:0);
      const y=mix(pre[1],post[1],cross)+(side?1:-1)*(fruit?10:32)*Math.sin(Math.PI*cross)
        -(fruit?(side?190:145)*flight:0)+(fruit?Math.sin(t*5+pre[0]) * 20 * drift:0);
      const angle=mix(pre[4],post[4],cross)+(fruit?(side?1:-1)*48*flight+Math.sin(t*4)*9*drift:0);
      Object.assign(node.style,{left:x.toFixed(3)+'px',top:y.toFixed(3)+'px',width:pre[2]+'px',height:pre[3]+'px',transform:'translate(-50%,-50%) rotate('+angle.toFixed(3)+'deg)',opacity:String(fruit?.88:1)});
    });
    depthNodes.forEach((n,i)=>{
      const [x,y,w,h,rotation,alpha]=depth[i];
      const launch=reduce.matches?1:smooth(.78+(i%3)*.045,1.48+(i%3)*.045,t);
      const pulse=reduce.matches?0:Math.sin(Math.PI*launch);
      const travel=reduce.matches?0:smooth(1.35,1.75,t);
      const px=mix(720+(x-720)*.48,x,launch)+(x<720?-1:1)*80*pulse;
      const py=mix(480+(y-480)*.45,y,launch)-100*pulse+Math.sin(t*4.5+i*1.3)*28*travel;
      const angle=rotation+(reduce.matches?0:(i%2?1:-1)*(32*pulse+Math.sin(t*3+i)*8*travel));
      n.style.left=px.toFixed(2)+'px';n.style.top=py.toFixed(2)+'px';
      n.style.transform='translate(-50%,-50%) rotate('+angle.toFixed(2)+'deg)';
      n.style.opacity=(alpha*smooth(.80,1.12,t)).toFixed(4);
    });
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
    root.dataset.richProgress=clamp(s/5.0).toFixed(5);
    root.dataset.richScene=s>=4.80?'logo':s>=signoffStart?'signoff':s>=productStart?'products':s>=1.40?'message':s>=1.02?'copy-roll':s>=.83?'new':s>=.55?'year-change':'year-move';
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
