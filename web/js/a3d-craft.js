/* 항공기체 3D — 기종별 기체 조립 · 대한항공 제작 부위(여객기 도장 · 텍스처는 a3d-paint.js, AH-6 올리브 도장 캔버스는 아래 TYPES['ah6'] 안) · aero · aero-en의 a3d.js가 불러옴
   치수는 공개 제원 · 3면도(Boeing/Airbus 공항 계획 문서, 위키백과 등)에서 옮김 — 좌표는 기수 끝에서 뒤로 잰 s(m)로 적고 모델 x = x0 − s 로 바꿈
   build(key) → { group, parts:{부위:[mesh]}, all:[mesh], F, hero:{yaw,el}, beats:[{k,yaw,el,box:[min,max],m,anchor}], rotor? } */
import * as THREE from 'three';
import {clamp,lerp,grid,mirrorZ,fuselage,fuselageSection,lofted,latheX,tube} from './a3d-geo.js?v=refactor-d1';
import './a3d-sym.js?v=refactor-d1';   /* 여기서는 쓰지 않지만 a3d-paint.js와 같은 깊이 3에서 함께 받게(모듈 깊이가 늘면 기체를 만드는 때 · 동체 글씨 글꼴이 바뀔 수 있음) */
import {KE,paint,M,band,taegeukTex,wingMat,livery,finPaint} from './a3d-paint.js?v=refactor-d1';

const TAU=Math.PI*2,D2R=Math.PI/180,tan=d=>Math.tan(d*D2R);
const V=(a)=>new THREE.Vector3(...a);

/* ── 나셀(터보팬) ── 앞 끝 x=0 → 뒤(-x) · len은 흡입구에서 코어 플러그 끝까지
   팬 카울(흰색, 뒤 끝이 열린 팬 노즐 · 787/737 MAX는 톱니 모양 셰브론) → 안쪽 바이패스 덕트 → 회색 코어 카울 → 코어 노즐 · 플러그 */
function nacelle(o){
  const g=new THREE.Group();const L=o.len/1.16,R=o.r,Ri=R*.86,Rc=R*.6,Rn=R*.46;
  const ni=m=>{m.userData.noXray=true;return m};
  const outer=[[0.02*L,Ri*1.005],[0.0,Ri*1.04],[-.01*L,Ri*1.1],[-.05*L,R*.985],[-.14*L,R],[-.4*L,R*.975],[-.56*L,R*.93],[-.64*L,R*.875]].reverse();
  const skinM=o.mat||M.nacelle();const skin=new THREE.Mesh(latheX(outer,96),skinM);g.add(skin);
  g.add(new THREE.Mesh(latheX([[.0,Ri*1.04],[.02*L,Ri*1.005],[.005*L,Ri*.97],[-.02*L,Ri*.95]].reverse(),96),M.metal()));
  const duct=new THREE.Mesh(latheX([[-.02*L,Ri*.95],[-.14*L,Ri*.93]].reverse(),96),M.dark());duct.material.side=THREE.BackSide;g.add(ni(duct));
  const bp=new THREE.Mesh(latheX([[-.64*L,R*.86],[-.46*L,R*.9]],96),M.dark());bp.material.side=THREE.BackSide;g.add(ni(bp));
  /* 셰브론: 팬 노즐 뒤 끝의 톱니 */
  if(o.chev){const n=o.chev,pos=[],x0=-.64*L,x1=-.685*L,r0=R*.875,r1=R*.855;
    for(let k=0;k<n;k++){const a0=k/n*TAU,a1=(k+1)/n*TAU,am=(a0+a1)/2;
      const P=(x,r,a)=>[x,r*Math.cos(a),r*Math.sin(a)];pos.push(...P(x0,r0,a0),...P(x1,r1,am),...P(x0,r0,a1))}
    const cg=new THREE.BufferGeometry();cg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));cg.computeVertexNormals();
    const cm=skinM.clone();cm.side=THREE.DoubleSide;g.add(new THREE.Mesh(cg,cm))}
  /* 팬: 디스크 + 넓은 시위 블레이드(겹쳐 보이게) + 스피너 */
  const fz=-.14*L;const disc=new THREE.Mesh(new THREE.CircleGeometry(Ri*.93,64),M.dark());disc.rotation.y=Math.PI/2;disc.position.x=fz-.02;g.add(ni(disc));
  const nb=o.blades||20,bl=new THREE.BoxGeometry(.014*R,Ri*.64,.36*R);bl.translate(0,Ri*.6,0);const bm=M.fan();
  for(let k=0;k<nb;k++){const b=new THREE.Mesh(bl,bm);b.rotation.x=k/nb*TAU;b.rotateY(.78);b.position.x=fz+.02;g.add(ni(b))}
  g.add(ni(new THREE.Mesh(latheX([[fz+.34*R,.001],[fz+.2*R,.15*R],[fz,.31*R],[fz-.05*R,.32*R]].reverse(),48),paint(0xD9DCDF,{rough:.25,metal:.4,cc:.4}))));
  /* 코어 카울 · 코어 노즐 · 플러그 */
  g.add(new THREE.Mesh(latheX([[-.5*L,Rc*.97],[-.6*L,Rc],[-.8*L,Rc*.86],[-.93*L,Rn*1.06],[-.97*L,Rn]].reverse(),64),M.grey()));
  g.add(new THREE.Mesh(latheX([[-.96*L,Rn*.9],[-1.06*L,Rn*.55],[-1.16*L,.02]].reverse(),48),M.dark()));
  /* 팬 카울 옆 작은 태극 */
  if(o.logo)for(const sg of [1,-1]){const d=new THREE.Mesh(new THREE.PlaneGeometry(R*.38,R*.38),new THREE.MeshPhysicalMaterial({map:o.logo,transparent:true,alphaTest:.4,roughness:.3,clearcoat:.6,polygonOffset:true,polygonOffsetFactor:-2}));
    d.position.set(-.3*L,R*.12,sg*R*1.003);d.rotation.y=sg>0?0:Math.PI;g.add(d)}
  return g;
}
function canoe(len,r,sy=1.4){const prof=[];for(let k=0;k<=24;k++){const u=k/24;prof.push([-u*len,r*Math.pow(Math.sin(Math.PI*Math.pow(u,.8)),.7)])}const g=latheX(prof.reverse(),32);g.scale(1,sy,1);return g}

