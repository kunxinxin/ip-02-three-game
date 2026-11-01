// ============================================================
//  Three.js 农场战斗
//  特性：精细人物+手持工具+腿走路动画+丰富场景+昼夜+战斗+种植+商店
// ============================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 40, 90);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(10, 18, 16);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ---------- 灯光系统 ----------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.1);
sunLight.position.set(15, 30, 12);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(1024, 1024);
sunLight.shadow.camera.left = -30;
sunLight.shadow.camera.right = 30;
sunLight.shadow.camera.top = 30;
sunLight.shadow.camera.bottom = -30;
scene.add(sunLight);

const nightLight = new THREE.DirectionalLight(0x5577bb, 0);
nightLight.position.set(-10, 20, -10);
scene.add(nightLight);

// ============================================================
//  地面 + 道路
// ============================================================
const groundGeo = new THREE.PlaneGeometry(60, 60);
const groundMat = new THREE.MeshLambertMaterial({ color: 0x599b48 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// 十字主路
const roadMat = new THREE.MeshLambertMaterial({ color: 0xc2b280 });
const road1 = new THREE.Mesh(new THREE.PlaneGeometry(4, 60), roadMat);
road1.rotation.x = -Math.PI / 2;
road1.position.set(0, 0.01, 0);
scene.add(road1);
const road2 = new THREE.Mesh(new THREE.PlaneGeometry(60, 4), roadMat);
road2.rotation.x = -Math.PI / 2;
road2.position.set(0, 0.01, 0);
scene.add(road2);

// ============================================================
//  农田 6×6
// ============================================================
const farmSize = 6;
const farmTiles = [];
const tileDryMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
const tileWaterMat = new THREE.MeshLambertMaterial({ color: 0x5c3d22 });

const cropConfig = {
  wheatSeed:     { name: "小麦",   seedPrice: 5,  sellPrice: 15, growTotal: 40, color: 0xffd700 },
  tomatoSeed:    { name: "番茄",   seedPrice: 8,  sellPrice: 28, growTotal: 55, color: 0xff3333 },
  cornSeed:      { name: "玉米",   seedPrice: 12, sellPrice: 42, growTotal: 70, color: 0xffcc00 },
  strawberrySeed:{ name: "草莓",   seedPrice: 15, sellPrice: 65, growTotal: 90, color: 0xff4488 }
};

for (let x = 0; x < farmSize; x++) {
  farmTiles[x] = [];
  for (let z = 0; z < farmSize; z++) {
    const tile = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.3, 1.9),
      tileDryMat
    );
    tile.position.set(-8 + x * 2.1, 0.15, -8 + z * 2.1);
    tile.receiveShadow = true;
    tile.userData = {
      watered: false,
      waterTimer: 0,
      cropType: null,
      growTimer: 0,
      cropStage: -1,
      cropMesh: null
    };
    scene.add(tile);
    farmTiles[x][z] = tile;
  }
}

// ============================================================
//  场景生成工具函数：树、房屋、水井、池塘、围栏、石块
// ============================================================
const colliders = []; // 碰撞体 {x,z,radius}

function addCollider(x,z,radius){
  colliders.push({x,z,radius});
}

// 低模松树
function addTree(x, z, scale = 1) {
  const tree = new THREE.Group();
  const trunkGeo = new THREE.CylinderGeometry(0.2 * scale, 0.3 * scale, 1.2 * scale, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4423 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 0.6 * scale;
  trunk.castShadow = true;
  tree.add(trunk);

  const leafColors = [0x2e7d32, 0x388e3c, 0x4caf50];
  for (let i = 0; i < 3; i++) {
    const leafGeo = new THREE.ConeGeometry(0.9 * scale - i * 0.15, 1.4 * scale, 6);
    const leafMat = new THREE.MeshLambertMaterial({ color: leafColors[i] });
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.y = 1.4 * scale + i * 0.9 * scale;
    leaf.castShadow = true;
    tree.add(leaf);
  }
  tree.position.set(x, 0, z);
  scene.add(tree);
  addCollider(x,z, 1.4*scale);
}

// 木屋
function addHouse(x, z) {
  const house = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(4, 2.5, 3);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xc9a57b });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.25;
  body.castShadow = true;
  house.add(body);

  const roofGeo = new THREE.ConeGeometry(3.2, 1.5, 4);
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x8b2a2a });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 3.25;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  house.add(roof);

  const doorGeo = new THREE.BoxGeometry(0.8, 1.5, 0.2);
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x5a3a1b });
  const door = new THREE.Mesh(doorGeo, doorMat);
  door.position.set(0, 0.75, 1.51);
  house.add(door);
  house.position.set(x, 0, z);
  scene.add(house);
  addCollider(x,z,2.3);
}

