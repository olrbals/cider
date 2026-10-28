/* Hero-only SVG liquid. ScrollTrigger supplies reversible progress; every frame derives from that progress. */
(() => {
  'use strict';
  const hero = document.querySelector('#top.hero');
  const stage = hero?.querySelector('.hero-splash-stage');
  const svg = hero?.querySelector('.hero-splash-effects');
  if (!hero || !stage || !svg) return;

  const jet = svg.querySelector('.hs-jet');
  const jetGlow = svg.querySelector('.hs-jet-glow');
  const sheet = svg.querySelector('.hs-sheet');
  const sheetGlint = svg.querySelector('.hs-sheet-glint');
  const refract = stage.querySelector('.hs-refraction');
  const jetRefract = stage.querySelector('.hs-jet-refraction');
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
  // distance field: one connected jet, then an irregular curtain with real
  // thickness-dependent transmission and narrow specular edges.
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
        float rise=phase(p,.10,.47), fork=phase(p,.27,.45);
        float spread=phase(p,.44,.68), flow=phase(p,.56,.96);
        float mouthY=u_mouth.y;
        float topY=mix(mouthY,.012,rise);
        float stemT=sat((mouthY-uv.y)/max(mouthY-topY,.01));
        float sway=(noise(vec2(stemT*3.8,p*3.2))-.5)*.024*rise;
        vec2 warped=uv;
        warped.x-=sway+(noise(uv*vec2(18.0,13.0)+vec2(p*4.0,0.0))-.5)*.008*rise;
        vec2 root=vec2(u_mouth.x,mouthY+.012);
        vec2 crown=vec2(u_mouth.x+.008*fork,topY+.026);
        float jet=capsule(warped,root,crown,.018,.027);
        float branchLeft=capsule(warped,crown,vec2(crown.x-.055*fork,topY+.009),.024,.010);
        float branchRight=capsule(warped,crown,vec2(crown.x+.052*fork,topY-.006),.025,.012);
        jet=unite(jet,branchLeft,.022);
        jet=unite(jet,branchRight,.022);
        jet+=(noise(uv*vec2(33.0,17.0)+vec2(p*7.0,2.0))-.5)*.006*rise;
        float jetVisible=phase(p,.11,.18)*(1.0-phase(p,.65,.81));

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
        float dj=jet+(1.0-jetVisible)*.12, ds=sheet+(1.0-sheetVisible)*.12;
        float d=min(dj,ds);
        float body=1.0-smoothstep(-.005,.003,d);
        float edge=exp(-abs(d)*145.0)*sat(max(jetVisible,sheetVisible));
        float inner=body*(.18+.10*noise(uv*vec2(5.0,8.0)+p*2.0));
        float bright=phase(p,.77,.99);
        float alpha=inner+edge*.37+body*bright*.47;
        float glint=exp(-abs(d+.013)*210.0)*body*.15;
        alpha+=glint;
        vec3 color=mix(vec3(.75,.94,.85),vec3(1.0),.55+bright*.42);
        color=mix(color,vec3(.42,.78,.62),edge*.25);
        color+=vec3(glint*.4);
        // Only a few detached beads; their motion is fully scroll reversible.
        float beads=0.0;
        for (int i=0;i<4;i++) {
          float fi=float(i);
          float flight=phase(p,.20+fi*.047,.44+fi*.02);
          float fade=phase(p,.21+fi*.047,.27+fi*.047)*(1.0-phase(p,.48,.62));
          vec2 bead=vec2(u_mouth.x+(fi-1.5)*.024*flight,
            mouthY-flight*(.13+fi*.035));
          float bd=length(uv-bead)-(.0038+fi*.0005);
          beads+=fade*(1.0-smoothstep(-.002,.002,bd))*.52;
        }
        alpha=sat(alpha+beads);
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
  const drops = Array.from({ length: 5 }, (_, index) => {
    const group = document.createElementNS(ns, 'g');
    const body = document.createElementNS(ns, 'circle');
    const glint = document.createElementNS(ns, 'circle');
    body.classList.add('hs-droplet');
    body.setAttribute('fill', 'url(#hs-drop-water)');
    glint.classList.add('hs-droplet-glint');
    group.append(body, glint);
    dropsGroup.append(group);
    return { group, body, glint, index };
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

    const spread = phase(p, .46, .70);
    const rise = phase(p, .10, .47);
    const fork = phase(p, .28, .45);
    const jetFade = 1 - phase(p, .56, .74);
    const height = Math.max(0, mouthY - 18) * rise;
    const jetTop = mouthY - height;
    const base = Math.max(11, opening.width / stageBox.width * 140);
    const width = base + 29 * rise + 130 * spread;
    const sway = Math.sin(p * 21) * 8 * rise;
    const cx = mouthX + sway;
    // A single thick stem flows into three connected, rounded tips.
    const jetPath = [
      `M ${number(mouthX - base)} ${number(mouthY + 5)}`,
      `C ${number(mouthX - base * 1.25)} ${number(mouthY - height * .35)} ${number(cx - base * 1.3)} ${number(jetTop + 82)} ${number(cx - base * 1.35)} ${number(jetTop + 62)}`,
      `C ${number(cx - base * 1.4)} ${number(jetTop + 40)} ${number(cx - width * .8)} ${number(jetTop + 18)} ${number(cx - width * .74)} ${number(jetTop + 33)}`,
      `C ${number(cx - width * 1.25)} ${number(jetTop + 4)} ${number(cx - width * 1.55 - 12 * fork)} ${number(jetTop + 28)} ${number(cx - width * 1.12 - 12 * fork)} ${number(jetTop + 35)}`,
      `C ${number(cx - width * .8)} ${number(jetTop + 42)} ${number(cx - width * .72)} ${number(jetTop + 5)} ${number(cx - width * .27)} ${number(jetTop + 10)}`,
      `C ${number(cx - width * .1)} ${number(jetTop - 10 - 17 * fork)} ${number(cx + width * .22)} ${number(jetTop - 13 - 19 * fork)} ${number(cx + width * .4)} ${number(jetTop + 10)}`,
      `C ${number(cx + width * .7)} ${number(jetTop + 37)} ${number(cx + width * 1.27 + 14 * fork)} ${number(jetTop + 5)} ${number(cx + width * 1.18 + 14 * fork)} ${number(jetTop + 34)}`,
      `C ${number(cx + width * .9)} ${number(jetTop + 48)} ${number(cx + base * 1.4)} ${number(jetTop + 40)} ${number(cx + base * 1.35)} ${number(jetTop + 62)}`,
      `C ${number(cx + base * 1.3)} ${number(jetTop + 82)} ${number(mouthX + base * 1.25)} ${number(mouthY - height * .35)} ${number(mouthX + base * 1.4)} ${number(mouthY - height * .25)}`,
      `Q ${number(mouthX + base * 1.05)} ${number(mouthY + 7)} ${number(mouthX - base)} ${number(mouthY + 5)} Z`
    ].join(' ');
    jet.setAttribute('d', jetPath);
    jetGlow.setAttribute('d', jetPath);
    jet.style.opacity = (phase(p, .11, .18) * jetFade).toFixed(3);
    jetGlow.style.opacity = (phase(p, .11, .18) * jetFade * .38).toFixed(3);
    if (!mobile.matches && rise > .01) {
      const outline = [
        [mouthX - base, mouthY + 5], [cx - base * 1.3, jetTop + 68],
        [cx - width * .76, jetTop + 35], [cx - width * 1.2, jetTop + 28],
        [cx - width * .28, jetTop + 10], [cx + width * .22, jetTop - 12],
        [cx + width * 1.2, jetTop + 32], [cx + width * .8, jetTop + 54],
        [cx + base * 1.3, jetTop + 68], [mouthX + base, mouthY + 5]
      ];
      jetRefract.style.clipPath = `polygon(${outline.map(([x, y]) => `${number(x / 10)}% ${number(y / 10)}%`).join(',')})`;
      jetRefract.style.opacity = (phase(p, .11, .18) * jetFade * .78).toFixed(3);
    } else {
      jetRefract.style.opacity = '0';
    }

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
      jetRefract.style.opacity = '0';
    }

    drops.forEach(({ group, body, glint, index }) => {
      const initial = .19 + index * .047;
      const flight = phase(p, initial, .43 + index * .018);
      const separate = phase(p, .57 + (index % 4) * .022, .91 + (index % 3) * .025);
      const x = mouthX + Math.sin(index * 3.7) * (10 + 56 * flight) + Math.sin(p * 16 + index) * 5;
      const y = mouthY - flight * (115 + index * 28) + separate * (240 + index * 39);
      const radius = 3 + (index % 3) * 1.6;
      const visible = phase(p, initial, initial + .05) * (1 - phase(p, .85, 1));
      group.style.opacity = visible.toFixed(3);
      body.setAttribute('cx', number(x));
      body.setAttribute('cy', number(y));
      body.setAttribute('r', number(radius * (1 + .12 * Math.sin(p * 30 + index))));
      glint.setAttribute('cx', number(x - radius * .28));
      glint.setAttribute('cy', number(y - radius * .34));
      glint.setAttribute('r', number(radius * .18));
    });

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
    } else if (!window.ScrollTrigger?.getById('hero-splash-only')) {
      initialize();
    }
  });
  initialize();
})();
