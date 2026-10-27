/* s3-uav 도우미 — 멈춤(detent) 순간 표본 보충(blur.js 표가 늘기 전까지의 임시 · 엔진 요청 보고)
   멈춤 구간에서만 엔진 표본 하나를 M개로 더 나눠, acc.js와 같은 선형광으로 평균: 밑그림(g에 이미 그려진 것) 위에 합성 → 선형 → 평균 → sRGB.
   blur.js가 이 표만큼 표본을 주면 M=1(저절로 꺼짐). 표본 1(정수 f: 미리보기 · 검사 · motion.py)에서도 M=1 */
import {W,H,layer} from '../engine.js';
import {blurAt} from '../blur.js';

/* 원하는 표본 수: 멈춤 프레임 T(셔터 절반은 정지 · 절반은 snap 첫 속도 115–186px/f)는 48 — 표본 간격 ≤2px로 계단 없는 번짐,
   T±1 · 고정 389–393은 24, 첫 멈춤 뒤 331–334는 16 */
const TK=[330,339,347,354,361,367,373,379,385];
const WANT=new Map();
for(const t of TK){WANT.set(t,48);for(const d of [-1,1])if(!WANT.has(t+d))WANT.set(t+d,24)}
for(const t of [389,392,393])WANT.set(t,24);for(const t of [390,391])WANT.set(t,48);for(const t of [332,333,334])if(!WANT.has(t))WANT.set(t,16);
/* 큰 코드 퇴장(E.accel — 끝 속도가 한없이 커져 마지막 ¼f에 34px): 394–398은 32 — 'g' 내림이 겹겹이 끊겨 보이지 않게 */
for(const t of [394,395,396,397,398])WANT.set(t,32);
const want=f=>WANT.get(Math.round(f))||0;
export const subM=f=>Number.isInteger(f)?1:Math.max(1,Math.ceil(want(f)/blurAt(f).n));

let A=null;
function init(){const c=document.createElement('canvas');c.width=W;c.height=H;
  const gl=c.getContext('webgl2',{alpha:false,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:true});
  if(!gl||!gl.getExtension('EXT_color_buffer_float'))return null;
  const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o};
  const VS=`#version 300 es
in vec2 p;out vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
  /* 층(미리 곱한 알파)을 밑그림 위에 sRGB로 합성(캔버스 source-over와 같음) → 선형광 × w */
  const FA=`#version 300 es
precision highp float;in vec2 uv;uniform sampler2D L;uniform sampler2D B;uniform float w;out vec4 o;
vec3 lin(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(.04045,c));}
void main(){vec2 t=vec2(uv.x,1.-uv.y);vec4 l=texture(L,t);vec3 b=texture(B,t).rgb;o=vec4(lin(l.rgb+b*(1.-l.a))*w,w);}`;
  const FO=`#version 300 es
precision highp float;in vec2 uv;uniform sampler2D A;out vec4 o;
vec3 enc(vec3 c){c=clamp(c,0.,1.);return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));}
void main(){vec4 a=texture(A,uv);o=vec4(enc(a.rgb/max(a.a,1e-6)),1.);}`;
  const pr=fs=>{const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,VS));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));gl.bindAttribLocation(p,0,'p');gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p};
  const pA=pr(FA),pO=pr(FO);
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);const bf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  const tex=(ifmt,type)=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.NEAREST],[gl.TEXTURE_MAG_FILTER,gl.NEAREST],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);
    if(ifmt)gl.texImage2D(gl.TEXTURE_2D,0,ifmt,W,H,0,gl.RGBA,type,null);return t};
  const tL=tex(),tB=tex(),tA=tex(gl.RGBA16F,gl.HALF_FLOAT);
  const fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tA,0);
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)return null;
  const up=(t,src,pm)=>{gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,pm);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src)};
  const U=(p,n)=>gl.getUniformLocation(p,n);
  return {c,
    start(bg){up(tB,bg,false);gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.viewport(0,0,W,H);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT)},
    add(src,w){up(tL,src,true);gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.viewport(0,0,W,H);gl.useProgram(pA);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tL);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,tB);
      gl.uniform1i(U(pA,'L'),0);gl.uniform1i(U(pA,'B'),1);gl.uniform1f(U(pA,'w'),w);
      gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.bindVertexArray(vao);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);gl.disable(gl.BLEND)},
    out(){gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,W,H);gl.useProgram(pO);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tA);
      gl.uniform1i(U(pO,'A'),0);gl.bindVertexArray(vao);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);gl.finish()}};
}
/* fn(ctx,t)를 셔터 안 표본 하나의 폭(dt) 안에서 M번 — 결과가 g의 화면 전체를 덮음(밑그림 포함이라 정확) */
export function sub(g,f,fn){const M=subM(f);if(M>1&&A===null)A=init()||false;if(M<=1||!A){fn(g,f);return}
  const b=blurAt(f),dt=b.shutter/b.n;A.start(g.canvas);
  for(let j=0;j<M;j++){const x=layer('s3sub');fn(x,f+((j+.5)/M-.5)*dt);A.add(x.canvas,1/M)}
  A.out();g.save();g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='copy';g.drawImage(A.c,0,0);g.restore()}