/* 동체 조각(문 · 패널): s 구간 × θ 구간, 표면에서 off만큼 띄움 · 같은 도장 UV라 평소에는 이음 없이 보임 */
function patch(F,s0,s1,th0,th1,off=.012,ns=16,nt=16){
  return grid(ns,nt,(i,j)=>{const s=lerp(s0,s1,i/ns),th=lerp(th0,th1,j/nt);const c=fuselageSection(F,s),sn=Math.sin(th),cs=Math.cos(th);
    const k=1+off;return [F.x0-s,c.yM+(sn>=0?c.ht:c.hb)*sn*k,c.w*cs*k,s/F.L,((th/TAU)%1+1)%1]},{flip:true});
}
/* 윙팁 장치: 날개 끝 단면에서 반경 rad 원호로 cant°까지 꺾인 뒤 h만큼 곧게 · 시위 c0 → cTop · 앞전은 sweep°로 뒤로 */
function tipDevice(tip,{x:le0,y:y0,z:z0,c:c0,t:t0},dir=1){
  const st=[],n1=14,n2=10,cant=tip.cant*D2R,R=tip.rad,arc=cant*R,tot=arc+tip.h;
  for(let k=0;k<=n1+n2;k++){let sL,phi,pz,py;
    if(k<=n1){const u=k/n1;phi=cant*u;pz=R*Math.sin(phi);py=R*(1-Math.cos(phi));sL=arc*u}
    else{const u=(k-n1)/n2;phi=cant;pz=R*Math.sin(cant)+u*tip.h*Math.cos(cant);py=R*(1-Math.cos(cant))+u*tip.h*Math.sin(cant);sL=arc+u*tip.h}
    const q=sL/tot,c=lerp(c0,tip.cTop,Math.pow(q,.8)),le=le0-sL*tan(tip.sweep)-(c0-c)*.15;
    st.push({p:[le,y0+py*dir,z0+pz],c,t:lerp(t0,tip.tTop||.08,q),m:dir>0?.015:0,pc:.4,n:[0,Math.cos(phi),-Math.sin(phi)*dir]})}
  return lofted(st,{tipCap:true});
}
/* 높이(y)로 정한 동체 조각: 문턱이 수평으로 유지되게(꼬리 쪽에서 단면이 좁아져도) · side 1 = 오른쪽, -1 = 왼쪽 */
function patchY(F,s0,s1,yTop,yBot,side,off=.012,ns=16,nt=16){
  return grid(ns,nt,(i,j)=>{const s=lerp(s0,s1,i/ns),c=fuselageSection(F,s);const y=side>0?lerp(yBot,yTop,j/nt):lerp(yTop,yBot,j/nt);
    const sn=clamp((y-c.yM)/(y<c.yM?c.hb:c.ht),-.9,1),a=Math.asin(sn),th=side>0?a:Math.PI-a,k=1+off;
    return [F.x0-s,c.yM+(sn>=0?c.ht:c.hb)*sn*k,c.w*Math.cos(th)*k,s/F.L,((th/TAU)%1+1)%1]},{flip:true});
}
function fitAnchor(m){m.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(m),c=b.getCenter(new THREE.Vector3());const p=m.geometry.attributes.position,v=new THREE.Vector3();let best=null,bd=1e9;
  for(let i=0;i<p.count;i+=3){v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);const d=v.distanceToSquared(c);if(d<bd){bd=d;best=v.clone()}}return best||c}

/* ── 쌍발 여객기 공통 조립 ── airliner(P) · P = 기종 제원(아래 TYPES) · 길이 m · 각도 °(tan) · s = 기수 끝에서 뒤로 잰 거리(모델 x = x0 − s, x0 = L/2는 여기서 붙임)
   F{L 길이,W 반폭,H · Hb 위 · 아래 반높이,nose,tail} 동체 단면(a3d-geo.js fuselageSection) · joints[s] 섹션 이음(범프) · fusCuts[{s0,s1,part}] 동체를 잘라 부위로
   liv:liv({…}) 동체 도장(a3d-paint.js livery): win{y 창문 줄 sinθ,s0,s1,pitch,w,h} · doors[s] · winSkip[[s0,s1]] · exits[s] 비상구 · cargo[{s,side R|L,th 수평 아래 각,w,h}]
     · cockpit{th0,th1 위에서 잰 각,sF0,sF1 앞 끝 s,sB0,sB1 뒤 끝 s,posts 기둥 u,gap} · word{s0,ratio?,cap?,y?} "KOREAN" · plain?(참이면 "KOREAN" 글씨를 찍지 않음) · mask(A350 조종석 둘레 검정) · curve?(파랑/흰 경계)
   wing{sLE,cSide 옆면 앞전 s · 시위,zr,zk,zt 뿌리 · 꺾임 · 끝 z,le,teIn,teOut 후퇴각,y0,dih,flex 휨,tr,tt 두께비} · plainWing? · wingTex?{…}
   tip{type rake{zs,cTip,teSw} | at · sharklet · curve{cant,rad,h,cTop,sweep,tTop?,lower?{…}},sky?(파랑) · white?(흰색, sky가 우선 · 둘 다 없으면 날개색),part} · fsf[z] · fsfLen · fsfR · fsfSy? · fsfProt(뒷전 뒤로) · fsfPart?
   belly{s0,s1,y,b 반높이,c 반폭} · ht{sLE,z0,span,cr,ct,sw,dih,y,t?} · vt{sLE,y0,h,cr,ct,sw,t?} · logoP{D 지름,U 중심 높이(꼬리날개 높이 비),gap} · eng{sIn 흡입구 s,z,r,len,y,blades?(팬 날 수, 기본 20),chev?}
   patches[{s0,s1,th0,th1 | yTop,yBot,side, off?(바깥 띄움, 기본 .012), part}] 동체 조각(금색 때 바깥으로 들림) · extra[fn({add,F,S,le,te,wy,g,all})] 기종 전용 부품 · hero{yaw,el} 첫 화면
   beats[{k 부위,yaw,el,box[[s,y,z],[s,y,z]],m 여유 배율,ai? parts[k] 번호,anchor?(api)→[x,y,z]}] · api = {F,S,le,te,wy,zt,tipTop,fsfM,fsfP,parts}
   beats 순서 · 개수 = aero(-en).html 그 기종의 .pl li(a3d.js가 번호로 짝지음) */
