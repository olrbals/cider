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

const node=()=>({style:{setProperty(k,v){this[k]=v}},attrs:{},setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]}});
const peachTeam=node(),grapeTeam=node(),collision=node(),water=node(),frontWater=node();
const jets=Array.from({length:8},node),ice=Array.from({length:5},node);
const frontJets=[{node:node(),index:1}],droplets=Array.from({length:22},(_,i)=>({node:node(),angle:i,reach:200,delay:.02}));
const collisionBlock=src.slice(src.indexOf('  function updateCollision'),src.indexOf('  // Nonperiodic'));
const update=new Function('clamp','smooth','reduce','peachTeam','grapeTeam','collision','water','frontWater','jets','frontJets','droplets','ice',collisionBlock+';return updateCollision;')(clamp,smooth,{matches:false},peachTeam,grapeTeam,collision,water,frontWater,jets,frontJets,droplets,ice);
const snapshot=()=>JSON.stringify([peachTeam,grapeTeam,water,jets,ice,droplets]);
const states=[];
for(let i=0;i<=1000;i++){update(i/1000);assert(!/NaN|Infinity/.test(snapshot()));states.push(snapshot());}
for(let i=1000;i>=0;i--){update(i/1000);assert.equal(snapshot(),states[i]);}
update(.30);assert(ice.every(n=>Number(n.style.opacity)===0));
update(.46);assert(ice.every(n=>Number(n.style.opacity)===0));assert.equal(Number(water.style.opacity),0);
console.log('PASS: collision forward/reverse exact states; ice hidden before contact and after settling; finite trajectories');
