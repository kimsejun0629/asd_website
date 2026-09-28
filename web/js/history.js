/* 대한항공 항공우주사업본부 · 연혁 가로 타임라인
   세로로 스크롤하면 연도가 옆으로 넘어감. 가운데 연도가 가장 크고 선명하며, 좌우로 멀어질수록 작고 흐려짐.
   드래그·스와이프·트랙패드 가로 제스처·이전/다음 버튼·키보드·아래 눈금자로도 이동
   company.html · company-en.html: site.js(KA) 뒤, scroll-fx.js 앞(scroll · resize 리스너 순서) */
(()=>{
'use strict';
const {EN,reduce,esc,pad2,clamp,HH,loop}=window.KA;
const hx=document.getElementById('hx');if(!hx)return;
const sec=hx.closest('section')||hx;
const stage=hx.querySelector('.hx-stage'),track=hx.querySelector('.hx-track'),ruler=hx.querySelector('.hx-ruler'),
      cnt=hx.querySelector('.hx-count'),era=hx.querySelector('.hx-era'),prevB=hx.querySelector('.hx-prev'),nextB=hx.querySelector('.hx-next'),hint=hx.querySelector('.hx-hint');
const eraName=y=>{const d=Math.floor(y/10)*10;return EN?`${d}s`:`${d}년대`};

/* 가운데에서 멀어질수록 작게 · 흐리게 · 옅게 (a = 가운데로부터의 거리, 카드 단위) */
const SC=a=>a<=1?1-.22*a:a<=2?.78-.16*(a-1):a<=3?.62-.12*(a-2):Math.max(.42,.5-.04*(a-3));
const BL=a=>a<.06?0:Math.min(10,(a-.06)*3.2);
const OP=a=>a<=1?1-.3*a:Math.max(0,.7-.24*(a-1));
/* 스크롤 대비 이동량: 연도 근처에서는 천천히, 연도 사이에서는 빠르게 → 한 해씩 멈춰 서는 느낌 */
const K=.5,TAU=Math.PI*2;
const dwell=s=>{const f=Math.floor(s),t=s-f;return f+t-K*Math.sin(TAU*t)/TAU};
const undwell=q=>{const f=Math.floor(q),g=q-f;let t=g;for(let k=0;k<6;k++){const e=t-K*Math.sin(TAU*t)/TAU-g,d=1-K*Math.cos(TAU*t);t=clamp(t-e/d,0,1)}return f+t};

let R=[],N=0,cards=[],ticks=[],decs=[],years=[],Y0=1975,Y1=2022,mark=null;
let cw=420,SW=1e4,gap=40,X=[0],sp=1,step=200,hdr=76;
let p=0,cur=-1,lastP=-1,fadeTimer=0,moved=false,wasPinned=false,shown=false;
let drag=null,suppress=false,wq=null,wt=0,rdrag=false,settleT=0;
const wake=loop(frame);   /* 연도가 움직이는 동안만 도는 프레임 루프(아래 frame) — 불러오기 · 다시 배치 · 스크롤이 깨움 */

fetch('data/history.json').then(r=>r.json()).then(d=>{
  R=(Array.isArray(d)?d:[]).slice().sort((a,b)=>(+a.y)-(+b.y));N=R.length;
  if(!N){hx.hidden=true;return}
  build();relayout();wake();
}).catch(()=>{hx.hidden=true});

function build(){
  years=R.map(r=>+r.y);Y0=years[0];Y1=years[N-1];
  track.innerHTML=R.map((r,i)=>{
    const ev=(EN&&r.ev_en&&r.ev_en.length)?r.ev_en:r.ev,im=r.img||[];
    const ph=im.length
      ?`<div class="hx-ph">${im.map((s,j)=>`<img src="${esc(s)}" alt="${esc(ev[j]||ev[0])}"${j?'':' class="on"'} loading="lazy" decoding="async" draggable="false">`).join('')}${im.length>1?`<span class="n">1 / ${im.length}</span>`:''}</div>`
      :`<div class="hx-ph none" aria-hidden="true"><span>${esc(r.y)}</span></div>`;
    return `<li class="hx-card" data-i="${i}"><h3 class="hx-y">${esc(r.y)}</h3>${ph}<ul class="hx-ev">${ev.map(e=>`<li>${esc(e)}</li>`).join('')}</ul></li>`;
  }).join('');
  cards=[...track.children];
  cards.forEach(c=>{c._ph=c.querySelector('.hx-ph');c._im=[...c.querySelectorAll('.hx-ph img')];c._n=c.querySelector('.hx-ph .n');c._b=-1;c._vis=false});
  const pct=y=>((y-Y0)/(Y1-Y0)*100).toFixed(3)+'%';
  const DEC=[[Y0,1]];for(let d=Math.floor(Y0/10)*10+10;d<=Y1;d+=10)DEC.push([d,0]);
  ruler.innerHTML=`<div class="hx-axis"></div>${years.map(y=>`<i class="hx-tk" style="left:${pct(y)}"></i>`).join('')}<div class="hx-mark"></div>`+
    DEC.map(([y,s])=>{const i=Math.max(0,years.findIndex(v=>v>=y));
      const lab=s?(EN?`Go to ${y}`:`${y}년으로 이동`):(EN?`Go to the ${y}s`:`${y}년대로 이동`);
      return `<button type="button" class="hx-dec${s?' s':''}" data-i="${i}" data-y="${y}" style="left:${pct(y)}" aria-label="${lab}">${y}</button>`}).join('');
  ticks=[...ruler.querySelectorAll('.hx-tk')];decs=[...ruler.querySelectorAll('.hx-dec')];mark=ruler.querySelector('.hx-mark');
}

/* 화면 크기에 맞춰 카드 폭·사진 높이·스크롤 길이를 정함 (가장 긴 연도도 한 화면에 들어오게) */
function relayout(){
  if(sec.hidden||!N)return;
  hdr=HH();
  /* 창 크기가 바뀌어도 보고 있던 연도를 그대로 가운데에 둠 */
  const keep=wasPinned?undwell(clamp(p,0,N-1)):null;
  const W=stage.clientWidth,Hs=stage.clientHeight,mob=W<=600,narrow=W<=900;
  const tiny=Hs<440,compact=mob&&Hs<620;
  stage.classList.toggle('tiny',tiny);stage.classList.toggle('compact',compact);
  cards.forEach(c=>c.classList.remove('dense'));
  const top=tiny?52:compact?70:(narrow?96:112),cardMax=Hs-top-(tiny?28:66)-(tiny?4:mob?12:24);
  let w=0,shift=0,wide=!mob&&Hs<620;
  if(!wide){
    stage.classList.remove('wide');
    /* 카드 폭: 설명이 가장 긴 해도 사진이 너무 납작해지지 않을 만큼 (폰은 폭을 줄이면 글이 더 길어지므로 폭은 유지) */
    const wMin=mob?220:260;let non=[];
    w=mob?Math.min(W*.78,340):clamp(W*.34,300,560);
    for(let it=0;it<8;it++){
      stage.style.setProperty('--cw',w+'px');
      non=cards.map(c=>c.offsetHeight-c._ph.offsetHeight);
      if(mob||cardMax-Math.max(...non)>=w*.34||w<=wMin)break;
      w=Math.max(wMin,w*.9);
    }
    if(!mob&&w<W*.28)wide=true;   /* 세로형으로는 카드가 너무 작아지면 가로형으로 */
    else{
      /* 사진 높이: 보통 해는 4:3까지 키우고, 설명이 긴 해만 그만큼 사진을 줄임. 보통 카드가 위아래 가운데쯤 오도록 선 위치도 내림 */
      const med=[...non].sort((x,y)=>x-y)[Math.floor(non.length/2)];
      const target=clamp(cardMax-med,w*.5,w*.75);
      shift=Math.max(0,(cardMax-med-target)*.42);
      cards.forEach((c,i)=>{if(cardMax-shift-non[i]<w*.4){c.classList.add('dense');non[i]=c.offsetHeight-c._ph.offsetHeight}});
      cards.forEach((c,i)=>c.style.setProperty('--ih',Math.round(clamp(cardMax-shift-non[i],w*.22,target))+'px'));
    }
  }
  if(wide){
    /* 세로가 낮은 창(노트북 브라우저, 가로로 눕힌 폰): 사진 왼쪽 · 글 오른쪽의 가로형 카드 */
    stage.classList.add('wide');
    w=clamp(W*(tiny?.76:.58),420,820);stage.style.setProperty('--cw',w+'px');
    /* 해마다 따로: 글이 들어가는 한 사진을 가장 크게(카드 폭의 46%까지), 글이 긴 해만 사진 폭을 줄임 */
    const FS=[.46,.41,.36,.31,.26,.22,.18].filter(v=>v>=(tiny?.18:.26));
    const tx=[],ihs=[];
    cards.forEach((c,i)=>{
      c.style.setProperty('--ih','1px');let f=FS[FS.length-1];
      for(const v of FS){c.style.setProperty('--iw',Math.round(w*v)+'px');if(c.offsetHeight<=cardMax){f=v;break}}
      c.style.setProperty('--iw',Math.round(w*f)+'px');
      if(c.offsetHeight>cardMax)c.classList.add('dense');
      tx[i]=c.offsetHeight;ihs[i]=Math.round(Math.min(w*f*.75,cardMax-20));
    });
    const hs=cards.map((_,i)=>Math.max(ihs[i]+20,tx[i]));
    const med=[...hs].sort((x,y)=>x-y)[Math.floor(hs.length/2)];
    shift=Math.max(0,Math.min((cardMax-med)*.42,cardMax-Math.max(...hs)));
    cards.forEach((c,i)=>c.style.setProperty('--ih',ihs[i]+'px'));
  }
  stage.style.setProperty('--ly',Math.round(top+shift)+'px');
  cw=w;SW=W;gap=Math.round(w*(mob||wide?.06:.1));
  X=[0];for(let k=1;k<=10;k++)X[k]=X[k-1]+(SC(k-1)+SC(k))/2*(cw+gap);
  sp=X[1];
  step=Math.round(clamp(innerHeight*(mob?.2:.22),120,220));
  hx.style.height=(Hs+(N-1)*step)+'px';
  lastP=-1;wake();
  if(keep!=null){const r1=hx.getBoundingClientRect();window.scrollTo({top:scrollY+r1.top-hdr+keep*step,behavior:'instant'})}
}

/* 프레임 루프(wake): 스크롤 · 다시 배치(창 크기 · 글꼴 · 불러오기 · 탭 열림) 때 켜고, 멈춰 서거나 탭이 숨으면 끔(false) */
function frame(){
  if(sec.hidden||!N)return false;
  const r=hx.getBoundingClientRect();
  /* 윗줄(연대 · 순서 · 버튼) · 안내 · 눈금자는 가운데 연도 사진이 화면에 다 들어올 때 함께 나타남 */
  if(!shown){const c=cards[Math.max(cur,0)],b=c&&c._ph.getBoundingClientRect();if(b&&b.height&&b.bottom<=innerHeight-8){shown=true;hx.classList.add('in')}}
  wasPinned=r.top<=hdr+1&&r.bottom>=innerHeight-1;
  const q=dwell(clamp((hdr-r.top)/step,0,N-1));
  p=reduce?q:p+(q-p)*(drag&&drag.axis==='x'?.4:.16);
  if(Math.abs(q-p)<.0006)p=q;
  if(Math.abs(p-lastP)<.00005)return !(p===q&&!drag);
  lastP=p;render();return true;
}

function render(){
  for(let i=0;i<N;i++){
    const c=cards[i],d=i-p,a=Math.abs(d);
    const k=Math.min(Math.floor(a),5),f=a-k,x=(X[k]+(X[k+1]-X[k])*f)*(d<0?-1:1);
    /* 투명도 0이거나 무대(overflow:hidden) 밖으로 다 나간 카드는 레이어를 풂 (흐림 번짐 여유 40px) */
    if(a>5.2||OP(a)<=0||Math.abs(x)-cw*SC(a)/2-40>SW/2){if(c._vis){c.style.opacity='0';c.style.pointerEvents='none';c.style.willChange='auto';c.style.transform=c.style.filter='';c._b=-1;c._vis=false}continue}
    if(!c._vis){c.style.pointerEvents='auto';c.style.willChange='transform,filter,opacity';c._vis=true}
    c.style.transform=`translate3d(${x.toFixed(1)}px,0,0) scale(${SC(a).toFixed(4)})`;
    const b=Math.round(BL(a)*4)/4;if(b!==c._b){c.style.filter=b?`blur(${b}px)`:'none';c._b=b}
    c.style.opacity=OP(a).toFixed(3);c.style.zIndex=String(100-Math.round(a*10));
  }
  const ci=clamp(Math.round(p),0,N-1);if(ci!==cur)setCur(ci);
  const i0=clamp(Math.floor(p),0,N-1),i1=Math.min(N-1,i0+1),y=years[i0]+(years[i1]-years[i0])*(p-i0);
  mark.style.left=((y-Y0)/(Y1-Y0)*100).toFixed(3)+'%';
  if(!moved&&p>.35){moved=true;if(hint)hint.classList.add('off')}
}

function setCur(ci){
  if(cur>=0&&cards[cur]){cards[cur].classList.remove('on');cards[cur].removeAttribute('aria-current');ticks[cur].classList.remove('on')}
  cur=ci;const c=cards[ci];c.classList.add('on');c.setAttribute('aria-current','true');ticks[ci].classList.add('on');
  cnt.innerHTML=`<b>${pad2(ci+1)}</b> / ${pad2(N)}`;
  const y=years[ci];era.textContent=eraName(y);
  let on=null;decs.forEach(b=>{if(+b.dataset.y<=y)on=b});decs.forEach(b=>b.classList.toggle('on',b===on));
  prevB.disabled=ci<=0;nextB.disabled=ci>=N-1;
  clearInterval(fadeTimer);
  if(!reduce&&c._im.length>1){let j=Math.max(0,c._im.findIndex(im=>im.classList.contains('on')));
    fadeTimer=setInterval(()=>{if(sec.hidden)return;c._im[j].classList.remove('on');j=(j+1)%c._im.length;c._im[j].classList.add('on');if(c._n)c._n.textContent=`${j+1} / ${c._im.length}`},2800)}
}

/* 이동: i번째 연도가 가운데 오도록 페이지 스크롤 위치를 맞춤 */
const scrollFor=q=>{const r=hx.getBoundingClientRect();return scrollY+r.top-hdr+undwell(clamp(q,0,N-1))*step};
function go(i,smooth=true){if(!N)return;i=clamp(Math.round(i),0,N-1);const far=Math.abs(i-p)>4;window.scrollTo({top:scrollFor(i),behavior:(smooth&&!reduce&&!far)?'smooth':'instant'})}
const pinnedNow=()=>{const r=hx.getBoundingClientRect();return r.top<=hdr+2&&r.bottom>=innerHeight-2};

prevB.addEventListener('click',()=>go(cur-1));
nextB.addEventListener('click',()=>go(cur+1));
track.addEventListener('keydown',e=>{
  const k=e.key;let t=null;
  if(k==='ArrowRight')t=cur+1;else if(k==='ArrowLeft')t=cur-1;else if(k==='Home')t=0;else if(k==='End')t=N-1;
  if(t!=null){e.preventDefault();go(t)}
});
/* 옆 연도를 누르면 그 연도가 가운데로 */
track.addEventListener('click',e=>{if(suppress)return;const c=e.target.closest('.hx-card');if(c&&!c.classList.contains('on'))go(+c.dataset.i)});

/* 가로 드래그·스와이프: 손가락(마우스)을 따라 연도가 움직이고, 놓으면 가까운 연도에 멈춤 */
stage.addEventListener('pointerdown',e=>{
  if(e.button!==0||e.target.closest('button,.hx-ruler'))return;
  drag={id:e.pointerId,x0:e.clientX,y0:e.clientY,q0:p,axis:null,h:[[performance.now(),e.clientX]]};
});
stage.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id)return;
  const dx=e.clientX-drag.x0,dy=e.clientY-drag.y0;
  if(!drag.axis){
    if(Math.abs(dx)<7&&Math.abs(dy)<7)return;
    if(Math.abs(dx)>Math.abs(dy)*1.1&&pinnedNow()){drag.axis='x';try{stage.setPointerCapture(e.pointerId)}catch{}stage.classList.add('drag')}
    else{drag=null;return}
  }
  window.scrollTo({top:scrollFor(drag.q0-dx/sp),behavior:'instant'});
  drag.h.push([performance.now(),e.clientX]);if(drag.h.length>6)drag.h.shift();
});
function endDrag(e,cancel){
  if(!drag||e.pointerId!==drag.id)return;
  const d=drag;drag=null;stage.classList.remove('drag');
  if(d.axis!=='x')return;
  suppress=true;setTimeout(()=>{suppress=false},0);
  const h=d.h,dt=h[h.length-1][0]-h[0][0],v=dt>0?(h[h.length-1][1]-h[0][1])/dt:0;
  const qNow=d.q0-((cancel?h[h.length-1][1]:e.clientX)-d.x0)/sp;
  go(Math.round(qNow-v*150/sp));
}
stage.addEventListener('pointerup',e=>endDrag(e,false));
stage.addEventListener('pointercancel',e=>endDrag(e,true));