function airliner(P){
  const F={...P.F,x0:P.F.L/2};const L=F.L,x0=F.x0,S=s=>x0-s;
  const g=new THREE.Group(),parts={},all=[];
  const add=(mesh,part)=>{mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);all.push(mesh);if(part)(parts[part]=parts[part]||[]).push(mesh);return mesh};
  const livT=livery(F,{joints:P.joints,...P.liv});const skin=paint(0xFFFFFF,{map:livT,rough:1,metal:1,cc:.7,ccr:.05});skin.metalnessMap=livT.userData.metal;skin.roughnessMap=livT.userData.rough;skin.bumpMap=livT.userData.bump;skin.bumpScale=1.2;
  const logo=taegeukTex();
  /* 동체(강조 구간이 있으면 나눠 만듦) */
  const cuts=[0,...(P.fusCuts||[]).flatMap(c=>[c.s0,c.s1]),L].sort((a,b)=>a-b);
  for(let k=0;k<cuts.length-1;k++){const a=cuts[k],b=cuts[k+1];if(b-a<.01)continue;const cut=(P.fusCuts||[]).find(c=>Math.abs(c.s0-a)<1e-6);
    add(new THREE.Mesh(fuselage({...F,range:[a,b],ns:Math.max(24,Math.round((b-a)/L*260))}),cut?skin.clone():skin),cut?cut.part:null)}
  /* 날개 평면형(연구 좌표 → 모델 좌표) */
  const w=P.wing,zr=w.zr,zk=w.zk,zt=w.zt;
  const sLE=z=>w.sLE+(z-F.W)*tan(w.le);
  const sTE=z=>z<zk?w.sLE+w.cSide+(z-F.W)*tan(w.teIn):w.sLE+w.cSide+(zk-F.W)*tan(w.teIn)+(z-zk)*tan(w.teOut);
  const le=z=>S(sLE(z)),te=z=>S(sTE(z));
  const wy=z=>w.y0+(z-zr)*tan(w.dih)+(w.flex||0)*(z-zr)*(z-zr);
  const wt=z=>lerp(w.tr,w.tt,clamp((z-zr)/(zt-zr)));
  const zl=[];for(let k=0;k<=28;k++)zl.push(lerp(zr,zt,k/28));
  const wst=zl.map(z=>({p:[le(z),wy(z),z],c:le(z)-te(z),t:wt(z),m:.022,pc:.42}));
  const wg=lofted(wst,{tipCap:!P.tip});const wm=P.plainWing?M.wing():wingMat({tipCap:!P.tip,...(P.wingTex||{})});add(new THREE.Mesh(wg,wm));add(new THREE.Mesh(mirrorZ(wg),wm));
  /* 윙팁 */
  const tip0={x:le(zt),y:wy(zt),z:zt,c:le(zt)-te(zt),t:wt(zt)};let tipTop=[tip0.x,tip0.y,zt];
  if(P.tip){const T=P.tip;const tm=T.sky?M.sky:T.white?()=>paint(0xF1F2F3,{rough:.3}):M.wing;
    if(T.type==='rake'){const rk=[];for(let k=0;k<=14;k++){const u=k/14,z=lerp(zt,T.zs,u);const e=te(zt)-(z-zt)*tan(T.teSw);const c=lerp(tip0.c,T.cTip,Math.pow(u,.8));rk.push({p:[e+c,wy(z),z],c,t:lerp(tip0.t,tip0.t*.9,u),m:.02,pc:.42})}
      const rg=lofted(rk,{tipCap:true});const m1=tm();add(new THREE.Mesh(rg,m1),T.part);add(new THREE.Mesh(mirrorZ(rg),m1.clone()),T.part);tipTop=[te(zt)-(T.zs-zt)*tan(T.teSw)+T.cTip*.6,wy(T.zs),T.zs]}
    else{const tg=tipDevice(T,tip0,1);const m1=tm();add(new THREE.Mesh(tg,m1),T.part);add(new THREE.Mesh(mirrorZ(tg),m1.clone()),T.part);
      if(T.lower){const lg=tipDevice(T.lower,tip0,-1);add(new THREE.Mesh(lg,m1.clone()),T.part);add(new THREE.Mesh(mirrorZ(lg),m1.clone()),T.part)}
      const ca=T.cant*D2R;tipTop=[tip0.x-(ca*T.rad+T.h)*tan(T.sweep)*.85,tip0.y+T.rad*(1-Math.cos(ca))+T.h*Math.sin(ca)*.85,zt+T.rad*Math.sin(ca)+T.h*Math.cos(ca)*.85]}}
  /* 플랩 서포트 페어링(카누): 뒷전 뒤로 prot만큼 나옴 */
  const fsfM=[],fsfP=[];(P.fsf||[]).forEach(z=>{const len=P.fsfLen,cg=canoe(len,P.fsfR,P.fsfSy||1.45);
    for(const sgn of [1,-1]){const m=add(new THREE.Mesh(cg,M.wing()),P.fsfPart||null);m.position.set(te(z)-P.fsfProt+len,wy(z)-(P.fsfR*1.1),z*sgn);(sgn>0?fsfM:fsfP).push(m)}});
  /* 벨리 페어링 */
  if(P.belly){const b=P.belly,bf=new THREE.Mesh(new THREE.SphereGeometry(1,64,32),M.lower());bf.scale.set((b.s1-b.s0)/2,b.b,b.c);bf.position.set(S((b.s0+b.s1)/2),b.y,0);add(bf)}
  /* 수평꼬리 */
  const h=P.ht;const hz=[];for(let k=0;k<=12;k++)hz.push(lerp(h.z0,h.span,k/12));
  const hst=hz.map((z,k)=>({p:[S(h.sLE)-(z-h.z0)*tan(h.sw),h.y+(z-h.z0)*tan(h.dih),z],c:lerp(h.cr,h.ct,k/12),t:h.t||.1,m:0}));
  const hg=lofted(hst);const hm=M.wing();add(new THREE.Mesh(hg,hm));add(new THREE.Mesh(mirrorZ(hg),hm));
  /* 수직꼬리(대한항공: 전체 하늘색 + 태극) */
  /* 뿌리는 동체 안으로 1.2 m 더 내려 뒤쪽 동체 윗면이 내려가도 틈이 생기지 않게(보이는 뿌리 = y0) */
  const v=P.vt;const vst=[];for(let k=-2;k<=12;k++){const u=k/12,y=k<0?v.y0-.6*(-k):lerp(v.y0,v.y0+v.h,u);vst.push({p:[S(v.sLE)-(Math.max(y,v.y0)-v.y0)*tan(v.sw),y,0],c:k<0?v.cr:lerp(v.cr,v.ct,u),t:v.t||.1,m:0,n:[0,0,1]})}
  const vg=lofted(vst,{flip:true});
  /* 꼬리 태극 — 실측(대한항공 새 도장 옆모습 사진 9장, 공식 로고에 맞춰 원근 보정): 태극 지름 ≈ 꼬리날개 높이의 0.50(787) · 0.46(737) · 0.54(A321neo) · 0.52(A330),
   중심 높이 0.35~0.47, 원의 뒤 끝이 그 높이의 뒷전에 닿음 · 똑바로 세움 · 양쪽 모두 같은 방향 */
  const L0={D:.5,U:.4,gap:.02,...(P.logoP||{})};const yc=v.y0+v.h*L0.U,cc=lerp(v.cr,v.ct,L0.U),le0=S(v.sLE)-(yc-v.y0)*tan(v.sw),D=v.h*L0.D;
  const T=finPaint(vg,{D,cx:(le0-cc)+D/2+L0.gap*D,cy:yc},0x53AAE2,KE.navy);const fm=paint(0xFFFFFF,{map:T.map,rough:.28,metal:1,cc:1,ccr:.06});fm.metalnessMap=T.metal;add(new THREE.Mesh(vg,fm));
  /* 엔진 */
  const e=P.eng;
  for(const sgn of [1,-1]){const n=nacelle({len:e.len,r:e.r,blades:e.blades,chev:e.chev,logo,mat:M.nacelle()});
    const ez=e.z*sgn;n.position.set(S(e.sIn),e.y,ez);n.traverse(m=>{if(m.isMesh){m.castShadow=true;all.push(m)}});g.add(n);
    const Ln=e.len/1.16;
    const py=[];const top=wy(e.z)-.12;for(let k=0;k<=4;k++){const u=k/4;py.push({p:[S(e.sIn)-Ln*.1-u*.4,lerp(e.y+e.r*.7,top,u),ez],c:Ln*.93,t:.1,m:0,n:[0,0,1]})}
    const pm=new THREE.Mesh(lofted(py,{tipCap:false,flip:true}),M.wing());pm.castShadow=true;g.add(pm);all.push(pm)}
  /* 동체 조각(화물문 · 외피 패널) */
  (P.patches||[]).forEach(q=>{const pm=add(new THREE.Mesh(q.yTop!=null?patchY(F,q.s0,q.s1,q.yTop,q.yBot,q.side,q.off||.012):patch(F,q.s0,q.s1,q.th0,q.th1,q.off||.012),skin),q.part);pm.userData.lift=true});
  (P.extra||[]).forEach(fn=>fn({add,F,S,le,te,wy,g,all}));
  const nav=(c,p)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(Math.max(.07,F.W*.035),12,8),new THREE.MeshBasicMaterial({color:c}));m.position.set(...p);g.add(m);all.push(m)};
  const tp=P.tip&&P.tip.type==='rake'?tipTop:[tip0.x-tip0.c*.12,tip0.y+.02,tip0.z+.04];nav(0x3BE37A,tp);nav(0xFF3B3B,[tp[0],tp[1],-tp[2]]);nav(0xFFFFFF,[S(L)+.02,F.tail.endY,0]);
  const api={F,S,le,te,wy,zt,tipTop,fsfM,fsfP,parts};
  /* 부위별 카메라(연구 좌표 s로 적은 상자를 모델 좌표로) */
  const beats=P.beats.map(b=>{const bx=b.box;const box=[V([S(bx[1][0]),bx[0][1],bx[0][2]]),V([S(bx[0][0]),bx[1][1],bx[1][2]])];
    const an=typeof b.anchor==='function'?V(b.anchor(api)):(parts[b.k]?fitAnchor(parts[b.k][b.ai||0]):box[0].clone().add(box[1]).multiplyScalar(.5));return {...b,box,anchor:an}});
  return {group:g,parts,all,F,hero:P.hero||{yaw:2.53,el:.24},beats};
}

