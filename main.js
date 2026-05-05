const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

// ----- PLAYER -----
let player = {
  x: canvas.width / 2,
  y: canvas.height - 110, // lower = closer camera feel
  width: 18,
  height: 18,
  speed: 4.5,
  energy: 100,
  boosting: false,
  hitTimer: 0
};

// ----- INPUT -----
let keys = {};
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

// ----- WORLD -----
let worldSpeed = 0.0014;
let score = 0;
let gameOver = false;

// flow + terrain
let flowOffset = 0;
let terrainOffset = 0;

// ----- DRAIN PORTAL -----
let drain = {
  z: 0.85,      // where it sits in depth
  active: true,
  cooldown: 0
};

// ----- PARTICLES -----
let lines = Array.from({ length: 28 }).map(() => ({
  x: Math.random(),
  z: Math.random()
}));

// ----- SPLASHES -----
let splashes = [];

// ----- OBSTACLES -----
let obstacleTypes = ["butt", "paper", "trash"];
let obstacles = [];

function spawnObstacle() {
  obstacles.push({
    laneX: Math.random(),
    z: 0.05,
    type: obstacleTypes[Math.floor(Math.random() * 3)],
    size: 10
  });
}

// ----- HELPERS -----
function getFlowX(z) {
  return Math.sin(flowOffset + z * 5) * 110;
}

// stronger hills + horizon occlusion
function getTerrainY(z) {
  // bigger amplitude
  let base = Math.sin(terrainOffset + z * 4) * 45;

  // “crest occlusion”: when uphill, push horizon down (hide far)
  let crest = Math.sin(terrainOffset) * 80; // affects far distances
  let occlusion = (1 - z) * Math.max(0, crest);

  return base - occlusion;
}

function projectY(z) {
  const near = canvas.height;
  const far = 160; // higher horizon (closer camera)
  return far + (near - far) * z;
}

function checkCollision(px, py, pw, ph, ox, oy, os) {
  return (
    px < ox + os &&
    px + pw > ox &&
    py < oy + os &&
    py + ph > oy
  );
}

function resetGame() {
  player.energy = 100;
  player.x = canvas.width / 2;
  worldSpeed = 0.0014;
  score = 0;
  obstacles = [];
  splashes = [];
  drain.z = 0.85;
  drain.active = true;
  drain.cooldown = 0;
  gameOver = false;
}

// ----- UPDATE -----
function update() {
  if (gameOver) {
    if (keys["Enter"]) resetGame();
    return;
  }

  // steer
  if (keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;

  // throttle
  if (keys["ArrowUp"]) worldSpeed += 0.00012;
  if (keys["ArrowDown"]) worldSpeed -= 0.00012;

  // boost
  if (keys["Shift"] && player.energy > 0) {
    player.boosting = true;
    worldSpeed += 0.0007;
    player.energy -= 0.9;
  } else {
    player.boosting = false;
    player.energy += 0.35;
  }

  worldSpeed = Math.max(0.0008, Math.min(0.0038, worldSpeed));
  player.energy = Math.max(0, Math.min(100, player.energy));

  // advance world
  flowOffset += worldSpeed * 2;
  terrainOffset += worldSpeed * 1.6;

  // downhill/uphill speed bias
  let slope = Math.cos(terrainOffset);
  worldSpeed += slope * 0.00018;

  // gentle flow center pull
  let center = canvas.width / 2;
  let flowCenter = center + getFlowX(0.9);
  player.x += (flowCenter - player.x) * 0.018;

  // bounds
  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));

  // obstacles
  for (let o of obstacles) o.z += worldSpeed * 1.7;
  obstacles = obstacles.filter(o => o.z < 1.2);

  if (Math.random() < 0.007) spawnObstacle();

  // collision
  for (let o of obstacles) {
    let scale = 0.6 + Math.pow(o.z, 2) * 5.5;

    let x = center + getFlowX(o.z) + (o.laneX - 0.5) * 110 * o.z;
    let y = projectY(o.z) + getTerrainY(o.z);
    let size = o.size * scale * 1.2; // bigger

    if (checkCollision(player.x, player.y, player.width, player.height, x - size/2, y - size/2, size)) {
      player.hitTimer = 10;
      player.energy -= 20;
      worldSpeed *= 0.7;

      splashes.push({ x, y, life: 18 });
    }
  }

  if (player.hitTimer > 0) player.hitTimer--;
  if (player.energy <= 0) gameOver = true;

  // ----- DRAIN PORTAL BEHAVIOR -----
  if (drain.cooldown > 0) drain.cooldown--;

  if (drain.active) {
    drain.z += worldSpeed * 1.6;

    // suction near drain
    let dz = Math.max(0, drain.z - 0.6); // start pulling when close
    let pull = dz * dz * 0.08;
    let drainX = center + getFlowX(drain.z);
    player.x += (drainX - player.x) * pull;
  }

  // trigger portal when it reaches player plane
  if (drain.active && drain.z >= 1.02) {
    // flash + teleport feel
    splashes.push({ x: center, y: canvas.height - 60, life: 30 });

    // loop: reset z + clear some obstacles to “new segment”
    drain.z = 0.2;
    drain.cooldown = 40;

    // optional: clear near obstacles to avoid instant hit post-portal
    obstacles = obstacles.filter(o => o.z < 0.7);

    // small speed bump to feel transition
    worldSpeed *= 1.05;
  }

  // score
  score += worldSpeed * 10;

  // lines
  for (let l of lines) {
    l.z += worldSpeed;
    if (l.z > 1) {
      l.z = 0;
      l.x = Math.random();
    }
  }

  // splashes
  for (let s of splashes) s.life--;
  splashes = splashes.filter(s => s.life > 0);
}

