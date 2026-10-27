/* 사이트 편집 모드(개발 전용, 게시 안 함). web/ 쪽을 iframe으로 띄우고 요소에 translate · width · height · scale을 인라인으로 덧씌운다.
   바꾼 값은 쪽 · 폭 구간별로 localStorage에 남고, 내보낸 CSS/JSON을 받아 실제 쪽 CSS에 옮긴다(dev/edit.md). */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const PAGES=['index','aero','uav','mro','company','newsroom','careers'];
const WIDTHS=[1920,1440,1280,1180,1080,901,900,768,600,390];
const BK={d:['데스크톱 ≥901','(min-width:901px)'],t:['태블릿 601–900','(min-width:601px) and (max-width:900px)'],m:['모바일 ≤600','(max-width:600px)']};
const PROPS=['translate','scale','width','height','max-width','max-height'];
const LS='kaedit:';
const fr=$('#fr'),stage=$('#stage'),layer=$('#layer'),hov=$('#hov'),sel=$('#sel'),shield=$('#shield');
const bucket=w=>w<=600?'m':w<=900?'t':'d';
const rd=v=>Math.round(v*10)/10;
const lsGet=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}};
const lsSet=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,JSON.stringify(v))}catch(e){}};

const st=lsGet(LS+'@state')||{};
let W=+st.w||1440,S=1,page=st.page||'index.html',on=true,mode='box';
let doc=null,win=null,cur=null,hovEl=null,edits={},undo=[],last=null,drag=null;
const orig=new WeakMap();   /* 요소별 원래 인라인 값(되돌리기용) */
const touched=new Set();

/* ── 선택자 · 이름 ── */
function selector(el){
  const parts=[];
  for(let e=el;e&&e.nodeType===1&&e!==doc.documentElement;e=e.parentElement){
    if(e.id&&doc.querySelectorAll('#'+CSS.escape(e.id)).length===1){parts.unshift('#'+CSS.escape(e.id));break}
    const tag=e.localName;let i=1,n=0;
    for(let s=e.previousElementSibling;s;s=s.previousElementSibling)if(s.localName===tag)i++;
    for(const c of e.parentElement?e.parentElement.children:[])if(c.localName===tag)n++;
    parts.unshift(n>1?`${tag}:nth-of-type(${i})`:tag);
  }
  return parts.join(' > ');
}
function label(el){
  let s=el.localName;
  if(el.id)s+='#'+el.id;
  const cl=[...el.classList].filter(c=>!/^(in|on|act|active|is-.+)$/.test(c)).slice(0,2);if(cl.length)s+='.'+cl.join('.');
  const t=(el.textContent||'').trim().replace(/\s+/g,' ');
  return t?`${s} “${t.length>18?t.slice(0,18)+'…':t}”`:s;
}

/* ── 계산값 ── */
function base(el,rec){
  const cs=win.getComputedStyle(el),r=el.getBoundingClientRect();
  const tr=cs.translate==='none'?[0,0]:cs.translate.split(' ').map(parseFloat);
  const sc=cs.scale==='none'?1:parseFloat(cs.scale);
  return{tx:rec?.tx??(tr[0]||0),ty:rec?.ty??(tr[1]||0),w:rec?.width??(parseFloat(cs.width)||r.width),h:rec?.height??(parseFloat(cs.height)||r.height),
    scale:rec?.scale??sc,rw:r.width,rh:r.height,inline:cs.display==='inline'};
}

