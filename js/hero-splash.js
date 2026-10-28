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
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 700px)');
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  const phase = (value, start, end) => smooth((value - start) / (end - start));
  const number = value => Number(value.toFixed(2));
  // WebGL keeps the existing late curtain. A separate, scroll-sampled canvas
  // confines the brief pressure release to the measured can opening.
  function createFizzSurface() {
    const canvas = document.createElement('canvas');
    canvas.className = 'hs-fizz-surface';
    canvas.setAttribute('aria-hidden', 'true');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    stage.append(canvas);
    const seed = i => {
      const v = Math.sin(i * 127.13 + 9.17) * 43758.5453;
      return v - Math.floor(v);
    };
    const particles = Array.from({ length: 42 }, (_, i) => ({
      start: .178 + seed(i + 1) * .038,
      duration: .075 + seed(i + 11) * .055,
      side: (seed(i + 23) - .5) * 2,
      lift: 58 + seed(i + 41) * 68,
      spread: 12 + seed(i + 59) * 38,
      size: .45 + seed(i + 71) * 1.15,
      tilt: seed(i + 83) * Math.PI
    }));
    function draw(p, x, y, openingWidth) {
      const scale = Math.min(devicePixelRatio || 1, mobile.matches ? 1 : 1.5);
      const width = stage.clientWidth, height = stage.clientHeight;
      const w = Math.max(1, Math.round(width * scale));
      const h = Math.max(1, Math.round(height * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
      }
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, width, height);
      if (motion.matches || p < .17 || p > .37) return;
      const pressure = phase(p, .17, .19) * (1 - phase(p, .235, .30));
      const collar = phase(p, .17, .195) * (1 - phase(p, .28, .37));
      const aperture = Math.max(18, Math.min(48, openingWidth * .46));
      const unit = mobile.matches ? .78 : 1;

      // A thin wet meniscus and subpixel foam cells, never a stack of puffs.
      ctx.beginPath();
      ctx.moveTo(x - aperture * .5, y + 1);
      for (let i = 0; i <= 28; i++) {
        ctx.lineTo(x - aperture * .5 + aperture * i / 28,
          y - (1.4 + seed(i + 101) * 4.2) * collar);
      }
      ctx.lineTo(x + aperture * .5, y + 1);
      ctx.closePath();
      ctx.fillStyle = `rgba(245,255,251,${collar * .32})`;
      ctx.fill();
      ctx.lineWidth = .65;
      ctx.strokeStyle = `rgba(255,255,255,${collar * .72})`;
      ctx.stroke();
      for (let i = 0; i < 38; i++) {
        const cx = x + (seed(i + 131) - .5) * aperture;
        const cy = y - seed(i + 173) * 5.5 * collar;
        ctx.beginPath();
        ctx.ellipse(cx, cy, .35 + seed(i + 197) * .75, .35, seed(i + 211), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${collar * (.2 + seed(i + 227) * .48)})`;
        ctx.fill();
      }

      // Short asymmetric liquid slivers show the pressure at its source.
      for (let i = 0; i < (mobile.matches ? 4 : 7); i++) {
        const root = x + (seed(i + 251) - .5) * aperture * .65;
        const dx = (seed(i + 263) - .5) * 25 * unit * pressure;
        const lift = (13 + seed(i + 277) * 27) * unit * pressure;
        ctx.beginPath();
        ctx.moveTo(root - .7, y);
        ctx.quadraticCurveTo(root + dx * .25 - 1.2, y - lift * .65, root + dx, y - lift);
        ctx.quadraticCurveTo(root + dx * .35 + .8, y - lift * .45, root + .7, y);
        ctx.fillStyle = `rgba(250,255,253,${pressure * .6})`;
        ctx.fill();
      }

      const count = mobile.matches ? 26 : particles.length;
      for (let i = 0; i < count; i++) {
        const bead = particles[i];
        const t = (p - bead.start) / bead.duration;
        if (t < 0 || t > 1) continue;
        const fade = phase(t, 0, .12) * (1 - phase(t, .48, 1));
        const px = x + bead.side * (aperture * .16 + bead.spread * t) * unit;
        const py = y + (-bead.lift * t + 58 * t * t) * unit;
        const angle = Math.atan2(-bead.lift + 116 * t, bead.side * bead.spread);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(angle + bead.tilt * .12);
        ctx.beginPath();
        ctx.ellipse(0, 0, bead.size * (1.5 + (1 - t) * 1.3), bead.size * .48, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(241,253,248,${fade * .62})`;
        ctx.fill();
        ctx.lineWidth = .45;
        ctx.strokeStyle = `rgba(38,101,76,${fade * .24})`;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-bead.size, -.3); ctx.lineTo(bead.size * .7, -.3);
        ctx.strokeStyle = `rgba(255,255,255,${fade * .9})`;
        ctx.stroke();
        ctx.restore();
      }
    }
    return { draw, clear: () => ctx.clearRect(0, 0, canvas.width, canvas.height) };
  }
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
      void main() {
        vec2 uv=gl_FragCoord.xy/u_resolution;
        uv.y=1.0-uv.y;
        float p=u_progress;
        float spread=phase(p,.44,.68), flow=phase(p,.56,.96);
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
        alpha+=glint;
        vec3 color=mix(vec3(.75,.94,.85),vec3(1.0),.55+bright*.42);
        color=mix(color,vec3(.42,.78,.62),edge*.25);
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
  const aperture=document.createElement('span');
  aperture.className='hs-can-aperture';
  canSlot.prepend(aperture);
  const fizzSurface = createFizzSurface();
  const sprayFilm=document.createElement('div');
  sprayFilm.className='hs-spray-film';
  sprayFilm.setAttribute('aria-hidden','true');
  stage.append(sprayFilm);
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
    // A brief camera push makes the opening legible, then restores the
    // smaller upright can before the existing curtain enters.
    const focus = phase(p, .015, .10) * (1 - phase(p, .16, .30));
    const topView = phase(p, .08, .18) * (1 - phase(p, .30, .44));
    const settle = phase(p, .15, .32);
    hero.style.setProperty('--hs-focus', focus.toFixed(4));
    hero.style.setProperty('--hs-tab', phase(p, .075, .18).toFixed(4));
    hero.style.setProperty('--hs-can-scale', (1 + .14 * focus - .1 * settle).toFixed(4));
    hero.style.setProperty('--hs-can-shift', `${Math.round(stage.clientHeight * (.17 * phase(p, .015, .14) + .115 * topView - .05 * settle))}px`);

    // Read the transformed opening so the liquid stays attached to the can.
    const stageBox = stage.getBoundingClientRect();
    const opening = canSlot.getBoundingClientRect();
    const mouthX = (opening.left + opening.width * .5 - stageBox.left) / stageBox.width * 1000;
    const mouthY = (opening.top + opening.height * .53 - stageBox.top) / stageBox.height * 1000;
    liquidSurface?.draw(p, mouthX / 1000, mouthY / 1000);
    fizzSurface?.draw(p, mouthX / 1000 * stageBox.width, mouthY / 1000 * stageBox.height, opening.width);

    // A feathered wet film starts at the opening after the foam pops. It has
    // no visible ring; the retained top curtain takes over as it spreads.
    const spray=phase(p,.255,.60);
    const radius=Math.round(24+Math.max(stageBox.width,stageBox.height)*1.3*phase(p,.27,.69));
    const mask=`radial-gradient(circle ${radius}px at ${number(mouthX/10)}% ${number(mouthY/10)}%, #000 15%, rgba(0,0,0,.82) 55%, transparent 100%)`;
    sprayFilm.style.maskImage=mask;
    sprayFilm.style.webkitMaskImage=mask;
    sprayFilm.style.opacity=(spray*(1-phase(p,.70,.83))*.68).toFixed(3);
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
      hero.style.removeProperty('--hs-focus');
      hero.style.removeProperty('--hs-can-scale');
      hero.style.removeProperty('--hs-can-shift');
      hero.style.removeProperty('--hs-reveal');
      stage.style.removeProperty('background-color');
      refract.style.opacity = '0';
      sprayFilm.style.opacity = '0';
      fizzSurface?.clear();
    } else if (!window.ScrollTrigger?.getById('hero-splash-only')) {
      initialize();
    }
  });
  initialize();
})();
