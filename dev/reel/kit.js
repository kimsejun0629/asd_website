/* 쇼릴 — 공용 부품: 새 태극(그려지며 나타남) · 로고 · 북태평양 지도 · 2D 패턴 · 위에서 본 기체 스프라이트
   태극 형상은 web/js/a3d-sym.js drawSym과 같은 식(그 파일은 한 번에 채우기만 해서, 부분 그리기용으로 옮김) */
import {need,img,clamp,C} from './engine.js';

/* ── 새 태극: t0~t1 구간의 리본만 채움(p로 그려 나가는 효과). R 반지름, 캔버스 좌표 ── */
const SYM=(()=>{
  const aA0=29*Math.PI/180,aA1=Math.PI,aD1=-151*Math.PI/180;
  const LA=(aA1-aA0),LB=Math.PI*.5,LC=Math.PI*.5,LD=-aD1,Lt=LA+LB+LC+LD;
  const tb=(LA+LB*.55)/Lt,tl=1-tb,ts=(LA*.82)/Lt,G=(t,c,s)=>Math.exp(-Math.pow((t-c)/s,2));
  const wAt=t=>Math.pow(Math.max(0,Math.sin(Math.PI*t)),.42)*(.17+.14*(G(t,tb,.07)+G(t,tl,.07))+.02*(G(t,ts,.08)+G(t,1-ts,.08)));
  const tJ1=(LA)/Lt,tJ2=(LA+LB+LC)/Lt;const rs=(1-wAt(tJ1)/2)/2,rs2=(1-wAt(tJ2)/2)/2;
  const P=t=>{const w=wAt(t);let d=t*Lt;
    if(d<=LA){const a=aA0+d;return [(1-w/2)*Math.cos(a),(1-w/2)*Math.sin(a)]}d-=LA;
    if(d<=LB){const a=Math.PI+d/LB*Math.PI;return [-rs+rs*Math.cos(a),rs*Math.sin(a)]}d-=LB;
    if(d<=LC){const a=Math.PI-d/LC*Math.PI;return [rs2+rs2*Math.cos(a),rs2*Math.sin(a)]}d-=LC;
    const a=-d;return [(1-w/2)*Math.cos(a),(1-w/2)*Math.sin(a)]};
  const N=720,L=[],Rr=[],M=[];
  for(let i=0;i<=N;i++){const t=i/N,p=P(t),q=P(Math.min(1,t+1e-3)),o=P(Math.max(0,t-1e-3));let tx=q[0]-o[0],ty=q[1]-o[1];const l=Math.hypot(tx,ty)||1;tx/=l;ty/=l;
    const w=wAt(t)/2;L.push([p[0]-ty*w,p[1]+tx*w]);Rr.push([p[0]+ty*w,p[1]-tx*w]);M.push(p)}
  return {N,L,R:Rr,M,P};
})();
/* p0~p1: 리본 길이 비율(0~1). 기본 전체 */
export function sym(g,cx,cy,R,color,p1=1,p0=0,{alpha=1,rot=0}={}){
  p0=clamp(p0);p1=clamp(p1);if(p1<=p0)return;const a=Math.round(p0*SYM.N),b=Math.max(a+1,Math.round(p1*SYM.N));
  g.save();g.globalAlpha*=alpha;g.translate(cx,cy);g.rotate(6*Math.PI/180+rot);g.scale(R*.95,-R);g.beginPath();g.moveTo(...SYM.L[a]);
  for(let i=a;i<=b;i++)g.lineTo(...SYM.L[i]);for(let i=b;i>=a;i--)g.lineTo(...SYM.R[i]);g.closePath();g.fillStyle=color;g.fill();g.restore();
}
/* 리본 가운데 선 위 점(그려지는 끝 위치 — 빛 점 · 궤적 연출용), 캔버스 좌표 */
export function symPoint(cx,cy,R,p,rot=0){const i=Math.round(clamp(p)*SYM.N),[x,y]=SYM.M[i],a=6*Math.PI/180+rot,X=x*R*.95,Y=-y*R;return [cx+X*Math.cos(a)-Y*Math.sin(a),cy+X*Math.sin(a)+Y*Math.cos(a)]}

/* ── 로고(KOREAN AIR AEROSPACE, 흰 SVG) — 폭 w로. viewBox 2247.7×553.8 ── */
export const LOGO='/web/img/logo-white.svg';need(LOGO);
export const LOGO_AR=2247.7/553.8;
export function logo(g,x,y,w,{alpha=1}={}){const im=img(LOGO);g.save();g.globalAlpha*=alpha;g.drawImage(im,x,y,w,w/LOGO_AR);g.restore()}

/* ── 북태평양 육지(web/img/mro-land.svg #land, viewBox 30 20 970 625) → Path2D ── */
let LAND=null;
export async function loadLand(){if(LAND)return LAND;const t=await (await fetch('/web/img/mro-land.svg')).text();const m=/<path id="land" d="([^"]*)"/.exec(t);LAND=new Path2D(m[1].replace(/\s+/g,' '));return LAND}
export const LAND_VB=[30,20,970,625];
export const land=()=>LAND;

/* ── 사이트 2D 패턴(web/img/pattern2d.svg) ── */
export const PATTERN='/web/img/pattern2d.svg';need(PATTERN);

/* ── 위에서 본 기체(새 도장 탑뷰) · 무인기 탑뷰 스프라이트(오른쪽 +x를 향함 — docs/uav.md) ── */
export const TOP={
  '787':'/web/img/aero/top-787-k26.webp','737':'/web/img/aero/top-737-k26.webp','a320':'/web/img/aero/top-a320-k26.webp',
  'a330':'/web/img/aero/top-a330-k26.webp','a350':'/web/img/aero/top-a350-k26.webp','ah6':'/web/img/aero/top-ah6.webp',
};
export const UAV_TOP={
  muav:'/web/img/sp/fs_top2.webp',stealth:'/web/img/sp/st_top2.webp',kusft:'/web/img/sp/ft_top2.webp',mlm:'/web/img/sp/mlm_top3.webp',
  slm:'/web/img/sp/slm_top3.webp',target:'/web/img/sp/tgt_top.webp',naval:'/web/img/sp/naval_top.webp',mro:'/web/img/sp/mro_top2.webp',rover:'/web/img/sp/rover_top2.webp',
};