// 水井
function addWell(x, z) {
  const well = new THREE.Group();
  const ringGeo = new THREE.CylinderGeometry(0.6, 0.65, 0.4, 12);
  const ringMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.2;
  well.add(ring);

  const waterGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 12);
  const waterMat = new THREE.MeshLambertMaterial({ color: 0x4fa8d8 });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.y = 0.45;
  well.add(water);
  well.position.set(x, 0, z);
  scene.add(well);
  addCollider(x,z,1.1);
}

// 池塘
function addPond(x, z, radius = 2) {
  const waterGeo = new THREE.CircleGeometry(radius, 16);
  const waterMat = new THREE.MeshLambertMaterial({ color: 0x4fa8d8 });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(x, 0.01, z);
  scene.add(water);
  // 岸边石头
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const rx = x + Math.cos(angle) * (radius + 0.3);
    const rz = z + Math.sin(angle) * (radius + 0.3);
    const stoneGeo = new THREE.DodecahedronGeometry(0.25, 0);
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x999999 });
    const stone = new THREE.Mesh(stoneGeo, stoneMat);
    stone.position.set(rx, 0.15, rz);
    stone.rotation.y = Math.random() * Math.PI;
    scene.add(stone);
  }
}

// 围栏
function addFence(startX, startZ, endX, endZ) {
  const dx = endX - startX;
  const dz = endZ - startZ;
  const len = Math.sqrt(dx * dx + dz * dz);
  const count = Math.floor(len / 1.2);
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const x = startX + dx * t;
    const z = startZ + dz * t;
    const postGeo = new THREE.BoxGeometry(0.2, 0.8, 0.2);
    const postMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(x, 0.4, z);
    post.castShadow = true;
    scene.add(post);
    addCollider(x,z,0.5);
  }
}

// 装饰石块
function addRock(x,z){
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.7,0),
    new THREE.MeshLambertMaterial({color:0x888888})
  )
  rock.position.set(x,0.4,z);
  rock.castShadow=true;
  scene.add(rock);
  addCollider(x,z,1);
}

// 批量摆放场景物件
addHouse(-12,8);
addWell(-14,-6);
addPond(10,8,2.5);
addTree(-10,14,1);
addTree(-6,14,0.9);
addTree(14,2,1.1);
addTree(14,-2,0.85);
addTree(6,-12,1);
addTree(-4,-12,0.95);
addTree(12,14,1);
addRock(4,12);
addRock(-14,4);
addRock(8,-10);
// 农场外围围栏
addFence(-12,-12,12,-12);
addFence(12,-12,12,12);
addFence(12,12,-12,12);
addFence(-12,12,-12,-12);

