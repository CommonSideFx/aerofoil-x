const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

// PLAYER
let player = {
  x: canvas.width / 2,
  y: canvas.height - 90,
  width: 18,
  height: 18,
  speed: 4.5,
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

// FLOW
let flowOffset = 0;

// TERRAIN (vertical hills)
let terrainOffset = 0;

// SPEED LINES
let lines = Array.from({ length: 25 }).map(() => ({
  x: Math.random(),
  z: Math.random()
}));

// OBSTACLES
let obstacles = [];

function spawnObstacle() {
  obstacles.push({
    laneX: Math.random(),
    z: 0.05,
    size: 10
  });
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
  gameOver = false;
}

// FLOW CURVE
function getFlowX(z) {
  return Math.sin(flowOffset + z * 5) * 110;
}

// TERRAIN HEIGHT (this is the hill illusion)
function getTerrainY(z) {
  return Math.sin(terrainOffset + z * 4) * 35;
}

// UPDATE
function update() {
  if (gameOver) {
    if (keys["Enter"]) resetGame();
    return;
  }

  // steer
  if (keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;

  // throttle
  if (keys["ArrowUp"]) worldSpeed += 0.00015;
  if (keys["ArrowDown"]) worldSpeed -= 0.00015;

  // boost
  if (keys["Shift"] && player.energy > 0) {
    player.boosting = true;
    worldSpeed += 0.0007;
    player.energy -= 0.8;
  } else {
    player.boosting = false;
    player.energy += 0.3;
  }

  // clamp
  worldSpeed = Math.max(0.0008, Math.min(0.004, worldSpeed));
  player.energy = Math.max(0, Math.min(100, player.energy));

  // move world
  flowOffset += worldSpeed * 2;
  terrainOffset += worldSpeed * 1.5;

  // gravity feel (downhill = faster)
  let slope = Math.cos(terrainOffset);
  worldSpeed += slope * 0.0002;

  // flow center pull
  let flowCenter = canvas.width / 2 + getFlowX(0.9);
  player.x += (flowCenter - player.x) * 0.015;

  // bounds
  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));

  // obstacles
  for (let o of obstacles) o.z += worldSpeed * 1.8;
  obstacles = obstacles.filter(o => o.z < 1.2);

  // LESS SPAWN (playable)
  if (Math.random() < 0.008) spawnObstacle();

  let center = canvas.width / 2;

  for (let o of obstacles) {
    let scale = 0.5 + Math.pow(o.z, 2) * 5;

    let x = center + getFlowX(o.z) + (o.laneX - 0.5) * 100 * o.z;
    let y = 120 + (canvas.height - 120) * o.z + getTerrainY(o.z);
    let size = o.size * scale;

    if (checkCollision(player.x, player.y, player.width, player.height, x - size/2, y - size/2, size)) {
      player.hitTimer = 10;
      player.energy -= 25;
      worldSpeed *= 0.7;
    }
  }

  if (player.hitTimer > 0) player.hitTimer--;
  if (player.energy <= 0) gameOver = true;

  score += worldSpeed * 10;

  // lines
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

  // SKY / WATER
  let g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, "#bfe6ff");
  g.addColorStop(1, "#eafaff");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let center = canvas.width / 2;

  // FLOW PATH
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.beginPath();
  for (let z = 0; z < 1; z += 0.02) {
    let x = center + getFlowX(z);
    let y = 120 + (canvas.height - 120) * z + getTerrainY(z);
    ctx.lineTo(x, y);
  }
  ctx.stroke();

  // LINES
  for (let l of lines) {
    let x = center + getFlowX(l.z) + (l.x - 0.5) * 90 * l.z;
    let y = 120 + (canvas.height - 120) * l.z + getTerrainY(l.z);

    ctx.strokeStyle = "rgba(0,0,0,0.05)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 8 + l.z * 15);
    ctx.stroke();
  }

  // OBSTACLES
  for (let o of obstacles) {
    let scale = 0.5 + Math.pow(o.z, 2) * 5;

    let x = center + getFlowX(o.z) + (o.laneX - 0.5) * 100 * o.z;
    let y = 120 + (canvas.height - 120) * o.z + getTerrainY(o.z);
    let size = o.size * scale;

    ctx.fillStyle = "#444";
    ctx.fillRect(x - size/2, y - size/2, size, size);
  }

  // HIT FLASH
  if (player.hitTimer > 0) {
    ctx.fillStyle = "rgba(255,0,0,0.3)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // TRAIL
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = player.boosting
      ? `rgba(255,140,0,${0.3 - i * 0.1})`
      : `rgba(0,200,255,${0.3 - i * 0.1})`;

    ctx.lineWidth = player.boosting ? 8 - i * 2 : 5 - i * 1.5;

    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x + player.width / 2, player.y + 35 + i * 8);
    ctx.stroke();
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

// LOOP
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
