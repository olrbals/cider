/* Post-history RICH flavors. Scroll-scrubbed horizontal takeover, reversible.
   Kept independent of Hero, History and the existing product explorer. */
(() => {
  const root = document.querySelector('.rich-flavors');
  if (!root) return;
  const panels = [...root.querySelectorAll('.rich-flavor')];
  const peach = root.querySelector('.rich-flavor--peach');
  const grape = root.querySelector('.rich-flavor--grape');
  const hint = root.querySelector('.rich-flavors__hint');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
  const smooth = (a, b, t) => { const v=clamp((t-a)/(b-a)); return v*v*(3-2*v); };
  let frame = 0;
  let current = -1;
  const fruits = panels.map(panel => [...panel.querySelectorAll('.rich-flavor__fruit')]);
  function update() {
    frame = 0;
    const rect = root.getBoundingClientRect();
    const viewport = window.innerHeight || 900;
    if (rect.bottom < -viewport || rect.top > viewport*2) return;
    const distance = Math.max(1, root.offsetHeight - viewport);
    const progress = clamp(-rect.top / distance);
    const peachIn = reduce.matches ? Number(progress>=.08) : smooth(.015,.155,progress);
    const grapeIn = reduce.matches ? Number(progress>=.6) : smooth(.47,.70,progress);
    peach.style.transform = 'translate3d('+(100*(1-peachIn)).toFixed(2)+'%,0,0)';
    grape.style.transform = 'translate3d('+(100*(1-grapeIn)).toFixed(2)+'%,0,0)';
    const active = grapeIn > .55 ? 'grape' : peachIn > .5 ? 'peach' : 'intro';
    if (active !== current) { current=active;root.dataset.active=active; }
    if (hint) hint.style.opacity = (1-smooth(.1,.24,progress)).toFixed(2);
    if (!reduce.matches) {
      const peachP = clamp((progress-.12)/.48);
      const grapeP = clamp((progress-.57)/.43);
      fruits[0].forEach((node,i) => { node.style.setProperty('--parallax-y', ((peachP-.5)*(i%2?30:-23)).toFixed(1)+'px'); });
      fruits[1].forEach((node,i) => { node.style.setProperty('--parallax-y', ((grapeP-.5)*(i%2?35:-25)).toFixed(1)+'px'); });
    }
  }
  function request() { if (!frame) frame=requestAnimationFrame(update); }
  window.addEventListener('scroll',request,{passive:true});
  window.addEventListener('resize',request,{passive:true});
  reduce.addEventListener?.('change',request);
  document.addEventListener('visibilitychange',()=>{if (!document.hidden) request();});
  request();
})();
