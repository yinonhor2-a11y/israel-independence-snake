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
const CANVAS_SIZE = 400; // Internal resolution
const SPEED = 80;
const MAX_SCORES = 8;

// Bonus orb config
const BONUS_TYPES = [
    { type: 'menorah', points: 30, color: '#FFD700', glow: '#FFA500', label: '🕎 +30' },
    { type: 'kotel',   points: 50, color: '#b39ddb', glow: '#7c4dff', label: '🪨 +50' },
];
const BONUS_DURATION = 5000;

// Game Variables
let snake = [];
let food = { x: 0, y: 0 };
let bonusFood = null;
let dx = 0;
let dy = 0;
let score = 0;
let currentPlayer = '';
let gameLoop;
let isGameRunning = false;

// Visual Effects
let floatingTexts = [];
let particles = [];

// ---- Leaderboard ----
function getLeaderboard() {
    try { return JSON.parse(localStorage.getItem('snakeLeaderboard')) || []; }
    catch { return []; }
}
function saveLeaderboard(board) {
    localStorage.setItem('snakeLeaderboard', JSON.stringify(board));
}
function addToLeaderboard(name, playerScore) {
    if (playerScore <= 0) return getLeaderboard();
    const board = getLeaderboard();
    board.push({ name: name || 'Anonymous', score: playerScore });
    board.sort((a, b) => b.score - a.score);
    const trimmed = board.slice(0, MAX_SCORES);
    saveLeaderboard(trimmed);
    return trimmed;
}
function isNewRecord(playerScore) {
    if (playerScore <= 0) return false;
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
    
    if (board.length > 0) {
        highScoreElement.textContent = board[0].score;
        highScoreNameElement.textContent = board[0].name;
    }
}

// ---- Player Persistence ----
function getLastName() { return localStorage.getItem('snakeLastName') || ''; }
function saveLastName(name) { localStorage.setItem('snakeLastName', name); }

playerNameInput.value = getLastName();
renderLeaderboard();

// ---- Particle System ----
function createExplosion(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x + TILE_SIZE / 2,
            y: y + TILE_SIZE / 2,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            radius: Math.random() * 3 + 1,
            color: color,
            alpha: 1,
            life: 1
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.03;
        if (p.alpha <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// ---- Game Logic ----
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
    floatingTexts = [];
    particles = [];
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
    updateParticles();
    
    clearCanvas();
    drawGrid();
    drawFood();
    if (bonusFood) drawBonusFood();
    drawSnake();
    drawParticles();
    drawFloatingTexts();
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(0, 56, 184, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= CANVAS_SIZE; x += TILE_SIZE) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_SIZE); ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_SIZE; y += TILE_SIZE) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_SIZE, y); ctx.stroke();
    }
}

function moveSnake() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    
    // Wrap around
    if (head.x < 0) head.x = CANVAS_SIZE - TILE_SIZE;
    if (head.x >= CANVAS_SIZE) head.x = 0;
    if (head.y < 0) head.y = CANVAS_SIZE - TILE_SIZE;
    if (head.y >= CANVAS_SIZE) head.y = 0;

    snake.unshift(head);

    let ate = false;

    // Food collision
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        spawnFloatingText('+10', head.x, head.y, '#7adfff');
        createExplosion(food.x, food.y, '#ffffff');
        generateFood();
        ate = true;
        if (Math.random() < 0.3) spawnBonusFood();
    }

    // Bonus collision
    if (bonusFood && head.x === bonusFood.x && head.y === bonusFood.y) {
        const bonus = BONUS_TYPES.find(b => b.type === bonusFood.bonusType);
        score += bonus.points;
        scoreElement.textContent = score;
        spawnFloatingText(bonus.label, head.x, head.y, bonus.color);
        createExplosion(bonusFood.x, bonusFood.y, bonus.color, 20);
        clearBonusFood();
        ate = true;
    }

    if (!ate) snake.pop();
}