// ============================================================
//  🧑精细人物角色 + 右手绑定工具
// ============================================================
const player = new THREE.Group();
// 身体
const bodyGeo = new THREE.CapsuleGeometry(0.4, 1.2, 4, 8);
const bodyMat = new THREE.MeshLambertMaterial({ color: 0x4477ff });
const body = new THREE.Mesh(bodyGeo, bodyMat);
body.position.y = 1;
player.add(body);
// 头部
const headGeo = new THREE.SphereGeometry(0.35, 12, 12);
const headMat = new THREE.MeshLambertMaterial({ color: 0xffdbac });
const head = new THREE.Mesh(headGeo, headMat);
head.position.y = 1.9;
player.add(head);
// 头发
const hairGeo = new THREE.SphereGeometry(0.36, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
const hairMat = new THREE.MeshLambertMaterial({ color: 0x6b3410 });
const hair = new THREE.Mesh(hairGeo, hairMat);
hair.position.y = 2.05;
player.add(hair);
// 眼睛
const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
leftEye.position.set(-0.12, 1.95, 0.28);
player.add(leftEye);
const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
rightEye.position.set(0.12, 1.95, 0.28);
player.add(rightEye);
// 手臂
const armGeo = new THREE.BoxGeometry(0.12, 0.8, 0.12);
const armMat = new THREE.MeshLambertMaterial({ color: 0x4477ff });
const leftArm = new THREE.Mesh(armGeo, armMat);
leftArm.position.set(-0.55, 1.1, 0);
player.add(leftArm);
const rightArm = new THREE.Mesh(armGeo, armMat);
rightArm.position.set(0.55, 1.1, 0);
player.add(rightArm);
// 腿（单独拿出来做走路摆动动画）
const legGeo = new THREE.BoxGeometry(0.18, 0.6, 0.18);
const legMat = new THREE.MeshLambertMaterial({ color: 0x334466 });
const leftLeg = new THREE.Mesh(legGeo, legMat);
leftLeg.position.set(-0.2, 0.3, 0);
player.add(leftLeg);
const rightLeg = new THREE.Mesh(legGeo, legMat);
rightLeg.position.set(0.2, 0.3, 0);
player.add(rightLeg);

// ========== 右手挂载工具组 ==========
const rightHandGroup = new THREE.Group();
rightHandGroup.position.set(0.55, 1.2, 0);
player.add(rightHandGroup);
const toolSet = {};

// 锄头
const hoeGroup = new THREE.Group();
const hoeStick = new THREE.Mesh(new THREE.BoxGeometry(0.08,1.1,0.08), new THREE.MeshLambertMaterial({color:0x7b4a28}));
hoeStick.position.y=0.55;
const hoeHead = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.2,0.08), new THREE.MeshLambertMaterial({color:0x777777}));
hoeHead.position.set(0,1.1,0);
hoeGroup.add(hoeStick,hoeHead);
toolSet.hoe = hoeGroup;

// 长剑
const swordGroup = new THREE.Group();
const swordBlade = new THREE.Mesh(new THREE.BoxGeometry(0.12,1.2,0.08), new THREE.MeshLambertMaterial({color:0xd0d8ff}));
swordBlade.position.y=0.6;
const swordHilt = new THREE.Mesh(new THREE.BoxGeometry(0.25,0.15,0.15), new THREE.MeshLambertMaterial({color:0x552222}));
swordHilt.position.y=0;
swordGroup.add(swordBlade,swordHilt);
toolSet.sword = swordGroup;

// 浇水壶
const canGroup = new THREE.Group();
const canBody = new THREE.Mesh(new THREE.BoxGeometry(0.35,0.45,0.35), new THREE.MeshLambertMaterial({color:0x44aaff}));
canBody.position.y=0.22;
const canSpout = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.08,0.08), new THREE.MeshLambertMaterial({color:0x44aaff}));
canSpout.position.set(0.25,0.22,0);
canGroup.add(canBody,canSpout);
toolSet.water = canGroup;

// 全部加入右手容器，初始只显示锄头
rightHandGroup.add(toolSet.hoe, toolSet.sword, toolSet.water);
function switchTool(toolKey){
  Object.keys(toolSet).forEach(k=> toolSet[k].visible=false);
  toolSet[toolKey].visible=true;
  state.tool = toolKey;
  updateUI();
}


player.position.set(0, 0, 4);
scene.add(player);

// ============================================================
//  游戏状态
// ============================================================
const keys = {};
let actionLock = false;
let walkAnimTimer = 0;

const state = {
  money: 100,
  hp: 100,
  maxHp: 100,
  atk: 10,
  tool: "hoe",
  bag: {
    wheatSeed: 5,
    tomatoSeed: 3,
    cornSeed: 2,
    strawberrySeed: 1,
    potion: 1
  },
  day: 1,
  dayTime: 0,
  isNight: false,
  slimes: []
};

// switchTool("hoe");

