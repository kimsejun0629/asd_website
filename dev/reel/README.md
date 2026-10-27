# 메인 히어로 쇼릴 (dev/reel)

15초 · 1920×1080 · 60fps(900프레임) · 무음 · 끊김 없는 루프. 결정적 렌더: 모든 그림은 프레임 `f`(실수)만으로 정해진다.

- 미리보기: `http://[::1]:8768/dev/reel/index.html?f=300`(정지, ←/→ 1프레임, Shift 10) · `?play=1`(실시간) · `?lang=en` · `?only=s2-aero`(그 장면만) · `?samples=8`(블러)
- 스틸: `python3 tools/reel/shots.py --frames 120,150,180 --out _out/reel/shots [--only id] [--samples 8] [--sheet] [--lang en]`
- 움직임 분석(빠름): `python3 tools/reel/motion.py --start 120 --end 300 --out _out/reel/motion [--only id] [--strip 6]` → 프레임 간 차이 곡선 · 튐 · 정지 · 필름 스트립
- 렌더: `python3 tools/reel/render.py --lang ko --preview`(30fps, 블러 없음) / `--lang ko`(60fps, 8표본, 마스터 + 웹용)

## 파일

| 파일 | 내용 |
|---|---|
| `engine.js` | 상수 · 팔레트 `C` · 수학 · 곡선 `E` · 난수 · 글꼴 · 그림 · 글자 배치 · 선 · 장면 등록 · `renderAt` |
| `gl3d.js` | 3D 층(사이트 a3d 모듈 재사용): `craft(key)` · `render(shots, cam)` · `project` |
| `acc.js` | 출력 합성: 선형광 누적(모션 블러) + 디더 |
| `strings.js` | 화면 글 `S.ko` · `S.en` |
| `scenes/index.js` | 장면 목록 `LIST`(동적 import — 한 장면 오류가 다른 장면을 막지 않음) |
| `scenes/<id>.js` | 장면 하나 = 파일 하나. 다른 장면 파일을 고치지 않는다 |

## 장면 규약

```js
import {scene,C,E,seg,mapr,lerp,clamp,text,textRise,textEach,glyphs,measure,fit,odometer,
        hline,vline,rect,strokeRect,arc,polyline,brackets,grid,label,cover,need,img,rng,hash,W,H} from '../engine.js';
need('/web/img/aero/top-787-k26.webp');            // 그림은 모듈 최상위에서 미리 불러오기 등록
scene({id:'s2-aero', from:180, to:420, z:10,          // [from,to) 전체 프레임. 루프를 넘는 장면은 from<0 또는 to>900 허용
  init(env){ this.A=env.GL.craft('787') },            // 선택(비동기 가능): 3D 기체 · 캐시 준비
  draw(g,f,env){ const l=f-this.from; ... }            // g: 2D 컨텍스트(1920×1080), f: 전체 프레임(실수 — 블러 표본 때문에 소수)
});
```

- **`f`는 실수다.** 표본 사이 시간이 소수로 들어온다. `Math.floor(f)`로 상태를 끊으면 블러가 계단진다(컷 · 번쩍임처럼 의도한 경우만).
- 무작위는 `rng(seed)` · `hash(i,seed)`만. `Math.random` · `Date` · `performance.now` 금지.
- 배경은 매 프레임 `C.night`로 칠해진 뒤 z 순서로 장면이 그려진다. 장면은 `g.save/restore`로 감싸서 불린다(상태 누출 걱정 없음).
- 글은 `env.S.<키>`로(국문/영문 자동). 영문이 길면 `fit(g,s,o,maxW)`로 줄이거나 배치를 바꾼다.
- 색은 `C.*`만(팔레트 + 허용 예외: `goldHi #C2A673` · `goldHi2 #B5A27F` · `livery #53AAE2` · `navy #051766`). 투명도는 `rgba(C.cream,.5)`.
- 1px 선은 `hline/vline`(정수 화소에 맞춤). 굵기 2px 이상은 짝수 권장.

## engine.js 요약

