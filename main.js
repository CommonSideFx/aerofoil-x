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
  speed: 6
};

// INPUT
let keys = {};
window.addEventListener("keydown", (e) => keys[e.key] = true);
window.addEventListener("keyup", (e) => keys[e.key] = false);

// WORLD SPEED (forward motion)
let worldSpeed = 0.003;

// SPEED LINES (background motion)
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
  // left/right movement
  if (keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;

  // throttle (forward/back feel)
  if (keys["ArrowUp"]) worldSpeed += 0.0002;
  if (keys["ArrowDown"]) worldSpeed -= 0.0002;

  worldSpeed = Math.max(0.001, Math.min(0.01, worldSpeed));

  // keep player on screen
  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));

  // move obstacles forward
  for (let o of obstacles) {
    o.z += worldSpeed * 2;
  }

  // remove passed obstacles
  obstacles = obstacles.filter(o => o.z < 1.2);

  // spawn
  if (Math.random() < 0.04) spawnObstacle();
}

// DRAW
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // BACKGROUND
  let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#cfeeff");
  gradient.addColorStop(1, "#ffffff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // VANISHING POINT
  let vanishingPoint = canvas.width / 2;

  // SPEED LINES (forward motion effect)
  for (let l of lines) {
    l.z += worldSpeed;

    if (l.z > 1) {
      l.z = 0;
      l.x = Math.random();
    }

    let x = vanishingPoint + (l.x - 0.5) * canvas.width * l.z;
    let y = 100 + (canvas.height - 100) * l.z;

    let length = 10 + l.z * 30;

    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + length);
    ctx.stroke();
  }

  // OBSTACLES (perspective scaling)
  for (let o of obstacles) {
    let scale = 0.5 + Math.pow(o.z, 2) * 6;

    let x = vanishingPoint + (o.laneX - 0.5) * canvas.width * o.z;
    let y = 100 + (canvas.height - 100) * o.z;

    let size = 10 * scale;

    ctx.fillStyle = "red";
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
  }

  // PLAYER TRAIL
  ctx.strokeStyle = "orange";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(player.x + player.width / 2, player.y);
  ctx.lineTo(player.x + player.width / 2, player.y + 30);
  ctx.stroke();

  // PLAYER
  ctx.fillStyle = "black";
  ctx.fillRect(player.x, player.y, player.width, player.height);
}

// LOOP
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
