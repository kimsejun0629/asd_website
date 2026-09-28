/* 항공기체 3D — 형상 생성기(절차적 모델링)
   단위: m · 좌표: x = 기수 방향(+), y = 위(+), z = 오른쪽 날개(우현, +)
   · 동체: 단면(위 · 아래 반높이 · 반폭)을 기수 → 꼬리로 이어 붙인 로프트
   · 날개 · 꼬리날개 · 윙렛: NACA 4자리 에어포일 단면을 스테이션마다 배치한 로프트
   · 엔진 나셀 · 페어링: x축 회전체 */
import * as THREE from 'three';

export const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
/* 초타원 사분면: t=0 → 0, t=1 → 1 (a=2면 타원) */
export const sq=(t,a)=>Math.pow(1-Math.pow(1-clamp(t),a),1/a);

/* 격자형 곡면: P(i,j) → [x,y,z,u,v] · wrap이면 j 방향 이음매 법선을 평균해 매끈하게 */
export function grid(nr,nc,P,{wrap=false,flip=false}={}){
  const pos=[],uv=[],idx=[];
  for(let i=0;i<=nr;i++)for(let j=0;j<=nc;j++){const q=P(i,j);pos.push(q[0],q[1],q[2]);uv.push(q[3],q[4])}
  const W=nc+1;
  for(let i=0;i<nr;i++)for(let j=0;j<nc;j++){const a=i*W+j,b=a+1,c=a+W,d=c+1;if(flip)idx.push(a,b,c,b,d,c);else idx.push(a,c,b,b,c,d)}
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);
  g.computeVertexNormals();
  if(wrap){const n=g.attributes.normal;for(let i=0;i<=nr;i++){const a=i*W,b=i*W+nc;const x=n.getX(a)+n.getX(b),y=n.getY(a)+n.getY(b),z=n.getZ(a)+n.getZ(b),l=Math.hypot(x,y,z)||1;n.setXYZ(a,x/l,y/l,z/l);n.setXYZ(b,x/l,y/l,z/l)}}
  return g;
}

/* 좌우 대칭 복사(z → -z) · 면 방향을 뒤집어 법선이 바깥을 향하게 */
export function mirrorZ(g0){
  const g=g0.clone();const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,-p.getZ(i));
  if(g.index){const a=g.index.array;for(let i=0;i<a.length;i+=3){const t=a[i+1];a[i+1]=a[i+2];a[i+2]=t}g.index.needsUpdate=true}
  if(g.attributes.normal){const n=g.attributes.normal;for(let i=0;i<n.count;i++)n.setZ(i,-n.getZ(i))}
  return g;
}

/* ── 동체 ──
   o: L 길이, W 반폭, H 위 반높이, Hb 아래 반높이, x0 기수 끝 x
      nose:{len, tipY, aT, aB, aW}  기수: 끝점 높이(tipY), 위 · 아래 · 옆 윤곽 초타원 지수
      tail:{len, endY, endR, pT, pB, pW, cap}  꼬리: 끝 중심 높이 · 끝 반경 · 위(내려옴) · 아래(올라감) · 폭 지수
      range:[s0,s1]  동체 일부만(부위 강조용) */
export function fuselageSection(o,s){
  const {L,W,H,Hb,nose,tail}=o;let yT=H,yB=-Hb,w=W;s=clamp(s,0,L);   /* 부동소수 오차로 끝을 넘으면 거듭제곱이 NaN이 됨 */
  if(s<nose.len){const t=s/nose.len;yT=nose.tipY+(H-nose.tipY)*sq(t,nose.aT);yB=nose.tipY+(-Hb-nose.tipY)*sq(t,nose.aB);w=W*sq(t,nose.aW)}
  const t0=L-tail.len;
  if(s>t0){const u=clamp((s-t0)/tail.len);
    yT=H+(tail.endY+tail.endR-H)*Math.pow(u,tail.pT);
    yB=-Hb+(tail.endY-tail.endR+Hb)*(1-Math.pow(1-u,tail.pB));
    w=W+(tail.endR-W)*Math.pow(u,tail.pW);
    const cap=tail.cap||0;if(cap&&s>L-cap){const k=Math.sqrt(Math.max(0,1-Math.pow((s-(L-cap))/cap,2)));const yc=(yT+yB)/2;yT=yc+(yT-yc)*k;yB=yc+(yB-yc)*k;w*=k}}
  const yM=(yT+yB)/2;return {yT,yB,w,yM,ht:yT-yM,hb:yM-yB};
}
export function fuselagePoint(o,s,th){
  const c=fuselageSection(o,s),sn=Math.sin(th),cs=Math.cos(th);
  return [o.x0-s,c.yM+(sn>=0?c.ht:c.hb)*sn,c.w*cs];
}
export function fuselage(o){
  const NS=o.ns||240,NT=o.nt||128,[r0,r1]=o.range||[0,o.L];
  const a=.62;const Sg=t=>o.L*(t-a*Math.sin(2*Math.PI*t)/(2*Math.PI));     /* 기수 · 꼬리 쪽에 단면을 촘촘하게 */
  /* range가 있으면 그 구간만 균등 분할 */
  const S=o.range?(i=>lerp(r0,r1,i/NS)):(i=>Sg(i/NS));
  return grid(NS,NT,(i,j)=>{const s=S(i),th=2*Math.PI*j/NT;const p=fuselagePoint(o,s,th);return [p[0],p[1],p[2],s/o.L,j/NT]},{wrap:true,flip:true});   /* 바깥이 앞면(부호 부피 검사로 확인) */
}