/* ── 적용 · 복원 ── */
function apply(el,rec){
  if(!orig.has(el))orig.set(el,PROPS.map(p=>[p,el.style.getPropertyValue(p),el.style.getPropertyPriority(p)]));
  touched.add(el);
  restore(el,true);
  if(!rec)return;
  const set=(p,v)=>el.style.setProperty(p,v,'important');
  if(rec.tx!=null||rec.ty!=null)set('translate',`${rec.tx||0}px ${rec.ty||0}px`);
  if(rec.scale!=null)set('scale',String(rec.scale));
  if(rec.width!=null){set('width',rec.width+'px');set('max-width','none')}
  if(rec.height!=null){set('height',rec.height+'px');set('max-height','none')}
}
function restore(el,keep){
  const o=orig.get(el);if(!o)return;
  for(const[p,v,pr]of o)v?el.style.setProperty(p,v,pr):el.style.removeProperty(p);
  if(!keep)touched.delete(el);
}
function applyAll(){
  for(const el of[...touched])restore(el);
  const b=bucket(W);
  for(const rec of Object.values(edits)){
    if(rec.b!==b)continue;
    const el=doc.querySelector(rec.sel);
    rec.miss=!el;if(el)apply(el,rec);
  }
  renderList();
}
const keyOf=el=>bucket(W)+'|'+selector(el);
function commit(el,rec,push=true){
  const k=keyOf(el),before=edits[k]?{...edits[k]}:null;
  if(push)undo.push({k,before});
  if(rec&&rec.tx===0&&rec.ty===0){rec.tx=null;rec.ty=null}
  const empty=!rec||['tx','ty','width','height','scale'].every(p=>rec[p]==null);
  if(empty)delete edits[k];
  else edits[k]={b:bucket(W),w:W,sel:selector(el),label:label(el),tx:rec.tx??null,ty:rec.ty??null,width:rec.width??null,height:rec.height??null,scale:rec.scale??null};
  apply(el,edits[k]||null);
  save();fill();renderList();
}
function save(){lsSet(LS+page,Object.keys(edits).length?Object.fromEntries(Object.entries(edits).map(([k,r])=>[k,{...r,miss:undefined}])):null)}

/* ── 고르기 ── */
function pickAt(x,y){
  const list=doc.elementsFromPoint(x,y).filter(e=>e!==doc.documentElement&&e!==doc.body);
  if(!list.length)return;
  const same=last&&Math.abs(last.x-x)<4&&Math.abs(last.y-y)<4;
  last={x,y,i:same?last.i+1:0};
  choose(list[last.i%list.length]);
}
function choose(el){
  cur=el||null;
  if(cur){const r=edits[keyOf(cur)];if(!r&&base(cur).inline)setMode('scale')}
  fill();renderList();
}
function setMode(m){mode=m;document.querySelector(`input[name=md][value=${m}]`).checked=true}

/* ── 패널 ── */
const inp={tx:$('#tx'),ty:$('#ty'),ww:$('#ww'),hh:$('#hh'),sc:$('#sc')};
function fill(){
  if(!cur||!cur.isConnected){cur=null;$('#info').textContent='편집이 켜진 상태에서 요소를 누르세요.';for(const i of Object.values(inp))i.value='';return}
  const rec=edits[keyOf(cur)],b=base(cur,rec);
  $('#info').innerHTML='';
  $('#info').append(label(cur),document.createElement('br'),Object.assign(document.createElement('code'),{textContent:selector(cur)}));
  const put=(i,v)=>{if(document.activeElement!==i)i.value=v};
  put(inp.tx,rd(b.tx));put(inp.ty,rd(b.ty));put(inp.ww,rd(b.w));put(inp.hh,rd(b.h));put(inp.sc,Math.round(b.scale*1000)/1000);
}
function fromInputs(e){
  if(!cur)return;
  const rec={...(edits[keyOf(cur)]||{})},num=i=>i.value===''?null:+i.value;
  const id=e.target.id;
  if(id==='tx'||id==='ty'){rec.tx=num(inp.tx)??0;rec.ty=num(inp.ty)??0}
  if(id==='ww')rec.width=num(inp.ww);
  if(id==='hh')rec.height=num(inp.hh);
  if(id==='sc')rec.scale=num(inp.sc);
  commit(cur,rec);
}
function renderList(){
  const ul=$('#list');ul.innerHTML='';
  const recs=Object.values(edits).sort((a,b)=>a.b.localeCompare(b.b));
  $('#cnt').textContent=recs.length?`(${recs.length})`:'';
  for(const r of recs){
    const li=document.createElement('li');
    if(r.b!==bucket(W))li.classList.add('miss');else if(r.miss)li.classList.add('miss');
    const v=[r.tx!=null||r.ty!=null?`↔${r.tx||0} ↕${r.ty||0}`:'',r.width!=null?`W${r.width}`:'',r.height!=null?`H${r.height}`:'',r.scale!=null?`×${r.scale}`:''].filter(Boolean).join(' ');
    li.append(Object.assign(document.createElement('b'),{textContent:r.label}),Object.assign(document.createElement('i'),{textContent:`${BK[r.b][0].split(' ')[0]} · ${v}${r.miss?' · 못 찾음':''}`}));
    li.title=r.sel;
    li.onclick=()=>{
      if(r.b!==bucket(W))setWidth(r.w);
      const el=doc.querySelector(r.sel);if(!el)return;
      choose(el);
      const y=el.getBoundingClientRect().top+win.scrollY-win.innerHeight/3;
      win.KA_LENIS?win.KA_LENIS.scrollTo(y,{immediate:true}):win.scrollTo(0,y);
    };
    ul.append(li);
  }
}

