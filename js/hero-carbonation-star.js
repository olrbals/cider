/* Quiet Figma poster → pressure shake → sharp water-star release.
   Replaces can opening and downward liquid curtain, using a reversible scroll position. */
(() => {
  'use strict';
  const hero=document.querySelector('#top.hero');
  const field=hero?.querySelector('.hero-carbonation-bubbles');
  if(!hero||!field)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=n=>Math.max(0,Math.min(1,n));
  const phase=(p,a,b)=>{const t=clamp((p-a)/(b-a));return t*t*(3-2*t);};
  const bubbles=Array.from({length:22},(_,i)=>{
    const node=document.createElement('i');node.className='hero-carbonation-bubble';
    const size=3+i%4*2;node.style.width=node.style.height=size+'px';field.append(node);
    return {node,angle:i*2.39996323,radius:250+i%6*36};
  });
  let frame=0,progress=0,lastScroll=scrollY,lastMove=-Infinity;
  function draw(now){
    frame=0;
    const p=reduced.matches?0:progress;
    const release=clamp((p-.28)/.105);
    const burst=1-Math.pow(1-release,3);
    hero.style.setProperty('--hero-star-opacity',(phase(p,.28,.305)*.4).toFixed(4));
    hero.style.setProperty('--hero-star-scale',(.2+.8*burst).toFixed(4));
    const pressure=phase(p,.015,.16)*(1-phase(p,.24,.28));
    const active=1-phase(now-lastMove,60,190);
    hero.style.setProperty('--hero-shake',(Math.sin(now*.09)*3.6*pressure*active).toFixed(2)+'px');
    bubbles.forEach(({node,angle,radius},i)=>{
      const t=clamp((p-.28-i%4*.004)/.24),spread=1-Math.pow(1-t,2);
      node.style.transform=`translate(${(Math.cos(angle)*radius*spread).toFixed(2)}px,${(Math.sin(angle)*radius*spread-60*spread).toFixed(2)}px)`;
      node.style.opacity=(phase(t,0,.08)*(1-phase(t,.30,1))*.65).toFixed(3);
    });
    hero.dataset.heroScene=p<.015?'static':p<.28?'pressure':p<.40?'burst':'hold';
    if(pressure*active>.001)frame=requestAnimationFrame(draw);
  }
  function update(){
    if(scrollY!==lastScroll){lastMove=performance.now();lastScroll=scrollY;}
    const box=hero.getBoundingClientRect();
    progress=clamp(-box.top/Math.max(1,hero.offsetHeight-innerHeight));
    if(!frame)frame=requestAnimationFrame(draw);
  }
  function resize(){
    hero.style.setProperty('--hero-layout-scale',Math.min(innerWidth/1440,innerHeight/900).toFixed(6));update();
  }
  addEventListener('scroll',update,{passive:true});addEventListener('resize',resize,{passive:true});
  reduced.addEventListener('change',resize);resize();
})();
