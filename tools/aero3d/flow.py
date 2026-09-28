import asyncio,sys,json,os
from playwright.async_api import async_playwright
from PIL import Image
# 기종 i의 회전 끝 → 첫 부위: 카메라 방향(기체 기준) 변화량과 화면
i=int(sys.argv[1]);out=sys.argv[2]
BASE=os.environ.get('BASE','http://[::1]:8768/web/').rstrip('/')+'/'   # 기준본과 비교: BASE=http://[::1]:8768/_archive/pre-refactor-v60/ (끝 / 없어도 됨)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=await b.new_page(viewport={'width':1512,'height':683})
    await pg.goto(BASE+'aero.html',wait_until='load',timeout=90000);await pg.wait_for_timeout(2500)
    await pg.evaluate("window.KA_LENIS&&KA_LENIS.destroy()")
    ims=[]
    for k,v in enumerate([.3+1.6*.5,.3+1.6*.98,.3+1.6+.25,.3+1.6+.8]):
      y=await pg.evaluate(f"(()=>{{const A=window.A3D;if(A.scrollYAt)return A.scrollYAt(A.C[{i}]+{v});const s=document.getElementById('a3d');const r=s.getBoundingClientRect();return scrollY+r.top+(r.height-innerHeight)*(A.C[{i}]+{v})/A.TOT}})()")
      await pg.evaluate(f"scrollTo(0,{y})");await pg.wait_for_timeout(2600)
      st=await pg.evaluate("(()=>{const M=A3D.models.get(A3D.where().i);const c=A3D.st.cam.position;const h=M.holder.rotation.y;const rel=Math.atan2(c.x,c.z)-h;return {rot:+(h*57.3).toFixed(1),camYaw:+(Math.atan2(c.x,c.z)*57.3).toFixed(1),rel:+(((rel*57.3)%360+360)%360).toFixed(1)}})()")
      print(k,st);f=f'{out}_{k}.png';await pg.screenshot(path=f);ims.append(Image.open(f))
    await b.close()
  c=Image.new('RGB',(1512,683));
  for k,im in enumerate(ims):c.paste(im.resize((756,341)),((k%2)*756,(k//2)*341))
  c.save(out+'.png')
asyncio.run(main())
