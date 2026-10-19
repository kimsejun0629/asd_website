/* 메인 군집 드론 — 그리기(WebGL 점 스프라이트 · 없으면 2D 캔버스) · 행렬 도우미 → window.SW
   swarm.js가 씀(이 파일이 먼저). 드론 한 대 = 점 하나: 작으면 LED 점, 가까워져 커지면(13 → 26px) 쿼드콥터 모양이 드러남
   버퍼(드론마다 10개): x y z(월드) · 크기(월드) · 방향(라디안) · 밝기 · 불투명 · r g b(0~1, 팔레트 색)
   선분(AI 장 신경 신호, 선택): 선분마다 10개 — A xyz · B xyz · r g b · 불투명. 화면에서 굵기를 정한 사각형으로 그림 */
(()=>{
'use strict';
const ST=10;
/* 행렬: 열 우선 4×4(WebGL과 같음) */
function persp(fy,asp,n,f){const t=1/Math.tan(fy/2),d=1/(n-f);return new Float32Array([t/asp,0,0,0, 0,t,0,0, 0,0,(f+n)*d,-1, 0,0,2*f*n*d,0])}
function lookAt(e,c,u){
  let zx=e[0]-c[0],zy=e[1]-c[1],zz=e[2]-c[2],l=Math.hypot(zx,zy,zz);zx/=l;zy/=l;zz/=l;
  let xx=u[1]*zz-u[2]*zy,xy=u[2]*zx-u[0]*zz,xz=u[0]*zy-u[1]*zx;l=Math.hypot(xx,xy,xz);xx/=l;xy/=l;xz/=l;
  const yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;
  return new Float32Array([xx,yx,zx,0, xy,yy,zy,0, xz,yz,zz,0, -(xx*e[0]+xy*e[1]+xz*e[2]),-(yx*e[0]+yy*e[1]+yz*e[2]),-(zx*e[0]+zy*e[1]+zz*e[2]),1]);
}
function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s}return o}

const VS=`attribute vec3 aP;attribute vec4 aS;attribute vec3 aC;
uniform mat4 uVP;uniform vec2 uSh;uniform float uF,uDpr,uMax;
varying vec3 vC;varying vec2 vR;varying float vZ,vA;
void main(){vec4 q=uVP*vec4(aP,1.);q.xy+=uSh*q.w;gl_Position=q;
float s=aS.x*uF/max(q.w,.05);vZ=s;gl_PointSize=clamp(s*uDpr,1.,uMax);
vR=vec2(cos(aS.y),sin(aS.y));vC=aC;vA=aS.w*aS.z*smoothstep(.12,.6,q.w);}`;
/* 쿼드콥터(X형): 팔 2개 · 로터 4개(테두리 + 옅은 회전면) · 몸체 · 가운데 LED. 색은 미리 곱한 알파 */
const FS=`precision mediump float;
varying vec3 vC;varying vec2 vR;varying float vZ,vA;uniform vec3 uFr;
float sg(vec2 p,vec2 b,float w){float h=clamp(dot(p,b)/dot(b,b),0.,1.);return smoothstep(w,w*.35,length(p-b*h));}
void main(){vec2 p=gl_PointCoord*2.-1.;p=vec2(vR.x*p.x+vR.y*p.y,-vR.y*p.x+vR.x*p.y);
float px=2./max(vZ,1.),r=length(p);
float dt=smoothstep(.5,.16,r)+smoothstep(1.,.3,r)*.28;
float k=smoothstep(13.,26.,vZ);
vec2 q=abs(p);float rc=length(q-vec2(.56));
float arm=sg(q,vec2(.56),max(.06,px*1.1));
float ring=smoothstep(max(px*1.2,.035),0.,abs(rc-.32));
float disc=smoothstep(.33,.29,rc)*.18;
float body=smoothstep(.2+px,.2,max(q.x,q.y));
float led=smoothstep(.13,.05,r);
float fr=max(max(arm,ring),max(body*.85,disc));
float a=mix(dt,max(fr,led),k);
vec3 c=mix(vC*dt,uFr*fr*(1.-led)+vC*led,k);
gl_FragColor=vec4(c,a)*vA;}`;

