/* 항공기체 3D — 도장 · 텍스처: 대한항공 2025 도장 팔레트(KE) · 재질(paint · M) · 동체 도장 캔버스(livery) · 날개 표면(wingMat) · 꼬리 태극(finPaint) · 로고타입
   aero · aero-en: a3d.js → a3d-craft.js가 불러옴(a3d-geo · a3d-sym과 함께 깊이 3) · 최상위에서는 정의만(캔버스 · 텍스처는 build() 안에서 만듦)
   형상 · 조립 · 기종 제원(airliner · TYPES)은 a3d-craft.js */
import * as THREE from 'three';
import {clamp,lerp,smooth} from './a3d-geo.js?v=refactor-d1';
import {drawSym} from './a3d-sym.js?v=refactor-d1';

const TAU=Math.PI*2;

/* ── 재질: 대한항공 새 도장(2025.3 공개, 787-10 HL8515 실사 기준)
   메탈릭 블루(#53AAE2, 아크조노벨 특수 도료) 동체 · 꼬리날개 전체 / 흰 배(기수 쪽은 거의 끝까지 파랑, 꼬리 쪽으로 곡선을 그리며 올라감)
   'KOREAN' 로고타입(짙은 남색 #051766, 동체 높이의 38%, 1번 문 뒤 ~ 2번 문 앞, 창문 줄이 글자를 지나감) · 꼬리 · 엔진에 새 태극(리본형, 남색 단색) ── */
const KE={sky:'#53AAE2',lower:'#F3F4F5',navy:'#051766',wing:0xC4C8CC,nacelle:0xF1F2F3};
function paint(color,{map=null,rough=.3,metal=0,cc=1,ccr=.1,spec=.8}={}){return new THREE.MeshPhysicalMaterial({color,map,roughness:rough,metalness:metal,clearcoat:cc,clearcoatRoughness:ccr,specularIntensity:spec})}
const M={
  sky:()=>paint(0x53AAE2,{rough:.28,metal:.42,cc:1,ccr:.06}),
  wing:()=>paint(KE.wing,{rough:.42,metal:.12,cc:.5,ccr:.22}),
  metal:()=>paint(0xD0D4D8,{rough:.22,metal:1,cc:0}),
  dark:()=>paint(0x23282D,{rough:.5,metal:.3,cc:.2}),
  fan:()=>paint(0x3A3F44,{rough:.3,metal:1,cc:0}),
  nacelle:()=>paint(KE.nacelle,{rough:.28}),
  grey:()=>paint(0xAEB4BA,{rough:.36}),
  lower:()=>paint(0xF3F4F5,{rough:.3}),
};

/* ── 캔버스 도우미 ── */
function band(g,x0,x1,a,b,TH){const Y=th=>(1-th/TAU)*TH;if(a<0){band(g,x0,x1,0,b,TH);band(g,x0,x1,TAU+a,TAU,TH);return}g.fillRect(x0,Y(b),x1-x0,Y(a)-Y(b))}
function rr(g,x,y,w,h,r){r=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}

