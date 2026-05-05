const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

// ---- PLAYER (near bottom) ----
let player = {
  x: canvas.width / 2,
  y: canvas.height - 90,
  width: 24,
  height: 24,
  speed: 6
};

// ---- INPUT ----
let keys = {};
window.addEventListener("keydown", (e) => keys[e.key] = true);
window.addEventListener("keyup", (e) => keys[e.key] = false);

// ---- WORLD ----
let worldSpeed = 0.008; // how fast depth increases (forward speed)

// Obstacles live in "depth space" (z from 0=far to 1=near)
let obstacles = [];

// Speed lines (background flow)
let lines = Array.from({ length: 60 }).map(() => ({
  x: Math.random() * canvas.width,
  z: Math.random() // depth
}));

function spawnObstacle() {
  obstacles.push({
    laneX: Math.random(), // 0..1 across screen
    z: 0.05,              // start far away
    baseSize: 10
  });
}

// ---- UPDATE ----
function update() {
  // steer left/right
  if (keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;

  // keep on screen
  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));

  // move obstacles "toward camera" by increasing z
  for (let o of obstacles) {
    o.z += worldSpeed * 2.2; // faster than lines
  }

  // recycle when past camera
  obstacles = obstacles.filter(o => o.z < 1.2);

  // spawn
  if (Math.random() < 0.04) spawnObstacle();

  // update speed lines
  for (let l of lines) {
    l.z += worldSpeed;
    if (l.z > 1) {
      l.z = 0;
      l.x = Math.random() * canvas.width;
    }
  }

  // collision (approximate with screen-space size)
  for (let o of obstacles) {
    let scale = perspectiveScale(o.z);
    let size = o.baseSize * scale;

    let x = projectX(o.laneX, o.z) - size / 2;
    let y = projectY(o.z) - size / 2;

    if (
      player.x < x + size &&
      player.x + player.width > x &&
      player.y < y + size &&
      player.y + player.height > y
    ) {
      console.log("HIT!");
    }
  }
}

// ---- PERSPECTIVE HELPERS ----
// bigger as z -> 1 (near)
function perspectiveScale(z) {
  // curve for stronger near growth
  return 0.5 + Math.pow(z, 2) * 8;
}

// pull toward center (vanishing point)
function projectX(laneX, z) {
  const center = canvas.width / 2;
  const spread = (laneX - 0.5) * canvas.width * (0.2 + z); // narrow far, wider near
  return center + spread;
}

// map depth to screen Y (far near horizon, near at bottom)
function projectY(z) {
  const horizon = 120; // where far objects appear
  const bottom = canvas.height;
  return horizon + (bottom - horizon) * z;
}

// ---- DRAW ----
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // sky / water gradient
  let g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, "#cfeeff");
  g.addColorStop(1, "#ffffff");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // speed lines (flow)
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 2;
  for (let l of lines) {
    const y = projectY(l.z);
    const len = 10 + l.z * 40;
    ctx.beginPath();
    ctx.moveTo(l.x, y);
    ctx.lineTo(l.x, y + len);
    ctx.stroke();
  }

  // obstacles (grow as they approach)
  ctx.fillStyle = "red";
  for (let o of obstacles) {
    const scale = perspectiveScale(o.z);
    const size = o.baseSize * scale;

    const x = projectX(o.laneX, o.z) - size / 2;
    const y = projectY(o.z) - size / 2;

    ctx.fillRect(x, y, size, size);
  }

  // player trail
  ctx.strokeStyle = "orange";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(player.x + player.width / 2, player.y);
  ctx.lineTo(player.x + player.width / 2, player.y + 30);
  ctx.stroke();

  // player
  ctx.fillStyle = "black";
  ctx.fillRect(player.x, player.y, player.width, player.height);
}

// ---- LOOP ----
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
