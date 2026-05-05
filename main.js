const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

// PLAYER
let player = {
  x: canvas.width / 2,
  y: canvas.height - 100,
  width: 16,
  height: 16,
  speed: 4,
  energy: 100
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

// DRAIN
let drainZ = 0.6;

// OBSTACLES
let obstacles = [];

// -------- HELPERS --------
function getFlowX(z) {
  return Math.sin(flowOffset + z * 5) * 100;
}

function getTerrainY(z) {
  return Math.sin(terrainOffset + z * 4) * 40;
}

function projectY(z) {
  return 150 + (canvas.height - 150) * z;
}

function spawnObstacle() {
  obstacles.push({
    x: Math.random(),
    z: 0.05,
    size: 10
  });
}

function checkCollision(px, py, pw, ph, ox, oy, os) {
  return (
    px < ox + os &&
    px + pw > ox &&
    py < oy + os &&
    py + ph > oy
  );
}

// -------- UPDATE --------
function update() {
  if (gameOver) {
    if (keys["Enter"]) resetGame();
    return;
  }

  // movement
  if (keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;

  // speed control
  if (keys["ArrowUp"]) worldSpeed += 0.0001;
  if (keys["ArrowDown"]) worldSpeed -= 0.0001;

  worldSpeed = Math.max(0.001, Math.min(0.004, worldSpeed));

  // world motion
  flowOffset += worldSpeed * 2;
  terrainOffset += worldSpeed * 1.5;

  // obstacles
  if (Math.random() < 0.01) spawnObstacle();

  obstacles.forEach(o => o.z += worldSpeed * 1.8);
  obstacles = obstacles.filter(o => o.z < 1.2);

  let center = canvas.width / 2;

  // collision
  obstacles.forEach(o => {
    let x = center + getFlowX(o.z) + (o.x - 0.5) * 100 * o.z;
    let y = projectY(o.z) + getTerrainY(o.z);
    let size = o.size * (0.5 + o.z * 4);

    if (checkCollision(player.x, player.y, player.width, player.height, x - size/2, y - size/2, size)) {
      gameOver = true;
    }
  });

  // drain moves forward
  drainZ += worldSpeed * 1.5;

  // portal trigger
  if (drainZ > 1) {
    drainZ = 0.2;
    obstacles = []; // clean transition
  }

  score += worldSpeed * 10;

  // bounds
  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
}

// -------- DRAW --------
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let center = canvas.width / 2;

  // background
  let g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, "#bfe6ff");
  g.addColorStop(1, "#eafaff");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // PATH (FIXED: moveTo added)
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 2;

  ctx.beginPath();
  let startX = center + getFlowX(0);
  let startY = projectY(0) + getTerrainY(0);
  ctx.moveTo(startX, startY);

  for (let z = 0; z < 1; z += 0.02) {
    let x = center + getFlowX(z);
    let y = projectY(z) + getTerrainY(z);
    ctx.lineTo(x, y);
  }
  ctx.stroke();

  // DRAIN (safe draw)
  let dx = center + getFlowX(drainZ);
  let dy = projectY(drainZ) + getTerrainY(drainZ);

  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(dx, dy, 10 + i * 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  // OBSTACLES
  obstacles.forEach(o => {
    let x = center + getFlowX(o.z) + (o.x - 0.5) * 100 * o.z;
    let y = projectY(o.z) + getTerrainY(o.z);
    let size = o.size * (0.5 + o.z * 4);

    ctx.fillStyle = "#444";
    ctx.fillRect(x - size/2, y - size/2, size, size);
  });

  // PLAYER
  ctx.fillStyle = "black";
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // UI
  ctx.fillStyle = "black";
  ctx.font = "16px Arial";
  ctx.fillText("Score: " + Math.floor(score), 20, 30);
  ctx.fillText("Speed: " + worldSpeed.toFixed(4), 20, 50);

  if (gameOver) {
    ctx.font = "28px Arial";
    ctx.fillText("GAME OVER", canvas.width/2 - 90, canvas.height/2);
    ctx.font = "16px Arial";
    ctx.fillText("Press Enter to Restart", canvas.width/2 - 110, canvas.height/2 + 30);
  }
}

// RESET
function resetGame() {
  player.x = canvas.width / 2;
  worldSpeed = 0.0015;
  score = 0;
  obstacles = [];
  drainZ = 0.6;
  gameOver = false;
}

// LOOP
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