- `E`: `lin` · `in/out/io` + `Quad/Cubic/Quart/Quint/Expo/Circ` · `outBack(t,s)` · `inBack` · `spring(t,k,z)` · `bez(x1,y1,x2,y2)` · 이름 곡선 `snap`(강한 감속) · `whip` · `std` · `accel`
- `seg(f,a,b)` 0~1 진행 · `mapr(f,a,b,c,d,ease)` · `lerp` · `clamp` · `smooth` · `fract` · `TAU`
- 글자: 스타일 `o={size, weight:300|700, track(em), color, alpha, align:'left'|'center'|'right', baseline}`
  - `text(g,s,x,y,o)` → 폭 · `measure(g,s,o)` · `glyphs(g,s,o)` → `{list:[{ch,i,x,w}], w}` (커닝 · 자간 반영)
  - `textEach(g,s,x,y,o,(q,k,n)=>({dx,dy,alpha,scale,rot,color,clip:[x,y,w,h]}))` 글자별 변형
  - `textRise(g,s,x,y,o,p,{stagger,dist})` 마스크 안에서 아래→위로 올라옴(p 0→1)
  - `odometer(g,'5,500',x,y,o,p,{spin,stagger,ease})` 자리별 세로 굴림
  - `label(g,'Aerostructures',x,y,{size,color,dash})` 금색 대시 + 대문자 자간 라벨(사이트 `.lbl.mk`)
- 도형: `hline` · `vline` · `rect` · `strokeRect` · `arc(g,cx,cy,r,a0,p,{lw,color,dash,dir})` · `polyline(g,pts,p,…)`(부분 그리기, 끝점 반환) · `brackets` · `grid(g,step,{ox,oy,alpha,x0,y0,x1,y1})` · `cover(g,im,x,y,w,h,{fx,fy,zoom})`
- 그림: 모듈 최상위 `need(path…)` → `img(path)`(HTMLImageElement). SVG도 됨(`/web/img/logo-white.svg`).

### M0 추가(스토리보드 build plan)

- 글줄: `lineIn(g,s,x,y,o,f,f0,{dur=16,budget=10,dir:'up'|'down',mask:[y0,y1],dist,ease=E.snap,fade})` — 글자 k는 `f0+budget·k/(n−1)`에 시작(국문 · 영문 같은 시간) · `lineOut(…,f,f0,{dur=8,budget=4,dir,mask,ease=E.accel})` · `trackIn(g,s,x,y,o,p)`(라벨 자간 .30→.14em)
- 맞춤: `fitSize(g,s,o,maxW,floor=26)` · `fitLines(g,s,o,maxW,{floor=72,size2=88})` → `[{s,o}]`(1~2줄)
- 조각: `spans(g,[{s,o},…],x,y,{gap=16,divider:'hair'})` · `spansLayout(…)` → `{list:[{s,o,x,w}|{div,x}], w}`(조각별로 lineIn 할 때)
- 숫자: `odoValue(g,v,x,y,o,{target,grouping=true,decimals=0})` 값이 굴러가는 기계식 주행거리계(앞자리 0은 서서히) · `wheel(g,deg,x,y,o)` 방위 3자리 + °
- 도형: `ellipse(g,cx,cy,rx,ry,p,{…})` · `quad(g,p0,c,p1,p,{lw,color,alpha,dash})` → 머리 점 · `glowLine(g,x,{core=2,glow=32,alpha=.2,ticks=40,tickSide,y0=60,y1=1020})` 금색 스캔선 · `clipBand(g,y0,y1)`
- 층: `layer(id)` → 지워진 1920×1080 오프스크린 ctx(같은 id 재사용 — 한 draw 안에서만) · `maskWith(g,content(ctx),mask(ctx),{mode:'destination-in'|'destination-out',id})`
- `duotone(im,stops,{gamma=.9})` → 구운 캔버스(캐시) · `loglerp(a,b,t)` · `hermite([[f,v],…])` → `f=>v`
- 검사용: 글 스타일에 `id` · `tier`(1 필수 · 2 보조 · 3 질감)를 달면 `reel.boxes(f)`가 상자를 모음(check.py)

### 통합 때 고친 것(엔진 · 공유)

