/* 3차 | 한 덩어리로 휩쓸리는 RICH flavor scenes.
   History → Figma NEW FLAVOR intro (up)
   → PEACH: background + bottle + fruit + title move together (right-to-left)
   → generous PEACH hold → GRAPE overlays PEACH (right-to-left).
   Scroll-reversible; no Hero/History code changes. */
(() => {
  'use strict';
  const section = document.querySelector('#rich-flavors');
  if (!section) return;
  const intro = section.querySelector('.rich-new-flavor');
  const panels = [
    { name:'peach', element:section.querySelector('.rich-fg--peach'), start:.24, end:.44, seed:0 },
    { name:'grape', element:section.querySelector('.rich-fg--grape'), start:.67, end:.87, seed:1 }
  ];
  if (!intro || panels.some(p => !p.element)) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = v => Math.max(0, Math.min(1, v));
  const smooth = (a,b,p) => {
    const u = clamp((p-a)/(b-a));
    return u*u*(3-2*u);
  };
  let pending = 0;
  let viewW = window.innerWidth;
  let viewH = window.innerHeight;
  let pointerX = 0, pointerY = 0;

  panels.forEach((panel, panelIndex) => {
    panel.fluidMask = panel.element.querySelector('.rich-fg__fluid-mask');
    panel.fluidRim = panel.element.querySelector('.rich-fg__fluid-rim');
    panel.fluidBand = panel.element.querySelector('.rich-fg__fluid-band');
    const elements = [...panel.element.querySelectorAll(
      '.rich-fg__bottle,.rich-fg__fruit,.rich-fg__fruit-group'
    )];
    panel.shells = elements.map((element,i) => {
      const bottle = element.classList.contains('rich-fg__bottle');
      const shell = document.createElement('span');
      const bob = document.createElement('span');
      shell.className = 'rich-fg__motion-shell';
      shell.dataset.role = bottle ? 'bottle' : 'fruit';
      shell.dataset.ordinal = String(i);
      shell.style.left = element.style.left || '0px';
      shell.style.top = element.style.top || '0px';
      shell.style.width = element.style.width || (element.getAttribute('width')||'96')+'px';
      shell.style.height = element.style.height || (element.getAttribute('height')||'96')+'px';
      bob.className = 'rich-fg__bob';
      bob.style.setProperty('--fg-bob-duration',(4+(i%4)*.55)+'s');
      bob.style.setProperty('--fg-bob-delay',(-.7*i-panelIndex)+'s');
      element.parentElement.insertBefore(shell,element);
      shell.appendChild(bob);
      bob.appendChild(element);
      element.style.left = '0';
      element.style.top = '0';
      element.style.width = '100%';
      element.style.height = '100%';
      return {element:shell,bottle,index:i};
    });
  });

  function geometry(){
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    const scale = Math.min(viewW/1440,viewH/900);
    const bandTop = (viewH-900*scale)/2 + 648*scale;
    section.style.setProperty('--rich-design-scale',scale.toFixed(5));
    section.style.setProperty('--rich-band-top',bandTop.toFixed(2)+'px');
    const bandY = bandTop / Math.max(1,viewH) * 1000;
    panels.forEach(panel => {
      panel.fluidBand.setAttribute('y',bandY.toFixed(2));
      panel.fluidBand.setAttribute('height',Math.max(0,1000-bandY).toFixed(2));
    });
  }

  // The left lip of the moving color mass bulges and relaxes.
  // All Figma imagery stays INSIDE the same traveling article.
  // At u=1 the lip is safely outside the viewport, leaving the exact design.
  function fluidLip(u,seed){
    const pulse = Math.sin(Math.PI*u);
    const left = 100 - 320*u;
    const variance = Math.sin((2.1*u + .25*seed)*Math.PI);
    const upper = left+(64+12*variance)*pulse;
    const middle = left-(94+14*variance)*pulse;
    const lower = left+(45-10*variance)*pulse;
    const rim = [
      'M',upper.toFixed(2),'-40',
      'C',(left+55*pulse).toFixed(2),'115',
      (left-22*pulse).toFixed(2),'228',
      (middle+17*pulse).toFixed(2),'360',
      'C',(middle-16*pulse).toFixed(2),'490',
      (middle-31*pulse).toFixed(2),'575',
      (left-39*pulse).toFixed(2),'681',
      'C',(left+18*pulse).toFixed(2),'794',
      (left+51*pulse).toFixed(2),'926',
      lower.toFixed(2),'1040'
    ].join(' ');
    return {mask:rim+' L 1040 1040 L 1040 -40 Z',rim};
  }

  function updatePanel(panel, progress){
    const entered = progress >= panel.start;
    // Common progress is the ONLY large-screen translation.
    const u = reducedMotion.matches ?
      Number(progress >= (panel.start+panel.end)/2) :
      smooth(panel.start,panel.end,progress);
    panel.element.style.visibility = entered ? 'visible' : 'hidden';
    panel.element.style.transform =
      'translate3d('+((1-u)*100).toFixed(3)+'%,0,0)';

    // The liquid deforms INSIDE the same translated screen.
    const lip=fluidLip(u,panel.seed);
    panel.fluidMask.setAttribute('d',lip.mask);
    panel.fluidRim.setAttribute('d',lip.rim);
    panel.fluidRim.setAttribute('stroke-opacity',
      (Math.sin(Math.PI*u)*.22).toFixed(3));

    // Minor in-group inertia only (<= 10px). Never enter separately.
    const arrival = reducedMotion.matches ? 0 : Math.sin(Math.PI*u);
    const settled = u >= .999;
    panel.shells.forEach(({element,bottle,index}) => {
      const wobble = bottle ? -8 : (index%2?-6:7);
      const offsetX = wobble*arrival + (settled ? pointerX*(bottle?-10:14) : 0);
      const offsetY = (bottle?-3:((index%3)-1)*5)*arrival +
        (settled ? pointerY*(bottle?-6:10) : 0);
      const rotate = (bottle?-2:(index%2?4:-4))*arrival;
      element.style.opacity = '1';
      element.style.transform = 'translate3d('+offsetX.toFixed(2)+'px,'+
        offsetY.toFixed(2)+'px,0) rotateZ('+rotate.toFixed(2)+'deg)';
    });
  }

  function render(){
    pending=0;
    const rect=section.getBoundingClientRect();
    if(rect.top>viewH || rect.bottom<0)return;
    const distance=Math.max(1,section.offsetHeight-viewH);
    const progress=clamp(-rect.top/distance);
    const introIn=reducedMotion.matches ? Number(progress>=.1) :
      smooth(0,.18,progress);
    intro.style.transform='translate3d(0,'+((1-introIn)*100).toFixed(3)+'%,0)';
    panels.forEach(panel=>updatePanel(panel,progress));
  }

  function queue(){if(!pending)pending=requestAnimationFrame(render);}
  function resize(){geometry();queue();}
  window.addEventListener('scroll',queue,{passive:true});
  window.addEventListener('resize',resize,{passive:true});
  window.addEventListener('pageshow',resize);
  reducedMotion.addEventListener?.('change',queue);
  section.addEventListener('pointermove',event=>{
    if(reducedMotion.matches || event.pointerType==='touch')return;
    pointerX=event.clientX/Math.max(1,viewW)-.5;
    pointerY=event.clientY/Math.max(1,viewH)-.5;
    queue();
  },{passive:true});
  section.addEventListener('pointerleave',()=>{pointerX=pointerY=0;queue();},{passive:true});
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      section.classList.toggle('is-visible',entries[0]?.isIntersecting??false);
      if(entries[0]?.isIntersecting)queue();
    },{rootMargin:'120px 0px 120px 0px'});
    observer.observe(section);
  }else section.classList.add('is-visible');
  section.classList.add('rich-motion-ready');
  resize();
})();