/* 엔진 카울 옆 작은 태극(새 태극 · 남색) */
function taegeukTex(){const S=512,cv=document.createElement('canvas');cv.width=cv.height=S;const g=cv.getContext('2d');drawSym(g,S/2,S/2,S*.47,KE.navy);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t}
/* 로고타입: 사이트 글꼴 한진그룹체(HanjinGroupSans Bold) — 넉넉한 캔버스에 쓴 뒤 실제 잉크 영역만 잘라 씀(양 끝이 잘리지 않고, 잉크 높이 = 대문자 높이) */
function logotype(text,px,color,ratio=6.1){const font=`700 ${px}px "HanjinGroupSans","Apple SD Gothic Neo",Arial,sans-serif`;
  const cv=document.createElement('canvas'),g=cv.getContext('2d');g.font=font;
  /* 간격: 잉크 길이 ≈ ratio × 대문자 높이(실측 로고 6.04~6.1) — 글자를 늘리지 않고 자간으로 맞춤 */
  const m=g.measureText('K'),cap=(m.actualBoundingBoxAscent||px*.72),gw=[...text].map(ch=>g.measureText(ch).width),W0=gw.reduce((a,b)=>a+b,0);
  const sp=Math.max(px*.02,(ratio*cap-W0*.97)/(text.length-1));let w=W0+sp*(text.length-1);
  cv.width=Math.ceil(w+px*.8);cv.height=Math.ceil(px*1.6);g.font=font;g.fillStyle=color;g.textBaseline='alphabetic';let x=px*.4;[...text].forEach((ch,i)=>{g.fillText(ch,x,px*1.2);x+=gw[i]+sp})
  const d=g.getImageData(0,0,cv.width,cv.height).data;let x0=cv.width,x1=0,y0=cv.height,y1=0;
  for(let y=0;y<cv.height;y++)for(let xx=0;xx<cv.width;xx++)if(d[(y*cv.width+xx)*4+3]>8){if(xx<x0)x0=xx;if(xx>x1)x1=xx;if(y<y0)y0=y;if(y>y1)y1=y}
  const out=document.createElement('canvas');out.width=x1-x0+1;out.height=y1-y0+1;out.getContext('2d').drawImage(cv,-x0,-y0);return out}

/* 흑백 맵 셋을 한 장으로: 셰이더가 읽는 채널(bumpMap .r · roughnessMap .g · metalnessMap .b)만 원본에서 그대로 옮김
   원본마다 순색을 곱해(multiply) 그 채널만 남기고 검은 판에 더함(lighter) — 모두 불투명이라 값 손실 없음 · 픽셀을 읽어 오지 않아 빠르고 지문 방지 잡음도 안 섞임
   → 화면은 같고 GPU 텍스처는 셋 → 하나 · 옮긴 뒤 원본 캔버스는 비움 */
function pack(r,g,b){const W=g.width,H=g.height,o=document.createElement('canvas');o.width=W;o.height=H;const x=o.getContext('2d');x.fillStyle='#000';x.fillRect(0,0,W,H);x.globalCompositeOperation='lighter';
  [[r,'#f00'],[g,'#0f0'],[b,'#00f']].forEach(([c,k])=>{if(!c)return;const q=c.getContext('2d');q.globalCompositeOperation='multiply';q.fillStyle=k;q.fillRect(0,0,W,H);x.drawImage(c,0,0);c.width=c.height=0});
  return new THREE.CanvasTexture(o)}

/* ── 날개 표면: 앞전 금속 띠 · 스파 · 플랩/에일러론 힌지선 · 스포일러 판 · 슬랫 나눔 ──
   로프트 UV: u = 뿌리 → 끝, v = 윗면 뒷전(0) → 앞전(.5) → 아랫면 뒷전(1) · 시위 비율 xc ↔ v 변환 */
