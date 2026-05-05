const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

// PLAYER
let player = {
  x: canvas.width / 2,
  y: canvas.height - 90,
  width: 14,
  height: 14,
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

// FLOW + TERRAIN
let flowOffset = 0;
let terrainOffset = 0;

// 🌀 DRAIN PULL
let drainStrength = 0;

// PARTICLES
let lines = Array.from({ length: 25 }).map(() => ({
  x: Math.random(),
  z: Math.random()
}));

// SPLASHES
let splashes = [];

// OBSTACLES
let obstacleTypes = ["butt", "paper", "trash"];
let obstacles = [];

function spawnObstacle() {
  obstacles.push({
    laneX: Math.random(),
    z: 0.05,
    type: obstacleTypes[Math.floor(Math.random() * 3)],
    size: 10
  });
}

// FLOW CURVE
function getFlowX(z) {
  return Math.sin(flowOffset + z * 5) * 100;
}

// TERRAIN
function getTerrainY(z) {
  return Math.sin(terrainOffset + z * 4) * 30;
}

// COLLISION
function checkCollision(px, py, pw, ph, ox, oy, os) {
  return (
    px < ox + os &&
    px + pw > ox &&
    py < oy + os &&
    py + ph > oy
  );
}

// RESET
function resetGame() {
  player.energy = 100;
  player.x = canvas.width / 2;
  worldSpeed = 0.0015;
  score = 0;
  obstacles = [];
  splashes = [];
  drainStrength = 0;
  gameOver = false;
}

// UPDATE
function update() {
  if (gameOver) {
    if (keys["Enter"]) resetGame();
    return;
  }

  // MOVE
  if (keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;

  // SPEED
  if (keys["ArrowUp"]) worldSpeed += 0.00015;
  if (keys["ArrowDown"]) worldSpeed -= 0.00015;

  // BOOST
  if (keys["Shift"] && player.energy > 0) {
    player.boosting = true;
    worldSpeed += 0.0006;
    player.energy -= 0.8;
  } else {
    player.boosting = false;
    player.energy += 0.3;
  }

  worldSpeed = Math.max(0.0008, Math.min(0.004, worldSpeed));
  player.energy = Math.max(0, Math.min(100, player.energy));

  // FLOW + TERRAIN
  flowOffset += worldSpeed * 2;
  terrainOffset += worldSpeed * 1.5;

  // 🌀 INCREASING DRAIN FORCE OVER TIME
  drainStrength += 0.00005;

  let center = canvas.width / 2;

  // DRAIN PULL
  let drainPull = (center - player.x) * drainStrength;
  player.x += drainPull;

  // FLOW CENTER PULL
  let flowCenter = center + getFlowX(0.9);
  player.x += (flowCenter - player.x) * 0.015;

  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));

  // OBSTACLES
  for (let o of obstacles) o.z += worldSpeed * 1.8;
  obstacles = obstacles.filter(o => o.z < 1.2);

  if (Math.random() < 0.008) spawnObstacle();

  // COLLISION
  for (let o of obstacles) {
    let scale = 0.5 + Math.pow(o.z, 2) * 5;

    let x = center + getFlowX(o.z) + (o.laneX - 0.5) * 100 * o.z;
    let y = 120 + (canvas.height - 120) * o.z + getTerrainY(o.z);
    let size = o.size * scale;

    if (checkCollision(player.x, player.y, player.width, player.height, x - size/2, y - size/2, size)) {
      player.hitTimer = 10;
      player.energy -= 20;
      worldSpeed *= 0.7;

      // 💦 SPLASH
      splashes.push({
        x: x,
        y: y,
        life: 20
      });
    }
  }

  if (player.hitTimer > 0) player.hitTimer--;
  if (player.energy <= 0) gameOver = true;

  score += worldSpeed * 10;

  // SPLASH UPDATE
  for (let s of splashes) s.life--;
  splashes = splashes.filter(s => s.life > 0);

  // LINES
  for (let l of lines) {
    l.z += worldSpeed;
    if (l.z > 1) {
      l.z = 0;
      l.x = Math.random();
    }
  }
}

// DRAW
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let center = canvas.width / 2;

  // WATER
  let g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, "#bfe6ff");
  g.addColorStop(1, "#eafaff");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 🧱 SIDEWALK EDGES
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 3;

  ctx.beginPath();
  for (let z = 0; z < 1; z += 0.02) {
    let x = center + getFlowX(z);
    let y = 120 + (canvas.height - 120) * z + getTerrainY(z);

    ctx.lineTo(x - 60 * z, y);
  }
  ctx.stroke();

  ctx.beginPath();
  for (let z = 0; z < 1; z += 0.02) {
    let x = center + getFlowX(z);
    let y = 120 + (canvas.height - 120) * z + getTerrainY(z);

    ctx.lineTo(x + 60 * z, y);
  }
  ctx.stroke();

  // OBSTACLES (REAL LOOK)
  for (let o of obstacles) {
    let scale = 0.5 + Math.pow(o.z, 2) * 5;

    let x = center + getFlowX(o.z) + (o.laneX - 0.5) * 100 * o.z;
    let y = 120 + (canvas.height - 120) * o.z + getTerrainY(o.z);
    let size = o.size * scale;

    if (o.type === "butt") ctx.fillStyle = "#c2a36b";
    else if (o.type === "paper") ctx.fillStyle = "#ffffff";
    else ctx.fillStyle = "#333";

    ctx.fillRect(x - size/2, y - size/2, size, size);
  }

  // SPLASHES
  for (let s of splashes) {
    ctx.fillStyle = "rgba(0,150,255,0.4)";
    ctx.beginPath();
    ctx.arc(s.x, s.y, 10 - s.life/2, 0, Math.PI * 2);
    ctx.fill();
  }

  // PLAYER
  ctx.fillStyle = player.hitTimer > 0 ? "red" : "black";
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // UI
  ctx.fillStyle = "black";
  ctx.fillRect(20, 40, 100, 10);

  ctx.fillStyle = player.boosting ? "orange" : "cyan";
  ctx.fillRect(20, 40, player.energy, 10);

  ctx.fillStyle = "black";
  ctx.font = "16px Arial";
  ctx.fillText("Score: " + Math.floor(score), 20, 70);
  ctx.fillText("Speed: " + worldSpeed.toFixed(4), 20, 25);

  if (gameOver) {
    ctx.font = "30px Arial";
    ctx.fillText("GAME OVER", canvas.width / 2 - 100, canvas.height / 2);
    ctx.font = "16px Arial";
    ctx.fillText("Press Enter to Restart", canvas.width / 2 - 100, canvas.height / 2 + 30);
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
