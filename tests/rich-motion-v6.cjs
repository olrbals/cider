const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=fs.readFileSync('js/rich-flavors.js','utf8');
const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=(a,b,p)=>{let t=clamp((p-a)/(b-a));return t*t*(3-2*t);};
const block=src.slice(src.indexOf('  function horizontalWave'),src.indexOf('  function updateFlavor'));
const wave=new Function('smooth',block+';return horizontalWave;')(smooth);
for(let seed=0;seed<2;seed++){
 const samples=Array.from({length:1001},(_,i)=>wave(i/1000,seed));
 for(let i=1000;i>=0;i--){
  assert.deepEqual(wave(i/1000,seed),samples[i],'reverse must restore identical geometry');
  assert(!/NaN|Infinity|undefined/.test(samples[i].mask));
 }
 assert(samples[0].mask.includes('1040'));
 assert(samples[1000].mask.includes('-40'));
}
assert(!/popProgress|setTimeout|setInterval|performance.now/.test(src),'no wall clock choreography');
assert.equal((src.match(/addEventListener\('scroll'/g)||[]).length,1);
console.log('PASS: 2002 finite wave states, reverse determinism, full coverage endpoints, one scroll listener, no timed burst');



const node=()=>({style:{setProperty(k,v){this[k]=v}},attrs:{},setAttribute(k,v){this.attrs[k]=v}});
const root={classList:{toggle(){}}},collision=node();
const introSlots=JSON.parse(src.match(/const introSlots=(\[.*\]);/)[1]).map(s=>({...s,node:node()}));
const depthSlots=Array.from({length:3},node);
const depthGeometry=new Function('return '+src.match(/const depthGeometry=(\[.*\]);/)[1])();
const block2=src.slice(src.indexOf('  function updateCollision'),src.indexOf('  // Nonperiodic'));
const update=new Function('clamp','smooth','reduce','root','collision','introSlots','depthSlots','depthGeometry',block2+';return updateCollision;')(clamp,smooth,{matches:false},root,collision,introSlots,depthSlots,depthGeometry);
const snap=()=>JSON.stringify([collision,introSlots,depthSlots]);
const states=[];
for(let i=0;i<=1000;i++){update(i/1000);assert(!/NaN|Infinity/.test(snap()));states.push(snap());}
for(let i=1000;i>=0;i--){update(i/1000);assert.equal(snap(),states[i]);}
update(.20);assert(parseFloat(introSlots[1].node.style.left)<introSlots[1].pre[0]);assert(parseFloat(introSlots[4].node.style.left)>introSlots[4].pre[0]);
update(.285);assert.equal(Number(collision.style['--r11-ink']),0);assert(depthSlots.every(n=>Number(n.style.opacity)===0));
update(.48);assert.equal(Number(collision.style['--r11-ink']),1);assert(depthSlots.every(n=>Number(n.style.opacity)>.25 && Number(n.style.opacity)<.4));
assert(!src.includes('v5-ice-cube')&&!src.includes('rich-impact-fluid'));
console.log('PASS: opposed entry, meet precedes color/foreground bloom, Figma settled states, exact reverse replay, finite depth transforms');

assert.equal((wave(.45,0).mask.match(/ Q/g)||[]).length,7,"seven separately led rounded tongues");
const petSource=fs.readFileSync("js/rich-pet-3d.js","utf8");
assert(!/pet\.position\.x.*(?:leave|smooth\(\.965)/.test(petSource),"final grape turns in place while the next wave covers it");
