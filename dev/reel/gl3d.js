/* 쇼릴 — 3D 층: 사이트 aero 3D(a3d-stage · a3d-craft)를 그대로 써서 1920×1080 오프스크린 WebGL에 그림.
   투시(X-ray, 크림 가장자리광) · 금색 제작 부위는 web/js/a3d.js와 같은 재질. 모든 자세는 호출자가 f로 정함(시간 상태 없음).
   규칙: 기체는 공유 캐시(A350은 s2 · s6가 함께 씀) → 그릴 때마다 holder · rotor · xr · cam을 모두 새로 정한다. */
import * as THREE from 'three';
import {createStage} from '/web/js/a3d-stage.js';
import {build} from '/web/js/a3d-craft.js';
import {W,H} from './engine.js';
export {THREE};

const Q=new URLSearchParams(location.search);
export const NOGL=!!Q.get('nogl');   /* 검사: 3D 없이(팔레트 검사) */
let st=null,cv=null,blank=null;
const XR={res:{value:new THREE.Vector2(W,H)},mk:{value:new THREE.Vector4(-1,2,2,-1)}};   /* mk: 화면 가림 없음 */
export function stage(){
  if(st)return st;
  cv=document.createElement('canvas');cv.width=W;cv.height=H;
  st=createStage(cv,{dpr:1});st.resize(W,H);
  st.floor.visible=false;   /* 비행 장면이 많아 바닥 그림자는 기본으로 끔 */
  return st;
}
export const glCanvas=()=>cv;