// ============================================================
//  输入监听
// ============================================================
document.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === "1") switchTool("hoe");
  if (e.key === "2") switchTool("water");
  if (e.key === "3") switchTool("sword");
  if (e.key.toLowerCase() === "b") openShop();
  if (e.key.toLowerCase() === "h") usePotion();
});
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// 商店全局函数
window.buyItem = function (type) {
  if (type === "swordUp") {
    if (state.money >= 60) {
      state.money -= 60;
      state.atk += 8;
    }
    updateUI();
    return;
  }
  const prices = { wheatSeed:5, tomatoSeed:8, cornSeed:12, strawberrySeed:15, potion:20 };
  if (state.money >= prices[type]) {
    state.money -= prices[type];
    state.bag[type]++;
  } else {
    alert("金币不足！");
  }
  updateUI();
};
window.closeShop = function () {
  document.getElementById("shopPanel").style.display = "none";
};
function openShop() {
  if (!actionLock) {
    actionLock = true;
    document.getElementById("shopPanel").style.display = "block";
    setTimeout(() => actionLock = false, 250);
  }
}
function usePotion() {
  if (state.bag.potion > 0 && state.hp < state.maxHp) {
    state.bag.potion--;
    state.hp = Math.min(state.maxHp, state.hp + 40);
    updateUI();
  }
}

// ============================================================
//  农田交互
// ============================================================
function getNearestTile() {
  const px = player.position.x;
  const pz = player.position.z;
  for (let x = 0; x < farmSize; x++) {
    for (let z = 0; z < farmSize; z++) {
      const tile = farmTiles[x][z];
      const dx = px - tile.position.x;
      const dz = pz - tile.position.z;
      if (Math.sqrt(dx * dx + dz * dz) < 1.4) return tile;
    }
  }
  return null;
}

function plantCrop(tile, seedType) {
  tile.userData.cropType = seedType;
  tile.userData.growTimer = 0;
  tile.userData.cropStage = 0;
  const cfg = cropConfig[seedType];
  const crop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.4, 6),
    new THREE.MeshLambertMaterial({ color: 0x8b5a2b })
  );
  crop.position.copy(tile.position);
  crop.position.y += 0.4;
  crop.userData.stage = 0;
  tile.userData.cropMesh = crop;
  scene.add(crop);
  tile.material = tileWaterMat;
  tile.userData.watered = true;
  tile.userData.waterTimer = 180;
  updateUI();
}

function harvestCrop(tile) {
  const t = tile.userData;
  if (t.cropStage !== 2 || !t.cropMesh) return;
  const cfg = cropConfig[t.cropType];
  state.money += cfg.sellPrice;
  scene.remove(t.cropMesh);
  t.cropMesh = null;
  t.cropType = null;
  t.cropStage = -1;
  tile.material = tileDryMat;
  spawnHarvestParticles(tile.position);
  updateUI();
}

function waterTile(tile) {
  tile.userData.watered = true;
  tile.userData.waterTimer = 240;
  tile.material = tileWaterMat;
}

// ============================================================
//  史莱姆敌人（带眼睛细节）
// ============================================================
function spawnSlime() {
  const angle = Math.random() * Math.PI * 2;
  const dist = 18 + Math.random() * 6;
  const slime = new THREE.Group();
  const bodyGeo = new THREE.SphereGeometry(0.5,16,16);
  const bodyMat = new THREE.MeshLambertMaterial({ color:0x66bb6a });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y=0.5;
  body.scale.y=0.85;
  slime.add(body);
  // 眼睛
  const eyeGeo = new THREE.SphereGeometry(0.08,8,8);
  const eyeMat = new THREE.MeshBasicMaterial({color:0x000000});
  const sLeftEye = new THREE.Mesh(eyeGeo,eyeMat);
  sLeftEye.position.set(-0.15,0.55,0.4);
  slime.add(sLeftEye);
  const sRightEye = new THREE.Mesh(eyeGeo,eyeMat);
  sRightEye.position.set(0.15,0.55,0.4);
  slime.add(sRightEye);

  slime.position.set(
    Math.cos(angle) * dist,
    0,
    Math.sin(angle) * dist
  );
  slime.userData = {
    hp: 20,
    speed: 0.03 + Math.random() * 0.02,
    damage: 8,
    attackCd: 0
  };
  scene.add(slime);
  state.slimes.push(slime);
}

