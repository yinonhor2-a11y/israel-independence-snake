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

// Bonus orb config
const BONUS_TYPES = [
    { type: 'menorah', points: 30, color: '#FFD700', glow: '#FFA500', label: '🕎 +30' },
    { type: 'kotel',   points: 50, color: '#b39ddb', glow: '#7c4dff', label: '🪨 +50' },
];
const BONUS_DURATION = 5000; // ms before bonus disappears

// Game Variables
let snake = [];
let food = { x: 0, y: 0 };
let bonusFood = null;        // { x, y, bonusType, expiresAt, timerId }
let foodEatenCount = 0;
let dx = 0;
let dy = 0;
let score = 0;
let currentPlayer = '';
let gameLoop;
let isGameRunning = false;

// Floating score text
let floatingTexts = [];

// ---- Leaderboard ----
function getLeaderboard() {
    try { return JSON.parse(localStorage.getItem('snakeLeaderboard')) || []; }
    catch { return []; }
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
    const top = board[0];
    highScoreElement.textContent = top.score;
    highScoreNameElement.textContent = top.name;
}

// ---- Remember last player name ----
function getLastName() { return localStorage.getItem('snakeLastName') || ''; }
function saveLastName(name) { localStorage.setItem('snakeLastName', name); }

// ---- Init on page load ----
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
    foodEatenCount = 0;
    floatingTexts = [];
    scoreElement.textContent = score;
    clearBonusFood();

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
    if (checkCollision()) { gameOver(); return; }
    clearCanvas();
    drawFood();
    if (bonusFood) drawBonusFood();
    drawSnake();
    drawFloatingTexts();
}

function moveSnake() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    wrapPosition(head);
    snake.unshift(head);

    let ate = false;

    // Regular food
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        spawnFloatingText('+10', head.x, head.y, '#7adfff');
        generateFood();
        foodEatenCount++;
        ate = true;
        trySpawnBonus();
    }

    // Bonus food
    if (bonusFood && head.x === bonusFood.x && head.y === bonusFood.y) {
        const bonus = BONUS_TYPES.find(b => b.type === bonusFood.bonusType);
        score += bonus.points;
        scoreElement.textContent = score;
        spawnFloatingText(bonus.label, head.x, head.y, bonus.color);
        clearBonusFood();
        ate = true;
    }

    if (!ate) snake.pop();
}

function trySpawnBonus() {
    if (bonusFood) return; // already one active
    // ~40% chance to spawn a bonus after eating
    if (Math.random() < 0.4) {
        spawnBonusFood();
    }
}

function spawnBonusFood() {
    const bonusType = BONUS_TYPES[Math.floor(Math.random() * BONUS_TYPES.length)];
    const pos = randomFreePosition();
    const timerId = setTimeout(clearBonusFood, BONUS_DURATION);

    bonusFood = {
        x: pos.x,
        y: pos.y,
        bonusType: bonusType.type,
        expiresAt: Date.now() + BONUS_DURATION,
        timerId
    };
}

function clearBonusFood() {
    if (bonusFood && bonusFood.timerId) clearTimeout(bonusFood.timerId);
    bonusFood = null;
}

function randomFreePosition() {
    const maxPos = (CANVAS_SIZE / TILE_SIZE) - 1;
    let pos;
    do {
        pos = {
            x: Math.floor(Math.random() * maxPos) * TILE_SIZE,
            y: Math.floor(Math.random() * maxPos) * TILE_SIZE
        };
    } while (
        snake.some(s => s.x === pos.x && s.y === pos.y) ||
        (pos.x === food.x && pos.y === food.y)
    );
    return pos;
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

// ---- Floating Score Texts ----
function spawnFloatingText(text, x, y, color) {
    floatingTexts.push({ text, x: x + TILE_SIZE / 2, y, color, alpha: 1.0, life: 40 });
}

function drawFloatingTexts() {
    floatingTexts = floatingTexts.filter(t => t.life > 0);
    floatingTexts.forEach(t => {
        ctx.globalAlpha = t.alpha;
        ctx.fillStyle = t.color;
        ctx.font = 'bold 13px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t.text, t.x, t.y);
        t.y -= 1;
        t.life--;
        t.alpha = t.life / 40;
    });
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
}

// ---- Draw Functions ----
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Regular food: Israeli flag orb
function drawFood() {
    const x = food.x, y = food.y, s = TILE_SIZE;

    ctx.shadowBlur = 10;
    ctx.shadowColor = '#0038b8';
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + s / 2, y + s / 2, s / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#0038b8';
    ctx.fillRect(x + 3, y + s * 0.2, s - 6, s * 0.15);
    ctx.fillRect(x + 3, y + s * 0.65, s - 6, s * 0.15);

    ctx.strokeStyle = '#0038b8';
    ctx.lineWidth = 1.2;
    const cx = x + s / 2, cy = y + s / 2, r = s * 0.15;
    ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.866, cy + r * 0.5); ctx.lineTo(cx - r * 0.866, cy + r * 0.5); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy + r); ctx.lineTo(cx + r * 0.866, cy - r * 0.5); ctx.lineTo(cx - r * 0.866, cy - r * 0.5); ctx.closePath(); ctx.stroke();
}

// Bonus food dispatcher
function drawBonusFood() {
    if (!bonusFood) return;

    // Flicker when near expiry
    const timeLeft = bonusFood.expiresAt - Date.now();
    if (timeLeft < 2000 && Math.floor(Date.now() / 200) % 2 === 0) return;

    if (bonusFood.bonusType === 'menorah') drawMenorahOrb(bonusFood.x, bonusFood.y);
    if (bonusFood.bonusType === 'kotel')   drawKotelOrb(bonusFood.x, bonusFood.y);
}

