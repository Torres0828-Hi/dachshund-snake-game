// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // 设置画布大小
    canvas.width = Math.min(600, window.innerWidth - 20);
    canvas.height = canvas.width;

    // 游戏配置
    const gridSize = canvas.width / 20;
    const tileCount = canvas.width / gridSize;
    const MAX_FOOD_COUNT = 5;
    const GAME_SPEED = 150; // 每次移动的间隔时间（毫秒）
    let lastMoveTime = 0; // 上次移动的时间

    // 游戏状态
    const game = {
        score: 0,
        isRunning: false,
        isPaused: false,
        lastPraiseScore: 0
    };

    // 蛇的初始状态
    const snake = {
        x: 10,
        y: 10,
        dx: 0,
        dy: 0,
        tail: [],
        speed: 1
    };

    // 初始尾巴长度
    const initialTailLength = 3;
    for (let i = 0; i < initialTailLength; i++) {
        snake.tail.push({ x: snake.x - i, y: snake.y });
    }

    // 食物数组
    let foods = [];
    let fishOilCount = 0;
    const REQUIRED_FISH_OIL = 5;

    // 地雷相关变量
    let mines = [];
    const MINE_SPAWN_CHANCE = 0.3; // 30%几率出现地雷

    // 音频相关
    let customAudio = null;

    // 添加爆炸音效
    const explosionSound = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAAFbgCenp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6e//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAYAAAAAAAAABWZVxbKOAAAAAAAAAAAAAAAAAAAA//sQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=');

    /** 
     * 生成食物
     */
    function generateFood() {
        let newFood;
        do {
            newFood = {
                x: Math.floor(Math.random() * tileCount),
                y: Math.floor(Math.random() * tileCount)
            };
        } while (isFoodOnSnake(newFood));
        
        foods.push(newFood);
    }

    /** 
     * 检查食物是否在蛇身上
     */
    function isFoodOnSnake(food) {
        return snake.tail.some(segment => 
            segment.x === food.x && segment.y === food.y
        );
    }

    /** 
     * 计算当前应该有多少食物
     */
    function calculateFoodCount() {
        return Math.min(MAX_FOOD_COUNT, Math.floor(game.score / 50) + 1);
    }

    /** 
     * 移动蛇
     */
    function moveSnake() {
        if (!game.isRunning || game.isPaused) return;

        // 更新蛇的位置
        snake.x += snake.dx;
        snake.y += snake.dy;
        
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
                
                // 更新鱼油计数并检查是否需要显示猴子
                updateFishOilCount();
                
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
        if (snake.x < 0 || snake.x >= tileCount || 
            snake.y < 0 || snake.y >= tileCount) {
            gameOver(false);
            return true;
        }
        
        // 检查自身碰撞
        for (let i = 1; i < snake.tail.length; i++) {
            if (snake.x === snake.tail[i].x && snake.y === snake.tail[i].y) {
                gameOver(false);
                return true;
            }
        }
        return false;
    }

    /** 
     * 游戏结束
     */
    function gameOver(isMineExplosion = false) {
        game.isRunning = false;
        const message = isMineExplosion ? 
            '乖乖你被炸死了，按任意键重新开始' : 
            '游戏结束，按任意键重新开始';
        document.getElementById('gameMessage').textContent = message;
        document.getElementById('gameMessage').classList.add('visible');
    }

    /** 
     * 重置游戏
     */
    function reset() {
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
        mines = [];
        fishOilCount = 0;
        generateFood();
    }

    /** 
     * 开始游戏
     */
    function startGame() {
        if (!game.isRunning) {
            reset();
            game.isRunning = true;
            game.isPaused = false;
            snake.dx = 1; // 初始向右移动
            snake.dy = 0;
            document.getElementById('gameMessage').classList.remove('visible');
            document.getElementById('pauseButton').classList.remove('paused');
            document.getElementById('pauseButton').textContent = '暂停';
        }
    }

    /** 
     * 暂停游戏
     */
    function togglePause() {
        if (!game.isRunning) return;
        
        game.isPaused = !game.isPaused;
        const pauseButton = document.getElementById('pauseButton');
        if (game.isPaused) {
            pauseButton.textContent = '继续';
            pauseButton.classList.add('paused');
            document.getElementById('gameMessage').textContent = '游戏暂停';
            document.getElementById('gameMessage').classList.add('visible');
        } else {
            pauseButton.textContent = '暂停';
            pauseButton.classList.remove('paused');
            document.getElementById('gameMessage').classList.remove('visible');
            requestAnimationFrame(gameLoop);
        }
    }

    /** 
     * 播放音效
     */
    function playPraiseSound() {
        if (customAudio) {
            customAudio.currentTime = 0;
            customAudio.play();
        }
    }

    /** 
     * 绘制腊肠狗
     */
    function drawDachshund() {
        // 绘制蛇身（从尾部开始，这样头部会在上面）
        for (let i = snake.tail.length - 1; i >= 0; i--) {
            const segment = snake.tail[i];
            const x = segment.x * gridSize;
            const y = segment.y * gridSize;
            
            if (i === 0) {
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
        }
    }

    /** 
     * 绘制鱼油胶囊
     */
    function drawFishOil(x, y) {
        const capsuleWidth = gridSize;
        const capsuleHeight = gridSize * 0.6;
        const centerX = x + capsuleWidth/2;
        const centerY = y + gridSize/2;
        
        // 胶囊主体
        ctx.fillStyle = '#FFE4B5';
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, capsuleWidth/2, capsuleHeight/2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 渐变效果
        const gradient = ctx.createLinearGradient(x, y, x + capsuleWidth, y);
        gradient.addColorStop(0, 'rgba(255, 228, 181, 0.9)');  // 浅黄色
        gradient.addColorStop(0.3, 'rgba(255, 200, 100, 0.7)'); // 金黄色
        gradient.addColorStop(0.7, 'rgba(255, 180, 80, 0.8)');  // 深金色
        gradient.addColorStop(1, 'rgba(255, 160, 60, 0.9)');    // 琥珀色
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, capsuleWidth/2, capsuleHeight/2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 外边框
        ctx.strokeStyle = 'rgba(255, 160, 60, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, capsuleWidth/2, capsuleHeight/2, 0, 0, Math.PI * 2);
        ctx.stroke();
        
        // 高光效果1（左上）
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.ellipse(
            centerX - capsuleWidth * 0.15,
            centerY - capsuleHeight * 0.15,
            capsuleWidth * 0.15,
            capsuleHeight * 0.1,
            -Math.PI / 4,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        // 高光效果2（右下小点）
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.ellipse(
            centerX + capsuleWidth * 0.1,
            centerY + capsuleHeight * 0.1,
            capsuleWidth * 0.08,
            capsuleHeight * 0.05,
            Math.PI / 4,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }

    /** 
     * 绘制地雷
     */
    function drawMine(x, y) {
        // 地雷主体
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(x + gridSize/2, y + gridSize/2, gridSize/2 - 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 地雷尖刺
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(
                x + gridSize/2 + Math.cos(angle) * (gridSize/2 - 2),
                y + gridSize/2 + Math.sin(angle) * (gridSize/2 - 2)
            );
            ctx.lineTo(
                x + gridSize/2 + Math.cos(angle) * (gridSize/2 + 4),
                y + gridSize/2 + Math.sin(angle) * (gridSize/2 + 4)
            );
            ctx.stroke();
        }
        
        // 高光效果
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(x + gridSize/3, y + gridSize/3, gridSize/6, 0, Math.PI * 2);
        ctx.fill();
    }

    /** 
     * 绘制爆炸效果
     */
    function drawExplosion(x, y, progress) {
        const maxRadius = gridSize * 4; // 最大爆炸半径
        const currentRadius = maxRadius * progress;
        
        // 蘑菇云茎部
        const stemGradient = ctx.createLinearGradient(
            x + gridSize/2,
            y + gridSize/2,
            x + gridSize/2,
            y - currentRadius
        );
        stemGradient.addColorStop(0, 'rgba(169, 169, 169, ' + (1 - progress) + ')');
        stemGradient.addColorStop(0.6, 'rgba(128, 128, 128, ' + (0.8 - progress) + ')');
        stemGradient.addColorStop(1, 'rgba(105, 105, 105, 0)');
        
        ctx.fillStyle = stemGradient;
        ctx.beginPath();
        ctx.moveTo(x + gridSize/4, y);
        ctx.quadraticCurveTo(
            x + gridSize/2,
            y - currentRadius * 0.7,
            x + gridSize * 0.75,
            y
        );
        ctx.fill();
        
        // 蘑菇云头部
        const cloudRadius = currentRadius * 0.6;
        const cloudY = y - currentRadius * 0.7;
        
        const cloudGradient = ctx.createRadialGradient(
            x + gridSize/2,
            cloudY,
            0,
            x + gridSize/2,
            cloudY,
            cloudRadius
        );
        
        cloudGradient.addColorStop(0, 'rgba(255, 200, 0, ' + (1 - progress) + ')');
        cloudGradient.addColorStop(0.2, 'rgba(255, 100, 0, ' + (0.8 - progress) + ')');
        cloudGradient.addColorStop(0.4, 'rgba(255, 50, 0, ' + (0.6 - progress) + ')');
        cloudGradient.addColorStop(0.6, 'rgba(169, 169, 169, ' + (0.4 - progress) + ')');
        cloudGradient.addColorStop(1, 'rgba(105, 105, 105, 0)');
        
        ctx.fillStyle = cloudGradient;
        ctx.beginPath();
        ctx.arc(x + gridSize/2, cloudY, cloudRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // 底部火焰效果
        const flameGradient = ctx.createRadialGradient(
            x + gridSize/2,
            y,
            0,
            x + gridSize/2,
            y,
            currentRadius * 0.5
        );
        
        flameGradient.addColorStop(0, 'rgba(255, 200, 0, ' + (1 - progress) + ')');
        flameGradient.addColorStop(0.5, 'rgba(255, 100, 0, ' + (0.8 - progress) + ')');
        flameGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        ctx.fillStyle = flameGradient;
        ctx.beginPath();
        ctx.arc(x + gridSize/2, y, currentRadius * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }

    /** 
     * 播放爆炸动画
     */
    function playExplosionAnimation(x, y) {
        let progress = 0;
        const duration = 1000; // 动画持续1秒
        const startTime = performance.now();
        
        // 播放爆炸音效
        explosionSound.currentTime = 0;
        explosionSound.play();
        
        // 立即显示"乖乖你被炸死了"的消息
        game.isRunning = false;
        document.getElementById('gameMessage').textContent = '乖乖你被炸死了，按任意键重新开始';
        document.getElementById('gameMessage').classList.add('visible');
        
        function animate() {
            const currentTime = performance.now();
            progress = (currentTime - startTime) / duration;
            
            if (progress <= 1) {
                // 清除当前帧
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // 重绘背景和其他元素
                drawBackground();
                foods.forEach(food => {
                    drawFishOil(food.x * gridSize, food.y * gridSize);
                });
                mines.forEach(mine => {
                    if (mine.x !== x || mine.y !== y) { // 不绘制爆炸的地雷
                        drawMine(mine.x, mine.y);
                    }
                });
                drawDachshund();
                
                // 绘制爆炸效果
                drawExplosion(x, y, progress);
                
                requestAnimationFrame(animate);
            }
        }
        
        animate();
    }

    /** 
     * 绘制游戏画面
     */
    function draw() {
        // 清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 绘制背景
        drawBackground();
        
        // 绘制食物（鱼油）
        foods.forEach(food => {
            drawFishOil(food.x * gridSize, food.y * gridSize);
        });
        
        // 绘制地雷
        mines.forEach(mine => {
            drawMine(mine.x, mine.y);
        });
        
        // 绘制腊肠狗
        drawDachshund();
    }

    /** 
     * 绘制背景
     */
    function drawBackground() {
        ctx.fillStyle = '#F8F9FA';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制网格
        ctx.strokeStyle = '#E9ECEF';
        ctx.lineWidth = 1;
        
        for (let i = 0; i <= tileCount; i++) {
            ctx.beginPath();
            ctx.moveTo(i * gridSize, 0);
            ctx.lineTo(i * gridSize, canvas.height);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(0, i * gridSize);
            ctx.lineTo(canvas.width, i * gridSize);
            ctx.stroke();
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
        
        switch (event.key) {
            case 'ArrowUp':
                if (snake.dy !== 1) { // 防止反向移动
                    snake.dx = 0;
                    snake.dy = -1;
                }
                break;
            case 'ArrowDown':
                if (snake.dy !== -1) {
                    snake.dx = 0;
                    snake.dy = 1;
                }
                break;
            case 'ArrowLeft':
                if (snake.dx !== 1) {
                    snake.dx = -1;
                    snake.dy = 0;
                }
                break;
            case 'ArrowRight':
                if (snake.dx !== -1) {
                    snake.dx = 1;
                    snake.dy = 0;
                }
                break;
        }
    });

    // 移动端控制
    function handleMobileControl(direction) {
        if (!game.isRunning || game.isPaused) return;
        
        switch (direction) {
            case 'up':
                if (snake.dy !== 1) {
                    snake.dx = 0;
                    snake.dy = -1;
                }
                break;
            case 'down':
                if (snake.dy !== -1) {
                    snake.dx = 0;
                    snake.dy = 1;
                }
                break;
            case 'left':
                if (snake.dx !== 1) {
                    snake.dx = -1;
                    snake.dy = 0;
                }
                break;
            case 'right':
                if (snake.dx !== -1) {
                    snake.dx = 1;
                    snake.dy = 0;
                }
                break;
        }
    }

    // 添加移动端控制按钮事件监听
    document.getElementById('upButton')?.addEventListener('click', () => handleMobileControl('up'));
    document.getElementById('downButton')?.addEventListener('click', () => handleMobileControl('down'));
    document.getElementById('leftButton')?.addEventListener('click', () => handleMobileControl('left'));
    document.getElementById('rightButton')?.addEventListener('click', () => handleMobileControl('right'));

    // 按钮事件监听
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('pauseButton').addEventListener('click', togglePause);

    // 音频上传
    document.getElementById('audioUpload').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const audio = new Audio();
            audio.src = URL.createObjectURL(file);
            
            audio.onloadedmetadata = function() {
                if (audio.duration <= 2) {
                    customAudio = audio;
                    document.getElementById('audioStatus').textContent = `已设置语音：${file.name}`;
                } else {
                    alert('音频时长必须在2秒以内！');
                }
            };
        }
    });

    /** 
     * 游戏主循环
     */
    function gameLoop(timestamp) {
        // 无论游戏状态如何，都继续请求下一帧
        requestAnimationFrame(gameLoop);
        
        // 如果游戏未运行或暂停，只绘制当前状态
        if (!game.isRunning || game.isPaused) {
            draw();
            return;
        }
        
        // 控制移动速度
        if (timestamp - lastMoveTime > GAME_SPEED) {
            // 移动蛇
            moveSnake();
            
            // 检查碰撞
            if (checkMineCollision(snake.x * gridSize, snake.y * gridSize)) {
                return; // 如果碰到地雷，爆炸动画会处理游戏结束
            }
            
            if (checkCollision()) {
                return;
            }
            
            // 检查是否吃到食物
            checkFoodCollision();
            
            lastMoveTime = timestamp;
        }
        
        // 绘制游戏画面
        draw();
    }

    /** 
     * 检查食物碰撞
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
                break;
            }
        }
    }

    /** 
     * 初始化游戏
     */
    function init() {
        reset();
        document.getElementById('gameMessage').classList.add('visible');
        document.getElementById('gameMessage').textContent = '按任意键开始游戏';
        game.isRunning = false;
        game.isPaused = false;
        snake.dx = 0;
        snake.dy = 0;
        generateFood(); // 确保有初始食物
        draw(); // 立即绘制初始状态
        startMineSpawner(); // 开始生成地雷
        requestAnimationFrame(gameLoop);
    }

    // 立即初始化游戏
    init();

    /** 
     * 生成地雷
     */
    function spawnMine() {
        const mine = {
            x: Math.random() * (canvas.width - gridSize),
            y: Math.random() * (canvas.height - gridSize),
            width: gridSize,
            height: gridSize
        };
        mines.push(mine);
        
        // 3秒后移除地雷
        setTimeout(() => {
            const index = mines.indexOf(mine);
            if (index > -1) {
                mines.splice(index, 1);
            }
        }, 3000);
    }

    /** 
     * 开始生成地雷的定时器
     */
    function startMineSpawner() {
        return setInterval(() => {
            if (game.isRunning && !game.isPaused && mines.length < 3) {
                spawnMine();
            }
        }, 3000);
    }

    /** 
     * 检查地雷碰撞
     */
    function checkMineCollision(x, y) {
        for (let i = mines.length - 1; i >= 0; i--) {
            const mine = mines[i];
            if (x < mine.x + mine.width &&
                x + gridSize > mine.x &&
                y < mine.y + mine.height &&
                y + gridSize > mine.y) {
                
                // 开始爆炸动画
                playExplosionAnimation(mine.x, mine.y);
                return true;
            }
        }
        return false;
    }

    // 修改 updateFishOilCount 函数
    function updateFishOilCount() {
        fishOilCount++;
        if (fishOilCount >= REQUIRED_FISH_OIL) {
            // 清除所有粑粑和地雷
            poops.forEach(poop => {
                poop.element.remove();
            });
            poops = [];
            clearMines();
            fishOilCount = 0;
            
            // 随机显示猴子
            if (Math.random() < 0.3) { // 30%概率显示猴子
                showMonkey();
            }
            // 随机生成新地雷
            spawnMine();
        }
    }
}); 