function wingTex({flapTo=.62,ailTo=.86,spoil=[.12,.6],slats=6,tipCap=true}={}){
  const TW=2048,TH=1024;const mk=()=>{const c=document.createElement('canvas');c.width=TW;c.height=TH;return c};
  const cv=mk(),rv=mk(),mv=mk(),g=cv.getContext('2d'),r=rv.getContext('2d'),m=mv.getContext('2d');
  const vU=xc=>(1-Math.acos(1-2*xc)/Math.PI)/2,vL=xc=>.5+Math.acos(1-2*xc)/Math.PI/2;const Y=v=>(1-v)*TH,X=u=>u*TW;
  g.fillStyle='#B3B8BD';g.fillRect(0,0,TW,TH);r.fillStyle='rgb(120,120,120)';r.fillRect(0,0,TW,TH);m.fillStyle='rgb(30,30,30)';m.fillRect(0,0,TW,TH);
  /* 앞전 띠(시위 9%까지) */
  const y0=Y(vL(.09)),y1=Y(vU(.09));g.fillStyle='#D3D7DA';g.fillRect(0,y0,TW,y1-y0);r.fillStyle='rgb(60,60,60)';r.fillRect(0,y0,TW,y1-y0);m.fillStyle='rgb(170,170,170)';m.fillRect(0,y0,TW,y1-y0);
  const line=(x0,y0_,x1,y1_,w=2,a=.5)=>{w*=1.5;a=Math.min(1,a*1.45);g.strokeStyle=`rgba(62,70,78,${a})`;g.lineWidth=w;g.beginPath();g.moveTo(x0,y0_);g.lineTo(x1,y1_);g.stroke();r.strokeStyle='rgb(170,170,170)';r.lineWidth=w;r.beginPath();r.moveTo(x0,y0_);r.lineTo(x1,y1_);r.stroke()};
  const hline=(v,u0=0,u1=1,w=2,a=.5)=>line(X(u0),Y(v),X(u1),Y(v),w,a);
  const cap=tipCap?.965:1;
  /* 스파 · 힌지선(윗면 · 아랫면) */
  hline(vU(.15),0,cap,1.5,.28);hline(vU(.62),0,cap,1.5,.28);hline(vU(.74),0,ailTo,2.4,.62);hline(vL(.74),0,ailTo,2,.45);hline(vU(.09),0,cap,1.6,.35);hline(vL(.09),0,cap,1.6,.3);
  /* 플랩 · 에일러론 나눔, 스포일러 판 */
  for(const u of [.02,.36,flapTo,ailTo])line(X(u),Y(vU(.74)),X(u),Y(0),2.4,.6);
  for(const u of [.36,flapTo,ailTo])line(X(u),Y(vL(.74)),X(u),Y(1),2,.45);
  hline(vU(.6),spoil[0],spoil[1],2,.5);for(let k=0;k<=6;k++){const u=lerp(spoil[0],spoil[1],k/6);line(X(u),Y(vU(.6)),X(u),Y(vU(.74)),1.6,.45)}
  for(let k=1;k<slats;k++){const u=lerp(.08,cap,k/slats);line(X(u),Y(vU(.09)),X(u),Y(vL(.09)),1.6,.35)}
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;
  const pk=pack(null,rv,mv);return {map:t,rough:pk,metal:pk};   /* 날개는 요철 맵이 없어 R은 비움 */
}
function wingMat(o){const T=wingTex(o);const m=paint(0xFFFFFF,{map:T.map,rough:1,metal:1,cc:.2,ccr:.3});m.roughnessMap=T.rough;m.metalnessMap=T.metal;return m}

