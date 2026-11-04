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
  const trail=document.createElement('div');
  trail.className='brand-star-trail';
  trail.innerHTML='<i></i><i></i><i></i>';
  flight.prepend(trail);
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
    const textAlpha=1-between(progress,.58,.74);
    const originalAlpha=1-between(progress,.77,.83);
    identity.style.setProperty('--bf-letter-alpha',textAlpha.toFixed(3));
    identity.style.setProperty('--bf-origin-alpha',originalAlpha.toFixed(3));

    identity.classList.toggle('is-star-isolated',progress>.56);
    if(progress<.55)source=null;
    if(progress>.56&&progress<.79)captureSource();
    const historyRect=history.getBoundingClientRect();
    const arrival=clamp((h-historyRect.top)/h);
    const takeover=between(progress,.77,.83);
    const landing=between(arrival,.52,.68);
    const visible=takeover>0 && arrival<.7 && r.top<h && !document.hidden;
    flight.classList.toggle('is-visible',visible);
    if(!visible)return;

    if(!source)source={x:innerWidth*.5,y:h*.52,size:Math.min(190,innerWidth*.135)};
    const fall=clamp(arrival/.65);
    const move=fall*fall;
    // Ask the 3D history renderer for the landmark on the actual can,
    // projected using its current camera/scale/section position.
    const projected=window.__chilsungHistoryStarAnchor?.();
    const target=projected||{
      x:innerWidth*.5,y:historyRect.top+h*.36,size:Math.min(48,innerWidth*.035)
    };
    // During the isolated white pause, position and size do not change.
    // Only after the history wave begins entering does the star descend.
    const x=source.x+(target.x-source.x)*move;
    const y=source.y+(target.y-source.y)*move;
    const size=source.size+(target.size-source.size)*move;
    const tint=between(fall,.06,.72);
    const color=[255,255,255].map((value,i)=>
      Math.round(value+([202,40,49][i]-value)*tint));
    graphic.style.color='rgb('+color.join(',')+')';
    const glow=between(progress,.84,.91)*(1-between(progress,.96,1))*(1-between(fall,0,.12));
    graphic.style.filter='drop-shadow(0 0 '+(4+glow*13).toFixed(1)+'px rgba('+color.join(',')+','+(.1+glow*.5).toFixed(3)+'))';
    graphic.style.transform='translate3d('+(x-size/2).toFixed(2)+'px,'+
      (y-size/2).toFixed(2)+'px,0) scale('+(size/100).toFixed(4)+')';
    flight.style.opacity=(takeover*(1-landing)).toFixed(3);
    const streak=between(fall,.025,.17)*(1-between(fall,.75,.98));
    const length=Math.min(h*.34,240)*streak;
    trail.style.left=x.toFixed(2)+'px';
    trail.style.top=y.toFixed(2)+'px';
    trail.style.width=Math.max(9,size*.22).toFixed(2)+'px';
    trail.style.height=length.toFixed(2)+'px';
    trail.style.color='rgb('+color.join(',')+')';
    trail.style.opacity=(streak*.8).toFixed(3);
    trail.style.transform='translate(-50%,-100%) rotate('+(-Math.atan2(target.x-source.x,Math.max(1,target.y-source.y))*180/Math.PI).toFixed(2)+'deg)';
  }
  function render() {
    frame=0;
    if(reduced.matches) {
      flight.classList.remove('is-visible');
      identity.style.removeProperty('--bf-letter-alpha');
      identity.style.removeProperty('--bf-origin-alpha');
      identity.classList.remove('is-star-isolated');
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