/* ── 끌기 ── */
function startDrag(e){
  if(!on||!cur||e.button!==0)return;
  e.preventDefault();
  const rec=edits[keyOf(cur)];
  drag={d:e.target.dataset.d||'',x:e.clientX,y:e.clientY,b:base(cur,rec),rec:{...(rec||{})},moved:false};
  drag.undo={k:keyOf(cur),before:rec?{...rec}:null};
  shield.style.display='block';shield.style.cursor=getComputedStyle(e.target).cursor;
}
function moveDrag(e){
  if(!drag)return;
  let dx=(e.clientX-drag.x)/S,dy=(e.clientY-drag.y)/S;
  if(!drag.moved&&Math.hypot(dx,dy)<3)return;
  drag.moved=true;
  const{d,b}=drag,r=drag.rec;
  if(!d){
    if(e.shiftKey)Math.abs(dx)>Math.abs(dy)?dy=0:dx=0;
    r.tx=Math.round(b.tx+dx);r.ty=Math.round(b.ty+dy);
  }else if(mode==='scale'||b.inline){
    const sx=d.includes('e')?1:d.includes('w')?-1:0,sy=d.includes('s')?1:d.includes('n')?-1:0;
    const f=sx?(b.rw+2*sx*dx)/b.rw:(b.rh+2*sy*dy)/b.rh;   /* 가운데 기준으로 커지므로 양쪽 끌기량 */
    r.scale=Math.max(.05,Math.round(b.scale*f*1000)/1000);
  }else{
    const sx=d.includes('e')?1:d.includes('w')?-1:0,sy=d.includes('s')?1:d.includes('n')?-1:0;
    if(sx){r.width=Math.max(1,Math.round(b.w+sx*dx));if(sx<0)r.tx=Math.round(b.tx+(b.w-r.width))}
    if(sy){r.height=Math.max(1,Math.round(b.h+sy*dy));if(sy<0)r.ty=Math.round(b.ty+(b.h-r.height))}
    if(sx&&sy&&e.shiftKey){r.height=Math.round(r.width*b.h/b.w);if(sy<0)r.ty=Math.round(b.ty+(b.h-r.height))}
    if(sx<0&&r.ty==null)r.ty=b.ty;
    if(sy<0&&r.tx==null)r.tx=b.tx;
  }
  apply(cur,r);fill();
}
function endDrag(e){
  if(!drag)return;
  shield.style.display='none';
  const d=drag;drag=null;
  if(!d.moved){   /* 끌지 않고 누름: 그 자리 요소 고르기 */
    const fb=fr.getBoundingClientRect();
    pickAt((e.clientX-fb.left)/S,(e.clientY-fb.top)/S);return;
  }
  undo.push(d.undo);commit(cur,d.rec,false);
}
sel.addEventListener('pointerdown',startDrag);
addEventListener('pointermove',moveDrag);
addEventListener('pointerup',endDrag);
/* 선택 상자 위 휠도 사이트로 넘김(Lenis는 wheel 이벤트를 읽음) */
sel.addEventListener('wheel',e=>{
  if(!win)return;e.preventDefault();
  if(win.KA_LENIS)doc.dispatchEvent(new win.WheelEvent('wheel',{deltaX:e.deltaX,deltaY:e.deltaY,deltaMode:e.deltaMode,bubbles:true,cancelable:true}));
  else win.scrollBy(e.deltaX,e.deltaY);
},{passive:false});