/* 선분: 꼭짓점마다 A · B(월드) · t(0 A 끝 · 1 B 끝) · 옆(-1~1) · 색. 두 끝을 투영해 화면에서 수직으로 uW(px)만큼 벌림 */
const LVS=`attribute vec3 aA,aB;attribute vec2 aT;attribute vec4 aC;
uniform mat4 uVP;uniform vec2 uSh,uVw;uniform float uW;
varying vec4 vC;varying float vS;
void main(){vec4 a=uVP*vec4(aA,1.),b=uVP*vec4(aB,1.);a.xy+=uSh*a.w;b.xy+=uSh*b.w;
vec2 d=b.xy/b.w*uVw-a.xy/a.w*uVw;float l=length(d);d=l>1e-3?d/l:vec2(1.,0.);
vec4 q=mix(a,b,aT.x);q.xy+=vec2(-d.y,d.x)*aT.y*uW/uVw*q.w;gl_Position=q;vC=aC;vS=aT.y;}`;
const LFS=`precision mediump float;varying vec4 vC;varying float vS;
void main(){float e=smoothstep(1.,.25,abs(vS))*vC.a;gl_FragColor=vec4(vC.rgb*e,e*.75);}`;
const LV=[[0,-1],[1,-1],[1,1],[0,-1],[1,1],[0,1]];   /* 선분 하나 = 삼각형 2개 */

function makeGL(cv){
  const g=cv.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:true,powerPreference:'high-performance'});
  if(!g)return null;
  const sh=(t,s)=>{const o=g.createShader(t);g.shaderSource(o,s);g.compileShader(o);if(!g.getShaderParameter(o,g.COMPILE_STATUS))throw new Error(g.getShaderInfoLog(o));return o};
  /* 속성 자리는 두 프로그램이 0~3을 같이 씀 — 그릴 때마다 자기 버퍼로 다시 묶음 */
  const prog=(v,f,names)=>{const p=g.createProgram();g.attachShader(p,sh(g.VERTEX_SHADER,v));g.attachShader(p,sh(g.FRAGMENT_SHADER,f));names.forEach((n,i)=>g.bindAttribLocation(p,i,n));g.linkProgram(p);if(!g.getProgramParameter(p,g.LINK_STATUS))throw new Error(g.getProgramInfoLog(p));return p};
  let pr,lp;
  try{pr=prog(VS,FS,['aP','aS','aC']);lp=prog(LVS,LFS,['aA','aB','aT','aC'])}
  catch(e){console.warn('swarm-gl',e);return null}
  const U=n=>g.getUniformLocation(pr,n),uVP=U('uVP'),uSh=U('uSh'),uF=U('uF'),uDpr=U('uDpr'),uMax=U('uMax'),uFr=U('uFr');
  const LU=n=>g.getUniformLocation(lp,n),lVP=LU('uVP'),lSh=LU('uSh'),lVw=LU('uVw'),lW=LU('uW');
  const buf=g.createBuffer(),lbuf=g.createBuffer();
  const at=(l,sz,st,off)=>{g.enableVertexAttribArray(l);g.vertexAttribPointer(l,sz,g.FLOAT,false,st*4,off*4)};
  g.enable(g.BLEND);g.blendFunc(g.ONE,g.ONE_MINUS_SRC_ALPHA);g.disable(g.DEPTH_TEST);
  const maxPt=Math.min(160,g.getParameter(g.ALIASED_POINT_SIZE_RANGE)[1]||64);
  let cap=0,lcap=0,lv=null,lost=false,W=1,H=1;
  cv.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true});
  return {kind:'gl',
    size(w,h){cv.width=W=w;cv.height=H=h;g.viewport(0,0,w,h)},
    draw(data,n,cam,L,nl){
      if(lost)return;
      g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);
      g.useProgram(pr);g.bindBuffer(g.ARRAY_BUFFER,buf);
      if(n*ST>cap){cap=n*ST;g.bufferData(g.ARRAY_BUFFER,cap*4,g.DYNAMIC_DRAW)}
      g.bufferSubData(g.ARRAY_BUFFER,0,data.subarray(0,n*ST));
      at(0,3,ST,0);at(1,4,ST,3);at(2,3,ST,7);
      g.uniformMatrix4fv(uVP,false,cam.vp);g.uniform2f(uSh,cam.sh[0],cam.sh[1]);
      g.uniform1f(uF,cam.f);g.uniform1f(uDpr,cam.dpr);g.uniform1f(uMax,maxPt);g.uniform3fv(uFr,cam.frame);
      g.drawArrays(g.POINTS,0,n);
      if(!nl)return;
      /* 선분 → 꼭짓점 6개씩(12칸: A3 B3 t2 색4) */
      if(nl>lcap){lcap=Math.ceil(nl*1.5);lv=new Float32Array(lcap*72);g.bindBuffer(g.ARRAY_BUFFER,lbuf);g.bufferData(g.ARRAY_BUFFER,lv.byteLength,g.DYNAMIC_DRAW)}
      for(let s=0,o=0;s<nl;s++){const b=s*10;for(let v=0;v<6;v++,o+=12){for(let k=0;k<6;k++)lv[o+k]=L[b+k];lv[o+6]=LV[v][0];lv[o+7]=LV[v][1];lv[o+8]=L[b+6];lv[o+9]=L[b+7];lv[o+10]=L[b+8];lv[o+11]=L[b+9]}}
      g.useProgram(lp);g.bindBuffer(g.ARRAY_BUFFER,lbuf);g.bufferSubData(g.ARRAY_BUFFER,0,lv.subarray(0,nl*72));
      at(0,3,12,0);at(1,3,12,3);at(2,2,12,6);at(3,4,12,8);
      g.uniformMatrix4fv(lVP,false,cam.vp);g.uniform2f(lSh,cam.sh[0],cam.sh[1]);g.uniform2f(lVw,W/2,H/2);g.uniform1f(lW,cam.lw||1);
      g.drawArrays(g.TRIANGLES,0,nl*6);
    }};
}