function spawnBonusFood() {
    if (bonusFood) return;
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
    const max = (CANVAS_SIZE / TILE_SIZE) - 1;
    let pos;
    let ok = false;
    while (!ok) {
        pos = {
            x: Math.floor(Math.random() * (max + 1)) * TILE_SIZE,
            y: Math.floor(Math.random() * (max + 1)) * TILE_SIZE
        };
        ok = !snake.some(s => s.x === pos.x && s.y === pos.y) && (pos.x !== food.x || pos.y !== food.y);
    }
    return pos;
}

function checkCollision() {
    const head = snake[0];
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) return true;
    }
    return false;
}

function generateFood() {
    const pos = randomFreePosition();
    food.x = pos.x;
    food.y = pos.y;
}

function spawnFloatingText(text, x, y, color) {
    floatingTexts.push({ text, x: x + TILE_SIZE / 2, y, color, alpha: 1, life: 40 });
}

function drawFloatingTexts() {
    floatingTexts = floatingTexts.filter(t => t.life > 0);
    floatingTexts.forEach(t => {
        ctx.save();
        ctx.globalAlpha = t.alpha;
        ctx.fillStyle = t.color;
        ctx.font = 'bold 16px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();
        t.y -= 1;
        t.life--;
        t.alpha = t.life / 40;
    });
}

function clearCanvas() {
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
}

function drawFood() {
    const s = TILE_SIZE;
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#0038b8';
    
    // Flag Orb
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(food.x + s/2, food.y + s/2, s/2 - 1, 0, Math.PI*2); ctx.fill();
    
    ctx.fillStyle = '#0038b8';
    ctx.fillRect(food.x + 3, food.y + s*0.2, s-6, s*0.12);
    ctx.fillRect(food.x + 3, food.y + s*0.68, s-6, s*0.12);
    
    // Star
    ctx.strokeStyle = '#0038b8';
    ctx.lineWidth = 1;
    const cx = food.x + s/2, cy = food.y + s/2, r = s*0.18;
    ctx.beginPath(); ctx.moveTo(cx, cy-r); ctx.lineTo(cx+r*0.866, cy+r*0.5); ctx.lineTo(cx-r*0.866, cy+r*0.5); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy+r); ctx.lineTo(cx+r*0.866, cy-r*0.5); ctx.lineTo(cx-r*0.866, cy-r*0.5); ctx.closePath(); ctx.stroke();
    ctx.restore();
}

function drawBonusFood() {
    if (!bonusFood) return;
    const s = TILE_SIZE;
    const timeLeft = bonusFood.expiresAt - Date.now();
    if (timeLeft < 1500 && Math.floor(Date.now() / 150) % 2 === 0) return;

    ctx.save();
    const color = bonusFood.bonusType === 'menorah' ? '#FFD700' : '#b39ddb';
    const glow = bonusFood.bonusType === 'menorah' ? '#FFA500' : '#7c4dff';
    
    ctx.shadowBlur = 20;
    ctx.shadowColor = glow;
    ctx.fillStyle = bonusFood.bonusType === 'menorah' ? '#1a1000' : '#2a1f3d';
    ctx.beginPath(); ctx.arc(bonusFood.x + s/2, bonusFood.y + s/2, s/2 - 1, 0, Math.PI*2); ctx.fill();
    
    if (bonusFood.bonusType === 'menorah') {
        // Simple Menorah icon
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        const cx = bonusFood.x + s/2, by = bonusFood.y + s - 5;
        ctx.beginPath(); ctx.moveTo(cx-4, by); ctx.lineTo(cx+4, by); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, by); ctx.lineTo(cx, bonusFood.y + 5); ctx.stroke();
        [3, 6].forEach(o => {
            ctx.beginPath(); ctx.arc(cx, by-2, o, Math.PI, 0); ctx.stroke();
        });
    } else {
        // Kotel brick pattern
        ctx.beginPath(); ctx.arc(bonusFood.x + s/2, bonusFood.y + s/2, s/2 - 2, 0, Math.PI*2); ctx.clip();
        ctx.fillStyle = color;
        for(let i=0; i<4; i++) {
            const ry = bonusFood.y + 2 + i*4;
            const off = (i%2)*4;
            for(let j=-1; j<3; j++) ctx.fillRect(bonusFood.x + off + j*8, ry, 7, 3);
        }
    }
    ctx.restore();
}

