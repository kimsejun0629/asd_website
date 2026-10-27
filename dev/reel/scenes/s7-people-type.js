/* 쇼릴 s7-people 도우미 — 글줄 등장 · 퇴장(가림 띠를 절대 좌표로 자름 + 표본 간격 안 번짐)
   엔진 textEach는 자르기 사각형을 글자 변위 뒤에 잡아 가림이 글자와 함께 움직임(가려지지 않음) → 여기서 줄 단위 절대 띠로 자름.
   띠 = 글줄 잉크(기준선 위 a · 아래 d) ±2px, 이동 거리 = 띠 밖으로 완전히 나가는 거리(시작 · 끝에 조각이 번쩍이지 않게).
   Chrome fillText는 세로 위치를 정수 화소로 반올림함 → 세로로 움직이는 글자는 한 자씩 구워 둔 그림을 drawImage로 그림.
   소수 위치(가로 1/1000 · 세로 1/16 화소)는 구울 때 반영하고 장치 좌표 정수 위치에 1:1로 찍음 — 보간이 없어 그리는 순서 · 캔버스 가속과 무관(결정적) */
import {C,E,W,H,clamp,glyphs,text,font} from '../engine.js';
import {blurAt} from '../blur.js';

const INK=new Map();
/* 글줄 잉크 높이(measureText 실제 경계, 줄 전체 합) */
export function ink(g,s,o){const k=o.size+'|'+(o.weight||300)+'|'+s;let v=INK.get(k);
  if(!v){g.save();g.font=font(o.size,o.weight||300);const m=g.measureText(s);v={a:m.actualBoundingBoxAscent,d:Math.max(0,m.actualBoundingBoxDescent)};g.restore();INK.set(k,v)}return v}
export const inkBand=(g,s,o,y)=>{const I=ink(g,s,o);return [Math.floor(y-I.a)-2,Math.ceil(y+I.d)+2]};
/* 이 모듈의 층 · 글자 그림은 소프트웨어 캔버스(willReadFrequently) — GPU 캔버스는 처음 쓸 때와 나중이 합성 반올림이 달라 그린 순서에 따라 가장자리 화소가 1단계씩 달라짐 */
const LY=new Map();
export const ctx2=c=>c.getContext('2d',{willReadFrequently:true});
export function layerS(id){let c=LY.get(id);if(!c){c=document.createElement('canvas');c.width=W;c.height=H;LY.set(id,c)}const x=ctx2(c);x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.globalCompositeOperation='source-over';x.filter='none';x.imageSmoothingEnabled=true;x.clearRect(0,0,W,H);return x}
/* 글자 그림 캐시: 위상 (xq/1000, yq/16)을 구울 때 반영 · 기준선 = 정수 행 oy · 원점 = 정수 열 ox → drawImage(cv, xi−ox, yi−oy). 키 = 양자화 값(먼저 온 값에 좌우되지 않게) */
const GC=new Map();
export function glyphImg(ch,o,xq,yq){const col=o.color||C.cream,k=ch+'|'+o.size+'|'+(o.weight||300)+'|'+col+'|'+xq+'|'+yq;let v=GC.get(k);if(v)return v;
  const xf=xq/1000,yf=yq/16,c=document.createElement('canvas'),x=ctx2(c);x.font=font(o.size,o.weight||300);const m=x.measureText(ch),p=2;
  const ox=Math.max(0,Math.ceil(m.actualBoundingBoxLeft))+p,oy=Math.ceil(m.actualBoundingBoxAscent)+p;
  c.width=Math.max(1,ox+Math.ceil(xf+Math.max(0,m.actualBoundingBoxRight))+p+1);c.height=Math.max(1,oy+Math.ceil(yf+Math.max(0,m.actualBoundingBoxDescent))+p+1);
  x.font=font(o.size,o.weight||300);x.textBaseline='alphabetic';x.textAlign='left';x.fillStyle=col;x.fillText(ch,ox+xf,oy+yf);v={c,ox,oy};GC.set(k,v);return v}
/* 한 자를 (gx, 기준선 yb)에 — 변환이 평행 이동뿐이면 장치 좌표로 바꿔 정수 위치에 1:1(보간 끔) */
export function drawGlyph(t,ch,o,gx,yb){if(ch===' ')return;const M=t.getTransform(),pure=M.a===1&&M.b===0&&M.c===0&&M.d===1;
  const X=pure?gx+M.e:gx,Y=pure?yb+M.f:yb,XQ=Math.round(X*1000),YQ=Math.round(Y*16),xi=Math.floor(XQ/1000),yi=Math.floor(YQ/16),G=glyphImg(ch,o,XQ-xi*1000,YQ-yi*16);
  if(!pure)return t.drawImage(G.c,xi-G.ox,yi-G.oy);
  t.save();t.setTransform(1,0,0,1,0,0);t.imageSmoothingEnabled=false;t.drawImage(G.c,xi-G.ox,yi-G.oy);t.restore()}

/* 표본 안 번짐의 선형광 보정: 층의 덮임 c(0~1)를 sRGB 합성에서 선형광 평균과 같은 밝기가 되는 알파로 바꾸는 SVG 표(크림 위 · 밤 바탕 기준).
   acc가 표본끼리는 선형광으로 평균하므로, 표본 안(캔버스 sRGB 합성)과 어긋나 표본 간격마다 옅은 물결이 생기는 것을 없앰. 움직이는(m>1) 글자에만 */
