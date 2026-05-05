const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

// PLAYER
let player = {
  x: canvas.width / 2,
  y: canvas.height - 90,
  width: 20,
  height: 20,
  speed: 5,
  energy: 100,
  boosting: false,
  hitTimer: 0
};

// INPUT
let keys = {};
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

// WORLD
let worldSpeed = 0.002;
let score = 0;
let gameOver = false;

// FLOW PATH
let flowOffset = 0;

// PARTICLES (water streaks)
let lines = Array.from({ length: 30 }).map(() => ({
  x: Math.random(),
  z: Math.random()
}));

// OBSTACLES
let obstacles = [];

function spawnObstacle() {
  obstacles.push({
    laneX: Math.random(),
    z: 0.05,
    size: 12
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
  worldSpeed = 0.002;
  score = 0;
  obstacles = [];
  gameOver = false;
}

// FLOW CURVE FUNCTION
function getFlowX(z) {
  return Math.sin(flowOffset + z * 5) * 120;
}

// UPDATE
function update() {
  if (gameOver) {
    if (keys["Enter"]) resetGame();
    return;
  }

  // STEER
  if (keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;

  // THROTTLE
  if (keys["ArrowUp"]) worldSpeed += 0.0002;
  if (keys["ArrowDown"]) worldSpeed -= 0.0002;

  // BOOST
  if (keys["Shift"] && player.energy > 0) {
    player.boosting = true;
    worldSpeed += 0.001;
    player.energy -= 1;
  } else {
    player.boosting = false;
    player.energy += 0.4;
  }

  worldSpeed = Math.max(0.001, Math.min(0.006, worldSpeed));
  player.energy = Math.max(0, Math.min(100, player.energy));

  // FLOW MOVEMENT
  flowOffset += worldSpeed * 2;

  // PLAYER stays near flow center (slight pull)
  let flowCenter = canvas.width / 2 + getFlowX(0.9);
  player.x += (flowCenter - player.x) * 0.02;

  // keep in bounds
  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));

  // OBSTACLES MOVE
  for (let o of obstacles) o.z += worldSpeed * 2;
  obstacles = obstacles.filter(o => o.z < 1.2);

  if (Math.random() < 0.012) spawnObstacle();

  let center = canvas.width / 2;

  // COLLISION
  for (let o of obstacles) {
    let scale = 0.5 + Math.pow(o.z, 2) * 6;

    let flowX = getFlowX(o.z);
    let x = center + flowX + (o.laneX - 0.5) * 120 * o.z;

    let y = 100 + (canvas.height - 100) * o.z;
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

  // WATER LINES
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

  // WATER BACKGROUND
  let g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, "#a8dfff");
  g.addColorStop(1, "#e6f7ff");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let center = canvas.width / 2;

  // FLOW CHANNEL (visual path)
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  for (let z = 0; z < 1; z += 0.02) {
    let x = center + getFlowX(z);
    let y = 100 + (canvas.height - 100) * z;
    ctx.lineTo(x, y);
  }
  ctx.stroke();

  // WATER LINES
  for (let l of lines) {
    let flowX = getFlowX(l.z);

    let x = center + flowX + (l.x - 0.5) * 100 * l.z;
    let y = 100 + (canvas.height - 100) * l.z;

    ctx.strokeStyle = "rgba(0,0,0,0.05)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 10 + l.z * 20);
    ctx.stroke();
  }

  // OBSTACLES (in water)
  for (let o of obstacles) {
    let scale = 0.5 + Math.pow(o.z, 2) * 6;

    let flowX = getFlowX(o.z);
    let x = center + flowX + (o.laneX - 0.5) * 120 * o.z;
    let y = 100 + (canvas.height - 100) * o.z;
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

    ctx.lineWidth = player.boosting ? 10 - i * 3 : 6 - i * 2;

    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x + player.width / 2, player.y + 40 + i * 10);
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
  ctx.font = "18px Arial";
  ctx.fillText("Score: " + Math.floor(score), 20, 70);

  if (gameOver) {
    ctx.fillStyle = "black";
    ctx.font = "32px Arial";
    ctx.fillText("GAME OVER", canvas.width / 2 - 100, canvas.height / 2);
    ctx.font = "18px Arial";
    ctx.fillText("Press Enter to Restart", canvas.width / 2 - 110, canvas.height / 2 + 40);
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
