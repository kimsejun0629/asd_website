/* 메인 AI 장(흉상) 신경 신호 → window.SW.ai
   흉상 드론끼리 가까운 8대를 잇는 연결망을 만들고, '생각'이 나면 신호가 드론에서 드론으로 건너가며 가지를 침
   (줄기 몇 개가 관성 · 바깥 쪽으로 굽이치며 나아가고 곁가지가 짧게 갈라짐). 지나간 길은 금색 실선, 신호를 받은 드론은 반짝임
   다 퍼지면 '깨달음': 그 생각이 지나간 길 전체가 한꺼번에 다시 빛났다 사라짐(연결망이 한 장의 지도로 읽히게)
   생각: 처음 모인 직후 이마에서 · 그 뒤 5.5~7.5초마다 머리 위쪽 아무 곳에서 · 커서가 닿거나 누른 드론에서(swarm.js가 think)
   쉴 때도 짧은 불꽃(2~6번 건넘)이 드문드문 — 연결망이 늘 살아 있게
   생각의 형상: 깨달음마다 그 길 위 앞을 보는 드론들 곁에 작은 기체 여러 대(3~5대 · 폰 2~3대, 기종은 7종에서 무작위로 겹치지 않게)가 엇갈려 지지직 나타났다 사라짐
   (기체 점 구름 = swarm.txt 형상 1~7의 앞 점들, 금색 점 · 화면을 보는 윗면도 · 조금 날아감). 들고 날 때 가로 띠가 어긋나는 글리치, 뒤 흉상 드론은 둥글게 흐려짐
   swarm.js가 씀: step(t) → glow[i](0~1) · lines(...)(선분 수) · glyphs(...)(점 수). 순서: swarm-gl → 이 파일 → swarm */
(()=>{
'use strict';
const SW=window.SW;
if(!SW)return;
const K=8,CELL=.05,RMAX=.1;   /* 이웃 수 · 격자 칸 · 이웃 최대 거리(흉상 좌표) */
const V=1.15,LIFE=1.5,SYNC=1.9;   /* 신호 속도(흉상 좌표/초) · 지나간 선이 사라지는 시간 · 깨달음 빛 길이 */
const T0=2.2;   /* 첫 생각(처음 모인 직후) */
const GOLD=[194,166,115].map(v=>v/255),CREAM=[192,183,171].map(v=>v/255);
const PLAT=[1,2,3,4,5,6,7],GD=1.9,GS=.12,GR=.2,GSZ={4:.85,5:1.15};   /* 생각의 형상: 기체 7종(중고도 · 스텔스 · 저피탐 · 자폭 · 787 · UH-60 · 전자전기) · 보이는 시간 · 크기(흉상 좌표, 반 길이) · 뒤 드론을 흐리게 할 반경 · 기종별 크기 배율 */
const hh=i=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x)};