// Menorah orb - gold glow
function drawMenorahOrb(x, y) {
    const s = TILE_SIZE;
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#FFA500';
    ctx.fillStyle = '#1a1000';
    ctx.beginPath();
    ctx.arc(x + s / 2, y + s / 2, s / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw simplified menorah
    const cx = x + s / 2;
    const by = y + s - 3;  // base y
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1;

    // Base
    ctx.beginPath(); ctx.moveTo(cx - 5, by); ctx.lineTo(cx + 5, by); ctx.stroke();
    // Center stem
    ctx.beginPath(); ctx.moveTo(cx, by); ctx.lineTo(cx, y + 4); ctx.stroke();
    // Arms: 3 on each side
    const arms = [4, 7, 10];
    arms.forEach(offset => {
        const armY = by - 4;
        // Left arm
        ctx.beginPath(); ctx.moveTo(cx, armY); ctx.lineTo(cx - offset, armY - 2); ctx.lineTo(cx - offset, y + 4); ctx.stroke();
        // Right arm
        ctx.beginPath(); ctx.moveTo(cx, armY); ctx.lineTo(cx + offset, armY - 2); ctx.lineTo(cx + offset, y + 4); ctx.stroke();
    });

    // Candle flames (dots on top of each arm + center)
    ctx.fillStyle = '#FFD700';
    const flamePositions = [-10, -7, -4, 0, 4, 7, 10];
    flamePositions.forEach(offset => {
        ctx.beginPath();
        ctx.arc(cx + offset, y + 3, 1.2, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Kotel orb - stone wall pattern
function drawKotelOrb(x, y) {
    const s = TILE_SIZE;
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#7c4dff';
    ctx.fillStyle = '#2a1f3d';
    ctx.beginPath();
    ctx.arc(x + s / 2, y + s / 2, s / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + s / 2, y + s / 2, s / 2 - 1, 0, Math.PI * 2);
    ctx.clip();

    // Draw stone rows
    const stoneColor = '#b39ddb';
    const mortarColor = '#2a1f3d';
    ctx.fillStyle = stoneColor;
    const stoneH = 4;
    const rows = 4;
    for (let row = 0; row < rows; row++) {
        const ry = y + 3 + row * (stoneH + 1);
        const offset = (row % 2) * 4;
        // Draw 3 stones per row with offset
        for (let col = -1; col < 3; col++) {
            const rx = x + offset + col * 8;
            ctx.fillRect(rx + 1, ry, 7, stoneH);
        }
    }
    ctx.restore();

    // Purple rim
    ctx.strokeStyle = '#7c4dff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + s / 2, y + s / 2, s / 2 - 1, 0, Math.PI * 2);
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
            const eyeSize = 3, offset = 4;

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
    clearBonusFood();

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

// ---- Keyboard Controls ----
document.addEventListener('keydown', (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"].includes(e.code)) {
        e.preventDefault();
    }
    if (e.key === 'Enter') {
        if (!startScreen.classList.contains('hidden')) initGame();
        else if (!gameOverScreen.classList.contains('hidden')) initGame();
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

// ---- Touch Swipe Controls ----
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (!isGameRunning) {
        // Tap to start
        if (!startScreen.classList.contains('hidden')) initGame();
        else if (!gameOverScreen.classList.contains('hidden')) initGame();
        return;
    }

    const dx_touch = e.changedTouches[0].clientX - touchStartX;
    const dy_touch = e.changedTouches[0].clientY - touchStartY;
    const absDx = Math.abs(dx_touch);
    const absDy = Math.abs(dy_touch);
    if (Math.max(absDx, absDy) < 15) return; // too small, ignore

    const goingUp = dy === -TILE_SIZE;
    const goingDown = dy === TILE_SIZE;
    const goingRight = dx === TILE_SIZE;
    const goingLeft = dx === -TILE_SIZE;

    if (absDx > absDy) {
        // Horizontal swipe
        if (dx_touch > 0 && !goingLeft)  { dx = TILE_SIZE;  dy = 0; }
        if (dx_touch < 0 && !goingRight) { dx = -TILE_SIZE; dy = 0; }
    } else {
        // Vertical swipe
        if (dy_touch > 0 && !goingUp)   { dx = 0; dy = TILE_SIZE;  }
        if (dy_touch < 0 && !goingDown) { dx = 0; dy = -TILE_SIZE; }
    }
}, { passive: false });

// ---- D-Pad Button Controls ----
function handleDpad(direction) {
    if (!isGameRunning) return;
    const goingUp = dy === -TILE_SIZE;
    const goingDown = dy === TILE_SIZE;
    const goingRight = dx === TILE_SIZE;
    const goingLeft = dx === -TILE_SIZE;

    switch (direction) {
        case 'up':    if (!goingDown)  { dx = 0; dy = -TILE_SIZE; } break;
        case 'down':  if (!goingUp)    { dx = 0; dy = TILE_SIZE;  } break;
        case 'left':  if (!goingRight) { dx = -TILE_SIZE; dy = 0; } break;
        case 'right': if (!goingLeft)  { dx = TILE_SIZE;  dy = 0; } break;
    }
}

['Up', 'Down', 'Left', 'Right'].forEach(dir => {
    const btn = document.getElementById('dpad' + dir);
    if (!btn) return;
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); handleDpad(dir.toLowerCase()); }, { passive: false });
    btn.addEventListener('mousedown', () => handleDpad(dir.toLowerCase()));
});

startBtn.addEventListener('click', initGame);
restartBtn.addEventListener('click', initGame);

// Initial canvas fill
ctx.fillStyle = '#050510';
ctx.fillRect(0, 0, canvas.width, canvas.height);

