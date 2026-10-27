/* 쇼릴 s6-vision 보조 — 비전 투시 기체의 모습(이 장면에서만, 그린 뒤 A.xr(0)으로 모두 되돌림)
   1) 얇은 면(수직 · 수평 꼬리) 투시 빛 보강: 판이 얇아 가장자리광이 거의 없음 → 그 쌍둥이 재질의 op만 올림
   2) 금색 카고 도어 맥동: 자체발광을 직접(엔진 pulse는 +.1뿐)
   3) 크림 채움: 가장 앞 면만(깊이 · 섞지 않음) 한 번 그려 기체 모양이 읽히게 — 바탕 + 가장자리광 + 위에서 비친 빛
   모든 값은 f(실수)만으로 정해진다 */
import {C} from '../engine.js';

/* 얇은 면 찾기(한 번): 수직 꼬리 = 기체 모둠에 바로 붙은 메시 중 가장 높은 것, 수평 꼬리 = 그 앞 두 메시(a3d-craft 조립 순서) */
let THIN=null;
function thin(A){if(THIN&&THIN.A===A)return THIN.q;const G=A.ghost;let iv=-1,my=-1e9;
  G.forEach((q,i)=>{if(!q.x||q.m.parent!==A.group)return;const g=q.m.geometry;if(!g.boundingBox)g.computeBoundingBox();if(g.boundingBox.max.y>my){my=g.boundingBox.max.y;iv=i}});
  const ht=iv>=2&&G[iv-1].m.material===G[iv-2].m.material?[G[iv-1],G[iv-2]]:[];
  const bf=G.filter(q=>q.x&&q.m.parent===A.group&&q.m.geometry.type==='SphereGeometry');   /* 벨리 페어링(타원체) */
  const zx=q=>{const b=q.m.geometry.boundingBox;return b?b.max.z-b.min.z:0},wg=G.filter(q=>q.x&&q.m.parent===A.group).sort((a,b)=>zx(b)-zx(a)).slice(0,2);   /* 주날개 두 쪽(폭이 가장 넓은 메시) */
  THIN={A,q:{fin:[G[iv]].filter(v=>v&&v.x),ht:ht.filter(v=>v.x),bf,wg}};return THIN.q}
/* A.xr 뒤에 부름: 수직 꼬리 op ×tb · 수평 꼬리 ×th(비스듬히 보여 이미 밝음 — 올리면 흰색으로 넘침)
   · 벨리 페어링 ×tf · 주날개 ×tw(둘 다 날개 뿌리에서 동체 가장자리광과 겹쳐 흰색으로 넘치고 금색 도어보다 눈에 띔) · 켠 금색 부위 자체발광 ei */
export function xrTune(A,act,{tb=1,th=1,tf=1,tw=1,ei=null}={}){const T=thin(A);
  if(tf!==1)T.bf.forEach(q=>{q.x.material.uniforms.op.value*=tf});
  if(tw!==1)T.wg.forEach(q=>{q.x.material.uniforms.op.value*=tw});
  if(tb!==1)T.fin.forEach(q=>{q.x.material.uniforms.op.value*=tb});
  if(th!==1)T.ht.forEach(q=>{q.x.material.uniforms.op.value*=th});
  if(ei!=null)A.gold.forEach(q=>{if(act.includes(q.k))q.m.material.emissiveIntensity=ei})}

/* 채움 재질: 앞 면 하나만(깊이 씀 · 섞지 않음 → 겹쳐도 더해지지 않음). 색은 sRGB 크림 그대로(ShaderMaterial은 색 공간 변환 없음) */
let FM=null;
function fillMat(T){if(FM)return FM;const c=parseInt(C.cream.slice(1),16);
  FM=new T.ShaderMaterial({side:T.DoubleSide,blending:T.NoBlending,transparent:false,depthWrite:true,depthTest:true,
    uniforms:{col:{value:new T.Vector3((c>>16&255)/255,(c>>8&255)/255,(c&255)/255)},k:{value:new T.Vector4(.03,.12,.05,1)}},
    vertexShader:`varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform vec3 col;uniform vec4 k;varying vec3 vN;varying vec3 vV;
      void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float c=abs(dot(n,normalize(vV)));
        float a=clamp((k.x+k.y*pow(1.-c,2.)+k.z*max(n.y,0.))*k.w,0.,1.);gl_FragColor=vec4(col*a,a);}`});
  return FM}
/* 채움 한 장을 L(2D)에 알파 fa로 — 투시 쌍둥이 모양만(도장 · 금색 · 나셀 속은 끔), 그린 뒤 보이기 되돌림.
   k: [바탕, 가장자리광, 위 빛, 배율] */
export function fillPass(GL,A,sh,cam,L,fa,k){if(fa<=.002)return;const T=GL.THREE,st=GL.stage(),M=fillMat(T);
  const vis=A.ghost.map(q=>[q.m.visible,q.x?q.x.visible:false]),gv=A.gold.map(q=>q.m.visible);
  A.ghost.forEach(q=>{q.m.visible=false;if(q.x)q.x.visible=true});A.gold.forEach(q=>{q.m.visible=false});
  M.uniforms.k.value.set(...k);st.scene.overrideMaterial=M;
  try{const cv=GL.render(sh,cam,{exposure:1});L.save();L.globalAlpha=fa;L.drawImage(cv,0,0);L.restore()}
  finally{st.scene.overrideMaterial=null;A.ghost.forEach((q,i)=>{q.m.visible=vis[i][0];if(q.x)q.x.visible=vis[i][1]});A.gold.forEach((q,i)=>{q.m.visible=gv[i]})}}
