import * as THREE from './vendor/three.module.js';
import {createRichPET} from './rich-pet-model.js';
const root=document.querySelector('#rich-flavors'),viewport=root?.querySelector('.rich-flavors__viewport');
if(root&&viewport) boot().catch(error=>console.warn('RICH 3D fallback:',error));
async function boot(){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'default'});
 renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 renderer.domElement.className='rich-pet-canvas';renderer.domElement.setAttribute('aria-hidden','true');
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,100);camera.position.z=10;
 scene.add(new THREE.HemisphereLight(0xffffff,0xb2cbbb,2.2));
 const key=new THREE.DirectionalLight(0xffffff,2.3);key.position.set(-4,5,7);scene.add(key);
 const rim=new THREE.DirectionalLight(0xffffff,1.2);rim.position.set(4,2,-3);scene.add(rim);
 const loader=new THREE.TextureLoader(),cache=new Map();
 function texture(url){if(!cache.has(url))cache.set(url,loader.loadAsync(url).then(t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return t;}));return cache.get(url);}
 const textures=await Promise.all(['peach','grape'].map(f=>texture('img/flavors/pet3d-'+f+'-label.webp')));
 const pets=Array.from({length:4},(_,i)=>createRichPET(textures[i%2],i%2?0x008c42:0xed0b57));pets.forEach(p=>scene.add(p));
 const fruitNodes=[...root.querySelectorAll('.r11-slot:not([data-r11="peach"]):not([data-r11="grape"]),.rich-fg__motion-shell[data-role="fruit"]')];
 const fruits=await Promise.all(fruitNodes.map(async node=>{
  const img=node.querySelector('img'),t=await texture(img.getAttribute('src'));
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:t,transparent:true,alphaTest:.02,depthWrite:false}));scene.add(mesh);
  return {node,img,mesh};
 }));
 viewport.append(renderer.domElement);root.classList.add('rich-pet-ready');
 const reduce=matchMedia('(prefers-reduced-motion:reduce)');
 let W=0,H=0,frame=0,last=0,p=Number(root.dataset.richProgress||0);
 const introBottleScale=.88*.9;
 const clamp=t=>Math.max(0,Math.min(1,t));
 const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
 function resize(){W=viewport.clientWidth;H=viewport.clientHeight;camera.aspect=W/H;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,1.2,1920/W,1080/H));renderer.setSize(W,H);}
 const angleCache=new Map();
 function angle(node){if(!node||node===viewport)return 0;if(angleCache.has(node))return angleCache.get(node);const c=getComputedStyle(node);let a=0;if(c.transform!=='none'){const m=new DOMMatrixReadOnly(c.transform);a=Math.atan2(m.b,m.a);}if(c.rotate!=='none')a+=parseFloat(c.rotate)*Math.PI/180;const result=a+angle(node.parentElement);angleCache.set(node,result);return result;}
 function slotSize(node,rect,a){
  // Recover the unrotated CSS height from the transformed rectangle.
  const ratio=node.offsetWidth/Math.max(1,node.offsetHeight);
  return rect.height/Math.max(.1,Math.abs(Math.cos(a))+ratio*Math.abs(Math.sin(a)));
 }
 function place(mesh,node,height,depth=0){
  const r=node.getBoundingClientRect(),v=viewport.getBoundingClientRect();
  const visibleH=2*(10-depth)*Math.tan(38*Math.PI/360),units=visibleH/H;
  mesh.position.set((r.left+r.width/2-v.left-W/2)*units,(H/2-(r.top+r.height/2-v.top))*units,depth);
  mesh.scale.setScalar(height*units/4.305);return r;
 }
 function render(){
  angleCache.clear();
  const tide=reduce.matches?0:performance.now()*.001;
  if(W!==viewport.clientWidth||H!==viewport.clientHeight)resize();
  scene.children.forEach(o=>{if(o.isGroup||o.isMesh)o.visible=false;});
  const introExit=reduce.matches?Number(p>=.555):smooth(.46,.65,p);
  const units=2*10*Math.tan(38*Math.PI/360)/H;
  pets.forEach((pet,index)=>{
   // One peach instance persists from the duo into its detail scene.
   if(index===2)return;
   const i=index%2,name=i?'grape':'peach',intro=index===1;
   if(p<=.19 || (intro&&p>=.65) || (!i&&p>=.93) || (index===3&&p<=.745))return;
   const source=root.querySelector('[data-r11="'+name+'"]');
   const target=root.querySelector('.rich-fg--'+name+' [data-role="bottle"]');
   const node=intro||(!i&&p<.46)?source:target;
   const r=node.getBoundingClientRect(),a=angle(node),height=slotSize(node,r,a);
   const entry=reduce.matches?Number(p>=.82):smooth(.745,.895,p),exit=reduce.matches?Number(p>=.82):smooth(.755,.91,p);
   place(pet,node,height*(intro||(!i&&p<.46)?introBottleScale:1));
   pet.rotation.order='YXZ';
   pet.rotation.x=0;pet.rotation.y=0;pet.rotation.z=-a;
   if(!i){
    if(p<.65){
     const end=pet.position.clone(),endScale=pet.scale.x;
     const sr=source.getBoundingClientRect(),sa=angle(source);
     place(pet,source,slotSize(source,sr,sa)*introBottleScale);
     pet.position.lerp(end,introExit);pet.scale.setScalar(pet.scale.x+(endScale-pet.scale.x)*introExit);
     pet.rotation.z=-sa*(1-introExit)-a*introExit;
    }
    pet.rotation.x=-.16*exit;pet.rotation.y=.65*exit;pet.rotation.z+=.16*exit;
   }else if(intro){
    pet.position.x-=introExit*W*1.1*units;
    pet.rotation.y=.40*introExit;pet.rotation.z+=.12*introExit;
   }else{
    pet.position.y+=Math.sin(Math.PI*entry)*.12;
    pet.rotation.x=.12*(1-entry);pet.rotation.y=-.22*(1-entry);
    pet.rotation.z+=-.16*(1-entry);
   }
   if(!reduce.matches){
    const phase=tide*.82+i*1.7;
    pet.position.y+=Math.sin(phase)*.035;
    pet.rotation.z+=Math.sin(phase*.83)*.014;
    pet.rotation.y+=Math.sin(phase*.63)*.020;
   }
   pet.visible=true;
  });
  fruits.forEach(({node,img,mesh},index)=>{
   const parent=node.closest('.rich-fg');
   const intro=!parent;
   if(intro?p<=.18||p>=.66:p<.46)return;
   if(parent&&(getComputedStyle(parent).visibility==='hidden'||(parent.classList.contains('rich-fg--peach')&&p>=.93)))return;
   const r=node.getBoundingClientRect();if(r.right<0||r.left>W)return;
   const front=node.dataset.depth==='front'||node.dataset.r11==='whole'||node.dataset.r11==='single';
   const z=front?.9:-.65,a=angle(node),height=slotSize(node,r,a);
   place(mesh,node,height,z);if(intro)mesh.position.x-=introExit*W*1.1*(2*(10-z)*Math.tan(38*Math.PI/360)/H);const units=2*(10-z)*Math.tan(38*Math.PI/360)/H;
   mesh.scale.set(node.offsetWidth/node.offsetHeight*height*units,height*units,1);mesh.rotation.z=-a;
   const c=getComputedStyle(img);if(c.transform!=='none'){const m=new DOMMatrixReadOnly(c.transform);mesh.scale.x*=m.a<0?-1:1;mesh.scale.y*=m.d<0?-1:1;}
   if(!reduce.matches){const phase=tide*.75+index*1.43;mesh.position.y+=Math.sin(phase)*.065;mesh.position.x+=Math.cos(phase*.71)*.025;mesh.rotation.z+=Math.sin(phase*.87)*.025;}
   mesh.material.side=THREE.DoubleSide;mesh.material.opacity=intro?Number(node.style.opacity||1)*(1-introExit):smooth(.49,.64,p);mesh.visible=true;mesh.renderOrder=front?2:0;
  });
  renderer.render(scene,camera);
  root.dataset.pet3d='ready';
 }
 function active(){return !document.hidden&&p>.18&&p<=1&&root.getBoundingClientRect().bottom>0&&root.getBoundingClientRect().top<innerHeight;}
 function loop(now){frame=0;if(!active())return;if(now-last>32){render();last=now;}if(!reduce.matches)frame=requestAnimationFrame(loop);}
 function update(progress){const moved=progress!==p;p=progress;if(!active()){renderer.clear();return;}if(moved||!frame){render();last=performance.now();}if(!frame&&!reduce.matches)frame=requestAnimationFrame(loop);}
 function defer(){if(frame)cancelAnimationFrame(frame);frame=0;}
 window.richPet3D={update,defer};
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else update(p);});
 window.addEventListener('resize',()=>{resize();update(p);},{passive:true});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(frame);frame=0;root.classList.remove('rich-pet-ready');});
 resize();update(p);
}