/* 트랙패드 가로 제스처 */
stage.addEventListener('wheel',e=>{
  if(Math.abs(e.deltaX)<=Math.abs(e.deltaY)||!pinnedNow())return;
  e.preventDefault();
  const dx=e.deltaMode===1?e.deltaX*16:e.deltaX;
  wq=clamp((wq==null?p:wq)+dx/sp,0,N-1);
  window.scrollTo({top:scrollFor(wq),behavior:'instant'});
  clearTimeout(wt);wt=setTimeout(()=>{const t=Math.round(wq);wq=null;go(t)},170);
},{passive:false});

/* 눈금자: 누르거나 끌면 가까운 연도로, 연대 글자는 그 연대의 첫 해로 */
const nearestYear=x=>{const rr=ruler.querySelector('.hx-axis').getBoundingClientRect();const y=Y0+clamp((x-rr.left)/rr.width,0,1)*(Y1-Y0);let bi=0,bd=1e9;years.forEach((v,i)=>{const d=Math.abs(v-y);if(d<bd){bd=d;bi=i}});return bi};
ruler.addEventListener('pointerdown',e=>{
  const b=e.target.closest('.hx-dec');if(b){e.preventDefault();go(+b.dataset.i);return}
  rdrag=true;try{ruler.setPointerCapture(e.pointerId)}catch{}go(nearestYear(e.clientX),false);
});
ruler.addEventListener('pointermove',e=>{if(rdrag)go(nearestYear(e.clientX),false)});
ruler.addEventListener('pointerup',()=>{rdrag=false});
ruler.addEventListener('pointercancel',()=>{rdrag=false});
ruler.addEventListener('click',e=>{const b=e.target.closest('.hx-dec');if(b&&e.detail===0)go(+b.dataset.i)});

