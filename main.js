const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

// PLAYER (stays near bottom center)
let player = {
  x: canvas.width / 2,
  y: canvas.height - 100,
  width: 20,
  height: 20,
  speed: 5
};

// INPUT
let keys = {};
window.addEventListener("keydown", (e) => keys[e.key] = true);
window.addEventListener("keyup", (e) => keys[e.key] = false);

// WORLD SPEED (this is your “downhill energy flow”)
let worldSpeed = 6;

// OBSTACLES
let obstacles = [];

function spawnObstacle() {
  obstacles.push({
    x: Math.random() * (canvas.width - 30),
    y: -50,
    width: 20,
    height: 20
  });
}

// UPDATE
function update() {
  // left/right movement
  if (keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;

  // boundaries
  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));

  // move world toward player
  for (let obj of obstacles) {
    obj.y += worldSpeed;
  }

  // remove off-screen obstacles
  obstacles = obstacles.filter(obj => obj.y < canvas.height);

  // spawn new ones
  if (Math.random() < 0.03) {
    spawnObstacle();
  }

  // collision detection
  for (let obj of obstacles) {
    if (
      player.x < obj.x + obj.width &&
      player.x + player.width > obj.x &&
      player.y < obj.y + obj.height &&
      player.y + player.height > obj.y
    ) {
      console.log("HIT!");
    }
  }
}

// DRAW
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // background (flow effect)
  ctx.fillStyle = "#e6f7ff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // draw player
  ctx.fillStyle = "black";
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // draw obstacles
  ctx.fillStyle = "red";
  for (let obj of obstacles) {
    ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
  }
}

// LOOP
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
