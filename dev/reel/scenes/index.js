/* 쇼릴 — 장면 목록(모듈 = 파일 하나). 따로 불러와 한 장면의 오류가 다른 장면을 막지 않게 함(?only=id,id 로 일부만)
   z 띠: 0–9 배경 · 10–19 3D · 20–29 그래픽 · 30–39 글 · 40 이음매 스캔 · 50 태그라인 */
export const LIST=['s1-open','s2-lock','s3-uav','s4-mro','s5-future','s6-vision','s7-people'];
export async function loadScenes(only){
  for(const id of LIST.concat(only?only.filter(x=>!LIST.includes(x)):[])){if(only&&!only.includes(id))continue;
    try{await import(`./${id}.js`)}catch(e){console.error('scene '+id+': '+e);(window.__sceneErrors||(window.__sceneErrors=[])).push(id+': '+(e&&e.stack||e))}}
}
