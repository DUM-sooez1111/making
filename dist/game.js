import * as THREE from './vendor/three.module.js';

const $ = selector => document.querySelector(selector);
const types = [
  {name:'잔디',note:'자연의 시작',color:0x80b94b},
  {name:'흙',note:'단단한 기초',color:0xa67850},
  {name:'돌',note:'차분한 질감',color:0x8e9ba6},
  {name:'모래',note:'따뜻한 색감',color:0xe9cf86},
  {name:'나무',note:'포근한 공간',color:0xb88b57},
  {name:'벽돌',note:'차곡차곡 쌓기',color:0xc66b55},
  {name:'유리',note:'빛이 드는 곳',color:0x9cdbeb},
  {name:'빛 블록',note:'반짝이는 포인트',color:0xf7db78},
];
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb9d6e3);
scene.fog = new THREE.Fog(0xb9d6e3,65,190);
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, .1, 350);
camera.position.set(14,12,20);camera.rotation.order='YXZ';
let yaw=.48,pitch=-.42;
const renderer = new THREE.WebGLRenderer({antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
$('#game').append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe6f5ff,0x648448,2.2));
const sun = new THREE.DirectionalLight(0xfff2d6,2.5);sun.position.set(-30,65,25);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-70,right:70,top:70,bottom:-70,near:1,far:150});sun.shadow.bias=-.0004;scene.add(sun);
const ground = new THREE.Mesh(new THREE.BoxGeometry(128,1,128),new THREE.MeshStandardMaterial({color:0x6c9860,roughness:1}));
ground.position.y=-.5;ground.receiveShadow=true;scene.add(ground);
const grid = new THREE.GridHelper(128,128,0x496f43,0x5a8652);grid.position.y=.009;grid.material.transparent=true;grid.material.opacity=.42;scene.add(grid);
const border = new THREE.LineSegments(new THREE.EdgesGeometry(ground.geometry),new THREE.LineBasicMaterial({color:0x4c7547}));border.position.copy(ground.position);scene.add(border);

// Deterministic material patterns stay local and need no image downloads.
function texture(index){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d');
 c.fillStyle='#'+types[index].color.toString(16).padStart(6,'0');c.fillRect(0,0,64,64);
 let seed=index+7;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<210;i++){c.fillStyle=random()>.5?'#ffffff12':'#0000000d';c.fillRect(Math.floor(random()*32)*2,Math.floor(random()*32)*2,2,2);}
 if(index===4){c.strokeStyle='#78532a70';c.lineWidth=2;for(let x=8;x<64;x+=14){c.beginPath();c.moveTo(x,0);c.bezierCurveTo(x+9,20,x-7,40,x,64);c.stroke();}}
 if(index===5){c.strokeStyle='#f0c3a1';c.lineWidth=2;for(let y=0;y<=64;y+=16){c.beginPath();c.moveTo(0,y);c.lineTo(64,y);c.stroke();for(let x=(y/16%2)*16;x<=64;x+=32){c.beginPath();c.moveTo(x,y);c.lineTo(x,y+16);c.stroke();}}}
 const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;return t;
}
const materials=types.map((type,i)=>new THREE.MeshStandardMaterial({map:texture(i),roughness:i===6?.15:.85,transparent:i===6,opacity:i===6?.48:1,emissive:i===7?0xf3bc39:0,emissiveIntensity:i===7?.38:0}));
const cubeGeometry = new THREE.BoxGeometry(1,1,1);
const blocks = new Map();const key=(x,y,z)=>`${x},${y},${z}`;
let selected=0,hit=null,placement=null,toastTimer;
const ghost=new THREE.Mesh(cubeGeometry,new THREE.MeshBasicMaterial({color:types[0].color,transparent:true,opacity:.38,depthWrite:false}));scene.add(ghost);
const outline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01,1.01,1.01)),new THREE.LineBasicMaterial({color:0xf0ffb8}));scene.add(outline);
function addBlock(x,y,z,type){const id=key(x,y,z);if(blocks.has(id))return false;const mesh=new THREE.Mesh(cubeGeometry,materials[type]);mesh.position.set(x+.5,y+.5,z+.5);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData={id,x,y,z,type};blocks.set(id,mesh);scene.add(mesh);$('#block-count').textContent=`설치 ${blocks.size}개`;return true;}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2200);}

