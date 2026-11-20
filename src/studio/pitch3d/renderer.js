import * as THREE from "three";

const X = x => (x - 50) * 1.05;
const Z = y => (y - 50) * 0.68;
const material = color => new THREE.MeshStandardMaterial({ color, roughness: 0.83 });

export function createRenderer(host, roster, onHover, onSelect, onFailure) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x09120f);
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const sphere = new THREE.SphereGeometry(1, 10, 8);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 8);
  const ownedMaterials = new Set();
  const ownedGeometries = new Set([box, sphere, cylinder]);
  const textures = [];
  const mat = color => { const m = material(color); ownedMaterials.add(m); return m; };
  const mesh = (parent, geo, m, x, y, z, sx, sy, sz) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z); o.scale.set(sx, sy, sz);
    parent.add(o); return o;
  };
  scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x304b2e, 2.4));
  const sun = new THREE.DirectionalLight(0xfff6df, 2.1);
  sun.position.set(-20, 70, 35); scene.add(sun);
  const grass = [mat(0x31754b), mat(0x388054)];
  for (let i=0;i<10;i++) mesh(scene, box, grass[i%2], -47.25+i*10.5,-0.21,0,10.5,0.35,68);
  // Original procedural stadium: dark stands and instanced spectator silhouettes.
  // Decorative only, not match data or footage.
  const concourse=mat(0x182820), terrace=mat(0x26342f);
  mesh(scene,box,concourse,0,-0.48,0,142,0.45,103);
  const crowdGeo=new THREE.BoxGeometry(0.65,0.9,0.55);
  ownedGeometries.add(crowdGeo);
  const crowdMat=mat(0xffffff);
  const seats=[];
  for(let row=0;row<7;row++){
    const y=0.35+row*0.62;
    const z=-39-row*1.65;
    mesh(scene,box,terrace,0,y-0.42,z,133,0.75,1.7);
    for(let i=0;i<100;i++)seats.push([i*1.28-63.36,y+0.45,z,row,i]);
    for(const side of [-1,1]){
      const x=side*(57+row*1.55);
      mesh(scene,box,terrace,x,y-0.42,0,1.6,0.75,77);
      for(let i=0;i<57;i++)seats.push([x,y+0.45,i*1.3-36.4,row,i+side*7]);
    }
  }
  const crowd=new THREE.InstancedMesh(crowdGeo,crowdMat,seats.length);
  const dummy=new THREE.Object3D(), tint=new THREE.Color();
  const crowdColors=[0x263a3e,0x45534c,0x5b6056,0x303c4c,0x4d4140,0x374b43];
  seats.forEach(([x,y,z,row,i],n)=>{
    const hash=Math.abs(i*31+row*17);
    dummy.position.set(x,y+(hash%5)*0.055,z);
    dummy.scale.set(0.82+(hash%3)*0.08,0.85+(hash%4)*0.09,1);
    dummy.updateMatrix();crowd.setMatrixAt(n,dummy.matrix);
    crowd.setColorAt(n,tint.setHex(crowdColors[hash%crowdColors.length]));
  });
  crowd.instanceMatrix.needsUpdate=true;
  if(crowd.instanceColor)crowd.instanceColor.needsUpdate=true;
  scene.add(crowd);
  const paint = mat(0xe8f4de);
  const stripe = (x,z,w,d) => mesh(scene,box,paint,x,0.015,z,w,0.035,d);
  stripe(0,-34,105,0.20); stripe(0,34,105,0.20);
  stripe(-52.5,0,0.20,68); stripe(52.5,0,0.20,68); stripe(0,0,0.17,68);
  const g = new THREE.RingGeometry(9.05,9.23,64);
  ownedGeometries.add(g);
  const ring = mesh(scene,g,paint,0,0.05,0,1,1,1); ring.rotation.x=-Math.PI/2;
  mesh(scene,sphere,paint,0,0.05,0,0.23,0.06,0.23);
  const goalMat=mat(0xffffff);
  for(const side of [-1,1]){
    const edge=side*52.5;
    for(const [depth,width] of [[16.5,40.3],[5.5,18.3]]){
      stripe(edge-side*depth,0,0.18,width);
      stripe(edge-side*depth/2,-width/2,depth,0.18);
      stripe(edge-side*depth/2,width/2,depth,0.18);
    }
    for(const z of [-3.66,3.66]) mesh(scene,box,goalMat,edge,1.22,z,0.12,2.44,0.12);
    mesh(scene,box,goalMat,edge,2.44,0,0.13,0.13,7.44);
    for(let z=-3.6;z<=3.61;z+=0.6) mesh(scene,box,goalMat,edge+side*1.9,1.15,z,0.025,2.3,0.025);
    for(let y=0.3;y<=2.31;y+=0.4) mesh(scene,box,goalMat,edge+side*1.9,y,0,0.025,0.025,7.32);
    for(const z of [-3.66,3.66]) mesh(scene,box,goalMat,edge+side*0.95,0.08,z,1.9,0.08,0.08);
  }
  const skinColors=[0xc99872,0x875337,0xe3b58a,0x5d382b];
  const dark=mat(0x17202b), white=mat(0xf5f3ed);
  const models=new Map(), targets=[];
  const numberSprite=(number)=>{
    const c=document.createElement("canvas");c.width=64;c.height=64;
    const ctx=c.getContext("2d");
    if(!ctx) return null;
    ctx.fillStyle="#15202b";ctx.beginPath();ctx.roundRect(4,4,56,56,13);ctx.fill();
    ctx.fillStyle="#ffffff";ctx.font="bold 38px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(String(number),32,34);
    const tex=new THREE.CanvasTexture(c);textures.push(tex);
    const m=new THREE.SpriteMaterial({map:tex,depthTest:false});ownedMaterials.add(m);
    const sprite=new THREE.Sprite(m);sprite.scale.set(2.1,2.1,1);sprite.position.y=4.7;return sprite;
  };
  let index=0;
  for(const entry of roster.values()){
    const {player,team,side}=entry;
    const kit=mat(player.position==="GK"?(side==="home"?0xfacc15:0x16a34a):team.color);
    const skin=mat(skinColors[index++%skinColors.length]);
    const root=new THREE.Group();root.userData.playerId=player.id;root.scale.setScalar(1.4);scene.add(root);
    const torso=new THREE.Group();root.add(torso);torso.position.y=1.87;
    mesh(torso,box,kit,0,0.38,0,0.78,0.86,0.43);
    mesh(torso,box,dark,0,-0.20,0,0.70,0.34,0.43);
    mesh(torso,sphere,skin,0,1.05,0,0.32,0.37,0.31);
    mesh(torso,sphere,dark,0,1.28,-0.06,0.31,0.16,0.29);
    const legs=[],arms=[];
    for(const s of [-1,1]){
      const leg=new THREE.Group();leg.position.set(s*0.20,1.69,0);root.add(leg);legs.push(leg);
      mesh(leg,cylinder,skin,0,-0.36,0,0.13,0.73,0.13);
      mesh(leg,cylinder,white,0,-0.99,0,0.12,0.55,0.12);
      mesh(leg,box,dark,0,-1.33,0.12,0.26,0.20,0.47);
      const arm=new THREE.Group();arm.position.set(s*0.47,2.53,0);root.add(arm);arms.push(arm);
      mesh(arm,cylinder,kit,0,-0.15,0,0.15,0.31,0.15);
      mesh(arm,cylinder,skin,0,-0.49,0,0.10,0.45,0.10);
    }
    const label=numberSprite(player.shirtNumber);if(label)root.add(label);
    const shadow=mesh(root,sphere,mat(0x24452f),0,0.01,0,0.65,0.025,0.48);
    const hit=new THREE.Mesh(sphere,new THREE.MeshBasicMaterial({visible:false}));ownedMaterials.add(hit.material);
    hit.position.y=1.6;hit.scale.set(0.85,1.7,0.9);hit.userData.playerId=player.id;root.add(hit);targets.push(hit);
    models.set(player.id,{root,torso,legs,arms,shadow});
  }
  const ball=mesh(scene,sphere,white,0,0.22,0,0.37,0.37,0.37);
  const ballStripe=mesh(ball,box,dark,0.02,0.1,0,0.69,0.11,1.02);
  ball.visible=false;
  const ray=new THREE.Raycaster(), pointer=new THREE.Vector2();
  let destroyed=false,hovered=null,view="broadcast",zoom=1;
  let lastFrame=null,lastActive=null;
  const aim=()=>{
    const aspect=camera.aspect;
    const distance=Math.max(1,1.57/aspect)/zoom;
    if(view==="overhead"){camera.position.set(0,140*distance,0.05);camera.up.set(0,0,-1);}
    else{camera.position.set(0,91*distance,80*distance);camera.up.set(0,1,0);}
    camera.lookAt(0,0,0);camera.updateProjectionMatrix();
  };
  const draw=()=>{if(!destroyed)renderer.render(scene,camera);};
  const resize=()=>{
    if(destroyed)return;
    const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
    renderer.setSize(w,h,false);camera.aspect=w/h;aim();draw();
  };
  const observer=new ResizeObserver(resize);observer.observe(host);
  resize();
  const pick=e=>{
    const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return null;
    pointer.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);
    ray.setFromCamera(pointer,camera);
    return ray.intersectObjects(targets,false)[0]?.object.userData.playerId??null;
  };
  const move=e=>{if(e.pointerType==="touch")return;const id=pick(e);if(id!==hovered){hovered=id;onHover(id);canvas.style.cursor=id?"pointer":"default";}};
  const leave=()=>{hovered=null;onHover(null);};
  const click=e=>onSelect(pick(e));
  const lost=e=>{e.preventDefault();onFailure();};
  canvas.addEventListener("pointermove",move);canvas.addEventListener("pointerleave",leave);canvas.addEventListener("click",click);canvas.addEventListener("webglcontextlost",lost);
  function render(frame,active){
    lastFrame=frame;lastActive=active;
    for(const p of frame.players){
      const m=models.get(p.id);if(!m)continue;
      const {root,torso,legs,arms}=m;
      root.position.set(X(p.x),0,Z(p.y));root.rotation.y=p.facing;
      const kicking=p.action==="pass"||p.action==="shot";
      const challenging=p.action==="tackle"||p.action==="pressure";
      const stride=p.action==="run"?Math.sin(p.stride)*0.65:0;
      const pulse=Math.sin(Math.PI*p.actionProgress);
      torso.rotation.x=challenging?0.36*pulse:p.action==="run"?0.10:0;
      torso.position.y=1.87+(p.action==="run"?Math.abs(Math.sin(p.stride))*0.10:0);
      legs[0].rotation.x=kicking?-1.25*pulse:challenging?0.55*pulse:stride;
      legs[1].rotation.x=kicking?0.15:challenging?-0.65*pulse:-stride;
      arms[0].rotation.x=-stride;arms[1].rotation.x=stride;
      arms[0].rotation.z=challenging?0.6*pulse:0.14;arms[1].rotation.z=challenging?-0.6*pulse:-0.14;
      m.shadow.scale.set(p.id===active?0.99:0.65,0.025,p.id===active?0.78:0.48);
    }
    ball.visible=!!frame.ball;
    if(frame.ball){ball.position.set(X(frame.ball.x),frame.ball.height,Z(frame.ball.y));ball.rotation.set(frame.time*2,0,frame.time*3);ballStripe.visible=true;}
    draw();
  }
  return {
    render,
    setView(next,nextZoom){view=next;zoom=nextZoom;aim();if(lastFrame)render(lastFrame,lastActive);else draw();},
    project(id){const m=models.get(id);if(!m)return null;const v=new THREE.Vector3(0,4.4,0);m.root.localToWorld(v);v.project(camera);return {x:(v.x+1)*50,y:(1-v.y)*50};},
    dispose(){if(destroyed)return;destroyed=true;observer.disconnect();canvas.removeEventListener("pointermove",move);canvas.removeEventListener("pointerleave",leave);canvas.removeEventListener("click",click);canvas.removeEventListener("webglcontextlost",lost);for(const g of ownedGeometries)g.dispose();for(const m of ownedMaterials)m.dispose();for(const t of textures)t.dispose();crowd.dispose();renderer.dispose();canvas.remove();}
  };
}
