/* s2-lock 도우미 — 컷 표 · 기체별 카메라(부위 고정: 부위 기준점을 P*에) · 배경(s1과 같은 격자 · 웅덩이 · 가림막)
   컷은 반 프레임(179.5 · 194.5 · 254.5 · 269.5 · 284.5)에만. 모든 자세는 f만으로 정한다 */
import {C,E,W,H,seg,lerp,loglerp,rgba} from '../engine.js';
import {P} from '../shared.js';

export const CUT=[179.5,194.5,254.5,269.5,284.5],END=329.5;
export const KEY=['737','a320','a330','a350','ah6'];
export const cutOf=f=>{let i=0;for(let k=1;k<CUT.length;k++)if(f>=CUT[k])i=k;return i};
export const cutEnd=i=>i<CUT.length-1?CUT[i+1]:END;

/* ── 배경: 격자(60 · 240) · cblue 웅덩이 · 왼쪽 아래 가림막 — s1-world와 같은 값 ── */
export function bg(g,a=1){if(a<=0)return;g.save();g.fillStyle=C.cream;   /* s1-open bg()와 같은 순서 · 같은 식(컷에서 화소 동일) */
  g.globalAlpha=.05*a;for(let x=0;x<W;x+=60)g.fillRect(x,0,1,H);for(let y=0;y<H;y+=60)g.fillRect(0,y,W,1);
  g.globalAlpha=.09*a;for(let x=0;x<W;x+=240)g.fillRect(x,0,1,H);for(let y=0;y<H;y+=240)g.fillRect(0,y,W,1);
  g.globalAlpha=a;
  const rg=(x,y,r,col,a0)=>{const q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,rgba(col,a0));q.addColorStop(1,rgba(col,0));g.fillStyle=q;g.fillRect(0,0,W,H)};
  rg(1262,420,900,C.cblue,.35);rg(420,860,760,C.night,.55);g.restore()}

/* 모델 점 → 세계 좌표(holder 자세 반영) */
let V=null;
function world(GL,A,sh,local){V=V||new GL.THREE.Vector3();A.holder.position.set(...(sh.pos||[0,0,0]));A.holder.rotation.set(...(sh.rot||[0,0,0]),'YXZ');A.holder.scale.set(1,1,1);
  A.holder.updateMatrixWorld(true);V.set(...local);A.group.localToWorld(V);return [V.x,V.y,V.z]}

/* A350 벌크 도어 가운데(모델 좌표, 한 번): 비트 상자 가운데는 문보다 조금 안쪽 → 문 자체 상자 가운데를 P*에 */
let DC=null;
function doorC(GL,A){if(DC)return DC;const T=GL.THREE,o=A.gold.find(q=>q.k==='bcd').o;A.holder.updateMatrixWorld(true);
  const b=new T.Box3().setFromObject(o).applyMatrix4(new T.Matrix4().copy(A.group.matrixWorld).invert());return DC=b.getCenter(new T.Vector3()).toArray()}

/* AH-6: 끝 자세(329.5)에서 로터 원판이 화면 반지름 160px이 되는 거리(한 번 풀어 캐시) */
const AH={};
function ahPose(f){const sway=.03*Math.sin(Math.PI*2*f/90);return {rot:[0,sway,-.05],rotor:.35*f}}
function ahEnd(GL,A){if(AH.r)return AH;const f=END,p=ahPose(f),sh={A,rot:p.rot,rotor:p.rotor};const hub=A.rotorHub;
  const cam={yaw:2.45+.20,el:1.47,fov:26,target:world(GL,A,sh,hub)};let r=60;
  for(let k=0;k<6;k++){const s=[sh];const lens=GL.solveLens(s,{...cam,r},A,hub,[P.x,P.y]);GL.setCam(s,{...cam,r,lens});const R=GL.projR(A,hub,A.rotorR,'xz');r*=R/160}
  AH.r=r;return AH}

