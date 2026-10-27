/* 쇼릴 s7-people 도우미 — S13 사진 띠의 카메라(켄 번스)와 띠 스캔선 · S14→S15 엔드카드 물러남
   모든 값은 f(실수)만으로 정해짐 */
import {C,E,W,seg,lerp,loglerp,rgba} from '../engine.js';
import {BAND} from '../shared.js';

/* ── 사진 자리: 띠 사각형 (0,120)–(1920,640)에 cover(fy .45, ≈1.07)가 기준.
   720부터 81f 선형(닫힐 때까지 같은 속도로 이어감): 기준점 KB(얼굴 왼쪽 위)를 중심으로 확대 1→1.08(로그) + 왼쪽 48px · 아래 10px
   — 카메라가 사람 쪽으로 밀고 들어가며 옆으로 흐름. 오른쪽 가장자리 여유 = 720(1.08^t−1)−48t > 0(볼록) → 809까지 띠를 늘 덮음 ── */
const KB={ax:1200,ay:380,z:1.08,dx:-48,dy:10};
export function photoPlace(f){const t=Math.max(0,(f-720)/81),k0=Math.max(W/1800,(BAND.y1-BAND.y0)/766),z=loglerp(1,KB.z,t);
  const w0=1800*k0,h0=766*k0,x0=(W-w0)/2,y0=BAND.y0+(BAND.y1-BAND.y0-h0)*.45;
  return [KB.ax+(x0-KB.ax)*z+KB.dx*t,KB.ay+(y0-KB.ay)*z+KB.dy*t,w0*z,h0*z]}

/* ── 띠 스캔선: 768~792 오른쪽→왼쪽 한 번(릴의 금색 스캔 모티프 — s1보다 가늘고 옅게).
   속도 ≈117 → 50px/f로 줄며 지나감. 빛(24px, α.15, 더하기)은 표본 x마다 그려 누적 블러로 부드러운 자취,
   1px 심 · 훑은 쪽(+x) 꼬리빛(속도만큼, α.08, ≤64px)은 프레임 중심 x(모든 표본 같은 자리)에 선명하게.
   빛 · 꼬리는 띠 금선 사이 [top,bot)만, 심은 금선 밖으로 6px씩 나와 자(눈금자)의 커서처럼 두 금선을 잇는다 ── */
export const TSCAN={f0:768,f1:792,gw:24,ga:.15,wk:.08,tick:6};
export const tscanX=f=>{const u=seg(f,TSCAN.f0,TSCAN.f1);return 1960-2000*(.6*u+.4*E.outQuad(u))};
export function talentScan(g,f,top,bot){if(f<TSCAN.f0||f>=TSCAN.f1||bot<=top)return;
  const {gw,ga,wk,tick}=TSCAN,xs=tscanX(f),F=Math.round(f),xc=Math.round(tscanX(F)),v=Math.abs(tscanX(F+.5)-tscanX(F-.5)),L=Math.min(v*.6,64);
  g.save();g.beginPath();g.rect(0,top,W,bot-top);g.clip();g.globalCompositeOperation='lighter';
  const gr=g.createLinearGradient(xs-gw,0,xs+gw,0);gr.addColorStop(0,rgba(C.goldHi,0));gr.addColorStop(.5,rgba(C.goldHi,ga));gr.addColorStop(1,rgba(C.goldHi,0));
  g.fillStyle=gr;g.fillRect(xs-gw,top,gw*2,bot-top);
  if(L>1){const tr=g.createLinearGradient(xc,0,xc+L,0);tr.addColorStop(0,rgba(C.goldHi,wk));tr.addColorStop(1,rgba(C.goldHi,0));g.fillStyle=tr;g.fillRect(xc,top,L,bot-top)}
  g.restore();g.save();g.fillStyle=C.goldHi;g.fillRect(xc,top-1-tick,1,bot-top+2+2*tick);g.restore()}

/* ── 엔드카드 물러남: 858~870(E.std — 태그라인 1줄이 솟는 864 전에 대부분 물러나고 부드럽게 멈춤)
   숫자 · 칸 라벨 · 절 라벨 · 각주 · 구분선이 α 1→.3 · 위로 10px. 로고 · 패턴은 그대로(로고는 878~887 사라짐만) ── */
export const back=f=>E.std(seg(f,858,870));
export const recede=f=>lerp(1,.3,back(f));
export const lift=f=>-10*back(f);
