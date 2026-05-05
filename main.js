const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

// PLAYER
let player = {
  x: canvas.width / 2,
  y: canvas.height - 90,
  width: 24,
  height: 24,
  speed: 6,
  energy: 100,
  boosting: false
};

// INPUT
let keys = {};
window.addEventListener("keydown", (e) => keys[e.key] = true);
window.addEventListener("keyup", (e) => keys[e.key] = false);

// WORLD
let worldSpeed = 0.002;
let score = 0;

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
    z: 0.05
  });
}

// UPDATE
function update() {
  // movement
  if (keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;

  // throttle
  if (keys["ArrowUp"]) worldSpeed += 0.0002;
  if (keys["ArrowDown"]) worldSpeed -= 0.0002;

  // BOOST
  if (keys["Shift"] && player.energy > 0) {
    player.boosting = true;
    worldSpeed += 0.001; // stronger boost now
    player.energy -= 1.2;
  } else {
    player.boosting = false;
    player.energy += 0.5;
  }

  // clamp
  worldSpeed = Math.max(0.001, Math.min(0.008, worldSpeed));
  player.energy = Math.max(0, Math.min(100, player.energy));

  // keep on screen
  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));

  // move obstacles
  for (let o of obstacles) {
    o.z += worldSpeed * 2;
  }
  obstacles = obstacles.filter(o => o.z < 1.2);

  if (Math.random() < 0.04) spawnObstacle();

  // update lines
  for (let l of lines) {
    l.z += worldSpeed;
    if (l.z > 1) {
      l.z = 0;
      l.x = Math.random();
    }
  }

  // SCORE grows with speed
  score += worldSpeed * 10;
}

// DRAW
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // background
  let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#cfeeff");
  gradient.addColorStop(1, "#ffffff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let center = canvas.width / 2;

  // SPEED LINES
  for (let l of lines) {
    let x = center + (l.x - 0.5) * canvas.width * l.z;
    let y = 100 + (canvas.height - 100) * l.z;
    let length = 5 + l.z * 20;

    ctx.strokeStyle = "rgba(0,0,0,0.04)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + length);
    ctx.stroke();
  }

  // OBSTACLES
  for (let o of obstacles) {
    let scale = 0.5 + Math.pow(o.z, 2) * 6;
    let x = center + (o.laneX - 0.5) * canvas.width * o.z;
    let y = 100 + (canvas.height - 100) * o.z;
    let size = 10 * scale;

    ctx.fillStyle = "red";
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
  }

  // 🔥 ENERGY TRAIL (layered glow)
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
  ctx.fillStyle = "black";
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // ENERGY BAR
  ctx.fillStyle = "black";
  ctx.fillRect(20, 40, 100, 10);

  ctx.fillStyle = player.boosting ? "orange" : "cyan";
  ctx.fillRect(20, 40, player.energy, 10);

  // SCORE
  ctx.fillStyle = "black";
  ctx.font = "18px Arial";
  ctx.fillText("Score: " + Math.floor(score), 20, 70);

  // SPEED
  ctx.fillText("Speed: " + worldSpeed.toFixed(4), 20, 25);
}

// LOOP
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
