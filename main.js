const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

// ===== PLAYER =====
let player = {
  x: canvas.width / 2,
  y: canvas.height - 110,
  w: 16,
  h: 16,
  speed: 4,
  energy: 100,
  boosting: false,
  hitTimer: 0
};

// ===== INPUT =====
let keys = {};
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

// ===== WORLD =====
let worldSpeed = 0.0015;
let score = 0;
let gameOver = false;

let flowOffset = 0;
let terrainOffset = 0;

// ===== EFFECTS =====
let splashes = [];
let streaks = Array.from({length: 36}).map(()=>({x:Math.random(), z:Math.random()}));

// ===== OBSTACLES =====
let obstacles = [];
let obstacleTypes = ["butt","paper","trash"];

// ===== DRAINS (PORTALS) =====
let drains = [];

// ===== CURRENT LANES (gentle) =====
let lanes = [
  {offset: -0.35, strength: 0.35},
  {offset:  0.35, strength: -0.35}
];

// ===== HELPERS =====
function getFlowX(z){
  return Math.sin(flowOffset + z*5) * 130; // wider stream
}

function getTerrainY(z){
  return Math.sin(terrainOffset + z*4) * 28;
}

function projectY(z){
  return 160 + (canvas.height - 160) * z; // closer camera
}

function checkCollision(px,py,pw,ph, ox,oy,os){
  return (px < ox+os && px+pw > ox && py < oy+os && py+ph > oy);
}

function spawnObstacle(){
  obstacles.push({
    lane: Math.random(),
    z: 0.05,
    type: obstacleTypes[Math.floor(Math.random()*3)],
    size: 6
  });
}

function spawnDrain(){
  if(Math.random() < 0.0025){
    drains.push({
      z: 0.15,
      type: Math.random() > 0.5 ? "boost" : "trap",
      spin: 0
    });
  }
}

// ===== UPDATE =====
function update(){
  if(gameOver){
    if(keys["Enter"]) resetGame();
    return;
  }

  // steer
  if(keys["ArrowLeft"])  player.x -= player.speed;
  if(keys["ArrowRight"]) player.x += player.speed;

  // throttle
  if(keys["ArrowUp"])   worldSpeed += 0.0001;
  if(keys["ArrowDown"]) worldSpeed -= 0.0001;

  // boost
  if(keys["Shift"] && player.energy > 0){
    player.boosting = true;
    worldSpeed += 0.0005;
    player.energy -= 1;
  } else {
    player.boosting = false;
    player.energy += 0.3;
  }

  worldSpeed = Math.max(0.001, Math.min(0.004, worldSpeed));
  player.energy = Math.max(0, Math.min(100, player.energy));

  // advance world
  flowOffset += worldSpeed*2;
  terrainOffset += worldSpeed*1.5;

  let center = canvas.width/2;

  // gentle current lanes (don’t overpower)
  lanes.forEach(l=>{
    let laneX = center + l.offset*220;
    let d = player.x - laneX;
    if(Math.abs(d) < 90){
      player.x += l.strength;
    }
  });

  // follow stream slightly
  let flowCenter = center + getFlowX(0.9);
  player.x += (flowCenter - player.x)*0.015;

  // bounds
  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));

  // spawn
  if(Math.random() < 0.007) spawnObstacle();
  spawnDrain();

  // update obstacles
  obstacles.forEach(o=> o.z += worldSpeed*1.8);
  obstacles = obstacles.filter(o=> o.z < 1.2);

  // update drains
  drains.forEach(d=>{
    d.z += worldSpeed*1.6;
    d.spin += 0.12;
  });
  drains = drains.filter(d=> d.z < 1.2);

  // collisions: obstacles
  obstacles.forEach(o=>{
    let x = center + getFlowX(o.z) + (o.lane-0.5)*160*o.z;
    let y = projectY(o.z) + getTerrainY(o.z);
    let size = o.size * (0.6 + o.z*4);

    if(checkCollision(player.x, player.y, player.w, player.h, x-size/2, y-size/2, size)){
      player.hitTimer = 10;
      player.energy -= 20;
      worldSpeed *= 0.7;
      splashes.push({x,y,life:18});
    }
  });

  // collisions: drains (portals)
  drains.forEach(d=>{
    let x = center + getFlowX(d.z);
    let y = projectY(d.z) + getTerrainY(d.z);

    if(Math.abs(player.x - x) < 18 && Math.abs(player.y - y) < 18){
      if(d.type === "boost"){
        worldSpeed *= 1.5; // forward feel
      } else {
        worldSpeed *= 0.65; // setback feel
      }
      d.z = 2; // consume
      splashes.push({x,y,life:24});
    }
  });

  if(player.hitTimer>0) player.hitTimer--;
  if(player.energy<=0) gameOver = true;

  // streaks
  streaks.forEach(s=>{
    s.z += worldSpeed;
    if(s.z>1){ s.z=0; s.x=Math.random(); }
  });

  // splashes
  splashes.forEach(s=> s.life--);
  splashes = splashes.filter(s=> s.life>0);

  score += worldSpeed*10;
}