export function LIN(){if(!document.getElementById('s7lin')){const dec=v=>(v/=255)<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4),enc=v=>v<=.0031308?v*12.92:1.055*Math.pow(v,1/2.4)-.055;
    const hx=h=>{const n=parseInt(h.slice(1),16);return [n>>16&255,n>>8&255,n&255]},Y=c=>.2126*c[0]+.7152*c[1]+.0722*c[2],a=Y(hx(C.cream)),b=Y(hx(C.night)),La=dec(a),Lb=dec(b);
    const tv=[];for(let i=0;i<=32;i++){const c=i/32;tv.push(((enc(c*La+(1-c)*Lb)*255-b)/(a-b)).toFixed(4))}
    const NS='http://www.w3.org/2000/svg',sv=document.createElementNS(NS,'svg');sv.setAttribute('width','0');sv.setAttribute('height','0');sv.style.position='absolute';
    sv.innerHTML=`<filter id="s7lin" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%"><feComponentTransfer><feFuncA type="table" tableValues="${tv.join(' ')}"/></feComponentTransfer></filter>`;document.body.appendChild(sv)}
  return 'url(#s7lin)'}

/* 한 줄 그리기: pose(k,n,t) → {dy,vis}. 띠 b=[y0,y1) 절대 좌표로 자름.
   블러 표본 간격 h(=셔터/n) 동안 글자가 1.1px 넘게 움직이면 그 글자를 m번(≤48, 간격 ≈1px) 나눠 층에 'lighter'(1/m씩 더함 — 겹친 곳이 어두워지지 않음)로 그려 세로로 번지게 */
function run(g,s,x,y,o,f,b,pose){
  const G=glyphs(g,s,o),n=G.list.length,ax=o.align==='center'?x-G.w/2:o.align==='right'?x-G.w:x,a=o.alpha??1;
  const B=blurAt(f),h=B.shutter/B.n;
  const M=G.list.map((q,k)=>Math.min(48,Math.max(1,Math.ceil(Math.abs(pose(k,n,f+h/2).dy-pose(k,n,f-h/2).dy)/1.1))));
  if(window.__boxes){const vis=G.list.some((q,k)=>pose(k,n,f).vis)?1:0;g.save();g.beginPath();g.rect(0,0,0,0);g.clip();text(g,s,x,y,{...o,alpha:a*vis});g.restore()}   /* 검사 상자만(그리지 않음) */
  /* m=1 글자는 바로 g에, m>1 글자는 층에 'lighter'로 모아 선형광 보정 표를 거쳐 g에 */
  const sm=M.some(m=>m>1),L=sm?layerS('s7run'):null;
  g.save();g.beginPath();g.rect(-1e5,b[0],2e5,b[1]-b[0]);g.clip();const base=g.globalAlpha*a;
  if(L){L.setTransform(g.getTransform());L.globalCompositeOperation='lighter'}
  G.list.forEach((q,k)=>{const m=M[k];for(let j=0;j<m;j++){const p=pose(k,n,m>1?f+((j+.5)/m-.5)*h:f);if(!p.vis)continue;
    if(m>1){L.globalAlpha=1/m;drawGlyph(L,q.ch,o,ax+q.x,y+p.dy)}else{g.globalAlpha=base;drawGlyph(g,q.ch,o,ax+q.x,y+p.dy)}}});
  if(L){g.setTransform(1,0,0,1,0,0);g.globalAlpha=base;g.filter=LIN();g.drawImage(L.canvas,0,0)}   /* 층은 덮임만(1/m씩), 투명도는 합성 때 */
  g.restore()}
/* 글줄 등장: 글자 k는 f0+budget·k/(n−1)에 시작, dur 동안 띠 아래에서 올라옴(ease) — dist(px) 없으면 띠 아래로 완전히 숨는 거리 */
export function lineInX(g,s,x,y,o,f,f0,{dur=16,budget=10,ease=E.snap,band=null,dist=null}={}){if(!s)return;
  const I=ink(g,s,o),b=band||inkBand(g,s,o,y),D=dist??(b[1]-y+I.a+1);
  run(g,s,x,y,o,f,b,(k,n,t)=>{const u=clamp((t-f0-(n>1?budget*k/(n-1):0))/dur);return {dy:(1-ease(u))*D,vis:u>0}})}
/* 글줄 퇴장: 위로(E.accel). E.accel은 끝 속도가 무한(끝 1%에 16% 이동) → 이동 거리를 늘려 u=.9에 이미 띠 밖으로 나가게(남은 거리는 가려짐) */
export function lineOutX(g,s,x,y,o,f,f0,{dur=8,budget=4,ease=E.accel,band=null,dist=null}={}){if(!s)return;
  const I=ink(g,s,o),b=band||inkBand(g,s,o,y),D=dist??(y+I.d-b[0]+1)/ease(.9);
  run(g,s,x,y,o,f,b,(k,n,t)=>{const u=clamp((t-f0-(n>1?budget*k/(n-1):0))/dur);return {dy:-ease(u)*D,vis:u<1}})}
/* 정지 · 묶음 이동용 글줄(글자 그림으로 — 소수 y에서 숫자 바퀴와 함께 보간되게). 검사 때는 엔진 text(상자 기록) */
export function textG(g,s,x,y,o){if(!s)return;if(window.__boxes)return text(g,s,x,y,o);const G=glyphs(g,s,o),ax=o.align==='center'?x-G.w/2:o.align==='right'?x-G.w:x;
  g.save();g.globalAlpha*=o.alpha??1;G.list.forEach(q=>drawGlyph(g,q.ch,o,ax+q.x,y));g.restore()}