/* 한 표본의 3D 상태: {A, shots, cam(lens 포함), exposure, xr:[g,act,opt]} — 부르는 쪽이 xr → render 순서로 */
export function shot(GL,f){
  const i=cutOf(f),c=CUT[i],e=cutEnd(i),u=seg(f,c,e),A=GL.craft(KEY[i]);
  const punch=loglerp(1.07,1,E.snap(seg(f,c,c+5)));   /* 컷마다 거리 ×1.07→1 */
  let yaw,el,r,part,act,opt={goldOp:1},rot=[0,0,0],rotor=0,exposure=1,local;
  if(i===0){part='wl';act='wl';yaw=lerp(2.70,2.76,u);el=.10;r=A.beatR(part)*2.6*(1-.05*u)}
  else if(i===1){part='shk';act='shk';const s=.85*E.std(u)+.15*u;   /* 끝값은 같고 컷 직전까지 조금씩 흐름(정지 방지) */yaw=lerp(2.60,2.78,s);el=lerp(.18,.12,s);r=A.beatR(part)*loglerp(2.4,2.0,s)}
  else if(i===2){part='shk';act='shk';yaw=lerp(2.72,2.78,u);el=.16;r=A.beatR(part)*2.6*(1-.05*u)}
  else if(i===3){part='bcd';act=['fcd','acd','bcd'];yaw=lerp(3.70,3.76,u);el=.15;r=A.beatR(part)*3.25*(1-.05*u);local=doorC(GL,A)}   /* 뒤 왼쪽 3/4: 기수 · KOREAN · 엔진 · 꼬리 태극이 모두 화면 안, 문 ~50px(부위 금색 · 빛 종 post3d) */
  else{part='fus';act='fus';const p=ahPose(f);rot=p.rot;rotor=p.rotor;
    const s=E.std(seg(f,c,318));yaw=lerp(2.10,2.45,s);el=lerp(.18,.34,s);r=A.beatR(part)*loglerp(1.9,1.6,s);
    opt={goldOp:.25*E.std(seg(f,292,300))};   /* 올리브가 비쳐 보이는 금색 기운 */
    const k=E.ioCubic(seg(f,318,END));   /* 크레인: 마스트 위로 — 박자(330)에 내려앉음 */
    if(k>0){const end=ahEnd(GL,A);el=lerp(el,1.47,k);yaw+=.20*k;r=loglerp(r,end.r,k)}
    local=A.anchor(part).map((v,j)=>lerp(v,A.rotorHub[j],k));
    exposure=lerp(1,.3,seg(f,322,END))}   /* 329.5에 정확히 .3 */
  local=local||A.anchor(part);
  const sh={A,rot,rotor};const cam={yaw,el,r:r*punch,fov:26,target:world(GL,A,sh,local)};
  cam.lens=GL.solveLens([sh],cam,A,local,[P.x,P.y]);
  return {i,f,A,shots:[sh],cam,exposure,xr:[0,act,opt],local};
}

/* xr 다음 · render 직전 손질 → 되돌림 함수
   A350: 벌크 도어 빛 종 — 270–278에 자체발광 .45 → 1.18(274 무렵) → .70(금색이 흰 배 위에서 읽히게, 들림 없음)
   AH-6: 금색 덧칠에서 유리를 뺌(도장 텍스처의 어두운 창 띠 → 알파 지도) — 올리브 · 검은 유리가 그대로 읽히게 */
let GLASS=null;
export function post3d(GL,s){const A=s.A;
  if(s.i===3){const mt=A.gold.find(q=>q.k==='bcd').m.material,prev=mt.emissiveIntensity,t=seg(s.f,270,278);
    mt.emissiveIntensity=.45+.6*Math.sin(Math.PI*t)+.25*E.std(t);return ()=>{mt.emissiveIntensity=prev}}
  if(s.i!==4)return ()=>{};
  const q=A.gold.find(q=>q.k==='fus'),mt=q.m.material,prev=mt.alphaMap;
  mt.alphaMap=GLASS||(GLASS=glassMap(GL,A));mt.needsUpdate=true;
  return ()=>{mt.alphaMap=prev;mt.needsUpdate=true}}
function glassMap(GL,A){const im=A.parts.fus[0].material.map.image,w=im.width,h=im.height;
  const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0);
  const d=x.getImageData(0,0,w,h),a=d.data;
  for(let i=0;i<a.length;i+=4){const l=.2126*a[i]+.7152*a[i+1]+.0722*a[i+2],v=Math.round(255*Math.max(0,Math.min(1,(l-30)/30)));a[i]=a[i+1]=a[i+2]=v;a[i+3]=255}   /* 유리 #12181D(휘도 23) → 0, 올리브(95) → 1 */
  x.putImageData(d,0,0);return new GL.THREE.CanvasTexture(c)}
