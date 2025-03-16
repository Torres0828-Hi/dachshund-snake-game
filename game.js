/** @type {HTMLCanvasElement} */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 设置画布大小
const setCanvasSize = () => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        const size = Math.min(window.innerWidth - 40, 400);
        canvas.width = size;
        canvas.height = size;
    } else {
        canvas.width = 600;
        canvas.height = 600;
    }
};

// 初始化画布大小
setCanvasSize();
window.addEventListener('resize', setCanvasSize);

// 游戏配置
const gridSize = canvas.width / 20;
const tileCount = canvas.width / gridSize;
const MAX_FOOD_COUNT = 5;
const GAME_SPEED = 150; // 每次移动的间隔时间（毫秒）
let lastMoveTime = 0; // 上次移动的时间

/** @type {Object} */
const game = {
    score: 0,
    isRunning: false,
    isPaused: false,
    lastPraiseScore: 0
};

// 创建音频对象
let customAudio = null;

// 处理音频文件上传
document.getElementById('audioUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    // 检查文件是否为音频文件
    if (!file.type.startsWith('audio/')) {
        alert('请上传音频文件！');
        return;
    }

    // 创建音频对象
    const reader = new FileReader();
    reader.onload = function(e) {
        // 创建临时音频元素来获取音频时长
        const tempAudio = new Audio(e.target.result);
        tempAudio.addEventListener('loadedmetadata', function() {
            if (tempAudio.duration > 2) {
                alert('请上传2秒以内的音频文件！');
                return;
            }
            
            // 音频符合要求，保存它
            customAudio = new Audio(e.target.result);
            document.getElementById('audioStatus').textContent = `已设置语音：${file.name}`;
        });
    };
    reader.readAsDataURL(file);
});

/** @type {Object} */
const snake = {
    x: 10,
    y: 10,
    tail: [],
    dx: 0,
    dy: 0,
    angle: 0,
    speed: 1
};

/** @type {Array} */
let foods = [];

// 加载图片资源
const fishOilImage = new Image();
fishOilImage.src = 'data:image/svg+xml,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <defs>
        <linearGradient id="capsuleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#FFE0B2"/>
            <stop offset="50%" style="stop-color:#FFCC80"/>
            <stop offset="100%" style="stop-color:#FFB74D"/>
        </linearGradient>
        <radialGradient id="shineGradient" cx="30%" cy="30%" r="50%">
            <stop offset="0%" style="stop-color:rgba(255,255,255,0.9)"/>
            <stop offset="100%" style="stop-color:rgba(255,255,255,0)"/>
        </radialGradient>
        <filter id="shadow">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
            <feOffset dx="2" dy="4"/>
            <feComponentTransfer>
                <feFuncA type="linear" slope="0.5"/>
            </feComponentTransfer>
            <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>
    </defs>
    <g filter="url(#shadow)">
        <ellipse cx="50" cy="50" rx="35" ry="25" fill="url(#capsuleGradient)" transform="rotate(-30,50,50)"/>
        <ellipse cx="50" cy="50" rx="30" ry="20" fill="url(#shineGradient)" transform="rotate(-30,50,50)"/>
    </g>