/* ── 키 ── */
function onKey(e){
  const t=e.target;
  if(t&&t.ownerDocument===document&&/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName))return;
  if($('#dlg').open)return;
  const k=e.key;
  if((e.metaKey||e.ctrlKey)&&k.toLowerCase()==='z'){e.preventDefault();doUndo();return}
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  if(k==='e'||k==='E'){toggle();e.preventDefault();return}
  if(!on||!cur)return;
  const step=e.shiftKey?10:1,mv={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[k];
  if(mv){
    e.preventDefault();e.stopPropagation();
    const rec={...(edits[keyOf(cur)]||{})},b=base(cur,rec);
    rec.tx=Math.round(b.tx+mv[0]);rec.ty=Math.round(b.ty+mv[1]);commit(cur,rec);
  }else if(k==='Escape'){choose(null)}
  else if(k==='['){e.preventDefault();up()}
  else if(k===']'){e.preventDefault();dn()}
  else if(k==='r'||k==='R'){e.preventDefault();commit(cur,null)}
}
function up(){if(cur&&cur.parentElement&&cur.parentElement!==doc.body)choose(cur.parentElement)}
function dn(){if(cur&&cur.firstElementChild)choose(cur.firstElementChild)}
function doUndo(){
  const u=undo.pop();if(!u)return;
  if(u.before)edits[u.k]=u.before;else delete edits[u.k];
  save();applyAll();fill();
}
addEventListener('keydown',onKey,true);

/* ── 편집 켜기/끄기 ── */
function toggle(){
  on=!on;document.body.classList.toggle('on',on);
  $('#tog').textContent=on?'편집 켜짐':'편집 꺼짐';$('#tog').classList.toggle('on',on);
  if(!on)hovEl=null;
}

/* ── iframe 연결 ── */
const block=e=>{if(on){e.preventDefault();e.stopPropagation()}};
function hook(){
  try{doc=fr.contentDocument;win=fr.contentWindow;void doc.body}catch(e){return}
  if(!doc||!doc.body)return;
  page=decodeURIComponent(win.location.pathname.split('/').pop()||'index.html');
  $('#page').value=page;
  lsSet(LS+'@state',{page,w:W});
  edits=lsGet(LS+page)||{};undo=[];cur=null;hovEl=null;last=null;touched.clear();
  for(const ev of['pointerdown','mousedown','mouseup','auxclick','dblclick','contextmenu','touchstart'])doc.addEventListener(ev,block,{capture:true,passive:false});
  doc.addEventListener('click',e=>{if(!on)return;block(e);pickAt(e.clientX,e.clientY)},true);
  doc.addEventListener('pointermove',e=>{if(on&&!drag)hovEl=doc.elementFromPoint(e.clientX,e.clientY)},true);
  doc.addEventListener('pointerleave',()=>{hovEl=null},true);
  doc.addEventListener('keydown',onKey,true);
  /* 스크립트가 늦게 만드는 요소(머리글 · 뉴스)까지 다시 적용 */
  for(const t of[0,400,1200,3000])setTimeout(()=>{if(win===fr.contentWindow)applyAll()},t);
  fill();
}
fr.addEventListener('load',hook);

/* ── 폭 · 맞춤 ── */
function fit(){
  const aw=stage.clientWidth,ah=stage.clientHeight;
  S=Math.min(1,aw/W);
  Object.assign(fr.style,{width:W+'px',height:ah/S+'px',transform:`scale(${S})`});
  Object.assign(layer.style,{width:W*S+'px',height:ah+'px'});
}
function setWidth(w){
  const ob=bucket(W);
  W=Math.max(320,Math.min(2560,Math.round(w)||1440));
  $('#w').value=W;
  for(const b of document.querySelectorAll('#ws button'))b.classList.toggle('on',+b.textContent===W);
  fit();lsSet(LS+'@state',{page,w:W});
  if(doc&&ob!==bucket(W)){cur=null;applyAll();fill()}
  $('#bk').textContent=BK[bucket(W)][0]+(S<1?` · ${Math.round(S*100)}%로 보임`:'');
}
for(const w of WIDTHS){const b=document.createElement('button');b.textContent=w;b.onclick=()=>setWidth(w);$('#ws').append(b)}
$('#w').addEventListener('change',e=>setWidth(+e.target.value));
addEventListener('resize',()=>setWidth(W));

