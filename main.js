const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

// ===== PLAYER =====
let player = {
  x: canvas.width / 2,
  y: canvas.height - 110,
  w: 14,
  h: 14
};

let lateralVel = 0;

// ===== WORLD =====
let worldSpeed = 0.0015;
let score = 0;
let lives = 3;
let gameOver = false;

let flowOffset = 0;

// ===== OBJECTS =====
let obstacles = [];
let drains = [];
let fish = [];

let portalCooldown = 0;

// ===== INPUT =====
let keys = {};
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

// ===== HELPERS =====
function getFlowX(z) {
  return Math.sin(flowOffset + z * 5) * 220;
}

function projectY(z) {
  return 200 + (canvas.height - 200) * z;
}

// ===== SPAWN =====
function spawnObstacle() {
  obstacles.push({ lane: Math.random(), z: 0.05, size: 5 });
}

function spawnDrain() {
  if (Math.random() < 0.002) {
    drains.push({
      z: 0.2,
      type: Math.random() > 0.5 ? "boost" : "trap",
      spin: 0
    });
  }
}

function spawnFish() {
  if (Math.random() < 0.006) {
    fish.push({
      lane: Math.random(),
      z: 0.05,
      swimOffset: Math.random() * 100,
      dir: Math.random() > 0.5 ? 1 : -1
    });
  }
}

// ===== UPDATE =====
function update() {
  if (gameOver) {
    if (keys["Enter"]) resetGame();
    return;
  }

  if (portalCooldown > 0) portalCooldown--;

  // ===== SURF CONTROL =====
  if (keys["ArrowLeft"]) lateralVel -= 0.25;
  if (keys["ArrowRight"]) lateralVel += 0.25;

  lateralVel *= 0.95;
  player.x += lateralVel;

  // ===== SPEED =====
  if (keys["ArrowUp"]) worldSpeed += 0.0001;
  if (keys["ArrowDown"]) worldSpeed -= 0.0001;

  worldSpeed = Math.max(0.001, Math.min(0.004, worldSpeed));

  flowOffset += worldSpeed * 2;

  let center = canvas.width / 2;

  // ===== FLOW DRIFT =====
  let flowTarget = center + getFlowX(0.95);
  player.x += (flowTarget - player.x) * 0.04;

  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));

  // ===== SPAWN =====
  if (Math.random() < 0.008) spawnObstacle();
  spawnDrain();
  spawnFish();

  // ===== UPDATE OBJECTS =====
  obstacles.forEach(o => o.z += worldSpeed * 1.8);
  obstacles = obstacles.filter(o => o.z < 1.2);

  drains.forEach(d => {
    d.z += worldSpeed * 1.5;
    d.spin += 0.1;
  });
  drains = drains.filter(d => d.z < 1.2);

  // ===== FISH BEHAVIOR =====
  fish.forEach(f => {
    f.z += worldSpeed * 1.6;

    // swim side to side
    f.swimOffset += 0.05 * f.dir;

    // react to player (avoid)
    let px = player.x;
    let fx = center + getFlowX(f.z) + (f.lane - 0.5) * 300 * f.z;

    if (Math.abs(px - fx) < 80) {
      f.lane += (px < fx ? 0.01 : -0.01);
    }

    // clamp lane
    f.lane = Math.max(0.1, Math.min(0.9, f.lane));
  });

  fish = fish.filter(f => f.z < 1.2);

  // ===== COLLISIONS =====
  obstacles.forEach(o => {
    let x = center + getFlowX(o.z) + (o.lane - 0.5) * 300 * o.z;
    let y = projectY(o.z);
    let size = o.size * (0.5 + o.z * 4);

    if (
      player.x < x + size &&
      player.x + player.w > x &&
      player.y < y + size &&
      player.y + player.h > y
    ) {
      lives--;
      player.x = center;
      if (lives <= 0) gameOver = true;
    }
  });

  drains.forEach(d => {
    let x = center + getFlowX(d.z);
    let y = projectY(d.z);

    if (
      portalCooldown === 0 &&
      Math.abs(player.x - x) < 20 &&
      Math.abs(player.y - y) < 20
    ) {
      if (d.type === "boost") {
        flowOffset += 1.5;
        score += 200;
      } else {
        flowOffset -= 1;
        lives--;
      }

      portalCooldown = 40;
      d.z = 2;

      if (lives <= 0) gameOver = true;
    }
  });

  fish.forEach(f => {
    let x = center + getFlowX(f.z) + (f.lane - 0.5) * 300 * f.z;
    let y = projectY(f.z);
    let size = 10 * (0.5 + f.z * 3);

    if (
      player.x < x + size &&
      player.x + player.w > x &&
      player.y < y + size &&
      player.y + player.h > y
    ) {
      score += 100;
      worldSpeed += 0.0002;
      f.z = 2;
    }
  });

  score += worldSpeed * 10;
}

// ===== DRAW =====
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let center = canvas.width / 2;

  ctx.fillStyle = "#eafaff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ===== CURBS =====
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(center - 180, 200);
  for (let z = 0; z < 1; z += 0.02) {
    let x = center + getFlowX(z);
    let y = projectY(z);
    ctx.lineTo(x - 180 * z, y);
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(center + 180, 200);
  for (let z = 0; z < 1; z += 0.02) {
    let x = center + getFlowX(z);
    let y = projectY(z);
    ctx.lineTo(x + 180 * z, y);
  }
  ctx.stroke();

  // ===== FISH =====
  fish.forEach(f => {
    let x = center + getFlowX(f.z) + (f.lane - 0.5) * 300 * f.z + Math.sin(f.swimOffset) * 10;
    let y = projectY(f.z);
    let size = 10 * (0.5 + f.z * 3);

    ctx.fillStyle = "orange";
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // ===== OBSTACLES =====
  obstacles.forEach(o => {
    let x = center + getFlowX(o.z) + (o.lane - 0.5) * 300 * o.z;
    let y = projectY(o.z);
    let size = o.size * (0.5 + o.z * 4);

    ctx.fillStyle = "#333";
    ctx.fillRect(x - size/2, y - size/2, size, size);
  });

  // ===== PORTALS =====
  drains.forEach(d => {
    let x = center + getFlowX(d.z);
    let y = projectY(d.z);

    ctx.strokeStyle = d.type === "boost" ? "green" : "red";

    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(x, y, 10 + i * 5, d.spin, d.spin + Math.PI * 1.5);
      ctx.stroke();
    }
  });

  // ===== FLOWING TRAIL =====
  ctx.strokeStyle = "rgba(0,200,255,0.4)";
  ctx.lineWidth = 4;
  ctx.beginPath();

  let segments = 12;
  for (let i = 0; i < segments; i++) {
    let t = i / segments;
    let z = 0.9 + t * 0.1;

    let x = player.x + player.w/2 + (getFlowX(z) - getFlowX(0.95));
    let y = player.y + t * (40 + worldSpeed * 6000);

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.stroke();

  // PLAYER
  ctx.fillStyle = "black";
  ctx.fillRect(player.x, player.y, player.w, player.h);

  // UI
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

// ===== RESET =====
function resetGame() {
  player.x = canvas.width / 2;
  worldSpeed = 0.0015;
  score = 0;
  lives = 3;
  obstacles = [];
  drains = [];
  fish = [];
  gameOver = false;
}

// ===== LOOP =====
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
