/* 메인 히어로 쇼릴 — 엔진: 시간 · 곡선 · 난수 · 글꼴 · 그림 · 글자 배치 · 선 · 장면 합성 · 모션 블러(누적)
   규칙: 모든 그림은 프레임 f(60fps 기준 실수)만으로 결정된다(벽시계 · Math.random 금지). 1920×1080 고정. */
export const W=1920,H=1080,FPS=60,N=900,DUR=N/FPS;
export const LANG=new URLSearchParams(location.search).get('lang')==='en'?'en':'ko';

/* ── 팔레트(CLAUDE.md 6) + 허용 예외 ── */
export const C={
  night:'#25282A',cblue:'#4D5055',cream:'#C0B7AB',cream80:'#A19A91',gold:'#83735B',rose:'#6C6463',smoke:'#716C6C',ink80:'#444544',
  goldHi:'#C2A673',goldHi2:'#B5A27F',livery:'#53AAE2',navy:'#051766',logo:'#F2F1ED',uavShadow:'#141617'
};
export const rgba=(hex,a)=>{const n=parseInt(hex.slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`};

/* ── 수학 ── */
export const clamp=(x,a=0,b=1)=>x<a?a:x>b?b:x;
export const lerp=(a,b,t)=>a+(b-a)*t;
export const seg=(f,a,b)=>clamp((f-a)/(b-a));            /* f가 a→b 사이 진행(0~1) */
export const mapr=(f,a,b,c,d,e=E.lin)=>lerp(c,d,e(seg(f,a,b)));
export const TAU=Math.PI*2;
export const fract=x=>x-Math.floor(x);
export const smooth=t=>t*t*(3-2*t);
export const loglerp=(a,b,t)=>Math.exp(lerp(Math.log(a),Math.log(b),t));   /* 크기 · 거리 · 배율 보간 */
/* 단조 3차 보간(Fritsch–Carlson): keys [[f,v],…] → f=>v, 끝 밖은 끝값 */
export function hermite(keys){const n=keys.length,x=keys.map(k=>k[0]),y=keys.map(k=>k[1]),d=[],m=new Array(n).fill(0);
  for(let i=0;i<n-1;i++)d.push((y[i+1]-y[i])/(x[i+1]-x[i]));
  for(let i=1;i<n-1;i++)m[i]=d[i-1]*d[i]<=0?0:(d[i-1]+d[i])/2;m[0]=d[0]||0;m[n-1]=d[n-2]||0;
  for(let i=0;i<n-1;i++){if(d[i]===0){m[i]=m[i+1]=0;continue}const a=m[i]/d[i],b=m[i+1]/d[i],h=a*a+b*b;if(h>9){const t=3/Math.sqrt(h);m[i]=t*a*d[i];m[i+1]=t*b*d[i]}}
  return f=>{if(f<=x[0])return y[0];if(f>=x[n-1])return y[n-1];let i=0;while(f>x[i+1])i++;const h=x[i+1]-x[i],t=(f-x[i])/h,t2=t*t,t3=t2*t;
    return (2*t3-3*t2+1)*y[i]+(t3-2*t2+t)*h*m[i]+(-2*t3+3*t2)*y[i+1]+(t3-t2)*h*m[i+1]}}

/* ── 곡선 ── */
function bez(x1,y1,x2,y2){
  const cx=3*x1,bx=3*(x2-x1)-cx,ax=1-cx-bx,cy=3*y1,by=3*(y2-y1)-cy,ay=1-cy-by;
  const X=t=>((ax*t+bx)*t+cx)*t,Y=t=>((ay*t+by)*t+cy)*t,D=t=>(3*ax*t+2*bx)*t+cx;
  return x=>{if(x<=0)return 0;if(x>=1)return 1;let t=x;for(let i=0;i<8;i++){const e=X(t)-x,d=D(t);if(Math.abs(e)<1e-6)break;if(Math.abs(d)<1e-6)break;t-=e/d}
    if(Math.abs(X(t)-x)>1e-4){let a=0,b=1;t=x;for(let i=0;i<30;i++){const v=X(t);if(v<x)a=t;else b=t;t=(a+b)/2}}return Y(t)};
}
export const E={
  lin:t=>t,
  inQuad:t=>t*t,outQuad:t=>1-(1-t)*(1-t),ioQuad:t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2,
  inCubic:t=>t*t*t,outCubic:t=>1-Math.pow(1-t,3),ioCubic:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,
  inQuart:t=>t*t*t*t,outQuart:t=>1-Math.pow(1-t,4),ioQuart:t=>t<.5?8*t*t*t*t:1-Math.pow(-2*t+2,4)/2,
  inQuint:t=>t**5,outQuint:t=>1-Math.pow(1-t,5),ioQuint:t=>t<.5?16*t**5:1-Math.pow(-2*t+2,5)/2,
  inExpo:t=>t<=0?0:Math.pow(2,10*t-10),outExpo:t=>t>=1?1:1-Math.pow(2,-10*t),
  ioExpo:t=>t<=0?0:t>=1?1:t<.5?Math.pow(2,20*t-10)/2:(2-Math.pow(2,-20*t+10))/2,
  inCirc:t=>1-Math.sqrt(1-t*t),outCirc:t=>Math.sqrt(1-Math.pow(t-1,2)),
  outBack:(t,s=1.70158)=>1+(s+1)*Math.pow(t-1,3)+s*Math.pow(t-1,2),
  inBack:(t,s=1.70158)=>(s+1)*t*t*t-s*t*t,
  /* 스프링(감쇠 진동): 0→1, 약간 넘쳤다가 안착 */
  spring:(t,k=7,z=.42)=>t>=1?1:1-Math.exp(-z*k*t*1.6)*Math.cos(k*t*Math.sqrt(1-z*z)*1.6),
  bez,
};
/* 자주 쓰는 모션 곡선(스토리보드 이름) */
E.snap=bez(.16,1,.3,1);        /* 강한 감속(expo out 계열) */
E.whip=bez(.7,0,.2,1);         /* 휙 — 빠르게 들어가 부드럽게 멈춤 */
E.std=bez(.4,0,.2,1);          /* 사이트 --ease-std 계열 */
E.accel=bez(.6,0,1,.4);        /* 가속하며 나감 */

/* ── 시드 난수 ── */
export function rng(seed){let a=seed>>>0;return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
export const hash=(i,s=0)=>{let h=Math.imul(i^0x9E3779B9,0x85EBCA6B)^Math.imul(s+0x632BE59B,0xC2B2AE35);h^=h>>>16;h=Math.imul(h,0x7FEB352D);h^=h>>>15;return(h>>>0)/4294967296};

/* ── 글꼴 ── */
export const FONT='Hanjin';
export async function loadFonts(){
  const L=[['Hanjin','/assets/HanjinGroupSans-Light_A.ttf',300],['Hanjin','/assets/HanjinGroupSans-Bold.ttf',700],
    ['HanjinGroupSans','/assets/HanjinGroupSans-Bold.ttf',700],['HanjinGroupSans','/assets/HanjinGroupSans-Light_A.ttf',300]];   /* HanjinGroupSans: a3d 동체 로고타입이 찾는 이름 */
  const F=await Promise.all(L.map(async([fam,url,w])=>{const f=new FontFace(fam,`url(${url})`,{weight:String(w)});await f.load();document.fonts.add(f);return f}));
  await document.fonts.ready;
  if(F.some(f=>f.status!=='loaded')||document.fonts.size<4)throw new Error('fonts not loaded');   /* check()는 거짓 양성이 있어 status로 확인 */
}
export const font=(size,weight=300)=>`${weight} ${size}px ${FONT}`;

/* ── 그림 ── */
const IMG=new Map();
export function need(...paths){paths.flat().forEach(p=>{if(!IMG.has(p))IMG.set(p,null)})}
export async function loadImages(){
  await Promise.all([...IMG.keys()].filter(p=>!IMG.get(p)).map(p=>new Promise((res,rej)=>{const im=new Image();im.decoding='sync';
    im.onload=async()=>{try{await im.decode()}catch{}IMG.set(p,im);res()};im.onerror=()=>rej(new Error('img '+p));im.src=p})));
}
export const img=p=>{const i=IMG.get(p);if(!i)throw new Error('not preloaded: '+p);return i};

/* ── 글자 ── */
const MC=new Map();
export const CUR={f:0};   /* 지금 그리는 프레임(검사 기록용) */
/* 검사: window.__boxes가 배열이면 글 상자를 기록 {id,s,size,tier,x,y,w,h,f} — o.id · o.tier(1 필수 · 2 보조 · 3 질감) */
function box(g,s,x,y,w,o,a){const B=window.__boxes;if(!B||a<=.02)return;const t=(()=>{try{return g.getTransform()}catch{return null}})();
  let X=x,Y=y-o.size*.8,Wd=w,Hd=o.size;if(t){X=t.a*x+t.c*Y+t.e;Y=t.b*x+t.d*Y+t.f;Wd*=Math.hypot(t.a,t.b);Hd*=Math.hypot(t.c,t.d)}
  B.push({id:o.id||'',s,size:o.size*(t?Math.hypot(t.c,t.d):1),tier:o.tier||2,x:Math.round(X),y:Math.round(Y),w:Math.round(Wd),h:Math.round(Hd),f:CUR.f,a:+a.toFixed(2)})}
/* 글자 스타일: {size, weight, track(em), color, alpha, align, baseline} */
function setFont(g,o){g.font=font(o.size,o.weight||300);g.letterSpacing=((o.track||0)*o.size).toFixed(2)+'px';g.textBaseline=o.baseline||'alphabetic';g.textAlign='left'}
/* 캐시 열쇠는 스타일 값으로(g.letterSpacing 읽기는 save() 안에서 부모와 같은 값이면 ''로 읽혀 자간이 다른 폭끼리 겹쳤음) */
export function measure(g,s,o){setFont(g,o);const k=font(o.size,o.weight||300)+'|'+((o.track||0)*o.size).toFixed(2)+'|'+s;let v=MC.get(k);if(v===undefined){v=g.measureText(s).width-(o.track||0)*o.size;MC.set(k,v)}return v}   /* 끝 글자 뒤 자간은 뺌 */
/* 글자별 위치: 글자 i의 x = 폭(앞 i+1글자) − 폭(글자 i) — 앞 글자와의 커닝(AV · Te …)까지 통째 그림과 같은 자리 · 자간 유지 */
export function glyphs(g,s,o){const a=[...s],out=[];let pre='';for(let i=0;i<a.length;i++){pre+=a[i];const x=i?measure(g,pre,o)-measure(g,a[i],o):0;out.push({ch:a[i],i,x})}
  const w=measure(g,s,o);for(let i=0;i<out.length;i++)out[i].w=(i+1<out.length?out[i+1].x:w)-out[i].x;return {list:out,w}}
export function text(g,s,x,y,o){if(!s)return 0;setFont(g,o);const w=measure(g,s,o);const ax=o.align==='center'?x-w/2:o.align==='right'?x-w:x;
  g.save();g.globalAlpha*=o.alpha??1;g.fillStyle=o.color||C.cream;setFont(g,o);g.fillText(s,ax,y);box(g,s,ax,y,w,o,g.globalAlpha);g.restore();return w}
/* 폭 맞춤: maxW 안에 들도록 글자 크기를 줄임 */
export function fit(g,s,o,maxW){const w=measure(g,s,o);return w<=maxW?o:{...o,size:Math.floor(o.size*maxW/w)}}
/* 글자별 그리기 — each(gl, k)가 {dx,dy,alpha,scale,rot,color,clip} 반환 */
export function textEach(g,s,x,y,o,each){const G=glyphs(g,s,o);const ax=o.align==='center'?x-G.w/2:o.align==='right'?x-G.w:x;
  if(window.__boxes){let vis=0;G.list.forEach((q,k)=>{const r=each(q,k,G.list.length)||{};vis=Math.max(vis,(o.alpha??1)*(r.alpha??1)*(r.clip?(r.clip[3]>0?1:0):1))});box(g,s,ax,y,G.w,o,vis*g.globalAlpha)}
  G.list.forEach((q,k)=>{const r=each(q,k,G.list.length)||{};const a=(o.alpha??1)*(r.alpha??1);if(a<=0.001)return;
    g.save();g.globalAlpha*=a;g.fillStyle=r.color||o.color||C.cream;setFont(g,o);
    const cx=ax+q.x+q.w/2;g.translate(cx+(r.dx||0),y+(r.dy||0));if(r.rot)g.rotate(r.rot);if(r.scale!==undefined&&r.scale!==1)g.scale(r.scale,r.scale);
    if(r.clip){g.beginPath();g.rect(r.clip[0]-cx,r.clip[1]-y,r.clip[2],r.clip[3]);g.clip()}
    g.fillText(q.ch,-q.w/2,0);g.restore()});return G.w}
/* 가림 올림: 글줄 전체가 아래에서 위로(마스크 안에서) — p 0→1 */
export function textRise(g,s,x,y,o,p,{stagger=0,dist=1.05}={}){const cap=o.size*.92;
  return textEach(g,s,x,y,o,(q,k,n)=>{const t=clamp(stagger?(p*(1+stagger*(n-1))-stagger*k):p);const e=E.snap(t);
    const dy=(1-e)*o.size*dist;return {dy,alpha:t>0?1:0,clip:[-1e4,y-cap*1.12-dy,2e4,cap*1.42]}})}   /* 가림은 화면에 고정(textEach clip은 글자와 함께 움직이므로 dy를 뺌) */

/* ── 선 · 도형 ── */
export const px=v=>Math.round(v)+.5;   /* 1px 선을 화소에 맞춤 */
export function hline(g,x0,x1,y,{w=1,color=C.cream,alpha=1}={}){g.save();g.globalAlpha*=alpha;g.fillStyle=color;const yy=w%2?Math.round(y-w/2):Math.round(y-w/2);g.fillRect(Math.min(x0,x1),yy,Math.abs(x1-x0),w);g.restore()}
export function vline(g,x,y0,y1,{w=1,color=C.cream,alpha=1}={}){g.save();g.globalAlpha*=alpha;g.fillStyle=color;g.fillRect(Math.round(x-w/2),Math.min(y0,y1),w,Math.abs(y1-y0));g.restore()}
export function rect(g,x,y,w,h,color,alpha=1){g.save();g.globalAlpha*=alpha;g.fillStyle=color;g.fillRect(x,y,w,h);g.restore()}
export function strokeRect(g,x,y,w,h,{lw=1,color=C.cream,alpha=1}={}){g.save();g.globalAlpha*=alpha;g.strokeStyle=color;g.lineWidth=lw;g.strokeRect(Math.round(x)+lw%2/2,Math.round(y)+lw%2/2,Math.round(w),Math.round(h));g.restore()}
/* 원호 그리기(p: 그려진 비율) */
export function arc(g,cx,cy,r,a0,p,{lw=1,color=C.cream,alpha=1,dir=1,dash=null}={}){if(p<=0)return;g.save();g.globalAlpha*=alpha;g.strokeStyle=color;g.lineWidth=lw;if(dash)g.setLineDash(dash);g.beginPath();g.arc(cx,cy,r,a0,a0+dir*p*TAU,dir<0);g.stroke();g.restore()}
/* 경로를 비율만큼만 그림(폴리라인) */
export function polyline(g,pts,p,{lw=1,color=C.cream,alpha=1,cap='butt',join='miter'}={}){if(p<=0||pts.length<2)return;const L=[0];for(let i=1;i<pts.length;i++)L.push(L[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
  const T=L[L.length-1]*clamp(p);g.save();g.globalAlpha*=alpha;g.strokeStyle=color;g.lineWidth=lw;g.lineCap=cap;g.lineJoin=join;g.beginPath();g.moveTo(...pts[0]);
  for(let i=1;i<pts.length;i++){if(L[i]<=T)g.lineTo(...pts[i]);else{const u=(T-L[i-1])/(L[i]-L[i-1]||1);g.lineTo(lerp(pts[i-1][0],pts[i][0],u),lerp(pts[i-1][1],pts[i][1],u));break}}g.stroke();g.restore();
  return (()=>{for(let i=1;i<pts.length;i++)if(L[i]>=T){const u=(T-L[i-1])/(L[i]-L[i-1]||1);return [lerp(pts[i-1][0],pts[i][0],u),lerp(pts[i-1][1],pts[i][1],u)]}return pts[pts.length-1]})()}
/* 모서리 괄호(조준 표지) */
export function brackets(g,x,y,w,h,len,{lw=2,color=C.goldHi,alpha=1}={}){g.save();g.globalAlpha*=alpha;g.strokeStyle=color;g.lineWidth=lw;g.lineCap='square';g.beginPath();
  for(const [sx,sy] of [[0,0],[1,0],[0,1],[1,1]]){const X=x+sx*w,Y=y+sy*h,dx=sx?-1:1,dy=sy?-1:1;g.moveTo(X,Y+dy*len);g.lineTo(X,Y);g.lineTo(X+dx*len,Y)}g.stroke();g.restore()}
/* 도면 격자 */
export function grid(g,step,{ox=0,oy=0,color=C.cream,alpha=.08,x0=0,y0=0,x1=W,y1=H,lw=1}={}){g.save();g.globalAlpha*=alpha;g.fillStyle=color;
  for(let x=x0+((ox%step)+step)%step;x<x1;x+=step)g.fillRect(Math.round(x),y0,lw,y1-y0);for(let y=y0+((oy%step)+step)%step;y<y1;y+=step)g.fillRect(x0,Math.round(y),x1-x0,lw);g.restore()}
/* 금색 대시 표지 + 라벨(사이트 .mk .lbl) */
export function label(g,s,x,y,{size=26,color=C.cream,alpha=1,dash=true,track=.14,weight=700,dashColor=C.goldHi2,id,tier}={}){g.save();g.globalAlpha*=alpha;let xx=x;
  if(dash){hline(g,x,x+size*1.5,y-size*.36,{w:2,color:dashColor});xx=x+size*2.1}
  const u=s.toUpperCase(),o={size,weight,track,color,id,tier};
  if(!u.includes('·'))text(g,u,xx,y,o);
  else{/* 가운뎃점은 dashColor(스타일 가이드) — 글줄을 통째로 두 번 그리고 점 칸만 서로 반대로 잘라 커닝 그대로 */
    const cells=glyphs(g,u,o).list.filter(q=>q.ch==='·'),R=(c)=>{c.beginPath();for(const q of cells)c.rect(xx+q.x,-1e5,q.w,2e5)};
    g.save();R(g);g.rect(-1e5,-1e5,2e5,2e5);g.clip('evenodd');text(g,u,xx,y,o);g.restore();
    g.save();R(g);g.clip();g.fillStyle=dashColor;setFont(g,o);g.fillText(u,xx,y);g.restore()}
  g.restore()}
/* 이미지 cover 그리기 */
export function cover(g,im,x,y,w,h,{fx=.5,fy=.5,zoom=1,alpha=1}={}){const s=Math.max(w/im.width,h/im.height)*zoom,dw=im.width*s,dh=im.height*s;g.save();g.globalAlpha*=alpha;g.beginPath();g.rect(x,y,w,h);g.clip();g.drawImage(im,x+(w-dw)*fx,y+(h-dh)*fy,dw,dh);g.restore()}
/* 숫자 굴림(주행거리계): s는 최종 문자열, p 0→1 — 자리마다 세로로 굴러 멈춤 */
export function odometer(g,s,x,y,o,p,{spin=1,stagger=.08,ease=E.snap}={}){const G=glyphs(g,s,o);const ax=o.align==='center'?x-G.w/2:o.align==='right'?x-G.w:x;const cap=o.size*.72,lh=o.size*1.1;
  const nd=[...s].filter(c=>/\d/.test(c)).length;let k=0;
  G.list.forEach(q=>{g.save();g.fillStyle=o.color||C.cream;g.globalAlpha*=o.alpha??1;setFont(g,o);
    if(/\d/.test(q.ch)){const t=ease(clamp((p-k*stagger)/Math.max(1e-6,1-(nd-1)*stagger)));const d=+q.ch,R=10*(spin+(nd-1-k)*.5|0)+(k%3)+3;k++;
      const V=d-R*(1-t),b=Math.floor(V),fr=V-b;g.beginPath();g.rect(ax+q.x-6,y-cap-o.size*.1,q.w+12,cap+o.size*.2);g.clip();   /* 창 안에서만 보임 */
      const cx=ax+q.x+q.w/2,dg=v=>{const s2=String((v%10+10)%10);return [s2,cx-measure(g,s2,o)/2]};   /* 비례 숫자라 칸 가운데 정렬 */
      {const [s2,x2]=dg(b);g.fillText(s2,x2,y-fr*lh)}if(fr>1e-4){const [s2,x2]=dg(b+1);g.fillText(s2,x2,y+(1-fr)*lh)}}
    else{g.globalAlpha*=clamp(p*3);g.fillText(q.ch,ax+q.x,y)}g.restore()});return G.w}

/* ── 장면 합성 ── */
const SC=[];
/* 장면: {id, from, to(프레임, 끝 제외), z, init?(env), draw(g, f, env)} — f는 전체 프레임(실수) */
export function scene(s){SC.push(s);SC.sort((a,b)=>(a.z||0)-(b.z||0))}
export const scenes=()=>SC;
let OUT=null,G2=null;
export function canvas(){return OUT}
export function setup(cv){OUT=cv;cv.width=W;cv.height=H;G2=cv.getContext('2d',{alpha:false,willReadFrequently:false});return G2}
/* 한 순간(프레임 실수) 그리기 — 루프라 f는 [0,N) 로 감음 */
export function renderAt(f,env){f=((f%N)+N)%N;CUR.f=f;const g=G2;g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.filter='none';
  g.fillStyle=C.night;g.fillRect(0,0,W,H);
  for(const s of SC){let ff=f;
    if(s.from<0&&f>=s.from+N)ff=f-N;          /* 끝에서 처음으로 넘어가는 장면(from<0) */
    else if(s.to>N&&f<s.to-N)ff=f+N;          /* 처음에서 끝을 넘는 장면(to>N) */
    if(ff>=s.from&&ff<s.to){g.save();try{s.draw(g,ff,env)}finally{g.restore()}}}
  return g;
}

/* ── M0 추가: 글줄 등장 · 퇴장 · 맞춤 · 조합 ── */
/* 글줄 등장(프레임 기준): 글자 k는 f0+budget·k/(n−1)에 시작해 dur 동안 마스크 안에서 올라옴(dir 'up' 아래→위, 'down' 위→아래)
   mask [y0,y1] 없으면 글줄 띠(윗선 cap×1.12 · 아래 size×.3) — 가림은 화면에 고정(textEach clip이 dy와 함께 움직이므로 dy를 빼서 넘김) */
function band(y,o){const cap=o.size*.92;return [y-cap*1.12,y+o.size*.3]}
export function lineIn(g,s,x,y,o,f,f0,{dur=16,budget=10,dir='up',mask=null,dist=1.05,ease=E.snap,fade=false}={}){
  if(f<f0||!s)return 0;const [m0,m1]=mask||band(y,o);const sg=dir==='down'?-1:1;
  return textEach(g,s,x,y,o,(q,k,n)=>{const st=f0+(n>1?budget*k/(n-1):0),t=clamp((f-st)/dur);if(t<=0)return {alpha:0};const e=ease(t);
    const dy=sg*(1-e)*o.size*dist;return {dy,alpha:fade?clamp(t*2.5):1,clip:[-1e5,m0-dy,2e5,m1-m0]}})}
/* 글줄 퇴장: dir 'up'이면 위로 빠져나감 · fade: 진행 .3→.75에 1→0(E.accel 끝의 긴 번짐이 가림 끝에 판처럼 남지 않게) */
export function lineOut(g,s,x,y,o,f,f0,{dur=8,budget=4,dir='up',mask=null,dist=1.05,ease=E.accel,fade=false}={}){
  if(!s)return 0;if(f<f0)return text(g,s,x,y,o);const [m0,m1]=mask||band(y,o);const sg=dir==='down'?1:-1;
  return textEach(g,s,x,y,o,(q,k,n)=>{const st=f0+(n>1?budget*k/(n-1):0),t=clamp((f-st)/dur);if(t>=1)return {alpha:0};const e=ease(t);
    const dy=sg*e*o.size*dist;return {dy,alpha:fade?1-seg(t,.3,.75):1,clip:[-1e5,m0-dy,2e5,m1-m0]}})}
/* 라벨 등장: 자간 .30→.14em + 투명도(사이트 .lbl.mk) */
export function trackIn(g,s,x,y,o,p){if(p<=0)return;const e=E.snap(clamp(p));label(g,s,x,y,{...o,track:lerp(.30,o.track??.14,e),alpha:(o.alpha??1)*clamp(p*1.6)})}
/* 폭 맞춤(아래 한도 floor) */
export function fitSize(g,s,o,maxW,floor=26){const w=measure(g,s,o);if(w<=maxW)return o;return {...o,size:Math.max(floor,Math.floor(o.size*maxW/w))}}
/* 한 줄 또는 두 줄: floor보다 작아져야 들어가면 가운데에 가까운 빈칸에서 나눠 size2로 */
export function fitLines(g,s,o,maxW,{floor=72,size2=88}={}){const one=fitSize(g,s,o,maxW,1);if(one.size>=floor)return [{s,o:one}];
  const sp=[...s.matchAll(/ /g)].map(m=>m.index);if(!sp.length)return [{s,o:{...o,size:floor}}];const mid=s.length/2;const i=sp.reduce((a,b)=>Math.abs(b-mid)<Math.abs(a-mid)?b:a);
  const o2={...o,size:size2};return [s.slice(0,i),s.slice(i+1)].map(t=>({s:t,o:fitSize(g,t,o2,maxW,26)}))}
/* 조각 배치: items [{s,o}] 가로로 이어 붙인 x 위치(divider면 조각 사이에 24px 가는 선) */
export function spansLayout(g,items,x,{gap=16,divider=null}={}){let xx=x;const out=[];items.forEach((it,i)=>{if(i){xx+=gap;if(divider){out.push({div:true,x:xx});xx+=24+gap}}const w=measure(g,it.s,it.o);out.push({...it,x:xx,w});xx+=w});return {list:out,w:xx-x}}
export function spans(g,items,x,y,opt={}){const L=spansLayout(g,items,x,opt);const ref=items[0]?.o||{size:28};
  L.list.forEach(it=>{if(it.div)hline(g,it.x,it.x+24,y-ref.size*.34,{color:C.cream,alpha:.28*(opt.alpha??1)});else text(g,it.s,it.x,y,{...it.o,alpha:(it.o.alpha??1)*(opt.alpha??1)})});return L.w}

/* ── 값 주행거리계: v(실수)를 기계식 자리 굴림으로. target은 자리 배치 기준(기본 v). 앞자리 0은 값이 닿을 때 서서히 나타남 ── */
function fmtNum(v,dec,grp){const s=Math.round(v*10**dec).toString().padStart(dec+1,'0');let ip=dec?s.slice(0,-dec):s,fp=dec?s.slice(-dec):'';if(grp)ip=ip.replace(/\B(?=(\d{3})+(?!\d))/g,',');return ip+(dec?'.'+fp:'')}
export function odoValue(g,v,x,y,o,{target=null,grouping=true,decimals=0,colorLock=null}={}){
  const T=target??v,lay=fmtNum(T,decimals,grouping),G=glyphs(g,lay,o),ax=o.align==='center'?x-G.w/2:o.align==='right'?x-G.w:x;
  const iv=v*10**decimals;const nd=[...lay].filter(c=>/\d/.test(c)).length;const cap=o.size*.72,lh=o.size*1.1;
  /* 자리 i(1의 자리=0)의 위치: 0자리는 연속, 윗자리는 아랫자리가 9→10으로 넘어가는 마지막 1 동안만 움직임 */
  const pos=i=>{if(i===0)return iv;const p=10**i,base=Math.floor(iv/p),low=iv-base*p;return base+clamp(low-(p-1))};
  let di=nd-1;g.save();g.fillStyle=o.color||C.cream;g.globalAlpha*=o.alpha??1;
  if(window.__boxes)box(g,lay,ax,y,G.w,o,g.globalAlpha);
  G.list.forEach(q=>{g.save();setFont(g,o);
    if(/\d/.test(q.ch)){const i=di--;const P=pos(i),b=Math.floor(P),fr=P-b;const lead=i>decimals?clamp(iv/10**i):1;   /* 앞자리 0 */
      g.globalAlpha*=lead;g.beginPath();g.rect(ax+q.x-6,y-cap-o.size*.1,q.w+12,cap+o.size*.2);g.clip();
      const cx=ax+q.x+q.w/2,dg=n=>{const s2=String((n%10+10)%10);return [s2,cx-measure(g,s2,o)/2]};
      {const [s2,x2]=dg(b);g.fillText(s2,x2,y-fr*lh)}if(fr>1e-4){const [s2,x2]=dg(b+1);g.fillText(s2,x2,y+(1-fr)*lh)}}
    else{const nextI=di+1;g.globalAlpha*=clamp(iv/10**Math.max(nextI,0));g.fillText(q.ch,ax+q.x,y)}   /* 쉼표 · 점: 왼쪽 자리가 보일 때 */
    g.restore()});g.restore();return G.w}
/* 방위(HDG): 0~359 세 자리 연속 굴림 + '°' */
export function wheel(g,deg,x,y,o){deg=((deg%360)+360)%360;const wd=measure(g,'888',o),wo=measure(g,'°',o)+2,tw=wd+wo;const ax=o.align==='center'?x-tw/2:o.align==='right'?x-tw:x;const o2={...o,align:'left'};
  odoValue(g,deg,ax,y,o2,{target:888,grouping:false});text(g,'°',ax+wd+2,y,o2);return tw}

/* ── 도형 추가 ── */
export function ellipse(g,cx,cy,rx,ry,p=1,{lw=1,color=C.cream,alpha=1,dash=null,a0=-Math.PI/2}={}){if(p<=0)return;g.save();g.globalAlpha*=alpha;g.strokeStyle=color;g.lineWidth=lw;if(dash)g.setLineDash(dash);
  g.beginPath();g.ellipse(cx,cy,rx,ry,0,a0,a0+TAU*clamp(p));g.stroke();g.restore()}
/* 2차 곡선을 길이 비율 p만큼 그리고 머리 점 반환 */
export function quad(g,p0,c,p1,p=1,{lw=1,color=C.cream,alpha=1,dash=null,cap='round'}={}){const n=64,pts=[];for(let i=0;i<=n;i++){const t=i/n,u=1-t;pts.push([u*u*p0[0]+2*u*t*c[0]+t*t*p1[0],u*u*p0[1]+2*u*t*c[1]+t*t*p1[1]])}
  if(dash){g.save();g.setLineDash(dash)}const h=polyline(g,pts,p,{lw,color,alpha,cap});if(dash)g.restore();return h||pts[0]}
/* 세로 금색 스캔선: 2px 심 + 양옆 빛(더하기 합성) + 훑은 쪽 눈금 */
export function glowLine(g,x,{core=2,glow=32,alpha=.2,ticks=40,tickSide=1,y0=60,y1=1020,color=C.goldHi,op=1}={}){g.save();g.globalAlpha*=op;
  const gr=g.createLinearGradient(x-glow,0,x+glow,0);gr.addColorStop(0,rgba(color,0));gr.addColorStop(.5,rgba(color,alpha));gr.addColorStop(1,rgba(color,0));
  g.globalCompositeOperation='lighter';g.fillStyle=gr;g.fillRect(x-glow,y0,glow*2,y1-y0);g.globalCompositeOperation='source-over';
  g.fillStyle=color;g.fillRect(Math.round(x-core/2),y0,core,y1-y0);
  if(ticks){g.fillStyle=rgba(C.cream,.5);for(let y=y0;y<=y1;y+=ticks)g.fillRect(Math.round(x+tickSide*(core/2+2))-(tickSide<0?6:0),Math.round(y),6,1)}g.restore()}
export function clipBand(g,y0,y1){g.beginPath();g.rect(0,y0,W,y1-y0);g.clip()}

/* ── 층 · 마스크 ── */
const LAY=new Map();
/* 같은 id는 같은 오프스크린 캔버스(가져올 때 지움) — 한 draw 안에서만 씀
   soft: 소프트웨어 캔버스(willReadFrequently) — GPU 캔버스는 처음 쓸 때와 나중 합성이 1 LSB 달라 그리기 순서에 따라 화소가 바뀔 수 있음(결정성) */
export function layer(id,{soft=false}={}){const key=soft?id+'|soft':id;let c=LAY.get(key);if(!c){c=document.createElement('canvas');c.width=W;c.height=H;if(soft)c.getContext('2d',{willReadFrequently:true});LAY.set(key,c)}const x=c.getContext('2d');x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.globalCompositeOperation='source-over';x.filter='none';x.clearRect(0,0,W,H);return x}
/* 내용을 마스크(불투명한 곳만)로 걸러 g에: content(ctx) · mask(ctx) — mode 'destination-in'(마스크 안) · 'destination-out'(마스크 밖) */
export function maskWith(g,content,mask,{mode='destination-in',id='mw'}={}){const a=layer(id+'A');content(a);const b=layer(id+'B');mask(b);a.globalCompositeOperation=mode;a.drawImage(b.canvas,0,0);a.globalCompositeOperation='source-over';g.drawImage(a.canvas,0,0);return a}

/* ── 두 색조(듀오톤): 밝기(Rec.709) → 색 띠, 한 번 구워 캐시 ── */
const DUO=new Map();
export function duotone(im,stops=[[0,C.night],[.5,C.smoke],[1,C.cream]],{gamma=.9,key=''}={}){const k=(im.src||key)+JSON.stringify(stops)+gamma;if(DUO.has(k))return DUO.get(k);
  const c=document.createElement('canvas');c.width=im.naturalWidth||im.width;c.height=im.naturalHeight||im.height;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0);
  const d=x.getImageData(0,0,c.width,c.height),a=d.data;const hx=h=>{const n=parseInt(h.slice(1),16);return [n>>16&255,n>>8&255,n&255]};const S=stops.map(([t,h])=>[t,hx(h)]);
  const lut=new Array(256);for(let i=0;i<256;i++){const t=Math.pow(i/255,gamma);let j=0;while(j<S.length-2&&t>S[j+1][0])j++;const u=clamp((t-S[j][0])/(S[j+1][0]-S[j][0]));lut[i]=S[j][1].map((v,q)=>Math.round(lerp(v,S[j+1][1][q],u)))}
  for(let i=0;i<a.length;i+=4){const l=Math.round(.2126*a[i]+.7152*a[i+1]+.0722*a[i+2]);const v=lut[Math.min(255,l)];a[i]=v[0];a[i+1]=v[1];a[i+2]=v[2]}
  x.putImageData(d,0,0);DUO.set(k,c);return c}
