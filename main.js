const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

// ===== PLAYER =====
let player = {
  x: canvas.width / 2,
  y: canvas.height - 110,
  w: 14,
  h: 14,
  tilt: 0
};

let lateralVel = 0;

// ===== WORLD =====
let worldSpeed = 0.0015;
let score = 0;
let lives = 3;
let fishCount = 0;
let gameOver = false;

let flowOffset = 0;
let portalCooldown = 0;

// bias gutter slightly toward sidewalk (right side)
const GUTTER_BIAS = 60;

// ===== OBJECTS =====
let obstacles = [];
let drains = [];
let fish = [];

// environment objects (visual only for now)
let sidewalkObjects = [];
let streetCars = [];

// ===== INPUT =====
let keys = {};
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

// ===== HELPERS =====
function getFlowX(z) {
  return Math.sin(flowOffset + z * 5) * 220 + GUTTER_BIAS;
}

function projectY(z) {
  return 200 + (canvas.height - 200) * z;
}

function collide(px, py, pw, ph, ox, oy, size) {
  return (
    px < ox + size &&
    px + pw > ox &&
    py < oy + size &&
    py + ph > oy
  );
}

// ===== SPAWN =====
function spawnObstacle() {
  if (Math.random() < 0.01) {
    obstacles.push({ lane: Math.random(), z: 0.05 });
  }
}

function spawnDrain() {
  if (Math.random() < 0.003) {
    drains.push({
      lane: 0.8 + Math.random() * 0.2, // FORCE curb side
      z: 0.1,
      type: Math.random() > 0.5 ? "boost" : "trap",
      spin: 0
    });
  }
}

function spawnFish() {
  if (Math.random() < 0.006) {
    fish.push({ lane: Math.random(), z: 0.05, swim: Math.random() * 10 });
  }
}

// sidewalk props (mailbox, pole, driveway block)
function spawnSidewalk() {
  if (Math.random() < 0.01) {
    sidewalkObjects.push({
      z: 0.05,
      type: Math.random() > 0.5 ? "pole" : "box"
    });
  }
}