/* ── 에어포일 ── NACA 4자리(뒷전 닫힘): m 캠버, pc 최대 캠버 위치 */
function naca(x,m,pc){
  const yt=5*(.2969*Math.sqrt(x)-.126*x-.3516*x*x+.2843*x*x*x-.1036*x*x*x*x);
  let yc=0,dy=0;if(m>0){if(x<pc){yc=m/(pc*pc)*(2*pc*x-x*x);dy=2*m/(pc*pc)*(pc-x)}else{yc=m/((1-pc)*(1-pc))*((1-2*pc)+2*pc*x-x*x);dy=2*m/((1-pc)*(1-pc))*(pc-x)}}
  return {yt,yc,dy};
}
/* ── 로프트 날개 ──
   st: [{p:[x,y,z] 앞전 점, c 시위, t 두께비, a:[..] 시위 방향(기본 뒤쪽 -x), n:[..] 두께 방향(기본 위 +y), m, pc}]
   N: 한 면 점 수 · 마지막 스테이션 뒤에 끝을 닫는 작은 스테이션을 자동으로 붙임(tipCap) */
export function lofted(st0,{N=44,tipCap=true,rootCap=false,flip=false}={}){
  const V=(a,b)=>new THREE.Vector3(...(a||b));
  let st=st0.map(s=>({p:V(s.p),c:s.c,t:s.t,a:V(s.a,[-1,0,0]).normalize(),n:V(s.n,[0,1,0]).normalize(),m:s.m??.02,pc:s.pc??.4}));
  const add=(from,to,k)=>{const d=to.p.clone().sub(from.p);const e={...to,p:to.p.clone().add(d.normalize().multiplyScalar(to.c*k*.35)),c:to.c*(1-k*.25),t:to.t*.08};
    /* 끝 캡: 앞전을 시위의 12%만큼 뒤로 물려 둥근 끝을 만듦 */e.p.add(to.a.clone().multiplyScalar(to.c*.12));e.c=to.c*.76;return e};
  if(tipCap&&st.length>1){st.push(add(st[st.length-2],st[st.length-1],.18))}
  if(rootCap&&st.length>1){st.unshift(add(st[1],st[0],.18))}
  const NC=2*N;
  const xs=j=>{const q=j<=N?1-j/N:(j-N)/N;return (1-Math.cos(Math.PI*q))/2};
  return grid(st.length-1,NC,(i,j)=>{
    const s=st[i],x=xs(j),f=naca(Math.max(x,1e-6),s.m,s.pc);
    const up=j<=N?1:-1;const yy=f.yc+up*f.yt*s.t;
    const P=s.p.clone().add(s.a.clone().multiplyScalar(x*s.c)).add(s.n.clone().multiplyScalar(yy*s.c));
    return [P.x,P.y,P.z,i/(st.length-1),j/NC];
  },{flip});
}

/* x축 회전체: prof [[x, r], ...] (x 감소 방향이 뒤쪽) */
export function latheX(prof,segs=64,phi0=0,phiL=Math.PI*2){
  const pts=prof.map(([x,r])=>new THREE.Vector2(Math.max(r,1e-4),x));
  const g=new THREE.LatheGeometry(pts,segs,phi0,phiL);g.rotateZ(-Math.PI/2);return g;
}

/* 곡선을 따라 튜브 모양(스키드 · 로터 마스트 등) */
export function tube(points,r,seg=48,rs=16){
  const c=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return new THREE.TubeGeometry(c,seg,r,rs,false);
}
