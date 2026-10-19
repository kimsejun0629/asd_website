/* 메인 AI 장(흉상) 신경 신호 → window.SW.ai
   흉상 드론끼리 가까운 8대를 잇는 연결망을 만들고, '생각'이 나면 신호가 드론에서 드론으로 건너가며 가지를 침
   (줄기 몇 개가 관성 · 바깥 쪽으로 굽이치며 나아가고 곁가지가 짧게 갈라짐). 지나간 길은 금색 실선, 신호를 받은 드론은 반짝임
   다 퍼지면 '깨달음': 그 생각이 지나간 길 전체가 한꺼번에 다시 빛났다 사라짐(연결망이 한 장의 지도로 읽히게)
   생각: 처음 모인 직후 이마에서 · 그 뒤 5.5~7.5초마다 머리 위쪽 아무 곳에서 · 커서가 닿거나 누른 드론에서(swarm.js가 think)
   쉴 때도 짧은 불꽃(2~6번 건넘)이 드문드문 — 연결망이 늘 살아 있게
   swarm.js가 씀: step(t) → glow[i](0~1) · lines(...)(선분 수). 순서: swarm-gl → 이 파일 → swarm */
(()=>{
'use strict';
const SW=window.SW;
if(!SW)return;
const K=8,CELL=.05,RMAX=.1;   /* 이웃 수 · 격자 칸 · 이웃 최대 거리(흉상 좌표) */
const V=1.15,LIFE=1.5,SYNC=1.9;   /* 신호 속도(흉상 좌표/초) · 지나간 선이 사라지는 시간 · 깨달음 빛 길이 */
const T0=2.2;   /* 첫 생각(처음 모인 직후) */
const GOLD=[194,166,115].map(v=>v/255),CREAM=[192,183,171].map(v=>v/255);

/* P: 흉상 점(xyz) · T: 밝기(먼지 < .6) · n: 드론 수(앞 n점 = 드론 i) */
function make(P,T,n){
  const ok=new Uint8Array(n),NB=new Int32Array(n*K).fill(-1);
  for(let i=0;i<n;i++)ok[i]=T[i]>.6&&P[i*3+1]>-.72?1:0;   /* 먼지 · 흘러내린 아래 끝은 빼고 */
  /* 연결망: 격자로 가까운 점을 찾아 가까운 순 K개 */
  const key=(x,y,z)=>((x+64)*128+(y+64))*128+(z+64),G=new Map(),cl=v=>Math.floor(v/CELL);
  for(let i=0;i<n;i++){if(!ok[i])continue;const k=key(cl(P[i*3]),cl(P[i*3+1]),cl(P[i*3+2]));let a=G.get(k);if(!a)G.set(k,a=[]);a.push(i)}
  const bd=new Float32Array(K);
  for(let i=0;i<n;i++){
    if(!ok[i])continue;
    const x=P[i*3],y=P[i*3+1],z=P[i*3+2],cx=cl(x),cy=cl(y),cz=cl(z);bd.fill(RMAX*RMAX);
    for(let a=-1;a<2;a++)for(let b=-1;b<2;b++)for(let c=-1;c<2;c++){
      const L=G.get(key(cx+a,cy+b,cz+c));if(!L)continue;
      for(const j of L){if(j===i)continue;const dx=P[j*3]-x,dy=P[j*3+1]-y,dz=P[j*3+2]-z,d=dx*dx+dy*dy+dz*dz;
        if(d>=bd[K-1])continue;let s=K-1;while(s>0&&bd[s-1]>d){bd[s]=bd[s-1];NB[i*K+s]=NB[i*K+s-1];s--}bd[s]=d;NB[i*K+s]=j}
    }
  }
  const glow=new Float32Array(n),FT=new Float32Array(n).fill(-99),FW=new Float32Array(n),FP=new Int32Array(n).fill(-1),SEEN=new Int32Array(n);
  const AL=new Int32Array(n),IN=new Uint8Array(n),SY=new Float32Array(n);let na=0;   /* 최근 6초에 신호를 받은 드론만 돎 · 깨달음 빛(프레임마다) */
  const act=i=>{if(!IN[i]){IN[i]=1;AL[na++]=i}};
  const CN=new Int32Array(256),CE=new Float32Array(256).fill(-99),CB=new Uint8Array(256),CG=new Float32Array(256);   /* 생각마다(번호 & 255): 남은 신호 수 · 다 퍼진 시각 · 큰 생각(깨달음 있음) · 아래로 끄는 힘(머리 → 목 → 어깨) */
  let Q=[],cid=0,last=-1,nAuto=T0,nSpark=T0+1;
  const sync=i=>{const a=t_-CE[SEEN[i]&255];return a<0||a>SYNC?0:Math.min(1,a/.06)*Math.exp(-a*1.9)};   /* 깨달음 빛(0~1) */
  let t_=0;

  /* i에서 방향(dx,dy,dz)으로 한 번 건넘: 관성 · 출발점에서 멀어지는 쪽 · 잡음으로 이웃을 고르고 도착 시각을 정함 */
  function hop(i,dx,dy,dz,life,w,c,o,t){
    const x=P[i*3],y=P[i*3+1],z=P[i*3+2],ox=P[o*3],oy=P[o*3+1],oz=P[o*3+2],r0=Math.hypot(x-ox,y-oy,z-oz);
    let bj=-1,bs=-9,bl=1;
    for(let s=0;s<K;s++){const j=NB[i*K+s];if(j<0)break;if(SEEN[j]===c)continue;
      const ex=P[j*3]-x,ey=P[j*3+1]-y,ez=P[j*3+2]-z,l=Math.hypot(ex,ey,ez)||1;
      const sc=(ex*dx+ey*dy+ez*dz)/l*.7+(Math.hypot(P[j*3]-ox,P[j*3+1]-oy,P[j*3+2]-oz)-r0)/l*.4-ey/l*CG[c&255]+Math.random()*.35;
      if(sc>bs){bs=sc;bj=j;bl=l}}
    if(bj<0)return;
    SEEN[bj]=c;CN[c&255]++;
    Q.push({i:bj,p:i,t0:t,t1:t+bl/V*(.75+Math.random()*.5),w,life,c,o,dx:(P[bj*3]-x)/bl,dy:(P[bj*3+1]-y)/bl,dz:(P[bj*3+2]-z)/bl});
  }
  function fire(e){
    FT[e.i]=e.t1;FW[e.i]=e.w;FP[e.i]=e.p;act(e.i);
    const k=e.c&255;CN[k]--;
    if(e.life>0){
      hop(e.i,e.dx,e.dy,e.dz,e.life-1,e.w,e.c,e.o,e.t1);
      if(e.life>4&&Math.random()<.16){   /* 곁가지: 방향을 크게 틀어 짧게 */
        const rx=Math.random()-.5,ry=Math.random()-.5,rz=Math.random()-.5;
        hop(e.i,e.dx+rx*2.2,e.dy+ry*2.2,e.dz+rz*2.2,Math.min(e.life-1,5+Math.random()*14|0),e.w*.8,e.c,e.o,e.t1);
      }
    }
    if(CN[k]<=0&&CB[k])CE[k]=e.t1+.12;   /* 마지막 신호가 닿음 → 깨달음 */
  }
  /* 생각 하나: o에서 줄기 tr개(방향은 고르게 흩음) */
  function think(o,t,tr,life,w,big,gv){
    if(o<0||!ok[o])return;
    const c=++cid,k=c&255;SEEN[o]=c;FT[o]=t;FW[o]=w;FP[o]=-1;act(o);CN[k]=0;CE[k]=-99;CB[k]=big?1:0;CG[k]=gv||0;
    const a0=Math.random()*6.283;
    for(let k=0;k<tr;k++){const a=a0+k/tr*6.283,u=Math.random()*2-1;hop(o,Math.cos(a),u,Math.sin(a),life*(.7+Math.random()*.5)|0,w,c,o,t)}
  }
  const pickOk=f=>{for(let k=0;k<40;k++){const i=Math.random()*n|0;if(ok[i]&&f(i))return i}return -1};
  const nearest=(x,y,z)=>{let b=-1,bd2=1e9;for(let i=0;i<n;i++){if(!ok[i])continue;const d=(P[i*3]-x)**2+(P[i*3+1]-y)**2+(P[i*3+2]-z)**2;if(d<bd2){bd2=d;b=i}}return b};

  return {
    glow,
    ok:i=>ok[i]===1,
    /* 커서 · 누름: 그 드론에서 생각 — 다음 저절로 생각은 미룸 */
    touch(i,t){think(i,t,4,50,1,1,.1);nAuto=Math.max(nAuto,t+4.5)},
    step(t){
      if(last>=0&&t-last>.5){Q=[];CN.fill(0);nAuto=Math.max(nAuto,t+1.5);nSpark=t+.5}   /* 쉬다 돌아오면 밀린 신호를 버림(한꺼번에 터지지 않게) */
      last=t_=t;
      if(t>=nAuto){const first=nAuto===T0;think(first?nearest(0,.62,.32):pickOk(i=>P[i*3+1]>.42&&P[i*3+2]>-.15),t,first?8:6,first?90:64,1,1,.32);nAuto=t+5.5+Math.random()*2}
      if(t>=nSpark){think(pickOk(i=>P[i*3+1]>-.4),t,1,2+Math.random()*5|0,.55,0);nSpark=t+.15+Math.random()*.3}
      for(let q=0;q<Q.length;){const e=Q[q];if(e.t1<=t){Q[q]=Q[Q.length-1];Q.pop();fire(e)}else q++}
      let m=0;
      for(let q=0;q<na;q++){const i=AL[q],a=t-FT[i];
        if(a>6){IN[i]=0;glow[i]=SY[i]=0;continue}
        AL[m++]=i;SY[i]=sync(i);glow[i]=Math.max(a>2?0:FW[i]*(.85*Math.exp(-a*7)+.3*Math.exp(-a*1.8)),SY[i]*.7)}   /* 번쩍 → 은은한 잔광 · 깨달음 */
      na=m;
    },
    /* 선분(드론 위치 buf, 칸 ST · 마주 보는 정도 fc · 세기 m) → out에 [ax ay az bx by bz r g b a] × 수, 수를 돌려줌 */
    lines(buf,ST,fc,t,m,out){
      let s=0;const cap=out.length/10;
      const put=(p,i,f,a)=>{
        if(s>=cap||a<.01)return;
        const v=a*m*(.25+.75*Math.min(1,Math.max(0,(Math.min(fc[p],fc[i])+.35)/.5))),o=s*10,pb=p*ST,ib=i*ST;
        out[o]=buf[pb];out[o+1]=buf[pb+1];out[o+2]=buf[pb+2];
        out[o+3]=buf[pb]+(buf[ib]-buf[pb])*f;out[o+4]=buf[pb+1]+(buf[ib+1]-buf[pb+1])*f;out[o+5]=buf[pb+2]+(buf[ib+2]-buf[pb+2])*f;
        const g=Math.min(1,a*1.2);out[o+6]=GOLD[0]+(CREAM[0]-GOLD[0])*(1-g);out[o+7]=GOLD[1]+(CREAM[1]-GOLD[1])*(1-g);out[o+8]=GOLD[2]+(CREAM[2]-GOLD[2])*(1-g);out[o+9]=v;s++;
      };
      for(let q=0;q<na;q++){const i=AL[q],p=FP[i],a=t-FT[i];if(p<0||a<0)continue;const f=Math.max(0,1-a/LIFE),v=Math.max(FW[i]*f*f*.9,SY[i]*.8);if(v>.01)put(p,i,1,v)}
      for(const e of Q)if(t>e.t0)put(e.p,e.i,Math.min(1,(t-e.t0)/(e.t1-e.t0)),e.w);   /* 건너가는 중인 신호 — 선이 자라남 */
      return s;
    }
  };
}
SW.ai=make;
})();
