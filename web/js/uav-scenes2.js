/* 무인기 장면 6~9장(표적기 · 소형 자폭 · 함상 · Digital MRO). uav.html · uav-en.html — uav-scenes1.js 뒤, uav.js 앞
   등록만 함: U.SC[i]=(g, {tag,place,defs,rep}, TL=이 장의 라벨 글) => (t => 초점) · rep(글 3줄) = 늘 보이는 리포트 카드(uav.js) */
(()=>{
'use strict';
const U=window.UAV,SC=U.SC;
const {C,seg,lerp,eo,eio,el,tr,op,sil,bg,track,contrail,missile,bracket,link,setLine,boom}=U;

// 6 KUS-100UAT — 함상 발사대에서 표적기 2대 발사 → 팔자 · 급기동 → RCS · IR 증폭 → 수면 위 저고도 → 유도탄 근접 통과 · MDI 평가
SC[5]=(g,{tag,place,defs,rep},TL)=>{
  bg(el('g',{},g),'b4');
  const mtb=sil('ship',g);tr(mtb,760,800,-14,.85);op(mtb,1);          /* 다목적훈련지원정(발사 · 통제) */
  const tsh=sil('ship',g);tr(tsh,1228,440,215,.95);op(tsh,1);         /* 훈련 대상 함정(사격) */
  const LP={x:846,y:772},AN={x:738,y:806},SH={x:1228,y:440};
  el('path',{d:'M826,782L862,764',stroke:C.cream,'stroke-width':3,'stroke-linecap':'round','vector-effect':'non-scaling-stroke'},g);
  /* TD-1: 발사 → 팔자 기동(제로노 곡선 두 바퀴) */
  const A8=190,B8=110,C8={x:930,y:250},th0=5.2,P8=th=>`${(C8.x+A8*Math.sin(th)).toFixed(1)},${(C8.y+B8*Math.sin(2*th)).toFixed(1)}`;
  const tl1=track(g,`M${LP.x},${LP.y}Q646,314 ${P8(th0)}`);
  let d8='M'+P8(th0);for(let i=1;i<=260;i++)d8+='L'+P8(th0+i/260*4*Math.PI);const tf1=track(g,d8);
  const TD1=t=>t<.17?tl1.at(Math.pow(seg(t,.05,.17),1.25)):tf1.at(seg(t,.17,1));
  /* TD-2: 발사 → 급기동(지그재그) → 선회 대기 → 수면 위 저고도 접근 → 이탈 */
  const S2=[[.1,.19,`M${LP.x},${LP.y}C880,720 890,690 900,660`],
    [.19,.4,'M900,660L940,610L980,662L1020,600L1060,652L1092,592'],
    [.4,.58,'M1092,592C1122,540 1062,500 1012,520C952,545 962,610 1002,622'],
    [.58,.84,'M1002,622C1030,604 1052,578 1080,542'],
    [.84,1,'M1080,542C1112,500 1072,452 1020,440']].map(([a,b,d])=>({a,b,k:track(g,d)}));
  const hdg=(k,u,s=12)=>{const p=k.pt(Math.max(0,u-s/k.L)),q=k.pt(Math.min(1,u+s/k.L));return Math.atan2(q.y-p.y,q.x-p.x)*57.2958};
  const TD2=t=>{const s=S2.find(q=>t<q.b)||S2[S2.length-1],u=seg(t,s.a,s.b),p=s.k.pt(u);return {x:p.x,y:p.y,r:hdg(s.k,u)}};
  const ct1=contrail(g),ct2=contrail(g),spray=contrail(g,{head:'#EEF3F4',color:C.cream80,w:2.4,n:14,op:.7});
  /* 레이더 · 함포 · 유도탄 */
  const sweep=el('g',{},g);tr(sweep,SH.x,SH.y);const sr=300;
  el('circle',{r:sr,fill:'none',stroke:C.cream,'stroke-opacity':.3,'stroke-width':1,'stroke-dasharray':'4 6','vector-effect':'non-scaling-stroke'},sweep);
  const wedge=el('path',{d:`M0,0L${sr},0A${sr},${sr} 0 0 1 ${sr*Math.cos(.6)},${sr*Math.sin(.6)}Z`,fill:C.cream,'fill-opacity':.1},sweep);
  const gunL=link(g,'6 6'),lock1=link(g,'6 6'),lock2=link(g,'6 6'),lk1=link(g),lk2=link(g);
  const flak=[0,1,2,3,4].map(()=>el('circle',{fill:'none',stroke:C.cream80,'stroke-width':1.4,'vector-effect':'non-scaling-stroke'},g));
  const FO=[[-26,-18],[22,-30],[-10,26],[34,12],[-40,4]];
  const rcs=[0,1,2].map(()=>el('circle',{fill:'none',stroke:C.cream,'stroke-width':1.2,'vector-effect':'non-scaling-stroke'},g));
  {const rg=el('radialGradient',{id:'irg'},defs);[['0','#F2E3C4',.85],['.45','#C2A673',.45],['1','#83735B',0]].forEach(([o,c,a])=>el('stop',{offset:o,'stop-color':c,'stop-opacity':a},rg))}
  const irc=el('circle',{r:46,fill:'url(#irg)'},g);
  const M0={x:1212,y:452},MC={x:1160,y:494},PC={x:1068,y:522};
  const MSL=t=>{if(t<=.84){const k=Math.pow(seg(t,.72,.84),1.2),a=M0,b=MC,c=PC;return {x:(1-k)*(1-k)*a.x+2*(1-k)*k*b.x+k*k*c.x,y:(1-k)*(1-k)*a.y+2*(1-k)*k*b.y+k*k*c.y}}
    const dx=PC.x-MC.x,dy=PC.y-MC.y,L=Math.hypot(dx,dy),e=(t-.84)*1400;return {x:PC.x+dx/L*e,y:PC.y+dy/L*e}};
  const smoke={head:'#F2ECE3',color:C.cream80,w:1.8,n:18,op:.95};const cM=contrail(g,smoke),ms=missile(g);
  const mdi=[0,1].map(()=>el('circle',{fill:'none',stroke:C.cream,'stroke-width':1.2,'stroke-dasharray':'4 4','vector-effect':'non-scaling-stroke'},g));
  const mdL=el('line',{stroke:C.gold,'stroke-width':2,'vector-effect':'non-scaling-stroke'},g);
  const boost=[0,1].map(()=>el('line',{stroke:C.cream,'stroke-width':3,'stroke-linecap':'round','vector-effect':'non-scaling-stroke'},g));
  const ac2=sil('tgt',g),ac=sil('tgt',g);
  ac._sp.hero=true;
  const Lmtb=tag(TL.mtb),Lts=tag(TL.ts),Llk=tag(TL.lk,'big'),Lt1=tag('TD-1'),Lt2=tag('TD-2'),L8=tag(TL.f8,'big'),Ljk=tag(TL.jk,'big'),Lgun=tag(TL.gun),Lrcs=tag(TL.rcs,'big'),Lir=tag(TL.ir,'big'),Lrad=tag(TL.rad),Lsk=tag(TL.skim,'big'),Lms=tag(TL.msl),Lmd=tag(TL.mdi,'big l');
  const repO=rep(TL.rep);   /* MDI 평가 리포트 카드(늘 보임) */
  return t=>{
    place(Lmtb,760,800,seg(t,.02,.06)*(1-seg(t,.18,.22)),120,40);
    const a=TD1(t),b=TD2(t);
    /* 발사: 발사대에서 로켓 부스터로 */
    [[a,.05,.08],[b,.1,.13]].forEach(([p,s,e],i)=>{const q=boost[i];q.setAttribute('x1',p.x);q.setAttribute('y1',p.y);q.setAttribute('x2',p.x-Math.cos(p.r/57.3)*54);q.setAttribute('y2',p.y-Math.sin(p.r/57.3)*54);op(q,seg(t,s,s+.01)*(1-seg(t,e-.01,e)))});
    ac._sp.altK=seg(t,.05,.16);tr(ac,a.x,a.y,a.r,1.1);op(ac,seg(t,.12,.16));ct1.update(TD1,t,.06,.1);
    const low=seg(t,.58,.64)*(1-seg(t,.86,.94));ac2._sp.altK=seg(t,.1,.2)*(1-.88*low);tr(ac2,b.x,b.y,b.r,lerp(1,.9,low));op(ac2,seg(t,.1,.13));ct2.update(TD2,t,.11,.1,1-.7*low);spray.update(TD2,t,.6,.06,seg(t,.6,.64)*(1-seg(t,.84,.88)));
    /* 통제링크: 한 척의 지원정에서 두 대를 함께 */
    const lv=seg(t,.12,.18);setLine(lk1,AN,a,t);setLine(lk2,AN,b,t);op(lk1,lv*.8);op(lk2,lv*.8);place(Llk,lerp(AN.x,a.x,.45),lerp(AN.y,a.y,.45),lv*(1-seg(t,.21,.24)),14,-10);
    const nv=seg(t,.15,.18)*(1-seg(t,.22,.25));place(Lt1,a.x,a.y,nv,24,-22);place(Lt2,b.x,b.y,nv,24,24);
    place(Lts,SH.x,SH.y,seg(t,.18,.24)*(1-seg(t,.4,.44)),-30,-40);
    /* 팔자 기동(함포 사격 훈련 표적) · 급기동 */
    place(L8,C8.x,C8.y-B8,seg(t,.24,.28)*(1-seg(t,.38,.42)),0,-24);place(Ljk,1020,600,seg(t,.25,.29)*(1-seg(t,.38,.42)),24,34);
    const gv=seg(t,.22,.26)*(1-seg(t,.38,.42));setLine(gunL,SH,a,t);op(gunL,gv*.8);place(Lgun,SH.x,SH.y,gv,-30,-40);
    flak.forEach((c,i)=>{const ph=(t*36+i/5)%1,p=TD1(Math.max(.2,t-.012-i*.006));c.setAttribute('cx',(p.x+FO[i][0]).toFixed(1));c.setAttribute('cy',(p.y+FO[i][1]).toFixed(1));c.setAttribute('r',(3+14*ph).toFixed(1));op(c,gv*(1-ph)*.85)});
    /* RCS · IR 증폭 → 레이더 탐지 · 추적 */
    const sv=seg(t,.4,.44)*(1-seg(t,.56,.6));rcs.forEach((c,i)=>{const ph=(t*9+i/3)%1;c.setAttribute('cx',a.x);c.setAttribute('cy',a.y);c.setAttribute('r',18+ph*110);op(c,sv*(1-ph)*.85)});place(Lrcs,a.x,a.y,sv,30,-30);
    const iv=seg(t,.42,.46)*(1-seg(t,.56,.6));irc.setAttribute('cx',b.x);irc.setAttribute('cy',b.y);irc.setAttribute('r',(40+8*Math.sin(t*90)).toFixed(1));op(irc,iv);place(Lir,b.x,b.y,iv,34,30);
    const rv=seg(t,.38,.44)*(1-seg(t,.86,.9));op(sweep,rv);wedge.setAttribute('transform',`rotate(${t*1400%360})`);place(Lrad,SH.x-sr*.5,SH.y-sr*.6,seg(t,.44,.48)*(1-seg(t,.56,.6)),12,0);
    const kv=seg(t,.46,.5)*(1-seg(t,.86,.9));setLine(lock1,SH,a,t);setLine(lock2,SH,b,t);op(lock1,kv*.6*(1-seg(t,.58,.62)));op(lock2,kv*.6);
    /* 수면 위 저고도 → 유도탄 발사 */
    place(Lsk,b.x,b.y,seg(t,.62,.66)*(1-seg(t,.76,.8)),28,28);
    const mv=seg(t,.72,.725)*(1-seg(t,.875,.88)),mp=MSL(t),mq=MSL(Math.max(.72,t-.003));ms.set(mp.x,mp.y,Math.atan2(mp.y-mq.y,mp.x-mq.x)*57.3,mv,t);cM.update(MSL,t,.72,.04,1-seg(t,.9,.96));
    place(Lms,SH.x,SH.y,seg(t,.72,.75)*(1-seg(t,.8,.83)),24,-24);
    /* MDI: 유도탄이 가장 가까이 스친 거리를 재어 사격 결과를 평가 */
    const q0=TD2(.84),md=seg(t,.84,.88)*(1-seg(t,.96,1));mdi.forEach((c,i)=>{c.setAttribute('cx',q0.x);c.setAttribute('cy',q0.y);c.setAttribute('r',((22+i*26)*(.6+.4*eo(seg(t,.84,.88)))).toFixed(1));op(c,md*(i?.5:.9))});
    mdL.setAttribute('x1',q0.x);mdL.setAttribute('y1',q0.y);mdL.setAttribute('x2',PC.x);mdL.setAttribute('y2',PC.y);op(mdL,md);place(Lmd,q0.x,q0.y,md,34,46);
    place(repO,620,640,seg(t,.88,.9),0,0);
    return t<.58?a:b;
  };
};

// 7 소형 자폭 — 탐색 · 타격
SC[6]=(g,{tag,place},TL)=>{
  bg(el('g',{},g),'b6');
  const truck=sil('truck',g);tr(truck,600,760,-40,1.6);op(truck,1);
  const tk=track(g,'M612,748C620,600 640,420 700,320H1250V420H700V520H1250V620H900');
  const LS0=tk.at(.9);
  const M6=t=>{if(t<.68)return tk.at(eio(seg(t,.02,.68))*.9);const d=eio(seg(t,.68,.84));return {x:lerp(LS0.x,1090,d),y:lerp(LS0.y,570,d),r:Math.atan2(570-LS0.y,1090-LS0.x)*57.3}};
  const M6p=t=>t<.68?tk.pt(eio(seg(t,.02,.68))*.9):M6(t);
  const WG=(i,t)=>{const q=tk.at(Math.max(0,eio(seg(t,.02,.68))*.9-(i+1)*.035)),n=(i?-1:1)*30;return {x:q.x-Math.sin(q.r/57.3)*n,y:q.y+Math.cos(q.r/57.3)*n,r:q.r}};
  const ct=contrail(g),cwg=[0,1].map(()=>contrail(g,{n:20}));
  const tv=sil('vehicle',g);tr(tv,1090,570,24,1.35);op(tv,1);
  const br=bracket(g,56,44);tr(br,1090,570);
  const hit=boom(g,1090,570,.85);const wing=[0,1].map(()=>sil('slm',g));const ac=sil('slm',g);
  ac._sp.hero=true;
  const Lla=tag(TL.la),Lsr=tag(TL.sr),Lid=tag(TL.id,'big'),Ldv=tag(TL.dv,'big'),Lkill=tag(TL.kill,'big'),Lac=tag(TL.ac,'big'),Lsw=tag(TL.sw,'big');
  return t=>{
    place(Lla,600,760,seg(t,.02,.06)*(1-seg(t,.16,.2)),40,26);place(Lsr,1250,320,seg(t,.16,.22)*(1-seg(t,.5,.54)),16,-18);
    const a=M6(t);ct.update(M6p,t,.06,.08,1-seg(t,.85,.95));
    ac._sp.altK=seg(t,.02,.12)*(1-seg(t,.68,.84));const alive=1-seg(t,.84,.85);tr(ac,a.x,a.y,a.r,t>.68?lerp(1.25,.8,seg(t,.68,.84)):1.25);op(ac,seg(t,.06,.12)*alive);place(Lac,a.x,a.y,seg(t,.1,.14)*(1-seg(t,.4,.44)),24,-24);
    wing.forEach((w,i)=>{const q=WG(i,t);w._sp.altK=seg(t,.04,.14);tr(w,q.x,q.y,q.r,1.1);const wv=1-seg(t,.6,.66);op(w,seg(t,.1,.16)*wv);cwg[i].update(tt=>WG(i,tt),t,.12,.08,wv)});
    place(Lsw,a.x,a.y,seg(t,.2,.24)*(1-seg(t,.44,.48)),24,34);
    const iv=seg(t,.5,.56)*(1-seg(t,.84,.85));tr(br,1090,570,0,1+.5*(1-eo(seg(t,.5,.56))));op(br,iv);place(Lid,1090,570,iv*(1-seg(t,.68,.7)),40,-30);
    const dv=seg(t,.68,.7)*alive;place(Ldv,a.x,a.y,dv,24,-24);
    const bk=seg(t,.845,1);op(tv,1-seg(t,.86,.9));hit.update(bk);place(Lkill,1090,570,seg(t,.88,.91),64,-46);
    return {x:t>.84?1090:a.x,y:t>.84?570:a.y,shake:bk};
  };
};

// 8 함상 중고도 무인기
SC[7]=(g,{tag,place},TL)=>{
  bg(el('g',{},g),'b7');
  const cv=sil('carrier',g);tr(cv,560,600,0,2.2);op(cv,1);
  el('path',{d:'M330,600H790',stroke:C.cream,'stroke-opacity':.5,'stroke-width':1,'stroke-dasharray':'14 10','vector-effect':'non-scaling-stroke'},g);
  const boats=[[1010,250,30],[1180,700,160],[1330,420,-70],[1450,640,110],[930,790,20]].map(([x,y,r],i)=>{const b=sil('boat',g);tr(b,x,y,r,1.1);return {b,x,y}});
  const tk=track(g,'M420,600H700C760,600 810,540 860,480L1260,360A110,110 0 0 1 1300,580L900,700A110,110 0 0 1 860,480L1260,360A110,110 0 0 1 1300,580L900,700C800,700 760,600 700,600H470');
  const U7=t=>eio(seg(t,.02,1)),ct=contrail(g);
  const sweep=el('g',{},g);const sr=260;
  el('circle',{r:sr,fill:'none',stroke:C.cream,'stroke-opacity':.3,'stroke-width':1,'stroke-dasharray':'4 6','vector-effect':'non-scaling-stroke'},sweep);
  const wedge=el('path',{d:`M0,0L${sr},0A${sr},${sr} 0 0 1 ${sr*Math.cos(.6)},${sr*Math.sin(.6)}Z`,fill:C.cream,'fill-opacity':.1},sweep);
  const br=bracket(g,50,36);tr(br,1330,420);const ac=sil('naval',g);
  ac._sp.hero=true;
  const Lcv=tag(TL.cv),Lac=tag(TL.ac,'big'),Lrad=tag(TL.rad),Lun=tag(TL.un,'big'),Lrec=tag(TL.rec,'big');const Lb=boats.map(()=>tag(TL.boat));
  return t=>{
    place(Lcv,560,600,seg(t,.02,.06)*(1-seg(t,.16,.2)),290,40);
    const u=U7(t);const a=tk.at(u);ct.update(tt=>tk.pt(U7(tt)),t,.14,.12,1-seg(t,.9,.98));ac._sp.altK=seg(t,.08,.18)*(1-seg(t,.9,.98));tr(ac,a.x,a.y,a.r,lerp(.85,1.1,seg(t,.04,.16)));op(ac,seg(t,.12,.16));
    place(Lac,a.x,a.y,seg(t,.1,.16)*(1-seg(t,.46,.5)),28,-26);
    const sv=seg(t,.2,.26)*(1-seg(t,.78,.82));tr(sweep,a.x,a.y);op(sweep,sv);wedge.setAttribute('transform',`rotate(${t*1400%360})`);place(Lrad,a.x+sr*.7,a.y-sr*.7,sv*(1-seg(t,.5,.54)),8,0);
    boats.forEach((b,i)=>{const v=seg(t,.44+i*.03,.5+i*.03);op(b.b,v);place(Lb[i],b.x,b.y,v*(i===2?0:1)*(1-seg(t,.78,.82)),22,-14)});
    const uv=seg(t,.62,.68)*(1-seg(t,.82,.86));tr(br,1330,420,0,1+.5*(1-eo(seg(t,.62,.68))));op(br,uv);place(Lun,1330,420,uv,34,-26);
    place(Lrec,470,600,seg(t,.86,.9),60,-60);
    return a;
  };
};

// 9 MRO 군집 점검
SC[8]=(g,{tag,place,rep},TL)=>{
  bg(el('g',{},g),'b8');
  const rovers=[0,1].map(()=>sil('rover',g));const rpath=[[1150,486,960,486],[720,414,520,414]];
  const air=sil('airliner',g);tr(air,860,450,0,1);op(air,1);
  const dock=el('rect',{x:1240,y:730,width:120,height:60,fill:'none',stroke:C.cream,'stroke-width':1.2,'stroke-dasharray':'4 4','vector-effect':'non-scaling-stroke'},g);
  const sect=[[1000,418,1200,484],[680,196,860,420],[680,480,860,704],[480,352,700,548]];
  const sectR=sect.map(([x1,y1,x2,y2])=>el('rect',{x:x1,y:y1,width:x2-x1,height:y2-y1,fill:C.cream,'fill-opacity':.04,stroke:C.cream,'stroke-opacity':.5,'stroke-width':1,'stroke-dasharray':'5 5','vector-effect':'non-scaling-stroke'},g));
  const raster=sect.map(([x1,y1,x2,y2])=>{let d=`M${x1+10},${y1+10}`;let dir=1;for(let y=y1+10;y<=y2-10;y+=24){d+=`H${dir>0?x2-10:x1+10}`;if(y+24<=y2-10)d+=`V${y+24}`;dir*=-1}return track(g,d,{color:C.gold,w:1.2,planOp:0})});
  const defects=[[1100,440,0],[790,330,1],[760,620,2],[560,470,3]];
  const dm=defects.map(()=>{const m=el('g',{},g);el('circle',{r:9,fill:'none',stroke:C.cream,'stroke-width':1.6,'vector-effect':'non-scaling-stroke'},m);el('circle',{r:2.5,fill:C.cream},m);return m});
  /* 드론 위치: 도킹 스테이션 → 구역 스캔. 3번 드론이 빠지면 1번 드론이 남은 구역을 이어서 스캔 */
  const DS=[[.36,.8,1],[.36,.62,1],[.36,.6,.55],[.36,.8,1]];
  const D=(i,t)=>{
    const s0=sect[i],lift=eio(seg(t,.04,.18+i*.02));
    if(t<.36)return {x:lerp(1270+i*20,s0[0]+10,lift),y:lerp(760,s0[1]+10,lift)};
    if(i===1&&t>=.62){const q0=raster[1].pt(1),q1=raster[2].pt(.55);
      if(t<.67){const b=eio(seg(t,.62,.67));return {x:lerp(q0.x,q1.x,b),y:lerp(q0.y,q1.y,b)}}
      return raster[2].pt(.55+.45*seg(t,.67,.84))}
    if(i===2&&t>=.6){const b=eio(seg(t,.6,.72)),q=raster[2].pt(.55);return {x:lerp(q.x,1300,b),y:lerp(q.y,760,b)}}
    return raster[i].pt(seg(t,DS[i][0],DS[i][1])*DS[i][2]);
  };
  const cd=[0,1,2,3].map(()=>contrail(g,{w:1.6,n:28,head:C.gold,color:C.gold}));
  const drones=[0,1,2,3].map(()=>sil('quad',g));
  drones[0]._sp.hero=true;
  const Ldock=tag(TL.dock),Ls=TL.zones.map(n=>tag(n)),Ld=defects.map((d,i)=>tag(`${TL.dfc}${i+1}`)),Lfail=tag(TL.fail,'big'),Lrov=tag(TL.rov),Lre=tag(TL.re,'big');
  const repO=rep(TL.rep);   /* 점검 리포트 카드(늘 보임) */
  return t=>{
    op(dock,1);place(Ldock,1300,760,seg(t,.02,.06)*(1-seg(t,.3,.34)),70,0);
    sectR.forEach((r,i)=>{op(r,seg(t,.18+i*.02,.24+i*.02));place(Ls[i],sect[i][0],sect[i][1],seg(t,.2,.26)*(1-seg(t,.4,.44)),0,-14)});
    let cen={x:860,y:450};
    drones.forEach((d,i)=>{
      const p=D(i,t),lift=eio(seg(t,.04,.18+i*.02)),dv=i===2?1-seg(t,.72,.76):1;
      tr(d,p.x,p.y,-45+i*90,1.2);d._sp.altK=lift*(i===2&&t>.6?1-seg(t,.66,.72):1);op(d,seg(t,.12,.16)*dv);
      cd[i].update(tt=>D(i,tt),t,.14,.1,dv);
      if(i===2)place(Lfail,p.x,p.y,seg(t,.6,.63)*(1-seg(t,.72,.76)),26,-22);
      if(i===1)place(Lre,p.x,p.y,seg(t,.63,.67)*(1-seg(t,.8,.84)),26,-22);
    });
    rovers.forEach((r,i)=>{const [x1,y1,x2,y2]=rpath[i];const a=eio(seg(t,.06,.2+i*.03));const u=eio(seg(t,.36,.82));let x,y,rot;
      if(t<.36){x=lerp(1300-i*30,x1,a);y=lerp(770,y1,a);rot=Math.atan2(y1-770,x1-(1300-i*30))*57.3}else{x=lerp(x1,x2,u);y=y1;rot=180}
      tr(r,x,y,rot,1);op(r,seg(t,.04,.08))});
    place(Lrov,rpath[0][0],rpath[0][1],seg(t,.22,.26)*(1-seg(t,.42,.46)),24,30);
    defects.forEach((d,i)=>{const v=seg(t,.44+i*.05,.48+i*.05);tr(dm[i],d[0],d[1],0,1+1.2*(1-eo(v)));op(dm[i],v);place(Ld[i],d[0],d[1],v*(1-seg(t,.86,.9)),16,-14)});
    place(repO,1200,520,seg(t,.84,.9),0,0);
    return {x:860,y:450,hand:{x:drones[0]._sp.x,y:drones[0]._sp.y,r:drones[0]._sp.r}};
  };
};
})();
