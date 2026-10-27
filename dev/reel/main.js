/* 쇼릴 — 부팅 · 외부 API(window.reel) · 미리보기 조작
   ?f=프레임 : 그 프레임 정지 · ?play=1 : 실시간 재생(미리보기용, 결정적 렌더와 무관) · ?lang=en : 영문 · ?samples=8 : 미리보기에서 블러 */
import {W,H,N,FPS,LANG,setup,renderAt,scenes,loadFonts,loadImages} from './engine.js';
import {makeAcc} from './acc.js';
import {blurAt} from './blur.js';
import * as GL from './gl3d.js';
import {S} from './strings.js';
import {loadScenes} from './scenes/index.js';

const q=new URLSearchParams(location.search);
const cv2=document.createElement('canvas');const g=setup(cv2);
const out=document.getElementById('out');out.width=W;out.height=H;
const acc=makeAcc(out,W,H,{linear:q.get('blend')!=='gamma'});   /* ?blend=gamma: 감마 공간 평균(비교용) */
const env={GL,S:S[LANG],LANG,g};

/* 한 프레임: samples장을 셔터(프레임 비율) 안에서 고르게 뽑아 선형광 평균 */
function frame(f,{samples=1,shutter=.5,seed=0,dith=1}={}){
  if(samples==='auto'){const b=blurAt(f);samples=b.n;shutter=b.shutter}   /* 스토리보드 표(blur.js) */
  acc.clear();
  for(let k=0;k<samples;k++){const t=samples>1?f+((k+.5)/samples-.5)*shutter:f;renderAt(t,env);acc.add(cv2,1/samples)}
  acc.out(seed,dith);
}
window.reel={W,H,N,FPS,LANG,ready:false,frame,env,
  /* 원시 RGBA 읽기(드라이버가 쓸 수 있게) */
  pixels(){const gl=out.getContext('webgl2');const a=new Uint8Array(W*H*4);gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,a);return a},
  /* 검사: 한 프레임의 글 상자 목록(표본 1) */
  boxes(f){window.__boxes=[];frame(f);const b=window.__boxes;window.__boxes=null;return b},
  /* 검사: 3D가 덮은 곳(알파) 축소판 base64 — 표본 1 */
  glMask(f,w=480){const h=Math.round(w*H/W);const m=document.createElement('canvas');m.width=w;m.height=h;const x=m.getContext('2d',{willReadFrequently:true});
    window.__glmask=c=>x.drawImage(c,0,0,w,h);frame(f);window.__glmask=null;const d=x.getImageData(0,0,w,h).data;const a=new Uint8Array(w*h);for(let i=0;i<a.length;i++)a[i]=d[i*4+3];
    let s='';const CH=0x8000;for(let i=0;i<a.length;i+=CH)s+=String.fromCharCode.apply(null,a.subarray(i,i+CH));return btoa(s)},
  /* 분석용 작은 그림(표본 1): RGBA base64 */
  thumb(f,w=480){frame(f);const h=Math.round(w*H/W);const c=thumbC||(thumbC=Object.assign(document.createElement('canvas'),{width:w,height:h}));const x=c.getContext('2d',{willReadFrequently:true});
    x.drawImage(out,0,0,w,h);const d=x.getImageData(0,0,w,h).data;let s='';const CH=0x8000;for(let i=0;i<d.length;i+=CH)s+=String.fromCharCode.apply(null,d.subarray(i,i+CH));return btoa(s)}};
let thumbC=null;

(async()=>{
  await loadScenes(q.get('only')?q.get('only').split(','):null);window.reel.sceneErrors=window.__sceneErrors||[];
  await loadFonts();
  for(const s of scenes())if(s.init)await s.init(env);
  await loadImages();
  for(const s of scenes())if(s.ready)await s.ready(env);
  window.reel.ready=true;
  const f0=+(q.get('f')||0),ns=q.get('samples')==='auto'?'auto':+(q.get('samples')||1);
  frame(f0,{samples:ns});
  if(q.get('play')){let t0=performance.now();const tick=now=>{const f=((now-t0)/1000*FPS)%N;frame(f,{samples:ns});hud(f);requestAnimationFrame(tick)};requestAnimationFrame(tick)}
  else hud(f0);
  /* 키보드: ← → 1프레임, Shift 10프레임 */
  let cur=f0;addEventListener('keydown',e=>{const d=(e.shiftKey?10:1)*(e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0);if(!d)return;cur=((cur+d)%N+N)%N;frame(cur,{samples:ns});hud(cur)});
})().catch(e=>{console.error(e);window.reel.error=String(e&&e.stack||e)});
function hud(f){const h=document.getElementById('hud');if(h)h.textContent=`f ${Math.floor(f)} · ${(f/FPS).toFixed(2)}s · ${LANG}`}