function playerAttack() {
  const range = 2.4;
  for (let i = state.slimes.length - 1; i >= 0; i--) {
    const s = state.slimes[i];
    const dx = s.position.x - player.position.x;
    const dz = s.position.z - player.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < range) {
      s.userData.hp -= state.atk;
      s.children[0].material.color.setHex(0xffffff);
      setTimeout(()=>{
        if(s.children[0]) s.children[0].material.color.setHex(0x66bb6a);
      },120);
      if (s.userData.hp <= 0) {
        state.money +=12;
        scene.remove(s);
        state.slimes.splice(i,1);
        updateUI();
      }
    }
  }
}

// ============================================================
//  收获粒子特效
// ============================================================
const particles = [];
function spawnHarvestParticles(position) {
  for (let i = 0; i < 10; i++) {
    const p = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.15, 0.15),
      new THREE.MeshLambertMaterial({ color: 0xffee55 })
    );
    p.position.copy(position);
    p.position.y += 1;
    p.userData = {
      vx: (Math.random() - 0.5) * 0.3,
      vy: 0.15 + Math.random() * 0.2,
      vz: (Math.random() - 0.5) * 0.3,
      life: 60
    };
    scene.add(p);
    particles.push(p);
  }
}
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.position.x += p.userData.vx;
    p.position.y += p.userData.vy;
    p.position.z += p.userData.vz;
    p.userData.vy -= 0.01;
    p.userData.life--;
    if (p.userData.life <= 0) {
      scene.remove(p);
      particles.splice(i, 1);
    }
  }
}

// ============================================================
//  碰撞检测
// ============================================================
function collidesAt(x, z) {
  for (const c of colliders) {
    const dx = x - c.x;
    const dz = z - c.z;
    if (Math.sqrt(dx * dx + dz * dz) < c.radius + 0.45) return true;
  }
  return false;
}

// ============================================================
//  UI更新
// ============================================================
function updateUI() {
  document.getElementById("money").innerText = state.money;
  document.getElementById("hp").innerText = Math.max(0, Math.floor(state.hp));
  document.getElementById("maxHp").innerText = state.maxHp;
  const toolNameMap = {hoe:"锄头",water:"水壶",sword:"长剑"};
  document.getElementById("currentTool").innerText = toolNameMap[state.tool];
  document.getElementById("bag").innerText =
    `小麦${state.bag.wheatSeed} 番茄${state.bag.tomatoSeed} 玉米${state.bag.cornSeed} 草莓${state.bag.strawberrySeed} 药水${state.bag.potion}`;
  document.getElementById("dayText").innerText =
    `第 ${state.day} 天 ${state.isNight ? "夜晚" : "白天"}`;
  document.getElementById("atkStat").innerText = state.atk;
  document.getElementById("slimeCount").innerText = state.slimes.length;
}

