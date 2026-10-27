/* s4-mro 숫자: 5,500(+) 배치(첫 자리 잉크를 x=120에 · 단위 끝 x≤1100 맞춤) · 드럼 주행거리계
   드럼 창 위끝은 제목 잉크 아래로 제한(굴러 나가는 자리가 제목에 닿지 않음) · 빠른 자리는 표본 안을 나눠 메움(줄무늬 없음) */
import {C,E,seg,clamp,rgba,glyphs,measure,layer,font,W,H} from '../engine.js';
import {blurAt} from '../blur.js';

/* 잉크 상자(글자 하나는 자간 0): l 왼쪽 여백(오른쪽 +) · r 오른쪽 끝 · a 위 · d 아래 */
const IK=new Map();
export function ink(g,s,size,weight=300,track=0){const k=s+'|'+size+'|'+weight+'|'+track;let v=IK.get(k);if(v)return v;
  g.save();g.font=font(size,weight);g.letterSpacing=(track*size).toFixed(2)+'px';const m=g.measureText(s);g.restore();
  v={l:-m.actualBoundingBoxLeft,r:m.actualBoundingBoxRight,a:m.actualBoundingBoxAscent,d:m.actualBoundingBoxDescent};IK.set(k,v);return v}
/* 표본 사이 간격(프레임): 셔터 .5를 표본 수로 나눔 */
export const stepH=f=>.5/blurAt(Math.round(f)).n;

/* 숫자 뒤 기호(EN '+')는 .42 크기 · 윗선 맞춤 */
const SUF=.42,split=s=>{const m=/^(.*\d)(\D*)$/.exec(s);return m?[m[1],m[2]]:[s,'']};
const DIG='0123456789';
/* 원통 감쇠: 자리 이동량 u(lh 단위) .2→.65에서 1→0(smootherstep) */
const ss=t=>t*t*t*(t*(t*6-15)+10),cyl=u=>1-ss(clamp((u-.2)/.45));
/* 배치: 자리는 칸 가운데 정렬(드럼과 같음). 첫 자리 잉크 왼끝 = x, '+'는 끝 자리 잉크 오른끝 + .03em,
   단위는 max('+' 잉크 끝 + 16, 끝 자리 잉크 끝 + .12em) — 없으면 숫자 끝 + 20 */
export function numLay(g,s0,o,unit,uo,x,maxX){const [s,suf]=split(s0);
  const at=size=>{const on={...o,size},G=glyphs(g,s,on),adv=measure(g,'0',on),q0=G.list[0],qn=G.list[G.list.length-1];
    const x0=x-(q0.x+q0.w/2-adv/2+ink(g,q0.ch,size).l),lastR=x0+qn.x+qn.w/2-adv/2+ink(g,qn.ch,size).r;
    const capA=Math.max(...[...DIG].map(d=>ink(g,d,size).a)),dsc=Math.max(...[...s].map(c=>ink(g,c,size).d));
    let so=null,sx=0,sy=0,ux=x0+G.w+20;
    if(suf){so={...on,size:size*SUF};const pi=ink(g,suf,so.size);sx=lastR+.03*size-pi.l;sy=-ink(g,s[0],size).a+pi.a;ux=Math.max(sx+pi.r+16,lastR+.12*size)}
    return {s,suf,on,G,adv,x0,lastR,so,sx,sy,ux,capA,dsc,end:ux+measure(g,unit,uo)}};
  let r=at(o.size);if(r.end>maxX){let sz=Math.floor(o.size*(maxX-x)/(r.end-x))+1;do{r=at(sz--)}while(r.end>maxX&&sz>120)}
  return r}

/* ── 드럼: 모든 자리가 t0에 함께 굴러 lock[k]에 차례로 멈춤(outCubic) — 창(위 · 아래 깃털) 안에서만 보임
   퇴장: out0부터 자리마다 st/(n−1)f 늦게 위로 outD px(E.accel) + 옅어짐 1−t(선형)
   두 창: 멈춘 사본은 단단한 창(K, 위끝 winTop), 위로 δpx 떠난 사본은 δ 0→16에서 부드러운 창(RL, winTop→+.3em 깃털)으로 옮겨 감
   — 떠나는 자리의 윗부분이 흐려지며 사라짐(제목 아래 평평한 턱 없음), 멈춘 자리는 그대로. 원통 감쇠 cyl로 먼 사본을 옅게 ── */
