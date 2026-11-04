/* Original Blender star only, in its unchanged Figma position and appearance. */
(() => {
  'use strict';
  const hero=document.querySelector('#top.hero');
  if(!hero)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=n=>Math.max(0,Math.min(1,n));
  let frame=0;
  function render(){
    frame=0;
    const p=clamp(-hero.getBoundingClientRect().top/Math.max(1,hero.offsetHeight-innerHeight));
    const t=reduced.matches?0:clamp((p-.15)/.15);
    hero.style.setProperty('--hero-star-opacity',(t*t*(3-2*t)*.4).toFixed(4));
    hero.dataset.heroScene=t===0?'static':t===1?'star':'reveal';
  }
  function queue(){if(!frame)frame=requestAnimationFrame(render);}
  function resize(){
    hero.style.setProperty('--hero-layout-scale',Math.min(innerWidth/1440,innerHeight/900).toFixed(6));
    queue();
  }
  addEventListener('scroll',queue,{passive:true});
  addEventListener('resize',resize,{passive:true});
  reduced.addEventListener('change',queue);
  resize();
})();