function drawSnake() {
    snake.forEach((seg, i) => {
        const isHead = i === 0;
        ctx.save();
        ctx.fillStyle = isHead ? '#ffffff' : (i % 2 === 0 ? '#e0eaff' : '#0038b8');
        ctx.shadowBlur = isHead ? 20 : 5;
        ctx.shadowColor = '#0038b8';
        
        const size = TILE_SIZE - 2;
        ctx.beginPath();
        ctx.roundRect(seg.x + 1, seg.y + 1, size, size, 6);
        ctx.fill();
        
        if (isHead) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#050510';
            const eyeSize = 3;
            const off = 5;
            let e1x, e1y, e2x, e2y;
            if (dx > 0) { e1x = seg.x + TILE_SIZE - off; e1y = seg.y + off; e2x = seg.x + TILE_SIZE - off; e2y = seg.y + TILE_SIZE - off; }
            else if (dx < 0) { e1x = seg.x + off; e1y = seg.y + off; e2x = seg.x + off; e2y = seg.y + TILE_SIZE - off; }
            else if (dy < 0) { e1x = seg.x + off; e1y = seg.y + off; e2x = seg.x + TILE_SIZE - off; e2y = seg.y + off; }
            else { e1x = seg.x + off; e1y = seg.y + TILE_SIZE - off; e2x = seg.x + TILE_SIZE - off; e2y = seg.y + TILE_SIZE - off; }
            
            ctx.beginPath(); ctx.arc(e1x, e1y, eyeSize, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(e2x, e2y, eyeSize, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
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
    newRecordMsg.classList.toggle('hidden', !madeRecord);
    gameOverScreen.classList.remove('hidden');
}

// ---- Controls ----
function handleMove(nx, ny) {
    if (!isGameRunning) return;
    if (nx !== 0 && dx === -nx) return;
    if (ny !== 0 && dy === -ny) return;
    dx = nx; dy = ny;
}

document.addEventListener('keydown', e => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"].includes(e.code)) e.preventDefault();
    if (e.key === 'Enter') {
        if (!startScreen.classList.contains('hidden') || !gameOverScreen.classList.contains('hidden')) initGame();
        return;
    }
    if (e.key === 'ArrowUp') handleMove(0, -TILE_SIZE);
    if (e.key === 'ArrowDown') handleMove(0, TILE_SIZE);
    if (e.key === 'ArrowLeft') handleMove(-TILE_SIZE, 0);
    if (e.key === 'ArrowRight') handleMove(TILE_SIZE, 0);
});

// Touch & D-Pad
let tsX = 0, tsY = 0;
document.addEventListener('touchstart', e => {
    if (e.target.closest('button') || e.target.closest('input')) return;
    tsX = e.touches[0].clientX; tsY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchmove', e => {
    if (!e.target.closest('button') && !e.target.closest('input')) e.preventDefault();
}, { passive: false });

document.addEventListener('touchend', e => {
    if (e.target.closest('button') || e.target.closest('input')) return;
    if (!isGameRunning) {
        if (!startScreen.classList.contains('hidden') || !gameOverScreen.classList.contains('hidden')) initGame();
        return;
    }
    const dX = e.changedTouches[0].clientX - tsX, dY = e.changedTouches[0].clientY - tsY;
    if (Math.max(Math.abs(dX), Math.abs(dY)) < 30) return;
    if (Math.abs(dX) > Math.abs(dY)) handleMove(dX > 0 ? TILE_SIZE : -TILE_SIZE, 0);
    else handleMove(0, dY > 0 ? TILE_SIZE : -TILE_SIZE);
}, { passive: true });

['Up', 'Down', 'Left', 'Right'].forEach(d => {
    const b = document.getElementById('dpad' + d);
    if (!b) return;
    const h = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (d==='Up') handleMove(0, -TILE_SIZE);
        if (d==='Down') handleMove(0, TILE_SIZE);
        if (d==='Left') handleMove(-TILE_SIZE, 0);
        if (d==='Right') handleMove(TILE_SIZE, 0);
    };
    b.addEventListener('touchstart', h, { passive: false });
    b.addEventListener('mousedown', h);
});

startBtn.addEventListener('click', initGame);
restartBtn.addEventListener('click', initGame);
clearCanvas();
