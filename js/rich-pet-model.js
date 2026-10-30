// PET profile and sleeve UV adapted from the user's cider-3d-test.zip.
import * as THREE from './vendor/three.module.js';
const profile=[

      
      [0.05, -1.96],
      [0.20, -1.99],
      [0.38, -2.02],
      [0.50, -1.99],
      [0.59, -1.94],
      [0.64, -1.88],
      [0.67, -1.79],

      
      [0.67, -1.73],
      [0.65, -1.68],
      [0.67, -1.62],
      [0.67, -1.56],
      [0.65, -1.51],
      [0.67, -1.45],

      
      [0.67, -1.26],
      [0.675, -0.95],
      [0.675, -0.30],
      [0.675, 0.35],
      [0.675, 0.85],

      
      [0.665, 1.02],
      [0.645, 1.13],
      [0.610, 1.24],
      [0.555, 1.36],
      [0.475, 1.47],
      [0.375, 1.57],
      [0.285, 1.68],

      
      [0.255, 1.73],
      [0.255, 1.84],
      [0.255, 1.95],
      [0.258, 2.02]

    ];
export function createRichPET(texture,capColor){
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);body.position.y=-.1325;
 const points=profile.map(([r,y])=>new THREE.Vector2(r,y));
 const plastic=new THREE.MeshPhysicalMaterial({color:0xe7f5ef,roughness:.19,clearcoat:.7,transparent:true,opacity:.48,depthWrite:false});
 body.add(new THREE.Mesh(new THREE.LatheGeometry(points,48),plastic));
 const sleevePoints=profile.filter(([,y])=>y>=-1.88&&y<=1.57).map(([r,y])=>new THREE.Vector2(r+.012,y));
 const geometry=new THREE.LatheGeometry(sleevePoints,64);
 const pos=geometry.attributes.position,uv=geometry.attributes.uv;
 for(let i=0;i<pos.count;i++)uv.setY(i,THREE.MathUtils.clamp((pos.getY(i)+1.88)/3.45,0,1));
 const sleeve=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:texture,roughness:.45,metalness:0}));
 sleeve.rotation.y=Math.PI;body.add(sleeve);
 const capMat=new THREE.MeshStandardMaterial({color:capColor,roughness:.3});
 const cap=new THREE.Mesh(new THREE.CylinderGeometry(.295,.295,.27,48),capMat);cap.position.y=2.15;body.add(cap);
 const ridges=new THREE.InstancedMesh(new THREE.BoxGeometry(.014,.19,.025),capMat,48),dummy=new THREE.Object3D();
 for(let i=0;i<48;i++){const a=i/48*Math.PI*2;dummy.position.set(Math.sin(a)*.296,2.15,Math.cos(a)*.296);dummy.rotation.y=a;dummy.updateMatrix();ridges.setMatrixAt(i,dummy.matrix);}body.add(ridges);
 const ring=new THREE.Mesh(new THREE.CylinderGeometry(.307,.307,.095,48),capMat);ring.position.y=1.97;body.add(ring);
 const neckMat=new THREE.MeshPhysicalMaterial({color:0xe0ece7,roughness:.25,clearcoat:.65,transparent:true,opacity:.88});
 const neck=new THREE.Mesh(new THREE.CylinderGeometry(.255,.255,.43,32),neckMat);neck.position.y=1.80;body.add(neck);
 const base=new THREE.Mesh(new THREE.CircleGeometry(.59,48),plastic);base.rotation.x=Math.PI/2;base.position.y=-1.94;body.add(base);
 return root;
}
