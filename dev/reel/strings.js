/* 쇼릴 — 화면 글(국문 · 영문). 사이트에 있는 사실만(출처: _out/reel/plan/storyboard.md Strings). 장면은 env.S['키']로 읽음
   국문 미래 기술 문구는 美 · 佛 한자를 뺌(한진그룹체에 글리프 없음). 날짜가 붙은 값은 사이트가 바뀌면 다시 렌더 */
export const S={
  ko:{
   "tag.label": "Since 1977",
   "tag.l1": "세계 유일의",
   "tag.l2": "항공기를 제작하는 항공사",
   "tag.lead": "항공기체 · 무인기 · MRO/U · 미래 기술",
   "hud.hdg": "HDG",
   "aero.label": "Aerostructures",
   "aero.h": "항공기체",
   "aero.codevK": "국제공동개발",
   "aero.codevT": "보잉 787 · 에어버스 A350 개발 참여",
   "t787.name": "787 드림라이너",
   "t787.since": "2005 ~",
   "c787.1": "레이키드 윙팁",
   "c787.2": "플랩 서포트 페어링",
   "c787.3": "주 랜딩기어 수용부 후방 격벽",
   "c787.4": "후방동체",
   "fleet": [
    "787",
    "737 MAX",
    "A320",
    "A330",
    "A350",
    "AH-6"
   ],
   "t737.name": "737 MAX",
   "t737.since": "2014 ~",
   "t737.part": "어드밴스드 테크놀로지 윙렛",
   "a320.since": "2010 ~",
   "a320.num": "5,000",
   "a320.kicker": "A320 계열",
   "a320.note": "샤크렛 단독 공급 · 누적 5,000대 납품",
   "a320.m": [
    "2014",
    "2020",
    "2026"
   ],
   "a330.name": "A330 · A330neo",
   "a330.since": "2015 ~",
   "a330.part": "샤크렛(A330neo)",
   "a350.name": "A350",
   "a350.since": "2008 ~",
   "a350.part": "전방 카고 도어 · 후방 카고 도어 · 벌크 카고 도어",
   "a350.note": "국제공동개발 참여",
   "ah6.name": "AH-6 헬기",
   "ah6.since": "2021 ~",
   "ah6.part": "동체 · 태국 육군용 8대분",
   "uav.label": "Unmanned Systems",
   "uav.h": "무인기",
   "uav.num": "9",
   "uav.count": "무인기 체계 9종",
   "uav.order": "무인기 체계 운용고도 순",
   "uav.factA": [
    "2014",
    "사단무인기, 국내 최초 무인기 형식인증"
   ],
   "uav.factB": [
    "2026",
    "중고도 정찰용 무인항공기(MUAV) 1호기 출고"
   ],
   "uav.code": [
    "MUAV",
    "Stealth",
    "LOWUS",
    "Medium LM",
    "KUS-FT",
    "Target",
    "Small LM",
    "Shipborne",
    "Digital MRO"
   ],
   "uav.name": [
    "중고도무인기",
    "다목적 스텔스기",
    "저피탐 무인편대기",
    "중형 자폭무인기",
    "사단무인기",
    "아음속 무인표적기",
    "소형 자폭무인기",
    "함상 중고도무인기",
    "Digital MRO 드론"
   ],
   "uav.chip": "형상 개념",
   "mro.label": "MRO & Upgrade",
   "mro.h": "MRO/U",
   "mro.num": "5,500",
   "mro.unit": "대 이상",
   "mro.subA": "창정비 · 성능개량 누적",
   "mro.subB": "50여 년 · 2026.09 기준",
   "mro.busan": "부산 테크센터",
   "mro.busanTag": "아태 최대 군용기 정비기지",
   "mro.base": [
    "한국",
    "일본 본토",
    "오키나와",
    "미사와",
    "하와이",
    "알래스카"
   ],
   "mro.roster": "F-16 · F-4 팬텀 · A-10 · H-53 · F-15 · KC-330 · RC-12 · CH-47 · Lynx · 500MD · P-3C · Falcon 2000S · UH-60 · C-130 · CH-46",
   "beyond": "아시아 · 태평양을 넘어",
   "fut.label": "Future",
   "fut.h": [
    "미래 기술"
   ],
   "fut.r1": [
    "2026.08",
    "UAM · AAM",
    "Archer와 군용 AAM 협력"
   ],
   "fut.r2": [
    "2026.04",
    "Space",
    "엑소트레일과 궤도수송선(OTV) 협력"
   ],
   "fut.r3": [
    "2026.06",
    "Physical AI",
    "AI 기반 미래 항공정비 기술 공개"
   ],
   "fut.mm": [
    "1 mm",
    "결함 탐지"
   ],
   "fut.caveat": "임무 연출은 개념 표현",
   "vis.label": "본부 비전",
   "vis.l1": "Excellence",
   "vis.l2": "In Performance",
   "vis.p1": [
    "Quality",
    "Quality First",
    "무결함 품질"
   ],
   "vis.p2": [
    "Technology",
    "미래 성장동력 확보",
    "핵심기술 특화"
   ],
   "vis.p3": [
    "Innovative",
    "조직문화 혁신",
    "생산성 혁신"
   ],
   "tal.matte": [
    "Engineer &",
    "Mechanic"
   ],
   "tal.label": "인재채용",
   "tal.h": "끊임없는 혁신과 도전",
   "tal.sub": "전문 관리자 및 Engineer & Mechanic을 양성합니다",
   "tal.fn": [
    [
     "Management",
     "관리 부문"
    ],
    [
     "Engineering",
     "기술 부문"
    ],
    [
     "Quality",
     "품질 부문"
    ],
    [
     "R&D",
     "연구 부문"
    ]
   ],
   "end.label": "항공우주사업분야 국내 최대 규모",
   "end.s1": [
    "설립 연도",
    "",
    "1977",
    "년"
   ],
   "end.s2": [
    "시설 면적",
    "약 ",
    "86",
    "만㎡"
   ],
   "end.s3": [
    "임직원 수",
    "약 ",
    "1,800",
    "명"
   ],
   "end.s4": [
    "매출액",
    "총 ",
    "7,796",
    "억원"
   ],
   "end.foot": "2025.12.31 기준 · 매출액은 별도 재무제표 기준"
  },
  en:{
   "tag.label": "Since 1977",
   "tag.l1": "The world’s only airline",
   "tag.l2": "that builds aircraft",
   "tag.lead": "Aerostructures · Unmanned Systems · MRO/U · Future Technologies",
   "hud.hdg": "HDG",
   "aero.label": "Boeing · Airbus programs",
   "aero.h": "Aerostructures",
   "aero.codevK": "Risk-sharing partner",
   "aero.codevT": "Boeing 787 and Airbus A350 co-development",
   "t787.name": "787 Dreamliner",
   "t787.since": "Since 2005",
   "c787.1": "Raked wingtips",
   "c787.2": "Flap support fairings",
   "c787.3": "Aft wheel well bulkhead",
   "c787.4": "Aft body",
   "fleet": [
    "787",
    "737 MAX",
    "A320",
    "A330",
    "A350",
    "AH-6"
   ],
   "t737.name": "737 MAX",
   "t737.since": "Since 2014",
   "t737.part": "Advanced Technology winglets",
   "a320.since": "Since 2010",
   "a320.num": "5,000",
   "a320.kicker": "A320 Family",
   "a320.note": "Sole Sharklet supplier · 5,000 delivered",
   "a320.m": [
    "2014",
    "2020",
    "2026"
   ],
   "a330.name": "A330 · A330neo",
   "a330.since": "Since 2015",
   "a330.part": "Sharklets (A330neo)",
   "a350.name": "A350",
   "a350.since": "Since 2008",
   "a350.part": "Forward cargo door · Aft cargo door · Bulk cargo door",
   "a350.note": "Risk-sharing partner",
   "ah6.name": "AH-6 helicopter",
   "ah6.since": "Since 2021",
   "ah6.part": "Fuselage · 8 for the Royal Thai Army",
   "uav.label": "ISR · Strike · MUM-T",
   "uav.h": "Unmanned Systems",
   "uav.num": "9",
   "uav.count": "Nine unmanned systems",
   "uav.order": "By operating altitude",
   "uav.factA": [
    "2014",
    "KUS-FT earns Korea’s first UAV type certificate"
   ],
   "uav.factB": [
    "2026",
    "First production MUAV rolled out"
   ],
   "uav.code": [
    "MUAV",
    "Stealth",
    "LOWUS",
    "Medium LM",
    "KUS-FT",
    "Target",
    "Small LM",
    "Shipborne",
    "Digital MRO"
   ],
   "uav.name": [
    "Medium-Altitude UAV",
    "Stealth UAV",
    "Unmanned Wingman",
    "Loitering Munition",
    "Division-Level UAV",
    "Target Drone",
    "Loitering Munition",
    "Shipborne MUAV",
    "Inspection Drones"
   ],
   "uav.chip": "Concept",
   "mro.label": "Depot maintenance · Upgrade",
   "mro.h": "MRO & Upgrade",
   "mro.num": "5,500+",
   "mro.unit": "aircraft",
   "mro.subA": "Depot maintenance & upgrades",
   "mro.subB": "50+ years · as of Sep 2026",
   "mro.busan": "Busan Tech Center",
   "mro.busanTag": "APAC largest military aircraft depot",
   "mro.base": [
    "Korea",
    "Mainland Japan",
    "Okinawa",
    "Misawa",
    "Hawaii",
    "Alaska"
   ],
   "mro.roster": "F-16 · F-4 Phantom · A-10 · H-53 · F-15 · KC-330 · RC-12 · CH-47 · Lynx · 500MD · P-3C · Falcon 2000S · UH-60 · C-130 · CH-46",
   "beyond": "Beyond the Asia-Pacific",
   "fut.label": "Future",
   "fut.h": [
    "Next-Generation",
    "Technologies"
   ],
   "fut.r1": [
    "Aug 2026",
    "UAM · AAM",
    "Military AAM cooperation with Archer (U.S.)"
   ],
   "fut.r2": [
    "Apr 2026",
    "Space",
    "OTV partnership with Exotrail (France)"
   ],
   "fut.r3": [
    "Jun 2026",
    "Physical AI",
    "AI-based aircraft maintenance technology unveiled"
   ],
   "fut.mm": [
    "1 mm",
    "defect detection"
   ],
   "fut.caveat": "Mission sequences are conceptual",
   "vis.label": "Division vision",
   "vis.l1": "Excellence",
   "vis.l2": "In Performance",
   "vis.p1": [
    "Quality",
    "Quality first",
    "Zero-defect quality"
   ],
   "vis.p2": [
    "Technology",
    "Securing future growth engines",
    "Specializing in core technologies"
   ],
   "vis.p3": [
    "Innovative",
    "Innovating our organizational culture",
    "Innovating productivity"
   ],
   "tal.matte": [
    "engineers and",
    "mechanics"
   ],
   "tal.label": "Careers",
   "tal.h": "Relentless innovation and challenge",
   "tal.sub": "We develop specialist managers, engineers and mechanics",
   "tal.fn": [
    [
     "Management"
    ],
    [
     "Engineering"
    ],
    [
     "Quality"
    ],
    [
     "Research & Development"
    ]
   ],
   "end.label": "Korea’s largest aerospace business",
   "end.s1": [
    "Founded",
    "",
    "1977",
    ""
   ],
   "end.s2": [
    "Facility area (approx.)",
    "",
    "860,000",
    " m²"
   ],
   "end.s3": [
    "Employees (approx.)",
    "",
    "1,800",
    ""
   ],
   "end.s4": [
    "Revenue",
    "KRW ",
    "779.6",
    "bn"
   ],
   "end.foot": "As of Dec 31, 2025 · Revenue based on separate financial statements"
  }
};
