/* s2-lock 도우미 — 기계식 주행거리계(5,000). 자리마다 숫자 바퀴(0~9, 세로 주기 띠)를 굴린다.
   번짐: 이 프레임 셔터 전체 동안의 위치 구간을 상자 번짐(s2-lock-smear) — 표본 수와 무관하게 매끈, 표본마다 같은 그림 */
import {E,seg,clamp,glyphs,measure,text,layer} from '../engine.js';
import {blurAt} from '../blur.js';
import {strip,smear,span} from './s2-lock-smear.js';
/* 빠른 바퀴는 옅게(s7 주행거리계와 같은 규칙): v 자리/프레임 > 1이면 α 1−.6(v−1), 바닥 .05 — 셔터 전체 번짐이 창을 채운 회색 판으로 보이지 않게 */
const spinA=(p0,p1,f)=>{const v=Math.abs(p1-p0)/blurAt(Math.round(f)).shutter;return clamp(1-.6*(v-1),.05,1)};

/* 숫자 바퀴 띠(주기 10줄): 줄 k = 숫자 k, 기준선 k·lh + B(글자가 줄 안에 다 들어감 → 이웃 줄과 겹치지 않음). 가로는 자리 가운데 cx */
function wheelStrip(o,lh,B,cx){const SW=Math.ceil(o.size*.8)+2,X0=Math.floor(cx-SW/2);
  return strip(['w',o.size,o.weight,lh,B,cx.toFixed(3)].join('|'),SW,10*lh,X0,x=>{x.fillStyle='#fff';
    for(let k=0;k<10;k++){const d=String(k),w=measure(x,d,o);x.fillText(d,cx-w/2-X0,k*lh+B)}},true)}
/* 글자 하나 띠(위아래 빈칸): 퇴장 번짐용 — 이웃 숫자를 끌어오지 않게. xl = 글자 왼쪽(화면, 소수) */
const MX=document.createElement('canvas').getContext('2d');   /* 재기용 */
function soloStrip(ch,o,lh,B,xl){const w=measure(MX,ch,o),X0=Math.floor(xl-o.size*.1),SW=Math.ceil(xl+w+o.size*.1)-X0;
  return strip(['s',ch,o.size,o.weight,lh,B,xl.toFixed(3)].join('|'),SW,lh,X0,x=>{measure(x,ch,o);x.fillStyle='#fff';x.fillText(ch,xl-X0,B)})}

/* s '5,000' 배치 그대로. pos(c,f): 자리 c(왼쪽 0)의 굴림 위치(정수 = 그 숫자). ex(f): 퇴장 세로 이동(창 · 깃털은 제자리) — 없으면 null
   투명 층에 그려 합성: 불투명 캔버스에 ~180px 넘는 글자를 바로 그리면 Chrome이 LCD 부분화소 AA(색 번짐)를 씀 */
export function odometer(g,s,x,y,o,f,pos,ex=null){
  const G=glyphs(g,s,o),cap=o.size*.72,lh=Math.round(o.size*1.1),B=Math.round(lh/2+cap/2);
  const Ly=layer('s2odo'),wy0=Math.round(y-cap-o.size*.1),wh=Math.round(cap+o.size*.2);
  const [e0,e1]=ex?span(ex,f):[0,0],out=e0!==0||e1!==0,dy=(e0+e1)/2,dL=Math.abs(e1-e0);
  if(window.__boxes)text(layer('s2box'),s,x,y,o);   /* 검사 상자만(보이지 않는 층) */
  let c=0;
  G.list.forEach(q=>{const xl=x+q.x;
    if(!/\d/.test(q.ch)){if(out)smear(Ly,soloStrip(q.ch,o,lh,B,xl),y+dy-B,dL,wy0,Math.round(y+lh-B)-wy0,o.color);return}   /* 퇴장 중 쉼표 */
    const k=c++,[p0,p1]=span(t=>pos(k,t),f),p=(p0+p1)/2,cx=xl+q.w/2;
    Ly.save();Ly.beginPath();Ly.rect(xl-6,wy0,q.w+12,wh);Ly.clip();
    if(out){const d=String(((Math.round(p)%10)+10)%10);smear(Ly,soloStrip(d,o,lh,B,cx-measure(Ly,d,o)/2),y+dy-B,dL,wy0,wh,o.color)}
    else{Ly.globalAlpha=spinA(p0,p1,f);smear(Ly,wheelStrip(o,lh,B,cx),y-p*lh-B,Math.abs(p1-p0)*lh,wy0,wh,o.color);Ly.globalAlpha=1}
    Ly.restore()});
  /* 창 위아래 깃털(원통이 굽어 사라지듯) — 서 있는 숫자의 윤곽(ascent~descent) 밖에서만 */
  measure(Ly,'0',o);const m=Ly.measureText('0123456789'),hh=Ly.canvas.height-wy0,t0=(y-m.actualBoundingBoxAscent-.5-wy0)/hh,t1=(y+m.actualBoundingBoxDescent+.5-wy0)/hh,t2=wh/hh;
  const gr=Ly.createLinearGradient(0,wy0,0,wy0+hh);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(t0,'rgba(0,0,0,1)');
  if(out)gr.addColorStop(1,'rgba(0,0,0,1)');else{gr.addColorStop(t1,'rgba(0,0,0,1)');gr.addColorStop(t2,'rgba(0,0,0,0)')}   /* 퇴장 중엔 아래 깃털 없음(쉼표 꼬리 보존) */
  Ly.globalCompositeOperation='destination-in';Ly.fillStyle=gr;Ly.fillRect(0,wy0,Ly.canvas.width,hh);Ly.globalCompositeOperation='source-over';
  if(!out){Ly.fillStyle=o.color;G.list.forEach(q=>{if(/\d/.test(q.ch))return;measure(Ly,q.ch,o);Ly.fillText(q.ch,x+q.x,y)})}   /* 쉼표 등(깃털 밖) */
  g.drawImage(Ly.canvas,0,0);return G.w}

/* 5,000: 첫 자리는 값 그대로(v/1000), 아랫자리는 [바퀴, 곡선]으로 돌아 210에 함께 멈춤(곡선을 달리해 같은 숫자가 겹치지 않게)
   컷(194.5)에 바로 굴러 시작 — 첫 프레임(195)부터 바퀴가 돌고 있음(멈춘 '0,000'이 보이지 않게) */
const WH=[null,[1,E.outQuart],[1,E.outQuint],[2,E.outQuart]];
export const T320=f=>E.outQuart(seg(f,194.5,210));
export const pos320=digits=>(c,f)=>{const d=digits[c];if(c===0)return d*T320(f);const [r,e]=WH[Math.min(c,3)];return d+10*r*e(seg(f,194.5,210))};
