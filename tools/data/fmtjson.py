# web/data의 JSON을 레코드 한 줄씩으로 정리(값 · 배열 순서 · 키 순서 그대로, 공백만 바뀜) — 한 줄이 짧아 읽기 · 비교가 쉬움
#  media.json은 압축 구분자(',' ':'), history.json은 기본 구분자(', ' ': ')를 그대로 둔다. 몇 번 돌려도 같은 결과(멱등)
#  확인: 파싱 결과(키 순서 포함)가 같고, mkfonts가 세는 한글 음절이 같아야 쓴다. 게시 전에 돌린다(다른 세션이 압축본을 올려도 다시 맞춤)
#  사용: python3 tools/data/fmtjson.py [--check]   (--check: 고치지 않고, 정리 안 된 파일이 있으면 1)
import json,os,sys
ROOT=os.path.normpath(os.path.join(os.path.dirname(__file__),'../..'))
sys.path.insert(0,f'{ROOT}/tools/fonts');from mkfonts import syl   # 글꼴 조각과 같은 음절 규칙(주석 제외) · 가져오기만 하므로 fontTools 없이 돎
FILES={'web/data/media.json':(',',':'),'web/data/history.json':(', ',': ')}
def fmt(d,sep):   # 맨 위가 배열이면 원소마다, 객체면 배열 값의 원소마다 한 줄
    j=lambda v:json.dumps(v,ensure_ascii=False,separators=sep)
    rows=lambda a:'[\n'+',\n'.join(map(j,a))+'\n]' if a else '[]'
    if isinstance(d,list):return rows(d)+'\n'
    return '{'+',\n'.join(j(k)+sep[1]+(rows(v) if isinstance(v,list) else j(v)) for k,v in d.items())+'}\n'
P=lambda t:json.loads(t,object_pairs_hook=lambda kv:('{}',kv))   # 객체를 (키, 값) 목록으로 → 키 순서까지 비교
def main(check):
    bad=0
    for rel,sep in FILES.items():
        p=f'{ROOT}/{rel}';old=open(p,encoding='utf8').read();new=fmt(json.loads(old),sep)
        assert P(new)==P(old),f'{rel}: 파싱 결과가 달라짐'
        assert syl(new)==syl(old),f'{rel}: 한글 음절 집합이 달라짐(주석 규칙에 걸리는 // · /* 등 확인)'
        assert fmt(json.loads(new),sep)==new,f'{rel}: 멱등 아님'
        L=new.split('\n');info=f'{len(old.encode())} → {len(new.encode())} B · {len(L)-1}줄 · 가장 긴 줄 {max(map(len,L))}자 · 음절 {len(syl(new))}'
        if old==new:print(rel,'정리됨',info);continue
        bad+=1
        if check:print(rel,'정리 필요',info);continue
        open(p,'w',encoding='utf8').write(new);print(rel,'고침',info)
    return 1 if check and bad else 0
if __name__=='__main__':
    args=sys.argv[1:]
    if args not in ([],['--check']):
        print('사용: python3 tools/data/fmtjson.py [--check]',file=sys.stderr)
        sys.exit(2)
    sys.exit(main(args==['--check']))
