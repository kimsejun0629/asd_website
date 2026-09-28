# 작은 범위로 읽고 검증하기

구조 정리는 한 번의 읽기 비용을 낮춘다. 여러 파일·도구 출력·이전 대화를 합친 입력 토큰까지 파일 크기만으로 보장할 수는 없다. 모델의 입력 제한과 계정 사용량 제한도 별개다.

## 읽기 · 수정 순서

1. `CLAUDE.md`의 지도에서 대상 쪽과 관련 문서 하나를 고른다. 전수 `cat`이나 보관 폴더 재검색부터 하지 않는다.
2. `rg -n '심볼' web/js/파일.js`처럼 경로와 심볼을 먼저 좁힌 뒤 필요한 줄 범위만 읽는다. 긴 출력은 파일에 저장하고 개수·판정·실패 위치만 확인한다.
3. 공용 변경은 KA 소비처/양 언어 페이지를 함께 확인한다. 다른 기능을 같은 변경에 섞지 않는다.
4. 문서의 같은 설명을 여러 곳에 복제하지 않는다. 디자인은 design-system.md, 동작은 motion.md, 게시 계약은 publish.md에 둔다.
5. 큰 검사는 결과·다음 단계·미해결 항목·기준 파일 해시를 `_verification/refactor/`에 기록한다. 재개할 때 결과를 먼저 읽고, 수정이나 새 실패가 없는 검사는 반복하지 않는다.

`.ignore`는 보관본·검증 출력·원본 자료·옛 도구를 기본 검색에서 제외한다. 명시적인 경로 읽기에는 적용되지 않는다. 생성 파일은 해당 생성기를 먼저 읽으며 SVG 경로/글꼴 범위 전체를 대화에 붙이지 않는다. 코드 ≤35,000 B·≤900줄·한 줄 ≤1,000자는 **읽기 범위 지침**이며 토큰 수와 같은 단위가 아니다.

## 빠른 검사(루트, 서버 불필요)

```sh
python3 tools/verify/check.py
python3 tools/data/fmtjson.py --check
python3 tools/verify/fontset.py
python3 tools/fonts/mkfonts.py --check
```

- `check.py`: CLAUDE.md 6.5 KB·AGENTS.md 2 KB·docs 문서 8 KiB 한도와 web의 HTML/CSS/JS/JSON/SVG 크기·긴 줄, HTML/CSS/모듈의 로컬 정적 참조, JS 18개 구문, 릴리스 URL. 동적 문자열 참조나 모든 런타임 동작을 증명하지는 않는다.
- JSON은 레코드별 줄바꿈이면 35 KB 파일 한도의 예외다. 생성 SVG/CSS의 긴 줄은 예외가 아니다.
- `fmtjson.py`: 무인자는 정리해서 쓰기, `--check`는 읽기만, 다른 인자는 exit 2.
- `mkfonts.py --check`의 exit 3은 안 쓰는 site 음절만 남았다는 뜻이다. 현재 ‘촬’ 1개이며 누락은 없다. 이를 없애려고 글꼴 바이너리를 다시 만들 필요는 없다.
- Node.js가 없으면 구문 검사를 생략해 PASS로 보고하지 않고 실패한다. 별도 번들 빌드나 npm 설치는 필요 없다.

## 릴리스와 비교

- `tools/verify/release.py`의 `RELEASE`는 현재 `refactor-d1`. 공용 API/스타일을 다시 게시할 때 식별자를 올린 뒤 `python3 tools/verify/release.py --write`로 HTML·preload·모듈 import URL을 함께 갱신한다. 기본 실행은 검사만 한다.
- 주소에 붙인 버전은 파일명이 아니다. 로컬 파일 참조 검사는 쿼리/조각을 떼고 존재 여부를 확인한다. 호스트가 쿼리를 유지하는지는 실제 게시 전후 별도 확인한다.
- 정적 검사 뒤 변경 범위에 맞는 동작 검사를 실행한다. 최종 화면 비교는 `docs/verify.md`를 따른다. 시각 차이를 숨기기 위해 noise 규칙을 넓히지 않는다.
- 게시 목록은 v60/현재 web 전체 해시 차이로 재생성한다(`python3 tools/verify/manifest.py --output _verification/refactor/stage-d/publish-manifest.json`). 라이브가 v60 이후 바뀌었으면 그 버전과 먼저 동기화한다.
- 현재 폴더에는 Git 이력이 없다. 수정 전 사본과 해시를 남기고, 의도한 소스 변경과 검증용 출력을 구분한다.

이번 리팩터 결과: `_verification/refactor/stage-d/fix.md`(F1~F11), `reverify.md`(최종 검증), `publish-manifest.json`(파일 해시). 다음 작업은 이 결과를 먼저 읽는다.
