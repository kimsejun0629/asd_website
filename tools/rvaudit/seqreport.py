"""seqaudit.py 결과 분석: python3 seqreport.py out.json"""
import json,sys
R=json.load(open(sys.argv[1]))
tot={'stuck':0,'offscreen':0,'late':0,'order':0,'nested':0,'untagged':0}
for v,r in R.items():
  H=r['H'];E=r['els'];iss=[]
  st=lambda e:e['tin']+e['d']*1000
  for e in E:
    if e['tin'] is None:iss.append(('stuck','끝까지 안 나타남',e['p']));continue
    if e['topIn']>H+10:iss.append(('offscreen',f"화면 아래 {e['topIn']-H}px에서 미리 재생",e['p']))
    if e['enter'] and st(e)-e['enter']>1700:iss.append(('late',f"화면에 들어온 뒤 {(st(e)-e['enter'])/1000:.1f}s 뒤 시작",e['p']))
  # 위에 있는(또는 같은 줄) 앞선 요소가 아래 요소보다 늦게 시작
  S=[e for e in E if e['tin'] is not None]
  seen=set()
  for a_i,a in enumerate(S):
    for b in S[a_i+1:]:
      if b['docTop']>=a['docTop']-4 and st(a)>st(b)+120 and abs(a['tin']-b['tin'])<4000:
        k=(a['p'][:40]);
        if k in seen:continue
        seen.add(k);iss.append(('order',f"아래 요소보다 {(st(a)-st(b))/1000:.2f}s 늦음 ← {b['p']}",a['p']))
  for n in r['nested']:iss.append(('nested','효과 겹침',n))
  for u in r['untagged']:iss.append(('untagged','효과 없음',u))
  print(f"\n===== {v}  (효과 {len(E)}개){'  errors:'+str(r['errs']) if r['errs'] else ''}")
  for k in ['stuck','offscreen','late','order','nested','untagged']:
    L=[x for x in iss if x[0]==k];tot[k]+=len(L)
    for x in L[:12]:print(f"  [{k}] {x[2]}  — {x[1]}")
    if len(L)>12:print(f"  [{k}] … 외 {len(L)-12}건")
print('\n합계',tot)
