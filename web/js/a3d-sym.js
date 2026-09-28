/* 대한항공 새 태극(2025): 태극 외곽을 따라가는 한 가닥 리본 — 오른쪽 위 끝(가늘게) → 위 · 왼쪽 바깥 호 → 왼쪽 아래 그릇 → 가운데 S → 오른쪽 위 둥근 머리 → 오른쪽 · 아래 바깥 호 → 왼쪽 아래 끝(가늘게)
   폭은 양 끝에서 0, 가운데(S)에서 가장 넓음. (cx, cy) 중심, 반지름 R, 캔버스 좌표(아래로 +y) */
export function drawSym(g,cx,cy,R,color){
  const aA0=29*Math.PI/180,aA1=Math.PI,aD1=-151*Math.PI/180;
  const LA=(aA1-aA0),LB=Math.PI*.5,LC=Math.PI*.5,LD=-aD1,Lt=LA+LB+LC+LD;
  /* 폭: 끝은 0 · 바깥 호는 가늘게 · 왼쪽 아래 그릇과 오른쪽 위 머리에서 가장 두껍고 · 가운데 S 목은 가늘게 */
  const tb=(LA+LB*.55)/Lt,tl=1-tb,ts=(LA*.82)/Lt,G=(t,c,s)=>Math.exp(-Math.pow((t-c)/s,2));
  const N=520,wAt=t=>Math.pow(Math.max(0,Math.sin(Math.PI*t)),.42)*(.17+.14*(G(t,tb,.07)+G(t,tl,.07))+.02*(G(t,ts,.08)+G(t,1-ts,.08)));
  const tJ1=(LA)/Lt,tJ2=(LA+LB+LC)/Lt;const rs=(1-wAt(tJ1)/2)/2,rs2=(1-wAt(tJ2)/2)/2;
  const P=t=>{const w=wAt(t);let d=t*Lt;
    if(d<=LA){const a=aA0+d;return [(1-w/2)*Math.cos(a),(1-w/2)*Math.sin(a)]}d-=LA;
    if(d<=LB){const a=Math.PI+d/LB*Math.PI;return [-rs+rs*Math.cos(a),rs*Math.sin(a)]}d-=LB;
    if(d<=LC){const a=Math.PI-d/LC*Math.PI;return [rs2+rs2*Math.cos(a),rs2*Math.sin(a)]}d-=LC;
    const a=-d;return [(1-w/2)*Math.cos(a),(1-w/2)*Math.sin(a)]};
  const L=[],Rr=[];
  for(let i=0;i<=N;i++){const t=i/N,p=P(t),q=P(Math.min(1,t+1e-3)),o=P(Math.max(0,t-1e-3));let tx=q[0]-o[0],ty=q[1]-o[1];const l=Math.hypot(tx,ty)||1;tx/=l;ty/=l;
    const w=wAt(t)/2;L.push([p[0]-ty*w,p[1]+tx*w]);Rr.push([p[0]+ty*w,p[1]-tx*w])}
  g.save();g.translate(cx,cy);g.rotate(6*Math.PI/180);g.scale(R*.95,-R);g.beginPath();g.moveTo(...L[0]);for(const p of L)g.lineTo(...p);for(let i=Rr.length-1;i>=0;i--)g.lineTo(...Rr[i]);g.closePath();g.fillStyle=color;g.fill();g.restore();
}
