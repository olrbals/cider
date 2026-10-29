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
  // One pressure crown shares its contour with the live refraction mask.
  const streamData=new Float32Array(192);
  const streamBounds=new Float32Array(4);
  const dropData=new Float32Array(24);
  function sampleStreams(p,mouthX,mouthY,width,height){
    streamData.fill(0);streamBounds.fill(0);dropData.fill(0);
    if(p<.58||p>=.76) return [];
    const rise=1-Math.pow(1-clamp((p-.505)/.045),3);
    const spread=phase(p,.552,.66),burst=phase(p,.505,.57);
    const cx=mouthX/height,cy=mouthY/height-.064*rise;
    const points=[];
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    const lobes=[[-2.78,.18,.25],[-2.13,.31,.29],[-1.40,.21,.25],[-.62,.27,.23]];
    for(let i=0;i<24;i++){
      const angle=i/24*Math.PI*2,signed=angle>Math.PI?angle-Math.PI*2:angle;
      let fingers=0;
      for(const [direction,height,thickness] of lobes){
        const offset=(signed-direction-(burst-.5)*height*.7)/thickness;
        fingers+=height*Math.exp(-offset*offset);
      }
      const irregular=1+.055*Math.sin(angle*3+burst*3)+.035*Math.cos(angle*5-burst*4);
      const extension=1+fingers*burst*(1-spread*.6);
      const rx=(.043*rise+spread*width/height*.63)*irregular*extension;
      const ry=(.064*rise+.22*spread)*(Math.sin(angle)>0?1:irregular*extension);
      const x=cx+Math.cos(angle)*rx+Math.min(0,Math.sin(angle))*.012*rise*(1-spread);
      const y=cy+Math.sin(angle)*ry;
      points.push([x*height,y*height]);
      minX=Math.min(minX,x);minY=Math.min(minY,y);
      maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
    }
    // Periodic cubic interpolation rounds the shoulders and liquid tips.
    // The same samples feed both optics and the silhouette, avoiding sharp joins.
    const rounded=[];
    for(let i=0;i<24;i++){
      const a=points[(i+23)%24],b=points[i],c=points[(i+1)%24],d=points[(i+2)%24];
      for(let j=0;j<4;j++){
        const t=j/4,t2=t*t,t3=t2*t;
        const point=[0,1].map(k=>.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t2+(-a[k]+3*b[k]-3*c[k]+d[k])*t3));
        streamData.set([point[0]/height,point[1]/height],rounded.length*2);
        rounded.push(point);
        minX=Math.min(minX,point[0]/height);minY=Math.min(minY,point[1]/height);
        maxX=Math.max(maxX,point[0]/height);maxY=Math.max(maxY,point[1]/height);
      }
    }
    streamBounds.set([minX-.025,minY-.025,maxX+.025,maxY+.025]);
    const paths=[curve([...rounded,rounded[0]])+' Z'];
    for(let i=0;i<8;i++){
      const t=phase(p,.518+i*.001,.605+i*.002);
      const fade=1-phase(p,.61,.68);
      const seed=Math.sin(i*91.7+13.2)*43758.5453;
      const random=seed-Math.floor(seed);
      const angle=-3.03+i*.39+(random-.5)*.32;
      const speed=.075+random*random*.16;
      const x=mouthX/height+Math.cos(angle)*speed*t;
      const y=mouthY/height+Math.sin(angle)*speed*t-.065*t+.05*t*t;
      const r=(.0022+random*random*.0035)*Math.sin(t*Math.PI*.8)*fade;
      dropData.set([x,y,r],i*3);
      streamBounds[0]=Math.min(streamBounds[0],x-r-.01);
      streamBounds[1]=Math.min(streamBounds[1],y-r-.01);
      streamBounds[2]=Math.max(streamBounds[2],x+r+.01);
      streamBounds[3]=Math.max(streamBounds[3],y+r+.01);
      if(r>.00001) paths.push(`M ${number((x-r)*height)} ${number(y*height)} a ${number(r*height)} ${number(r*height)} 0 1 0 ${number(2*r*height)} 0 a ${number(r*height)} ${number(r*height)} 0 1 0 ${number(-2*r*height)} 0 Z`);
    }
    return paths;
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
    const derivatives=gl.getExtension('OES_standard_derivatives');
    const vertex = `attribute vec2 a_position;
      void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;
    const fragment = `${derivatives ? '#extension GL_OES_standard_derivatives : enable\n#define HS_STREAM_NORMALS\n' : ''}precision highp float;
      uniform vec2 u_resolution;
      uniform vec2 u_mouth;
      uniform float u_progress;
      uniform vec2 u_streams[96];
      uniform vec4 u_stream_bounds;
      uniform vec3 u_drops[8];
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
      float streamSurface(vec2 q) {
        float distanceToEdge=10.0,signValue=1.0;
        vec2 a=u_streams[95];
        for(int i=0;i<96;i++) {
          vec2 b=u_streams[i],e=b-a,v=q-a;
          vec2 nearest=v-e*clamp(dot(v,e)/max(dot(e,e),.0000001),0.0,1.0);
          distanceToEdge=min(distanceToEdge,length(nearest));
          if((a.y>q.y)!=(b.y>q.y)) {
            if(q.x<(b.x-a.x)*(q.y-a.y)/(b.y-a.y)+a.x) signValue=-signValue;
          }
          a=b;
        }
        float d=distanceToEdge*signValue;
        for(int i=0;i<8;i++) {
          if(u_drops[i].z>0.00001) d=unite(d,length(q-u_drops[i].xy)-u_drops[i].z,.002);
        }
        return d;
      }
      // Hollow micro-cavities advect with the water; no independent bubble system.
      vec2 carbonation(vec2 q,float p,float scale) {
        vec2 advect=q*scale+vec2(p*5.0,-p*32.0);
        vec2 cell=floor(advect),f=fract(advect);
        vec2 center=.25+.5*vec2(hash(cell),hash(cell+17.0));
        float radius=.025+.15*pow(hash(cell+29.0),2.8);
        vec2 v=f-center;
        float ring=exp(-abs(length(v)-radius)*65.0);
        vec2 origin=vec2(u_mouth.x*u_resolution.x/u_resolution.y,u_mouth.y);
        float pressure=phase(p,.505,.527)*(1.0-phase(p,.55,.61));
        float cloud=exp(-dot(q-origin,q-origin)/(.0003+.008*phase(p,.51,.60)));
        float population=step(mix(.48,.06,cloud*pressure),hash(cell+41.0));
        float highlight=sat(dot(normalize(v+vec2(.0001)),vec2(-.65,-.76)));
        return vec2(ring*highlight,ring*(1.0-highlight))*population;
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
        float inner=body*(.12+.07*noise(uv*vec2(5.0,8.0)+p*2.0));
        float bright=phase(p,.77,.99);
        float alpha=inner+edge*.37+body*bright*.47;
        float thickness=.45+.55*noise(uv*vec2(9.0,13.0)+vec2(p*3.0,-p*11.0));
        float glint=exp(-abs(d+.008)*340.0)*body*(.10+.12*thickness);
        alpha+=glint;
        vec3 color=mix(vec3(.94,.965,.955),vec3(1.0),bright);
        color=mix(color,vec3(.38,.43,.41),edge*.20);
        color+=vec3(glint*.4);
        alpha=sat(alpha);
        // Early liquid is a continuous volume, not detached particle sprites.
        // The pressure crown expands into a wet sheet before the curtain takes over.
        vec2 q=uv*vec2(u_resolution.x/u_resolution.y,1.0);
        if(p>=.505 && p<.76 && q.x>u_stream_bounds.x && q.y>u_stream_bounds.y
           && q.x<u_stream_bounds.z && q.y<u_stream_bounds.w) {
          float water=streamSurface(q);
          float visible=phase(p,.58,.62)*(1.0-phase(p,.70,.76));
          float inside=1.0-smoothstep(-.0015,.0015,water);
          vec2 material=q-vec2(u_mouth.x*u_resolution.x/u_resolution.y,u_mouth.y);
          float folds=noise(material*34.0+vec2(p*13.0,-p*28.0));
          float depth=sqrt(max(0.0,1.0-pow(sat(1.0+water/.024),2.0)))*(.72+.28*folds);
          vec3 normal=vec3(0.0,0.0,1.0);
          #ifdef HS_STREAM_NORMALS
            normal=normalize(vec3(-dFdx(depth)*u_resolution.x*.014,
                                  dFdy(depth)*u_resolution.y*.014,1.0));
          #endif
          vec3 light=normalize(vec3(-.48,.65,1.0));
          float reflection=pow(max(dot(normal,light),0.0),85.0);
          float edgeLight=sat(dot(normal.xy,normalize(light.xy))*.5+.5);
          float innerRim=exp(-abs(water+.0025)*900.0)*inside;
          float outerRim=exp(-abs(water)*900.0);
          float pool=phase(p,.565,.665);
          float volume=inside*(mix(.055,.012,pool)+depth*.035);
          float shine=reflection*inside*(.25+depth*.32)+innerRim*(.10+edgeLight*.50)*(1.0-pool*.62);
          float shadow=outerRim*(1.0-edgeLight)*.32*(1.0-pool*.65);
          vec2 fizz=carbonation(q,p,82.0)+carbonation(q+1.7,p,157.0)*.48;
          shine+=fizz.x*inside*.65;
          shine+=pow(folds,12.0)*inside*.24;
          shine+=pow(folds,20.0)*inside*.12;

          shadow+=fizz.y*inside*.15;
          float surfaceAlpha=volume+shine+shadow;
          float liquidAlpha=surfaceAlpha*visible;
          vec3 liquidColor=(vec3(.97,.985,.98)*volume+vec3(1.0)*shine
                           +vec3(.28,.32,.30)*shadow)/max(surfaceAlpha,.0001);
          float combined=1.0-(1.0-alpha)*(1.0-liquidAlpha);
          color=(liquidColor*liquidAlpha+color*alpha*(1.0-liquidAlpha))/max(combined,.0001);
          alpha=combined;
        }
        vec2 fizz=carbonation(q,p,82.0)+carbonation(q+1.7,p,157.0)*.48;
        float fizzMask=body*sheetVisible*(1.0-phase(p,.88,1.0));
        float sparkle=fizz.x*fizzMask*.42;
        color=mix(color,vec3(.33,.38,.36),fizz.y*fizzMask*.22);
        color=mix(color,vec3(1.0),sparkle);
        alpha=sat(alpha+sparkle);
        // A short, dense pressure core thins radially as it escapes the opening.
        vec2 mouthQ=vec2(u_mouth.x*u_resolution.x/u_resolution.y,u_mouth.y);
        vec2 offset=q-mouthQ+vec2(0.0,.012+phase(p,.51,.59)*.045);
        float pressure=phase(p,.505,.516)*(1.0-phase(p,.555,.60));
        float core=exp(-dot(offset*vec2(1.2,1.0),offset*vec2(1.2,1.0))/(.00022+.003*phase(p,.51,.59)));
        vec2 micro=carbonation(q,p,186.0);
        float sparkleCore=micro.x*core*pressure*.85;
        color=mix(color,vec3(.99),sparkleCore/max(alpha+sparkleCore,.0001));
        alpha=1.0-(1.0-alpha)*(1.0-sparkleCore);
        // Small lens-facing droplets carry paired bright/dark menisci.
        // Their contrast survives the white typography without adding glow.
        for(int i=0;i<8;i++) {
          vec3 drop=u_drops[i];
          if(drop.z>.00001) {
            vec2 v=(q-drop.xy)/drop.z;
            float rr=dot(v,v);
            if(rr<1.35) {
              float disc=1.0-smoothstep(.82,1.2,rr);
              vec3 n=normalize(vec3(v,sqrt(max(.001,1.0-min(rr,1.0)))));
              float shine=pow(max(dot(n,normalize(vec3(-.5,-.65,1.0))),0.0),22.0);
              float rim=exp(-abs(rr-.80)*16.0);
              float light=shine*.70+rim*max(0.0,-v.x-v.y)*.35;
              float shade=rim*max(0.0,v.x+v.y)*.28;
              float a=(.035+light+shade)*disc*(1.0-phase(p,.64,.70));
              vec3 dropColor=(vec3(1.0)*(.035+light)+vec3(.16,.22,.19)*shade)/max(.035+light+shade,.001);
              float combined=1.0-(1.0-alpha)*(1.0-a);
              color=(dropColor*a+color*alpha*(1.0-a))/max(combined,.0001);
              alpha=combined;
            }
          }
        }
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
    const streams=gl.getUniformLocation(program,'u_streams[0]');
    const bounds=gl.getUniformLocation(program,'u_stream_bounds');
    const drops=gl.getUniformLocation(program,'u_drops[0]');
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
      gl.uniform2fv(streams,streamData);
      gl.uniform4fv(bounds,streamBounds);
      gl.uniform3fv(drops,dropData);
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
  const optics=document.createElementNS('http://www.w3.org/2000/svg','svg');
  optics.setAttribute('width','0');optics.setAttribute('height','0');
  optics.setAttribute('aria-hidden','true');
  optics.style.position='absolute';
  optics.innerHTML=`<defs>
    <filter id="hs-stream-lens-filter" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency=".018 .026" numOctaves="2" seed="17" result="lensNoise"/>
      <feDisplacementMap in="SourceGraphic" in2="lensNoise" scale="21" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <clipPath id="hs-stream-wet-clip" clipPathUnits="userSpaceOnUse"></clipPath>
  </defs>`;
  const streamClip=optics.querySelector('clipPath');
  const liquidDisplacement=optics.querySelector('feDisplacementMap');
  const streamClipPaths=Array.from({length:9},()=>{
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    streamClip.append(path);return path;
  });
  const streamRefraction=document.createElement('div');
  streamRefraction.className='hs-stream-refraction';
  streamRefraction.setAttribute('aria-hidden','true');
  stage.append(optics,streamRefraction);
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
  let canUnavailable=false;
  let lastProgress=0;
  let lastMovement=-Infinity;
  let settleFrame=0;
  let vibrationPhase=0;
  let lastVibrationTick=performance.now();
  let heroTimeline;
  let fallbackCleanup;
  const activity=()=>1-phase(performance.now()-lastMovement,25,125);
  function drawCan(p,strength){
    const now=performance.now();
    const frequency=10+8*phase(p,.025,.34);
    vibrationPhase+=Math.min((now-lastVibrationTick)/1000,.05)*frequency*Math.PI*2;
    lastVibrationTick=now;
    return can3D?.update(p,strength,vibrationPhase);
  }
  function settleVibration(){
    settleFrame=0;
    if(motion.matches||!can3D) return;
    const strength=activity();
    drawCan(lastProgress,strength);
    // Render the 10–18Hz vibration only during active scroll, plus a bounded
    // settling tail. It stops before the separate pause and tab-opening phase.
    if(strength>0&&lastProgress>.025&&lastProgress<.39){
      settleFrame=requestAnimationFrame(settleVibration);
    }
  }
  import('./hero-can-3d.js').then(async module => {
    can3D=await module.createHeroCan(hero);
    syncProgress(rawProgress);
  }).catch(error => {
    canUnavailable=true;
    console.warn('Hero 3D unavailable; using existing can fallback.',error);
    syncProgress(rawProgress);
  });
  function render(progress) {
    if(Math.abs(progress-lastProgress)>1e-7) lastMovement=performance.now();
    lastProgress=progress;
    const p = clamp(progress);
    if (motion.matches) { can3D?.update(0); return; }
    // Size, center and camera remain fixed; only the 3D can's horizontal
    // vibration and its hinged ring respond before the existing wet transition.
    hero.style.setProperty('--hs-tab', phase(p, .425, .505).toFixed(4));

    // Read the transformed opening so the liquid stays attached to the can.
    const stageBox = stage.getBoundingClientRect();
    const projected = drawCan(p,activity());
    if(can3D&&!settleFrame&&p>.025&&p<.39){
      settleFrame=requestAnimationFrame(settleVibration);
    }
    const opening = canSlot.getBoundingClientRect();
    const mouthX = ((projected?.x ?? opening.left + opening.width * .5) - stageBox.left) / stageBox.width * 1000;
    const mouthY = ((projected?.y ?? opening.top + opening.height * .53) - stageBox.top) / stageBox.height * 1000;
    liquidDisplacement.setAttribute('scale',number(6+12*phase(p,.505,.55)*(1-phase(p,.63,.80))));
    const streamPaths=sampleStreams(p,mouthX/1000*stageBox.width,mouthY/1000*stageBox.height,stageBox.width,stageBox.height);
    streamClipPaths.forEach((path,i)=>path.setAttribute('d',streamPaths[i]||''));
    streamRefraction.style.opacity=(phase(p,.58,.62)*(1-phase(p,.70,.76))).toFixed(4);
    streamRefraction.style.display=streamPaths.length?'block':'none';
    liquidSurface?.draw(p, mouthX / 1000, mouthY / 1000);

    // The expanding crown causes the first wetting before the broad film takes over.
    const spray=phase(p,.52,.65);
    const radius=Math.round(24+Math.max(stageBox.width,stageBox.height)*1.3*phase(p,.51,.69));
    const mask=`radial-gradient(circle ${radius}px at ${number(mouthX/10)}% ${number(mouthY/10)}%, #000 15%, rgba(0,0,0,.82) 55%, transparent 100%)`;
    sprayFilm.style.maskImage=mask;
    sprayFilm.style.webkitMaskImage=mask;
    sprayFilm.style.opacity=(spray*phase(p,.62,.74)*(1-phase(p,.70,.83))*.68).toFixed(3);
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

  let rawProgress=0;
  let releaseState='armed';
  let releaseTimeline;
  const releaseHead={progress:0};
  function syncProgress(value){
    rawProgress=clamp(value);
    if(motion.matches){render(0);return;}
    if(!window.gsap){render(rawProgress);return;}
    if(rawProgress<.405){
      if(releaseState==='armed'){render(rawProgress);return;}
      if(releaseState==='resetting') return;
      releaseTimeline?.kill();
      releaseState='resetting';
      releaseTimeline=window.gsap.to(releaseHead,{
        progress:rawProgress,duration:.24,ease:'power2.out',
        onUpdate:()=>render(releaseHead.progress),
        onComplete:()=>{releaseState='armed';syncProgress(rawProgress);}
      });
      return;
    }
    if(releaseState==='armed'&&rawProgress>=.425){
      // Preserve the burst if the first scroll arrives while the can texture loads.
      if(!can3D&&!canUnavailable){render(.425);return;}
      releaseState='releasing';releaseHead.progress=.425;
      releaseTimeline=window.gsap.timeline({
        onUpdate:()=>render(releaseHead.progress),
        onComplete:()=>{releaseState='released';syncProgress(rawProgress);}
      }).to(releaseHead,{progress:.505,duration:.24,ease:'power2.inOut'})
        .to(releaseHead,{progress:.545,duration:.16,ease:'power2.out'})
        .to(releaseHead,{progress:.655,duration:.32,ease:'power2.in'})
        .to(releaseHead,{progress:()=>Math.max(.655,rawProgress),duration:.28,ease:'power1.inOut'});
      return;
    }
    if(releaseState==='releasing'||releaseState==='resetting') return;
    // Reverse scrubbing restores the original geometry; crossing the lower
    // hysteresis threshold rearms the single release for the next approach.
    const p=releaseState==='released'?Math.max(.655,rawProgress):Math.min(rawProgress,.425);
    releaseHead.progress=p;render(p);
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
          onRefresh:self=>syncProgress(self.progress)
        }
      }).fromTo(playhead,{progress:0},{
        progress:1,duration:1,ease:'none',immediateRender:false,
        onUpdate:()=>syncProgress(playhead.progress)
      });
      syncProgress(heroTimeline.scrollTrigger.progress);
    } else {
      // A native fallback preserves the scene when GSAP is unavailable.
      const update = () => syncProgress(-hero.getBoundingClientRect().top / Math.max(1, hero.offsetHeight - innerHeight));
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
      releaseTimeline?.kill();
      releaseState='armed';
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
      streamRefraction.style.display='none';
    } else if (!window.ScrollTrigger?.getById('hero-splash-only')) {
      initialize();
    }
  });
  initialize();
})();
