/* 쇼릴 s6-vision 보조 — 기체 층: 카메라를 따르는 바닥 격자 · 글 보호 그늘(3D 층에서만 지움)
   모든 값은 f(실수)만으로 정해진다 */
import {C,W,H,clamp,layer} from '../engine.js';

/* ── 바닥 격자: 120px · 크림 α.06 · PAI 화면에서 (1216,500)에 맞춘 정수 원점.
   PAI 화면 좌표 = 바닥 평면 좌표로 보고, 지금 카메라로 옮기는 호모그래피 H(PAI 화면 → 지금 화면)로 선을 옮김.
   PAI에 선 동안(H = 단위)은 1px fillRect 그대로(화소에 맞음), 내려앉기 · 크레인 동안은 격자가 카메라와 함께 기울고 줄어듦 ── */
const GS=120,GX=1216,GY=500,EXT=2400;        /* 확장: 크레인이 돌 때 화면 밖 바닥도 들어옴 */
/* 4점 대응 → 3×3 호모그래피(가우스 소거) */
function homog(P,Q){const A=[],b=[];for(let i=0;i<4;i++){const [x,y]=P[i],[u,v]=Q[i];
    A.push([x,y,1,0,0,0,-u*x,-u*y]);b.push(u);A.push([0,0,0,x,y,1,-v*x,-v*y]);b.push(v)}
  const n=8;for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(A[r][c])>Math.abs(A[p][c]))p=r;[A[c],A[p]]=[A[p],A[c]];[b[c],b[p]]=[b[p],b[c]];
    for(let r=0;r<n;r++){if(r===c)continue;const k=A[r][c]/A[c][c];if(!k)continue;for(let j=c;j<n;j++)A[r][j]-=k*A[c][j];b[r]-=k*b[c]}}
  const h=b.map((v,i)=>v/A[i][i]);return [h[0],h[1],h[2],h[3],h[4],h[5],h[6],h[7],1]}
/* 바닥 네 점(모델 좌표)을 두 카메라로 투영한 값: proj(cam) → [[x,y]×4] */
export function floorQuad(A,cen){const y=A.box0.min.y,d=40;return [[cen[0]-d,y,cen[2]-d],[cen[0]+d,y,cen[2]-d],[cen[0]+d,y,cen[2]+d],[cen[0]-d,y,cen[2]+d]]}
export function floorGrid(g,a,P,Q){if(a<=.002)return;g.save();g.globalAlpha*=.06*a;
  const x0=GX-Math.ceil((GX+EXT)/GS)*GS,y0=GY-Math.ceil((GY+EXT)/GS)*GS,x1=W+EXT,y1=H+EXT;
  if(!Q){g.fillStyle=C.cream;for(let x=x0;x<x1;x+=GS)if(x>=0&&x<W)g.fillRect(x,0,1,H);for(let y=y0;y<y1;y+=GS)if(y>=0&&y<H)g.fillRect(0,y,W,1);g.restore();return}
  const M=homog(P,Q),tr=(x,y)=>[M[0]*x+M[1]*y+M[2],M[3]*x+M[4]*y+M[5],M[6]*x+M[7]*y+M[8]];
  /* 선분 p0→p1: 동차 w가 작아지는(지평선 너머) 쪽을 잘라냄 */
  const seg2=(ax,ay,bx,by)=>{let p=tr(ax,ay),q=tr(bx,by);const wm=.02;if(p[2]<wm&&q[2]<wm)return;
    if(p[2]<wm||q[2]<wm){const t=(wm-p[2])/(q[2]-p[2]);const m=[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t,wm];if(p[2]<wm)p=m;else q=m}
    g.moveTo(p[0]/p[2],p[1]/p[2]);g.lineTo(q[0]/q[2],q[1]/q[2])};
  g.strokeStyle=C.cream;g.lineWidth=1;g.beginPath();
  for(let x=x0;x<x1;x+=GS)seg2(x+.5,-EXT,x+.5,H+EXT);for(let y=y0;y<y1;y+=GS)seg2(-EXT,y+.5,W+EXT,y+.5);
  g.stroke();g.restore()}