- `glyphs()`: 글자 i의 x = 폭(앞 i+1글자) − 폭(글자 i) — 앞 글자와의 커닝(AV · Te · PA …)이 들어가 글자별 그림이 통째 그림과 같은 자리(전엔 'Te'의 e가 c에 부딪힘)
- `measure()` 캐시 열쇠를 스타일 값으로: Chrome은 `save()` 안에서 부모와 같은 자간이면 `g.letterSpacing`을 ''로 읽어, 자간이 다른 폭끼리 캐시가 섞였음(그림 자체는 맞음)
- `label()`: 가운뎃점 '·'을 `dashColor`(#B5A27F)로(두 번 그리고 점 칸만 반대로 잘라 커닝 그대로) · `id` · `tier`를 넘김
- `lineIn` · `lineOut` · `textRise`: 가림을 화면에 고정(`textEach` clip은 dy와 함께 움직임) · `lineOut({fade})` 진행 .3→.75에 1→0
- `layer(id,{soft:true})`: 소프트웨어 캔버스(선택)
- `shared.js`: `TAG`는 실제 기준선(라벨 690 = s7 각주) · `MAP`/`mapT`는 s4가 그리는 자세(시작 1.1 · 부산 760,500 · 닻 곡선 · 사다리꼴 밀기) · `FUT_COL`(s5 글 기둥 — s6 스캔선이 피함)
- `blur.js`: 94–104(태그라인 접힘) N=32 — s1의 감마 공간 보강 표본 대신 선형광 누적
- 영문 마감: s7 각주(`end.foot`, x 815~)는 영문만 857~867에 사라짐(E.accel) — 태그라인 1줄(864~ 솟음) 바로 위에 붙어 한 덩이로 읽혔음. 국문 화소는 그대로

### shared.js · blur.js · kit.js

- `shared.js`: 경계에서 이어지는 상수는 여기서만 — `P`(초점 1216,468) · `SAFE` · `ZOV` · `TAG` · `scanX(f)` · `LT(f)`(787 롱테이크) · `DISC` · `MAP`/`mapT(f)` · `ROUTES` · `A350` · `RET` · `FRAME` · `LOGO` · `BAND` · `LIMB`
- `blur.js`: `blurAt(f)` → `{n,shutter}`(스토리보드 표). 렌더 · `--samples auto`가 씀
- `kit.js`: `sym(g,cx,cy,R,color,p1,p0)` 새 태극(부분 그리기) · `symPoint` · `logo(g,x,y,w)`(`LOGO_AR`) · `loadLand()`/`land()` 북태평양 Path2D(`LAND_VB`) · `PATTERN` · `TOP`(새 도장 탑뷰) · `UAV_TOP`

## gl3d.js 요약(`env.GL`)

- `craft(key, id?)` → 기체 `A`(캐시). key: `787` `737` `a320` `a330` `a350` `ah6`. 같은 기종 여러 대가 필요하면 id를 달리.
  - `A.R` 바운딩 구 반경 · `A.parts`(부위 키 → 메시들) · `A.beats`(부위별 카메라 힌트, `a3d-craft.js`) · `A.rotor`(AH-6)
  - `A.xr(g, act, {lift, pulse, dimOthers, xrOp})`: g 0 도장 ~ 1 투시(크림 가장자리광), act 금색 부위 키 · 배열 · `'*'`
- `render(shots, cam, {exposure, floor})` → WebGL 캔버스(알파). **곧바로** `g.drawImage(cv,0,0)`.
  - shots: `[{A, pos:[x,y,z], rot:[x,y,z], scale, rotor}]`(rot 순서 YXZ) · cam: `{yaw, el, dist(R 배수)|r(절대), target:[x,y,z], fov, lens:[sx,sy], roll}`
- `project(A,[x,y,z])` / `projectWorld([x,y,z])` → 화면 `[x,y,z]`(마지막 render · setCam 기준) — 설명선 끝점에 씀
- `A.xr(g,act,{lift,pulse,dimOthers,xrOp,goldOp})` — `lift`는 법선 방향 .38×lift(1을 넘겨도 됨 — s6은 2배) · `pulse`는 발광 +.1×pulse뿐(더 밝게는 재질 직접: s2 post3d) · `goldOp`: 도장 상태(g=0)에서도 금색 부위를 덧칠 · `A.anchor(k)` 부위 기준점(모델 좌표) · `A.beatR(k,fov)` 부위 카메라 거리 · `A.rotorHub` · `A.rotorR`(AH-6)
- `setCam(shots,cam)`(그리지 않고 배치만) · `solveLens(shots,cam,A,local,[X,Y])` → `lens`(모델 점을 화면 X,Y에) · `projR(A,local,r,plane)` 화면 반지름
- 항법등 구(초록 · 빨강 · 흰)는 숨김. `?nogl=1`이면 render가 빈 캔버스(팔레트 검사)
- 한 프레임에 render를 여러 번 불러도 된다(부를 때마다 즉시 drawImage).