/* ── 그리기 ── */
function box(b,el,txt){
  if(!el||!el.isConnected){b.hidden=true;return}
  const r=el.getBoundingClientRect();
  b.hidden=false;
  b.style.transform=`translate(${r.left*S}px,${r.top*S}px)`;
  b.style.width=r.width*S+'px';b.style.height=r.height*S+'px';
  b.classList.toggle('low',r.top<22);
  const t=b.firstElementChild,s=`${txt} · ${Math.round(r.width)}×${Math.round(r.height)}`;
  if(t.textContent!==s)t.textContent=s;
}
(function draw(){
  requestAnimationFrame(draw);
  if(!doc)return;
  box(hov,on&&hovEl&&hovEl!==cur?hovEl:null,hovEl?label(hovEl):'');
  box(sel,cur,cur?label(cur):'');
})();

/* ── 내보내기 ── */
function cssFor(pg,recs){
  const out=[`/* ${pg} · 편집 모드 내보내기 ${new Date().toISOString().slice(0,10)} */`];
  for(const b of['d','t','m']){
    const rs=Object.values(recs).filter(r=>r.b===b);if(!rs.length)continue;
    out.push(`\n/* ${BK[b][0]} */\n@media ${BK[b][1]}{`);
    for(const r of rs){
      const d=[];
      if(r.tx!=null||r.ty!=null)d.push(`translate:${r.tx||0}px ${r.ty||0}px`);
      if(r.width!=null)d.push(`width:${r.width}px`);
      if(r.height!=null)d.push(`height:${r.height}px`);
      if(r.scale!=null)d.push(`scale:${r.scale}`);
      out.push(`  /* ${r.label.replace(/\*\//g,'')} · 편집 폭 ${r.w} */\n  ${r.sel}{${d.join(';')}}`);
    }
    out.push('}');
  }
  return out.join('\n');
}
function allPages(){
  const o={};
  for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith(LS)&&k!==LS+'@state')o[k.slice(LS.length)]=Object.values(lsGet(k)||{})}
  return o;
}
$('#css').onclick=()=>{$('#out').value=cssFor(page,edits);$('#dlg').showModal()};
$('#json').onclick=()=>{
  const data={tool:'dev/edit.html',exported:new Date().toISOString(),pages:allPages()};
  const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([JSON.stringify(data,null,1)],{type:'application/json'})),download:`ka-edit-${new Date().toISOString().slice(0,10)}.json`});
  a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};
$('#copy').onclick=async()=>{try{await navigator.clipboard.writeText($('#out').value);$('#copy').textContent='복사됨'}catch(e){$('#out').select()}setTimeout(()=>$('#copy').textContent='복사',1200)};
$('#close').onclick=()=>$('#dlg').close();
$('#clr').onclick=()=>{if(!Object.keys(edits).length)return;undo=[];edits={};save();applyAll();fill()};
$('#undo').onclick=doUndo;
$('#tog').onclick=toggle;
$('#up').onclick=up;$('#dn').onclick=dn;
$('#rs').onclick=()=>{if(cur)commit(cur,null)};
for(const i of Object.values(inp))i.addEventListener('change',fromInputs);
for(const r of document.querySelectorAll('input[name=md]'))r.onchange=()=>mode=r.value;

/* ── 시작 ── */
const ps=$('#page');
for(const p of PAGES)for(const f of[p+'.html',p+'-en.html'])ps.append(new Option(f,f));
ps.onchange=()=>{fr.src='../web/'+ps.value};
const q=new URLSearchParams(location.search);
if(q.get('p'))page=q.get('p').replace(/[^\w.-]/g,'')+(q.get('p').endsWith('.html')?'':'.html');
if(q.get('w'))W=+q.get('w');
setWidth(W);
fr.src='../web/'+page;
})();