/* ── 공통 도장 ── */
const liv=o=>({upper:KE.sky,lower:KE.lower,...o});

const TYPES={};

/* 보잉 787-9 — ① 레이키드 윙팁 ② 플랩 서포트 페어링 ③ 후방 랜딩기어 수용부 격벽 ④ 후방동체(섹션 48) */
TYPES['787']=()=>airliner({
  logoP:{D:.5,U:.35},
  F:{L:62.0,W:2.885,H:2.97,Hb:2.97,nose:{len:7.6,tipY:-.9,aT:1.5,aB:2.35,aW:2.05},tail:{len:17.0,endY:1.0,endR:.28,pT:2.1,pB:1.45,pW:1.3,cap:.5}},
  liv:liv({win:{y:.32,s0:7.2,s1:51.8,pitch:.64,w:.28,h:.47},doors:[6.30,18.36,35.43,49.66],
    cargo:[{s:11.0,side:'R',th:.62,w:2.6,h:1.7},{s:43.31,side:'R',th:.62,w:2.6,h:1.7},{s:47.75,side:'L',th:.45,w:1.0,h:.9}],
    cockpit:{th0:.03,th1:1.05,sF0:2.85,sF1:3.05,sB0:3.75,sB1:4.9,posts:[.52],gap:.012},word:{s0:8.2,ratio:5.95}}),
  fusCuts:[{s0:53.8,s1:58.4,part:'aft'}],joints:[6.9,17.4,27.8,40.1,46.0,53.8,58.4],
  wing:{sLE:21.8,cSide:12.1,zr:1.2,zk:9.65,zt:25.0,le:35,teIn:3,teOut:20,y0:-1.45,dih:6,flex:.0019,tr:.15,tt:.095},
  tip:{type:'rake',zs:30.06,cTip:.45,teSw:30,part:'rake'},
  fsf:[6.3,14.4,19.1],fsfLen:6.6,fsfR:.28,fsfSy:1.6,fsfProt:1.9,fsfPart:'fsf',
  belly:{s0:19,s1:38,y:-2.15,b:1.2,c:3.02},
  ht:{sLE:53.6,z0:.6,span:9.9,cr:5.7,ct:1.7,sw:40,dih:7,y:.62},
  vt:{sLE:52.0,y0:2.45,h:8.9,cr:7.3,ct:2.65,sw:39.5},
  eng:{sIn:20.8,z:9.91,r:1.85,len:7.5,y:-2.2,blades:18,chev:14},
  extra:[({add,S})=>{/* 주 랜딩기어 칸 뒤 격벽: 객실 바닥(y≈−0.8) 아래 아래동체 단면 모양 판 */
    const sh=new THREE.Shape();const r=2.82,yf=-.82,a0=Math.asin(yf/r);sh.moveTo(r*Math.cos(a0),yf);sh.absarc(0,0,r,a0,-Math.PI-a0,true);sh.lineTo(r*Math.cos(a0),yf);
    const bk=new THREE.Mesh(new THREE.ShapeGeometry(sh,48),paint(0x98A09A,{rough:.55,metal:.35,cc:0}));bk.material.side=THREE.DoubleSide;bk.rotation.y=Math.PI/2;bk.position.set(S(34.5),0,0);add(bk,'bulk')}],
  beats:[
    {k:'rake',yaw:2.5,el:.8,box:[[36,-.8,-31],[44,4.6,-22.5]],m:1.25,ai:1},
    {k:'fsf',yaw:2.45,el:-.32,box:[[27,-3.4,-21],[41,.6,-6]],m:1.08,anchor:a=>{const m=a.fsfP[1];return [m.position.x-2.2,m.position.y-.35,m.position.z]}},
    {k:'bulk',yaw:2.15,el:.14,box:[[26,-3.4,-3],[43,1.4,3]],m:1.35,anchor:a=>[a.S(34.5),-2.0,-1.4]},
    {k:'aft',yaw:3.4,el:.28,box:[[49,-1.8,-4],[62,4.2,4]],m:1.25,anchor:a=>[a.S(56),2.25,-1.5]}]
});

