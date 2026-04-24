const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

// Game Constants
const TILE_SIZE = 20;
const CANVAS_SIZE = 400;
const SPEED = 100;

// Game Variables
let snake = [];
let food = { x: 0, y: 0 };
let dx = 0;
let dy = 0;
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameLoop;
let isGameRunning = false;

// Assets
const appleImg = new Image();
appleImg.src = 'assets/flag_orb.png'; // Will load the generated image

// Initialize High Score
highScoreElement.textContent = highScore;

function initGame() {
    // Reset snake
    snake = [
        { x: 200, y: 200 },
        { x: 180, y: 200 },
        { x: 160, y: 200 }
    ];
    
    // Initial velocity (moving right)
    dx = TILE_SIZE;
    dy = 0;
    
    // Reset score
    score = 0;
    scoreElement.textContent = score;
    
    generateFood();
    
    // Hide overlays
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    
    isGameRunning = true;
    
    // Start game loop
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
    snake.unshift(head);
    
    // Check if food eaten
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        generateFood();
    } else {
        snake.pop(); // Remove tail if no food eaten
    }
}

function checkCollision() {
    const head = snake[0];
    
    // Wall collision
    if (head.x < 0 || head.x >= CANVAS_SIZE || head.y < 0 || head.y >= CANVAS_SIZE) {
        return true;
    }
    
    // Self collision
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }
    
    return false;
}

function generateFood() {
    const maxPos = (CANVAS_SIZE / TILE_SIZE) - 1;
    food.x = Math.floor(Math.random() * maxPos) * TILE_SIZE;
    food.y = Math.floor(Math.random() * maxPos) * TILE_SIZE;
    
    // Ensure food doesn't spawn on snake
    snake.forEach(segment => {
        if (food.x === segment.x && food.y === segment.y) {
            generateFood();
        }
    });
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawFood() {
    // Check if the image is loaded
    if (appleImg.complete && appleImg.naturalWidth !== 0) {
        // Draw the custom flag orb
        ctx.drawImage(appleImg, food.x, food.y, TILE_SIZE, TILE_SIZE);
    } else {
        // Fallback to drawing a simple glowing blue orb
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#0038b8';
        ctx.beginPath();
        ctx.arc(food.x + TILE_SIZE/2, food.y + TILE_SIZE/2, TILE_SIZE/2 - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow
    }
}

function drawSnake() {
    snake.forEach((segment, index) => {
        // Head is white, body is alternating blue/white for festive look
        const isHead = index === 0;
        const isBlue = index % 2 !== 0;
        
        ctx.fillStyle = isHead ? '#ffffff' : (isBlue ? '#0038b8' : '#e0eaff');
        
        // Add a slight glow to the snake
        ctx.shadowBlur = isHead ? 10 : 5;
        ctx.shadowColor = '#0038b8';
        
        // Draw segment with slightly rounded corners
        ctx.beginPath();
        ctx.roundRect(segment.x + 1, segment.y + 1, TILE_SIZE - 2, TILE_SIZE - 2, 4);
        ctx.fill();
        
        // Draw eyes on the head
        if (isHead) {
            ctx.shadowBlur = 0; // No shadow for eyes
            ctx.fillStyle = '#0a0a1a'; // Dark eyes
            
            // Determine eye positions based on direction
            let eye1X, eye1Y, eye2X, eye2Y;
            const eyeSize = 3;
            const offset = 4;
            
            if (dx > 0) { // Moving right
                eye1X = segment.x + TILE_SIZE - offset - eyeSize;
                eye1Y = segment.y + offset;
                eye2X = segment.x + TILE_SIZE - offset - eyeSize;
                eye2Y = segment.y + TILE_SIZE - offset - eyeSize;
            } else if (dx < 0) { // Moving left
                eye1X = segment.x + offset;
                eye1Y = segment.y + offset;
                eye2X = segment.x + offset;
                eye2Y = segment.y + TILE_SIZE - offset - eyeSize;
            } else if (dy < 0) { // Moving up
                eye1X = segment.x + offset;
                eye1Y = segment.y + offset;
                eye2X = segment.x + TILE_SIZE - offset - eyeSize;
                eye2Y = segment.y + offset;
            } else { // Moving down
                eye1X = segment.x + offset;
                eye1Y = segment.y + TILE_SIZE - offset - eyeSize;
                eye2X = segment.x + TILE_SIZE - offset - eyeSize;
                eye2Y = segment.y + TILE_SIZE - offset - eyeSize;
            }
            
            ctx.fillRect(eye1X, eye1Y, eyeSize, eyeSize);
            ctx.fillRect(eye2X, eye2Y, eyeSize, eyeSize);
        }
        
        ctx.shadowBlur = 0; // Reset for next segment
    });
}

function gameOver() {
    isGameRunning = false;
    clearInterval(gameLoop);
    
    // Update high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        highScoreElement.textContent = highScore;
    }
    
    finalScoreElement.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

// Event Listeners
document.addEventListener('keydown', (e) => {
    // Prevent default scrolling for arrow keys
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
    }
    
    if (!isGameRunning) return;
    
    const goingUp = dy === -TILE_SIZE;
    const goingDown = dy === TILE_SIZE;
    const goingRight = dx === TILE_SIZE;
    const goingLeft = dx === -TILE_SIZE;
    
    switch (e.key) {
        case 'ArrowUp':
            if (!goingDown) { dx = 0; dy = -TILE_SIZE; }
            break;
        case 'ArrowDown':
            if (!goingUp) { dx = 0; dy = TILE_SIZE; }
            break;
        case 'ArrowLeft':
            if (!goingRight) { dx = -TILE_SIZE; dy = 0; }
            break;
        case 'ArrowRight':
            if (!goingLeft) { dx = TILE_SIZE; dy = 0; }
            break;
    }
});

startBtn.addEventListener('click', initGame);
restartBtn.addEventListener('click', initGame);

// Initial draw of static snake for the background
ctx.fillStyle = '#050510';
ctx.fillRect(0, 0, canvas.width, canvas.height);