/* ── 동체 도장 ── 가로 = s(기수 → 꼬리), 세로 = 둘레 각 θ(0 = 우현 수평, π/2 = 위), 캔버스 y = (1 − θ/2π)·높이 */
function livery(F,sp){
  const TW=4096,TH=1024,cv=document.createElement('canvas');cv.width=TW;cv.height=TH;const g=cv.getContext('2d');
  const R=(F.W+F.H)/2,pxm=TW/F.L,pym=TH/(TAU*R);                 /* 가로 · 세로 1 m당 픽셀 */
  const X=s=>s*pxm,Y=th=>(1-th/TAU)*TH;
  g.fillStyle=sp.lower;g.fillRect(0,0,TW,TH);
  /* 메탈릭 맵(파랑만 금속 느낌) */
  const mv=document.createElement('canvas');mv.width=TW;mv.height=TH;const mg=mv.getContext('2d');mg.fillStyle='rgb(10,10,10)';mg.fillRect(0,0,TW,TH);
  /* 파랑/흰 경계: s마다 sinθ 값 — 기수 끝은 전부 파랑, 앞쪽에서 아래로 내려앉았다가, 날개 뒤부터 꼬리 끝으로 곡선을 그리며 올라감 */
  const cv0=sp.curve||{};const nose=cv0.nose??.05,noseEnd=cv0.noseEnd??.15,mid=cv0.mid??-.62,t0=cv0.tail0??.6,tailV=cv0.tail??.12;
  const sb=s=>{const t=s/F.L;if(t<nose)return -1;if(t<noseEnd)return lerp(-1,mid,smooth((t-nose)/(noseEnd-nose)));if(t<t0)return mid;return lerp(mid,tailV,Math.pow(smooth((t-t0)/(1-t0)),.85))};
  g.fillStyle=sp.upper;mg.fillStyle='rgb(150,150,150)';
  for(let x=0;x<TW;x+=2){const b=Math.asin(clamp(sb((x+1)/pxm),-1,1));band(g,x,x+2,b,Math.PI-b,TH);band(mg,x,x+2,b,Math.PI-b,TH)}
  /* 로고타입: 창문보다 먼저(창문 줄이 글자 위로 지나감) */
  /* 도장 이음(θ=0, 오른쪽 옆면)을 가로지르는 그림은 위아래로 한 번 더 그려 이어지게(오른쪽 글자 아래가 잘리던 문제) */
  const wrap=fn=>{for(const dy of [0,TH,-TH]){g.save();g.translate(0,dy);fn();g.restore()}};
  const stamp=(img,sC,sinY,capM,wM)=>{const ky=capM*pym/img.height,kx=(wM?wM*pxm:capM*pxm*img.width/img.height)/img.width;for(const side of [1,-1]){const th=side>0?Math.asin(sinY):Math.PI-Math.asin(sinY);
    wrap(()=>{g.translate(X(sC),Y(th));if(side>0)g.scale(-1,1);else g.scale(1,-1);g.scale(kx,ky);g.drawImage(img,-img.width/2,-img.height/2)})}};
  if(sp.word&&!sp.plain){const img=logotype('KOREAN',320,KE.navy,sp.word.ratio||6.1);const cap=sp.word.cap??(.38*(F.H+F.Hb));const len=cap*img.width/img.height;stamp(img,sp.word.s0+len/2,sp.word.y??sp.win.y,cap,null)}
  /* 창문 */
  const winTh=[Math.asin(sp.win.y),Math.PI-Math.asin(sp.win.y)];
  const skip=(sp.doors||[]).map(d=>[d-.75,d+.75]).concat(sp.winSkip||[]);
  for(const th of winTh)for(let s=sp.win.s0;s<=sp.win.s1;s+=sp.win.pitch){if(skip.some(([p,q])=>s>p&&s<q))continue;
    const ww=sp.win.w*pxm,hh=sp.win.h*pym;g.fillStyle='#17212C';rr(g,X(s)-ww/2,Y(th)-hh/2,ww,hh,Math.min(ww,hh)*.42);g.fill()}
  /* 문 윤곽(승객문 · 화물문) */
  g.strokeStyle='rgba(46,58,70,.5)';g.lineWidth=2.4;
  const door=(s,thC,wm,hm)=>{const ww=wm*pxm,hh=hm*pym;wrap(()=>{rr(g,X(s)-ww/2,Y(thC)-hh/2,ww,hh,ww*.16);g.stroke()})};
  for(const d of sp.doors||[])for(const th of winTh)door(d,th+(th<Math.PI/2?-.05:.05),1.07,1.9);
  for(const c of sp.cargo||[])door(c.s,c.side==='L'?Math.PI+c.th:TAU-c.th,c.w,c.h);
  for(const e of sp.exits||[])for(const th of winTh)door(e,th+(th<Math.PI/2?-.02:.02),.52,1.0);
  /* 거칠기 맵: 도장 .3 · 유리(객실 창 · 조종석) .06 */
  const rv=document.createElement('canvas');rv.width=TW;rv.height=TH;const rg=rv.getContext('2d');rg.fillStyle='rgb(77,77,77)';rg.fillRect(0,0,TW,TH);
  rg.fillStyle='rgb(15,15,15)';for(const th of winTh)for(let s=sp.win.s0;s<=sp.win.s1;s+=sp.win.pitch){if(skip.some(([p,q])=>s>p&&s<q))continue;const ww=sp.win.w*pxm,hh=sp.win.h*pym;rr(rg,X(s)-ww/2,Y(th)-hh/2,ww,hh,Math.min(ww,hh)*.42);rg.fill()}
  /* 조종석 창: 앞 유리 → 옆 창이 한 줄로 이어짐 — 아래 문턱은 일정한 높이, 위 끝은 기수 쪽으로 낮아지고, 뒤 끝은 위로 갈수록 뒤로 · 기둥은 얇게 */
  if(sp.cockpit){const c=sp.cockpit;
    const quad=(side,u0,u1)=>{/* u: 0 = 가운데 기둥(위) → 1 = 옆 창 끝 */const P=u=>{const th=Math.PI/2-side*lerp(c.th0,c.th1,u);return th};
      const sf=u=>lerp(c.sF0,c.sF1,u),sb=u=>lerp(c.sB0,c.sB1,u);const n=10,pts=[];
      for(let k=0;k<=n;k++){const u=lerp(u0,u1,k/n);pts.push([X(sf(u)),Y(P(u))])}for(let k=n;k>=0;k--){const u=lerp(u0,u1,k/n);pts.push([X(sb(u)),Y(P(u))])}return pts};
    const fill=(ctx,pts)=>{ctx.beginPath();ctx.moveTo(...pts[0]);for(const q of pts)ctx.lineTo(...q);ctx.closePath();ctx.fill()};
    if(sp.mask){/* A350: 창 둘레 검은 마스크(뒤 끝은 위로 갈수록 뒤로 휘어 뾰족하게) */g.fillStyle='#0E1215';for(const side of [1,-1]){const m={...c,sF0:c.sF0-.25,sF1:c.sF1-.25,sB0:c.sB0+.35,sB1:c.sB1+.9,th0:c.th0-.06,th1:c.th1+.1};const pts=[];
      const P=u=>Math.PI/2-side*lerp(m.th0,m.th1,u);for(let k=0;k<=12;k++){const u=k/12;pts.push([X(lerp(m.sF0,m.sF1,u)),Y(P(u))])}for(let k=12;k>=0;k--){const u=k/12;pts.push([X(lerp(m.sB0,m.sB1,u)+.5*Math.sin(Math.PI*u)),Y(P(u))])}fill(g,pts)}}
    for(const side of [1,-1]){const cuts=[0,...c.posts,1];for(let k=0;k<cuts.length-1;k++){const a0=cuts[k]+(k?c.gap:0),a1=cuts[k+1]-c.gap;const pts=quad(side,a0,a1);g.fillStyle='#0B1015';fill(g,pts);rg.fillStyle='rgb(12,12,12)';fill(rg,pts)}}}
  /* 범프맵: 섹션 이음(둘레 방향) · 세로 겹침 이음 · 창 테두리 — 도장 위에 아주 얕게 */
  const bv=document.createElement('canvas');bv.width=TW;bv.height=TH;const b=bv.getContext('2d');b.fillStyle='rgb(128,128,128)';b.fillRect(0,0,TW,TH);
  b.strokeStyle='rgb(92,92,92)';b.lineWidth=2;
  for(const s of sp.joints||[]){b.beginPath();b.moveTo(X(s),0);b.lineTo(X(s),TH);b.stroke()}
  for(const th of [.55,Math.PI-.55,-.45+TAU,Math.PI+.45]){b.beginPath();b.moveTo(0,Y(th));b.lineTo(TW,Y(th));b.stroke()}
  b.strokeStyle='rgb(104,104,104)';b.lineWidth=1.5;
  for(const th of winTh)for(let s=sp.win.s0;s<=sp.win.s1;s+=sp.win.pitch){if(skip.some(([p,q])=>s>p&&s<q))continue;const ww=sp.win.w*pxm*1.5,hh=sp.win.h*pym*1.35;rr(b,X(s)-ww/2,Y(th)-hh/2,ww,hh,Math.min(ww,hh)*.45);b.stroke()}
  b.strokeStyle='rgb(84,84,84)';b.lineWidth=2.6;for(const d of sp.doors||[])for(const th of winTh){const ww=1.07*pxm,hh=1.9*pym;const thC=th+(th<Math.PI/2?-.05:.05);rr(b,X(d)-ww/2,Y(thC)-hh/2,ww,hh,ww*.16);b.stroke()}
  for(const c of sp.cargo||[]){const ww=c.w*pxm,hh=c.h*pym,thC=c.side==='L'?Math.PI+c.th:TAU-c.th;rr(b,X(c.s)-ww/2,Y(thC)-hh/2,ww,hh,ww*.16);b.stroke()}
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;const pk=pack(bv,rv,mv);t.userData={bump:pk,metal:pk,rough:pk};return t;
}