// Render real 3D block thumbnails with the same materials as the world.
const iconScene=new THREE.Scene();iconScene.add(new THREE.HemisphereLight(0xffffff,0x8c9da4,2.5));const iconLight=new THREE.DirectionalLight(0xffffff,2);iconLight.position.set(-3,6,4);iconScene.add(iconLight);
const iconCamera=new THREE.OrthographicCamera(-.95,.95,.95,-.95,.1,10);iconCamera.position.set(2,1.8,2.6);iconCamera.lookAt(0,0,0);
const iconRenderer=new THREE.WebGLRenderer({alpha:true,antialias:true});iconRenderer.setSize(128,128);iconRenderer.setClearColor(0,0);
const iconCube=new THREE.Mesh(cubeGeometry);iconScene.add(iconCube);
types.forEach((type,i)=>{iconCube.material=materials[i];iconRenderer.render(iconScene,iconCamera);const src=iconRenderer.domElement.toDataURL();
 for(const [container,cls] of [['#hotbar','slot'],['#block-grid','block-card']]){const button=document.createElement('button');button.className=cls;button.dataset.index=i;button.setAttribute('aria-label',`${i+1}. ${type.name}`);button.setAttribute('aria-pressed',String(i===0));button.innerHTML=`<span class="number">${i+1}</span><img class="block-icon" alt="" src="${src}">${cls==='block-card'?`<strong>${type.name}</strong><small>${type.note}</small>`:''}`;button.addEventListener('click',()=>select(i));$(container).append(button);}
});iconRenderer.dispose();
function select(i){selected=i;$('#selected-name').textContent=types[i].name;ghost.material.color.setHex(types[i].color);document.querySelectorAll('[data-index]').forEach(button=>button.setAttribute('aria-pressed',String(+button.dataset.index===i)));}
const menu=$('#block-menu'),keys=new Set();
function openMenu(){if(menu.open)return;keys.clear();if(document.pointerLockElement)document.exitPointerLock();menu.showModal();ghost.visible=outline.visible=false;}
function closeMenu(){if(!menu.open)return;menu.close();keys.clear();lock();}
$('#menu-button').onclick=openMenu;$('#close-menu').onclick=closeMenu;$('#resume').onclick=closeMenu;
menu.addEventListener('cancel',event=>{event.preventDefault();closeMenu();});
menu.addEventListener('click',event=>{if(event.target===menu){const r=menu.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeMenu();}});
const coarse=matchMedia('(pointer:coarse)').matches;
async function lock(){if(coarse||menu.open||document.pointerLockElement===renderer.domElement)return;try{await renderer.domElement.requestPointerLock();}catch{toast('게임 화면을 클릭하면 마우스가 중앙에 고정돼요.');}}
$('#play-button').onclick=lock;
document.addEventListener('pointerlockchange',()=>{const locked=document.pointerLockElement===renderer.domElement;if(locked&&menu.open)document.exitPointerLock();document.body.classList.toggle('playing',locked&&!menu.open);keys.clear();});
document.addEventListener('pointerlockerror',()=>toast('게임 화면을 클릭하면 마우스가 중앙에 고정돼요.'));
document.addEventListener('keydown',event=>{
 if(event.code==='Tab'){event.preventDefault();if(!event.repeat)menu.open?closeMenu():openMenu();return;}
 if(/^Digit[1-8]$/.test(event.code)){select(Number(event.code.slice(-1))-1);return;}
 if(menu.open)return;
 if(['Space','KeyW','KeyA','KeyS','KeyD','KeyQ','ShiftLeft','ShiftRight'].includes(event.code)){event.preventDefault();keys.add(event.code);}
});
document.addEventListener('keyup',event=>keys.delete(event.code));window.addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>keys.clear());
function look(dx,dy){yaw-=dx*.0025;pitch=THREE.MathUtils.clamp(pitch-dy*.0025,-1.5,1.5);}
let drag=null;
renderer.domElement.addEventListener('pointerdown',event=>{if(menu.open)return;if(document.pointerLockElement===renderer.domElement){if(event.button===0||event.button===2)act(event.button===2?'remove':'place');return;}if(event.pointerType!=='touch'&&!coarse){if(event.button===0)lock();return;}drag={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};renderer.domElement.setPointerCapture(event.pointerId);});
renderer.domElement.addEventListener('pointermove',event=>{if(!drag||document.pointerLockElement)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>1)drag.moved=true;look(dx,dy);drag.x=event.clientX;drag.y=event.clientY;});
renderer.domElement.addEventListener('pointerup',()=>{if(drag&&!drag.moved&&!coarse)lock();drag=null;});renderer.domElement.addEventListener('pointercancel',()=>drag=null);
document.addEventListener('mousemove',event=>{if(document.pointerLockElement===renderer.domElement&&!menu.open)look(event.movementX,event.movementY);});
renderer.domElement.addEventListener('contextmenu',event=>event.preventDefault());
document.querySelectorAll('[data-move]').forEach(button=>{button.addEventListener('pointerdown',event=>{keys.add(button.dataset.move);button.setPointerCapture(event.pointerId);});for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>keys.delete(button.dataset.move));});
$('#touch-place').onclick=()=>act('place');$('#touch-remove').onclick=()=>act('remove');
const ray = new THREE.Raycaster();ray.far=32;const center=new THREE.Vector2();
function target(){
 camera.updateMatrixWorld();ray.setFromCamera(center,camera);hit=ray.intersectObjects([ground,...blocks.values()],false)[0]||null;placement=null;ghost.visible=outline.visible=false;
 if(!hit||menu.open)return;
 const p=hit.point.clone().addScaledVector(hit.face.normal,.02);const x=Math.floor(p.x),y=Math.floor(p.y),z=Math.floor(p.z);
 if(x>=-64&&x<64&&z>=-64&&z<64&&y>=0&&y<64&&!blocks.has(key(x,y,z))){placement={x,y,z};ghost.position.set(x+.5,y+.5,z+.5);ghost.visible=true;}
 if(hit.object!==ground){outline.position.copy(hit.object.position);outline.visible=true;}
}
function act(action){
 if(menu.open)return;target();if(!hit){toast('블록을 놓을 곳에 조금 더 가까이 가 주세요.');return;}
 if(action==='remove'){if(hit.object===ground){toast('베이스플레이트는 지워지지 않아요.');return;}scene.remove(hit.object);blocks.delete(hit.object.userData.id);$('#block-count').textContent=`설치 ${blocks.size}개`;return;}
 if(!placement){toast('이 위치에는 블록을 놓을 수 없어요.');return;}
 const {x,y,z}=placement;if(Math.abs(camera.position.x-(x+.5))<.8&&Math.abs(camera.position.y-(y+.5))<.8&&Math.abs(camera.position.z-(z+.5))<.8){toast('조금 물러나서 블록을 놓아 주세요.');return;}
 if(blocks.size>=5000){toast('최대 5,000개까지 설치할 수 있어요.');return;}addBlock(x,y,z,selected);
}
const clock=new THREE.Clock();let frames=0;
function animate(){
 const dt=Math.min(clock.getDelta(),.04);
 if(!menu.open){let x=Number(keys.has('KeyD'))-Number(keys.has('KeyA')),z=Number(keys.has('KeyS'))-Number(keys.has('KeyW')),y=Number(keys.has('Space'))-Number(keys.has('KeyQ'));const length=Math.hypot(x,y,z)||1;const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?18:8)*dt/length;
 camera.position.x=THREE.MathUtils.clamp(camera.position.x+(x*Math.cos(yaw)+z*Math.sin(yaw))*speed,-63.5,63.5);camera.position.z=THREE.MathUtils.clamp(camera.position.z+(-x*Math.sin(yaw)+z*Math.cos(yaw))*speed,-63.5,63.5);camera.position.y=THREE.MathUtils.clamp(camera.position.y+y*speed,1.7,75);}
 camera.rotation.set(pitch,yaw,0);target();renderer.render(scene,camera);
 if(frames++%15===0)$('#coordinates').textContent=`X ${camera.position.x.toFixed(0)} · Y ${camera.position.y.toFixed(0)} · Z ${camera.position.z.toFixed(0)}`;
 requestAnimationFrame(animate);
}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();$('#error').hidden=false;});
animate();