/* 보잉 737-8(MAX 8) — 어드밴스드 테크놀로지 윙렛(위 · 아래 두 날, 대한항공은 하늘색) */
TYPES['737']=()=>airliner({
  logoP:{D:.46,U:.43},
  F:{L:39.1,W:1.88,H:2.0,Hb:2.0,nose:{len:5.2,tipY:-.62,aT:1.4,aB:2.25,aW:2.0},tail:{len:11.5,endY:.8,endR:.18,pT:2.0,pB:1.4,pW:1.3,cap:.35}},
  liv:liv({win:{y:.3,s0:6.2,s1:31.0,pitch:.51,w:.25,h:.36},doors:[4.85,31.88],winSkip:[[16.3,18.1]],
    cargo:[{s:8.53,side:'R',th:.62,w:1.3,h:.9},{s:27.97,side:'R',th:.62,w:1.2,h:.9}],
    cockpit:{th0:.03,th1:1.05,sF0:2.05,sF1:2.2,sB0:2.75,sB1:3.55,posts:[.4,.72],gap:.015},word:{s0:6.3,ratio:5.15},exits:[16.71,17.68]}),
  joints:[5.5,12.2,24.6,30.9],
  wing:{sLE:14.3,cSide:6.8,zr:.8,zk:4.9,zt:16.6,le:30.6,teIn:0,teOut:16.7,y0:-1.25,dih:5.5,flex:.0006,tr:.14,tt:.1},
  tip:{type:'at',sky:true,cant:60,rad:.45,h:2.16,cTop:.4,sweep:52,part:'wl',lower:{cant:30,rad:.3,h:1.45,cTop:.3,sweep:48}},
  fsf:[4.1,6.4,9.05],fsfLen:3.2,fsfR:.19,fsfProt:.9,
  belly:{s0:13.4,s1:23.3,y:-1.5,b:.85,c:1.98},
  ht:{sLE:33.4,z0:.4,span:7.18,cr:3.9,ct:1.2,sw:35,dih:7,y:.5},
  vt:{sLE:30.4,y0:1.6,h:6.9,cr:6.0,ct:1.9,sw:35},
  eng:{sIn:13.0,z:4.82,r:1.08,len:4.5,y:-1.83,blades:18,chev:12},
  extra:[({add,S,F})=>{/* 737 특유의 등지느러미(수직꼬리 앞 필렛): s 25.8 → 30.9 m, 높이 0 → 1 m */
    /* 앞전이 낮게 길게 뻗은 삼각 필렛: 스테이션마다 앞전 위치 · 시위 */const fl=[];for(let k=0;k<=8;k++){const u=k/8,y=F.H-.12+u*1.05;const le=S(lerp(25.8,30.35,Math.pow(u,.55)));const te=S(30.9);fl.push({p:[le,y,0],c:Math.max(.2,le-te),t:.12,m:0,n:[0,0,1]})}
    add(new THREE.Mesh(lofted(fl,{flip:true}),M.sky()))}],
  hero:{yaw:2.53,el:.22},
  beats:[{k:'wl',yaw:2.85,el:.12,box:[[21.5,-1.5,-18.4],[26.5,2.6,-15.2]],m:1.45,ai:1}]
});

