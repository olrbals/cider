const fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('js/liquid-gel-global.js','utf8');
const block=src.slice(src.indexOf('  function encodeGelBitmap'),src.indexOf('  // Optimize only RICH;'));
const encode=new Function(block+';return encodeGelBitmap')();
for(const [w,h] of [[1,1],[3,7],[180,101]]){
const rgba=Uint8Array.from({length:w*h*4},(_,i)=>(i*37)%256),uri=encode(rgba,w,h),buf=Buffer.from(uri.split(',')[1],'base64'),stride=(w*3+3)&~3;
assert.equal(buf.toString('ascii',0,2),'BM');assert.equal(buf.readInt32LE(22),-h);assert.equal(buf.length,54+stride*h);
for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let c=0;c<3;c++)assert.equal(buf[54+y*stride+x*3+c],rgba[(y*w+x)*4+2-c]);
}
assert(!src.includes('time - mapStamp >= 33 || strokes.length > 0'));
console.log('PASS lossless RGB, top-down rows, odd-width alignment, dimensions, strict RICH upload cadence');
let uploads=0,reads=0;const filterStates=[];
const w=3,h=3,pixels={data:new Uint8ClampedArray(w*h*4)},heights=new Float32Array(w*h);
for(let i=0;i<w*h;i++){pixels.data[i*4]=128;pixels.data[i*4+1]=128;pixels.data[i*4+2]=128;pixels.data[i*4+3]=255;}
const writeBlock=src.slice(src.indexOf('  function writeTexture'),src.indexOf('  function draw('));
const write=new Function('active','pixelData','heights','cols','rows','richTarget','ctx','surface','mapCanvas','encodeGelBitmap','setAmount','clamp','let richDistorted=false;'+writeBlock+';return writeTexture;')({classList:{toggle(name,value){filterStates.push(value);}}},pixels,heights,w,h,()=>true,{putImageData(){reads++;}},{setAttribute(){uploads++;}},{toDataURL(){throw Error('RICH must not read back canvas');}},encode,()=>{},(v,a,b)=>Math.max(a,Math.min(b,v)));
write(true);assert.equal(uploads,0,'neutral field bypasses filter/upload');write();assert.equal(uploads,0);heights[4]=.1;write();assert.equal(uploads,1,'ripple restores field upload');write();assert.equal(uploads,1,'unchanged ripple not uploaded');heights.fill(0);write();assert.equal(uploads,1,'neutral again bypasses upload');assert.equal(reads,0);
console.log('PASS RICH skips duplicate fields and never reads canvas for PNG');

assert.deepEqual(filterStates,[false,false,true,true,false], 'filter must stay on for unchanged non-neutral ripple and off only when neutral');
