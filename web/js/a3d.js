/* 항공기체 세부 페이지 — 기종별 3D 쇼케이스(스크롤 연동)
   화면을 고정한 채 스크롤하면 기종마다
   ① 등장(불이 켜짐) → ② 턴테이블 한 바퀴(앞쪽 3/4에서 시작해 같은 자리에서 멈춤, 기체 회전 · 카메라 방위 고정, 고도 +0.17rad · 거리 −4%로 움직였다 복귀)
   → ③ 제작 부위마다 카메라가 다가감(기체는 멈춤) · 나머지 기체는 투시(X-ray)로, 부위는 금색 · 설명선 하나씩 → ④ 다음 기종
   글(기종 · 제작 부위)은 HTML(#a3d .a3-ch)에 있고, 이 스크립트는 그 순서대로 기체를 만들어 보여 줌.
   참고: Apple 제품 페이지(한 캔버스 · 자세 전환) · DJI(부위 옆 설명) · Archer(방위 눈금) */
import * as THREE from 'three';
import {createStage} from './a3d-stage.js?v=refactor-d1';
import {build} from './a3d-craft.js?v=refactor-d1';

const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),lerp=(a,b,t)=>a+(b-a)*t,seg=(t,a,b)=>clamp((t-a)/(b-a));
const eio=k=>k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2,eo=k=>1-Math.pow(1-k,3),sio=k=>.5-.5*Math.cos(Math.PI*k);
const TAU=Math.PI*2,R2D=180/Math.PI;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
/* 한 기종의 장면 길이: 등장 .3 · 회전 1.6 · 부위마다 1.0 · 마무리 .4. 실제 거리는 부위 감속분을 더함. */
const ARR=.3,SPIN=1.6,PART=1.0,EXIT=.4;

const sec=document.getElementById('a3d');
if(sec)init();