// ============================================================
//  主循环
// ============================================================
function animate() {
  requestAnimationFrame(animate);
  const moveSpeed = 0.11;
  let mx = 0, mz = 0;
  if (keys["w"]) mz -= 1;
  if (keys["s"]) mz += 1;
  if (keys["a"]) mx -= 1;
  if (keys["d"]) mx += 1;

  const len = Math.sqrt(mx * mx + mz * mz);
  let isMoving = false;
  if (len > 0) {
    isMoving = true;
    mx /= len;
    mz /= len;
    const nx = player.position.x + mx * moveSpeed;
    const nz = player.position.z + mz * moveSpeed;
    if (!collidesAt(nx, player.position.z)) player.position.x = nx;
    if (!collidesAt(player.position.x, nz)) player.position.z = nz;
    player.rotation.y = Math.atan2(mx, mz);
  }

  // ✅ 双腿走路摆动动画
  walkAnimTimer += isMoving ? 0.22 : 0;
  const legSwing = Math.sin(walkAnimTimer) * 0.22;
  leftLeg.rotation.x = legSwing;
  rightLeg.rotation.x = -legSwing;

  // 空格交互：播种/收割
  if (keys[" "] && !actionLock) {
    actionLock = true;
    const tile = getNearestTile();
    if (tile) {
      const t = tile.userData;
      if (state.tool === "hoe") {
        if (t.cropStage === -1) {
          // 按优先级播种
          if(state.bag.wheatSeed>0){state.bag.wheatSeed--;plantCrop(tile,"wheatSeed");}
          else if(state.bag.tomatoSeed>0){state.bag.tomatoSeed--;plantCrop(tile,"tomatoSeed");}
          else if(state.bag.cornSeed>0){state.bag.cornSeed--;plantCrop(tile,"cornSeed");}
          else if(state.bag.strawberrySeed>0){state.bag.strawberrySeed--;plantCrop(tile,"strawberrySeed");}
        } else {
          harvestCrop(tile);
        }
      }
    }
    setTimeout(() => actionLock = false, 280);
  }

  // E浇水
  if (keys["e"] && !actionLock) {
    actionLock = true;
    const tile = getNearestTile();
    if (tile) waterTile(tile);
    setTimeout(() => actionLock = false, 250);
  }

  // J攻击
  if (keys["j"] && !actionLock) {
    actionLock = true;
    playerAttack();
    setTimeout(() => actionLock = false, 350);
  }

  // 作物生长 & 土地变干
  for (let x = 0; x < farmSize; x++) {
    for (let z = 0; z < farmSize; z++) {
      const tile = farmTiles[x][z];
      const t = tile.userData;
      if (t.watered) {
        t.waterTimer--;
        if (t.waterTimer <= 0) {
          t.watered = false;
          tile.material = tileDryMat;
        }
      }
      if (t.cropStage >= 0 && t.cropStage < 2 && t.cropMesh) {
        const cfg = cropConfig[t.cropType];
        const rate = t.watered ? 0.04 : 0.013;
        t.growTimer += rate;
        if (t.growTimer >= cfg.growTotal) {
          t.cropStage++;
          t.growTimer = 0;
          t.cropMesh.scale.set(1.6, 1.6, 1.6);
          t.cropMesh.material.color.setHex(cfg.color);
        } else if (t.cropStage === 0 && t.growTimer > cfg.growTotal / 2) {
          t.cropStage = 1;
          t.cropMesh.scale.set(1.3, 1.3, 1.3);
          t.cropMesh.material.color.setHex(0x72b947);
        }
      }
    }
  }

  // 史莱姆AI追踪+受伤判定
  for (const s of state.slimes) {
    const dx = player.position.x - s.position.x;
    const dz = player.position.z - s.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 1.2) {
      s.position.x += (dx / dist) * s.userData.speed;
      s.position.z += (dz / dist) * s.userData.speed;
    }
    s.userData.attackCd--;
    if (dist < 1.4 && s.userData.attackCd <= 0) {
      state.hp -= s.userData.damage;
      s.userData.attackCd = 60;
      updateUI();
      document.getElementById("damageOverlay").style.background = "rgba(255,0,0,.35)";
      setTimeout(() => {
        document.getElementById("damageOverlay").style.background = "rgba(255,0,0,0)";
      }, 180);
      if (state.hp <= 0) {
        state.hp = 0;
        setTimeout(() => {
          state.hp = state.maxHp;
          player.position.set(0, 0, 4);
          updateUI();
        }, 1200);
      }
    }
  }

  // 随机生成史莱姆，最多6只
  if (Math.random() < 0.008 && state.slimes.length < 6) {
    spawnSlime();
  }

  // 昼夜循环
  state.dayTime += 0.003;
  const cycle = state.dayTime % 120;
  if (cycle > 60 && !state.isNight) {
    state.isNight = true;
    scene.background = new THREE.Color(0x1a2540);
    scene.fog.color.setHex(0x1a2540);
    ambientLight.intensity = 0.25;
    nightLight.intensity = 0.5;
  } else if (cycle <= 60 && state.isNight) {
    state.isNight = false;
    state.day++;
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog.color.setHex(0x87ceeb);
    ambientLight.intensity = 0.65;
    nightLight.intensity = 0;
  }

  // 平滑斜45°相机跟随
  const targetCamX = player.position.x + 10;
  const targetCamZ = player.position.z + 12;
  camera.position.x += (targetCamX - camera.position.x) * 0.04;
  camera.position.z += (targetCamZ - camera.position.z) * 0.04;
  camera.lookAt(player.position.x, 0, player.position.z);

  updateParticles();
  updateUI();
  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});