// street cars
function spawnCar() {
  if (Math.random() < 0.006) {
    streetCars.push({
      z: 0.05,
      lane: Math.random() * 0.3 // street side
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

  // movement
  if (keys["ArrowLeft"]) lateralVel -= 0.25;
  if (keys["ArrowRight"]) lateralVel += 0.25;

  lateralVel *= 0.95;
  player.x += lateralVel;

  // speed
  if (keys["ArrowUp"]) worldSpeed += 0.0001;
  if (keys["ArrowDown"]) worldSpeed -= 0.0001;

  worldSpeed = Math.max(0.001, Math.min(0.004, worldSpeed));

  flowOffset += worldSpeed * 2;

  let center = canvas.width / 2;

  // flow drift
  let flowTarget = center + getFlowX(0.95);
  player.x += (flowTarget - player.x) * 0.04;

  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));

  player.tilt = lateralVel * 0.08;

  // spawn
  spawnObstacle();
  spawnDrain();
  spawnFish();
  spawnSidewalk();
  spawnCar();

  // update
  obstacles.forEach(o => o.z += worldSpeed * 1.8);
  drains.forEach(d => {
    d.z += worldSpeed * 1.5;
    d.spin += 0.12;
  });
  fish.forEach(f => {
    f.z += worldSpeed * 1.6;
    f.swim += 0.1;
  });
  sidewalkObjects.forEach(s => s.z += worldSpeed * 1.2);
  streetCars.forEach(c => c.z += worldSpeed * 2.2);

  obstacles = obstacles.filter(o => o.z < 1.2);
  drains = drains.filter(d => d.z < 1.2);
  fish = fish.filter(f => f.z < 1.2);
  sidewalkObjects = sidewalkObjects.filter(s => s.z < 1.2);
  streetCars = streetCars.filter(c => c.z < 1.2);

  // ===== COLLISIONS =====
  obstacles.forEach(o => {
    let x = center + getFlowX(o.z) + (o.lane - 0.5) * 300 * o.z;
    let y = projectY(o.z);

    if (collide(player.x, player.y, player.w, player.h, x, y, 12)) {
      lives--;
      player.x = center;
      if (lives <= 0) gameOver = true;
    }
  });

  drains.forEach(d => {
    let x = center + getFlowX(d.z) + (d.lane - 0.5) * 300 * d.z;
    let y = projectY(d.z);

    if (portalCooldown === 0 && collide(player.x, player.y, player.w, player.h, x, y, 14)) {
      if (d.type === "boost") {
        flowOffset += 1.5;
        score += 200;
      } else {
        flowOffset -= 1;
        lives--;
      }

      portalCooldown = 30;
      d.z = 2;
      if (lives <= 0) gameOver = true;
    }
  });

  fish.forEach(f => {
    let x = center + getFlowX(f.z) + (f.lane - 0.5) * 300 * f.z + Math.sin(f.swim) * 10;
    let y = projectY(f.z);

    if (collide(player.x, player.y, player.w, player.h, x, y, 12)) {
      fishCount++;
      score += 100;
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

  // ===== STREET (left) =====
  ctx.fillStyle = "#ccc";
  ctx.fillRect(0, 200, canvas.width / 2, canvas.height);

  // ===== SIDEWALK (right) =====
  ctx.fillStyle = "#ddd";
  ctx.fillRect(canvas.width / 2, 200, canvas.width / 2, canvas.height);

  // CURB
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(center - 180 + GUTTER_BIAS, 200);
  for (let z = 0; z < 1; z += 0.02) {
    let x = center + getFlowX(z);
    let y = projectY(z);
    ctx.lineTo(x - 180 * z, y);
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(center + 180 + GUTTER_BIAS, 200);
  for (let z = 0; z < 1; z += 0.02) {
    let x = center + getFlowX(z);
    let y = projectY(z);
    ctx.lineTo(x + 180 * z, y);
  }
  ctx.stroke();

  // ===== SIDEWALK OBJECTS =====
  sidewalkObjects.forEach(s => {
    let x = center + getFlowX(s.z) + 220;
    let y = projectY(s.z);

    ctx.fillStyle = "#444";
    ctx.fillRect(x, y, 8, 20);
  });

  // ===== CARS =====
  streetCars.forEach(c => {
    let x = center + getFlowX(c.z) - 220;
    let y = projectY(c.z);

    ctx.fillStyle = "#222";
    ctx.fillRect(x, y, 30, 12);
  });

  // ===== OBSTACLES =====
  obstacles.forEach(o => {
    let x = center + getFlowX(o.z) + (o.lane - 0.5) * 300 * o.z;
    let y = projectY(o.z);
    ctx.fillStyle = "#333";
    ctx.fillRect(x, y, 12, 12);
  });

  // ===== PORTALS (SWIRL) =====
  drains.forEach(d => {
    let x = center + getFlowX(d.z) + (d.lane - 0.5) * 300 * d.z;
    let y = projectY(d.z);

    ctx.strokeStyle = d.type === "boost" ? "green" : "red";

    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(x, y, 8 + i * 4, d.spin + i, d.spin + i + Math.PI);
      ctx.stroke();
    }
  });

  // ===== FISH =====
  fish.forEach(f => {
    let x = center + getFlowX(f.z) + (f.lane - 0.5) * 300 * f.z + Math.sin(f.swim) * 10;
    let y = projectY(f.z);

    ctx.fillStyle = "orange";
    ctx.beginPath();
    ctx.ellipse(x, y, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // ===== TRAIL =====
  ctx.strokeStyle = "rgba(0,200,255,0.4)";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    let t = i / 10;
    let z = 0.9 + t * 0.1;
    let x = player.x + player.w/2 + (getFlowX(z) - getFlowX(0.95));
    let y = player.y + t * 60;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // PLAYER
  ctx.save();
  ctx.translate(player.x + player.w/2, player.y + player.h/2);
  ctx.rotate(player.tilt);
  ctx.fillStyle = "black";
  ctx.fillRect(-player.w/2, -player.h/2, player.w, player.h);
  ctx.restore();

  // UI
  ctx.fillStyle = "black";
  ctx.fillText("Score: " + Math.floor(score), 20, 30);
  ctx.fillText("Lives: " + lives, 20, 50);
  ctx.fillText("Fish: " + fishCount, 20, 70);
}

// RESET
function resetGame() {
  player.x = canvas.width / 2;
  worldSpeed = 0.0015;
  score = 0;
  lives = 3;
  fishCount = 0;
  obstacles = [];
  drains = [];
  fish = [];
  sidewalkObjects = [];
  streetCars = [];
  gameOver = false;
}

// LOOP
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
