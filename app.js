const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const highScoreNameElement = document.getElementById('highScoreName');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');
const newRecordMsg = document.getElementById('newRecordMsg');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const playerNameInput = document.getElementById('playerName');
const leaderboardList = document.getElementById('leaderboardList');

// Game Constants
const TILE_SIZE = 20;
const CANVAS_SIZE = 400;
const SPEED = 80;
const MAX_SCORES = 8;

// Game Variables
let snake = [];
let food = { x: 0, y: 0 };
let dx = 0;
let dy = 0;
let score = 0;
let currentPlayer = '';
let gameLoop;
let isGameRunning = false;

// ---- Leaderboard (stored as JSON array of {name, score}) ----
function getLeaderboard() {
    try {
        return JSON.parse(localStorage.getItem('snakeLeaderboard')) || [];
    } catch {
        return [];
    }
}

function saveLeaderboard(board) {
    localStorage.setItem('snakeLeaderboard', JSON.stringify(board));
}

function addToLeaderboard(name, playerScore) {
    const board = getLeaderboard();
    board.push({ name, score: playerScore });
    board.sort((a, b) => b.score - a.score);
    const trimmed = board.slice(0, MAX_SCORES);
    saveLeaderboard(trimmed);
    return trimmed;
}

function isNewRecord(playerScore) {
    const board = getLeaderboard();
    if (board.length < MAX_SCORES) return true;
    return playerScore > board[board.length - 1].score;
}

function renderLeaderboard() {
    const board = getLeaderboard();
    const medals = ['🥇', '🥈', '🥉'];

    if (board.length === 0) {
        leaderboardList.innerHTML = '<li class="empty-entry">No scores yet</li>';
        return;
    }

    leaderboardList.innerHTML = board.map((entry, i) => `
        <li>
            <span class="lb-rank">${medals[i] || (i + 1) + '.'}</span>
            <span class="lb-name">${entry.name}</span>
            <span class="lb-score">${entry.score}</span>
        </li>
    `).join('');

    // Update top score display in header
    const top = board[0];
    highScoreElement.textContent = top.score;
    highScoreNameElement.textContent = top.name;
}

// ---- Remember last player name ----
function getLastName() {
    return localStorage.getItem('snakeLastName') || '';
}

function saveLastName(name) {
    localStorage.setItem('snakeLastName', name);
}

// ---- Init ----
playerNameInput.value = getLastName();
renderLeaderboard();

// ---- Game Functions ----
function initGame() {
    currentPlayer = playerNameInput.value.trim() || 'Player';
    saveLastName(currentPlayer);

    snake = [
        { x: 200, y: 200 },
        { x: 180, y: 200 },
        { x: 160, y: 200 }
    ];

    dx = TILE_SIZE;
    dy = 0;
    score = 0;
    scoreElement.textContent = score;

    generateFood();

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    newRecordMsg.classList.add('hidden');

    isGameRunning = true;

    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, SPEED);
}

function update() {
    moveSnake();

    if (checkCollision()) {
        gameOver();
        return;
    }

    clearCanvas();
    drawFood();
    drawSnake();
}

function moveSnake() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    wrapPosition(head);
    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        generateFood();
    } else {
        snake.pop();
    }
}

function wrapPosition(head) {
    if (head.x < 0) head.x = CANVAS_SIZE - TILE_SIZE;
    if (head.x >= CANVAS_SIZE) head.x = 0;
    if (head.y < 0) head.y = CANVAS_SIZE - TILE_SIZE;
    if (head.y >= CANVAS_SIZE) head.y = 0;
}

function checkCollision() {
    const head = snake[0];
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) return true;
    }
    return false;
}

function generateFood() {
    const maxPos = (CANVAS_SIZE / TILE_SIZE) - 1;
    food.x = Math.floor(Math.random() * maxPos) * TILE_SIZE;
    food.y = Math.floor(Math.random() * maxPos) * TILE_SIZE;

    snake.forEach(segment => {
        if (food.x === segment.x && food.y === segment.y) generateFood();
    });
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawFood() {
    const x = food.x;
    const y = food.y;
    const size = TILE_SIZE;

    ctx.shadowBlur = 10;
    ctx.shadowColor = '#0038b8';

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Blue stripes
    ctx.fillStyle = '#0038b8';
    ctx.fillRect(x + 3, y + size * 0.2, size - 6, size * 0.15);
    ctx.fillRect(x + 3, y + size * 0.65, size - 6, size * 0.15);

    // Star of David
    ctx.strokeStyle = '#0038b8';
    ctx.lineWidth = 1.2;

    const cx = x + size / 2;
    const cy = y + size / 2;
    const r = size * 0.15;

    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.866, cy + r * 0.5);
    ctx.lineTo(cx - r * 0.866, cy + r * 0.5);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, cy + r);
    ctx.lineTo(cx + r * 0.866, cy - r * 0.5);
    ctx.lineTo(cx - r * 0.866, cy - r * 0.5);
    ctx.closePath();
    ctx.stroke();
}

