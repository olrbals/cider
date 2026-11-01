const assert=require('node:assert/strict');
const fs=require('node:fs');
const bubbles=fs.readFileSync('js/rich-carbonation.js','utf8');
const rich=fs.readFileSync('js/rich-flavors.js','utf8');
const gel=fs.readFileSync('js/liquid-gel-global.js','utf8');

assert.equal((bubbles.match(/createElement\('canvas'\)/g)||[]).length,2,
  'one display canvas plus one cached sprite canvas');
assert(!/WebGL|THREE|setInterval/.test(bubbles),'RICH carbonation stays on one Canvas 2D RAF loop');
assert(bubbles.includes('seededRandom(0x13c1de)'),'collision layout uses a stable seed');
assert(bubbles.includes("(progress-.315)/.17"),'collision playback is derived from scroll progress');
assert(bubbles.includes("1000/30"),'detail rendering is capped at 30fps');
assert(bubbles.includes("devicePixelRatio || 1, lowPower ? 1 : 1.25"),
  'DPR is capped for desktop and low-power devices');
assert(rich.includes('window.richCarbonation?.update(progress)'),'existing RICH playhead owns bubble progress');
assert(rich.includes("progress>=.29"),'RICH exposes the refraction cutoff at collision entry');
assert(gel.includes('richRefractionEnd = .29'),'global gel keeps the cutoff local to RICH');
assert(gel.includes('active && !richPaused'),'paused RICH cannot schedule gel simulation');
console.log('PASS: deterministic collision bubbles, one capped detail loop, DPR/reduced-work guards, RICH-only refraction cutoff');
