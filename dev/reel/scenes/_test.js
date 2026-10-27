/* 엔진 점검용 임시 장면(?only=_test) */
import {scene,C,E,seg,text,lineIn,lineOut,trackIn,fitSize,fitLines,spans,odoValue,wheel,ellipse,quad,glowLine,maskWith,duotone,need,img,hline,grid,label,W,H} from '../engine.js';
import {sym,logo} from '../kit.js';
import {P,LT} from '../shared.js';
need('/web/img/co/KAL_BI_0301.webp');
scene({id:'test',from:0,to:900,z:0,
  init(env){this.A=env.GL.craft('787');this.B=env.GL.craft('a320')},
  draw(g,f,env){
    grid(g,60,{alpha:.05});
    const GL=env.GL,A=this.A;const L=LT(f-100);
    const shots=[{A,rot:L.rot}];const lens=GL.solveLens(shots,L.cam,A,[0,0,0].map((v,i)=>A.center.getComponent(i)),L.C);
    A.xr(seg(f,20,40),['rake','fsf','bulk','aft'],{pulse:.5});
    g.drawImage(GL.render(shots,{...L.cam,lens}),0,0);
    const B=this.B;B.xr(0,'shk',{goldOp:1});const cam={yaw:2.7,el:.15,r:B.beatR('shk')*2.4,target:B.anchor('shk')};const ln=GL.solveLens([{A:B}],cam,B,B.anchor('shk'),[P.x+300,P.y+300]);
    g.save();g.globalAlpha=.9;g.drawImage(GL.render([{A:B}],{...cam,lens:ln}),0,0);g.restore();
    trackIn(g,'Aerostructures',120,120,{},seg(f,0,18));
    lineIn(g,env.S['aero.h'],120,260,{size:132,weight:300,color:C.cream,track:-.035},f,4,{dur:16,budget:8});
    lineOut(g,env.S['tag.l2'],120,400,{size:80,weight:700,color:C.cream,track:-.035},f,30);
    spans(g,[{s:env.S['aero.codevK'],o:{size:30,weight:700,color:C.cream}},{s:env.S['aero.codevT'],o:{size:30,weight:300,color:C.cream80}}],120,480,{divider:'hair'});
    odoValue(g,5000*E.outQuart(seg(f,5,25)),120,700,{size:200,weight:300,color:C.cream,track:-.05},{target:5000});
    odoValue(g,779.6*E.outQuart(seg(f,5,25)),900,700,{size:72,weight:300,color:C.cream},{target:779.6,decimals:1});
    wheel(g,f*3.7,1800,1000,{size:26,weight:700,color:C.cream80,track:.14,align:'right'});
    ellipse(g,P.x,P.y+400,40,14,seg(f,0,20),{color:C.cream,alpha:.5});
    const h=quad(g,[1216,900],[1600,700],[1800,300],seg(f,0,30),{lw:2,color:C.goldHi});
    glowLine(g,1400-f*10,{});
    const du=duotone(img('/web/img/co/KAL_BI_0301.webp'));
    maskWith(g,x=>x.drawImage(du,0,780,1920*.6,766*.6),x=>{x.font='700 190px Hanjin';x.fillStyle='#fff';x.fillText('Mechanic',1000,1000)});
    sym(g,1700,160,60,C.cream,seg(f,0,40));
  }});
