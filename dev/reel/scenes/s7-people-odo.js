/* 쇼릴 s7-people 도우미 — 엔드카드 값 바퀴(주행거리계)
   자리 i(맨 오른쪽 0)의 바퀴 번호 W_i(t) = (d_i + 10·R_i) · e(t) — d_i = 그 자리 숫자, R_i = 맨 앞자리 0 · 나머지 1(한 바퀴 더).
   (값을 따라가는 바퀴는 아랫자리가 한 프레임에 수백~수십만 칸을 돌아 회색 판으로 보임 → 자리마다 돌 칸 수를 ≤19로 묶음)
   가장 빠를 때 ≈6칸/프레임(첫 프레임만), 끝 ≈7프레임은 1.5칸/프레임 아래로 굴러 숫자가 읽힘 · e=1에서 정확히 그 숫자로 멈춤(중간값에 멈추지 않음)
   · 빠르기 v(칸/프레임)에 따라 옅게: α × clamp(1 − .6(v − 1), .05, 1) — 한 칸 넘게 번지는(v>2) 첫 1~4프레임은 거의 보이지 않고, 굴러 읽히는 속도에서 또렷해짐
   · 표본 간격 안 나눔은 ≈.75px 간격(윤곽 줄무늬 없게)
   · 창은 가장자리 .18em 부드럽게(딱딱한 사각 판 대신) — 멈춘 숫자 · 이웃 숫자 위치에는 닿지 않음
   · 굴러오기 전(바퀴 번호 0)의 정수 자리는 그리지 않음(앞자리 0 없음) · 쉼표는 왼쪽 자리가 1칸 도는 동안 나타남 · 표본 간격 안에서 m번 나눠 'lighter'로 평균 */
import {C,clamp,glyphs,measure,rgba} from '../engine.js';
import {blurAt} from '../blur.js';
import {drawGlyph,LIN,ctx2} from './s7-people-type.js';

let SC=null,SX=null,SC2=null,SX2=null;
const fmt=(v,dec,grp)=>{const s=Math.round(v*10**dec).toString().padStart(dec+1,'0');let ip=dec?s.slice(0,-dec):s;const fp=dec?s.slice(-dec):'';if(grp)ip=ip.replace(/\B(?=(\d{3})+(?!\d))/g,',');return ip+(dec?'.'+fp:'')};

/* eAt(t): 0→1 진행(바깥은 끝값) · f: 지금 표본 시각 */
export function odoWheels(g,x,y,o,{value,decimals=0,grouping=true},eAt,f){
  if(!SC){SC=document.createElement('canvas');SC.width=SC.height=256;SX=ctx2(SC);SC2=document.createElement('canvas');SC2.width=SC2.height=256;SX2=ctx2(SC2)}
  const T=Math.round(value*10**decimals),lay=fmt(value,decimals,grouping),G=glyphs(g,lay,o),s=o.size,lh=s*1.1,B=blurAt(f),h=B.shutter/B.n;
  const base=g.globalAlpha*(o.alpha??1),col=o.color||C.cream,F=s*.18,w0=y-s*.82-F,w1=y+s*.1+F;   /* 창: 굳은 안쪽 [y−.82em, y+.1em] + 바깥 .18em 깃털 */
  const nd=[...lay].filter(c=>/\d/.test(c)).length,rev=i=>Math.floor(T/10**i)%10+(i<nd-1?10:0),Wf=(i,t)=>rev(i)*eAt(t),e0=eAt(f)<=0,vel=i=>Math.abs(Wf(i,f+h/2)-Wf(i,f-h/2))/h,spd=i=>clamp(1-.6*(vel(i)-1),.05,1);
  let di=nd-1;
  G.list.forEach(q=>{
    if(!/\d/.test(q.ch)){const L=di+1,al=(e0?0:L>decimals?clamp(Wf(L,f)):1)*spd(L);if(al<=0)return;   /* 쉼표 · 점: 왼쪽 자리가 보이는 만큼 · 그 자리 빠르기만큼 옅게 */
      g.save();g.globalAlpha=base*al;drawGlyph(g,q.ch,o,x+q.x,y);g.restore();return}
    const i=di--,cx=x+q.x+q.w/2;
    const v=vel(i),sa=spd(i),m=Math.min(48,Math.max(1,Math.ceil(v*h*lh/.75)));
    const X0=Math.floor(cx-s*.42),Y0=Math.floor(w0)-1,cw=Math.min(256,Math.ceil(s*.84)+2),chh=Math.min(256,Math.ceil(w1-Y0)+2);
    SX.setTransform(1,0,0,1,0,0);SX.globalCompositeOperation='source-over';SX.globalAlpha=1;SX.clearRect(0,0,256,256);
    SX.globalCompositeOperation='lighter';let any=false;
    for(let j=0;j<m;j++){const t=m>1?f+((j+.5)/m-.5)*h:f,P=Wf(i,t),b=Math.floor(P),fr=P-b;
      if(eAt(t)<=0)continue;SX.globalAlpha=1/m;
      const dg=(n,yy)=>{const d=String(n%10);drawGlyph(SX,d,o,cx-measure(g,d,o)/2-X0,yy-Y0);any=true};   /* 소수 y 보간(글자 그림) */
      if(!(i>decimals&&b===0))dg(b,y-fr*lh);if(fr>1e-4)dg(b+1,y+(1-fr)*lh)}
    if(!any)return;
    /* 여러 번 나눠 그린 자리: 덮임 → 선형광 보정(깃털 전에) */
    let K=SC,KX=SX;if(m>1){SX2.setTransform(1,0,0,1,0,0);SX2.globalCompositeOperation='source-over';SX2.globalAlpha=1;SX2.clearRect(0,0,256,256);SX2.filter=LIN();SX2.drawImage(SC,0,0);SX2.filter='none';K=SC2;KX=SX2}
    /* 깃털 창(destination-in) */
    const gr=KX.createLinearGradient(0,w0-Y0,0,w1-Y0),r=F/(w1-w0);const k0=rgba(col,0),k1=rgba(col,1);gr.addColorStop(0,k0);gr.addColorStop(r,k1);gr.addColorStop(1-r,k1);gr.addColorStop(1,k0);   /* 알파만 씀 */
    KX.globalCompositeOperation='destination-in';KX.globalAlpha=1;KX.fillStyle=gr;KX.fillRect(0,0,cw,chh);
    g.save();g.globalAlpha=base*sa;g.drawImage(K,0,0,cw,chh,X0,Y0,cw,chh);g.restore()});
}
