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
  // The late curtain is retained; the 3D can owns its opening and local spray.
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

  let can3D;
  let lastProgress=0;
  let lastMovement=-Infinity;
  let settleFrame=0;
  let heroTimeline;
  let fallbackCleanup;
  const activity=()=>1-phase(performance.now()-lastMovement,25,125);
  function settleVibration(){
    settleFrame=0;
    if(motion.matches||!can3D) return;
    const strength=activity();
    can3D.update(lastProgress,strength);
    // A bounded tail, not a permanent rendering loop. The can rests within 125ms.
    if(strength>0&&lastProgress>.025&&lastProgress<.26){
      settleFrame=requestAnimationFrame(settleVibration);
    }
  }
  import('./hero-can-3d.js').then(async module => {
    can3D=await module.createHeroCan(hero);
    render(lastProgress);
  }).catch(error => console.warn('Hero 3D unavailable; using existing can fallback.', error));
  function render(progress) {
    if(Math.abs(progress-lastProgress)>1e-7) lastMovement=performance.now();
    lastProgress=progress;
    const p = clamp(progress);
    if (motion.matches) { can3D?.update(0); return; }
    // A brief camera push makes the opening legible, then restores the
    // smaller upright can before the existing curtain enters.
    const focus = phase(p, .04, .16) * (1 - phase(p, .26, .35));
    const topView = phase(p, .04, .20) * (1 - phase(p, .42, .57));
    const settle = phase(p, .35, .50);
    hero.style.setProperty('--hs-focus', focus.toFixed(4));
    hero.style.setProperty('--hs-tab', phase(p, .285, .355).toFixed(4));
    hero.style.setProperty('--hs-can-scale', (can3D ? 1 - .06 * focus - .04 * settle : 1 + .14 * focus - .1 * settle).toFixed(4));
    hero.style.setProperty('--hs-can-shift', `${Math.round(stage.clientHeight * (can3D ? .035 * topView : .17 * phase(p, .015, .14) + .115 * topView - .05 * settle))}px`);

    // Read the transformed opening so the liquid stays attached to the can.
    const stageBox = stage.getBoundingClientRect();
    const projected = can3D?.update(p,activity());
    if(can3D&&!settleFrame&&p>.025&&p<.26){
      settleFrame=requestAnimationFrame(settleVibration);
    }
    const opening = canSlot.getBoundingClientRect();
    const mouthX = ((projected?.x ?? opening.left + opening.width * .5) - stageBox.left) / stageBox.width * 1000;
    const mouthY = ((projected?.y ?? opening.top + opening.height * .53) - stageBox.top) / stageBox.height * 1000;
    liquidSurface?.draw(p, mouthX / 1000, mouthY / 1000);

    // A feathered wet film starts at the opening after the foam pops. It has
    // no visible ring; the retained top curtain takes over as it spreads.
    const spray=phase(p,.38,.60);
    const radius=Math.round(24+Math.max(stageBox.width,stageBox.height)*1.3*phase(p,.38,.69));
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
      const playhead={progress:0};
      heroTimeline=window.gsap.timeline({
        scrollTrigger:{
          id:'hero-splash-only',
          trigger:hero,
          start:'top top',
          end:'bottom bottom',
          scrub:true,
          invalidateOnRefresh:true,
          onRefresh:self=>render(self.progress)
        }
      }).fromTo(playhead,{progress:0},{
        progress:1,duration:1,ease:'none',immediateRender:false,
        onUpdate:()=>render(playhead.progress)
      });
      render(heroTimeline.scrollTrigger.progress);
    } else {
      // A native fallback preserves the scene when GSAP is unavailable.
      const update = () => render(-hero.getBoundingClientRect().top / Math.max(1, hero.offsetHeight - innerHeight));
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update, { passive: true });
      fallbackCleanup=()=>{
        window.removeEventListener('scroll',update);
        window.removeEventListener('resize',update);
      };
      update();
    }
  }

  motion.addEventListener('change', () => {
    if (motion.matches) {
      cancelAnimationFrame(settleFrame);
      settleFrame=0;
      can3D?.update(0);
      window.ScrollTrigger?.getById('hero-splash-only')?.kill();
      heroTimeline?.kill();
      fallbackCleanup?.();
      hero.style.removeProperty('--hs-tab');
      hero.style.removeProperty('--hs-focus');
      hero.style.removeProperty('--hs-can-scale');
      hero.style.removeProperty('--hs-can-shift');
      hero.style.removeProperty('--hs-reveal');
      stage.style.removeProperty('background-color');
      refract.style.opacity = '0';
      sprayFilm.style.opacity = '0';
    } else if (!window.ScrollTrigger?.getById('hero-splash-only')) {
      initialize();
    }
  });
  initialize();
})();
