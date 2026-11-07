(() => {
  'use strict';
  const fine=matchMedia('(hover: hover) and (pointer: fine)');
  const cursor=document.createElement('div');
  cursor.className='glow-star-cursor';cursor.setAttribute('aria-hidden','true');
  cursor.innerHTML='<svg viewBox="0 0 100 100" focusable="false"><path d="M50 6 L61.7 36 H93 L68 55.3 L77.5 86.5 L50 68.2 L22.5 86.5 L32 55.3 L7 36 H38.3 Z"/></svg>';
  document.body.append(cursor);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const trail=Array.from({length:6},(_,i)=>{
    const node=document.createElement('span');node.className='glow-star-cursor-trail';node.setAttribute('aria-hidden','true');
    node.style.width=node.style.height=(6-i*.65)+'px';document.body.append(node);
    return {node,x:0,y:0};
  });
  let frame=0,x=0,y=0,lastMove=-Infinity;
  function hide(){
    cancelAnimationFrame(frame);frame=0;
    cursor.classList.remove('is-visible','is-pressed');
    trail.forEach(p=>p.node.style.opacity='0');
    document.documentElement.classList.remove('has-glow-star-cursor');
  }
  function draw(now=performance.now()){
    frame=0;cursor.style.transform='translate3d('+x+'px,'+y+'px,0) translate(-50%,-50%)';
    const strength=reduced.matches?0:Math.min(1,Math.max(0,1-(now-lastMove)/180));
    let px=x,py=y;
    trail.forEach((p,i)=>{
      p.x+=(px-p.x)*.42;p.y+=(py-p.y)*.42;
      p.node.style.transform='translate3d('+p.x.toFixed(2)+'px,'+p.y.toFixed(2)+'px,0) translate(-50%,-50%)';
      p.node.style.opacity=(strength*.25*(1-i/7)).toFixed(3);px=p.x;py=p.y;
    });
    if(strength>0)frame=requestAnimationFrame(draw);
  }
  addEventListener('pointermove',event=>{
    if(!fine.matches||event.pointerType!=='mouse'){hide();return;}
    if(Math.hypot(event.clientX-x,event.clientY-y)>1)lastMove=performance.now();
    x=event.clientX;y=event.clientY;
    if(!cursor.classList.contains('is-visible')){trail.forEach(p=>{p.x=x;p.y=y;});draw();}
    cursor.classList.add('is-visible');document.documentElement.classList.add('has-glow-star-cursor');
    if(!frame)frame=requestAnimationFrame(draw);
  },{passive:true});
  addEventListener('pointerdown',()=>cursor.classList.add('is-pressed'),{passive:true});
  addEventListener('pointerup',()=>cursor.classList.remove('is-pressed'),{passive:true});
  document.addEventListener('pointerleave',hide);addEventListener('blur',hide);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)hide();});
  fine.addEventListener('change',hide);
})();