/* 꼬리날개에 새 태극을 표면 그대로 칠함(평면 스티커는 곡면에서 떠 보임):
   날개 격자의 UV마다 실제 표면 위치(x, y, z)를 보간해, 옆에서 본 좌표로 태극 그림을 샘플 — 양쪽 모두 원래 방향(뒤집히지 않게) */
function finPaint(geo,sym,base,navy){
  const TU=256,TV=1024,pos=geo.attributes.position,cols=89,rows=pos.count/cols;
  const S=512,sc=document.createElement('canvas');sc.width=sc.height=S;drawSym(sc.getContext('2d'),S/2,S/2,S*.49,'#000');const sa=sc.getContext('2d').getImageData(0,0,S,S).data;
  const A=(ix,iy)=>{if(ix<0||iy<0||ix>=1||iy>=1)return 0;const fx=ix*(S-1),fy=iy*(S-1),x0=fx|0,y0=fy|0,x1=Math.min(x0+1,S-1),y1=Math.min(y0+1,S-1),tx=fx-x0,ty=fy-y0,a=(x,y)=>sa[(y*S+x)*4+3]/255;
    return (a(x0,y0)*(1-tx)+a(x1,y0)*tx)*(1-ty)+(a(x0,y1)*(1-tx)+a(x1,y1)*tx)*ty};
  const cv=document.createElement('canvas');cv.width=TU;cv.height=TV;const g=cv.getContext('2d');const img=g.createImageData(TU,TV);
  const mv=document.createElement('canvas');mv.width=TU;mv.height=TV;const mg=mv.getContext('2d');const mim=mg.createImageData(TU,TV);
  const P=(i,j,k)=>pos.array[(i*cols+j)*3+k];const b=new THREE.Color(base),n=new THREE.Color(navy);const B=[b.r,b.g,b.b].map(x=>Math.round(Math.pow(x,1/2.2)*255)),Nn=[n.r,n.g,n.b].map(x=>Math.round(Math.pow(x,1/2.2)*255));
  for(let py=0;py<TV;py++){const v=1-(py+.5)/TV,fj=v*(cols-1),j0=Math.min(cols-2,fj|0),tj=fj-j0;
    for(let px=0;px<TU;px++){const u=(px+.5)/TU,fi=u*(rows-1),i0=Math.min(rows-2,fi|0),ti=fi-i0;
      const q=k=>(P(i0,j0,k)*(1-tj)+P(i0,j0+1,k)*tj)*(1-ti)+(P(i0+1,j0,k)*(1-tj)+P(i0+1,j0+1,k)*tj)*ti;
      const x=q(0),y=q(1),z=q(2),side=z>=0?1:-1;
      const ix=side>0?(x-(sym.cx-sym.D/2))/sym.D:((sym.cx+sym.D/2)-x)/sym.D,iy=((sym.cy+sym.D/2)-y)/sym.D;
      const a=A(ix,iy),o=(py*TU+px)*4;for(let k=0;k<3;k++)img.data[o+k]=Math.round(B[k]*(1-a)+Nn[k]*a);img.data[o+3]=255;
      const mt=Math.round(107*(1-a)+8*a);mim.data[o]=mim.data[o+1]=mim.data[o+2]=mt;mim.data[o+3]=255}}
  g.putImageData(img,0,0);mg.putImageData(mim,0,0);
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return {map:t,metal:new THREE.CanvasTexture(mv)};
}

export {KE,paint,M,band,taegeukTex,wingMat,livery,finPaint};
