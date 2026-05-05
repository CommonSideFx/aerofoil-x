const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

const playerSize = 20;

let player = {
  x: 400,
  y: 300,
  speed: 3
};

let keys = {};

window.addEventListener("keydown", (e) => {
  keys[e.key] = true;
});

window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

function update() {
  if (keys["ArrowUp"]) player.y -= player.speed;
  if (keys["ArrowDown"]) player.y += player.speed;
  if (keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;

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
