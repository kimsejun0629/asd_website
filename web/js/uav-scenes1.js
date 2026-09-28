/* 무인기 장면 1~5장(중고도 · 스텔스 · 저피탐 편대 · 중형 자폭 · 사단). uav.html · uav-en.html — uav-kit.js 뒤, uav.js 앞
   등록만 함: U.SC[i]=(g, {tag,place,…}, TL=이 장의 라벨 글) => (t => 초점). uav.js가 장 순서대로 한 번 만들고 매 프레임 t(0~1)로 부름 */
(()=>{
'use strict';
const U=window.UAV,SC=U.SC;
const {C,seg,lerp,eo,eio,el,tr,op,sil,bg,track,contrail,missile,ellipsePath,bracket,link,setLine,boom}=U;

// 1 중고도 — EO/IR 정찰
SC[0]=(g,{tag,place},TL)=>{
  bg(el('g',{},g),'b1');
  const tg=el('g',{id:'tgts'},g);const tgs=[[1060,600,18],[1112,628,24],[1010,648,14]].map(([x,y,r])=>{const v=sil('vehicle',tg);tr(v,x,y,r,1);op(v,1);return {x,y}});
  const gcs=sil('gcs',g);tr(gcs,640,800,-10,1.2);op(gcs,1);
  const tk=track(g,`M640,420C690,440 730,455 760,470`+ellipsePath(1060,470,300,150).replace('M760,470',''));
  const U1=t=>lerp(0,.86,eio(seg(t,.02,1))),ct=contrail(g);
  const fp=el('rect',{fill:C.cream,'fill-opacity':.07,stroke:C.cream,'stroke-opacity':.8,'stroke-width':1.2,'vector-effect':'non-scaling-stroke'},g);
  const rays=[0,1,2,3].map(()=>el('line',{stroke:C.cream,'stroke-opacity':.28,'stroke-width':1,'vector-effect':'non-scaling-stroke'},g));
  const br=tgs.map(()=>bracket(g,46,34));
  const dl=link(g);const sat=sil('sat',g);tr(sat,780,130,90,1);const sl1=link(g),sl2=link(g);
  const ac=sil('male',g);
  const vf=el('g',{},g);tr(vf,1150,250);
  const clip=el('clipPath',{id:'vfc'},g);el('circle',{r:112},clip);
  const vin=el('g',{'clip-path':'url(#vfc)'},vf);el('circle',{r:112,fill:C.night},vin);
  const use=el('use',{href:'#tgts'},vin);use.setAttribute('transform','scale(3.2) translate(-1060,-625)');
  el('circle',{r:112,fill:'none',stroke:C.cream,'stroke-width':1.4,'vector-effect':'non-scaling-stroke'},vf);
  el('path',{d:'M-112,0H-30M30,0H112M0,-112V-30M0,30V112',stroke:C.cream,'stroke-width':1,'vector-effect':'non-scaling-stroke'},vf);
  ac._sp.hero=true;
  const Ltr=tgs.map((_,i)=>tag(`TGT-0${i+1}`)),Lvf=tag(TL.vf,'big'),Ldl=tag(TL.dl),Lgcs=tag(TL.gcs),Lac=tag('MUAV','big'),Lsc=tag(TL.sc);
  return t=>{
    const u=U1(t);const a=tk.at(u);tr(ac,a.x,a.y,a.r,1.1);op(ac,seg(t,.12,.16));ct.update(tt=>tk.pt(U1(tt)),t,.14,.12);
    place(Lac,a.x,a.y,seg(t,.12,.2)*(1-seg(t,.9,1)),26,-20);
    let fx,fy,fw;const sw=seg(t,.22,.46),lk=seg(t,.46,.56);
    fx=lerp(700,1000,sw);fy=lerp(360,560,sw)+Math.sin(sw*9.4)*60;fx=lerp(fx,1062,lk);fy=lerp(fy,625,lk);fw=lerp(230,150,lk);const fh=fw*.7;
    const fv=seg(t,.2,.26);fp.setAttribute('x',fx-fw/2);fp.setAttribute('y',fy-fh/2);fp.setAttribute('width',fw);fp.setAttribute('height',fh);op(fp,fv);
    [[fx-fw/2,fy-fh/2],[fx+fw/2,fy-fh/2],[fx+fw/2,fy+fh/2],[fx-fw/2,fy+fh/2]].forEach((c,i)=>{setLine(rays[i],a,{x:c[0],y:c[1]},0);op(rays[i],fv)});
    tgs.forEach((p,i)=>{const v=seg(t,.52+i*.04,.58+i*.04);tr(br[i],p.x,p.y,0,1+.6*(1-eo(v)));op(br[i],v);place(Ltr[i],p.x,p.y,v,30,-18)});
    const vv=seg(t,.54,.62);op(vf,vv);place(Lvf,900,390,vv,0,0);
    const dv=seg(t,.74,.8);setLine(dl,a,{x:640,y:790},t);op(dl,dv);place(Ldl,lerp(a.x,640,.5),lerp(a.y,790,.5),dv,14,-12);place(Lgcs,640,800,seg(t,.7,.78),28,0);
    const sv=seg(t,.82,.88);op(sat,sv);setLine(sl1,a,{x:780,y:138},t);setLine(sl2,{x:780,y:138},{x:640,y:790},t);op(sl1,sv);op(sl2,sv);place(Lsc,780,130,sv,44,0);
    return a;
  };
};

// 2 스텔스 침투
SC[1]=(g,{tag,place},TL)=>{
  bg(el('g',{},g),'b2');
  el('path',{d:'M520,-200V1200',stroke:C.cream,'stroke-opacity':.3,'stroke-width':1.2,'stroke-dasharray':'10 10','vector-effect':'non-scaling-stroke'},g);
  const sites=[[700,300,190],[980,620,210],[1180,260,180]];
  const S2=sites.map(([x,y,r])=>{const s=el('g',{},g);tr(s,x,y);const ring=el('circle',{r,fill:C.cream,'fill-opacity':.035,stroke:C.cream,'stroke-opacity':.45,'stroke-width':1.2,'stroke-dasharray':'6 6','vector-effect':'non-scaling-stroke'},s);
    const sw=el('path',{d:`M0,0L${r},0A${r},${r} 0 0 1 ${r*Math.cos(.5)},${r*Math.sin(.5)}Z`,fill:C.cream,'fill-opacity':.12},s);
    const rs=sil('radar',s);tr(rs,0,0,30,1);op(rs,1);
    return {s,ring,sw,x,y,r}});
  const tk=track(g,'M660,820C640,700 520,620 560,540C680,480 760,452 840,446C960,438 1040,436 1100,436C1220,436 1320,452 1420,480');
  const U2=t=>eio(seg(t,.12,.92)),ct=contrail(g);
  const tgtB=bracket(g,52,52);tr(tgtB,1420,480);
  const hit=boom(g,1420,480,.45);
  const ac=sil('stealth',g);
  ac._sp.hero=true;
  const Lsites=sites.map(()=>tag(TL.site)),Lfeba=tag(TL.feba),Lac=tag(TL.ac,'big'),Lnl=tag(TL.nl),Ltg=tag(TL.tg);
  return t=>{
    S2.forEach((s,i)=>{const v=eo(seg(t,.04+i*.03,.14+i*.03));s.ring.setAttribute('r',s.r*v);op(s.s,seg(t,.03+i*.03,.08+i*.03));s.sw.setAttribute('transform',`rotate(${(t*900+i*120)%360}) scale(${v})`);place(Lsites[i],s.x,s.y,seg(t,.08,.14),14,-16)});
    place(Lfeba,520,150,seg(t,.04,.1),10,0);
    const u=U2(t);const a=tk.at(u);tr(ac,a.x,a.y,a.r,1.05);op(ac,seg(t,.12,.16));ct.update(tt=>tk.pt(U2(tt)),t,.14,.12);
    place(Lac,a.x,a.y,seg(t,.14,.2)*(1-seg(t,.58,.62)),28,-22);
    place(Lnl,a.x,a.y,seg(t,.6,.64)*(1-seg(t,.8,.84)),28,-22);
    const tv=seg(t,.8,.86);op(tgtB,tv);place(Ltg,1420,480,tv,36,-24);
    hit.update(seg(t,.92,1));
    return a;
  };
};

// 3 저피탐 유무인 협업
SC[2]=(g,{tag,place},TL)=>{
  bg(el('g',{},g),'b3');
  const gt=sil('vehicle',g);tr(gt,1330,720,-12,1.2);op(gt,1);
  const off=[[-70,-100],[-70,100],[-140,-190],[-140,190]];
  const tgt=[[1010,230],[1060,610],[900,330],[1230,470]],roleT=[[.2,.3],[.4,.48],[.6,.68],[.8,.88]];
  const F=t=>({x:lerp(-160,640,eio(seg(t,0,.2)))+lerp(0,140,seg(t,.2,1)),y:470});
  const WP=(i,t)=>{const f=F(t),bx=f.x+off[i][0],by=f.y+off[i][1],m=eio(seg(t,roleT[i][0],roleT[i][1]));return {x:lerp(bx,tgt[i][0],m),y:lerp(by,tgt[i][1],m),m,bx,by}};
  /* 공대지 미사일: 공격 편대기 → 지상 표적 */
  const MS0={x:1060,y:610},MS1={x:1250,y:585},MS2={x:1330,y:720};
  const qb=(a,b,c,k)=>({x:(1-k)*(1-k)*a.x+2*(1-k)*k*b.x+k*k*c.x,y:(1-k)*(1-k)*a.y+2*(1-k)*k*b.y+k*k*c.y,r:Math.atan2(2*(1-k)*(b.y-a.y)+2*k*(c.y-b.y),2*(1-k)*(b.x-a.x)+2*k*(c.x-b.x))*57.3});
  const MSP=t=>qb(MS0,MS1,MS2,Math.pow(seg(t,.48,.57),1.35));
  /* 공대공 미사일: 호위 편대기 → 접근하는 위협 */
  const TH=t=>{const k=eo(seg(t,.6,.72));return {x:lerp(1640,1120,k),y:lerp(60,270,k)}};
  const MI0={x:900,y:330};
  const MIP=t=>{const k=Math.pow(seg(t,.68,.72),1.3),T=TH(t),dx=T.x-MI0.x,dy=T.y-MI0.y,L=Math.hypot(dx,dy)||1,b=Math.sin(Math.PI*k)*56;return {x:MI0.x+dx*k-dy/L*b,y:MI0.y+dy*k+dx/L*b}};
  const cF=contrail(g,{n:20}),cW=[0,1,2,3].map(()=>contrail(g,{n:20}));
  const smoke={head:'#F2ECE3',color:C.cream80,w:1.8,n:18,op:.95};
  const cM1=contrail(g,smoke),cM2=contrail(g,smoke),m1=missile(g),m2=missile(g);
  const fighter=sil('fighter',g);
  const W=[0,1,2,3].map(()=>sil('lowus',g));
  const rings=[0,1,2].map(()=>el('circle',{fill:'none',stroke:C.cream,'stroke-width':1.2,'vector-effect':'non-scaling-stroke'},g));
  const ghosts=[[70,-50],[118,24],[52,74]].map(()=>sil('lowus',g,{fill:'none',stroke:C.cream,sw:1,dash:'3 3'}));
  const hit=boom(g,1330,720,.4),hit2=boom(g,1120,270,.3);
  const threat=sil('fighter',g,{fill:'none',stroke:C.cream,sw:1.2,dash:'4 3'});
  const cone=el('path',{fill:C.cream,'fill-opacity':.07,stroke:C.cream,'stroke-opacity':.5,'stroke-width':1,'vector-effect':'non-scaling-stroke'},g);
  W[0]._sp.hero=true;
  const Lf=tag(TL.f,'big'),LW=TL.roles.map(r=>tag(r,'big')),Lg=tag(TL.g),Lth=tag(TL.th),Lx=tag(TL.x);
  return t=>{
    const f=F(t),fx=f.x,fy=f.y;cF.update(F,t,.1,.1);
    tr(fighter,fx,fy,0,1.25);op(fighter,seg(t,.08,.14));place(Lf,fx,fy,seg(t,.1,.16),-34,-54);
    const pos=W.map((w,i)=>{const q=WP(i,t),m=q.m,x=q.x,y=q.y;const r=m>0&&m<1?Math.atan2(tgt[i][1]-q.by,tgt[i][0]-q.bx)*57.3*Math.sin(m*3.14):0;tr(w,x,y,r,.95);op(w,seg(t,.12,.16));place(LW[i],x,y,seg(t,roleT[i][0]+.04,roleT[i][1]),26,-26);cW[i].update(tt=>WP(i,tt),t,.14,.1);return {x,y}});
    // 기만
    const dA=pos[0],dv=seg(t,.28,.34);rings.forEach((r,i)=>{const ph=((t*8+i/3)%1);r.setAttribute('cx',dA.x);r.setAttribute('cy',dA.y);r.setAttribute('r',20+ph*120);op(r,dv*(1-ph)*.8)});
    [[70,-50],[118,24],[52,74]].forEach((o,i)=>{tr(ghosts[i],dA.x+o[0],dA.y+o[1],0,.95);op(ghosts[i],dv*(.4+.35*Math.sin(t*60+i*2)))});place(Lg,dA.x+118,dA.y+24,dv,28,0);
    // 타격
    const s1=MSP(t);m1.set(s1.x,s1.y,s1.r,seg(t,.48,.485)*(1-seg(t,.568,.572)),t);cM1.update(MSP,t,.48,.035,1-seg(t,.58,.64));hit.update(seg(t,.57,.66));op(gt,1-seg(t,.6,.64));
    // 호위
    const T3=TH(t),tx=T3.x,ty=T3.y;tr(threat,tx,ty,160,1.2);op(threat,seg(t,.6,.64)*(1-seg(t,.72,.73)));place(Lth,tx,ty,seg(t,.62,.66)*(1-seg(t,.7,.72)),30,-24);
    const s2=MIP(t),s2b=MIP(Math.max(.68,t-.002));m2.set(s2.x,s2.y,(t>.681?Math.atan2(s2.y-s2b.y,s2.x-s2b.x):Math.atan2(-60,220))*57.3,seg(t,.68,.685)*(1-seg(t,.718,.722)),t);
    cM2.update(MIP,t,.68,.03,1-seg(t,.73,.78));hit2.update(seg(t,.72,.8));place(Lx,1120,270,seg(t,.72,.74)*(1-seg(t,.8,.84)),30,-24);
    // 정찰
    const rv=seg(t,.86,.9),D=pos[3],sp=Math.sin(t*40)*.25;cone.setAttribute('d',`M${D.x},${D.y}L${D.x+320},${D.y-150+sp*120}L${D.x+320},${D.y+150+sp*120}Z`);op(cone,rv);
    return {x:fx+120,y:fy,hand:{x:W[0]._sp.x,y:W[0]._sp.y,r:W[0]._sp.r}};
  };
};

// 4 중형 자폭 — 함상 발사 · 해상 타격
SC[3]=(g,{tag,place},TL)=>{
  bg(el('g',{},g),'b4');
  const ship=sil('ship',g);tr(ship,380,650,-4,1.35);op(ship,1);
  const sat=sil('sat',g);tr(sat,820,70,90,1);
  const tk=track(g,'M420,640C470,580 540,530 660,500L1060,470'+'A110,110 0 1 1 1270,450A110,110 0 1 1 1060,470A110,110 0 1 1 1270,450');
  const UXY=t=>({x:lerp(1440,1300,seg(t,.2,.86)),y:lerp(650,605,seg(t,.2,.86))}),LM0=tk.at(.93);
  const M4=t=>{if(t<.7)return tk.at(eio(seg(t,.02,.7))*.93);const d=eio(seg(t,.7,.85)),T=UXY(t);return {x:lerp(LM0.x,T.x,d),y:lerp(LM0.y,T.y,d),r:Math.atan2(T.y-LM0.y,T.x-LM0.x)*57.3}};
  const ct=contrail(g);
  const usv=sil('usv',g);const wake=el('path',{fill:'none',stroke:C.cream,'stroke-opacity':.4,'stroke-width':1,'vector-effect':'non-scaling-stroke'},g);
  const br=bracket(g,60,40);const lk=link(g);const boost=el('line',{stroke:C.cream,'stroke-width':3,'stroke-linecap':'round','vector-effect':'non-scaling-stroke'},g);
  const hit=boom(g,1300,605,1);const ac=sil('mlm',g);
  ac._sp.hero=true;
  const Lship=tag(TL.ship),Lsat=tag(TL.sat),Llk=tag(TL.lk),Latr=tag(TL.atr,'big'),Ldv=tag(TL.dv,'big'),Lkill=tag(TL.kill,'big'),Lac=tag(TL.ac,'big');
  return t=>{
    const ux=lerp(1440,1300,seg(t,.2,.86)),uy=lerp(650,605,seg(t,.2,.86));tr(usv,ux,uy,200,1.3);op(usv,1-seg(t,.87,.9));wake.setAttribute('d',`M${ux+18},${uy+4}l70,18M${ux+18},${uy-4}l70,-2`);op(wake,1-seg(t,.86,.9));
    place(Lship,380,650,seg(t,.02,.08)*(1-seg(t,.2,.24)),150,30);
    const a=M4(t);ct.update(tt=>tt<.7?tk.pt(eio(seg(tt,.02,.7))*.93):M4(tt),t,.06,.08,1-seg(t,.86,.95));
    ac._sp.altK=seg(t,.02,.12)*(1-seg(t,.7,.85));const alive=1-seg(t,.85,.86);tr(ac,a.x,a.y,a.r,t>.7?lerp(1.2,.8,seg(t,.7,.85)):1.2);op(ac,seg(t,.06,.12)*alive);
    place(Lac,a.x,a.y,seg(t,.1,.16)*(1-seg(t,.44,.48)),26,-26);
    const bv=seg(t,.04,.06)*(1-seg(t,.14,.18));boost.setAttribute('x1',a.x);boost.setAttribute('y1',a.y);boost.setAttribute('x2',a.x-Math.cos(a.r/57.3)*60);boost.setAttribute('y2',a.y-Math.sin(a.r/57.3)*60);op(boost,bv);
    op(sat,seg(t,.16,.22));place(Lsat,820,70,seg(t,.18,.24),48,0);
    const lv=seg(t,.2,.26)*(1-seg(t,.84,.86));setLine(lk,a,{x:820,y:78},t);op(lk,lv);place(Llk,lerp(a.x,820,.5),lerp(a.y,78,.5),lv*(1-seg(t,.44,.5)),12,0);
    const av=seg(t,.5,.56)*(1-seg(t,.85,.86));tr(br,ux,uy,0,1+.5*(1-eo(seg(t,.5,.56))));op(br,av);place(Latr,ux,uy,av*(1-seg(t,.7,.72)),42,-30);
    const dv=seg(t,.7,.72)*(1-seg(t,.85,.86));place(Ldv,a.x,a.y,dv,26,-26);
    const bk=seg(t,.855,1);hit.g.setAttribute('transform',`translate(${ux} ${uy})`);hit.update(bk);place(Lkill,ux,uy,seg(t,.88,.91),70,-50);
    return {x:t>.85?ux:a.x,y:t>.85?uy:a.y,shake:bk};
  };
};

// 5 KUS-FT — 산악 정찰
SC[4]=(g,{tag,place},TL)=>{
  bg(el('g',{},g),'b5');
  el('path',{d:'M560,780H710',stroke:C.cream,'stroke-opacity':.5,'stroke-width':6,'vector-effect':'non-scaling-stroke'},g);
  const cp=sil('gcs',g);tr(cp,420,380,15,1.2);op(cp,1);
  const tk=track(g,'M560,780H710C780,770 720,640 640,540S860,560 980,480S1160,300 1320,420S1420,640 1300,640');
  const U5=t=>eio(seg(t,.02,1))*.97,U5b=t=>eio(seg(t,.86,1))*.42,ct=contrail(g),ct2=contrail(g);
  const night=el('rect',{x:-900,y:-900,width:3400,height:2700,fill:'#141617',opacity:0},g);
  const hots=[[1140,390],[1180,420],[1360,530],[1290,600]].map(([x,y])=>{const h=el('g',{},g);tr(h,x,y);el('circle',{r:16,fill:C.cream,'fill-opacity':.18},h);el('circle',{r:5,fill:C.cream},h);return {h,x,y}});
  const fp=el('circle',{r:70,fill:C.cream,'fill-opacity':.06,stroke:C.cream,'stroke-opacity':.6,'stroke-width':1,'stroke-dasharray':'4 4','vector-effect':'non-scaling-stroke'},g);
  const l1=link(g),l2=link(g);const ac2=sil('ft',g);const ac=sil('ft',g);
  ac._sp.hero=true;
  const Lstrip=tag(TL.strip),Lac=tag('KUS-FT','big'),Lnight=tag(TL.night,'big'),Lhot=tag(TL.hot),Lcp=tag(TL.cp),Ll=tag(TL.l),Lrel=tag(TL.rel,'big');
  return t=>{
    const u=U5(t);const a=tk.at(u);ct.update(tt=>tk.pt(U5(tt)),t,.14,.12);const sc=lerp(.75,1.05,seg(t,.04,.18));ac._sp.altK=seg(t,.05,.2);tr(ac,a.x,a.y,a.r,sc);op(ac,seg(t,.12,.16));
    place(Lstrip,635,780,seg(t,.02,.06)*(1-seg(t,.18,.22)),84,22);place(Lac,a.x,a.y,seg(t,.1,.16)*(1-seg(t,.9,1)),26,-24);
    const fv=seg(t,.2,.26);fp.setAttribute('cx',a.x+40);fp.setAttribute('cy',a.y+60);op(fp,fv);
    const nv=seg(t,.5,.56)*(1-seg(t,.92,1));op(night,nv*.55);place(Lnight,1340,120,nv,0,0);
    hots.forEach((h,i)=>{const v=seg(t,.56+i*.03,.6+i*.03);op(h.h,v*(.7+.3*Math.sin(t*80+i)))});place(Lhot,1360,530,seg(t,.62,.66)*(1-seg(t,.92,1)),24,0);
    const lv=seg(t,.76,.8);setLine(l1,a,{x:420,y:380},t);setLine(l2,a,{x:635,y:770},t);op(l1,lv);op(l2,lv);place(Lcp,420,380,seg(t,.74,.78),24,0);place(Ll,lerp(a.x,420,.5),lerp(a.y,380,.5),lv,12,-10);
    const rv=seg(t,.86,.9);const b2=tk.at(U5b(t));ct2.update(tt=>tk.pt(U5b(tt)),t,.88,.1,rv);ac2._sp.altK=seg(t,.88,.94);tr(ac2,b2.x,b2.y,b2.r,lerp(.75,1.05,seg(t,.86,.94)));op(ac2,rv);place(Lrel,b2.x,b2.y,seg(t,.88,.9),26,-24);
    return a;
  };
};
})();
