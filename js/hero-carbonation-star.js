/* Pressure → five branching jets → water trajectories join into the Blender star.
   The texture always occupies its final Figma rectangle: only flowing masks reveal it. */
(() => {
  'use strict';
  const hero=document.querySelector('#top.hero');
  const layout=hero?.querySelector('.hero-layout');
  const texture=hero?.querySelector('.hero-carbonation-star img');
  if(!hero||!layout||!texture)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const canvas=document.createElement('canvas');
  canvas.className='hero-carbonation-flow';canvas.setAttribute('aria-hidden','true');
  layout.append(canvas);
  const ctx=canvas.getContext('2d');
  const mask=document.createElement('canvas'),water=document.createElement('canvas');
  const m=mask.getContext('2d'),w=water.getContext('2d');
  if(!ctx||!m||!w)return;
  const clamp=n=>Math.max(0,Math.min(1,n));
  const phase=(p,a,b)=>{const t=clamp((p-a)/(b-a));return t*t*(3-2*t);};
  const ease=t=>1-Math.pow(1-clamp(t),3);
  const mix=(a,b,t)=>a+(b-a)*t;
  const random=i=>{const n=Math.sin(i*127.1+45.7)*43758.5453;return n-Math.floor(n);};
  const box={x:267,y:18,w:905,h:903};
  // Alternating tips and valleys sampled in the supplied Blender texture's coordinates.
  const rim=[[.50,.065],[.64,.33],[.94,.40],[.74,.64],[.78,.93],[.50,.78],[.21,.93],[.26,.64],[.055,.40],[.36,.33]]
    .map(([x,y])=>({x:box.x+x*box.w,y:box.y+y*box.h}));
  const source={x:720,y:574};
  const cubic=(a,b,c,d,t)=>{const u=1-t;return {x:u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x,y:u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*d.y};};
  function rimPoint(index,t){
    const a=rim[(index+9)%10],b=rim[index%10],c=rim[(index+1)%10],d=rim[(index+2)%10];
    return cubic(b,{x:b.x+(c.x-a.x)/6,y:b.y+(c.y-a.y)/6},{x:c.x-(d.x-b.x)/6,y:c.y-(d.y-b.y)/6},c,t);
  }
  function sampleRim(start,direction,t){
    // Each valley feeds two arms which meet the neighbouring arms at the outer tips.
    return direction>0?rimPoint(start,t):rimPoint((start+9)%10,1-t);
  }
  function jetPoint(target,t,lane){
    const dx=target.x-source.x,dy=target.y-source.y;
    return cubic(source,{x:source.x+dx*.22+(lane-2)*9,y:source.y+dy*.12-45},
      {x:target.x-dx*.18,y:target.y-dy*.08+18},target,t);
  }
  function stroke(points,width,color,context=ctx){
    if(points.length<2)return;
    context.beginPath();context.moveTo(points[0].x,points[0].y);
    points.slice(1).forEach(pt=>context.lineTo(pt.x,pt.y));
    context.lineWidth=width;context.strokeStyle=color;context.lineCap='round';context.lineJoin='round';context.stroke();
  }
  function spray(head,previous,p,lane,opacity){
    const angle=Math.atan2(head.y-previous.y,head.x-previous.x);
    for(let i=0;i<26;i++){
      const seed=lane*83+i,age=random(seed),spread=18+age*76;
      const theta=angle+(random(seed+7)-.5)*1.35;
      const x=head.x+Math.cos(theta)*spread,y=head.y+Math.sin(theta)*spread+age*age*12;
      ctx.beginPath();ctx.ellipse(x,y,.65+random(seed+1)*2.8,1+random(seed+2)*4,theta,0,Math.PI*2);
      ctx.fillStyle=`rgba(119,183,176,${opacity*(1-age)*.24})`;ctx.fill();
      ctx.strokeStyle=`rgba(255,255,255,${opacity*(1-age)*.85})`;ctx.lineWidth=.7;ctx.stroke();
    }
  }
  let frame=0,progress=0,lastScroll=scrollY,lastMove=-Infinity,dpr=1;
  function draw(now){
    frame=0;const p=reduced.matches?0:progress;
    ctx.clearRect(0,0,1440,900);m.clearRect(0,0,1440,900);w.clearRect(0,0,1440,900);
    const pressure=phase(p,.015,.13)*(1-phase(p,.21,.25)),active=1-phase(now-lastMove,60,190);
    hero.style.setProperty('--hero-shake',(Math.sin(now*.09)*3.6*pressure*active).toFixed(2)+'px');
    const tail=1-phase(p,.58,.76);
    for(let lane=0;lane<5;lane++){
      const index=lane*2+1,target=rim[index];
      const start=.23+lane%3*.009;
      const reach=ease((p-start)/.16);
      const jetOpacity=phase(p,start,start+.024)*(1-phase(p,.36,.46));
      const points=Array.from({length:61},(_,i)=>jetPoint(target,i/60*reach,lane));
      // Thin transparent fluid film, a cool shadow edge, and a narrow white caustic.
      stroke(points,12,`rgba(159,214,207,${jetOpacity*.10})`);
      stroke(points,5,`rgba(102,169,165,${jetOpacity*.20})`);
      stroke(points.map(pt=>({x:pt.x-1.5,y:pt.y-1})),1.5,`rgba(255,255,255,${jetOpacity*.9})`);
      // Broken, unequal side filaments make a spray sheet rather than five rigid spokes.
      for(let thread=0;thread<4;thread++){
        const filament=points.map((pt,i)=>{
          const t=i/60,envelope=Math.sin(t*Math.PI);
          return {x:pt.x+Math.sin(t*14+thread*2.1)*envelope*(4+thread*2),
            y:pt.y+Math.cos(t*17+thread)*envelope*(3+thread*2)};
        });
        stroke(filament,thread%2?1.1:2.4,`rgba(174,218,216,${jetOpacity*.17})`);
      }
      if(reach>0&&reach<1)spray(points[60],points[58],p,lane,jetOpacity);
      for(const direction of [-1,1]){
        const t=ease((p-(start+.09))/.24);
        const trail=Array.from({length:81},(_,i)=>sampleRim(index,direction,t*i/80));
        // This travelling stroke is a mask on the fixed Blender render, not a scaled star.
        if(t>0){
          stroke(trail,82,'#fff',m);
          const leading=trail.slice(Math.max(0,trail.length-15));
          stroke(leading,7,`rgba(153,206,203,${tail*.16})`);
          stroke(leading.map(pt=>({x:pt.x-1,y:pt.y-1})),1.25,`rgba(255,255,255,${tail*.8})`);
          if(t<.995)spray(trail[80],trail[77],p,lane*2+(direction+1)/2,tail);
        }
      }
    }
    if(texture.complete&&texture.naturalWidth){
      w.globalCompositeOperation='source-over';w.globalAlpha=.48;
      w.drawImage(texture,box.x,box.y,box.w,box.h);w.globalAlpha=1;
      w.globalCompositeOperation='destination-in';w.drawImage(mask,0,0,1440,900);
      w.globalCompositeOperation='source-over';
      // The completed flow only fills small mask gaps after the trajectories have met.
      w.globalAlpha=phase(p,.64,.73)*.48;w.drawImage(texture,box.x,box.y,box.w,box.h);w.globalAlpha=1;
      ctx.drawImage(water,0,0,1440,900);
    }
    // Entrained microbubbles follow the outward flow, then clear before the next scene.
    const bubbleLife=phase(p,.24,.29)*(1-phase(p,.63,.78));
    for(let i=0;i<62;i++){
      const lane=i%5,target=rim[lane*2+1],t=ease((p-.25-random(i)*.05)/.28);
      if(!t||!bubbleLife)continue;
      const pt=jetPoint(target,t,lane),jitter=(random(i+3)-.5)*42*t;
      ctx.beginPath();ctx.arc(pt.x+jitter,pt.y+(random(i+8)-.5)*44*t,1+random(i+5)*2.5,0,Math.PI*2);
      ctx.lineWidth=.8;ctx.strokeStyle=`rgba(93,170,157,${bubbleLife*.25})`;ctx.stroke();
    }
    hero.dataset.heroScene=p<.015?'static':p<.23?'pressure':p<.36?'jets':p<.64?'forming':'formed';
    if(pressure*active>.001)frame=requestAnimationFrame(draw);
  }
  function update(){
    if(scrollY!==lastScroll){lastMove=performance.now();lastScroll=scrollY;}
    const bounds=hero.getBoundingClientRect();
    const next=clamp(-bounds.top/Math.max(1,hero.offsetHeight-innerHeight));
    if(bounds.bottom<0&&next===progress)return;
    progress=next;
    if(!frame)frame=requestAnimationFrame(draw);
  }
  function resize(){
    hero.style.setProperty('--hero-layout-scale',Math.min(innerWidth/1440,innerHeight/900).toFixed(6));
    dpr=Math.min(devicePixelRatio||1,1.5);
    for(const [surface,context] of [[canvas,ctx],[mask,m],[water,w]]){
      surface.width=Math.round(1440*dpr);surface.height=Math.round(900*dpr);context.setTransform(dpr,0,0,dpr,0,0);
    }
    progress=-1;
    update();
  }
  texture.addEventListener('load',update,{once:true});
  addEventListener('scroll',update,{passive:true});addEventListener('resize',resize,{passive:true});
  reduced.addEventListener('change',resize);resize();
})();
