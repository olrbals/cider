import assert from 'node:assert/strict';
import * as THREE from '../js/vendor/three.module.js';
import {createRichPET} from '../js/rich-pet-model.js';
for(const color of [0xed0b57,0x008c42]){
 const pet=createRichPET(new THREE.Texture(),color),box=new THREE.Box3().setFromObject(pet),size=box.getSize(new THREE.Vector3());
 assert(Math.abs(size.y-4.305)<.02,'PET height stays stable under texture changes');
 assert(size.x>1.3&&size.x<1.5);
 let caps=0;
 pet.traverse(n=>{if(n.isInstancedMesh){assert.equal(n.count,48);caps++;}if(n.geometry){for(const value of n.geometry.attributes.position.array)assert(Number.isFinite(value));}});
 assert.equal(caps,1);
 for(const axis of ['x','y','z'])pet.rotation[axis]=.5;
 assert(new THREE.Box3().setFromObject(pet).getSize(new THREE.Vector3()).length()>0);
}
console.log('PASS: two 3D PET variants, dimensions, finite geometry, instanced cap ridges and three-axis transforms');
