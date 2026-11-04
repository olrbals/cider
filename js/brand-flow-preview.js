/* One scroll narrative: three brand principles -> Fizz -> Seven Stars -> 1950.
 * Non-destructive preview: no extra WebGL, no timers, no dependencies.
 */
(() => {
  'use strict';
  const values = document.querySelector('#brand-values');
  const stage = values?.querySelector('.brand-values__stage');
  const words = [...(values?.querySelectorAll('.brand-values__word') || [])];
  const counter = values?.querySelector('[data-brand-count]');
  const identity = document.querySelector('#identity');
  const history = document.querySelector('#history');
  if (!values || !stage || words.length !== 3 || !identity || !history) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = v => Math.min(1,Math.max(0,v));
  const ease = v => { const x=clamp(v); return x*x*(3-2*x); };
  const segment = (x,a,b) => ease((x-a)/Math.max(.0001,b-a));
  const viewport = () => Math.max(1,window.innerHeight);

  // Constantly rising tiny bubbles complement the existing global carbonation
  // without a second canvas/WebGL or another animation frame loop.
  const bubbles = [7,10,14,8,18,9,13,11,17,8,12,15,9,6,12,8];
  bubbles.forEach((size,index) => {
    const node = document.createElement('i');
    node.className = 'brand-values__bubble';
    node.setAttribute('aria-hidden','true');
    node.style.setProperty('--size',size+'px');
    node.style.setProperty('--x',(4 + ((index*37+12)%92))+'%');
    node.style.setProperty('--speed',(8+(index%5)*2.5)+'s');
    node.style.setProperty('--delay',(-index*.97)+'s');
    stage.append(node);
  });

  const flight = document.createElement('div');
  flight.className = 'brand-star-flight';
  flight.setAttribute('aria-hidden','true');
  flight.innerHTML = '<svg viewBox="0 0 100 100" role="presentation"><path d="M50 6 L61.7 36 H93 L68 55.3 L77.5 86.5 L50 68.2 L22.5 86.5 L32 55.3 L7 36 H38.3 Z"/></svg>';
  document.body.append(flight);
  const graphic = flight.querySelector('svg');
  let frame = 0;
  let source = null;

  function findSource() {
    // The original scene-polish script draws the star in the typographic 'A' slot.
    const element = identity.querySelector('.identity-display .identity-main-star');
    if (!element) return;
    const rect = element.getBoundingClientRect();
    if (rect.width > 5 && rect.height > 5 && rect.bottom > 0 && rect.top < viewport()) {
      source = {x:rect.left+rect.width*.5,y:rect.top+rect.height*.5,size:Math.max(30,Math.min(rect.width,rect.height))};
    }
  }
  function renderValues() {
    const rect=values.getBoundingClientRect();
    const h=viewport();
    if (rect.bottom < 0 || rect.top > h) return;
    const p=clamp(-rect.top/Math.max(1,rect.height-h));
    const cuts=[[0,.34],[.33,.67],[.66,1]];
    let current=0,max=0;
    words.forEach((node,i)=>{
      const [a,b]=cuts[i];
      const fadeIn=i===0?1:segment(p,a-.028,a+.045);
      const fadeOut=i===2?1:1-segment(p,b-.075,b+.025);
      const opacity=clamp(fadeIn*fadeOut);
      const offset=(1-fadeIn)*24-fadeOut*-0+(1-fadeOut)*-25;
      node.style.opacity=opacity.toFixed(3);
      node.style.transform='translate3d(0,'+offset.toFixed(2)+'px,0) scale('+(1-.025*(1-opacity)).toFixed(4)+')';
      node.setAttribute('aria-hidden',opacity<.2?'true':'false');
      if(opacity>max){max=opacity;current=i;}
    });
    if(counter)counter.textContent='0'+(current+1)+' / 03';
    const change=segment(p,.86,1);
    const a=[239,250,243],b=[255,248,213];
    const valuesRGB=a.map((v,i)=>Math.round(v+(b[i]-v)*change));
    stage.style.backgroundColor='rgb('+valuesRGB.join(',')+')';
  }
  function renderStar() {
    const rect=identity.getBoundingClientRect();
    const h=viewport();
    const travel=Math.max(1,rect.height-h);
    const scrollPast=-rect.top;
    const p=clamp(scrollPast/travel);
    const letters=1-segment(p,.71,.89);
    identity.style.setProperty('--bf-letter-alpha',letters.toFixed(3));
    identity.style.setProperty('--bf-origin-alpha',(1-segment(p,.82,.94)).toFixed(3));
    // Capture source while the original is pinned and fully readable.
    if (p >= .52 && p <= .81) findSource();
    const start=travel*.82;
    const end=travel+h*.82; // Crossfade onto the already existing 1950 3D can.
    const u=clamp((scrollPast-start)/(end-start));
    const visible=scrollPast >= start && scrollPast < end && rect.bottom > -h*.6;
    flight.classList.toggle('is-visible',visible && !reduced.matches);
    if(!visible || reduced.matches)return;
    if(!source)source={x:innerWidth*.5,y:h*.54,size:Math.min(innerWidth*.14,190)};
    // The 3D history module uses a right-hand can column.
    // End on the approximate upper printed star, then fade to the real label.
    const target={x:innerWidth*.5,y:h*.35,size:Math.max(26,Math.min(55,innerWidth*.035))};
    const move=ease(u), tint=segment(u,.17,.82);
    const x=source.x+(target.x-source.x)*move;
    const y=source.y+(target.y-source.y)*move-36*Math.sin(Math.PI*move);
    const size=source.size+(target.size-source.size)*move;
    const color=[20,159,92].map((v,i)=>Math.round(v+([202,40,49][i]-v)*tint));
    graphic.style.color='rgb('+color.join(',')+')';
    graphic.style.transform='translate3d('+(x-size*.5).toFixed(2)+'px,'+(y-size*.5).toFixed(2)+'px,0) scale('+(size/100).toFixed(4)+')';
    // The 1950 texture already contains its own red star; never leave a duplicate.
    flight.style.opacity=(segment(u,0,.10)*(1-segment(u,.80,.99))).toFixed(3);
  }
  function render() {
    frame=0;
    if(reduced.matches){
      identity.style.removeProperty('--bf-letter-alpha');
      identity.style.removeProperty('--bf-origin-alpha');
      flight.classList.remove('is-visible');
      return;
    }
    renderValues();renderStar();
  }
  function queue() {if(!frame)frame=requestAnimationFrame(render);}
  window.addEventListener('scroll',queue,{passive:true});
  window.addEventListener('resize',()=>{source=null;queue();},{passive:true});
  reduced.addEventListener('change',queue);
  document.addEventListener('visibilitychange',queue);
  window.addEventListener('load',queue,{once:true});
  queue();
})();