/* ── 글 보호 그늘: 글 무리(제목 두 줄 · 삼각 세 줄)마다 글 상자 합집합을 속(α1)으로,
   거리장(둥근 상자) smoothstep으로 FALL px에 걸쳐 0까지 — 곧은 가장자리 없이 기체가 그늘로 천천히 들어감.
   기체 층 위에 destination-out으로 찍음 → 기체만 어두워지고 격자 · 괄호는 그대로 ── */
const PAD=14,RC=36,FALL=200;
const sstep=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
/* 둥근 상자 거리(밖 +) */
function sdBox(px,py,b){const cx=(b[0]+b[2])/2,cy=(b[1]+b[3])/2,hx=(b[2]-b[0])/2-RC,hy=(b[3]-b[1])/2-RC;
  const qx=Math.abs(px-cx)-hx,qy=Math.abs(py-cy)-hy;return Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-RC}
/* runs: [{grp,s,x,y,o,box?}] · meas(s,o) → 폭. 무리별 {cv,x,y,core:[상자…]} — core는 검사용 */
export function bakeMatte(runs,meas){const G=new Map();
  runs.forEach(r=>{const b=r.box?[r.box[0]-PAD,r.box[1]-PAD,r.box[2]+PAD,r.box[3]+PAD]:(()=>{const w=meas(r.s,r.o),z=r.o.size;return [r.x-PAD,r.y-z*.78-PAD,r.x+w+PAD,r.y+z*.24+PAD]})();
    const q=G.get(r.grp);if(!q)G.set(r.grp,{rs:[b]});else q.rs.push(b)});
  const out=[];for(const [k,q] of [...G.entries()].sort((a,b)=>a[0]-b[0])){
    const X0=Math.floor(Math.max(0,Math.min(...q.rs.map(b=>b[0]))-FALL)),Y0=Math.floor(Math.max(0,Math.min(...q.rs.map(b=>b[1]))-FALL)),
      X1=Math.ceil(Math.min(W,Math.max(...q.rs.map(b=>b[2]))+FALL)),Y1=Math.ceil(Math.min(H,Math.max(...q.rs.map(b=>b[3]))+FALL));
    const w=X1-X0,h=Y1-Y0,cv=document.createElement('canvas');cv.width=w;cv.height=h;const x=cv.getContext('2d'),im=x.createImageData(w,h),D=im.data;
    const n=parseInt(C.night.slice(1),16),R=n>>16&255,Gc=n>>8&255,B=n&255;
    for(let j=0;j<h;j++)for(let i=0;i<w;i++){const px=X0+i+.5,py=Y0+j+.5;let d=1e9;for(const b of q.rs)d=Math.min(d,sdBox(px,py,b));
      const m=1-sstep(d/FALL),o=(j*w+i)*4;D[o]=R;D[o+1]=Gc;D[o+2]=B;D[o+3]=Math.round(255*m)}
    x.putImageData(im,0,0);out[k]={cv,x:X0,y:Y0,core:q.rs}}
  return out}
/* GL 캔버스 cv를 가림 m[무리](0~1)로 지워 g에 알파 a로 그림 */
export function drawGL(g,cv,a,mattes,m){let L=null;
  if(m.some(v=>v>.002)){L=layer('s6gl');L.drawImage(cv,0,0);L.globalCompositeOperation='destination-out';
    m.forEach((v,i)=>{const q=mattes[i];if(q&&v>.002){L.globalAlpha=clamp(v);L.drawImage(q.cv,q.x,q.y)}});L.globalCompositeOperation='source-over';L.globalAlpha=1}
  const src=L?L.canvas:cv;if(window.__s6post)window.__s6post(src);   /* 검사: 가린 뒤 3D 알파 */
  g.save();g.globalAlpha=a;g.drawImage(src,0,0);g.restore()}