/* 스크롤을 멈춘 곳이 두 연도 사이면 가까운 연도로 살짝 맞춤 */
addEventListener('scroll',()=>{wake();clearTimeout(settleT);if(!drag&&wq==null&&!rdrag)settleT=setTimeout(settle,260)},{passive:true});
function settle(){
  if(drag||wq!=null||rdrag||sec.hidden||!N||!pinnedNow())return;
  const r=hx.getBoundingClientRect(),s=(hdr-r.top)/step;if(s<=.02||s>=N-1.02)return;
  const q=dwell(s),f=q-Math.floor(q);if(f<.1||f>.9)return;
  go(Math.round(q));
}

/* 다시 배치 전에 frame()이 먼저 돌게(원래 순서: 고정 여부 wasPinned를 새로 잰 뒤 relayout)
   그 한 프레임은 무대 폭으로 거르지 않음(창이 넓어진 순간 가장자리 카드가 빠지지 않게) */
let rq=0;const soon=()=>{SW=1e4;lastP=-1;wake();cancelAnimationFrame(rq);rq=requestAnimationFrame(relayout)};
addEventListener('resize',soon);
document.fonts&&document.fonts.ready.then(soon);
addEventListener('load',soon);
new MutationObserver(()=>{if(!sec.hidden){lastP=-1;soon()}}).observe(sec,{attributes:true,attributeFilter:['hidden']});
})();
