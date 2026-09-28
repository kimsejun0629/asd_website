/* 메인(index · index-en) 전용 — 히어로 영상 · 사업 패널 물러남 · 스트립 복제 · 최근 소식 · 스트립 구동
   순서: site.js(KA, 화면 밖 영상 멈춤) → scroll-fx.js(data-rv · #nws 감시) → 이 파일(동기 classic, load 전에 돌아야 함) */
(()=>{
'use strict';
const {EN,EXT,reduce,MQ,onMQ,clamp,HH,esc,fmtDate,srcLabel,byDate,INPUT,loop}=window.KA;   /* EN: index.html은 lang이 없어 국문 */
const stackMQ=matchMedia(MQ.stack);   /* PC 패널 고정 화면(CSS와 같은 조건) */
/* 스트립 카드 한 장 복제 — 읽기 · 탭 순서에서 뺌 */
const cloneTo=(tr,n)=>{const c=n.cloneNode(true);c.setAttribute('aria-hidden','true');if(c.matches('a'))c.tabIndex=-1;tr.appendChild(c)};

/* 히어로 영상: 좁은 창 800 · 넓은 창 1600 */
function heroVideo(){
  const hv=document.getElementById('heroVideo');
  if(!hv)return;
  /* 125.5초부터 끝 로고로 전환: 원본 영상 위 글과 가림막만 걷음 */
  const box=hv.closest('.hv'),ending=()=>box.classList.toggle('is-ending',hv.currentTime>=125.5);
  ['timeupdate','seeking','seeked','loadedmetadata','emptied'].forEach(e=>hv.addEventListener(e,ending));
  ending();
  const mq=matchMedia(MQ.narrow);
  /* hero2: 코덱 레벨 표기를 실제에 맞게 4.0으로 고친 파일(원본은 8K급 6.2로 잘못 표기돼 일부 기기가 재생을 거부할 수 있음) */
  const V='video/hero2-',go=()=>{if(!reduce)hv.play().catch(()=>{})};hv.muted=true;hv.defaultMuted=true;
  hv.src=V+(mq.matches?'800':'1600')+'.mp4';go();
  /* 자동 재생이 거절되면(아이폰 저전력 모드 · 사파리 '자동 재생 안 함' 등) 첫 터치 · 클릭 · 키 입력 때 다시 재생 */
  const EV=INPUT,kick=()=>{if(hv.paused)go()},stop=()=>EV.forEach(e=>removeEventListener(e,kick));
  if(!reduce){EV.forEach(e=>addEventListener(e,kick,{passive:true}));hv.addEventListener('playing',stop,{once:true})}   /* 재생이 시작될 때까지(스크롤 터치처럼 허용되지 않는 입력에 소진되지 않게) */
  /* 고화질 파일을 풀지 못하면 저화질로 */
  hv.addEventListener('error',()=>{if(/-1600\./.test(hv.currentSrc||hv.src)){hv.src=V+'800.mp4';go()}});
  /* 좁은 창에서 열었다가 넓히면 고화질 영상으로 바꿔 이어서 재생 */
  const up=()=>{if(mq.matches||!/-800\./.test(hv.currentSrc||hv.src))return;const t=hv.currentTime||0;hv.src=V+'1600.mp4';hv.addEventListener('loadedmetadata',()=>{try{hv.currentTime=t}catch{}},{once:true});go()};
  onMQ(mq,up);
}

/* 스트립 셋(항공기체 · 무인기 · MRO/U 두 줄)을 2벌로 복제해 끊김 없이 흐르게 — 한 벌이 줄보다 좁은 창이면 measure()가 더 복제 */
function cloneStrips(){
  if(reduce)return;
  document.querySelectorAll('.fleet').forEach(fleet=>{fleet.querySelectorAll('.fl-track').forEach(tr=>{const o=[...tr.children];tr.dataset.sets=2;o.forEach(n=>cloneTo(tr,n))});fleet.classList.add('run')});
}

/* 사업 패널: 다음 패널이 덮을수록 앞 패널이 물러남(--k) */
function recede(){
  const panels=[...document.querySelectorAll('.bp')];
  let tick=false;
  const update=()=>{
    tick=false;const vh=innerHeight;
    if(stackMQ.matches&&!reduce){const hh=HH();
      for(let i=0;i<panels.length-1;i++){const r=panels[i+1].getBoundingClientRect();panels[i].style.setProperty('--k',clamp((vh-r.top)/(vh-hh)).toFixed(3))}}
    else panels.forEach(p=>p.style.removeProperty('--k'));
  };
  const req=()=>{if(!tick){tick=true;requestAnimationFrame(update)}};
  addEventListener('scroll',req,{passive:true});addEventListener('resize',req);update();
}

/* 최근 소식: 뉴스룸 데이터에서 최신 3건(영문은 영문 제목이 있는 것만) */
function latestNews(){
  const box=document.getElementById('nws');
  const day=d=>esc(fmtDate(d));   /* 2026.09.09 · Sep 9, 2026 */
  const src=u=>srcLabel(u,{tag:EN?' · in Korean':''});   /* 구글 사이트 · 팟빵은 호스트 이름 그대로(more 없음) */
  fetch('data/media.json').then(r=>r.json()).then(D=>{
    const N=[...(D.news||[])].filter(n=>!EN||n.title_en).sort(byDate).slice(0,3);if(N.length<3)return;
    box.innerHTML=N.map(n=>`<a class="card nc" href="${esc(n.mediaUrl_kr)}" target="_blank" rel="noopener"><div class="fr"><img src="${esc(n.img)}" alt="" loading="lazy"></div><div class="meta"><span>${day(n.updatedDate)}</span><span>${src(n.mediaUrl_kr)}</span></div><p class="t">${esc(EN?n.title_en:n.title_kr)}${EXT}</p></a>`).join('');
  }).catch(()=>{});
}

/* 항공기체 · 무인기 · MRO/U 스트립 — 자동으로 흐르고, 스크롤하면 가속, 한 바퀴 돌면 아래로.
   PC: 각 패널 뒤에 스크롤 여백(.pk-pin)을 두어 그 여백을 지나는 동안 스트립이 정확히 한 바퀴 더 돎 → 다 돌면 다음 패널이 덮으며 올라옴.
   모바일: 고정 없이, 스트립이 보이는 동안 스크롤한 만큼 더 빨리 흐름.
   MRO/U 사진 벽은 두 줄 — 윗줄은 왼쪽, 아랫줄은 오른쪽으로 같은 박자에 한 바퀴씩. cloneStrips() · recede() 뒤에 돌아야 함(복제 · data-sets · --k) */
function driveStrips(){
  if(reduce)return;
  const strips=['aero','uav','mro'].map(id=>{
    const panel=document.getElementById(id),fleet=panel&&panel.querySelector('.fleet'),pin=document.querySelector(`.pk-pin[data-for="${id}"]`);
    if(!fleet)return null;
    const tracks=[...fleet.querySelectorAll('.fl-track')];
    const prog=document.createElement('span');prog.className='pk-prog';prog.setAttribute('aria-hidden','true');fleet.appendChild(prog);
    fleet.classList.add('drive');
    /* 스트립이 화면 가까이 오면 가로로 가려진 카드 사진까지 미리 불러옴(지연 로딩 때문에 흐르다 빈 칸이 보이지 않게) */
    const io=new IntersectionObserver(es=>{if(!es.some(e=>e.isIntersecting))return;io.disconnect();fleet.querySelectorAll('img[loading="lazy"]').forEach(im=>im.loading='eager')},{rootMargin:'150% 0px'});io.observe(fleet);
    const s={panel,fleet,pin,tracks,prog,loops:tracks.map(()=>1),loop:1,P:0,a:0,hover:false};
    fleet.addEventListener('pointerenter',()=>s.hover=true);fleet.addEventListener('pointerleave',()=>s.hover=false);
    return s;
  }).filter(Boolean);
  function measure(){strips.forEach(s=>{
    const flat=!(parseFloat(getComputedStyle(s.panel).getPropertyValue('--k'))>0);   /* 뒤 패널이 덮으며 이 패널이 작아지는 중이 아니면 화면 거리 = 배치 거리 */
    s.loops=s.tracks.map(t=>{const C=t.children;let n=+t.dataset.sets||2,one=t.scrollWidth/n;const k=C.length/n;   /* 카드가 복제되어 있어 한 벌 너비가 한 바퀴 */
      /* 한 벌 너비 = 첫 카드 → 첫 복제 카드의 화면 거리(소수점까지) · 패널이 작아지는 중엔 scrollWidth/벌 수(2px 넘게 어긋나면 화면 거리 — 바퀴 끝에서 튀지 않게) */
      const od=C[k].offsetLeft-C[0].offsetLeft,rd=C[k].getBoundingClientRect().left-C[0].getBoundingClientRect().left;if(flat&&Math.abs(rd-od)<1.5)one=rd;else if(Math.abs(od-one)>2)one=od;
      /* 한 바퀴 끝에서 (벌 수−1)×한 벌이 줄 너비보다 좁으면 오른쪽 끝이 비므로, 줄을 덮을 만큼 원본 한 벌씩 더 복제(창이 넓어질 때도) */
      const vis=t.parentElement.clientWidth;if(one>0&&(n-1)*one<vis+1){const need=1+Math.ceil((vis+1)/one),o=[...C].slice(0,k);
        for(;n<need;n++)o.forEach(x=>cloneTo(t,x));t.dataset.sets=n}
      return Math.max(1,one)});
    s.loop=Math.max(...s.loops);
    s.P=stackMQ.matches?Math.round(Math.max(innerHeight*1.25,Math.min(s.loop*.55,innerHeight*3))):0;   /* 긴 스트립도 세로가 낮은 화면에서 너무 오래 머물지 않게 */
    if(s.pin)s.pin.style.setProperty('--pin',s.P+'px');
  })}
  /* 프레임 루프: 화면 근처에서 흐르는 스트립이 있거나 스크롤하는 동안만 돌고, 둘 다 아니면 멈춤(값이 그대로라 다시 쓸 것이 없음).
     스크롤 · 창 크기 · load · 스트립에 포인터가 드나들 때 · 패널 · 여백 · 스트립 크기가 바뀔 때 · 스트립이 화면 근처에 드나들 때 다시 켬 */
  let last=performance.now(),lastY=scrollY,gap=1000/60,fresh=false;
  const wake=loop(frame,()=>{fresh=true});   /* 다시 켠 첫 프레임은 직전 프레임 간격만큼만 흐름(멈춰 있던 시간을 건너뛰지 않게) */
  measure();addEventListener('resize',()=>{measure();wake()});addEventListener('load',()=>{measure();wake()});
  addEventListener('scroll',wake,{passive:true});
  strips.forEach(s=>{s.fleet.addEventListener('pointerenter',wake);s.fleet.addEventListener('pointerleave',wake)});
  const io=new IntersectionObserver(wake,{rootMargin:'50% 0px'});strips.forEach(s=>io.observe(s.fleet));   /* 보조(교차 출처 틀 안에서는 여백이 무시될 수 있음) */
  const ro=new ResizeObserver(wake);strips.forEach(s=>[s.panel,s.pin,s.fleet].forEach(e=>e&&ro.observe(e)));   /* 글꼴 · 사진이 늦게 와 높이가 바뀌어도 */
  function frame(t){
    if(fresh){fresh=false;last=t-gap}else if(t>last)gap=Math.min(50,t-last);
    const dt=Math.min(.05,(t-last)/1000);last=t;const dy=scrollY-lastY;lastY=scrollY;
    const hh=HH(),vh=innerHeight;
    /* 위치를 모두 먼저 읽고 나서 씀(읽기와 쓰기가 섞이면 스트립마다 스타일을 다시 계산함) */
    const G=strips.map(s=>[s.fleet.getBoundingClientRect(),s.P&&s.pin?hh+s.panel.offsetHeight-s.pin.getBoundingClientRect().top:0]);
    let moving=dy!==0;
    strips.forEach((s,k)=>{
      const fr=G[k][0],near=fr.bottom>-vh*.5&&fr.top<vh*1.5;
      if(!s.hover&&near){s.a+=dt/80;moving=true}                     /* 기본 속도: 80초에 한 바퀴 · 화면 근처에서만 흘러 패널에 들어서면 첫 카드부터 */
      let p=0;
      if(s.P&&s.pin)p=clamp(G[k][1]/s.P);
      else if(fr.bottom>0&&fr.top<vh)s.a+=dy*1.2/s.loop;
      const f=(((s.a+p)%1)+1)%1;
      s.tracks.forEach((tr,i)=>{const L=s.loops[i],x=i%2?(f-1)*L:-f*L,v=`translate3d(${x.toFixed(1)}px,0,0)`;if(tr._v!==v){tr.style.transform=v;tr._v=v}});   /* 바뀐 값만 씀 */
      const pv=`scaleX(${p.toFixed(4)})`;if(s.prog._v!==pv){s.prog.style.transform=pv;s.prog._v=pv}
    });
    return moving;
  }
  wake();   /* 첫 시작(on 없이 — 첫 프레임은 불러온 때부터의 간격) */
}

heroVideo();
cloneStrips();
recede();
latestNews();
queueMicrotask(driveStrips);   /* v60은 여기서 스크립트가 나뉘었음 — scroll-fx MO 콜백(→ rAF watch)이 스트립 첫 rAF보다 먼저 돌게 */
})();
