/* Scroll storyboard: Brand Value -> Fizz -> Seven Stars -> 1950.
 * Same star moves from its existing letterform into the actual 3D can projection.
 * Kept independent from existing Hero WebP and History geometry/rotation.
 */
(() => {
  'use strict';
  const values=document.querySelector('#brand-values');
  const stage=values?.querySelector('.brand-values__stage');
  const words=[...(values?.querySelectorAll('.brand-values__word')||[])];
  const identity=document.querySelector('#identity');
  const history=document.querySelector('#history');
  if(!values||!stage||words.length!==3||!identity||!history)return;

  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=v=>Math.max(0,Math.min(1,v));
  const ease=t=>{const a=clamp(t);return a*a*(3-2*a)};
  const between=(p,a,b)=>ease((p-a)/(b-a));
  const viewport=()=>Math.max(1,innerHeight);

  // A single site-wide ambient carbonation canvas already covers this area.
  // Don't add another local bubble layer on top of it.
  const flight=document.createElement('div');
  flight.className='brand-star-flight';
  flight.setAttribute('aria-hidden','true');
  flight.innerHTML='<svg viewBox="0 0 100 100" focusable="false"><path d="M50 6 L61.7 36 H93 L68 55.3 L77.5 86.5 L50 68.2 L22.5 86.5 L32 55.3 L7 36 H38.3 Z"/></svg>';
  document.body.append(flight);
  const graphic=flight.querySelector('svg');
  let frame=0;
  let source=null;

  function captureSource() {
    // scene-polish.js replaces the A of STARS with this SVG;
    // use its rendered bounding box to avoid a jump when the overlay takes over.
    const element=identity.querySelector('.identity-display .identity-main-star');
    if(!element)return;
    const rect=element.getBoundingClientRect();
    if(rect.width>5 && rect.height>5 && rect.top>-viewport()*.1 && rect.bottom<viewport()*1.2) {
      source={x:rect.left+rect.width/2,y:rect.top+rect.height/2,
        size:Math.min(rect.width,rect.height)};
    }
  }
  function drawPrinciples() {
    const rect=values.getBoundingClientRect();
    const h=viewport();
    if(rect.top>h||rect.bottom<0)return;
    const progress=clamp(-rect.top/Math.max(1,rect.height-h));
    const counter=values.querySelector('.brand-values__counter');
    if(counter)counter.textContent=String(Math.min(3,Math.floor(progress*3)+1)).padStart(2,'0')+' - 03';
    const cuts=[[0,.34],[.33,.67],[.66,1]];
    words.forEach((word,i)=>{
      const [a,b]=cuts[i];
      const entering=i===0?1:between(progress,a-.028,a+.045);
      const leaving=i===2?1:1-between(progress,b-.075,b+.025);
      const opacity=clamp(entering*leaving);
      const dy=(1-entering)*24+(1-leaving)*-25;
      word.style.opacity=opacity.toFixed(3);
      word.style.transform='translate3d(0,'+dy.toFixed(2)+'px,0) scale('+
        (1-.025*(1-opacity)).toFixed(4)+')';
      word.setAttribute('aria-hidden',opacity<.2?'true':'false');
    });
    stage.style.backgroundColor='#ffffff';
  }
  function drawStar() {
    const r=identity.getBoundingClientRect();
    const h=viewport();
    const available=Math.max(1,r.height-h);
    const progress=clamp(-r.top/available);
    // The typography eases away while the star retains its exact position.
    const textAlpha=1-between(progress,.43,.59);
    const originalAlpha=1-between(progress,.60,.66);
    identity.style.setProperty('--bf-letter-alpha',textAlpha.toFixed(3));
    identity.style.setProperty('--bf-origin-alpha',originalAlpha.toFixed(3));

    const paper=between(progress,.60,.76);
    identity.style.setProperty('--bf-paper',paper.toFixed(4));
    identity.style.setProperty('--bf-surface',[20,159,92].map(v=>Math.round(v+(255-v)*paper)).join(','));
    const glow=between(progress,.43,.52)*(1-between(progress,.62,.72));
    identity.style.setProperty('--bf-glow',glow.toFixed(4));
    identity.classList.toggle('is-star-isolated',progress>.42);
    if(progress<.40)source=null;
    if(progress>.42&&progress<.64)captureSource();
    const historyRect=history.getBoundingClientRect();
    const arrival=clamp((h-historyRect.top)/h);
    const takeover=between(progress,.60,.66);
    const landing=between(arrival,.65,.75);
    const visible=takeover>0 && arrival<.77 && r.top<h && !document.hidden;
    flight.classList.toggle('is-visible',visible);
    if(!visible)return;

    if(!source)source={x:innerWidth*.5,y:h*.52,size:Math.min(190,innerWidth*.135)};
    const depart=between(progress,.72,1);
    const fall=clamp(arrival/.73);
    const move=ease(fall);
    // Ask the 3D history renderer for the landmark on the actual can,
    // projected using its current camera/scale/section position.
    const projected=window.__chilsungHistoryStarAnchor?.();
    const target=projected||{
      x:innerWidth*.5,y:historyRect.top+h*.36,size:Math.min(48,innerWidth*.035)
    };
    // During the isolated white pause, position and size do not change.
    // Only after the history wave begins entering does the star descend.
    // A broad gentle arc occupies the extended white hold; landing then tracks
    // the renderer's moving screen-space landmark, with zero end velocity.
    const waypoint={x:source.x+Math.min(innerWidth*.13,160),y:Math.min(source.y+h*.10,h*.66)};
    const startX=source.x+(waypoint.x-source.x)*depart;
    const startY=source.y+(waypoint.y-source.y)*depart;
    const x=startX+(target.x-startX)*move+Math.sin(Math.PI*move)*Math.min(innerWidth*.055,65);
    const y=startY+(target.y-startY)*move;
    const size=source.size+(target.size-source.size)*move;
    const tint=between(fall,.68,.96);
    const green=[255,255,255].map((v,i)=>v+([20,159,92][i]-v)*paper);
    const color=green.map((value,i)=>Math.round(value+([202,40,49][i]-value)*tint));
    graphic.style.color='rgb('+color.join(',')+')';
    graphic.style.filter='drop-shadow(0 0 '+(4+glow*13).toFixed(1)+'px rgba('+color.join(',')+','+(.1+glow*.5).toFixed(3)+'))';
    graphic.style.transform='translate3d('+(x-size/2).toFixed(2)+'px,'+
      (y-size/2).toFixed(2)+'px,0) scale('+(size/100).toFixed(4)+')';
    flight.style.opacity=(takeover*(1-landing)).toFixed(3);
  }
  function render() {
    frame=0;
    if(reduced.matches) {
      flight.classList.remove('is-visible');
      identity.style.removeProperty('--bf-letter-alpha');
      identity.style.removeProperty('--bf-origin-alpha');
      identity.classList.remove('is-star-isolated');
      identity.style.removeProperty('--bf-surface');
      identity.style.removeProperty('--bf-paper');
      identity.style.removeProperty('--bf-glow');
      stage.style.backgroundColor='#ffffff';
      return;
    }
    drawPrinciples();
    drawStar();
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(render);}
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',()=>{source=null;schedule();},{passive:true});
  addEventListener('chilsung:history-star-ready',schedule);
  document.addEventListener('visibilitychange',schedule);
  reduced.addEventListener('change',schedule);
  addEventListener('load',schedule,{once:true});
  schedule();
})();
