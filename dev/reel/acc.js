/* 쇼릴 — 출력 합성: 2D 캔버스 프레임을 WebGL2 반정밀도 버퍼에 선형광으로 누적(모션 블러) → sRGB + 삼각 디더로 화면 캔버스에.
   표본 1장이어도 같은 경로(디더 동일)를 지나 결과가 일관됨 */
export function makeAcc(out,W,H,{linear=true}={}){
  const gl=out.getContext('webgl2',{preserveDrawingBuffer:true,antialias:false,alpha:false,premultipliedAlpha:false});
  if(!gl)throw new Error('webgl2');
  if(!gl.getExtension('EXT_color_buffer_float'))throw new Error('EXT_color_buffer_float');
  const f32=!!gl.getExtension('EXT_float_blend');   /* 32비트 버퍼에 더하기 합성이 되면 32비트, 아니면 16비트 */
  const sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s};
  const prog=(fs)=>{const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,VS));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p};
  const VS=`#version 300 es
in vec2 p;out vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
  const FA=`#version 300 es
precision highp float;in vec2 uv;uniform sampler2D src;uniform float w;out vec4 o;
vec3 lin(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(.04045,c));}
uniform float L;void main(){vec3 c=texture(src,vec2(uv.x,1.-uv.y)).rgb;o=vec4((L>.5?lin(c):c)*w,w);}`;
  const FO=`#version 300 es
precision highp float;in vec2 uv;uniform sampler2D acc;uniform float seed;uniform float dith;uniform float L;out vec4 o;
vec3 enc(vec3 c){c=clamp(c,0.,1.);return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));}
float h(vec2 p){p=fract(p*vec2(443.897,441.423)+seed);p+=dot(p,p.yx+19.19);return fract((p.x+p.y)*p.x);}
void main(){vec4 a=texture(acc,uv);vec3 c=a.rgb/max(a.a,1e-6);c=L>.5?enc(c):c;
  vec2 q=gl_FragCoord.xy;float n=(h(q)+h(q+71.3)-1.)*dith/255.;o=vec4(c+n,1.);}`;
  const pA=prog(FA),pO=prog(FO);
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  [pA,pO].forEach(p=>gl.bindAttribLocation(p,0,'p'));[pA,pO].forEach(p=>gl.linkProgram(p));
  const tex=(ifmt,fmt,type)=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);if(ifmt)gl.texImage2D(gl.TEXTURE_2D,0,ifmt,W,H,0,fmt,type,null);return t};
  const src=tex(null),acc=f32?tex(gl.RGBA32F,gl.RGBA,gl.FLOAT):tex(gl.RGBA16F,gl.RGBA,gl.HALF_FLOAT);
  const fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,acc,0);
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('fbo');
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  return {
    clear(){gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.viewport(0,0,W,H);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT)},
    add(canvas2d,w){gl.bindTexture(gl.TEXTURE_2D,src);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas2d);
      gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.viewport(0,0,W,H);gl.useProgram(pA);gl.uniform1i(gl.getUniformLocation(pA,'src'),0);gl.uniform1f(gl.getUniformLocation(pA,'w'),w);gl.uniform1f(gl.getUniformLocation(pA,'L'),linear?1:0);
      gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.bindVertexArray(vao);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,src);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);gl.disable(gl.BLEND)},
    out(seed,dith=1){gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,W,H);gl.useProgram(pO);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,acc);
      gl.uniform1i(gl.getUniformLocation(pO,'acc'),0);gl.uniform1f(gl.getUniformLocation(pO,'seed'),seed%97*.013);gl.uniform1f(gl.getUniformLocation(pO,'dith'),dith);gl.uniform1f(gl.getUniformLocation(pO,'L'),linear?1:0);gl.bindVertexArray(vao);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);gl.finish()},
  };
}
