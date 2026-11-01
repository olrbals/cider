/* RICH-only carbonation. Collision bubbles are derived from scroll progress;
 * the detail stream uses one capped Canvas 2D loop shared by PEACH and GRAPE.
 */
(() => {
  'use strict';
  const root = document.querySelector('#rich-flavors');
  const viewport = root?.querySelector('.rich-flavors__viewport');
  if (!root || !viewport || viewport.querySelector('.rich-carbonation-canvas')) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const lowPower = Boolean(navigator.connection?.saveData)
    || (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory < 4);
  const canvas = document.createElement('canvas');
  canvas.className = 'rich-carbonation-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d', {alpha:true, desynchronized:true});
  if (!ctx) return;
  viewport.append(canvas);

  const clamp = (value, min=0, max=1) => Math.max(min, Math.min(max, value));
  const smooth = (start, end, value) => {
    const t = clamp((value-start)/(end-start));
    return t*t*(3-2*t);
  };
  const random = (min, max) => min + Math.random()*(max-min);
  function seededRandom(seed) {
    let state = seed >>> 0;
    return () => ((state = Math.imul(state, 1664525) + 1013904223 >>> 0) / 4294967296);
  }

  function makeSprite() {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 72;
    const brush = sprite.getContext('2d');
    if (!brush) return sprite;
    const c = 36, r = 25;
    const fill = brush.createRadialGradient(27, 25, 1, c, c, r);
    fill.addColorStop(0, 'rgba(255,255,255,.22)');
    fill.addColorStop(.55, 'rgba(255,255,255,.035)');
    fill.addColorStop(1, 'rgba(117,211,191,.08)');
    brush.beginPath();
    brush.arc(c, c, r, 0, Math.PI*2);
    brush.fillStyle = fill;
    brush.fill();
    brush.beginPath();
    brush.arc(c, c, r, 0, Math.PI*2);
    brush.strokeStyle = 'rgba(48,156,132,.42)';
    brush.lineWidth = 1.8;
    brush.stroke();
    brush.beginPath();
    brush.arc(c, c, r-2.2, 1.04*Math.PI, 1.72*Math.PI);
    brush.strokeStyle = 'rgba(255,255,255,.9)';
    brush.lineWidth = 2.1;
    brush.stroke();
    brush.beginPath();
    brush.ellipse(27, 24, 5.5, 2.2, -.62, 0, Math.PI*2);
    brush.fillStyle = 'rgba(255,255,255,.92)';
    brush.fill();
    return sprite;
  }
  const sprite = makeSprite();
  const seeded = seededRandom(0x13c1de);
  const collisionCount = lowPower ? 18 : innerWidth < 750 ? 24 : 42;
  const collisionBubbles = [];
  for (let index=0; index<collisionCount; index++) {
    const clustered = index > 0 && seeded() < .34;
    const lane = clustered ? collisionBubbles[Math.floor(seeded()*index)] : null;
    const side = seeded() < .5 ? -1 : 1;
    collisionBubbles.push({
      x0:(seeded()-.5)*.045,
      y0:(seeded()-.5)*.052,
      dx:lane ? lane.dx+(.012*(seeded()-.5)) : side*(.025+seeded()*.13),
      dy:-(.065+seeded()*.25),
      delay:seeded()*.24,
      radius:2.2+seeded()*4.7,
      alpha:.52+seeded()*.36,
      phase:seeded()*Math.PI*2,
      sway:.004+seeded()*.012
    });
  }

  const detailBubbles = [];
  let width = 1, height = 1, dpr = 1, targetCount = 0;
  let progress = Number(root.dataset.richProgress || 0);
  let frame = 0, lastPaint = 0, lastTime = 0;
  let visible = false, initialized = false;

  function makeDetailBubble(distribute=false, companion=null) {
    const small = Math.random() < .7;
    const x = companion == null ? random(.035,.965) : clamp(companion+random(-.018,.018),.025,.975);
    return {
      x,
      y:distribute ? random(-18,height+18) : height+random(8,55),
      radius:small ? random(2.1,4.4) : random(4.5,7.1),
      rise:small ? random(28,48) : random(18,34),
      alpha:random(.45,.78),
      phase:random(0,Math.PI*2),
      wobble:random(.55,1.35),
      amp:random(3,11),
      age:random(0,8)
    };
  }

  function fillDetail(distribute=false) {
    while (detailBubbles.length > targetCount) detailBubbles.pop();
    while (detailBubbles.length < targetCount) {
      const companion = detailBubbles.length && Math.random() < .28
        ? detailBubbles[Math.floor(Math.random()*detailBubbles.length)].x : null;
      detailBubbles.push(makeDetailBubble(distribute, companion));
    }
  }

  function resize() {
    const oldHeight = height;
    width = Math.max(1, viewport.clientWidth);
    height = Math.max(1, viewport.clientHeight);
    dpr = Math.min(devicePixelRatio || 1, lowPower ? 1 : 1.25);
    canvas.width = Math.round(width*dpr);
    canvas.height = Math.round(height*dpr);
    canvas.style.width = width+'px';
    canvas.style.height = height+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const areaCount = Math.round(width*height/40000);
    targetCount = clamp(areaCount, width < 750 ? 18 : 28, lowPower ? 28 : 44);
    if (oldHeight > 1) detailBubbles.forEach(bubble => { bubble.y *= height/oldHeight; });
    fillDetail(!initialized);
    initialized = true;
    canvas.dataset.richDpr = dpr.toFixed(2);
    canvas.dataset.richBubbleCount = String(targetCount+collisionCount);
  }

  function drawBubble(x,y,radius,alpha) {
    if (alpha <= .006) return;
    const size = radius*3.35;
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite,x-size/2,y-size/2,size,size);
  }

  function drawCollision() {
    const phase = clamp((progress-.315)/.17);
    if (phase <= 0 || phase >= 1) return;
    collisionBubbles.forEach(bubble => {
      const local = clamp((phase-bubble.delay)/(1-bubble.delay));
      if (local <= 0 || local >= 1) return;
      const spread = 1-Math.pow(1-local,2.2);
      const x = width*(.5+bubble.x0+bubble.dx*spread
        + Math.sin(local*5+bubble.phase)*bubble.sway*local);
      const y = height*(.485+bubble.y0+bubble.dy*spread)-local*height*.025;
      const envelope = smooth(0,.13,local)*(1-smooth(.68,1,local));
      drawBubble(x,y,bubble.radius*(.82+.24*local),bubble.alpha*envelope);
    });
  }

  function detailKeepout(x,y) {
    const peach = Math.hypot((x-width*.41)/(width*.16),(y-height*.42)/(height*.38));
    const grape = Math.hypot((x-width*.57)/(width*.16),(y-height*.42)/(height*.38));
    const product = .22+.78*smooth(.52,1.04,Math.min(peach,grape));
    const copy = 1-.82*smooth(.66,.82,y/height);
    return product*copy;
  }

  function drawDetails(dt) {
    const opacity = smooth(.42,.53,progress);
    if (opacity <= 0) return;
    detailBubbles.forEach((bubble,index) => {
      if (dt > 0) {
        bubble.age += dt;
        bubble.y -= bubble.rise*dt;
        if (bubble.y < -24) {
          const companion = index && Math.random() < .32 ? detailBubbles[index-1].x : null;
          Object.assign(bubble,makeDetailBubble(false,companion));
        }
      }
      const x = bubble.x*width+Math.sin(bubble.age*bubble.wobble+bubble.phase)*bubble.amp;
      const edge = smooth(-16,55,bubble.y)*(1-smooth(height-35,height+16,bubble.y));
      drawBubble(x,bubble.y,bubble.radius,bubble.alpha*opacity*edge*detailKeepout(x,bubble.y));
    });
  }

  function paint(now) {
    frame = 0;
    if (!visible || document.hidden || reduce.matches) {
      ctx.clearRect(0,0,width,height);
      canvas.dataset.richActive = 'false';
      return;
    }
    const animate = progress >= .42;
    if (animate && now-lastPaint < 1000/30) {
      frame = requestAnimationFrame(paint);
      return;
    }
    const dt = animate && lastTime ? clamp((now-lastTime)/1000,.001,.07) : 0;
    lastTime = now;
    lastPaint = now;
    ctx.clearRect(0,0,width,height);
    drawCollision();
    drawDetails(dt);
    ctx.globalAlpha = 1;
    canvas.dataset.richActive = String(animate);
    if (animate) frame = requestAnimationFrame(paint);
  }

  function queue() {
    if (!frame && visible && !document.hidden && !reduce.matches) {
      frame = requestAnimationFrame(paint);
    }
  }

  function suspend() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    lastPaint = 0;
    ctx.clearRect(0,0,width,height);
    canvas.dataset.richActive = 'false';
  }

  function update(nextProgress) {
    progress = clamp(Number(nextProgress) || 0);
    queue();
  }

  let resizeFrame = 0;
  addEventListener('resize', () => {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      resize();
      queue();
    });
  }, {passive:true});
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) suspend();
    else queue();
  });
  reduce.addEventListener?.('change', () => {
    if (reduce.matches) suspend();
    else queue();
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) queue();
      else suspend();
    }, {rootMargin:'80px 0px'});
    observer.observe(root);
  } else visible = true;

  window.richCarbonation = {update};
  resize();
  queue();
})();
