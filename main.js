const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

// PLAYER
let player = {
  x: canvas.width / 2,
  y: canvas.height - 100,
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

let flowOffset = 0;
let terrainOffset = 0;

// 🌀 DRAINS
let drains = [];

function spawnDrain() {
  if (Math.random() < 0.003) {
    drains.push({
      z: 0.2,
      type: Math.random() > 0.5 ? "boost" : "trap",
      spin: 0
    });
  }
}

// OBSTACLES
let obstacleTypes = ["butt", "paper", "trash"];
let obstacles = [];

function spawnObstacle() {
  obstacles.push({
    x: Math.random(),
    z: 0.05,
    type: obstacleTypes[Math.floor(Math.random() * 3)],
    size: 6 // smaller = more dodgeable
  });
}

// EFFECTS
let splashes = [];

// HELPERS
function getFlowX(z) {
  return Math.sin(flowOffset + z * 5) * 120; // wider path
}

function getTerrainY(z) {
  return Math.sin(terrainOffset + z * 4) * 30;
}

function projectY(z) {
  return 140 + (canvas.height - 140) * z;
}

function checkCollision(px, py, pw, ph, ox, oy, os) {
  return (
    px < ox + os &&
    px + pw > ox &&
    py < oy + os &&
    py + ph > oy
  );
}

// UPDATE
function update() {
  if (gameOver) {
    if (keys["Enter"]) resetGame();
    return;
  }

  if (keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;

  if (keys["ArrowUp"]) worldSpeed += 0.0001;
  if (keys["ArrowDown"]) worldSpeed -= 0.0001;

  if (keys["Shift"] && player.energy > 0) {
    player.boosting = true;
    worldSpeed += 0.0005;
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

  // stay in stream
  let flowCenter = center + getFlowX(0.9);
  player.x += (flowCenter - player.x) * 0.02;

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

  // COLLISION (obstacles)
  obstacles.forEach(o => {
    let x = center + getFlowX(o.z) + (o.x - 0.5) * 140 * o.z;
    let y = projectY(o.z) + getTerrainY(o.z);
    let size = o.size * (0.5 + o.z * 4);

    if (checkCollision(player.x, player.y, player.width, player.height, x - size/2, y - size/2, size)) {
      player.hitTimer = 10;
      player.energy -= 20;
      worldSpeed *= 0.7;

      splashes.push({ x, y, life: 20 });
    }
  });

  // COLLISION (drains)
  drains.forEach(d => {
    let x = center + getFlowX(d.z);
    let y = projectY(d.z) + getTerrainY(d.z);

    if (Math.abs(player.x - x) < 20 && Math.abs(player.y - y) < 20) {
      if (d.type === "boost") {
        worldSpeed *= 1.4;
      } else {
        worldSpeed *= 0.6;
      }
      d.z = 2; // remove after hit
    }
  });

  if (player.hitTimer > 0) player.hitTimer--;
  if (player.energy <= 0) gameOver = true;

  // splash decay
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

  // CURB
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 3;

  ctx.beginPath();
  for (let z = 0; z < 1; z += 0.02) {
    let x = center + getFlowX(z);
    let y = projectY(z) + getTerrainY(z);
    ctx.lineTo(x - 80 * z, y);
  }
  ctx.stroke();

  ctx.beginPath();
  for (let z = 0; z < 1; z += 0.02) {
    let x = center + getFlowX(z);
    let y = projectY(z) + getTerrainY(z);
    ctx.lineTo(x + 80 * z, y);
  }
  ctx.stroke();

  // DRAINS
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
    let x = center + getFlowX(o.z) + (o.x - 0.5) * 140 * o.z;
    let y = projectY(o.z) + getTerrainY(o.z);
    let size = o.size * (0.5 + o.z * 4);

    if (o.type === "butt") ctx.fillStyle = "#c2a36b";
    else if (o.type === "paper") ctx.fillStyle = "#fff";
    else ctx.fillStyle = "#333";

    ctx.fillRect(x - size/2, y - size/2, size, size);
  });

  // SPLASH
  splashes.forEach(s => {
    ctx.fillStyle = "rgba(0,150,255,0.4)";
    ctx.beginPath();
    ctx.arc(s.x, s.y, 10 - s.life/2, 0, Math.PI * 2);
    ctx.fill();
  });

  // TRAIL
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = player.boosting
      ? `rgba(255,140,0,${0.3 - i * 0.1})`
      : `rgba(0,200,255,${0.3 - i * 0.1})`;

    ctx.lineWidth = 6 - i * 2;

    ctx.beginPath();
    ctx.moveTo(player.x + player.width/2, player.y);
    ctx.lineTo(player.x + player.width/2, player.y + 40 + i * 10);
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
  ctx.fillText("Score: " + Math.floor(score), 20, 30);
  ctx.fillText("Speed: " + worldSpeed.toFixed(4), 20, 55);

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
