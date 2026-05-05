const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

// ----- PLAYER -----
let player = {
  x: canvas.width / 2,
  y: canvas.height - 90,
  width: 24,
  height: 24,
  speed: 6,
  energy: 100,
  boosting: false
};

// ----- INPUT -----
let keys = {};
window.addEventListener("keydown", (e) => keys[e.key] = true);
window.addEventListener("keyup", (e) => keys[e.key] = false);

// ----- WORLD SPEED (forward motion) -----
let worldSpeed = 0.002;

// ----- SPEED LINES (background flow) -----
let lines = Array.from({ length: 25 }).map(() => ({
  x: Math.random(), // 0..1 across screen
  z: Math.random()  // depth (0 far → 1 near)
}));

// ----- OBSTACLES -----
let obstacles = [];
function spawnObstacle() {
  obstacles.push({
    laneX: Math.random(), // 0..1
    z: 0.05               // start far
  });
}

// ----- UPDATE -----
function update() {
  // steer
  if (keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;

  // throttle (forward/back feel)
  if (keys["ArrowUp"]) worldSpeed += 0.0002;
  if (keys["ArrowDown"]) worldSpeed -= 0.0002;

  // BOOST (hold Shift)
  if (keys["Shift"] && player.energy > 0) {
    player.boosting = true;
    worldSpeed += 0.0005;
    player.energy -= 0.8;
  } else {
    player.boosting = false;
    player.energy += 0.4;
  }

  // clamp values
  worldSpeed = Math.max(0.001, Math.min(0.006, worldSpeed));
  player.energy = Math.max(0, Math.min(100, player.energy));

  // keep player on screen
  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));

  // move obstacles toward camera
  for (let o of obstacles) {
    o.z += worldSpeed * 2;
  }
  obstacles = obstacles.filter(o => o.z < 1.2);

  // spawn obstacles
  if (Math.random() < 0.04) spawnObstacle();

  // update speed lines
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

  // background gradient
  let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#cfeeff");
  gradient.addColorStop(1, "#ffffff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // vanishing point
  let center = canvas.width / 2;

  // ----- SPEED LINES (subtle flow) -----
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

  // ----- OBSTACLES (perspective scaling) -----
  for (let o of obstacles) {
    let scale = 0.5 + Math.pow(o.z, 2) * 6;
    let x = center + (o.laneX - 0.5) * canvas.width * o.z;
    let y = 100 + (canvas.height - 100) * o.z;
    let size = 10 * scale;

    ctx.fillStyle = "red";
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
  }

  // ----- ENERGY TRAIL -----
  ctx.strokeStyle = player.boosting ? "orange" : "cyan";
  ctx.lineWidth = player.boosting ? 6 : 3;

  ctx.beginPath();
  ctx.moveTo(player.x + player.width / 2, player.y);
  ctx.lineTo(player.x + player.width / 2, player.y + 40);
  ctx.stroke();

  // ----- PLAYER -----
  ctx.fillStyle = "black";
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // ----- ENERGY BAR -----
  ctx.fillStyle = "black";
  ctx.fillRect(20, 40, 100, 10);

  ctx.fillStyle = player.boosting ? "orange" : "cyan";
  ctx.fillRect(20, 40, player.energy, 10);

  // optional: speed readout
  ctx.fillStyle = "black";
  ctx.font = "14px Arial";
  ctx.fillText("Speed: " + worldSpeed.toFixed(4), 20, 30);
}

// ----- LOOP -----
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}
gameLoop();