/* WebGL이 없을 때: 같은 버퍼를 2D로 — 점만(드론 모양 없음) */
function make2D(cv){
  const c=cv.getContext('2d');if(!c)return null;
  return {kind:'2d',
    size(w,h){cv.width=w;cv.height=h},
    draw(d,n,cam,L,nl){
      const W=cv.width,H=cv.height,m=cam.vp;c.clearRect(0,0,W,H);
      for(let i=0;i<n;i++){const o=i*ST,x=d[o],y=d[o+1],z=d[o+2];
        const w=m[3]*x+m[7]*y+m[11]*z+m[15];if(w<.12)continue;
        const sx=((m[0]*x+m[4]*y+m[8]*z+m[12])/w+cam.sh[0])*.5+.5,sy=.5-((m[1]*x+m[5]*y+m[9]*z+m[13])/w+cam.sh[1])*.5;
        const s=Math.max(1,d[o+3]*cam.f/w*cam.dpr*.6),a=d[o+5]*d[o+6];if(a<.02)continue;
        c.globalAlpha=Math.min(1,a);c.fillStyle=`rgb(${d[o+7]*255|0},${d[o+8]*255|0},${d[o+9]*255|0})`;
        c.fillRect(sx*W-s/2,sy*H-s/2,s,s);
      }
      if(nl){c.lineWidth=(cam.lw||1)*1.4;   /* 선분 */
        const P=(x,y,z,o)=>{const w=m[3]*x+m[7]*y+m[11]*z+m[15];o[0]=((m[0]*x+m[4]*y+m[8]*z+m[12])/w+cam.sh[0])*.5*W+.5*W;o[1]=(.5-((m[1]*x+m[5]*y+m[9]*z+m[13])/w+cam.sh[1])*.5)*H;return w};
        const a=[0,0],b=[0,0];
        for(let s=0;s<nl;s++){const o=s*10;if(P(L[o],L[o+1],L[o+2],a)<.12||P(L[o+3],L[o+4],L[o+5],b)<.12)continue;
          c.globalAlpha=Math.min(1,L[o+9]);c.strokeStyle=`rgb(${L[o+6]*255|0},${L[o+7]*255|0},${L[o+8]*255|0})`;c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke()}}
      c.globalAlpha=1;
    }};
}

window.SW={ST,persp,lookAt,mul,gl:makeGL,c2d:make2D};
})();
