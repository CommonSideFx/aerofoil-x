const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

// PLAYER
let player = {
  x: canvas.width / 2,
  y: canvas.height - 110,
  width: 16,
  height: 16,
  speed: 4,
  energy: 100,
  boosting: false,
  hitTimer: 0
};

// INPUT
let keys = {};
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

// WORLD
let worldSpeed = 0.0015;
let score = 0;
let gameOver = false;

let flowOffset = 0;
let terrainOffset = 0;

// 🌊 CURRENT LANES
let lanes = [
  { offset: -0.3, strength: 0.6 },
  { offset: 0.3, strength: -0.6 }
];

// 🌊 FLOW STREAKS
let streaks = Array.from({ length: 40 }).map(() => ({
  x: Math.random(),
  z: Math.random()
}));

// 🌀 DRAINS
let drains = [];

// OBSTACLES
let obstacles = [];
let types = ["butt", "paper", "trash"];

// EFFECTS
let splashes = [];

// HELPERS
function getFlowX(z) {
  return Math.sin(flowOffset + z * 5) * 140; // wider
}

function getTerrainY(z) {
  return Math.sin(terrainOffset + z * 4) * 25;
}

function projectY(z) {
  return 180 + (canvas.height - 180) * z; // closer camera
}

function spawnObstacle() {
  obstacles.push({
    x: Math.random(),
    z: 0.05,
    type: types[Math.floor(Math.random() * 3)],
    size: 6
  });
}

function spawnDrain() {
  if (Math.random() < 0.003) {
    drains.push({
      z: 0.2,
      type: Math.random() > 0.5 ? "boost" : "trap",
      spin: 0
    });
  }
}

function checkCollision(px, py, pw, ph, ox, oy, os) {
  return px < ox+os && px+pw > ox && py < oy+os && py+ph > oy;
}

// UPDATE
function update() {
  if (gameOver) {
    if (keys["Enter"]) resetGame();
    return;
  }

  // steering
  if (keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;

  // throttle
  if (keys["ArrowUp"]) worldSpeed += 0.0001;
  if (keys["ArrowDown"]) worldSpeed -= 0.0001;

  // boost
  if (keys["Shift"] && player.energy > 0) {
    player.boosting = true;
    worldSpeed += 0.0006;
    player.energy -= 1;
  } else {
    player.boosting = false;
    player.energy += 0.3;
  }

  worldSpeed = Math.max(0.001, Math.min(0.004, worldSpeed));
  player.energy = Math.max(0, Math.min(100, player.energy));

  flowOffset += worldSpeed * 2;
  terrainOffset += worldSpeed * 1.5;

  let center = canvas.width / 2;

  // 🌊 CURRENT FORCE (this is the magic)
  lanes.forEach(lane => {
    let laneX = center + lane.offset * 200;
    let dist = player.x - laneX;

    if (Math.abs(dist) < 80) {
      player.x += lane.strength;
    }
  });

  // flow pull
  let flowCenter = center + getFlowX(0.9);
  player.x += (flowCenter - player.x) * 0.015;

  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));

  // spawn
  if (Math.random() < 0.008) spawnObstacle();
  spawnDrain();

  // update obstacles
  obstacles.forEach(o => o.z += worldSpeed * 1.8);
  obstacles = obstacles.filter(o => o.z < 1.2);

  // update drains
  drains.forEach(d => {
    d.z += worldSpeed * 1.5;
    d.spin += 0.1;
  });
  drains = drains.filter(d => d.z < 1.2);

  // collisions
  obstacles.forEach(o => {
    let x = center + getFlowX(o.z) + (o.x - 0.5) * 160 * o.z;
    let y = projectY(o.z) + getTerrainY(o.z);
    let size = o.size * (0.5 + o.z * 4);

    if (checkCollision(player.x, player.y, player.width, player.height, x-size/2, y-size/2, size)) {
      player.hitTimer = 10;
      player.energy -= 20;
      worldSpeed *= 0.7;
      splashes.push({ x, y, life: 20 });
    }
  });

  drains.forEach(d => {
    let x = center + getFlowX(d.z);
    let y = projectY(d.z) + getTerrainY(d.z);

    if (Math.abs(player.x - x) < 20 && Math.abs(player.y - y) < 20) {
      worldSpeed *= d.type === "boost" ? 1.4 : 0.6;
      d.z = 2;
    }
  });

  // streaks
  streaks.forEach(s => {
    s.z += worldSpeed;
    if (s.z > 1) {
      s.z = 0;
      s.x = Math.random();
    }
  });

  splashes.forEach(s => s.life--);
  splashes = splashes.filter(s => s.life > 0);

  score += worldSpeed * 10;
}

// DRAW
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let center = canvas.width / 2;

  // background
  let g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, "#bfe6ff");
  g.addColorStop(1, "#eafaff");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 🌊 FLOW STREAKS
  streaks.forEach(s => {
    let x = center + getFlowX(s.z) + (s.x - 0.5) * 140 * s.z;
    let y = projectY(s.z) + getTerrainY(s.z);

    ctx.strokeStyle = "rgba(0,0,0,0.05)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 10 + s.z * 20);
    ctx.stroke();
  });

  // 🌀 DRAINS
  drains.forEach(d => {
    let x = center + getFlowX(d.z);
    let y = projectY(d.z) + getTerrainY(d.z);

    ctx.strokeStyle = d.type === "boost" ? "green" : "red";

    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(x, y, 8 + i * 4, d.spin, d.spin + Math.PI * 1.5);
      ctx.stroke();
    }
  });

  // OBSTACLES
  obstacles.forEach(o => {
    let x = center + getFlowX(o.z) + (o.x - 0.5) * 160 * o.z;
    let y = projectY(o.z) + getTerrainY(o.z);
    let size = o.size * (0.5 + o.z * 4);

    ctx.fillStyle = o.type === "paper" ? "#fff" : "#333";
    ctx.fillRect(x-size/2, y-size/2, size, size);
  });

  // SPLASH
  splashes.forEach(s => {
    ctx.fillStyle = "rgba(0,150,255,0.4)";
    ctx.beginPath();
    ctx.arc(s.x, s.y, 10 - s.life/2, 0, Math.PI * 2);
    ctx.fill();
  });

  // PLAYER
  ctx.fillStyle = player.hitTimer > 0 ? "red" : "black";
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // UI
  ctx.fillStyle = "black";
  ctx.font = "16px Arial";
  ctx.fillText("Score: " + Math.floor(score), 20, 30);
  ctx.fillText("Speed: " + worldSpeed.toFixed(4), 20, 55);
}

// RESET
function resetGame() {
  player.x = canvas.width / 2;
  worldSpeed = 0.0015;
  score = 0;
  obstacles = [];
  drains = [];
  splashes = [];
  gameOver = false;
}

// LOOP
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