export function drum(g,L0,y,f,{t0,lock,R,sep=[0,0],out0,outDur=5,outSt=1,outD,alpha=1,winTop=0}){
  const {s,suf,on:o,G,adv,x0,so,sx,sy,capA}=L0,size=o.size,lh=size*1.1,h=stepH(f);
  const top=Math.max(y-size*.9,winTop),capTop=y-capA,feT=Math.max(1,Math.min(size*.14,capTop-top-1));
  const bot=y+size*.26,feB0=Math.min(bot-8,y+L0.dsc+2);   /* 아래 깃털은 쉼표 꼬리 아래에서 시작(멈춘 글자는 그대로) */
  const mk=id=>{const c=layer(id);c.font=font(size,300);c.letterSpacing='0px';c.fillStyle=o.color||C.cream;c.textBaseline='alphabetic';c.globalCompositeOperation='lighter';return c};
  const K=mk('s4drum'),RL=mk('s4drumR');let useR=false;
  const put=(ch,x,yy,a,dl)=>{if(a<=0)return;const w=dl>0?ss(clamp(dl/16)):0;if(w<1){K.globalAlpha=a*(1-w);K.fillText(ch,x,yy)}if(w>0){useR=true;RL.globalAlpha=a*w;RL.fillText(ch,x,yy)}};
  const n=G.list.length+(suf?1:0),tx=(i,ff)=>ff<out0?0:clamp((ff-out0-(n>1?outSt*i/(n-1):0))/outDur);
  const ex=(i,ff)=>-E.accel(tx(i,ff))*outD,xa=(i,ff)=>1-tx(i,ff);
  /* 한 글자: pos(ff) 화면 위치(속도 계산) · dr(ff,a) 그리기 — 표본 안을 M번 나눠 1/M씩 더함(간격 ≤1px) */
  const sub=(pos,dr)=>{const v=Math.abs(pos(f+h/2)-pos(f-h/2))/h,M=clamp(Math.ceil(v*h),1,8);
    for(let j=0;j<M;j++){const ff=M>1?f+((j+.5)/M-.5)*h:f;dr(ff,1/M)}};
  const dg=m=>String((m%10+10)%10);
  let k=0;
  G.list.forEach((q,i)=>{
    if(/\d/.test(q.ch)){const kk=k++,d=+q.ch,cx=x0+q.x+q.w/2-adv/2,V=ff=>d-R[kk]*(1-E.outCubic(seg(ff,t0,lock[kk])));
      sub(ff=>-V(ff)*lh+ex(i,ff),(ff,m)=>{const v=V(ff),b=Math.floor(v),fr=v-b,e=ex(i,ff),a=m*xa(i,ff);if(a<=0)return;
        put(dg(b),cx,y-fr*lh+e,a*cyl(fr),fr*lh-e);if(fr>1e-4)put(dg(b+1),cx,y+(1-fr)*lh+e,a*cyl(1-fr),-(1-fr)*lh-e)})}
    else sub(ff=>ex(i,ff),(ff,m)=>put(q.ch,x0+q.x,y+ex(i,ff),m*xa(i,ff)*E.outQuad(seg(ff,sep[0],sep[1])),-ex(i,ff)))});
  if(suf){const nd=lock.length;K.font=RL.font=font(so.size,300);
    sub(ff=>ex(n-1,ff),(ff,m)=>put(suf,sx,y+sy+ex(n-1,ff),m*xa(n-1,ff)*E.snap(seg(ff,lock[nd-1]-6,lock[nd-1]+2)),-ex(n-1,ff)))}
  /* 창: 위 · 아래 깃털 — K 위끝 winTop 단단히(feT), RL 위끝 winTop→+.3em 부드럽게(smootherstep) */
  const hh=bot-top,win=(c,fe,soft)=>{c.globalAlpha=1;c.globalCompositeOperation='destination-in';const gr=c.createLinearGradient(0,top,0,bot);
    if(soft)for(let j=0;j<=8;j++)gr.addColorStop(fe*j/8/hh,rgba(C.night,ss(j/8)));else{gr.addColorStop(0,rgba(C.night,0));gr.addColorStop(fe/hh,rgba(C.night,1))}
    gr.addColorStop((feB0-top)/hh,rgba(C.night,1));gr.addColorStop(1,rgba(C.night,0));c.fillStyle=gr;c.fillRect(0,0,W,H)};
  win(K,feT,false);g.save();g.globalAlpha*=alpha;g.drawImage(K.canvas,0,0);
  if(useR){win(RL,Math.min(size*.3,feB0-top-1),true);g.drawImage(RL.canvas,0,0)}g.restore()}
