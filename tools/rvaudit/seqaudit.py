"""순차 등장 전수 점검 (서버 8768 기준). python3 seqaudit.py [W H] > out.json
각 화면(페이지 · 탭)을 위에서 아래로 스크롤하며 [data-rv] 요소마다
  화면에 들어온 시각(enter) · .in이 붙은 시각(tin) · 그때의 위치(topIn) · 지연(--d)을 기록하고,
  효과가 안 붙은 글 · 그림(untagged), 겹친 효과(nested)를 모음"""
import asyncio,json,sys,os
from playwright.async_api import async_playwright
W=int(sys.argv[1]) if len(sys.argv)>1 else 1440;H=int(sys.argv[2]) if len(sys.argv)>2 else 900
BASE=os.environ.get('BASE','http://[::1]:8768/web/').rstrip('/')+'/'   # 기준본과 비교: BASE=http://[::1]:8768/_archive/pre-refactor-v60/ (끝 / 없어도 됨)
V=[]
for L in ['','-en']:
  V+=[f'index{L}.html',f'aero{L}.html',f'uav{L}.html',f'mro{L}.html']
  V+=[f'company{L}.html#'+t for t in ['greeting','about','history','locations']]
  V+=[f'newsroom{L}.html#'+t for t in ['news','video','brochure']]
  V+=[f'careers{L}.html#'+t for t in ['jobs','roles','growth','sites','benefits','process']]
if len(sys.argv)>3:V=[v for v in V if any(k in v for k in sys.argv[3].split(','))]   # 세 번째 인자: 쉼표로 구분한 페이지 이름 일부
INIT='''(()=>{window.__rv=new Map();const T0=()=>performance.now();
new MutationObserver(ms=>{for(const m of ms){const e=m.target;if(e.nodeType!==1||!e.hasAttribute||!e.hasAttribute('data-rv'))continue;
 if(e.classList.contains('in')&&!__rv.has(e)){const r=e.getBoundingClientRect();__rv.set(e,{t:T0(),top:r.top,y:scrollY})}}})
 .observe(document,{subtree:true,attributes:true,attributeFilter:['class']});})()'''
STEP='''()=>{const now=performance.now();for(const e of document.querySelectorAll('[data-rv]')){if(e.__en)continue;if(!e.getClientRects().length)continue;const r=e.getBoundingClientRect();if(r.top<innerHeight&&r.bottom>0)e.__en=now}}'''
COLLECT='''()=>{
const SK='.ph,#seq,#a3d,.hx,.gh,.gf,.subnext,script,style,template,noscript';
const path=e=>{const s=e.closest('main>*');const id=s?(s.id||s.className.split(' ')[0]):'?';const d=e.tagName.toLowerCase()+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\\s+/).slice(0,2).join('.'):'');return id+' > '+d+' "'+(e.textContent||e.alt||'').trim().replace(/\\s+/g,' ').slice(0,28)+'"'};
const vis=e=>{if(!e.getClientRects().length)return false;const r=e.getBoundingClientRect();return r.width>1&&r.height>1};
const out={els:[],untagged:[],nested:[],H:innerHeight};
const all=[...document.querySelectorAll('main [data-rv]')].filter(vis);
all.forEach((e,i)=>{const r=__rv.get(e);const d=parseFloat(getComputedStyle(e).getPropertyValue('--d'))||0;
 out.els.push({i,p:path(e),type:e.getAttribute('data-rv'),d,tin:r?r.t:null,topIn:r?Math.round(r.top):null,enter:e.__en||null,docTop:Math.round(e.getBoundingClientRect().top+scrollY),op:+getComputedStyle(e).opacity});
 const a=e.parentElement&&e.parentElement.closest('[data-rv]');if(a&&!(a.getAttribute('data-rv')==='fl'))out.nested.push(path(e)+'  ⊂  '+path(a))});
/* 효과가 안 붙은 글 · 그림 */
const leaves=[...document.querySelectorAll('main *')].filter(e=>{if(e.closest(SK))return false;if(e.closest('[data-rv],[data-rvq],[data-rvc],.rvs'))return false;if(!vis(e))return false;
 const media=/^(IMG|VIDEO|CANVAS)$/.test(e.tagName)||(e.tagName==='svg'&&!e.parentElement.closest('svg')&&e.getBoundingClientRect().width>60);
 const txt=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>1);return media||txt});
leaves.forEach(e=>out.untagged.push(path(e)));
return out}'''
async def run():
  async with async_playwright() as p:
    b=await p.chromium.launch();res={}
    for v in V:
      pg=await b.new_page(viewport={'width':W,'height':H});await pg.add_init_script(INIT)
      errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
      await pg.goto(BASE+v,wait_until='load');await pg.wait_for_timeout(300)
      await pg.evaluate("window.KA_LENIS&&KA_LENIS.destroy()")
      t0=await pg.evaluate("performance.now()")
      await pg.evaluate(STEP);await pg.wait_for_timeout(1500);await pg.evaluate(STEP)
      y=0
      while True:
        sh=await pg.evaluate("document.documentElement.scrollHeight-innerHeight")
        if y>=sh:break
        y=min(sh,y+int(H*.3));await pg.evaluate(f"scrollTo(0,{y})");await pg.wait_for_timeout(260);await pg.evaluate(STEP)
      await pg.wait_for_timeout(3500);await pg.evaluate(STEP)
      r=await pg.evaluate(COLLECT);r['t0']=t0;r['errs']=errs;res[v]=r;await pg.close()
      print(v,len(r['els']),'tagged',len(r['untagged']),'untagged',file=sys.stderr)
    await b.close();print(json.dumps(res,ensure_ascii=False))
asyncio.run(run())
