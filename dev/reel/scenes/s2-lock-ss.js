/* s2-lock 도우미 — 표본 하나 안의 초표본(선형광 평균)
   컷 직후 펀치가 가장 빠른 프레임에서 엔진 표본 하나를 K 자세로 나눠 그리고, 엔진 누적과 같은 식(sRGB ↔ 선형)으로 평균해 한 장으로 되돌린다.
   (canvas lighter 평균은 감마 공간이라 빠른 가장자리가 기준(64표본 선형)보다 최대 ~20단계 어긋남) */
import {W,H} from '../engine.js';

const LIN=new Float32Array(256);for(let i=0;i<256;i++){const c=i/255;LIN[i]=c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4)}
const ENC=new Uint8Array(65536);for(let i=0;i<65536;i++){const c=i/65535;ENC[i]=Math.round(255*(c<=.0031308?c*12.92:1.055*Math.pow(c,1/2.4)-.055))}
let X=null,ACC=null;

/* g 위에 draw(ctx, j)를 j=0..K−1 따로 얹은 K장의 선형광 평균을 그린다(각 장의 바탕 = 지금 g) */
export function linAvg(g,K,draw){
  if(!X){const c=document.createElement('canvas');c.width=W;c.height=H;X=c.getContext('2d',{willReadFrequently:true});ACC=new Float32Array(W*H*3)}
  X.setTransform(1,0,0,1,0,0);X.globalAlpha=1;X.globalCompositeOperation='copy';X.drawImage(g.canvas,0,0);X.globalCompositeOperation='source-over';
  const base=X.getImageData(0,0,W,H);ACC.fill(0);
  for(let j=0;j<K;j++){if(j)X.putImageData(base,0,0);draw(X,j);const d=X.getImageData(0,0,W,H).data;
    for(let i=0,q=0;i<d.length;i+=4,q+=3){ACC[q]+=LIN[d[i]];ACC[q+1]+=LIN[d[i+1]];ACC[q+2]+=LIN[d[i+2]]}}
  const o=base.data,s=65535/K;
  for(let i=0,q=0;i<o.length;i+=4,q+=3){o[i]=ENC[Math.round(ACC[q]*s)];o[i+1]=ENC[Math.round(ACC[q+1]*s)];o[i+2]=ENC[Math.round(ACC[q+2]*s)];o[i+3]=255}
  X.putImageData(base,0,0);g.drawImage(X.canvas,0,0)}
