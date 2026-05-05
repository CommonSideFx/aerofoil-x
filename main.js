const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

// ----- ENV -----
let environment = "city";

// ----- PLAYER -----
let player = {
  x: canvas.width / 2,
  y: canvas.height - 90,
  width: 24,
  height: 24,
  speed: 6,
  energy: 100,
  boosting: false,
  hitTimer: 0
};

// ----- INPUT -----
let keys = {};
window.addEventListener("keydown", (e) => keys[e.key] = true);
window.addEventListener("keyup", (e) => keys[e.key] = false);

// ----- WORLD -----
let worldSpeed = 0.002;
let score = 0;
let gameOver = false;

// WIND + CURVE
let windOffset = 0;
let windDirection = 1;

// TERRAIN
let terrainOffset = 0;

// SPEED LINES
let lines = Array.from({ length: 20 }).map(() => ({
  x: Math.random(),
  z: Math.random()
}));

// OBSTACLES (city types)
let obstacles = [];
const obstacleTypes = ["debris", "barrier", "cone"];

function spawnObstacle() {
  obstacles.push({
    laneX: Math.random(),
    z: 0.05,
    size: 12,
    type: obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)]
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

// UPDATE
function update() {
  if (gameOver) {
    if (keys["Enter"]) resetGame();
    return;
  }

  // MOVE
  if (keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;

  // THROTTLE
  if (keys["ArrowUp"]) worldSpeed += 0.0002;
  if (keys["ArrowDown"]) worldSpeed -= 0.0002;

  // BOOST
  if (keys["Shift"] && player.energy > 0) {
    player.boosting = true;
    worldSpeed += 0.001;
    player.energy -= 1.2;
  } else {
    player.boosting = false;
    player.energy += 0.5;
  }

  // TERRAIN
  terrainOffset += worldSpeed * 2;
  let slope = Math.cos(terrainOffset);
  worldSpeed += slope * 0.0003;

  // CLAMP
  worldSpeed = Math.max(0.001, Math.min(0.006, worldSpeed));
  player.energy = Math.max(0, Math.min(100, player.energy));

  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));

  // WIND
  let windForce = Math.sin(score * 0.01) * 1.5;
  player.x += windForce;

  // CURVE
  windOffset += 0.002 * windDirection;
  if (Math.abs(windOffset) > 0.2) windDirection *= -1;

  // OBSTACLES
  for (let o of obstacles) o.z += worldSpeed * 2;
  obstacles = obstacles.filter(o => o.z < 1.2);

  if (Math.random() < 0.015) spawnObstacle();

  let center = canvas.width / 2;

  for (let o of obstacles) {
    let scale = 0.5 + Math.pow(o.z, 2) * 6;
    let x = center + ((o.laneX + windOffset) - 0.5) * canvas.width * o.z;
    let terrainHeight = Math.sin(terrainOffset + o.z * 5) * 40;
    let y = 100 + (canvas.height - 100) * o.z + terrainHeight;
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

  for (let l of lines) {
    l.z += worldSpeed;
    if (l.z > 1) {
      l.z = 0;
      l.x = Math.random();
    }
  }
}

// ----- DRAW -----
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 🌆 SKY
  let sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#9ec9ff");
  sky.addColorStop(1, "#e6f2ff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let center = canvas.width / 2;

  // 🏙️ CITY SKYLINE
  ctx.fillStyle = "#333";
  for (let i = 0; i < 20; i++) {
    let x = i * 50;
    let h = 40 + Math.random() * 60;
    ctx.fillRect(x, 120 - h, 40, h);
  }

  // 🛣️ ROAD
  ctx.fillStyle = "#555";
  ctx.beginPath();
  ctx.moveTo(center - 100, canvas.height);
  ctx.lineTo(center + 100, canvas.height);
  ctx.lineTo(center + 10, 120);
  ctx.lineTo(center - 10, 120);
  ctx.closePath();
  ctx.fill();

  // LINES (motion)
  for (let l of lines) {
    let x = center + (l.x - 0.5 + windOffset) * canvas.width * l.z;
    let terrainHeight = Math.sin(terrainOffset + l.z * 5) * 40;
    let y = 100 + (canvas.height - 100) * l.z + terrainHeight;

    ctx.strokeStyle = "rgba(0,0,0,0.04)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 10 + l.z * 20);
    ctx.stroke();
  }

  // 🚧 OBSTACLES (CITY STYLE)
  for (let o of obstacles) {
    let scale = 0.5 + Math.pow(o.z, 2) * 6;
    let x = center + ((o.laneX + windOffset) - 0.5) * canvas.width * o.z;
    let terrainHeight = Math.sin(terrainOffset + o.z * 5) * 40;
    let y = 100 + (canvas.height - 100) * o.z + terrainHeight;
    let size = o.size * scale;

    if (o.type === "cone") ctx.fillStyle = "orange";
    else if (o.type === "barrier") ctx.fillStyle = "yellow";
    else ctx.fillStyle = "black";

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
    ctx.lineTo(player.x + player.width / 2, player.y + 50 + i * 10);
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
  ctx.fillText("Speed: " + worldSpeed.toFixed(4), 20, 25);

  if (gameOver) {
    ctx.fillStyle = "black";
    ctx.font = "32px Arial";
    ctx.fillText("GAME OVER", canvas.width / 2 - 100, canvas.height / 2);
    ctx.font = "18px Arial";
    ctx.fillText("Press Enter to Restart", canvas.width / 2 - 110, canvas.height / 2 + 40);
  }
}

// LOOP
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}
gameLoop();
