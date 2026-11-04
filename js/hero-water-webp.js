/* Blender BACK / MID / FRONT. Scroll driven by hero-splash.js, no extra RAF loop or WebGL. */
(() => {
  'use strict';
  const hero=document.querySelector('#top.hero');
  const stage=hero?.querySelector('.hero-splash-stage');
  if(!hero||!stage||stage.querySelector('.hw-composite'))return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const mobile=matchMedia('(max-width: 700px)');
  const clamp=n=>Math.max(0,Math.min(1,n));
  const smooth=x=>{const t=clamp(x);return t*t*(3-2*t)};
  const phase=(p,a,b)=>smooth((p-a)/(b-a));
  const mix=(a,b,t)=>a+(b-a)*t;
  const wrap=document.createElement('div');
  wrap.className='hw-composite';wrap.setAttribute('aria-hidden','true');
  wrap.innerHTML=`<div class="hw-fill"></div>
    <div class="hw-ribbon">
      <img class="hw-back" src="img/hero-water/hero_water_back.webp" decoding="async" alt="" width="960" height="360">
      <img class="hw-mid" src="img/hero-water/hero_water_mid.webp" decoding="async" alt="" width="960" height="360">
      <img class="hw-front" src="img/hero-water/hero_water_front.webp" decoding="async" alt="" width="960" height="360">
    </div><div class="hw-bubbles"></div>`;
  stage.append(wrap);
  const fill=wrap.querySelector('.hw-fill');
  const ribbon=wrap.querySelector('.hw-ribbon');
  const images=[wrap.querySelector('.hw-back'),wrap.querySelector('.hw-mid'),wrap.querySelector('.hw-front')];
  const particles=wrap.querySelector('.hw-bubbles');
  const bubbles=Array.from({length:14},(_,i)=>{
    const el=document.createElement('i');el.className='hw-bubble';
    const s=2+(i%4)*1.25;el.style.width=el.style.height=s+'px';particles.append(el);
    return {el,a:(i*.61803398875+.19)%1,b:(i*.41421356237+.34)%1};
  });
  let last={progress:0,mouthX:.5,mouthY:.25};
  let w=0,h=0,resizeFrame=0;
  function draw(progress,mouthX=last.mouthX,mouthY=last.mouthY){
    last={progress:clamp(progress),mouthX:clamp(mouthX),mouthY:clamp(mouthY)};
    if(reduced.matches){wrap.style.display='none';return;}
    wrap.style.display='';
    w=stage.clientWidth;h=stage.clientHeight;
    if(!w||!h)return;
    const p=last.progress;
    const sourceY=Math.min(h*.55,Math.max(h*.1,last.mouthY*h));
    const sweep=phase(p,.56,.985);
    const lipY=mix(sourceY,h*1.16,sweep);
    const wave=22*(1-phase(p,.86,.995));
    // Separate fluid plane expands into the viewport; image textures never scale to fill it.
    const points=[];
    const count=mobile.matches?12:20;
    for(let i=count;i>=0;i--){
      const u=i/count;
      const ripple=Math.sin(u*7.2+sweep*2.1)*.57+Math.sin(u*15-sweep*3.6)*.23;
      const y=Math.max(-8,Math.min(h*1.10,lipY+ripple*wave));
      points.push((u*100).toFixed(2)+'% '+(y/h*100).toFixed(2)+'%');
    }
    fill.style.clipPath='polygon(0 0,100% 0,'+points.join(',')+')';
    fill.style.opacity=(phase(p,.55,.98)*mix(.70,1,phase(p,.82,.97))).toFixed(3);
    const disclose=phase(p,.425,.735);
    ribbon.style.clipPath='circle('+(Math.hypot(w,h)*1.2*disclose).toFixed(1)+'px at '+(last.mouthX*100).toFixed(2)+'% '+(last.mouthY*100).toFixed(2)+'%)';
    ribbon.style.opacity=(phase(p,.44,.56)*(1-phase(p,.966,1))).toFixed(3);
    const drift=phase(p,.46,.84);
    const states=[[-19,21,-.65], [0,0,.1], [14,-13,.51]];
    images.forEach((img,i)=>{
      const [dx,dy,rot]=states[i];
      img.style.top=lipY.toFixed(2)+'px';
      img.style.transform='translate(-50%,-50%) translate3d('+(dx*drift).toFixed(2)+'px,'+(dy*drift).toFixed(2)+'px,0) rotate('+(rot*drift).toFixed(3)+'deg)';
    });
    const opacity=phase(p,.47,.64)*(1-phase(p,.90,.995));
    bubbles.forEach(({el,a,b},i)=>{
      if(mobile.matches&&i>=6){el.style.opacity='0';return;}
      const x=w*(.05+.90*a)+Math.sin(p*16+i*3.7)*11;
      const y=lipY+(b-.5)*(mobile.matches?54:118)-15*drift;
      el.style.transform='translate3d('+x.toFixed(1)+'px,'+y.toFixed(1)+'px,0)';
      el.style.opacity=(opacity*(.18+.55*b)).toFixed(3);
    });
  }
  hero.addEventListener('hero-splash:progress',e=>{
    const v=e.detail||{};
    draw(v.progress??0,Number.isFinite(v.mouthX)?v.mouthX:last.mouthX,Number.isFinite(v.mouthY)?v.mouthY:last.mouthY);
  });
  const refresh=()=>draw(last.progress);
  window.addEventListener('resize',()=>{
    if(resizeFrame)return;
    resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;refresh();});
  },{passive:true});
  reduced.addEventListener('change',refresh);
  mobile.addEventListener('change',refresh);
  const trigger=window.ScrollTrigger?.getById('hero-splash-only');
  const progress=trigger?.progress??clamp(-hero.getBoundingClientRect().top/Math.max(1,hero.offsetHeight-innerHeight));
  const slot=hero.querySelector('.hero-can-top-slot');
  const box=stage.getBoundingClientRect(),s=slot?.getBoundingClientRect();
  draw(progress,s?(s.left+s.width*.5-box.left)/Math.max(box.width,1):.5,s?(s.top+s.height*.5-box.top)/Math.max(box.height,1):.25);
})();
