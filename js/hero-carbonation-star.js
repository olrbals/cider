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
  const ease=t=>1-Math.pow(1-clamp(t),2);
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
    // A jet arrives at a tip, then two flows turn around it toward adjacent valleys.
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
      ctx.fillStyle=`rgba(57,129,140,${opacity*(1-age)*.52})`;ctx.fill();
      ctx.strokeStyle=`rgba(255,255,255,${opacity*(1-age)*.85})`;ctx.lineWidth=.7;ctx.stroke();
    }
  }
  function fluidRibbon(points,opacity,lane,p){
    const left=[],right=[];
    points.forEach((pt,i)=>{
      const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];
      const length=Math.hypot(b.x-a.x,b.y-a.y)||1,nx=-(b.y-a.y)/length,ny=(b.x-a.x)/length;
      const t=i/(points.length-1);
      // Uneven, thinning film edges; no constant-width tube or elastic outline.
      const width=(3+8*Math.sin(t*Math.PI))*(.72+.19*Math.sin(t*27+lane+p*9));
      left.push({x:pt.x+nx*width,y:pt.y+ny*width});
      right.push({x:pt.x-nx*width*.64,y:pt.y-ny*width*.64});
    });
    const outline=[...left,...right.slice().reverse()];
    ctx.beginPath();ctx.moveTo(outline[0].x,outline[0].y);
    outline.slice(1).forEach(pt=>ctx.lineTo(pt.x,pt.y));ctx.closePath();
    ctx.fillStyle=`rgba(107,181,195,${opacity*.28})`;ctx.fill();
    stroke(right,1.2,`rgba(42,113,137,${opacity*.55})`);
    stroke(left,1.5,`rgba(255,255,255,${opacity*.95})`);
    stroke(points,1.1,`rgba(235,255,255,${opacity*.8})`);
  }
  // Cache the original texture with cool recessed edges and bright reflections.
  // This changes local contrast, not the star's opacity over its entire silhouette.
  const glass=document.createElement('canvas'),g=glass.getContext('2d');
  let glassReady=false;
  function cacheGlass(){
    if(!g||!texture.complete||!texture.naturalWidth)return;
    glass.width=texture.naturalWidth;glass.height=texture.naturalHeight;
    g.filter='brightness(.79) contrast(1.38) saturate(.65) drop-shadow(0px 2px 1.3px rgba(22,91,112,.46))';
    g.drawImage(texture,0,0);g.filter='none';glassReady=true;
  }
  // The order is deliberately readable: crown → left wing → right wing → lower points.
  const lanes=[{index:0,start:.15},{index:8,start:.195},{index:2,start:.235},
    {index:6,start:.28},{index:4,start:.32}];
  let frame=0,progress=0,targetProgress=0,lastTick=0,lastScroll=scrollY,lastMove=-Infinity,dpr=1,visible=true;
  function draw(now){
    frame=0;
    const dt=Math.min((now-lastTick)/1000||1/60,.05);lastTick=now;
    progress+= (targetProgress-progress)*(1-Math.exp(-11*dt));
    if(Math.abs(targetProgress-progress)<.00015)progress=targetProgress;
    const p=reduced.matches?0:progress;
    ctx.clearRect(0,0,1440,900);m.clearRect(0,0,1440,900);w.clearRect(0,0,1440,900);
    const pressure=phase(p,.015,.09)*(1-phase(p,.13,.16)),active=1-phase(now-lastMove,60,190);
    hero.style.setProperty('--hero-shake',(Math.sin(now*.09)*3.6*pressure*active).toFixed(2)+'px');
    const tail=1-phase(p,.65,.76);
    for(let lane=0;lane<5;lane++){
      const {index,start}=lanes[lane],target=rim[index];
      const reach=ease((p-start)/.12);
      const jetOpacity=phase(p,start,start+.016)*(1-phase(p,start+.15,start+.28));
      // A travelling pulse clears behind its head, rather than leaving radial spokes.
      const trailing=ease((p-start-.085)/.16);
      const points=Array.from({length:61},(_,i)=>jetPoint(target,mix(trailing,reach,i/60),lane));
      fluidRibbon(points,jetOpacity,lane,p);
      // Broken, unequal side filaments make a spray sheet rather than five rigid spokes.
      for(let thread=0;thread<4;thread++){
        const filament=points.map((pt,i)=>{
          const t=i/60,envelope=Math.sin(t*Math.PI);
          return {x:pt.x+Math.sin(t*14+thread*2.1)*envelope*(4+thread*2),
            y:pt.y+Math.cos(t*17+thread)*envelope*(3+thread*2)};
        });
        stroke(filament,thread%2?1.1:2.4,`rgba(102,177,190,${jetOpacity*.36})`);
      }
      if(reach>0&&reach<1)spray(points[60],points[58],p,lane,jetOpacity);
      for(const direction of [-1,1]){
        const t=phase(p,start+.105,start+.31);
        const trail=Array.from({length:81},(_,i)=>sampleRim(index,direction,t*i/80));
        // This travelling stroke is a mask on the fixed Blender render, not a scaled star.
        if(t>0){
          // Wide mask covers the irregular droplets, with a narrow leading front.
          stroke(trail,106,'#fff',m);
          const leading=trail.slice(Math.max(0,trail.length-15));
          const advancing=1-phase(t,.87,1);
          stroke(leading,12,`rgba(65,139,159,${tail*advancing*.30})`);
          stroke(leading.map(pt=>({x:pt.x-2,y:pt.y-1})),2.2,`rgba(255,255,255,${tail*advancing})`);
          if(t<.995)spray(trail[80],trail[77],p,lane*2+(direction+1)/2,tail);
        }
      }
    }
    if(glassReady){
      w.globalCompositeOperation='source-over';w.globalAlpha=1;
      w.drawImage(glass,box.x,box.y,box.w,box.h);
      w.globalCompositeOperation='destination-in';w.drawImage(mask,0,0,1440,900);
      w.globalCompositeOperation='source-over';
      // No whole-star fade-in: every pixel must be reached by a travelling mask.
      ctx.drawImage(water,0,0,1440,900);
    }
    // Entrained microbubbles follow the outward flow, then clear before the next scene.
    const bubbleLife=phase(p,.15,.20)*(1-phase(p,.63,.78));
    for(let i=0;i<62;i++){
      const lane=i%5,target=rim[lanes[lane].index],t=ease((p-lanes[lane].start-random(i)*.04)/.24);
      if(!t||!bubbleLife)continue;
      const pt=jetPoint(target,t,lane),jitter=(random(i+3)-.5)*42*t;
      ctx.beginPath();ctx.arc(pt.x+jitter,pt.y+(random(i+8)-.5)*44*t,1+random(i+5)*2.5,0,Math.PI*2);
      ctx.lineWidth=.9;ctx.strokeStyle=`rgba(48,126,148,${bubbleLife*.46})`;ctx.stroke();
    }
    hero.dataset.heroScene=p<.015?'static':p<.15?'pressure':p<.255?'jets':p<.63?'forming':'formed';
    if(visible&&!reduced.matches&&(progress!==targetProgress||pressure*active>.001))frame=requestAnimationFrame(draw);
  }
  function update(){
    if(scrollY!==lastScroll){lastMove=performance.now();lastScroll=scrollY;}
    const bounds=hero.getBoundingClientRect();
    const next=clamp(-bounds.top/Math.max(1,hero.offsetHeight-innerHeight));
    visible=bounds.bottom>0&&bounds.top<innerHeight;
    targetProgress=next;
    if(!visible){progress=next;cancelAnimationFrame(frame);frame=0;return;}
    if(reduced.matches)progress=0;
    if(!frame)frame=requestAnimationFrame(draw);
  }
  function resize(){
    hero.style.setProperty('--hero-layout-scale',Math.min(innerWidth/1440,innerHeight/900).toFixed(6));
    dpr=Math.min(devicePixelRatio||1,innerWidth<700?1:1.5);
    for(const [surface,context] of [[canvas,ctx],[mask,m],[water,w]]){
      surface.width=Math.round(1440*dpr);surface.height=Math.round(900*dpr);context.setTransform(dpr,0,0,dpr,0,0);
    }
    update();
  }
  texture.addEventListener('load',()=>{cacheGlass();update();},{once:true});
  cacheGlass();
  addEventListener('scroll',update,{passive:true});addEventListener('resize',resize,{passive:true});
  reduced.addEventListener('change',resize);resize();
})();
