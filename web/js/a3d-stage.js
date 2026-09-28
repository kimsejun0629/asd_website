/* 항공기체 3D — 스튜디오 무대: 렌더러 · 반사용 환경(소프트박스) · 조명 · 바닥 그림자 · 카메라 */
import * as THREE from 'three';

function studioEnv(renderer){
  /* 안쪽이 어두운 방 + 큰 소프트박스(위) · 세로 스트립(좌우) · 뒤쪽 림 — 도장 면에 사진 스튜디오 같은 반사가 맺히게 */
  const s=new THREE.Scene();
  const room=new THREE.Mesh(new THREE.BoxGeometry(60,30,60),new THREE.MeshBasicMaterial({color:0x6a6e73,side:THREE.BackSide}));room.position.y=10;s.add(room);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshBasicMaterial({color:0x4a4c4f}));floor.rotation.x=-Math.PI/2;floor.position.y=-4.9;s.add(floor);
  const box=(w,h,x,y,z,ry,rx,k)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(k,k,k)}));m.position.set(x,y,z);m.rotation.set(rx||0,ry||0,0);s.add(m)};
  box(40,30,0,24.9,0,0,Math.PI/2,1.6);          /* 위 큰 확산판 */
  box(14,6,0,24.8,6,0,Math.PI/2,3.2);           /* 위 소프트박스 */
  box(2.5,16,-29.9,8,-6,Math.PI/2,0,3.0);        /* 왼쪽 스트립 */
  box(3,18,29.9,8,8,-Math.PI/2,0,2.6);           /* 오른쪽 스트립 */
  box(30,4,0,14,-29.9,0,0,2.0);                  /* 뒤 림 */
  box(20,3,0,4,29.9,Math.PI,0,1.2);              /* 앞 약한 반사판 */
  const pm=new THREE.PMREMGenerator(renderer);const rt=pm.fromScene(s,.035);pm.dispose();return rt.texture;
}

export function createStage(canvas,{dpr=Math.min(devicePixelRatio||1,1.75)}={}){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(dpr);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping??THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;   /* Neutral: 도장 색이 바래지 않게 */
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.environment=studioEnv(renderer);scene.environmentIntensity=.8;
  const cam=new THREE.PerspectiveCamera(26,1,.5,2000);
  const key=new THREE.DirectionalLight(0xfff1df,2.2);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.bias=-.0004;key.shadow.normalBias=.04;key.shadow.radius=6;scene.add(key);scene.add(key.target);
  const rim=new THREE.DirectionalLight(0xd6e4f2,1.25);scene.add(rim);
  const hemi=new THREE.HemisphereLight(0xeef2f6,0x6a6d71,.5);scene.add(hemi);
  const under=new THREE.DirectionalLight(0xe4e8ec,.35);under.position.set(0,-1,.4);scene.add(under);   /* 아랫면이 검게 뭉개지지 않게 약한 반사광 */
  /* 바닥: 그림자만 받는 투명 면(배경은 페이지의 어두운 그라데이션이 비침) */
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.ShadowMaterial({opacity:.24,color:0x000000}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  const pivot=new THREE.Group();scene.add(pivot);
  let size=[1,1];
  let shift=[0,0];
  function resize(w,h){size=[w,h];renderer.setSize(w,h,false);cam.aspect=w/h;applyShift()}
  /* 렌즈 시프트(sx, sy: 화면 폭 · 높이 비율) — 원근은 그대로 두고 화면 속 기체 위치만 옮김 */
  function applyShift(){const [w,h]=size;if(shift[0]||shift[1])cam.setViewOffset(w,h,-shift[0]*w,-shift[1]*h,w,h);else cam.clearViewOffset();cam.updateProjectionMatrix()}
  function lens(sx,sy){if(sx===shift[0]&&sy===shift[1])return;shift=[sx,sy];applyShift()}
  /* 기체 크기(R: 바운딩 구 반경)에 맞춰 조명 · 그림자 · 바닥 위치를 맞춤 */
  function fit(R,floorY){
    const d=R*2.2;key.position.set(R*.5,R*2.3,-R*1.5);key.target.position.set(0,0,0);   /* 따뜻한 주광: 앞 왼쪽 위 */
    const sc=key.shadow.camera;sc.left=-d;sc.right=d;sc.top=d;sc.bottom=-d;sc.near=.5;sc.far=R*8;sc.updateProjectionMatrix();
    rim.position.set(-R*1.4,R*1.1,R*1.9);floor.position.y=floorY;floor.scale.set(R*10,R*10,1);   /* 차가운 림: 뒤쪽 */
  }
  /* 카메라: 기준점(target) 둘레 궤도 — yaw(수평) · el(고도) · dist(거리, R 배수) */
  function view({yaw=0,el=.2,dist=2.6,r=null,target=[0,0,0]},R){
    r=r??dist*R/Math.tan(cam.fov*Math.PI/360)*.62;const t=new THREE.Vector3(...target);
    cam.position.set(t.x+r*Math.cos(el)*Math.sin(yaw),t.y+r*Math.sin(el),t.z+r*Math.cos(el)*Math.cos(yaw));cam.lookAt(t);
  }
  return {renderer,scene,cam,pivot,key,rim,floor,resize,fit,view,lens,exposure:1.0,render:()=>renderer.render(scene,cam),get size(){return size}};
}
