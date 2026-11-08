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
  const aperture=graphic.cloneNode(true);
  aperture.classList.add('brand-star-aperture');
  identity.querySelector('.identity-stage').prepend(aperture);
  const playhead={progress:0};
  const HOLD_AT=.70,HOLD_SCREENS=.7;   // mirrored in scene-polish.js
  let frame=0;
  let source=null;
  let archiveActive=false;
  const historyStage=history.querySelector('.history-3d-stage');
  history.classList.toggle('has-star-entry',!reduced.matches);

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
    // 11-07 시안: three principles, each with a Korean line and a small gag.
    const cuts=[[0,.27],[.26,.52],[.51,.77]];
    if(counter){const at=progress<.26?0:progress<.51?1:2;[...counter.children].forEach((d,i)=>d.classList.toggle('is-on',i===at));counter.dataset.at=at;}
    words.forEach((word,i)=>{
      const [a,b]=cuts[i];
      const entering=i===0?1:between(progress,a-.028,a+.045);
      const leaving=1-between(progress,b-.06,b+.02);
      const opacity=clamp(entering*leaving);
      const dy=(1-entering)*24+(1-leaving)*-25;
      word.style.opacity=opacity.toFixed(3);
      word.style.transform='translate3d(0,'+dy.toFixed(2)+'px,0) scale('+
        (1-.025*(1-opacity)).toFixed(4)+')';
      word.setAttribute('aria-hidden',opacity<.2?'true':'false');
      // Text motion runs on its own clock once the word has (half) arrived,
      // so fast scrolling never rushes it; re-arms when the word leaves.
      // PURE waits for the visitor's first scroll into the section.
      const ready=opacity>.5&&(i>0||progress>=.035);
      if(ready&&!word.classList.contains('is-playing'))word.classList.add('is-playing');
      else if(opacity<.08||(i===0&&progress<.01))word.classList.remove('is-playing');
      if(i===1){const sh=values.querySelector('.bv-shine');if(sh){sh.style.opacity=opacity.toFixed(3);sh.classList.toggle('is-playing',word.classList.contains('is-playing'));}}
    });
    // Recap before FEEL THE FIZZ: 칠성사이다가 지켜온 3가지 원칙.
    const recap=values.querySelector('.brand-values__recap');
    if(recap){
      const main=between(progress,.76,.82),lead=between(progress,.8,.86);
      recap.querySelector('.brand-values__recap-main').style.cssText='opacity:'+main.toFixed(3)+';transform:translate3d(0,'+((1-main)*30).toFixed(1)+'px,0) scale('+(.95+.05*main).toFixed(3)+')';
      recap.querySelector('.brand-values__recap-lead').style.cssText='opacity:'+lead.toFixed(3)+';transform:translate3d(0,'+((1-lead)*16).toFixed(1)+'px,0)';
      // Corner labels stay for the three words and step aside for the recap.
      values.style.setProperty('--bv-labels',(1-between(progress,.74,.79)).toFixed(3));
    }
    // Corner labels blend between the principle colours with the words.
    const mix=(x,y,k)=>x.map((v,j)=>Math.round(v+(y[j]-v)*k));
    const pal=[[20,159,92],[20,159,92],[20,159,92]];   // 11-07: all three principles in Chilsung green
    const k1=between(progress,.26-.028,.26+.045),k2=between(progress,.51-.028,.51+.045);
    let rgb=k2>0?mix(pal[1],pal[2],k2):mix(pal[0],pal[1],k1);
    values.style.setProperty('--bv-accent','rgb('+rgb.join(',')+')');
    stage.style.backgroundColor='#ffffff';
  }
  function drawStar() {
    const r=identity.getBoundingClientRect();
    // Once the handoff is offscreen, stop rewriting it and reading its layout
    // during every archive scroll frame. Re-enter immediately on reverse scroll.
    if(r.bottom<=0){
      if(!archiveActive){
        flight.classList.remove('is-visible');
        historyStage.style.setProperty('--history-entry-opacity','1');
        archiveActive=true;
        window.dispatchEvent(new CustomEvent('chilsung:star-progress',{detail:1}));
      }
      return;
    }
    archiveActive=false;
    const h=viewport();
    const available=Math.max(1,r.height-h);
    const rawProgress=window.gsap&&window.ScrollTrigger?playhead.progress:clamp(-r.top/available);
    // 11-07: hold the white "시대를 깨운 청량함" screen for ~70svh of scroll.
    // The section is that much taller; everything else keeps its old pace.
    const holdPx=h*HOLD_SCREENS,base=Math.max(1,available-holdPx),sp=rawProgress*available,at=HOLD_AT*base;
    const progress=sp<at?sp/base:sp<at+holdPx?HOLD_AT:clamp((sp-holdPx)/base);
    window.dispatchEvent(new CustomEvent('chilsung:star-progress',{detail:progress}));
    // The typography eases away while the star retains its exact position.
    const textAlpha=1-between(progress,.34,.45);
    const originalAlpha=1-between(progress,.42,.47);
    identity.style.setProperty('--bf-letter-alpha',textAlpha.toFixed(3));
    identity.style.setProperty('--bf-origin-alpha',originalAlpha.toFixed(3));

    const openEnd=.68;
    const paper=between(progress,.43,openEnd);
    const paperOpen=paper===1;
    const fall=between(progress,openEnd,.985);
    identity.classList.toggle('is-paper-open',paperOpen);
    identity.style.setProperty('--bf-paper',paper.toFixed(4));
    const glow=0;
    identity.style.setProperty('--bf-glow',glow.toFixed(4));
    identity.classList.toggle('is-star-isolated',progress>.34);
    if(progress<.32)source=null;
    if(progress>.34&&progress<.43)captureSource();
    const historyRect=history.getBoundingClientRect();
    const takeover=between(progress,.42,.47);
    const landing=between(progress,.945,.995);
    const visible=fall>.40 && progress<.995 && r.bottom>0 && r.top<h && !document.hidden;
    // 11-07: history is fully there under the white tide sheet (seven-stars-pop.js).
    const entry=progress>=(window.__sevenStarsTideStart??.665)?1:between(progress,.75,.95);
    historyStage.style.setProperty('--history-entry-opacity',historyRect.top>0?entry.toFixed(4):'1');
    identity.classList.toggle('is-star-opening',progress>.40);
    const center=source||{x:innerWidth*.5,y:h*.55,size:Math.min(190,innerWidth*.135)};
    const huge=Math.hypot(innerWidth,h)*3.25;
    // Ease the change in perceived scale so the star reads before it fills the screen.
    const expanded=center.size*Math.pow(huge/center.size,paper);
    const ax=center.x+(innerWidth*.5-center.x)*paper;
    const ay=center.y+(h*.5-center.y)*paper;
    aperture.style.opacity=paperOpen?'0':takeover.toFixed(4);
    if(!paperOpen&&takeover>0){
      const stageBox=identity.querySelector('.identity-stage').getBoundingClientRect();
      aperture.style.transform='translate('+(ax-expanded/2-stageBox.left)+'px,'+(ay-expanded/2-stageBox.top)+'px) scale('+(expanded/100)+')';
    }
    // 11-07: no second star flying down onto the can — history simply fades in.
    flight.classList.remove('is-visible');
    if(true||!visible)return;

    const move=fall;
    // Ask the 3D history renderer for the landmark on the actual can,
    // projected using its current camera/scale/section position.
    const projected=window.__chilsungHistoryStarAnchor?.();
    // A fallback picture has no reliable UV landmark: dissolve centrally
    // rather than pretending to align with an unknown printed star.
    const target=projected||{x:innerWidth*.5,y:h*.55,size:Math.min(90,innerWidth*.18)};
    const x=ax+(target.x-ax)*move;
    const y=ay+(target.y-ay)*move;
    const size=Math.exp(Math.log(expanded)*(1-move)+Math.log(target.size)*move);
    // Match the narrower footprint of the artwork on the curved label.
    const width=projected?size*(1+(projected.width/projected.size-1)*move):size;
    const tint=between(fall,.76,.96);
    const green=[255,255,255].map((v,i)=>v+([20,159,92][i]-v)*between(fall,.40,.68));
    const color=green.map((value,i)=>Math.round(value+([202,40,49][i]-value)*tint));
    graphic.style.color='rgb('+color.join(',')+')';
    graphic.style.filter='none';
    graphic.style.transform='translate3d('+(x-width/2).toFixed(2)+'px,'+
      (y-size*(.5-.0375*move)).toFixed(2)+'px,0) scale('+
      (width/100).toFixed(4)+','+(size/100).toFixed(4)+')';
    flight.style.opacity=(1-(projected?landing:between(progress,.89,.96))).toFixed(3);
  }
  function render() {
    frame=0;
    history.classList.toggle('has-star-entry',!reduced.matches);
    if(reduced.matches) {
      flight.classList.remove('is-visible');
      identity.style.removeProperty('--bf-letter-alpha');
      identity.style.removeProperty('--bf-origin-alpha');
      identity.classList.remove('is-star-isolated');
      identity.style.removeProperty('--bf-surface');
      identity.style.removeProperty('--bf-paper');
      identity.style.removeProperty('--bf-glow');
      aperture.style.opacity='0';
      identity.classList.remove('is-star-opening');
      identity.classList.remove('is-paper-open');
      const hs=history.querySelector('.history-3d-stage');
      hs.style.removeProperty('--history-entry-opacity');
      archiveActive=false;
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
  if(window.gsap&&window.ScrollTrigger){
    window.gsap.registerPlugin(window.ScrollTrigger);
    window.gsap.to(playhead,{progress:1,ease:'none',onUpdate:schedule,scrollTrigger:{id:'brand-star-opening',trigger:identity,start:'top top',end:'bottom bottom',scrub:.30,invalidateOnRefresh:true}});
  }
  schedule();
})();