// ===== DRAW =====
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  let center = canvas.width/2;

  // bg
  let g = ctx.createLinearGradient(0,0,0,canvas.height);
  g.addColorStop(0,"#bfe6ff");
  g.addColorStop(1,"#eafaff");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // ===== PATH CURBS (restored) =====
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 3;

  // left curb
  ctx.beginPath();
  let sx = center + getFlowX(0);
  let sy = projectY(0) + getTerrainY(0);
  ctx.moveTo(sx-80, sy);
  for(let z=0; z<1; z+=0.02){
    let x = center + getFlowX(z);
    let y = projectY(z) + getTerrainY(z);
    ctx.lineTo(x - 80*z, y);
  }
  ctx.stroke();

  // right curb
  ctx.beginPath();
  ctx.moveTo(sx+80, sy);
  for(let z=0; z<1; z+=0.02){
    let x = center + getFlowX(z);
    let y = projectY(z) + getTerrainY(z);
    ctx.lineTo(x + 80*z, y);
  }
  ctx.stroke();

  // ===== FLOW STREAKS =====
  streaks.forEach(s=>{
    let x = center + getFlowX(s.z) + (s.x-0.5)*140*s.z;
    let y = projectY(s.z) + getTerrainY(s.z);
    ctx.strokeStyle = "rgba(0,0,0,0.05)";
    ctx.beginPath();
    ctx.moveTo(x,y);
    ctx.lineTo(x,y+12+s.z*18);
    ctx.stroke();
  });

  // ===== DRAINS (grate + swirl) =====
  drains.forEach(d=>{
    let x = center + getFlowX(d.z);
    let y = projectY(d.z) + getTerrainY(d.z);

    ctx.strokeStyle = d.type==="boost" ? "green" : "red";

    // swirl arcs
    for(let i=0;i<3;i++){
      ctx.beginPath();
      ctx.arc(x,y,10+i*4, d.spin, d.spin+Math.PI*1.5);
      ctx.stroke();
    }

    // grate lines
    ctx.beginPath();
    ctx.moveTo(x-10,y); ctx.lineTo(x+10,y);
    ctx.moveTo(x,y-10); ctx.lineTo(x,y+10);
    ctx.stroke();
  });

  // ===== OBSTACLES =====
  obstacles.forEach(o=>{
    let x = center + getFlowX(o.z) + (o.lane-0.5)*160*o.z;
    let y = projectY(o.z) + getTerrainY(o.z);
    let size = o.size * (0.6 + o.z*4);

    if(o.type==="butt") ctx.fillStyle="#c2a36b";
    else if(o.type==="paper") ctx.fillStyle="#fff";
    else ctx.fillStyle="#333";

    ctx.fillRect(x-size/2,y-size/2,size,size);
  });

  // ===== SPLASHES =====
  splashes.forEach(s=>{
    ctx.fillStyle="rgba(0,150,255,0.4)";
    ctx.beginPath();
    ctx.arc(s.x,s.y,10-s.life/2,0,Math.PI*2);
    ctx.fill();
  });

  // ===== BOOST TRAIL (restored) =====
  for(let i=0;i<3;i++){
    ctx.strokeStyle = player.boosting
      ? `rgba(255,140,0,${0.3 - i*0.1})`
      : `rgba(0,200,255,${0.3 - i*0.1})`;
    ctx.lineWidth = 6 - i*2;
    ctx.beginPath();
    ctx.moveTo(player.x+player.w/2, player.y);
    ctx.lineTo(player.x+player.w/2, player.y+40+i*10);
    ctx.stroke();
  }

  // ===== PLAYER (black square restored) =====
  ctx.fillStyle = player.hitTimer>0 ? "red" : "black";
  ctx.fillRect(player.x, player.y, player.w, player.h);

  // ===== UI =====
  ctx.fillStyle="black";
  ctx.fillRect(20,40,100,10);

  ctx.fillStyle=player.boosting ? "orange":"cyan";
  ctx.fillRect(20,40,player.energy,10);

  ctx.fillStyle="black";
  ctx.font="16px Arial";
  ctx.fillText("Score: "+Math.floor(score),20,30);
  ctx.fillText("Speed: "+worldSpeed.toFixed(4),20,60);

  if(gameOver){
    ctx.font="28px Arial";
    ctx.fillText("GAME OVER", canvas.width/2-90, canvas.height/2);
    ctx.font="16px Arial";
    ctx.fillText("Press Enter to Restart", canvas.width/2-110, canvas.height/2+30);
  }
}

// ===== RESET =====
function resetGame(){
  player.x = canvas.width/2;
  worldSpeed = 0.0015;
  score = 0;
  obstacles = [];
  drains = [];
  splashes = [];
  gameOver = false;
}

// ===== LOOP =====
function loop(){
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();
