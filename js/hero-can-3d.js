import * as THREE from './vendor/three.module.js';

// Hero-owned geometry, renderer and lifecycle. No History or global effect state.
export async function createHeroCan(hero) {
  const host = hero.querySelector('.hero-can-body');
  const renderer = new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.15;
  renderer.domElement.className='hs-can-3d';
  renderer.domElement.setAttribute('aria-hidden','true');
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(30,1,.1,40);
  // Studio softboxes become real view-dependent reflections through PMREM.
  const studio=new THREE.Scene();
  studio.background=new THREE.Color('#252c30');
  const box=(x,y,z,w,h,intensity)=>{
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color().setScalar(intensity),side:THREE.DoubleSide}));
    mesh.position.set(x,y,z); mesh.lookAt(0,0,0); studio.add(mesh);
  };
  box(-4,2,4,2,8,5); box(4,1,2,1,7,3); box(0,6,0,5,4,4); box(0,0,-5,4,6,1.5);
  const pmrem=new THREE.PMREMGenerator(renderer);
  const environment=pmrem.fromScene(studio,.04); scene.environment=environment.texture;
  studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();}); pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff,0x527269,1.1));
  const key=new THREE.DirectionalLight(0xffffff,2);key.position.set(-3,6,5);scene.add(key);
  const metal=new THREE.MeshStandardMaterial({color:0xd4dade,metalness:1,roughness:.23});
  const groove=new THREE.MeshStandardMaterial({color:0x79868c,metalness:1,roughness:.32});
  const can=new THREE.Group();scene.add(can);
  const add=(geometry,material,x=0,y=0,z=0,parent=can)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);return m;};
  const profile=[[.51,-1.66],[.57,-1.65],[.60,-1.60],[.60,-1.54],[.645,-1.43],[.65,-1.30],[.65,1.29],[.64,1.40],[.59,1.51],[.575,1.58],[.575,1.64]];
  add(new THREE.LatheGeometry(profile.map(([x,y])=>new THREE.Vector2(x,y)),128),metal);
  let texture;
  try {texture=await new THREE.TextureLoader().loadAsync(new URL('../img/history/2024packaging-uv.png',import.meta.url).href);} catch(error){renderer.dispose();environment.dispose();throw error;}
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
  const label=add(new THREE.CylinderGeometry(.651,.651,2.86,128,1,true),new THREE.MeshPhysicalMaterial({map:texture,metalness:.36,roughness:.36,clearcoat:.35,clearcoatRoughness:.25}));
  label.rotation.y=Math.PI+.03*Math.PI*2;
  const ring=(r,t,y,material=metal)=>{const m=add(new THREE.TorusGeometry(r,t,16,128),material,0,y);m.rotation.x=Math.PI/2;return m;};
  ring(.577,.032,1.625);ring(.55,.012,1.606);ring(.574,.025,-1.63);
  ring(.506,.009,1.574,groove);ring(.48,.006,1.567);
  // Recessed stamped lid with a real cut-out (not a painted dark oval).
  const lidShape=new THREE.Shape();lidShape.absarc(0,0,.535,0,Math.PI*2,false);
  const hole=new THREE.Path();hole.absellipse(0,-.245,.175,.207,0,Math.PI*2,true);lidShape.holes.push(hole);
  const lid=add(new THREE.ExtrudeGeometry(lidShape,{depth:.013,bevelEnabled:true,bevelSize:.004,bevelThickness:.003,bevelSegments:2,steps:1,curveSegments:64}),metal,0,1.565);
  lid.rotation.x=-Math.PI/2;
  const interior=add(new THREE.CylinderGeometry(.53,.53,.06,96),new THREE.MeshStandardMaterial({color:0x071a12,roughness:.85}),0,1.47);
  const flapPivot=new THREE.Group();flapPivot.position.set(0,1.566,.04);can.add(flapPivot);
  const flapShape=new THREE.Shape();flapShape.absellipse(0,-.205,.169,.200,0,Math.PI*2,false);
  const flap=add(new THREE.ShapeGeometry(flapShape,48),metal,0,0,0,flapPivot);flap.rotation.x=-Math.PI/2;
  // Beveled extruded pull-tab, including finger hole and pivot rivet.
  const tabShape=new THREE.Shape();tabShape.absellipse(0,.12,.125,.255,0,Math.PI*2,false);
  const finger=new THREE.Path();finger.absellipse(0,.205,.076,.105,0,Math.PI*2,true);tabShape.holes.push(finger);
  const tabPivot=new THREE.Group();tabPivot.position.set(0,1.594,-.035);can.add(tabPivot);
  const tab=add(new THREE.ExtrudeGeometry(tabShape,{depth:.015,bevelEnabled:true,bevelSize:.01,bevelThickness:.006,bevelSegments:3,curveSegments:48}),metal,0,0,0,tabPivot);tab.rotation.x=-Math.PI/2;
  add(new THREE.CylinderGeometry(.042,.049,.025,40),metal,0,1.616,-.035);
  const mouth=new THREE.Vector3(0,1.59,.25);
  const particles=[]; const dropMat=new THREE.MeshPhysicalMaterial({color:0xf7ffff,metalness:0,roughness:.12,transparent:true,opacity:.72,clearcoat:1});
  for(let i=0;i<32;i++){const drop=add(new THREE.SphereGeometry(.006+(i%5)*.0018,6,4),dropMat);drop.scale.y=1.7;particles.push(drop);}
  host.append(renderer.domElement);hero.classList.add('hs-can-3d-ready');
  let progress=0,width=0,height=0;
  const phase=(p,a,b)=>{let t=Math.min(1,Math.max(0,(p-a)/(b-a)));return t*t*(3-2*t);};
  function update(p){
    progress=p;const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
    if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
    const view=phase(p,.015,.14)*(1-phase(p,.40,.57));
    const angle=.035+view*.48;const distance=6.6;
    camera.position.set(0,Math.sin(angle)*distance,Math.cos(angle)*distance);camera.lookAt(0,0,0);
    tabPivot.rotation.x=-phase(p,.075,.18)*1.22;
    flapPivot.rotation.x=phase(p,.12,.20)*1.03;
    particles.forEach((drop,i)=>{const t=(p-.18-(i%7)*.002)/.17;drop.visible=t>0&&t<1;const a=i*2.39996;drop.position.set(Math.cos(a)*t*(.09+(i%6)*.04),1.59+Math.sin(t*Math.PI)*(.12+(i%8)*.035),.25+Math.sin(a)*t*.18);});
    renderer.render(scene,camera);
    const projected=mouth.clone().project(camera),rect=renderer.domElement.getBoundingClientRect();
    return {x:rect.left+(projected.x+1)*rect.width/2,y:rect.top+(1-projected.y)*rect.height/2};
  }
  const observer=new ResizeObserver(()=>update(progress));observer.observe(host);
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();hero.classList.remove('hs-can-3d-ready');});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{hero.classList.add('hs-can-3d-ready');update(progress);});
  update(0);
  return {update};
}