/* 에어버스 A321neo(A320 계열) — 샤크렛(대한항공 단독 공급) */
TYPES['a320']=()=>airliner({
  logoP:{D:.54,U:.46},
  F:{L:44.5,W:1.975,H:2.07,Hb:2.07,nose:{len:5.3,tipY:-.5,aT:1.75,aB:2.15,aW:2.1},tail:{len:12.5,endY:.85,endR:.18,pT:2.0,pB:1.45,pW:1.3,cap:.35}},
  liv:liv({win:{y:.3,s0:6.0,s1:39.8,pitch:.533,w:.23,h:.33},doors:[4.3,40.6],winSkip:[[16.1,18.1]],
    cargo:[{s:9.2,side:'R',th:.62,w:1.8,h:1.2},{s:32.5,side:'R',th:.62,w:1.8,h:1.2}],
    cockpit:{th0:.03,th1:1.05,sF0:2.0,sF1:2.15,sB0:2.7,sB1:3.5,posts:[.4,.72],gap:.015},word:{s0:5.5,ratio:5.5},exits:[16.6,17.55]}),
  joints:[5.8,13.6,26.0,34.2],
  wing:{sLE:17.2,cSide:6.07,zr:.9,zk:6.4,zt:16.29,le:27.5,teIn:0,teOut:17,y0:-1.3,dih:5,flex:.0005,tr:.145,tt:.1},
  tip:{type:'sharklet',sky:true,cant:72,rad:1.13,h:1.73,cTop:.6,sweep:40,part:'shk'},
  fsf:[4.87,8.30,11.91],fsfLen:3.0,fsfR:.21,fsfProt:.9,
  belly:{s0:14.8,s1:26.2,y:-1.55,b:.88,c:2.1},
  ht:{sLE:38.2,z0:.4,span:6.22,cr:3.9,ct:1.24,sw:32,dih:6,y:.5},
  vt:{sLE:35.8,y0:1.65,h:5.87,cr:5.5,ct:1.9,sw:40},
  eng:{sIn:15.4,z:5.75,r:1.25,len:5.0,y:-1.95,blades:20},
  beats:[{k:'shk',yaw:2.85,el:.12,box:[[23,-1.2,-18.3],[28.3,3.1,-15]],m:1.45,ai:1}]
});

/* 에어버스 A330-900(A330neo) — 샤크렛 · 동체 외피 패널(범위 비공개: 대표 위치에 개념 표시) */
TYPES['a330']=()=>airliner({
  logoP:{D:.52,U:.47},
  F:{L:62.8,W:2.82,H:2.82,Hb:2.82,nose:{len:6.8,tipY:-.7,aT:1.75,aB:2.15,aW:2.1},tail:{len:17.5,endY:1.0,endR:.26,pT:2.0,pB:1.45,pW:1.3,cap:.45}},
  liv:liv({win:{y:.3,s0:7.0,s1:52.5,pitch:.533,w:.23,h:.36},doors:[5.6,17.0,35.5,54.2],
    cargo:[{s:12.4,side:'R',th:.62,w:2.7,h:1.7},{s:42.0,side:'R',th:.62,w:2.7,h:1.7}],
    cockpit:{th0:.03,th1:1.05,sF0:2.7,sF1:2.85,sB0:3.5,sB1:4.5,posts:[.4,.72],gap:.012},word:{s0:7.9,ratio:5.8,cap:2.35,y:.27}}),
  joints:[7.4,16.3,33.1,44.8,51.2],
  wing:{sLE:22.6,cSide:10.55,zr:1.2,zk:9.3,zt:29.9,le:31.4,teIn:0,teOut:22.4,y0:-1.55,dih:5.5,flex:.001,tr:.15,tt:.1},
  tip:{type:'sharklet',sky:true,cant:62,rad:1.6,h:2.6,cTop:.3,sweep:55,part:'shk'},
  fsf:[7.46,10.88,14.21,17.65],fsfLen:4.5,fsfR:.25,fsfProt:1.1,
  belly:{s0:19.3,s1:38.8,y:-2.05,b:1.15,c:2.9},
  patches:[0,1,2].flatMap(k=>[0,1].map(r=>({s0:12.2+k*2.45,s1:14.5+k*2.45,th0:Math.PI-.66-r*.5,th1:Math.PI-.2-r*.5,off:.01,part:'skin'}))),
  ht:{sLE:54.8,z0:.6,span:9.7,cr:6.4,ct:2.0,sw:37,dih:6,y:.75},
  vt:{sLE:52.42,y0:2.4,h:8.3,cr:7.8,ct:3.1,sw:44},
  eng:{sIn:21.05,z:9.4,r:1.75,len:6.5,y:-2.15,blades:20},
  beats:[{k:'shk',yaw:2.8,el:.16,box:[[37.5,-.6,-33],[45,5.2,-28]],m:1.45,ai:1},
         {k:'skin',yaw:2.72,el:.24,box:[[9,-1.2,-3.4],[22,3.4,0]],m:1.35,anchor:a=>[a.S(16),2.3,-1.9]}]
});