const xray=()=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
  uniforms:{col:{value:new THREE.Color(0xC0B7AB)},op:{value:0},res:XR.res,mk:XR.mk},
  vertexShader:`varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`uniform vec3 col;uniform float op;uniform vec2 res;uniform vec4 mk;varying vec3 vN;varying vec3 vV;
    void main(){float f=1.-abs(dot(normalize(vN),normalize(vV)));vec2 q=gl_FragCoord.xy/res;
      float m=smoothstep(mk.x,mk.x+.07,q.x)*(1.-smoothstep(mk.y-.05,mk.y,q.x))*(1.-smoothstep(mk.z-.06,mk.z,q.y))*smoothstep(mk.w,mk.w+.06,q.y);
      float a=(pow(f,2.4)*.7+.03)*op*mix(.18,1.,m);gl_FragColor=vec4(col*a,a);}`});
const goldM=()=>{const m=new THREE.MeshPhysicalMaterial({color:0xC2A673,metalness:.55,roughness:.32,clearcoat:.5,emissive:0x8a7456,emissiveIntensity:.45,transparent:true,opacity:0,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance+=vec3(.95,.8,.55)*pow(1.-abs(dot(normalize(normal),normalize(vViewPosition))),3.)*.9;')};return m};

/* 항법등 구(초록 · 빨강 · 흰 MeshBasic 구)는 팔레트 밖 → 숨김 */
const NAV=new Set([0x3BE37A,0xFF3B3B,0xFFFFFF]);
const isNav=m=>m.geometry&&m.geometry.type==='SphereGeometry'&&m.material&&m.material.isMeshBasicMaterial&&NAV.has(m.material.color.getHex());

const M=new Map();
/* 기체 하나(캐시): {key,R,center,floorY,holder,group,parts,beats,rotor,xr(),anchor(k),beatR(k),rotorHub,rotorR} */
export function craft(key,id=key){
  if(M.has(id))return M.get(id);
  stage();
  const A=build(key);
  A.all.forEach(m=>{if(isNav(m)){m.visible=false;m.userData.nav=true}});
  const box=new THREE.Box3();A.group.traverse(o=>{if(o.isMesh&&!o.userData.nav)box.expandByObject(o)});
  const sph=box.getBoundingSphere(new THREE.Sphere());
  A.R=sph.radius;A.center=sph.center.clone();A.floorY=box.min.y-A.R*.28;A.box0=box.clone();A.key=key;
  A.group.position.sub(A.center);
  A.holder=new THREE.Group();A.holder.add(A.group);
  const partOf=new Map();Object.entries(A.parts||{}).forEach(([k,v])=>v.forEach(m=>partOf.set(m,k)));
  A.ghost=[];A.gold=[];
  const twin=(m,mat)=>{const t=new THREE.Mesh(m.geometry,mat);t.position.copy(m.position);t.rotation.copy(m.rotation);t.scale.copy(m.scale);m.parent.add(t);return t};
  A.all.forEach(m=>{if(m.userData.nav)return;const k=partOf.get(m);
    const x=m.userData.noXray?null:twin(m,xray());if(x)x.visible=false;A.ghost.push({m,x,k});
    if(k){const gm=twin(m,goldM());gm.visible=false;const n=new THREE.Vector3();const na=m.geometry.attributes.normal;
      if(m.userData.lift){for(let q=0;q<na.count;q+=7)n.x+=na.getX(q),n.y+=na.getY(q),n.z+=na.getZ(q);n.normalize()}
      A.gold.push({m:gm,k,o:m,p0:gm.position.clone(),n:m.userData.lift?n:null})}});
  /* g: 0 도장 ~ 1 투시, act: 금색 부위 키 · 배열 · '*', goldOp: 도장 상태에서도 금색 부위를 덧칠(g=0이어도 보이게), lift: 부위 들어올림(0~1) */
  A.xr=(g=0,act=null,{lift=0,pulse=0,dimOthers=.1,xrOp=1,goldOp=0}={})=>{
    const on=k=>act==='*'||(Array.isArray(act)?act.includes(k):k===act);
    A.ghost.forEach(({m,x,k})=>{m.visible=g<.98;if(x){x.visible=g>.01;x.material.uniforms.op.value=g*xrOp*(k&&on(k)?.35:1)}
      const tr=g>.01;if(m.material.transparent!==tr){m.material.transparent=tr;m.material.needsUpdate=true}m.material.opacity=1-g;m.castShadow=g<.5;m.material.depthWrite=g<.5});
    A.gold.forEach(({m,k,p0,n})=>{const o=on(k);const a=Math.max(g*(o?1:dimOthers),o?goldOp:0);m.visible=a>.004;m.material.opacity=a;m.material.depthWrite=o&&(g>.5||goldOp>.5);
      m.material.emissiveIntensity=o?.45+.1*pulse:.2;if(n)m.position.copy(p0).addScaledVector(n,o?.38*lift:0)});
  };
  A.xr(0);
  /* 부위 기준점(모델 좌표) · 부위 카메라 거리(a3d beatPose와 같은 식) */
  const beat=k=>A.beats.find(b=>b.k===k);
  A.anchor=k=>{const b=beat(k);if(!b)throw new Error(`no beat ${k} on ${key}`);const v=b.anchor?b.anchor:b.box[0].clone().add(b.box[1]).multiplyScalar(.5);return [v.x,v.y,v.z]};
  A.beatR=(k,fov=26)=>{const b=beat(k);const rad=b.box[0].distanceTo(b.box[1])/2;const tv=Math.tan(fov*Math.PI/360);const fovT=Math.min(tv,tv*(W/H)*.7);return rad*b.m/fovT};
  if(A.rotor){A.rotorHub=[A.rotor.position.x,A.rotor.position.y,A.rotor.position.z];const rb=new THREE.Box3().setFromObject(A.rotor);A.rotorR=Math.max(rb.max.x-rb.min.x,rb.max.z-rb.min.z)/2}
  M.set(id,A);return A;
}

/* 카메라 · 기체 배치(그리지 않음)
   shots: [{A, pos:[x,y,z], rot:[x,y,z](라디안, holder, 순서 YXZ), scale, rotor}]  cam: {yaw,el,r|dist,target,fov,lens:[sx,sy],roll,near,far} */
export function setCam(shots,cam,{floor=false,fitA=null}={}){
  const s=stage();
  while(s.pivot.children.length)s.pivot.remove(s.pivot.children[0]);
  for(const sh of shots){const A=sh.A;A.holder.position.set(...(sh.pos||[0,0,0]));A.holder.rotation.set(...(sh.rot||[0,0,0]),sh.order||'YXZ');const k=sh.scale||1;A.holder.scale.set(k,k,k);
    if(A.rotor)A.rotor.rotation.y=sh.rotor||0;s.pivot.add(A.holder)}
  const F=fitA||shots[0]?.A;if(F)s.fit(F.R,floor?F.floorY-F.center.y:-1e4);
  s.floor.visible=!!floor;
  s.cam.fov=cam.fov||26;s.cam.near=cam.near||.5;s.cam.far=cam.far||4000;
  s.lens(...(cam.lens||[0,0]));s.cam.updateProjectionMatrix();
  s.view({yaw:cam.yaw||0,el:cam.el??.2,dist:cam.dist??2.6,r:cam.r??null,target:cam.target||[0,0,0]},F?F.R:10);
  if(cam.roll)s.cam.rotateZ(cam.roll);
  s.scene.updateMatrixWorld(true);s.cam.updateMatrixWorld(true);
  return s;
}
/* 그리기 → WebGL 캔버스(알파). 곧바로 2D에 drawImage 해야 함 */
export function render(shots,cam,{exposure=1,floor=false,fitA=null}={}){
  if(NOGL){if(!blank){blank=document.createElement('canvas');blank.width=W;blank.height=H}return blank}
  const s=setCam(shots,cam,{floor,fitA});
  s.renderer.toneMappingExposure=exposure;
  s.render();
  if(window.__glmask)window.__glmask(cv);   /* 검사: 3D가 덮은 곳 누적 */
  return cv;
}
/* 3D 점 → 화면 좌표(마지막 setCam/render 기준) */
const _v=new THREE.Vector3();
export function project(A,local){_v.set(...local);A.group.localToWorld(_v);_v.project(st.cam);return [(_v.x*.5+.5)*W,(-_v.y*.5+.5)*H,_v.z]}
export function projectWorld(p){_v.set(...p);_v.project(st.cam);return [(_v.x*.5+.5)*W,(-_v.y*.5+.5)*H,_v.z]}
/* 렌즈 시프트 풀기: 모델 점 local이 화면 [X,Y]에 오도록 하는 lens [sx,sy](순수 — 원근은 그대로, 영상만 평행이동) */
export function solveLens(shots,cam,A,local,[X,Y],opt={}){setCam(shots,{...cam,lens:[0,0]},opt);const [px,py]=project(A,local);return [(X-px)/W,(Y-py)/H]}
/* 모델 평면 위 원(중심 local, 반지름 r)의 화면 반지름(px) — 마지막 setCam 기준 */
export function projR(A,local,r,plane='xz'){const [cx,cy]=project(A,local);let m=0;for(let i=0;i<16;i++){const a=i/16*Math.PI*2,p=[...local];
  if(plane==='xz'){p[0]+=r*Math.cos(a);p[2]+=r*Math.sin(a)}else if(plane==='xy'){p[0]+=r*Math.cos(a);p[1]+=r*Math.sin(a)}else{p[1]+=r*Math.cos(a);p[2]+=r*Math.sin(a)}
  const [x,y]=project(A,p);m=Math.max(m,Math.hypot(x-cx,y-cy))}return m}
/* 셰이더 미리 컴파일(오류를 일찍 드러냄) */
export async function warm(keys){for(const k of keys){const A=craft(k);A.xr(1,'*');render([{A}],{yaw:.7,el:.3});A.xr(0,'*',{goldOp:1});render([{A}],{yaw:.7,el:.3});A.xr(0)}}
