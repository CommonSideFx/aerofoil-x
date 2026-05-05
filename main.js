const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

const playerSize = 20;
let player = {
  x: 400,
  y: 300,
  vx: 0,
  vy: 0,
  accel: 0.2,
  friction: 0.98,
  maxSpeed: 5
};

};

let keys = {};

window.addEventListener("keydown", (e) => {
  keys[e.key] = true;
});

window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

function update() {
  if (keys["ArrowUp"]) player.vy -= player.accel;
  if (keys["ArrowDown"]) player.vy += player.accel;
  if (keys["ArrowLeft"]) player.vx -= player.accel;
  if (keys["ArrowRight"]) player.vx += player.accel;

  // gravity effect (pull downward)
  player.vy += 0.1;

  // friction (glide feel)
  player.vx *= player.friction;
  player.vy *= player.friction;

  // speed limit
  player.vx = Math.max(-player.maxSpeed, Math.min(player.maxSpeed, player.vx));
  player.vy = Math.max(-player.maxSpeed, Math.min(player.maxSpeed, player.vy));

  // move
  player.x += player.vx;
  player.y += player.vy;

  // boundaries
  if (player.x < 0) player.x = 0;
  if (player.x > canvas.width - 20) player.x = canvas.width - 20;

  if (player.y < 0) player.y = 0;
  if (player.y > canvas.height - 20) player.y = canvas.height - 20;
}
  // HARD boundaries (this will NOT fail)
  if (player.x < 0) player.x = 0;
  if (player.x > canvas.width - playerSize) player.x = canvas.width - playerSize;

  if (player.y < 0) player.y = 0;
  if (player.y > canvas.height - playerSize) player.y = canvas.height - playerSize;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "black";
  ctx.fillRect(player.x, player.y, playerSize, playerSize);
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