// ----- DRAW -----
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // water
  let g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, "#bfe6ff");
  g.addColorStop(1, "#eafaff");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let center = canvas.width / 2;

  // sidewalk edges (wider near)
  ctx.strokeStyle = "#8a8a8a";
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

  // drain (spiral rings)
  if (drain.active) {
    let dx = center + getFlowX(drain.z);
    let dy = projectY(drain.z) + getTerrainY(drain.z);

    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = `rgba(0,0,0,${0.25 - i * 0.05})`;
      ctx.beginPath();
      ctx.arc(dx, dy, 12 + i * 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // water lines
  for (let l of lines) {
    let x = center + getFlowX(l.z) + (l.x - 0.5) * 110 * l.z;
    let y = projectY(l.z) + getTerrainY(l.z);

    ctx.strokeStyle = "rgba(0,0,0,0.05)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 10 + l.z * 18);
    ctx.stroke();
  }

  // obstacles (bigger)
  for (let o of obstacles) {
    let scale = 0.6 + Math.pow(o.z, 2) * 5.5;

    let x = center + getFlowX(o.z) + (o.laneX - 0.5) * 110 * o.z;
    let y = projectY(o.z) + getTerrainY(o.z);
    let size = o.size * scale * 1.2;

    if (o.type === "butt") ctx.fillStyle = "#c2a36b";
    else if (o.type === "paper") ctx.fillStyle = "#ffffff";
    else ctx.fillStyle = "#333";

    ctx.fillRect(x - size/2, y - size/2, size, size);
  }

  // splashes
  for (let s of splashes) {
    ctx.fillStyle = "rgba(0,150,255,0.4)";
    ctx.beginPath();
    ctx.arc(s.x, s.y, 12 - s.life / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // player trail
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = player.boosting
      ? `rgba(255,140,0,${0.3 - i * 0.1})`
      : `rgba(0,200,255,${0.3 - i * 0.1})`;

    ctx.lineWidth = player.boosting ? 8 - i * 2 : 5 - i * 1.5;

    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x + player.width / 2, player.y + 36 + i * 8);
    ctx.stroke();
  }

  // player
  ctx.fillStyle = player.hitTimer > 0 ? "red" : "black";
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // UI
  ctx.fillStyle = "black";
  ctx.fillRect(20, 40, 100, 10);

  ctx.fillStyle = player.boosting ? "orange" : "cyan";
  ctx.fillRect(20, 40, player.energy, 10);

  ctx.fillStyle = "black";
  ctx.font = "16px Arial";
  ctx.fillText("Score: " + Math.floor(score), 20, 70);
  ctx.fillText("Speed: " + worldSpeed.toFixed(4), 20, 25);

  if (gameOver) {
    ctx.font = "30px Arial";
    ctx.fillText("GAME OVER", canvas.width / 2 - 100, canvas.height / 2);
    ctx.font = "16px Arial";
    ctx.fillText("Press Enter to Restart", canvas.width / 2 - 100, canvas.height / 2 + 30);
  }
}

// ----- LOOP -----
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}
gameLoop();
