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
const peachTeam=node(),grapeTeam=node(),collision=node(),collisionMask=node(),ice=Array.from({length:5},node);
const block2=src.slice(src.indexOf('  function updateCollision'),src.indexOf('  // Nonperiodic'));
const update=new Function('clamp','smooth','reduce','horizontalWave','peachTeam','grapeTeam','collision','collisionMask','ice',block2+';return updateCollision;')(clamp,smooth,{matches:false},wave,peachTeam,grapeTeam,collision,collisionMask,ice);
const snap=()=>JSON.stringify([peachTeam,grapeTeam,collisionMask,ice]);
const states=[];
for(let i=0;i<=1000;i++){update(i/1000);assert(!/NaN|Infinity/.test(snap()));states.push(snap());}
for(let i=1000;i>=0;i--){update(i/1000);assert.equal(snap(),states[i]);}
update(.27);assert(peachTeam.style.transform.includes('translate3d('));assert.equal(peachTeam.style.transform.split(',')[0],grapeTeam.style.transform.split(',')[0]);
update(.46);assert(ice.every(n=>Number(n.style.opacity)>.6));
assert(!src.includes('rich-impact-fluid'),'water stream renderer removed');
console.log('PASS: rightward entry shared by both bottles, reverse determinism, five settled ice objects, no streams');
