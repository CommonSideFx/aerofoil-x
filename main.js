const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

// PLAYER
let player = {
  x: canvas.width / 2,
  y: canvas.height - 110,
  w: 16,
  h: 16,
  speed: 4
};

// INPUT
let keys = {};
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

// WORLD
let worldSpeed = 0.0015;
let score = 0;
let lives = 3;
let gameOver = false;

let flowOffset = 0;

// OBJECTS
let obstacles = [];
let drains = [];

let portalCooldown = 0;

// ===== HELPERS =====
function getFlowX(z) {
  return Math.sin(flowOffset + z * 5) * 180; // MUCH wider curve
}

function projectY(z) {
  return 180 + (canvas.height - 180) * z;
}

function checkCollision(px, py, pw, ph, ox, oy, os) {
  return (
    px < ox + os &&
    px + pw > ox &&
    py < oy + os &&
    py + ph > oy
  );
}

// ===== SPAWN =====
function spawnObstacle() {
  obstacles.push({
    lane: Math.random(),
    z: 0.05,
    size: 5
  });
}

function spawnDrain() {
  if (Math.random() < 0.002) {
    drains.push({
      z: 0.1,
      type: Math.random() > 0.5 ? "boost" : "trap"
    });
  }
}

// ===== RESET =====
function resetGame() {
  player.x = canvas.width / 2;
  worldSpeed = 0.0015;
  score = 0;
  lives = 3;
  obstacles = [];
  drains = [];
  gameOver = false;
}

// ===== UPDATE =====
function update() {
  if (gameOver) {
    if (keys["Enter"]) resetGame();
    return;
  }

  if (portalCooldown > 0) portalCooldown--;

  // movement
  if (keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;

  // speed
  if (keys["ArrowUp"]) worldSpeed += 0.0001;
  if (keys["ArrowDown"]) worldSpeed -= 0.0001;

  worldSpeed = Math.max(0.001, Math.min(0.004, worldSpeed));

  flowOffset += worldSpeed * 2;

  let center = canvas.width / 2;

  // keep player centered in flow
  let flowCenter = center + getFlowX(0.9);
  player.x += (flowCenter - player.x) * 0.02;

  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));

  // spawn
  if (Math.random() < 0.008) spawnObstacle();
  spawnDrain();

  // update obstacles
  obstacles.forEach(o => o.z += worldSpeed * 1.8);
  obstacles = obstacles.filter(o => o.z < 1.2);

  // update drains
  drains.forEach(d => d.z += worldSpeed * 1.5);
  drains = drains.filter(d => d.z < 1.2);

  // collisions: obstacles
  obstacles.forEach(o => {
    let x = center + getFlowX(o.z) + (o.lane - 0.5) * 240 * o.z;
    let y = projectY(o.z);
    let size = o.size * (0.5 + o.z * 4);

    if (checkCollision(player.x, player.y, player.w, player.h, x - size/2, y - size/2, size)) {
      lives--;
      player.x = canvas.width / 2;
      worldSpeed *= 0.7;

      if (lives <= 0) gameOver = true;
    }
  });

  // collisions: drains (SAFE)
  drains.forEach(d => {
    let x = center + getFlowX(d.z);
    let y = projectY(d.z);

    if (
      portalCooldown === 0 &&
      Math.abs(player.x - x) < 20 &&
      Math.abs(player.y - y) < 20
    ) {
      if (d.type === "boost") {
        worldSpeed *= 1.4;
      } else {
        lives--;
        worldSpeed *= 0.7;
      }

      portalCooldown = 40; // prevents freeze
      d.z = 2;

      if (lives <= 0) gameOver = true;
    }
  });

  score += worldSpeed * 10;
}

// ===== DRAW =====
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let center = canvas.width / 2;

  // background
  ctx.fillStyle = "#eafaff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ===== WIDE CURB =====
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(center - 140, 180);
  for (let z = 0; z < 1; z += 0.02) {
    let x = center + getFlowX(z);
    let y = projectY(z);
    ctx.lineTo(x - 140 * z, y);
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(center + 140, 180);
  for (let z = 0; z < 1; z += 0.02) {
    let x = center + getFlowX(z);
    let y = projectY(z);
    ctx.lineTo(x + 140 * z, y);
  }
  ctx.stroke();

  // ===== OBSTACLES =====
  obstacles.forEach(o => {
    let x = center + getFlowX(o.z) + (o.lane - 0.5) * 240 * o.z;
    let y = projectY(o.z);
    let size = o.size * (0.5 + o.z * 4);

    ctx.fillStyle = "#333";
    ctx.fillRect(x - size/2, y - size/2, size, size);
  });

  // ===== DRAINS =====
  drains.forEach(d => {
    let x = center + getFlowX(d.z);
    let y = projectY(d.z);

    ctx.strokeStyle = d.type === "boost" ? "green" : "red";

    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.stroke();
  });

  // PLAYER
  ctx.fillStyle = "black";
  ctx.fillRect(player.x, player.y, player.w, player.h);

  // ===== UI (FORCED LAST = NEVER DISAPPEARS) =====
  ctx.fillStyle = "black";
  ctx.font = "16px Arial";
  ctx.fillText("Score: " + Math.floor(score), 20, 30);
  ctx.fillText("Speed: " + worldSpeed.toFixed(4), 20, 50);
  ctx.fillText("Lives: " + lives, 20, 70);

  if (gameOver) {
    ctx.font = "28px Arial";
    ctx.fillText("GAME OVER", canvas.width/2 - 90, canvas.height/2);
    ctx.font = "16px Arial";
    ctx.fillText("Press Enter to Restart", canvas.width/2 - 110, canvas.height/2 + 30);
  }
}

// LOOP
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