</svg>
`);

// 初始蛇的长度
const initialTailLength = 2;
for (let i = 0; i < initialTailLength; i++) {
    snake.tail.push({ x: snake.x - i, y: snake.y });
}

// 猴子相关变量
let monkeyElement = null;
let monkeyContainer = null;
let poops = [];
let fishOilCount = 0;
const POOP_INTERVAL = 1000; // 1秒后投掷
const REQUIRED_FISH_OIL = 5; // 需要收集5个鱼油才能清除粑粑

function initMonkey() {
    monkeyContainer = document.createElement('div');
    monkeyContainer.className = 'monkey-container';
    
    const monkey = document.createElement('div');
    monkey.className = 'monkey hidden';
    
    // 添加猴子的身体部分
    const body = document.createElement('div');
    body.className = 'monkey-body';
    
    const face = document.createElement('div');
    face.className = 'monkey-face';
    
    const eyes = document.createElement('div');
    eyes.className = 'monkey-eyes';
    
    const nose = document.createElement('div');
    nose.className = 'monkey-nose';
    
    const mouth = document.createElement('div');
    mouth.className = 'monkey-mouth';
    
    face.appendChild(eyes);
    face.appendChild(nose);
    face.appendChild(mouth);
    monkey.appendChild(body);
    monkey.appendChild(face);
    
    monkeyContainer.appendChild(monkey);
    document.body.appendChild(monkeyContainer);
    monkeyElement = monkey;
}

function showMonkey() {
    if (monkeyElement.classList.contains('hidden')) {
        monkeyElement.classList.remove('hidden');
        setTimeout(() => {
            throwPoop();
        }, POOP_INTERVAL);
    }
}

function throwPoop() {
    monkeyElement.classList.add('throwing');
    
    const poop = document.createElement('div');
    poop.className = 'poop';
    
    // 确保粑粑出现在画布范围内
    const x = Math.random() * (canvas.width - 60);
    const y = Math.random() * (canvas.height - 60);
    
    poop.style.left = x + 'px';
    poop.style.top = y + 'px';
    
    document.body.appendChild(poop);
    poops.push({
        element: poop,
        width: 60,
        height: 60
    });
    
    setTimeout(() => {
        monkeyElement.classList.remove('throwing');
        monkeyElement.classList.add('hidden');
    }, 1000);
}

function checkPoopCollision(x, y) {
    const dachshundWidth = gridSize;
    const dachshundHeight = gridSize;
    
    for (let i = poops.length - 1; i >= 0; i--) {
        const poop = poops[i];
        const poopX = parseFloat(poop.element.style.left);
        const poopY = parseFloat(poop.element.style.top);
        
        if (x < poopX + poop.width &&
            x + dachshundWidth > poopX &&
            y < poopY + poop.height &&
            y + dachshundHeight > poopY) {
            // 碰到粑粑，游戏结束
            gameOver();
            return true;
        }
    }
    return false;
}

function updateFishOilCount() {
    fishOilCount++;
    if (fishOilCount >= REQUIRED_FISH_OIL) {
        // 清除所有粑粑
        poops.forEach(poop => {
            poop.element.remove();
        });
        poops = [];
        fishOilCount = 0;
        
        // 随机显示猴子
        if (Math.random() < 0.3) { // 30%概率显示猴子
            showMonkey();
        }
    }
}

/** 
 * 播放表扬语音
 */
function playPraiseSound() {
    if (customAudio) {
        customAudio.currentTime = 0; // 重置音频到开始位置
        customAudio.play().catch(error => {
            console.log('Auto-play prevented:', error);
        });
    }
}

/** 
 * 计算当前应该显示的食物数量
 * @returns {number} 食物数量
 */
function calculateFoodCount() {
    return Math.min(Math.floor(game.score / 10) + 1, MAX_FOOD_COUNT);
}

/** 
 * 绘制腊肠狗
 */
function drawDachshund(ctx) {
    // 绘制蛇身（从尾部开始，这样头部会在上面）
    snake.tail.forEach((segment, index) => {
        const x = segment.x * gridSize;
        const y = segment.y * gridSize;
        
        if (index === 0) {
            // 头部
            ctx.fillStyle = '#8B4513';
            ctx.beginPath();
            ctx.roundRect(x, y, gridSize, gridSize, 8);
            ctx.fill();
            
            // 耳朵
            ctx.fillStyle = '#654321';
            // 左耳
            ctx.beginPath();
            ctx.ellipse(x + gridSize * 0.2, y - gridSize * 0.2, gridSize * 0.2, gridSize * 0.1, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
            // 右耳
            ctx.beginPath();
            ctx.ellipse(x + gridSize * 0.8, y - gridSize * 0.2, gridSize * 0.2, gridSize * 0.1, -Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
            
            // 眼睛
            ctx.fillStyle = 'white';
            const eyeSize = gridSize / 6;
            // 左眼
            ctx.beginPath();
            ctx.arc(x + gridSize * 0.3, y + gridSize * 0.3, eyeSize, 0, Math.PI * 2);
            ctx.fill();
            // 右眼
            ctx.beginPath();
            ctx.arc(x + gridSize * 0.7, y + gridSize * 0.3, eyeSize, 0, Math.PI * 2);
            ctx.fill();
            
            // 眼珠
            ctx.fillStyle = 'black';
            // 左眼珠
            ctx.beginPath();
            ctx.arc(x + gridSize * 0.3, y + gridSize * 0.3, eyeSize/2, 0, Math.PI * 2);
            ctx.fill();
            // 右眼珠
            ctx.beginPath();
            ctx.arc(x + gridSize * 0.7, y + gridSize * 0.3, eyeSize/2, 0, Math.PI * 2);
            ctx.fill();
            
            // 鼻子
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.ellipse(x + gridSize * 0.5, y + gridSize * 0.6, gridSize * 0.15, gridSize * 0.1, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // 嘴巴
            ctx.strokeStyle = '#4A3728';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + gridSize * 0.3, y + gridSize * 0.7);
            ctx.quadraticCurveTo(x + gridSize * 0.5, y + gridSize * 0.8, x + gridSize * 0.7, y + gridSize * 0.7);
            ctx.stroke();
        } else {
            // 身体
            ctx.fillStyle = '#8B4513';
            ctx.beginPath();
            ctx.roundRect(x, y, gridSize, gridSize, 5);
            ctx.fill();
            
            // 身体纹理
            ctx.fillStyle = '#654321';
            ctx.beginPath();
            ctx.roundRect(x + gridSize * 0.2, y, gridSize * 0.6, gridSize, 3);
            ctx.fill();
        }
    });
}

/** 
 * 绘制食物
 */
function drawFood(ctx, food) {
    ctx.fillStyle = '#FF6B6B';
    ctx.strokeStyle = '#FF8787';
    ctx.lineWidth = 2;
    
    ctx.save();
    ctx.translate(food.x * gridSize + gridSize/2, food.y * gridSize + gridSize/2);
    
    // 绘制胶囊形状
    ctx.beginPath();
    ctx.ellipse(0, 0, gridSize/2, gridSize/4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // 添加高光效果
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.ellipse(-gridSize/4, -gridSize/8, gridSize/6, gridSize/8, Math.PI/4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

/** 
 * 绘制背景
 */
function drawBackground() {
    // 创建渐变背景
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#E8F5E9');
    gradient.addColorStop(1, '#C8E6C9');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制网格
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= tileCount; i++) {
        const pos = i * gridSize;
        // 绘制竖线
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, canvas.height);
        ctx.stroke();
        
        // 绘制横线
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(canvas.width, pos);
        ctx.stroke();
    }
}

// 添加鼠标控制和虚拟摇杆相关变量
let mouseX = 0;
let mouseY = 0;
let isMouseControl = false;
let joystickActive = false;
let joystickX = 0;
let joystickY = 0;
let joystickBaseX = 0;
let joystickBaseY = 0;
let currentDirection = { x: 0, y: 0 };

// 创建鼠标指示器
const hoverIndicator = document.createElement('div');
hoverIndicator.className = 'hover-indicator';
document.body.appendChild(hoverIndicator);

// 初始化虚拟摇杆
const joystickBase = document.getElementById('joystick-base');
const joystickThumb = document.getElementById('joystick-thumb');
const maxJoystickDistance = 50; // 最大移动距离

// 鼠标移动事件
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    
    // 更新鼠标指示器位置
    hoverIndicator.style.left = e.clientX + 'px';
    hoverIndicator.style.top = e.clientY + 'px';
    
    if (!isMobile() && game.isRunning && !game.isPaused) {
        isMouseControl = true;
        hoverIndicator.style.display = 'block';
    }
});

canvas.addEventListener('mouseenter', () => {
    if (!isMobile() && game.isRunning && !game.isPaused) {
        isMouseControl = true;
        hoverIndicator.style.display = 'block';
    }
});

canvas.addEventListener('mouseleave', () => {
    isMouseControl = false;
    hoverIndicator.style.display = 'none';
});

// 触摸事件处理
joystickBase.addEventListener('touchstart', handleTouchStart);
joystickBase.addEventListener('touchmove', handleTouchMove);
joystickBase.addEventListener('touchend', handleTouchEnd);

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = joystickBase.getBoundingClientRect();
    joystickBaseX = rect.left + rect.width / 2;
    joystickBaseY = rect.top + rect.height / 2;
    joystickActive = true;
    updateJoystickPosition(touch.clientX, touch.clientY);
}

function handleTouchMove(e) {
    if (!joystickActive) return;
    e.preventDefault();
    const touch = e.touches[0];
    updateJoystickPosition(touch.clientX, touch.clientY);
}

function handleTouchEnd() {
    joystickActive = false;
    joystickThumb.style.transform = 'translate(-50%, -50%)';
    currentDirection = { x: 0, y: 0 };
}

function updateJoystickPosition(touchX, touchY) {
    let deltaX = touchX - joystickBaseX;
    let deltaY = touchY - joystickBaseY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance > maxJoystickDistance) {
        deltaX = (deltaX / distance) * maxJoystickDistance;
        deltaY = (deltaY / distance) * maxJoystickDistance;
    }
    
    joystickThumb.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
    
    // 更新方向
    if (distance > 10) { // 添加死区
        currentDirection = {
            x: deltaX / maxJoystickDistance,
            y: deltaY / maxJoystickDistance
        };
        updateSnakeDirection();
    }
}

function updateSnakeDirection() {
    if (isMouseControl) {
        // 计算蛇头和鼠标位置之间的角度
        const headX = snake.x * gridSize + gridSize / 2;
        const headY = snake.y * gridSize + gridSize / 2;
        snake.angle = Math.atan2(mouseY - headY, mouseX - headX);
    } else if (joystickActive) {
        // 根据虚拟摇杆的方向更新角度
        snake.angle = Math.atan2(currentDirection.y, currentDirection.x);
    }
    
    // 根据角度计算dx和dy
    snake.dx = Math.cos(snake.angle) * snake.speed;
    snake.dy = Math.sin(snake.angle) * snake.speed;
}

// 检测是否为移动设备
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/** 
 * 游戏主循环
 */
function gameLoop(timestamp) {
    if (!game.isRunning || game.isPaused) return;
    
    // 控制移动速度
    if (timestamp - lastMoveTime > GAME_SPEED) {
        moveSnake();
        
        // 在移动蛇之后，检查是否碰到粑粑
        if (checkPoopCollision(snake.x * gridSize, snake.y * gridSize)) {
            return;
        }
        
        // 检查是否吃到食物
        checkFoodCollision();
        
        checkCollision();
        lastMoveTime = timestamp;
    }
    
    draw();
    requestAnimationFrame(gameLoop);
}

/** 
 * 移动蛇
 */
function moveSnake() {
    if (!game.isRunning || game.isPaused) return;

    // 更新蛇的位置
    const newX = snake.x + snake.dx;
    const newY = snake.y + snake.dy;
    
    // 更新蛇的位置
    snake.x = newX;
    snake.y = newY;
    
    // 更新蛇身
    snake.tail.unshift({ x: snake.x, y: snake.y });
    
    // 检查是否吃到食物
    let foodEaten = false;
    for (let i = 0; i < foods.length; i++) {
        const food = foods[i];
        if (Math.floor(snake.x) === Math.floor(food.x) && 
            Math.floor(snake.y) === Math.floor(food.y)) {
            // 吃到食物
            foods.splice(i, 1);
            game.score += 10;
            document.getElementById('scoreText').textContent = game.score;
            foodEaten = true;
            
            // 增加长度
            const lastSegment = snake.tail[snake.tail.length - 1];
            snake.tail.push({ x: lastSegment.x, y: lastSegment.y });
            
            generateFood();
            
            // 每吃到10分播放一次音效
            if (Math.floor(game.score / 10) > Math.floor(game.lastPraiseScore / 10)) {
                playPraiseSound();
                game.lastPraiseScore = game.score;
            }
            break;
        }
    }
    
    // 如果没有吃到食物，删除尾部
    if (!foodEaten) {
        snake.tail.pop();
    }
}

/** 
 * 检查碰撞
 */
function checkCollision() {
    // 检查墙壁碰撞
    if (snake.x < 0 || snake.x >= tileCount || snake.y < 0 || snake.y >= tileCount) {
        gameOver();
        return;
    }
}

/** 
 * 绘制游戏画面
 */
function draw() {
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制背景
    drawBackground();
    
    // 绘制腊肠狗
    drawDachshund(ctx);
    
    // 绘制食物
    foods.forEach(food => {
        ctx.drawImage(
            fishOilImage,
            food.x * gridSize,
            food.y * gridSize,
            gridSize,
            gridSize
        );
    });
}

/** 
 * 生成新的食物位置
 */
function generateFood() {
    const newFood = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
    };
    
    // 确保食物不会生成在蛇身上或其他食物上
    const isOnSnake = snake.tail.some(segment => 
        segment.x === newFood.x && segment.y === newFood.y
    ) || (snake.x === newFood.x && snake.y === newFood.y);
    
    const isOnOtherFood = foods.some(food =>
        food.x === newFood.x && food.y === newFood.y
    );
    
    if (isOnSnake || isOnOtherFood) {
        generateFood();
        return;
    }
    
    foods.push(newFood);
}

/** 
 * 游戏结束处理
 */
function gameOver() {
    game.isRunning = false;
    game.isPaused = false;
    document.getElementById('gameMessage').textContent = `游戏结束！得分：${game.score}`;
    document.getElementById('gameMessage').classList.add('visible');
    
    // 清除所有粑粑
    poops.forEach(poop => {
        poop.element.remove();
    });
    poops = [];
    fishOilCount = 0;
    if (monkeyElement) {
        monkeyElement.classList.add('hidden');
    }
    
    resetGame();
}

/** 
 * 重置游戏状态
 */
function resetGame() {
    snake.x = 10;
    snake.y = 10;
    snake.dx = 0;
    snake.dy = 0;
    snake.tail = [];
    for (let i = 0; i < initialTailLength; i++) {
        snake.tail.push({ x: snake.x - i, y: snake.y });
    }
    game.score = 0;
    game.lastPraiseScore = 0;
    document.getElementById('scoreText').textContent = '0';
    foods = [];
    snake.angle = 0;
    snake.speed = 1;
    poops = [];
    
    // 清除所有已存在的粑粑元素
    document.querySelectorAll('.poop').forEach(poop => poop.remove());
    
    // 重新初始化猴子
    if (monkeyElement) {
        monkeyElement.classList.add('hidden');
    }
}

/** 
 * 切换游戏暂停状态
 */
function togglePause() {
    if (!game.isRunning) return;
    
    game.isPaused = !game.isPaused;
    const pauseButton = document.getElementById('pauseButton');
    const gameMessage = document.getElementById('gameMessage');
    
    if (game.isPaused) {
        pauseButton.textContent = '继续';
        pauseButton.classList.add('paused');
        gameMessage.textContent = '游戏暂停';
        gameMessage.classList.add('visible');
    } else {
        pauseButton.textContent = '暂停';
        pauseButton.classList.remove('paused');
        gameMessage.classList.remove('visible');
        gameLoop();
    }
}

// 键盘控制
document.addEventListener('keydown', (event) => {
    if (!game.isRunning) {
        // 任意键开始游戏
        startGame();
        return;
    }
    
    if (event.key === 'Escape') {
        togglePause();
        return;
    }
    
    if (game.isPaused) return;
    
    let newDx = snake.dx;
    let newDy = snake.dy;
    
    switch (event.key) {
        case 'ArrowUp':
            if (snake.dy !== 1) { // 防止反向移动
                newDx = 0;
                newDy = -1;
            }
            break;
        case 'ArrowDown':
            if (snake.dy !== -1) {
                newDx = 0;
                newDy = 1;
            }
            break;
        case 'ArrowLeft':
            if (snake.dx !== 1) {
                newDx = -1;
                newDy = 0;
            }
            break;
        case 'ArrowRight':
            if (snake.dx !== -1) {
                newDx = 1;
                newDy = 0;
            }
            break;
    }
    
    snake.dx = newDx;
    snake.dy = newDy;
});

/** 
 * 开始游戏
 */
function startGame() {
    if (!game.isRunning) {
        resetGame(); // 重置游戏状态
        game.isRunning = true;
        game.isPaused = false;
        snake.dx = 1; // 初始向右移动
        snake.dy = 0;
        snake.angle = 0;
        generateFood(); // 生成初始食物
        initMonkey(); // 初始化猴子
        document.getElementById('gameMessage').classList.remove('visible');
        document.getElementById('pauseButton').classList.remove('paused');
        document.getElementById('pauseButton').textContent = '暂停';
        gameLoop();
    }
}

// 开始按钮点击事件
document.getElementById('startButton').addEventListener('click', startGame);

// 暂停按钮点击事件
document.getElementById('pauseButton').addEventListener('click', togglePause);

// 添加移动端控制
const touchButtons = ['upButton', 'downButton', 'leftButton', 'rightButton'];
touchButtons.forEach(buttonId => {
    const button = document.getElementById(buttonId);
    button.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!game.isRunning || game.isPaused) return;
        
        switch (buttonId) {
            case 'upButton':
                if (snake.dy !== 1) {
                    snake.dx = 0;
                    snake.dy = -1;
                }
                break;
            case 'downButton':
                if (snake.dy !== -1) {
                    snake.dx = 0;
                    snake.dy = 1;
                }
                break;
            case 'leftButton':
                if (snake.dx !== 1) {
                    snake.dx = -1;
                    snake.dy = 0;
                }
                break;
            case 'rightButton':
                if (snake.dx !== -1) {
                    snake.dx = 1;
                    snake.dy = 0;
                }
                break;
        }
    });
});

// 添加触摸开始游戏
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!game.isRunning) {
        startGame();
    }
});

/** 
 * 控制猴子的出现和消失
 */
function toggleMonkey() {
    const monkey = document.getElementById('monkey');
    isMonkeyVisible = !isMonkeyVisible;
    
    if (isMonkeyVisible) {
        monkey.classList.remove('hidden');
        throwPoop();
        
        // 随机1-2秒后消失
        setTimeout(() => {
            monkey.classList.add('hidden');
            isMonkeyVisible = false;
            
            // 设置下一次出现的时间（5-10秒）
            monkeyTimer = setTimeout(toggleMonkey, Math.random() * 5000 + 5000);
        }, Math.random() * 1000 + 1000);
    }
}

/** 
 * 检查食物碰撞并更新分数
 */
function checkFoodCollision() {
    for (let i = 0; i < foods.length; i++) {
        const food = foods[i];
        if (Math.floor(snake.x) === Math.floor(food.x) && 
            Math.floor(snake.y) === Math.floor(food.y)) {
            // 吃到食物
            foods.splice(i, 1);
            game.score += 10;
            document.getElementById('scoreText').textContent = game.score;
            
            // 增加长度
            const lastSegment = snake.tail[snake.tail.length - 1];
            snake.tail.push({ x: lastSegment.x, y: lastSegment.y });
            
            generateFood();
            
            // 更新鱼油计数并检查是否需要显示猴子
            updateFishOilCount();
            
            // 每吃到10分播放一次音效
            if (Math.floor(game.score / 10) > Math.floor(game.lastPraiseScore / 10)) {
                playPraiseSound();
                game.lastPraiseScore = game.score;
            }
            return true;
        }
    }
    return false;
}

function removePoop() {
    // Implementation of removePoop function
}