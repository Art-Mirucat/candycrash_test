// 游戏主控逻辑

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const timerElement = document.getElementById('timer-text');
const mascotImg = document.getElementById('mascot-img');
const restartBtn = document.getElementById('restart-btn');
const gameOverModal = document.getElementById('game-over-modal');
const finalScoreElement = document.getElementById('final-score');

let board;
let lastTime = 0;
let timeLeft = GAME_DURATION;
let isGameOver = false;
let gameLoopId;
let timerInterval;

// 初始化游戏
function init() {
    // 初始化棋盘
    board = new Board(canvas, ctx);

    // 设置画布尺寸
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 加载资源后开始
    resources.loadAll(() => {
        startGame();
        // 首次用户交互时播放背景音乐
        document.body.addEventListener('click', handleFirstInteraction, { once: true });
        document.body.addEventListener('touchstart', handleFirstInteraction, { once: true });
    });
}

function handleFirstInteraction() {
    resources.playBGM();
}

function startGame() {
    isGameOver = false;
    timeLeft = GAME_DURATION;
    board.score = 0;
    board.gameState = 'play';
    board.initGrid(); // 重置棋盘
    board.resize(canvas.width, canvas.height); // 确保糖果位置正确
    
    // 更新UI
    updateTimerUI();
    updateMascot();
    document.getElementById('score-text').innerText = '0';
    gameOverModal.classList.add('hidden');

    // 播放背景音乐
    resources.playBGM();

    // 开始计时
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerUI();
        updateMascot();
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);

    // 开始游戏循环
    lastTime = Date.now();
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoop();
}

function endGame() {
    isGameOver = true;
    board.gameState = 'gameover';
    clearInterval(timerInterval);
    
    // 显示结算弹窗
    finalScoreElement.innerText = board.score;
    gameOverModal.classList.remove('hidden');
}

function updateTimerUI() {
    timerElement.innerText = timeLeft;
}

function updateMascot() {
    let src = '';
    if (timeLeft > 40) {
        src = 'images/mascot/happy.png';
    } else if (timeLeft > 20) {
        src = 'images/mascot/sad.png';
    } else {
        src = 'images/mascot/nervous.png';
    }
    
    // 只有当src改变时才更新DOM，避免闪烁
    if (!mascotImg.src.endsWith(src)) {
        mascotImg.src = src;
    }
}

function resizeCanvas() {
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    // 逻辑宽度和高度
    // 题目要求：宽度90%，高度80%
    // 最大限制：600px x 800px
    // 比例：4:5 或 3:4
    
    let targetW = winW * 0.9;
    let targetH = winH * 0.8;

    if (targetW > 600) targetW = 600;
    if (targetH > 800) targetH = 800;

    // 强制保持比例 (例如 3:4)
    // 如果当前比例更宽，则以高度为准计算宽度
    // 如果当前比例更高，则以宽度为准计算高度
    const aspectRatio = 3 / 4;
    
    if (targetW / targetH > aspectRatio) {
        targetW = targetH * aspectRatio;
    } else {
        targetH = targetW / aspectRatio;
    }

    canvas.width = targetW;
    canvas.height = targetH;
    
    if (board) {
        board.resize(targetW, targetH);
    }
}

// 游戏循环
function gameLoop() {
    const now = Date.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (board) {
        board.update(dt);
        board.draw();
    }

    if (!isGameOver) {
        gameLoopId = requestAnimationFrame(gameLoop);
    }
}

// 输入事件处理
canvas.addEventListener('click', (e) => {
    if (isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    board.handleClick(x, y);
});

// 简单的触摸支持
canvas.addEventListener('touchstart', (e) => {
    if (isGameOver) return;
    e.preventDefault(); // 防止滚动
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    board.handleClick(x, y);
}, { passive: false });


restartBtn.addEventListener('click', () => {
    startGame();
});

// 启动
window.onload = init;
