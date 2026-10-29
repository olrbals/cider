/* Figma scroll handoff: history 2024 → intro rises from below → PEACH slides left → GRAPE slides left.
   Updates only during user scroll/resize. Reverses when scrolling up. */
(() => {
  'use strict';
  const section=document.querySelector('#rich-flavors');
  if(!section)return;
  const intro=section.querySelector('.rich-new-flavor');
  const peach=section.querySelector('.rich-fg--peach');
  const grape=section.querySelector('.rich-fg--grape');
  if(!intro||!peach||!grape)return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=t=>Math.min(1,Math.max(0,t));
  const smooth=(start,end,p)=>{const t=clamp((p-start)/(end-start));return t*t*(3-2*t);};
  let frame=0;
  let scale=1;
  function updateGeometry(){
    const w=window.innerWidth,h=window.innerHeight;
    scale=Math.min(w/1440,h/900);
    const top=(h-900*scale)/2+648*scale;
    section.style.setProperty('--rich-design-scale',String(scale));
    section.style.setProperty('--rich-band-top',top.toFixed(2)+'px');
  }
  function render(){
    frame=0;
    const b=section.getBoundingClientRect();
    const vh=window.innerHeight;
    if(b.top>vh||b.bottom<0)return;
    const scrollRange=Math.max(1,section.offsetHeight-vh);
    const progress=clamp(-b.top/scrollRange);
    const introIn=reduced.matches?Number(progress>=.11):smooth(.0,.22,progress);
    const peachIn=reduced.matches?Number(progress>=.40):smooth(.28,.51,progress);
    const grapeIn=reduced.matches?Number(progress>=.70):smooth(.57,.79,progress);
    intro.style.transform='translate3d(0,'+((1-introIn)*100).toFixed(3)+'%,0)';
    peach.style.transform='translate3d('+((1-peachIn)*100).toFixed(3)+'%,0,0)';
    grape.style.transform='translate3d('+((1-grapeIn)*100).toFixed(3)+'%,0,0)';
  }
  function request(){if(!frame)frame=requestAnimationFrame(render);}
  function resized(){updateGeometry();request();}
  window.addEventListener('scroll',request,{passive:true});
  window.addEventListener('resize',resized,{passive:true});
  reduced.addEventListener?.('change',request);
  window.addEventListener('pageshow',resized);
  resized();
})();
