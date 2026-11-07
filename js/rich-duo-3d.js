/* RICH duo · real 3D PET bottles (user's Blender PET profile + wrapped
 * label, js/rich-pet-model.js) replacing the flat PNGs. Position, size and
 * tilt follow the existing slots driven by rich-flavors.js; the bottles spin
 * on their own axis as they are swept in (node.richSpin, radians, 0 = label
 * front). Falls back to the PNGs if WebGL is unavailable.
 */
import * as THREE from './vendor/three.module.js';
import { createRichPET } from './rich-pet-model.js';

const root = document.querySelector('#rich-flavors');
const duo = root?.querySelector('.rich-duo');
const slots = ['peach', 'grape'].map(k => duo?.querySelector('[data-rich-slot="' + k + '"]'));
if (root && duo && slots.every(Boolean)) boot().catch(e => console.warn('RICH duo 3D fallback:', e));

async function boot() {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'default' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  const canvas = renderer.domElement;
  canvas.className = 'rich-duo-3d';
  canvas.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
  camera.position.z = 10;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb2cbbb, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 2.3); key.position.set(-4, 5, 7); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.2); rim.position.set(4, 2, -3); scene.add(rim);

  const loader = new THREE.TextureLoader();
  const textures = await Promise.all(['peach', 'grape'].map(f => loader.loadAsync('img/flavors/pet3d-' + f + '-label.webp').then(t => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    return t;
  })));
  const pets = [createRichPET(textures[0], 0xed0b57), createRichPET(textures[1], 0x008c42)];
  pets.forEach(p => { p.rotation.order = 'ZXY'; scene.add(p); });

  duo.append(canvas);
  duo.classList.add('rich-duo-3d-ready');

  let W = 0, H = 0, raf = 0, last = '';
  function resize() {
    W = duo.clientWidth; H = duo.clientHeight;
    camera.aspect = W / Math.max(1, H); camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
    renderer.setSize(W, H, false);
    last = '';
  }
  const visibleH = 2 * 10 * Math.tan(38 * Math.PI / 360);
  function frame() {
    raf = 0;
    if (duo.style.visibility !== 'visible') return;          // sleeps until shown again
    { const r = root.getBoundingClientRect(); if (r.bottom <= 0 || r.top >= innerHeight) return; }   // off screen (e.g. footer) → sleep
    if (W !== duo.clientWidth || H !== duo.clientHeight) resize();
    const v = duo.getBoundingClientRect();
    const units = visibleH / Math.max(1, H);
    const scale = parseFloat(getComputedStyle(root).getPropertyValue('--rich-duo-scale')) || 1;
    const pop = parseFloat(duo.style.getPropertyValue('--rich-pop')) || 0;
    let key = '';
    slots.forEach((node, i) => {
      const r = node.getBoundingClientRect();
      const pet = pets[i];
      // Same visual size as the PNG (530px slot × .792, with the tap pop).
      const height = node.offsetHeight * scale * .792 * (1 + .07 * pop);
      pet.position.set((r.left + r.width / 2 - v.left - W / 2) * units, (H / 2 - (r.top + r.height / 2 - v.top)) * units, 0);
      pet.scale.setScalar(height * units / 4.305);
      // Afloat: slow bob and a lazy sway around the axis, always on.
      const tt = performance.now() / 1000 + i * 1.7;
      pet.position.y += Math.sin(tt * 1.3) * .045;
      pet.rotation.z = -(node.richAngle || 0) * Math.PI / 180 + Math.sin(tt * .9) * .03;
      pet.rotation.y = (node.richSpin || 0) + Math.sin(tt * .8) * .16;
      key += pet.position.x.toFixed(3) + pet.position.y.toFixed(3) + pet.scale.x.toFixed(4) + pet.rotation.z.toFixed(3) + pet.rotation.y.toFixed(3);
    });
    if (key !== last) { last = key; renderer.render(scene, camera); }
    raf = requestAnimationFrame(frame);
  }
  const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };
  new MutationObserver(wake).observe(duo, { attributes: true, attributeFilter: ['style'] });
  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', () => { resize(); wake(); }, { passive: true });
  resize(); wake();
}