/* 에어버스 A350-900 — 전방 · 후방 카고 도어(오른쪽), 벌크 도어(왼쪽) · 아래동체(객실 바닥 아래) */
TYPES['a350']=()=>airliner({
  logoP:{D:.52,U:.46},
  F:{L:65.26,W:2.98,H:3.045,Hb:3.045,nose:{len:7.2,tipY:-.8,aT:1.62,aB:2.25,aW:2.1},tail:{len:18.5,endY:1.05,endR:.28,pT:2.0,pB:1.45,pW:1.3,cap:.5}},
  liv:liv({win:{y:.3,s0:7.6,s1:55,pitch:.57,w:.29,h:.45},doors:[6.82,18.86,37.93,52.55],mask:true,
    cockpit:{th0:.03,th1:1.05,sF0:2.85,sF1:3.0,sB0:3.75,sB1:4.85,posts:[.4,.72],gap:.012},word:{s0:8.8}}),
  joints:[7.6,17.9,39.4,47.8,54.0],
  wing:{sLE:22.3,cSide:13.47,zr:1.3,zk:10.0,zt:29.5,le:36,teIn:0,teOut:22.5,y0:-1.7,dih:5.5,flex:.0012,tr:.155,tt:.095},
  tip:{type:'curve',sky:true,cant:60,rad:2.99,h:.58,cTop:.5,sweep:51,part:null},
  fsf:[7.86,12.75,17.02],fsfLen:5.0,fsfR:.27,fsfProt:1.1,
  belly:{s0:19.2,s1:42.8,y:-2.25,b:1.2,c:3.1},
  /* 화물문: 윗변은 객실 바닥 높이(중심선 아래 ≈0.85 m) · 큰 문은 아래로 ≈2.6 m까지, 벌크 도어는 0.95 × 0.8 m */
  patches:[{s0:10.23,s1:13.13,yTop:-.85,yBot:-2.6,side:1,part:'fcd'},{s0:45.88,s1:48.73,yTop:-.85,yBot:-2.6,side:1,part:'acd'},
           {s0:49.52,s1:50.46,yTop:-1.0,yBot:-1.8,side:-1,part:'bcd'}],
  ht:{sLE:57.2,z0:.6,span:9.4,cr:6.2,ct:2.46,sw:37,dih:6,y:.8},
  vt:{sLE:54.48,y0:2.5,h:9.42,cr:7.79,ct:3.04,sw:44},
  eng:{sIn:21.97,z:10.5,r:1.95,len:8.0,y:-2.3,blades:22},
  hero:{yaw:.61,el:.24},
  beats:[{k:'fcd',yaw:.34,el:-.1,box:[[7.5,-3.4,1],[15.5,.6,3.2]],m:1.7},
         {k:'acd',yaw:-.2,el:-.1,box:[[43.5,-3.4,1],[51,.6,3.2]],m:1.7},
         {k:'bcd',yaw:Math.PI+.6,el:-.08,box:[[46.5,-2.8,-3.2],[53,.4,-1]],m:1.15}]
});