function drawSnake() {
    snake.forEach((segment, index) => {
        const isHead = index === 0;
        const isBlue = index % 2 !== 0;

        ctx.fillStyle = isHead ? '#ffffff' : (isBlue ? '#0038b8' : '#e0eaff');
        ctx.shadowBlur = isHead ? 10 : 5;
        ctx.shadowColor = '#0038b8';

        ctx.beginPath();
        ctx.roundRect(segment.x + 1, segment.y + 1, TILE_SIZE - 2, TILE_SIZE - 2, 4);
        ctx.fill();

        if (isHead) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#0a0a1a';

            let eye1X, eye1Y, eye2X, eye2Y;
            const eyeSize = 3;
            const offset = 4;

            if (dx > 0) {
                eye1X = segment.x + TILE_SIZE - offset - eyeSize; eye1Y = segment.y + offset;
                eye2X = segment.x + TILE_SIZE - offset - eyeSize; eye2Y = segment.y + TILE_SIZE - offset - eyeSize;
            } else if (dx < 0) {
                eye1X = segment.x + offset; eye1Y = segment.y + offset;
                eye2X = segment.x + offset; eye2Y = segment.y + TILE_SIZE - offset - eyeSize;
            } else if (dy < 0) {
                eye1X = segment.x + offset; eye1Y = segment.y + offset;
                eye2X = segment.x + TILE_SIZE - offset - eyeSize; eye2Y = segment.y + offset;
            } else {
                eye1X = segment.x + offset; eye1Y = segment.y + TILE_SIZE - offset - eyeSize;
                eye2X = segment.x + TILE_SIZE - offset - eyeSize; eye2Y = segment.y + TILE_SIZE - offset - eyeSize;
            }

            ctx.fillRect(eye1X, eye1Y, eyeSize, eyeSize);
            ctx.fillRect(eye2X, eye2Y, eyeSize, eyeSize);
        }

        ctx.shadowBlur = 0;
    });
}

function gameOver() {
    isGameRunning = false;
    clearInterval(gameLoop);

    const madeRecord = isNewRecord(score);
    addToLeaderboard(currentPlayer, score);
    renderLeaderboard();

    finalScoreElement.textContent = score;

    if (madeRecord && score > 0) {
        newRecordMsg.classList.remove('hidden');
    } else {
        newRecordMsg.classList.add('hidden');
    }

    gameOverScreen.classList.remove('hidden');
}

// ---- Event Listeners ----
document.addEventListener('keydown', (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"].includes(e.code)) {
        e.preventDefault();
    }

    if (e.key === 'Enter') {
        if (!startScreen.classList.contains('hidden')) {
            initGame();
        } else if (!gameOverScreen.classList.contains('hidden')) {
            initGame();
        }
        return;
    }

    if (!isGameRunning) return;

    const goingUp = dy === -TILE_SIZE;
    const goingDown = dy === TILE_SIZE;
    const goingRight = dx === TILE_SIZE;
    const goingLeft = dx === -TILE_SIZE;

    switch (e.key) {
        case 'ArrowUp':    if (!goingDown)  { dx = 0; dy = -TILE_SIZE; } break;
        case 'ArrowDown':  if (!goingUp)    { dx = 0; dy = TILE_SIZE;  } break;
        case 'ArrowLeft':  if (!goingRight) { dx = -TILE_SIZE; dy = 0; } break;
        case 'ArrowRight': if (!goingLeft)  { dx = TILE_SIZE;  dy = 0; } break;
    }
});

startBtn.addEventListener('click', initGame);
restartBtn.addEventListener('click', initGame);

// Initial canvas fill
ctx.fillStyle = '#050510';
ctx.fillRect(0, 0, canvas.width, canvas.height);
