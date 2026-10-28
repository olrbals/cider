/* Hero-only liquid. ScrollTrigger supplies reversible progress; every frame derives from that progress. */
(() => {
  'use strict';
  const hero = document.querySelector('#top.hero');
  const stage = hero?.querySelector('.hero-splash-stage');
  const svg = hero?.querySelector('.hero-splash-effects');
  if (!hero || !stage || !svg) return;

  const sheet = svg.querySelector('.hs-sheet');
  const sheetGlint = svg.querySelector('.hs-sheet-glint');
  const refract = stage.querySelector('.hs-refraction');
  const canSlot = stage.querySelector('.hero-can-top-slot');
  const dropsGroup = svg.querySelector('.hs-droplets');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 700px)');
  const ns = 'http://www.w3.org/2000/svg';
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  const phase = (value, start, end) => smooth((value - start) / (end - start));
  const number = value => Number(value.toFixed(2));
  // The SVG remains a fallback. The primary surface is a transparent WebGL
  // distance field: a brief burst, lens impacts, then the existing curtain.
  function createLiquidSurface() {
    const canvas = document.createElement('canvas');
    canvas.className = 'hs-liquid-webgl';
    canvas.setAttribute('aria-hidden', 'true');
    const gl = canvas.getContext('webgl', {
      alpha: true, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: false, powerPreference: 'low-power'
    });
    if (!gl) return null;
    const vertex = `attribute vec2 a_position;
      void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;
    const fragment = `precision highp float;
      uniform vec2 u_resolution;
      uniform vec2 u_mouth;
      uniform float u_progress;
      float sat(float v) { return clamp(v, 0.0, 1.0); }
      float phase(float v, float a, float b) {
        float t = sat((v-a)/(b-a)); return t*t*(3.0-2.0*t);
      }
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p) {
        vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),
          mix(hash(i+vec2(0.0,1.0)),hash(i+1.0),f.x),f.y);
      }
      float capsule(vec2 p, vec2 a, vec2 b, float ra, float rb) {
        vec2 ab=b-a; float t=sat(dot(p-a,ab)/max(dot(ab,ab),.00001));
        return length(p-a-ab*t)-mix(ra,rb,t);
      }
      float unite(float a,float b,float k) {
        float h=sat(.5+.5*(b-a)/k); return mix(b,a,h)-k*h*(1.0-h);
      }
      vec2 impactPoint(float i) {
        if (i<.5) return vec2(.29,.27);
        if (i<1.5) return vec2(.70,.34);
        if (i<2.5) return vec2(.48,.53);
        return vec2(.82,.19);
      }
      void main() {
        vec2 uv=gl_FragCoord.xy/u_resolution;
        uv.y=1.0-uv.y;
        float p=u_progress;
        float aspect=u_resolution.x/u_resolution.y;
        float spread=phase(p,.44,.68), flow=phase(p,.56,.96);
        float mouthY=u_mouth.y;
        // A short, thick release stays attached to the opening. It ends before
        // the camera-facing beads arrive, so it never becomes a vertical ribbon.
        float burstRise=phase(p,.13,.25);
        float burstFade=phase(p,.29,.37);
        vec2 burstUv=uv;
        burstUv.x+=(noise(uv*vec2(24.0,17.0)+p*5.0)-.5)*.009;
        float burst=capsule(burstUv,vec2(u_mouth.x,mouthY+.01),
          vec2(u_mouth.x+.012,mouthY-.115*burstRise),.024,.030);
        burst+=(noise(uv*vec2(42.0,29.0)+p*8.0)-.5)*.006;
        float burstMask=(1.0-smoothstep(-.004,.005,burst))
          *phase(p,.12,.18)*(1.0-burstFade);

        // Perspective is measured in screen-height units, so beads remain round
        // on wide and narrow viewports. Each arrival becomes its own wet patch.
        float airborne=0.0, beadShade=0.0, wetDistance=2.0;
        for (int i=0;i<4;i++) {
          float fi=float(i);
          float launch=.16+fi*.026;
          float arrival=.34+fi*.035;
          float flight=phase(p,launch,arrival);
          vec2 target=impactPoint(fi);
          vec2 center=mix(vec2(u_mouth.x,mouthY-.035),target,flight);
          center.x+=(fi-1.5)*.025*sin(3.14159*flight);
          center.y-=.075*sin(3.14159*flight);
          float radius=mix(.007,.041+.009*mod(fi,2.0),pow(flight,1.7));
          vec2 beadDelta=vec2((uv.x-center.x)*aspect,(uv.y-center.y)*(.86+.14*flight));
          float bead=length(beadDelta)-radius
            +(noise(vec2(atan(beadDelta.y,beadDelta.x)*2.0+fi*3.0,p*1.7))-.5)*radius*.1;
          float inFlight=phase(p,launch,launch+.025)*(1.0-phase(p,arrival-.018,arrival+.012));
          float beadBody=1.0-smoothstep(-.004,.004,bead);
          float beadRim=exp(-abs(bead)*145.0);
          float beadLight=exp(-length(beadDelta-vec2(-radius*.35,-radius*.38))*95.0);
          float facing=dot(beadDelta/max(length(beadDelta),.0001),vec2(.65,.76));
          float brightRim=beadRim*(.62-.42*facing);
          float darkRim=beadRim*(.38+.36*facing);
          airborne+=inFlight*(beadBody*.10+brightRim*.52+darkRim*.3+beadLight*.38);
          beadShade+=inFlight*darkRim*.7;

          float impact=phase(p,arrival-.012,arrival+.07);
          float grow=phase(p,arrival,arrival+.24);
          float rx=(.018+grow*(.18+.02*mod(fi,2.0)));
          float ry=(.015+grow*(.13+.025*mod(fi+1.0,2.0)));
          vec2 q=(uv-target)/vec2(rx,ry);
          float angle=atan(q.y,q.x);
          float organic=(noise(vec2(angle*1.8+fi*4.0,p*1.4))-.5)*.42
            +(noise(vec2(angle*4.3+fi*7.0,p*.8))-.5)*.13;
          float wet=(length(q)-1.0+organic)*min(rx*aspect,ry);
          if (i<2) {
            vec2 tailA=vec2(target.x*aspect,target.y+.025);
            vec2 tailB=vec2((target.x+.025)*aspect,target.y+.025+.17*grow);
            float tail=capsule(vec2(uv.x*aspect,uv.y),tailA,tailB,.018,.007);
            wet=unite(wet,tail,.012);
          }
          wetDistance=unite(wetDistance,wet+(1.0-impact)*.5,.018);
        }
        float wetOpacity=1.0-phase(p,.68,.82);
        float wetBody=(1.0-smoothstep(-.003,.003,wetDistance))*wetOpacity
          *(.075+.045*noise(uv*vec2(11.0,9.0)+p*1.2));
        float wetRim=exp(-abs(wetDistance)*135.0)*wetOpacity;
        float wetEdge=wetRim*(.035+.035*noise(uv*vec2(7.0,8.0)+p));
        float wetGlint=exp(-abs(wetDistance+.009)*170.0)*wetOpacity
          *(.025+.055*noise(uv*vec2(5.0,6.0)+vec2(4.0,p)));

        float halfWidth=mix(.025,.64,spread);
        float lateral=abs(uv.x-u_mouth.x);
        float irregular=(noise(vec2(uv.x*7.0,p*2.1))-.5)*.18
          +(noise(vec2(uv.x*19.0,p*1.3+5.0))-.5)*.045;
        float front=-.035+flow*1.19+irregular*flow;
        float side=lateral-halfWidth-(noise(vec2(uv.y*6.0,p*2.0))-.5)*.014*spread;
        float sheet=max(side,uv.y-front);
        // Local tongues keep the advancing edge rounded and uneven.
        for (int i=0;i<4;i++) {
          float fi=float(i);
          float lane=.08+.84*hash(vec2(fi,9.0));
          float x=mix(u_mouth.x-halfWidth,u_mouth.x+halfWidth,lane);
          float reach=front+.018+.07*hash(vec2(fi,3.0))*flow;
          float tongue=capsule(uv,vec2(x,front-.025),vec2(x+.024*(hash(vec2(fi,7.0))-.5),reach),.012,.008);
          sheet=unite(sheet,tongue,.014);
        }
        float sheetVisible=spread*phase(p,.59,.68);
        float d=sheet+(1.0-sheetVisible)*.12;
        float body=1.0-smoothstep(-.005,.003,d);
        float edge=exp(-abs(d)*145.0)*sheetVisible;
        float inner=body*(.18+.10*noise(uv*vec2(5.0,8.0)+p*2.0));
        float bright=phase(p,.77,.99);
        float alpha=inner+edge*.37+body*bright*.47;
        float glint=exp(-abs(d+.013)*210.0)*body*.15;
        alpha+=glint+burstMask*.21+airborne+wetBody+wetEdge+wetGlint;
        vec3 color=mix(vec3(.75,.94,.85),vec3(1.0),.55+bright*.42);
        color=mix(color,vec3(.42,.78,.62),edge*.25);
        color=mix(color,vec3(.27,.43,.36),sat(beadShade*.55));
        color+=vec3(glint*.4);
        alpha=sat(alpha);
        gl_FragColor=vec4(color,alpha);
      }`;
    function compile(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('Hero liquid shader:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }
    const vs=compile(gl.VERTEX_SHADER,vertex), fs=compile(gl.FRAGMENT_SHADER,fragment);
    if (!vs || !fs) return null;
    const program=gl.createProgram();
    gl.attachShader(program,vs); gl.attachShader(program,fs); gl.linkProgram(program);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) return null;
    const buffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    gl.useProgram(program);
    const position=gl.getAttribLocation(program,'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    const resolution=gl.getUniformLocation(program,'u_resolution');
    const mouth=gl.getUniformLocation(program,'u_mouth');
    const progress=gl.getUniformLocation(program,'u_progress');
    stage.append(canvas);
    stage.classList.add('hs-webgl-ready');
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      stage.classList.remove('hs-webgl-ready');
      canvas.remove();
    }, { once: true });
    function draw(p,x,y) {
      const scale=mobile.matches ? Math.min(devicePixelRatio||1,1) : Math.min(devicePixelRatio||1,1.25);
      const w=Math.max(1,Math.round(stage.clientWidth*scale));
      const h=Math.max(1,Math.round(stage.clientHeight*scale));
      if (canvas.width!==w || canvas.height!==h) {
        canvas.width=w; canvas.height=h;
        gl.viewport(0,0,w,h);
      }
      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(resolution,w,h);
      gl.uniform2f(mouth,x,y);
      gl.uniform1f(progress,p);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    }
    return {draw,canvas};
  }
  const liquidSurface=createLiquidSurface();
  const lensRefract = document.createElement('div');
  lensRefract.className = 'hs-lens-refraction';
  lensRefract.setAttribute('aria-hidden', 'true');
  stage.append(lensRefract);
  const drops = Array.from({ length: 4 }, (_, index) => {
    const group = document.createElementNS(ns, 'g');
    const body = document.createElementNS(ns, 'circle');
    const glint = document.createElementNS(ns, 'circle');
    const wet = document.createElementNS(ns, 'ellipse');
    body.classList.add('hs-droplet');
    body.setAttribute('fill', 'url(#hs-drop-water)');
    glint.classList.add('hs-droplet-glint');
    wet.classList.add('hs-lens-wet');
    wet.setAttribute('fill', 'url(#hs-drop-water)');
    group.append(body, glint);
    dropsGroup.append(group);
    dropsGroup.append(wet);
    return { group, body, glint, wet, index };
  });

  /* Catmull-Rom conversion keeps each varying drip tangent to its neighbour. */
  function curve(points) {
    let path = `M ${number(points[0][0])} ${number(points[0][1])}`;
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[Math.max(0, i - 1)];
      const b = points[i];
      const c = points[i + 1];
      const d = points[Math.min(points.length - 1, i + 2)];
      path += ` C ${number(b[0] + (c[0] - a[0]) / 6)} ${number(b[1] + (c[1] - a[1]) / 6)} ${number(c[0] - (d[0] - b[0]) / 6)} ${number(c[1] - (d[1] - b[1]) / 6)} ${number(c[0])} ${number(c[1])}`;
    }
    return path;
  }

  function render(progress) {
    const p = clamp(progress);
    if (motion.matches) return;
    hero.style.setProperty('--hs-tab', phase(p, .015, .15).toFixed(4));
    const settle = phase(p, .025, .23);
    hero.style.setProperty('--hs-can-scale', (1 - .1 * settle).toFixed(4));
    hero.style.setProperty('--hs-can-shift', `${Math.round(stage.clientHeight * .12 * settle)}px`);

    // Read the transformed opening so the liquid stays attached to the can.
    const stageBox = stage.getBoundingClientRect();
    const opening = canSlot.getBoundingClientRect();
    const mouthX = (opening.left + opening.width * .5 - stageBox.left) / stageBox.width * 1000;
    const mouthY = (opening.top + opening.height * .53 - stageBox.top) / stageBox.height * 1000;
    liquidSurface?.draw(p, mouthX / 1000, mouthY / 1000);

    // Each camera-facing bead expands into a soft optical patch on contact.
    // The same contact times and positions drive the WebGL surface and the
    // backdrop refraction, keeping the water and the live page aligned.
    const targets = [[.29, .27], [.70, .34], [.48, .53], [.82, .19]];
    const masks = targets.map(([x, y], index) => {
      const arrival = .34 + index * .035;
      const grow = phase(p, arrival, arrival + .24);
      const rx = Math.round(stage.clientWidth * (.018 + grow * (.18 + .02 * (index % 2))));
      const ry = Math.round(stage.clientHeight * (.015 + grow * (.13 + .025 * ((index + 1) % 2))));
      return `radial-gradient(ellipse ${Math.max(rx, 1)}px ${Math.max(ry, 1)}px at ${x * 100}% ${y * 100}%, #000 35%, transparent 78%)`;
    }).join(', ');
    lensRefract.style.maskImage = masks;
    lensRefract.style.webkitMaskImage = masks;
    lensRefract.style.opacity = (phase(p, .33, .56) * (1 - phase(p, .68, .82)) * .72).toFixed(3);

    // WebGL fallback: small perspective beads become transparent lens marks.
    drops.forEach(({ group, body, glint, wet, index }) => {
      const launch = .16 + index * .026;
      const arrival = .34 + index * .035;
      const flight = phase(p, launch, arrival);
      const [tx, ty] = targets[index];
      const x = mouthX + (tx * 1000 - mouthX) * flight + (index - 1.5) * 25 * Math.sin(Math.PI * flight);
      const y = mouthY - 35 + (ty * 1000 - mouthY + 35) * flight - 75 * Math.sin(Math.PI * flight);
      const radius = (7 + (41 + 9 * (index % 2) - 7) * Math.pow(flight, 1.7));
      const visible = phase(p, launch, launch + .025) * (1 - phase(p, arrival - .018, arrival + .012));
      group.style.opacity = visible.toFixed(3);
      body.setAttribute('cx', number(x));
      body.setAttribute('cy', number(y));
      body.setAttribute('r', number(radius));
      glint.setAttribute('cx', number(x - radius * .3));
      glint.setAttribute('cy', number(y - radius * .34));
      glint.setAttribute('r', number(radius * .14));
      const grow = phase(p, arrival, arrival + .24);
      wet.setAttribute('cx', tx * 1000);
      wet.setAttribute('cy', ty * 1000);
      wet.setAttribute('rx', number(18 + grow * (180 + 20 * (index % 2))));
      wet.setAttribute('ry', number(15 + grow * (130 + 25 * ((index + 1) % 2))));
      wet.style.opacity = (phase(p, arrival - .012, arrival + .07) * (1 - phase(p, .68, .82)) * .42).toFixed(3);
    });

    const spread = phase(p, .46, .70);
    const flow = phase(p, .60, .98);
    const half = 28 + 550 * spread;
    const points = [];
    const count = mobile.matches ? 8 : 14;
    for (let i = 0; i <= count; i++) {
      const u = i / count;
      const x = 500 - half + 2 * half * u;
      const lag = .015 + .16 * (i % 4) / 3 + .07 * Math.abs(u - .5);
      const local = phase(flow, lag, .94);
      const taper = (1 - Math.abs(u - .5) * .26);
      const ripple = Math.sin(u * 26 + p * 19) * 18 * local * (1 - local);
      const surfaceWave = (Math.sin(u * 16 + p * 9) * 19 + 18 * (1 - Math.abs(u - .5) * 2)) * spread;
      const depth = -12 + 68 * spread + surfaceWave + 1120 * local * taper + ripple;
      points.push([x, depth]);
    }
    const edge = curve(points);
    const reverseEdge = curve([...points].reverse());
    const closed = `M ${number(500 - half)} -80 L ${number(500 + half)} -80 L ${number(points[count][0])} ${number(points[count][1])} ${reverseEdge.slice(reverseEdge.indexOf(' C'))} Z`;
    sheet.setAttribute('d', closed);
    sheetGlint.setAttribute('d', edge);
    const film = spread * phase(p, .60, .68);
    sheet.style.opacity = film.toFixed(3);
    sheetGlint.style.opacity = (film * flow * .76).toFixed(3);

    // The live page is refracted only inside the water silhouette.
    if (!mobile.matches && spread > .01) {
      const polygon = [`${number((500 - half) / 10)}% 0%`, `${number((500 + half) / 10)}% 0%`];
      for (let i = points.length - 1; i >= 0; i--) {
        polygon.push(`${number(points[i][0] / 10)}% ${number(points[i][1] / 10)}%`);
      }
      refract.style.clipPath = `polygon(${polygon.join(',')})`;
      refract.style.opacity = (film * .82).toFixed(3);
    } else {
      refract.style.opacity = '0';
    }

    // The clear film brightens the hero into the updated white Seven Stars scene.
    const brighten = phase(p, .88, 1);
    const reveal = phase(p, .82, 1);
    const start = [20, 159, 92], end = [255, 255, 255];
    stage.style.backgroundColor = `rgb(${start.map((value, i) => Math.round(value + (end[i] - value) * brighten)).join(',')})`;
    hero.style.setProperty('--hs-reveal', reveal.toFixed(4));
  }

  function initialize() {
    if (motion.matches) {
      render(0);
      return;
    }
    if (window.gsap && window.ScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      const trigger = window.ScrollTrigger.create({
        id: 'hero-splash-only',
        trigger: hero,
        start: 'top top',
        end: 'bottom bottom',
        invalidateOnRefresh: true,
        onUpdate: self => render(self.progress),
        onRefresh: self => render(self.progress)
      });
      render(trigger.progress);
    } else {
      // A native fallback preserves the scene when GSAP is unavailable.
      const update = () => render(-hero.getBoundingClientRect().top / Math.max(1, hero.offsetHeight - innerHeight));
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update, { passive: true });
      update();
    }
  }

  motion.addEventListener('change', () => {
    if (motion.matches) {
      window.ScrollTrigger?.getById('hero-splash-only')?.kill();
      hero.style.removeProperty('--hs-tab');
      hero.style.removeProperty('--hs-can-scale');
      hero.style.removeProperty('--hs-can-shift');
      hero.style.removeProperty('--hs-reveal');
      stage.style.removeProperty('background-color');
      refract.style.opacity = '0';
      lensRefract.style.opacity = '0';
    } else if (!window.ScrollTrigger?.getById('hero-splash-only')) {
      initialize();
    }
  });
  initialize();
})();