/* 보잉 AH-6i 경공격헬기(태국 육군) — 동체(대한항공 제작, 달걀형 포드) */
TYPES['ah6']=()=>{
  const g=new THREE.Group(),parts={},all=[];
  const add=(m,part)=>{m.castShadow=true;m.receiveShadow=true;g.add(m);all.push(m);if(part)(parts[part]=parts[part]||[]).push(m);return m};
  const F={L:4.0,W:.70,H:.95,Hb:.85,x0:2.0,nose:{len:1.6,tipY:-.2,aT:1.25,aB:2.3,aW:1.85},tail:{len:1.9,endY:.42,endR:.24,pT:1.3,pB:.95,pW:1.25,cap:.1}};
  const TW=1024,TH=512,cv=document.createElement('canvas');cv.width=TW;cv.height=TH;const c=cv.getContext('2d');const X=s=>s/F.L*TW,Y=th=>(1-th/TAU)*TH;
  const rv=document.createElement('canvas');rv.width=TW;rv.height=TH;const r=rv.getContext('2d');
  const both=(fill,fn)=>{c.fillStyle=fill;fn(c);r.fillStyle='rgb(15,15,15)';fn(r)};
  c.fillStyle='#59634D';c.fillRect(0,0,TW,TH);r.fillStyle='rgb(153,153,153)';r.fillRect(0,0,TW,TH);
  both('#12181D',k=>band(k,X(.04),X(1.45),-.55,Math.PI+.55,TH));
  c.fillStyle='#4A5340';c.fillRect(X(.04),Y(Math.PI/2)-5,X(1.41),10);
  for(const sd of [1,-1]){const th0=sd>0?.06:Math.PI-.78,th1=sd>0?.78:Math.PI-.06;both('#12181D',k=>band(k,X(1.6),X(2.45),th0,th1,TH))}
  c.fillStyle='rgba(20,24,20,.55)';for(const sx of [1.52,2.55])band(c,X(sx),X(sx)+3,-.5,Math.PI+.5,TH);
  const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;const rtex=new THREE.CanvasTexture(rv);
  const olive=()=>paint(0x59634D,{rough:.62,cc:.12,ccr:.4});
  const fm=paint(0xFFFFFF,{map:tex,rough:1,cc:.35,ccr:.1});fm.roughnessMap=rtex;add(new THREE.Mesh(fuselage({...F,ns:120,nt:96}),fm),'fus');
  /* 꼬리 붐 3.5 m · T꼬리 · 아래 핀 · 4엽 꼬리 로터(왼쪽) */
  const boom=add(new THREE.Mesh(latheX([[0,.225],[-3.5,.125]].reverse(),32),olive()));boom.position.set(-1.9,.47,0);boom.rotation.z=.04;
  const hs=[];for(let k=0;k<=6;k++){const u=k/6;hs.push({p:[-5.12,1.0,lerp(.05,.9,u)],c:.42,t:.12,m:0})}const hg=lofted(hs);add(new THREE.Mesh(hg,olive()));add(new THREE.Mesh(mirrorZ(hg),olive()));
  for(const sg of [1,-1]){const ep=[];for(let k=0;k<=4;k++){const u=k/4;ep.push({p:[-5.05-u*.08,lerp(.8,1.3,u),.91*sg],c:.38,t:.1,m:0,n:[0,0,1]})}add(new THREE.Mesh(lofted(ep,{flip:true}),olive()))}
  const vf=[];for(let k=0;k<=6;k++){const u=k/6;vf.push({p:[-4.9-u*.35,lerp(.52,1.05,u),0],c:lerp(.62,.45,u),t:.12,m:0,n:[0,0,1]})}add(new THREE.Mesh(lofted(vf,{flip:true}),olive()));
  const vl=[];for(let k=0;k<=4;k++){const u=k/4;vl.push({p:[-5.0-u*.25,lerp(.45,-.05,u),0],c:lerp(.5,.3,u),t:.12,m:0,n:[0,0,1]})}add(new THREE.Mesh(lofted(vl),olive()));
  const tr=new THREE.Group();tr.position.set(-5.45,.72,-.2);for(let k=0;k<2;k++){const b=new THREE.Mesh(new THREE.BoxGeometry(.08,1.4,.018),M.dark());b.rotation.z=k*Math.PI/2;tr.add(b)}   /* 4엽(두 막대가 가로지름) */g.add(tr);tr.traverse(m=>{if(m.isMesh){m.castShadow=true;all.push(m)}});
  /* 주 로터: 마스트 · 허브 · 6엽(지름 8.35 m) — 회전은 쇼케이스에서 */
  const mast=add(new THREE.Mesh(new THREE.CylinderGeometry(.08,.12,.55,24),M.dark()));mast.position.set(.1,F.H+.22,0);
  const rotor=new THREE.Group();rotor.position.set(.1,F.H+.52,0);g.add(rotor);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.26,.28,.15,32),M.dark());rotor.add(hub);all.push(hub);
  for(let k=0;k<6;k++){const a=k/6*TAU+.2;const bl=[];for(let j=0;j<=6;j++){const u=j/6,rr0=lerp(.28,4.17,u);bl.push({p:[Math.cos(a)*rr0+Math.sin(a)*.08,-u*u*.1,Math.sin(a)*rr0-Math.cos(a)*.08],c:.17,t:.1,m:.01,a:[-Math.sin(a),0,Math.cos(a)]})}
    const b=new THREE.Mesh(lofted(bl,{N:14}),paint(0x2B2F2C,{rough:.55,cc:.1}));b.castShadow=true;rotor.add(b);all.push(b)}
  /* 스키드(폭 2.0 m) · 무장 지지대(MWSS) · 로켓 포드 · 기수 EO/IR 터릿 */
  for(const sg of [1,-1]){add(new THREE.Mesh(tube([[1.62,-.98,1.0*sg],[1.38,-1.22,1.0*sg],[.5,-1.26,1.0*sg],[-1.2,-1.26,1.0*sg]],.045,48,12),M.dark()));
    for(const sx of [.75,-.75])add(new THREE.Mesh(tube([[sx,-.58,.34*sg],[sx,-.84,.74*sg],[sx,-1.26,1.0*sg]],.04,24,10),M.dark()))}
  add(new THREE.Mesh(tube([[.35,-.52,-1.62],[.35,-.52,1.62]],.05,8,10),M.dark()));
  for(const sg of [1,-1]){const pd=add(new THREE.Mesh(latheX([[0,.02],[-.22,.16],[-1.35,.17],[-1.45,.11]].reverse(),28),olive()));pd.position.set(1.0,-.7,1.52*sg)}
  const tur=add(new THREE.Mesh(new THREE.SphereGeometry(.17,32,16),M.dark()));tur.position.set(1.72,-.5,0);
  const ex=add(new THREE.Mesh(latheX([[0,.11],[-.35,.09]].reverse(),20),M.dark()));ex.position.set(-1.6,.74,0);
  return {group:g,parts,all,F,rotor,hero:{yaw:2.4,el:.2},beats:[{k:'fus',yaw:2.25,el:.18,box:[V([-2.1,-1.1,-.8]),V([2.1,1.2,.8])],m:1.3,anchor:V([.35,.35,-.72])}]};
};

export function build(key){return TYPES[key]()}
export const KEYS=Object.keys(TYPES);
