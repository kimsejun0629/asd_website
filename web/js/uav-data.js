/* 무인기 체계 데이터 — 장(章)별 설정(국·영 공통) + 국문 · 영문 글. uav.html · uav-en.html이 js/site.js 뒤, uav-kit.js 앞에서 불러옴.
   window.UAV(이 페이지의 유일한 새 전역)를 만들고, js/uav.js가 CFG + TX[언어]로 장 목록(CH)을 짠다. 글은 innerHTML로 들어가는 HTML 조각(<b> · <em> · &amp; 그대로) */
(()=>{
'use strict';
/* SC[i] = i번째 장면(uav-scenes1/2.js가 번호로 등록) · st = 장면 사이 공유 상태(uav-kit.js) */
const U=window.UAV={SC:[]};

/* 장은 운용고도 순 9개(화면 순서 = 깊은 링크 #c1~#c9 = 메인 무인기 스트립 순서).
   장을 늘리면 CFG · TX 두 언어 · GN · SC 장면을 함께, 그리고 css/uav.css #seq 높이(N × 280vh) · js/uav.js 깊은 링크 정규식을 고친다 */
/* 큰 이름(두 언어 같음) */
U.GN=['MUAV','Stealth','LOWUS','Medium LM','KUS-FT','Target','Small LM','Shipborne','Digital MRO'];
/* img: 첫 화면 기체 그림 · iso: 그림 속 기수 각(도, 탑뷰로 착지하며 되돌림) · hero: 착지할 스프라이트(uav-kit.js SPR)
   ph: 임무 단계 경계(0~1, 단계 수 + 1개 — 글의 phases와 개수가 맞아야 함) · concept: 형상 개념 꼬리표 */
U.CFG=[
 /* 설명 후반 감속: from/to=장면 범위, extra=추가 스크롤(무대 높이 배수) */
 {img:'img/fs_1.webp',iso:30,hero:'male',ph:[.08,.22,.46,.74,1],slow:[{from:.16,to:.22,extra:.25},{from:.34,to:.46,extra:.38},{from:.62,to:.74,extra:.42},{from:.84,to:.95,extra:.45}]},
 {img:'img/st_2.webp',iso:18,hero:'stealth',ph:[.06,.2,.6,.8,1],slow:[{from:.13,to:.2,extra:.25},{from:.4,to:.6,extra:.45},{from:.64,to:.8,extra:.42},{from:.86,to:.95,extra:.45}]},
 {img:'img/lw_3.webp',iso:22,hero:'lowus',ph:[.06,.2,.4,.6,.8,1],slow:[{from:.14,to:.2,extra:.25},{from:.3,to:.4,extra:.35},{from:.5,to:.6,extra:.35},{from:.68,to:.8,extra:.42},{from:.88,to:.95,extra:.45}]},
 {img:'img/sp/mlm_iso2.webp',iso:-50,hero:'mlm',ph:[.04,.18,.45,.7,.85,1],slow:[{from:.11,to:.18,extra:.22},{from:.3,to:.45,extra:.35},{from:.56,to:.7,extra:.4},{from:.75,to:.85,extra:.3},{from:.87,to:.95,extra:.45}]},
 {img:'img/ff_2.webp',iso:153,hero:'ft',ph:[.04,.18,.5,.74,.86,1],slow:[{from:.12,to:.18,extra:.22},{from:.36,to:.5,extra:.35},{from:.62,to:.74,extra:.4},{from:.8,to:.86,extra:.25},{from:.9,to:.95,extra:.45}]},
 {img:'img/sp/tgt_iso.webp',iso:145,hero:'tgt',ph:[.04,.16,.4,.58,.84,1],slow:[{from:.1,to:.16,extra:.22},{from:.28,to:.4,extra:.35},{from:.46,to:.58,extra:.4},{from:.66,to:.8,extra:.4},{from:.89,to:.95,extra:.55}]},
 {img:'img/lm200_1.webp',iso:-22,hero:'slm',ph:[.04,.15,.5,.68,.84,1],slow:[{from:.1,to:.15,extra:.2},{from:.34,to:.5,extra:.35},{from:.56,to:.68,extra:.4},{from:.72,to:.84,extra:.32},{from:.88,to:.95,extra:.45}]},
 {img:'img/sp/naval_iso.webp',iso:26,hero:'naval',ph:[.04,.16,.5,.76,1],concept:true,slow:[{from:.1,to:.16,extra:.22},{from:.36,to:.5,extra:.35},{from:.66,to:.76,extra:.4},{from:.88,to:.95,extra:.45}]},
 {img:'img/sp/mro_iso.webp',iso:-20,hero:'quad',ph:[.04,.18,.36,.6,.8,1],slow:[{from:.12,to:.18,extra:.22},{from:.26,to:.36,extra:.35},{from:.48,to:.6,extra:.42},{from:.67,to:.8,extra:.42},{from:.9,to:.98,extra:.55}]}
];

/* 글: cap 목차 머리(국문은 빈칸 한 칸 — 높이 0) · concept 형상 개념 꼬리표 · src 출처 머리
   ch[i]: name 제목 · rail 목차 이름 · en 영문 줄 · alt 기체 그림 대체 글 · mission 임무 · feats [제목, 설명] · phases [이름, 설명] · specs [항목, 값] · src 출처
   sc[i]: i장 장면 라벨(uav-scenes*.js의 TL) — 두 언어 키가 같아야 함 */
U.TX={
 ko:{cap:' ',concept:'형상 개념',src:'출처',
  ch:[
  /* 1 */ {name:'중고도무인기',rail:'중고도무인기',en:'MUAV · Medium-altitude UAV',alt:'중고도무인기 MUAV',
   mission:'EO/IR · SAR로 <b>중고도에서 광역을 감시</b>합니다',
   feats:[
    ['비행체 2~4대 복합 체계','EO/IR · SAR 탑재 비행체와 고정형 · 이동형 지상통제장비'],
    ['가시선 · 위성 통신','LOS와 SATCOM으로 원거리까지 통제'],
    ['장기 체공 광역 감시','감시정찰 · 통신중계 · 전자전, 해상 · 국경 · 재난 감시까지']],
   phases:[
    ['중고도 선회 진입','작전 지역 상공의 선회 궤도로 들어섭니다.'],
    ['EO/IR · SAR 광역 감시','주·야간 영상과 합성개구레이더로 넓은 지역을 훑습니다.'],
    ['표적 식별·추적','이동 표적을 식별하고 자동으로 추적합니다.'],
    ['LOS · SATCOM 전송','가시선 · 위성 통신으로 지상통제장비에 영상을 보냅니다.']],
   specs:[['크기','13 × 25 × 4 m'],['엔진','1,200 hp'],['임무장비','EO/IR · SAR'],['통신','LOS · SATCOM'],['운용 대수','비행체 2~4대']],
   src:'항공우주사업본부 제품 브로슈어'},
  /* 2 */ {name:'다목적 스텔스기',rail:'다목적 스텔스기',en:'Multi-role Stealth UAV',alt:'다목적 스텔스기',
   mission:'<b>방공 레이더를 피해</b> 은밀하게 침투합니다',
   feats:[
    ['저피탐 전익 형상','꼬리날개 없는 전익으로 레이더 탐지를 줄임'],
    ['지상통제 없는 작전','무인 전투기 운영체계 기반 자율 임무 수행'],
    ['자체 기술 개발','항공우주사업본부 기술력으로 개발하는 차세대 무인전투기']],
   phases:[
    ['적 방공망 식별','레이더 탐지 범위를 파악해 침투 경로를 짭니다.'],
    ['레이더 사각 침투','탐지 범위 사이의 틈을 따라 비행합니다.'],
    ['탐지 회피','낮은 레이더 반사면적으로 추적을 허용하지 않습니다.'],
    ['종심 표적 도달','방공망 뒤 종심의 표적에 도달합니다.']],
   specs:[['형상','전익기 · 무미익'],['특징','저피탐(스텔스) 설계'],['임무','침투 정찰 · 타격']],
   src:'제원 비공개'},
  /* 3 */ {name:'저피탐 무인편대기',rail:'저피탐 무인편대기',en:'LOWUS · Low Observable Unmanned Wingman',alt:'저피탐 무인편대기 LOWUS',
   mission:'유인 전투기와 <b>유·무인 복합 편대</b>를 이룹니다',
   feats:[
    ['유·무인 복합(MUM-T) 플랫폼','유무인 복합 체계에 필요한 스텔스 무인기'],
    ['저피탐 기술 적용','전파흡수구조(RAS), 저피탐 데이터링크 등'],
    ['편대 임무 자율화','대형급 무인기 고기동 비행제어 · 유무인 복합 비행 기술']],
   phases:[
    ['유·무인 편대 구성','유인 전투기와 저피탐 무인편대기가 편대를 이룹니다.'],
    ['기만 · 전자전','가짜 표적 신호와 전파 교란으로 적 레이더를 속입니다.'],
    ['공격','공대지 · 공대공 · 공대함 가운데 공대지 표적을 타격합니다.'],
    ['호위','접근하는 위협으로부터 유인기를 지킵니다.'],
    ['감시정찰','AESA · EO/IR로 편대 앞 공역을 먼저 탐색합니다.']],
   specs:[['크기','10.4 × 9.4 × 2.8 m'],['최대이륙중량','5,700 kg'],['엔진','터보팬'],['임무장비','AESA · EO/IR 등']],
   src:'항공우주사업본부 제품 브로슈어 · ADD'},
  /* 4 */ {name:'중형 자폭무인기',rail:'중형 자폭무인기',en:'Loitering Munition · Medium Level',alt:'중형 자폭무인기',
   mission:'저궤도 위성링크로 <b>먼 바다의 표적</b>까지 찾아가 자폭합니다',
   feats:[
    ['저궤도 위성링크','위성통신 반경 안에서 원거리 운용'],
    ['AI 목표물 자동인지','AI 기반 자동 표적 인식(ATR)'],
    ['선택형 탄두','임무에 맞춰 탄두를 옵션으로 적용']],
   phases:[
    ['함정 캐니스터 발사','함정 갑판의 발사관에서 로켓 추진으로 날아오릅니다.'],
    ['저궤도 위성링크 순항','위성통신 반경 안이라면 어디든 통제를 이어갑니다.'],
    ['배회 · AI 목표물 자동인지','표적 해역을 배회하며 AI로 표적을 자동 인지합니다.'],
    ['종말 급강하','인식한 표적을 향해 급강하합니다.'],
    ['자폭 타격','탄두로 표적을 무력화합니다.']],
   specs:[['크기','2.4 × 2.9 m'],['통신','저궤도 위성링크'],['표적 인지','AI ATR'],['탄두','옵션']],
   src:'항공우주사업본부 제품 브로슈어 · ADD'},
  /* 5 */ {name:'사단무인기',rail:'사단무인기',en:'KUS-FT · Fixed Wing Tactical UAS',alt:'사단무인기 KUS-FT',
   mission:'육군 · 해병대의 <b>감시정찰 · 표적 획득</b>을 맡습니다',
   feats:[
    ['국내 최초 형식인증','무인항공기로는 국내에서 처음 형식인증 획득'],
    ['복수 통제 · 24시간 연속 임무','비행체 2~4대를 교대로 띄워 끊김 없이 감시'],
    ['야지 · 야간 자동 이착륙','급강하 · 단거리 착륙, 비상시 낙하산으로 안전 회수']],
   phases:[
    ['야지 자동 이륙','활주로가 없는 야지에서도 자동으로 이륙합니다.'],
    ['산악 전술 정찰','골짜기를 따라 저고도로 정찰합니다.'],
    ['야간 감시','야간에도 열원을 탐지합니다.'],
    ['표적 획득 · 전파','획득한 표적 정보를 지상통제장비로 전파합니다.'],
    ['교대 · 24시간 연속 임무','복수 비행체를 교대로 띄워 감시를 끊지 않습니다.']],
   specs:[['크기','3.7 × 4.5 × 0.9 m'],['최대이륙중량','150 kg'],['엔진','35 HP 로터리'],['최대 / 순항','200 / 130 km/h']],
   src:'항공우주사업본부 제품 브로슈어'},
  /* 6 */ {name:'아음속 무인표적기',rail:'아음속 무인표적기',en:'KUS-100UAT · Subsonic Target Drone',alt:'아음속 무인표적기 KUS-100UAT',
   mission:'<b>유도무기 시험의 표적</b>이 되어 실전 위협을 모사합니다',
   feats:[
    ['함상 발사 · 2대 동시 운용','함정 발사대에서 발사하고 두 대를 함께 통제'],
    ['실전 위협 모사 기동','수면 위 저고도 · 급기동 · 팔자 기동, AI 자율비행'],
    ['RCS · IR 증폭 · MDI 평가','탐지 신호를 키우고, 유도탄이 스친 거리로 사격 결과를 평가']],
   phases:[
    ['함상 발사대 발사','다목적훈련지원정의 발사대에서 두 대를 차례로 발사합니다.'],
    ['팔자 기동 · 급기동','팔자 기동과 급기동으로 적 항공기의 움직임을 모사합니다.'],
    ['RCS · IR 증폭','레이더 반사 신호와 적외선 신호를 키워 실제 위협처럼 탐지되게 합니다.'],
    ['수면 위 저고도 기동','수면 위 7 m까지 내려와 저고도 순항미사일을 모사합니다.'],
    ['MDI 사격 평가','유도탄이 스쳐 간 거리를 MDI로 재어 사격 결과를 평가합니다.']],
   specs:[['크기','2.25 × 1.95 × 0.53 m'],['최대이륙중량','80 kg'],['엔진','터보제트 450 N'],['최대 속도','마하 0.5'],['운용 고도','7 m ~ 7.6 km'],['임무장비','RCS · MDI · IR · EO/IR']],
   src:'항공우주사업본부 제품 브로슈어'},
  /* 7 */ {name:'소형 자폭무인기',rail:'소형 자폭무인기',en:'Loitering Munition · Small Level',alt:'소형 자폭무인기',
   mission:'<b>군집 비행</b>으로 표적을 찾아 정밀 타격합니다',
   feats:[
    ['영상 · 좌표 기반 종말유도','영상 또는 좌표로 표적까지 정밀 유도'],
    ['군집 비행','여러 대가 함께 날며 표적을 찾아 타격'],
    ['차량 발사','발사관에서 로켓 부스터로 발진']],
   phases:[
    ['발사','차량 발사대에서 발진합니다.'],
    ['군집 탐색','여러 대가 함께 날며 구역을 탐색합니다.'],
    ['영상 기반 식별','영상으로 기갑 표적을 식별하고 고정합니다.'],
    ['종말유도','영상 · 좌표 기반으로 표적까지 유도됩니다.'],
    ['자폭','표적을 정밀 타격해 무력화합니다.']],
   specs:[['크기','1.5 × 1.2 m'],['종말유도','영상 · 좌표'],['비행','군집 비행'],['형상','델타익']],
   src:'항공우주사업본부 제품 브로슈어 · ADD'},
  /* 8 */ {name:'함상이착륙형 중고도무인기',rail:'함상 중고도무인기',en:'Shipborne MUAV',alt:'함상이착륙형 중고도무인기 형상 개념',
   mission:'함정에서 뜨고 내리며 <b>바다를 감시</b>합니다',
   feats:[
    ['검증된 체계의 해상 확장','중고도무인기(MUAV) 기반 함상 운용형'],
    ['광폭 날개 단거리 이착륙','짧은 갑판에서 이륙하고 착함'],
    ['해상 광역 초계','해상 레이더로 함정 전력의 감시 범위 확장']],
   phases:[
    ['함상 단거리 이륙','짧은 갑판에서 넓은 날개로 이륙합니다.'],
    ['해상 광역 초계','해상 레이더로 넓은 해역을 감시합니다.'],
    ['선박 탐지·식별','접촉한 선박 가운데 미식별 선박을 가려냅니다.'],
    ['함상 회수','임무를 마치고 함정으로 돌아와 착함합니다.']],
   specs:[['기반','중고도무인기(MUAV)'],['형상','광폭 날개 · 단거리 이착륙'],['임무','해상 광역 초계']],
   src:'형상 개념도 · 제원 미정'},
  /* 9 */ {name:'Digital MRO 드론',rail:'Digital MRO',en:'Digital MRO · AI powered Aircraft MRO',alt:'Digital MRO 드론',
   mission:'드론과 로버가 군집으로 <b>항공기를 자동 검사</b>합니다',
   feats:[
    ['드론 · 로버 자율 군집','드론 최대 4대가 상부, 로버 최대 2대가 하부를 검사'],
    ['1 mm 결함 탐지','25 MP 카메라 · 클라우드 서버 실시간 AI 결함 분석'],
    ['임무 자율화','검사 경로 자동 생성, 충돌 방지 · 회피, 실내외 운용']],
   phases:[
    ['군집 출동','드론 4대가 떠오르고 로버 2대가 출발합니다.'],
    ['검사 경로 자동 생성','상부는 드론, 하부는 로버가 나눠 맡습니다.'],
    ['1 mm 정밀 스캔','25 MP 카메라로 1 mm 결함까지 찾아냅니다.'],
    ['동적 상황 대응','한 대가 빠지면 나머지가 구역을 이어받습니다.'],
    ['AI 결함 리포트','클라우드 AI 분석 결과와 결함 위치를 기록합니다.']],
   specs:[['드론 중량','4 kg'],['드론 운용','25분'],['로버 중량','55 kg'],['로버 운용','4시간'],['결함 탐지','1 mm']],
   src:'항공우주사업본부 제품 브로슈어'}
  ],
  sc:[
  /* 1 */ {vf:'EO/IR · SAR <em>광학·적외선·레이더</em>',dl:'LOS 가시선 통신',gcs:'지상통제장비',sc:'SATCOM 위성 통신'},
  /* 2 */ {site:'방공 레이더',feba:'전선',ac:'저피탐 침투',nl:'탐지 없음 <em>NO LOCK</em>',tg:'종심 표적'},
  /* 3 */ {f:'유인 전투기',roles:['기만 · 전자전','공격','호위','감시정찰'],g:'가짜 표적',th:'위협',x:'위협 차단'},
  /* 4 */ {ship:'함정 캐니스터',sat:'저궤도 위성',lk:'저궤도 위성링크',atr:'AI 목표물 자동인지 <em>ATR</em>',dv:'종말 급강하',kill:'표적 무력화',ac:'중형 자폭무인기'},
  /* 5 */ {strip:'야지 자동 이착륙',night:'야간 · 열영상',hot:'열원 탐지',cp:'지상통제장비',l:'표적 정보 전파',rel:'교대 투입 · 24시간 연속 임무'},
  /* 6 */ {mtb:'다목적훈련지원정 · 함상 발사대',ts:'훈련 대상 함정',lk:'통제링크 · 표적기 2대 동시 운용',f8:'팔자 기동',jk:'급기동',gun:'함포 사격 훈련',rcs:'RCS 증폭 <em>레이더 반사 신호</em>',ir:'IR 증폭 <em>적외선 신호</em>',
   rad:'레이더 탐지 · 추적',skim:'수면 위 저고도 · 7 m',msl:'유도탄 발사',mdi:'MDI 근접 거리 측정',rep:['MDI evaluation','유도탄 근접 거리 측정','표적기 2대 · 사격 결과 자동 기록']},
  /* 7 */ {la:'차량 발사대',sr:'탐색 구역',id:'영상 기반 표적 식별',dv:'영상 · 좌표 종말유도',kill:'표적 무력화',ac:'소형 자폭무인기',sw:'군집 비행'},
  /* 8 */ {cv:'함정',ac:'함상 중고도무인기',rad:'해상 레이더',un:'미식별 선박',rec:'함상 회수',boat:'선박'},
  /* 9 */ {dock:'드론 스테이션',zones:['전방 동체','좌측 날개','우측 날개','후방 동체'],dfc:'결함 후보 D-0',fail:'3번 드론 이탈',rov:'로버 2대 · 하부 검사',re:'남은 드론이 구역을 이어받음',
   rep:['Inspection report','결함 후보 4건','위치 · 영상 자동 기록']}
  ]},
 en:{cap:'By operating altitude',concept:'Concept',src:'Source',
  ch:[
  /* 1 */ {name:'Medium-Altitude UAV',rail:'MUAV',en:'MUAV · Strategic-grade ISR',alt:'Medium-Altitude UAV (MUAV)',
   mission:'Delivers <b>wide-area surveillance from medium altitude</b> with EO/IR and SAR',
   feats:[
    ['2–4 air vehicles per system','EO/IR- and SAR-equipped air vehicles with fixed and mobile ground control stations'],
    ['LOS and SATCOM data links','Line-of-sight and satellite links extend command and control to long range'],
    ['Persistent wide-area surveillance','ISR, communications relay and electronic warfare, plus maritime, border and disaster monitoring']],
   phases:[
    ['Orbit entry','Establishes an orbit over the area of operations.'],
    ['EO/IR · SAR wide-area search','Sweeps a broad area with day/night imagery and synthetic aperture radar.'],
    ['Target identification & tracking','Identifies moving targets and tracks them automatically.'],
    ['LOS · SATCOM downlink','Streams imagery to the ground control station over line-of-sight and satellite links.']],
   specs:[['Dimensions','13 × 25 × 4 m'],['Engine','1,200 hp'],['Payload','EO/IR · SAR'],['Data link','LOS · SATCOM'],['Air vehicles','2–4 per system']],
   src:'Korean Air Aerospace product brochure'},
  /* 2 */ {name:'Stealth UAV',rail:'Multi-role Stealth',en:'Multi-role · Low-observable flying wing',alt:'Multi-role Stealth UAV',
   mission:'<b>Evades air defense radars</b> to penetrate undetected',
   feats:[
    ['Low-observable flying-wing design','A tailless flying wing minimizes radar signature'],
    ['Operates without ground control','Autonomous mission execution on an unmanned combat aircraft operating system'],
    ['In-house technology','A next-generation unmanned combat aircraft developed with Korean Air Aerospace technology']],
   phases:[
    ['Air defense mapping','Maps radar coverage to plan the ingress route.'],
    ['Penetration through radar gaps','Threads the gaps between radar coverage zones.'],
    ['Detection avoidance','A low radar cross-section denies the enemy a track.'],
    ['Deep target reached','Reaches the target deep behind the air defense network.']],
   specs:[['Configuration','Flying wing · tailless'],['Signature','Low observable (stealth)'],['Mission','Penetrating ISR · strike']],
   src:'Specifications not disclosed'},
  /* 3 */ {name:'Unmanned Wingman',rail:'LOWUS',en:'LOWUS · Low Observable Unmanned Wingman System',alt:'Low-Observable Unmanned Wingman (LOWUS)',
   mission:'Flies in a <b>manned-unmanned teaming formation</b> with crewed fighters',
   feats:[
    ['MUM-T platform','A stealthy unmanned aircraft built for manned-unmanned teaming'],
    ['Low-observable technologies','Radar-absorbing structures (RAS), low-probability-of-intercept data links and more'],
    ['Autonomous formation missions','High-agility flight control for large UAVs and manned-unmanned formation flight']],
   phases:[
    ['MUM-T formation','LOWUS wingmen form up with a crewed fighter.'],
    ['Deception · EW','Decoy signals and jamming deceive enemy radars.'],
    ['Strike','Hits a ground target — one of its air-to-ground, air-to-air and anti-ship roles.'],
    ['Escort','Protects the crewed fighter from incoming threats.'],
    ['ISR','Scouts the airspace ahead of the formation with AESA radar and EO/IR.']],
   specs:[['Dimensions','10.4 × 9.4 × 2.8 m'],['MTOW','5,700 kg'],['Engine','Turbofan'],['Sensors','AESA · EO/IR, etc.']],
   src:'Korean Air Aerospace product brochure · ADD'},
  /* 4 */ {name:'Loitering Munition',rail:'Medium LM',en:'Medium class · LEO satellite-linked',alt:'Medium Loitering Munition',
   mission:'Hunts down <b>targets far out at sea</b> over a LEO satellite link, then strikes',
   feats:[
    ['LEO satellite link','Beyond-line-of-sight operations anywhere within satellite coverage'],
    ['AI automatic target recognition','AI-based automatic target recognition (ATR)'],
    ['Selectable warheads','Warhead options tailored to the mission']],
   phases:[
    ['Shipboard canister launch','Rocket-boosted launch from a deck-mounted canister.'],
    ['LEO SATCOM cruise','Stays under control anywhere within satellite coverage.'],
    ['Loiter · AI target recognition','Loiters over the target area while AI recognizes targets automatically.'],
    ['Terminal dive','Dives onto the recognized target.'],
    ['Terminal strike','The warhead neutralizes the target.']],
   specs:[['Dimensions','2.4 × 2.9 m'],['Data link','LEO satellite link'],['Target recognition','AI ATR'],['Warhead','Optional']],
   src:'Korean Air Aerospace product brochure · ADD'},
  /* 5 */ {name:'Division-Level UAV',rail:'KUS-FT',en:'KUS-FT · Fixed-Wing Tactical UAS',alt:'Division-Level UAV (KUS-FT)',
   mission:'Provides <b>ISR and target acquisition</b> for the ROK Army and Marine Corps',
   feats:[
    ['Korea’s first UAV type certificate','The first unmanned aircraft in Korea to earn type certification'],
    ['Multi-vehicle control · 24/7 operations','Two to four air vehicles rotate to keep surveillance unbroken'],
    ['Automatic takeoff and landing, day or night','Steep-approach and short-field landings on unprepared ground, with emergency parachute recovery']],
   phases:[
    ['Automatic takeoff, unprepared field','Takes off automatically even without a runway.'],
    ['Tactical reconnaissance in mountains','Flies low along valleys to reconnoiter.'],
    ['Night surveillance','Detects heat signatures at night.'],
    ['Target acquisition · dissemination','Relays acquired target data to the ground control station.'],
    ['Relief on station · 24/7 coverage','Air vehicles rotate so surveillance never lapses.']],
   specs:[['Dimensions','3.7 × 4.5 × 0.9 m'],['MTOW','150 kg'],['Engine','35 hp rotary'],['Max / cruise speed','200 / 130 km/h']],
   src:'Korean Air Aerospace product brochure'},
  /* 6 */ {name:'Subsonic Target Drone',rail:'Target Drone',en:'KUS-100UAT · Subsonic aerial target',alt:'Subsonic Target Drone (KUS-100UAT)',
   mission:'Serves as the <b>target for guided-weapon tests</b>, simulating real threats',
   feats:[
    ['Ship launch · two at once','Launched from a shipboard launcher, with two drones controlled together'],
    ['Realistic threat maneuvers','Sea-skimming, high-g jinking and figure-eights under AI autonomous flight'],
    ['RCS · IR augmentation · MDI scoring','Boosts signatures and scores each shot by measured miss distance']],
   phases:[
    ['Shipboard launch','Two drones are launched in turn from the training support boat’s launcher.'],
    ['Figure-eights · high-g jinking','Figure-eights and abrupt maneuvers mimic hostile aircraft.'],
    ['RCS · IR augmentation','Radar and infrared signatures are boosted so the drones read as real threats.'],
    ['Sea skimming','Drops to 7 m above the waves to mimic a low-level cruise missile.'],
    ['MDI scoring','A miss-distance indicator measures how close the missile passed.']],
   specs:[['Dimensions','2.25 × 1.95 × 0.53 m'],['MTOW','80 kg'],['Engine','Turbojet, 450 N'],['Max speed','Mach 0.5'],['Altitude','7 m – 7.6 km'],['Payloads','RCS · MDI · IR · EO/IR']],
   src:'Korean Air Aerospace product brochure'},
  /* 7 */ {name:'Loitering Munition',rail:'Small LM',en:'Small class · Swarming',alt:'Small Loitering Munition',
   mission:'Finds and precisely strikes targets as a <b>swarm</b>',
   feats:[
    ['Image- and coordinate-based terminal guidance','Precision guidance to the target by imagery or coordinates'],
    ['Swarming','Several munitions fly together to find and strike targets'],
    ['Vehicle-launched','Rocket-boosted launch from a vehicle-mounted tube']],
   phases:[
    ['Launch','Launches from a vehicle-mounted launcher.'],
    ['Swarm search','Several munitions search the area together.'],
    ['Image-based identification','Identifies and locks onto an armored target using imagery.'],
    ['Terminal guidance','Guided onto the target by imagery and coordinates.'],
    ['Strike','Neutralizes the target with a precision strike.']],
   specs:[['Dimensions','1.5 × 1.2 m'],['Terminal guidance','Imagery · coordinates'],['Flight','Swarming'],['Configuration','Delta wing']],
   src:'Korean Air Aerospace product brochure · ADD'},
  /* 8 */ {name:'Shipborne MUAV',rail:'Shipborne MUAV',en:'Ship-based STOL variant',alt:'Shipborne MUAV concept configuration',
   mission:'Operates from ships to <b>keep watch over the sea</b>',
   feats:[
    ['A proven system, extended to sea','Ship-based variant of the MUAV'],
    ['Wide-span wing for short takeoff and landing','Launches from and recovers to a short deck'],
    ['Maritime wide-area patrol','Extends the fleet’s surveillance reach with maritime radar']],
   phases:[
    ['Short deck takeoff','Lifts off a short deck on its wide-span wing.'],
    ['Maritime wide-area patrol','Covers a broad sea area with maritime radar.'],
    ['Vessel detection & identification','Singles out unidentified vessels among surface contacts.'],
    ['Shipboard recovery','Returns to the ship and lands on deck after the mission.']],
   specs:[['Baseline','MUAV'],['Configuration','Wide-span wing · STOL'],['Mission','Maritime wide-area patrol']],
   src:'Concept configuration · specifications TBD'},
  /* 9 */ {name:'Digital MRO Drones',rail:'Digital MRO',en:'AI-powered aircraft inspection',alt:'Digital MRO drone',
   mission:'Drones and rovers work as a swarm to <b>inspect aircraft automatically</b>',
   feats:[
    ['Autonomous drone-rover swarm','Up to four drones inspect the upper surfaces and up to two rovers the underside'],
    ['1 mm defect detection','25 MP cameras with real-time AI defect analysis on cloud servers'],
    ['Autonomous missions','Automatic inspection path planning, collision avoidance, indoor and outdoor operation']],
   phases:[
    ['Swarm deployment','Four drones lift off and two rovers roll out.'],
    ['Automatic inspection path planning','Drones take the upper surfaces; rovers take the underside.'],
    ['1 mm precision scan','25 MP cameras find defects as small as 1 mm.'],
    ['Dynamic re-tasking','If one drone drops out, the others take over its zone.'],
    ['AI defect report','Logs cloud-based AI analysis results and defect locations.']],
   specs:[['Drone weight','4 kg'],['Drone endurance','25 min'],['Rover weight','55 kg'],['Rover endurance','4 hr'],['Defect detection','1 mm']],
   src:'Korean Air Aerospace product brochure'}
  ],
  sc:[
  /* 1 */ {vf:'EO/IR · SAR <em>electro-optical · infrared · radar</em>',dl:'LOS data link',gcs:'Ground control station',sc:'SATCOM link'},
  /* 2 */ {site:'Air defense radar',feba:'Front line',ac:'Low-observable ingress',nl:'Undetected <em>NO LOCK</em>',tg:'Deep target'},
  /* 3 */ {f:'Crewed fighter',roles:['Deception · EW','Strike','Escort','ISR'],g:'Decoy',th:'Threat',x:'Threat neutralized'},
  /* 4 */ {ship:'Shipboard canister',sat:'LEO satellite',lk:'LEO SATCOM link',atr:'AI target recognition <em>ATR</em>',dv:'Terminal dive',kill:'Target neutralized',
   ac:'Medium loitering munition'},
  /* 5 */ {strip:'Auto takeoff · unprepared field',night:'Night · thermal imaging',hot:'Heat signatures',cp:'Ground control station',l:'Target data relay',
   rel:'Relief on station · 24/7 coverage'},
  /* 6 */ {mtb:'Training support boat · launcher',ts:'Ship under training',lk:'Control link · two targets at once',f8:'Figure-eight',jk:'High-g jinking',
   gun:'Naval gunnery training',rcs:'RCS augmentation <em>radar return</em>',ir:'IR augmentation <em>infrared signature</em>',rad:'Radar detection · tracking',
   skim:'Sea skimming · 7 m',msl:'Missile launch',mdi:'MDI miss-distance scoring',
   rep:['MDI evaluation','Missile miss distance measured','Two targets · results logged automatically']},
  /* 7 */ {la:'Vehicle launcher',sr:'Search area',id:'Image-based target ID',dv:'Image/coordinate terminal guidance',kill:'Target neutralized',ac:'Small loitering munition',
   sw:'Swarm flight'},
  /* 8 */ {cv:'Ship',ac:'Shipborne MUAV',rad:'Maritime radar',un:'Unidentified vessel',rec:'Shipboard recovery',boat:'Vessel'},
  /* 9 */ {dock:'Drone station',zones:['Forward fuselage','Left wing','Right wing','Aft fuselage'],dfc:'Defect candidate D-0',fail:'Drone 3 drops out',
   rov:'2 rovers · underside inspection',re:'Remaining drone takes over the zone',rep:['Inspection report','4 defects flagged','Location &amp; imagery logged']}
  ]}
};
})();