function init(){
  const stageEl=sec.querySelector('.a3-stage'),cv=sec.querySelector('canvas'),co=sec.querySelector('.a3-co');
  const chs=[...sec.querySelectorAll('.a3-ch')],rail=[...sec.querySelectorAll('.a3-rail a')],bar=sec.querySelector('.a3-prog i');
  const hdg=sec.querySelector('.a3-hdg'),hdgV=hdg&&hdg.querySelector('b'),tape=hdg&&hdg.querySelector('.tp');
  const N=chs.length;
  let st;
  if(sec.classList.contains('a3-nogl'))return;
  try{st=createStage(cv)}catch(e){sec.classList.add('a3-nogl');return}
  const gl=st.renderer.getContext();
  sec.classList.remove('a3-nogl');sec.classList.add('a3-gl');

  /* 투시 재질: 가장자리만 밝게(브랜드 크림) — 왼쪽 글 기둥 · 오른쪽 기종 목록 위(모바일은 위 글 · 아래 목록)에서는 옅게 · 제작 부위: 같은 형상 위에 금색 */
  const XR={res:{value:new THREE.Vector2(1,1)},mk:{value:new THREE.Vector4(0,1,1,0)}};
  const xray=()=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    uniforms:{col:{value:new THREE.Color(0xC0B7AB)},op:{value:0},res:XR.res,mk:XR.mk},
    vertexShader:`varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform vec3 col;uniform float op;uniform vec2 res;uniform vec4 mk;varying vec3 vN;varying vec3 vV;
      void main(){float f=1.-abs(dot(normalize(vN),normalize(vV)));vec2 q=gl_FragCoord.xy/res;
        float m=smoothstep(mk.x,mk.x+.07,q.x)*(1.-smoothstep(mk.y-.05,mk.y,q.x))*(1.-smoothstep(mk.z-.06,mk.z,q.y))*smoothstep(mk.w,mk.w+.06,q.y);
        float a=(pow(f,2.4)*.7+.03)*op*mix(.18,1.,m);gl_FragColor=vec4(col*a,a);}`});
  const goldM=()=>{const m=new THREE.MeshPhysicalMaterial({color:0xC2A673,metalness:.55,roughness:.32,clearcoat:.5,emissive:0x8a7456,emissiveIntensity:.45,transparent:true,opacity:0,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
    m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance+=vec3(.95,.8,.55)*pow(1.-abs(dot(normalize(normal),normalize(vViewPosition))),3.)*.9;')};return m};

  /* 기종별 길이 · 누적 */
  const K=chs.map(c=>Math.max(1,c.querySelectorAll('.pl li').length));
  const Wt=K.map(k=>ARR+SPIN+k*PART+EXIT),C=[0];Wt.forEach(w=>C.push(C[C.length-1]+w));const TOT=C[N];
  /* 이름표가 나타난 부위 후반만 감속. 접근·회전·퇴장은 원래 속도로 이어짐. */
  const slowZones=K.flatMap((k,i)=>Array.from({length:k},(_,j)=>{const q=C[i]+ARR+SPIN+j*PART;return {from:q+.55*PART,to:q+.98*PART,extra:.6}}));
  const easeDistance=t=>t*t*t*(10+t*(-15+6*t));
  const distanceAt=q=>q+slowZones.reduce((n,s)=>n+s.extra*easeDistance(seg(q,s.from,s.to)),0);
  const DIST=distanceAt(TOT);
  function sceneAt(d){if(d<=slowZones[0].from)return d;if(d>=DIST)return TOT;
    let a=0,b=TOT;for(let j=0;j<30;j++){const m=(a+b)/2;if(distanceAt(m)<d)a=m;else b=m}return (a+b)/2}

  const models=new Map();
  function get(i){
    if(models.has(i))return models.get(i);
    const A=build(chs[i].dataset.k);A.font=fontOK();
    const box=new THREE.Box3().setFromObject(A.group),sph=box.getBoundingSphere(new THREE.Sphere());
    A.R=sph.radius;A.center=sph.center.clone();A.floorY=box.min.y-A.R*.28;A.box0=box.clone();A.key=chs[i].dataset.k;
    A.group.position.sub(A.center);                                    /* 회전 중심 = 기체 중심 */
    A.holder=new THREE.Group();A.holder.add(A.group);
    const partOf=new Map();Object.entries(A.parts).forEach(([k,v])=>v.forEach(m=>partOf.set(m,k)));
    A.ghost=[];A.gold=[];
    const twin=(m,mat)=>{const t=new THREE.Mesh(m.geometry,mat);t.position.copy(m.position);t.rotation.copy(m.rotation);t.scale.copy(m.scale);m.parent.add(t);return t};
    A.all.forEach(m=>{const k=partOf.get(m);
      const x=m.userData.noXray?null:twin(m,xray());if(x)x.visible=false;A.ghost.push({m,x,k});
      if(k){const gm=twin(m,goldM());const n=new THREE.Vector3();const na=m.geometry.attributes.normal;
        if(m.userData.lift){for(let q=0;q<na.count;q+=7)n.x+=na.getX(q),n.y+=na.getY(q),n.z+=na.getZ(q);n.normalize()}
        A.gold.push({m:gm,k,o:m,p0:gm.position.clone(),n:m.userData.lift?n:null})}});
    /* 첫 진입 때 멈칫하지 않게 셰이더를 미리 컴파일 */
    if(st.renderer.compileAsync&&!gl.isContextLost())A.cp=st.renderer.compileAsync(A.holder,st.cam,st.scene).catch(()=>{});   /* 컨텍스트를 잃은 동안은 건너뜀(되찾으면 새로 만듦) */
    A.tex=texOf(A.holder);A.q=[...A.tex];A.pre=!settled();              /* 미리 만들 때는 텍스처를 한 장씩 나중에 올림(pre) · 보이는 기체는 그린 뒤에(frame) · 글꼴 전에 만든 기체는 원본처럼 캔버스를 둠(A.pre) */
    models.set(i,A);return A;
  }

  /* 설명선(점 · 꺾인 선 · 번호 · 이름) — 지금 설명 중인 부위 하나만 */
  const coEls=chs.map(ch=>[...ch.querySelectorAll('.pl li')].map((li,j)=>{const e=document.createElement('div');e.className='a3-c';
    e.innerHTML=`<i class="dt"></i><b class="ln"></b><span><i>${String(j+1).padStart(2,'0')}</i>${(li.querySelector('span')||li).textContent.trim()}</span>`;e.dataset.p=li.dataset.p;co.appendChild(e);return e}));

  let W=1,H=1;const narrow=matchMedia('(max-width:900px)');
  /* 섹션 높이는 무대(100svh) 높이로 — 모바일 주소창이 접혀도 같은 스크롤 위치가 다른 기종으로 바뀌지 않게 */
  const resetW=()=>coEls.forEach(l=>l.forEach(e=>{e._w=0;e._nw=0}));document.fonts&&document.fonts.ready.then(resetW);   /* 이름표 폭은 글꼴 · 창 크기가 바뀌면 다시 잼 */
  const resize=()=>{resetW();const r=stageEl.getBoundingClientRect();W=Math.max(1,r.width);H=Math.max(1,r.height);st.resize(W,H);st.lens(narrow.matches?0:.1,narrow.matches?.07:.02);
    sec.style.height=Math.round((DIST+1)*H)+'px';XR.res.value.set(W*st.renderer.getPixelRatio(),H*st.renderer.getPixelRatio());
    XR.mk.value.set(narrow.matches?0:.3,narrow.matches?1:.84,narrow.matches?.72:1,narrow.matches?.18:0);fitCache.clear();drawn=false};
  addEventListener('resize',resize);
  let cur=-1,inView=false,raf=0,drawn=false;const t0=performance.now();let lastFontCheck=0;
  /* 동체 로고타입(한진그룹체)을 칠하기 전에 글꼴을 기다림(늦어도 2.5초 뒤에는 진행).
     더 늦게 도착하면, 그 전에 대체 글꼴로 칠한 기체를 버리고 다시 만듦 */
  const FONT='700 200px "HanjinGroupSans"',fontOK=()=>!document.fonts||document.fonts.check(FONT);
  const settled=()=>!document.fonts||document.fonts.status==='loaded';   /* WebKit: check는 로딩 중에도 true(swap) · status는 정확 */
  if(document.fonts)document.fonts.load(FONT).catch(()=>{});
  const tReady=performance.now()+2500;
  const texOf=o=>{const s=new Set();o.traverse(q=>{if(q.material)(Array.isArray(q.material)?q.material:[q.material]).forEach(m=>{for(const k in m)if(m[k]&&m[k].isTexture)s.add(m[k])})});return [...s]};
  /* 기체 버리기: 지오메트리 · 텍스처 해제 — 셰이더 비동기 컴파일이 끝난 뒤에(도중에 재질을 버리면 three.js 확인 타이머가 오류를 냄)
     기본 재질은 dispose하지 않아 셰이더 프로그램이 남음(기종 사이에 거의 같은 수십 개) → 다시 만들 때 컴파일 없이 씀 · ShaderMaterial(투시)은 three.js가 Map으로 붙잡으므로 dispose */
  const free=A=>A.holder.traverse(o=>{if(o.isMesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{for(const k in m)if(m[k]&&m[k].isTexture)m[k].dispose();if(m.isShaderMaterial)m.dispose()})}});
  const drop=A=>A.cp?A.cp.then(()=>free(A)):free(A);
  /* 텍스처를 GPU에 n장까지 올리고, 다 올리면 원본 캔버스를 비움(화면은 같음) — WebKit은 캔버스마다 원본 · 업로드 복사본을 따로 들고 있어 여객기 하나에 ~0.5GB였음(아이폰은 GPU 프로세스 몫도 WebContent에 합산)
     한 캔버스를 두 텍스처가 써도 되게 다 올린 뒤에 비움 · 컨텍스트를 잃은 동안은 멈춤(되찾으면 아래 webglcontextrestored에서 기체를 새로 만듦) */
  const up=(A,n=1e9)=>{if(gl.isContextLost())return;while(A.q.length&&n--)st.renderer.initTexture(A.q.shift());
    if(!A.q.length&&A.tex){if(!A.pre)A.tex.forEach(t=>{const c=t.image;if(c&&c.getContext)c.width=c.height=0});A.tex=null}};
  function refont(){if(!models.size)return;if(cur>=0){const P=models.get(cur);if(P)st.pivot.remove(P.holder)}
    models.forEach(drop);models.clear();fitCache.clear();cur=-1}
  /* 컨텍스트를 되찾으면: 옛 GL 객체는 컨텍스트와 함께 사라졌고 캔버스는 비웠으므로 dispose 없이 버리고 다음 프레임에 새로 만듦(글꼴 전에 만든 기체는 캔버스가 남아 있어 원본처럼 다시 올림) */
  cv.addEventListener('webglcontextrestored',()=>{if(cur>=0){const P=models.get(cur);if(P)st.pivot.remove(P.holder)}models.forEach((A,k)=>{if(!A.pre)models.delete(k)});cur=-1});

  function where(){const r=sec.getBoundingClientRect(),span=Math.max(1,r.height-H),d=clamp(-r.top/span)*DIST,y=sceneAt(d);
    let i=0;while(i<N-1&&y>=C[i+1])i++;return {i,u:clamp((y-C[i])/Wt[i]),y,d,vis:r.top<innerHeight&&r.bottom>0}}   /* vis: 무대가 화면에 걸침 */
  function show(i){
    if(i===cur)return;
    if(cur>=0){const P=models.get(cur);if(P)st.pivot.remove(P.holder)}
    cur=i;drawn=false;const A=get(i);st.pivot.add(A.holder);st.fit(A.R,A.floorY-A.center.y);
    rail.forEach((a,k)=>a.classList.toggle('on',k===i));
    coEls.forEach(l=>l.forEach(e=>e.classList.remove('on')));
    /* 다음 → 이전 기체를 미리 만들어 둠 — 한 작업에 한 가지씩(기체 생성 한 번 · 텍스처 한 장), 사이에 화면을 그릴 틈을 두어 스크롤 중 오래 멈추지 않게 */
    if(!settled()){if(i+1<N)setTimeout(()=>get(i+1),80);return}      /* 글꼴 전에는 원본과 같은 때 i+1만 만듦(만드는 때가 다르면 동체 글씨 글꼴이 달라짐) */
    /* 이웃을 다 올린 뒤에는, 지나쳐 버려 덜 올라간 기체도 마저 올리고 캔버스를 비움 */
    const pre=()=>{if(cur!==i||gl.isContextLost())return;for(const k of [i+1,i-1])if(k>=0&&k<N){const P=models.get(k);if(!P)get(k);else if(P.q.length)up(P,1);else continue;return setTimeout(pre,20)}
      for(const P of models.values())if(P.q.length&&!P.pre){up(P,1);return setTimeout(pre,20)}};setTimeout(pre,80);
  }

  /* 카메라 자세 계산 */
  const fovT=()=>{const v=Math.tan(st.cam.fov*Math.PI/360),h=v*st.cam.aspect;return Math.min(v,h*(narrow.matches?.92:.7))};
  const fitCache=new Map();
  function heroR(A){const key=A.key+'|'+st.cam.aspect.toFixed(3);if(fitCache.has(key))return fitCache.get(key);
    const tv=Math.tan(st.cam.fov*Math.PI/360),th=tv*st.cam.aspect,lx=narrow.matches?.9:.8,ly=narrow.matches?.42:.64;
    const b=A.box0,cs=[];for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])cs.push(new THREE.Vector3(x,y,z).sub(A.center));
    let best=0;const hp=A.hero;
    for(let k=0;k<12;k++){const rho=k/12*TAU;for(const el of [hp.el,hp.el+.17]){
      const f=new THREE.Vector3(-Math.cos(el)*Math.sin(hp.yaw),-Math.sin(el),-Math.cos(el)*Math.cos(hp.yaw)),rt=new THREE.Vector3().crossVectors(f,new THREE.Vector3(0,1,0)).normalize(),up=new THREE.Vector3().crossVectors(rt,f);
      const need=r=>{let ok=true;for(const c0 of cs){const c=c0.clone().applyAxisAngle(new THREE.Vector3(0,1,0),rho);const z=r+c.dot(f);if(z<=0){ok=false;break}if(Math.abs(c.dot(rt))/(z*th)>lx||Math.abs(c.dot(up))/(z*tv)>ly){ok=false;break}}return ok};
      let lo=A.R*.3,hi=A.R*20;for(let it=0;it<28;it++){const mid=(lo+hi)/2;if(need(mid))hi=mid;else lo=mid}best=Math.max(best,hi)}}
    fitCache.set(key,best);return best}
  function heroPose(A,s){const hp=A.hero;return {yaw:hp.yaw,el:hp.el+.17*Math.sin(Math.PI*s),r:heroR(A)*(1-.04*Math.sin(Math.PI*s)),t:new THREE.Vector3()}}
  function beatPose(A,b){const c=b.box[0].clone().add(b.box[1]).multiplyScalar(.5),rad=b.box[0].distanceTo(b.box[1])/2;return {yaw:b.yaw,el:b.el,r:rad*b.m/fovT(),t:c.sub(A.center)}}
  const angLerp=(a,b,t)=>{let d=((b-a)%TAU+TAU*1.5)%TAU-TAU/2;return a+d*t};
  function mix(p,q,f){return {yaw:angLerp(p.yaw,q.yaw,f),el:lerp(p.el,q.el,f),r:Math.exp(lerp(Math.log(p.r),Math.log(q.r),f)),t:p.t.clone().lerp(q.t,f)}}

  function pose(i,A,u,time){
    const w=Wt[i],tA=ARR/w,tS=(ARR+SPIN)/w,tE=1-EXIT/w,k=K[i];
    const s=reduce?1:sio(seg(u,tA*.5,tS));                               /* 회전 진행 */
    A.holder.rotation.y=reduce?0:s*TAU;
    if(A.rotor)A.rotor.rotation.y=reduce?0:time*.9+s*TAU*1.3;
    let P=heroPose(A,s),bi=-1,bv=0;
    if(u>=tS){const x=Math.min(k-1e-6,(u-tS)/((tE-tS)/k));bi=Math.floor(x);bv=x-bi;if(u>=tE){bi=k-1;bv=1}
      const from=bi?beatPose(A,A.beats[bi-1]):heroPose(A,1),to=beatPose(A,A.beats[bi]);
      const f=reduce?1:eio(seg(bv,0,.45));P=mix(from,to,f);
      if(!reduce)P.yaw+=.14*(Math.max(0,bv-.45))+.1*seg(u,tE,1);}   /* 설명 동안 천천히 흐름 */
    P.t.y+=reduce?0:Math.sin(time*.6)*.004*A.R;
    st.view({yaw:P.yaw,el:P.el,r:P.r,target:[P.t.x,P.t.y,P.t.z]});
    const exp=reduce?1:Math.min(eo(seg(u,0,tA*.9)),1-eo(seg(u,tE+(1-tE)*.3,1)));
    st.renderer.toneMappingExposure=lerp(.06,st.exposure,exp);
    /* 투시 · 금색: 부위 단계에 들어서면서 — 설명 중인 부위만 금색, 나머지 부위도 투시로(가장 밝게 보이지 않게) · 마무리 페이드에 함께 어두워짐 */
    const g=reduce?(u>=tS?1:0):eo(seg(u,tS,tS+.35/w));
    const act=bi>=0?A.beats[bi].k:null,hold=reduce?1:sio(seg(bv,.4,.7));
    A.ghost.forEach(({m,x,k})=>{m.visible=g<.98;if(x){x.visible=g>.01;x.material.uniforms.op.value=g*exp*(k&&k===act?.35:1)}
      const tr=g>.01;if(m.material.transparent!==tr){m.material.transparent=tr;m.material.needsUpdate=true}m.material.opacity=1-g;m.castShadow=g<.5;m.material.depthWrite=g<.5});
    A.gold.forEach(({m,k,o,p0,n})=>{const on=k===act;m.material.opacity=g*exp*(on?1:.1);m.material.depthWrite=on&&g>.5;m.material.emissiveIntensity=on?.45+.1*Math.sin(time*2.2):.2;
      if(n){m.position.copy(p0).addScaledVector(n,on?.38*hold:0)}});
    return {s,bi,bv,g,tA,tS,tE};
  }

  const v=new THREE.Vector3(),vc=new THREE.Vector3();
  function ui(i,A,ph,u){
    const ch=chs[i];chs.forEach((c,k)=>{if(k!==i)c.classList.remove('on','fo')});
    ch.classList.toggle('on',u>=ph.tA*.35&&u<.995);ch.classList.toggle('fo',ph.bi>=0);sec.classList.toggle('a3-f',ph.bi>=0||i>0);   /* 안내 문구는 첫 기종 회전까지만 */
    const lis=[...ch.querySelectorAll('.pl li')];lis.forEach((li,j)=>{li.classList.toggle('on',j===ph.bi);li.classList.toggle('done',ph.bi>j);li.tabIndex=ph.bi>=0?0:-1});
    /* 설명선: 카메라가 멈춘 뒤(단계의 55%~) 나타남 */
    const els=coEls[i];
    vc.set(0,0,0);A.holder.localToWorld(vc);vc.project(st.cam);const cx=(vc.x*.5+.5)*W;
    els.forEach((e,j)=>{const b=A.beats[j];if(!b){e.classList.remove('on');return}
      v.copy(b.anchor);A.group.localToWorld(v);v.project(st.cam);
      const x=(v.x*.5+.5)*W,y=(-v.y*.5+.5)*H;const onb=j===ph.bi&&(reduce||ph.bv>.52)&&u<ph.tE+(1-ph.tE)*.5&&v.z<1;
      e.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;e.classList.toggle('on',onb);
      /* 폰: 이름표는 점 위(점이 화면 위쪽이면 아래) 가운데, 화면 가장자리에서 8px 안쪽으로 */
      if(narrow.matches){const w=e._nw||(e._nw=e.querySelector('span').offsetWidth),a=x-w/2,c=Math.min(Math.max(a,8),W-8-w);
        e.style.setProperty('--sx',(c-a).toFixed(1)+'px');e.classList.toggle('dn',y<H*.3);e.classList.remove('l','up');return}
      /* 이름표는 기체 중심 반대쪽 — 단, 왼쪽 글 기둥 · 오른쪽 기종 목록과 겹치지 않는 쪽으로 */
      const lw=(e._w||(e._w=e.querySelector('span').offsetWidth))+156,fitR=x+lw<W*.84,fitL=x-lw>W*.37;
      let left=x<cx;if(left&&!fitL&&fitR)left=false;else if(!left&&!fitR&&fitL)left=true;
      e.classList.toggle('l',left);e.classList.toggle('up',y>H*.62)});
    /* 방위 눈금 */
    if(hdg){const inSpin=ph.bi<0;hdg.classList.toggle('a3-pt',!inSpin);let tx;
      if(inSpin){const d=((A.hero.yaw*R2D+ph.s*360)%360+360)%360;tx='HDG '+String(Math.round(d)).padStart(3,'0')+'°';if(tape)tape.style.transform=`translateX(${(-d*4).toFixed(1)}px)`}
      else tx='PART '+String(ph.bi+1).padStart(2,'0')+' / '+String(K[i]).padStart(2,'0');
      if(hdgV.textContent!==tx)hdgV.textContent=tx}   /* 글자가 바뀔 때만 씀(같은 값도 새 텍스트 노드 → 매 프레임 레이아웃 · 페인트) */
  }

  /* 화면 근처(inView)일 때만 프레임을 돎 — 멀어지면 멈추고 IO가 다시 깨움 */
  function frame(now){
    raf=0;if(!inView)return;raf=requestAnimationFrame(frame);
    if(!fontOK()&&now<tReady)return;
    if(now-lastFontCheck>800){lastFontCheck=now;if(fontOK()&&[...models.values()].some(A=>!A.font))refont()}
    const {i,u,d,vis}=where();show(i);const A=models.get(i);const time=(now-t0)/1000;
    const ph=pose(i,A,u,time);ui(i,A,ph,u);
    if(bar)bar.style.transform=`scaleX(${(d/DIST).toFixed(4)})`;
    if(vis||!drawn){st.render();drawn=true}up(A);                     /* 무대가 화면에 걸칠 때만 매 프레임 그림(밖에서는 기종 · 크기가 바뀔 때 한 번) · 그린 뒤에 남은 텍스처를 올리고 캔버스 비움 */
  }
  new IntersectionObserver(es=>{inView=es.some(e=>e.isIntersecting);if(inView&&!raf)raf=requestAnimationFrame(frame)},{rootMargin:'200px 0px'}).observe(sec);
  addEventListener('ka-lenis',()=>{if(raf){cancelAnimationFrame(raf);raf=requestAnimationFrame(frame)}});   /* Lenis가 다시 돌면 그 뒤로 줄을 섬 — Lenis가 옮긴 위치를 같은 프레임에 읽음 */
  /* 바로가기: 기종(레일) · 부위(목록) */
  const scrollYAt=y=>{const r=sec.getBoundingClientRect();return scrollY+r.top+(r.height-H)*distanceAt(y)/DIST};
  const go=y=>{const Y=scrollYAt(y);if(window.KA_LENIS)KA_LENIS.scrollTo(Y,{duration:1.4});else scrollTo({top:Y,behavior:reduce?'auto':'smooth'})};
  rail.forEach((a,k)=>a.addEventListener('click',e=>{e.preventDefault();go(C[k]+ARR*.9)}));
  chs.forEach((ch,i)=>[...ch.querySelectorAll('.pl li')].forEach((li,j)=>{li.tabIndex=-1;const f=()=>go(C[i]+ARR+SPIN+(j+.62)*PART);li.addEventListener('click',f);li.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();f()}})}));
  resize();raf=requestAnimationFrame(frame);
  window.A3D={st,get,models,where,C,TOT,DIST,distanceAt,sceneAt,scrollYAt};
}