/* SH: 형상들(0 흉상 — P 점 · N 법선 · T 밝기(먼지 < .6), 1~7 기체) · n: 드론 수(흉상 앞 n점 = 드론 i) */
function make(SH,n){
  const P=SH[0].P,T=SH[0].T,NN=SH[0].N;
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
    if(CN[k]<=0&&CB[k]){CE[k]=e.t1+.12;idea(e.c,CE[k])}   /* 마지막 신호가 닿음 → 깨달음 · 생각의 형상 */
  }
  /* 생각 하나: o에서 줄기 tr개(방향은 고르게 흩음) */
  function think(o,t,tr,life,w,big,gv){
    if(o<0||!ok[o])return;
    const c=++cid,k=c&255;SEEN[o]=c;FT[o]=t;FW[o]=w;FP[o]=-1;act(o);CN[k]=0;CE[k]=-99;CB[k]=big?1:0;CG[k]=gv||0;
    const a0=Math.random()*6.283;
    for(let k=0;k<tr;k++){const a=a0+k/tr*6.283,u=Math.random()*2-1;hop(o,Math.cos(a),u,Math.sin(a),life*(.7+Math.random()*.5)|0,w,c,o,t)}
  }
  /* 생각의 형상 자리: 첫 대는 이 생각이 지나간 드론, 나머지는 흉상 앞(머리 · 목 · 가슴)을 보는 드론 아무 곳 — 서로 떨어지게 */
  let IDS=[];const CAND=new Int32Array(n),dim=new Float32Array(n),BS=new Float32Array(8);   /* IDS: 떠 있는 기체들 · dim: 뒤 드론 흐림(0~1) · BS: 글리치 띠 어긋남 */
  function idea(c,t0){
    const big=n>4000,want=Math.min((big?7:4)-IDS.length,big?3+Math.random()*3|0:2+Math.random()*2|0);   /* 한 번에 3~5대(폰 2~3), 동시에 7대(폰 4)까지 */
    if(want<=0)return;
    let m=0,m0=0;
    for(let i=0;i<n;i++)if(ok[i]&&P[i*3+1]>-.5&&P[i*3+1]<.8&&NN[i*3+2]>.45){if(SEEN[i]===c){CAND[m++]=CAND[m0];CAND[m0++]=i}else CAND[m++]=i}   /* 앞 m0개 = 이 생각의 길 */
    if(!m)return;
    const L=PLAT.filter(s=>SH[s]);for(let i=L.length-1;i>0;i--){const j=Math.random()*(i+1)|0,v=L[i];L[i]=L[j];L[j]=v}   /* 기종: 겹치지 않게 섞음 */
    const far=i=>IDS.every(g=>Math.hypot(P[i*3]-P[g.a*3],P[i*3+1]-P[g.a*3+1],P[i*3+2]-P[g.a*3+2])>.34);
    for(let k=0;k<want&&k<L.length;k++){
      let a=-1;for(let r=0;r<40&&a<0;r++){const i=CAND[Math.random()*(k||!m0?m:m0)|0];if(far(i))a=i}
      if(a<0)break;
      const s=L[k],sd=Math.random()<.5?1:-1,gs=GS*(GSZ[s]||1)*(.9+Math.random()*.2),R=GR*gs/GS,ax=P[a*3],ay=P[a*3+1],az=P[a*3+2],near=[];
      for(let i=0;i<n;i++){const d=Math.hypot(P[i*3]-ax,P[i*3+1]-ay,P[i*3+2]-az);if(d<R)near.push(i,1-d/R)}
      IDS.push({s,a,gs,near,t0:t0+k*.12+Math.random()*.25,h:(sd>0?0:Math.PI)+sd*(.1+Math.random()*.35),b:sd*(.1+Math.random()*.15)});   /* 조금씩 엇갈려 나타남 */
    }
  }
  const pickOk=f=>{for(let k=0;k<40;k++){const i=Math.random()*n|0;if(ok[i]&&f(i))return i}return -1};
  const nearest=(x,y,z)=>{let b=-1,bd2=1e9;for(let i=0;i<n;i++){if(!ok[i])continue;const d=(P[i*3]-x)**2+(P[i*3+1]-y)**2+(P[i*3+2]-z)**2;if(d<bd2){bd2=d;b=i}}return b};

  return {
    glow,dim,
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
    /* 생각의 형상 → buf의 base번째 칸부터 점(최대 cap)을 써 넣고 점 수를 돌려줌. ws: 흉상 좌표 → 월드 배율 · sz: 드론 크기 · m: 세기
       점마다 나타나는 때(앞 .35초)와 사라지는 때(끝 .4초)가 다르고, 그 앞뒤 .12초는 깜빡이며 흔들림(지지직) — 나타난 뒤 흔들림은 곧 잦아듦 */
    glyphs(t,buf,base,cap,ST,m,ws,sz){
      if(!IDS.length)return 0;
      for(const g of IDS)for(let q=0;q<g.near.length;q+=2)dim[g.near[q]]=0;
      IDS=IDS.filter(g=>t-g.t0<=GD+.15);
      const G0=n>4000?300:180;let k=0;
      for(const g of IDS){
        const a=t-g.t0;if(a<0)continue;
        const nr=g.near,fd=Math.max(0,Math.min(1,a/.3,(GD+.15-a)/.4));
        for(let q=0;q<nr.length;q+=2){const v=fd*Math.min(1,nr[q+1]*1.6)*.8;if(v>dim[nr[q]])dim[nr[q]]=v}   /* 뒤 흉상 드론 흐림(겹치면 큰 쪽) */
        /* 글리치: 들어올 때 · 나갈 때 · 중간에 한 번, 가로 띠(8개)가 기수 방향으로 제멋대로 어긋남 */
        const ga=a<.45?.4*(1-a/.45)**2:a>GD-.45?.4*((a-GD+.45)/.45)**2:a>.95&&a<1.04?.16:0;
        for(let q=0;q<8;q++)BS[q]=ga&&Math.random()<.5?(Math.random()-.5)*ga*2:0;
        const sh=SH[g.s],G=Math.min(sh.n,G0),ab=g.a*ST,sc=g.gs*ws,ch=Math.cos(g.h),sn=Math.sin(g.h),cb=Math.cos(g.b),sb=Math.sin(g.b),rt=t*9;
        const ox=buf[ab]+ch*a*.05*ws,oy=buf[ab+1]+sn*a*.05*ws,oz=buf[ab+2]+.06*ws;   /* 자리: 그 드론 조금 앞 · 기수 쪽으로 천천히 */
        for(let j=0;j<G;j++){
          const ta=.35*hh(j+g.s*131),td=GD-.4*hh(j+977+g.s*131);
          let nz=0,on=1,fl=0;
          if(a<ta){if(a<ta-.12||Math.random()<.55)continue;nz=1;on=.5}   /* 들어오기 전: 깜빡이며 흔들림 */
          else if(a>td){if(a>td+.12||Math.random()<(a-td)/.12)continue;nz=1+(a-td)*8;on=.6}   /* 나가며: 깜빡이다 흩어짐 */
          else{nz=Math.exp(-(a-ta)*14);fl=Math.exp(-(a-ta)*9)}   /* 막 나타남: 번쩍 · 흔들림이 잦아듦 */
          let x=sh.P[j*3],y=sh.P[j*3+1],z=sh.P[j*3+2];
          if(sh.C[j]===3){const c=Math.cos(rt),s2=Math.sin(rt),u=x-sh.hx,w=z-sh.hz;x=sh.hx+u*c-w*s2;z=sh.hz+u*s2+w*c}   /* 로터 회전 */
          if(nz>.01){x+=(Math.random()-.5)*.18*nz;y+=(Math.random()-.5)*.18*nz;z+=(Math.random()-.5)*.18*nz}
          /* 윗면도를 화면 쪽으로: x 기수 → 화면 가로, z 오른날개 → 화면 아래, y 위 → 카메라 쪽. 기수 축으로 b만큼 기울이고 화면에서 h만큼 돌림 */
          const vy=-z*cb-y*sb,vz=-z*sb+y*cb,gx=x+BS[Math.min(7,Math.max(0,(vy+1)*4|0))],X=gx*ch-vy*sn,Y=gx*sn+vy*ch;
          const o=(base+k)*ST;
          buf[o]=ox+X*sc;buf[o+1]=oy+Y*sc;buf[o+2]=oz+vz*sc;buf[o+3]=sz*(.6+fl*.5);buf[o+4]=g.h;buf[o+5]=Math.min(1,(.55+.4*sh.T[j])*on+fl*.5);buf[o+6]=m;
          buf[o+7]=GOLD[0]+(CREAM[0]-GOLD[0])*fl;buf[o+8]=GOLD[1]+(CREAM[1]-GOLD[1])*fl;buf[o+9]=GOLD[2]+(CREAM[2]-GOLD[2])*fl;
          if(++k>=cap)return k;
        }
      }
      return k;
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
