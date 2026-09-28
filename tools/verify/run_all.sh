#!/bin/bash
# 기준(pre-refactor v60) ↔ 후보(web/) 한 번에 비교: cstyle(PC · 폰) + pixdiff(PC · 폰), 탭 화면 포함.
#   tools/verify/run_all.sh [label]
# 환경 변수: A · B(주소) · OVA · OVB(빠진 파일 보충 폴더) · TABS(--tabs 또는 빈 값) · WORKERS · VPS("pc phone")
# 결과: _verification/refactor/runs/<label>/ (summary.txt · compare-*.txt · pixdiff-*.txt · pix-*/ 차이 이미지)
# 서버: 프로젝트 루트에서 python3 -m http.server 8768 --bind ::1
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
LABEL="${1:-$(date +%Y%m%d-%H%M%S)}"
A="${A:-http://[::1]:8768/_archive/pre-refactor-v60/}"
B="${B:-http://[::1]:8768/web/}"
OVA="${OVA-}"   # 기준에 빠진 파일을 채울 폴더(예: _verification/refactor/baseline-overlay — 아카이브에 img/video가 없던 때 쓰던 것)
OVB="${OVB-}"
TABS="${TABS---tabs}"
W="${WORKERS:-7}"
VPS="${VPS:-pc phone}"
OUT="$ROOT/_verification/refactor/runs/$LABEL"
mkdir -p "$OUT"
cd "$HERE"

for u in "$A" "$B"; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "${u}index.html")
  [ "$code" = 200 ] || { echo "서버 응답 없음: ${u}index.html ($code) — 루트에서 python3 -m http.server 8768 --bind ::1 를 띄우세요"; exit 2; }
done
ova=(); [ -n "$OVA" ] && ova=(--overlay "$OVA")
ovb=(); [ -n "$OVB" ] && ovb=(--overlay "$OVB")
pova=(); [ -n "$OVA" ] && pova=(--overlay-a "$OVA")
povb=(); [ -n "$OVB" ] && povb=(--overlay-b "$OVB")

T0=$(date +%s); fail=0
: > "$OUT/times.txt"
lap() { echo "$1 $(( $(date +%s) - $2 ))s" | tee -a "$OUT/times.txt"; }
for vp in $VPS; do
  t=$(date +%s)
  # 기준 · 후보 덤프를 동시에(각각 브라우저 W개)
  python3 cstyle.py "$A" "$OUT/cstyle-$vp-a.json.gz" --vp "$vp" $TABS --workers "$W" ${ova[@]+"${ova[@]}"} 2> "$OUT/cstyle-$vp-a.log" &
  pa=$!
  python3 cstyle.py "$B" "$OUT/cstyle-$vp-b.json.gz" --vp "$vp" $TABS --workers "$W" ${ovb[@]+"${ovb[@]}"} 2> "$OUT/cstyle-$vp-b.log" &
  pb=$!
  wait $pa || fail=1; wait $pb || fail=1
  if [ -f "$OUT/cstyle-$vp-a.json.gz" ] && [ -f "$OUT/cstyle-$vp-b.json.gz" ]; then
    python3 compare.py "$OUT/cstyle-$vp-a.json.gz" "$OUT/cstyle-$vp-b.json.gz" --json "$OUT/compare-$vp.json" --noise-stats > "$OUT/compare-$vp.txt" || fail=1
  else
    echo "── cstyle 실패: $OUT/cstyle-$vp-*.log 확인" > "$OUT/compare-$vp.txt"; fail=1
  fi
  lap "cstyle+compare $vp" $t
  t=$(date +%s)
  python3 pixdiff.py "$A" "$B" "$OUT/pix-$vp" --vp "$vp" $TABS --workers "$W" ${pova[@]+"${pova[@]}"} ${povb[@]+"${povb[@]}"} > "$OUT/pixdiff-$vp.txt" 2> "$OUT/pixdiff-$vp.log" || fail=1
  lap "pixdiff $vp" $t
done
lap total $T0

{
  echo "run $LABEL  A=$A  B=$B  tabs=${TABS:-no}  $(date '+%F %T')"
  for vp in $VPS; do
    echo "[$vp] cstyle: $(grep '^──' "$OUT/compare-$vp.txt")"
    echo "[$vp] pixdiff: $(grep '^pixdiff' "$OUT/pixdiff-$vp.txt" || echo "실패 — $OUT/pixdiff-$vp.log 확인")"
  done
  echo "times:"; sed 's/^/  /' "$OUT/times.txt"
} > "$OUT/summary.txt"
cat "$OUT/summary.txt"
[ $fail = 0 ] || echo "차이 있음 → $OUT/compare-*.txt · pixdiff-*.txt · pix-*/"
exit $fail
