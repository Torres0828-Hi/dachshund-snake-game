// 地雷相关变量
let mines = [];
const MINE_SPAWN_CHANCE = 0.3; // 30%几率出现地雷

function spawnMine() {
    if (Math.random() < MINE_SPAWN_CHANCE) {
        const mine = document.createElement('div');
        mine.className = 'mine';
        const x = Math.random() * (canvas.width - 30);
        const y = Math.random() * (canvas.height - 30);
        mine.style.left = x + 'px';
        mine.style.top = y + 'px';
        document.querySelector('.game-container').appendChild(mine);
        mines.push({
            element: mine,
            x: x,
            y: y,
            width: 30,
            height: 30
        });
    }
}

function checkMineCollision(x, y) {
    const dachshundWidth = gridSize;
    const dachshundHeight = gridSize;
    
    for (let i = mines.length - 1; i >= 0; i--) {
        const mine = mines[i];
        if (x < mine.x + mine.width &&
            x + dachshundWidth > mine.x &&
            y < mine.y + mine.height &&
            y + dachshundHeight > mine.y) {
            // 创建爆炸效果
            const explosion = document.createElement('div');
            explosion.className = 'explosion';
            explosion.style.left = (mine.x - 35) + 'px';
            explosion.style.top = (mine.y - 35) + 'px';
            document.querySelector('.game-container').appendChild(explosion);
            
            // 移除爆炸效果
            setTimeout(() => {
                explosion.remove();
            }, 500);
            
            gameOver();
            return true;
        }
    }
    return false;
}

function clearMines() {
    mines.forEach(mine => {
        mine.element.remove();
    });
    mines = [];
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

// 修改 gameLoop 函数
function gameLoop(timestamp) {
    if (!game.isRunning || game.isPaused) return;
    
    // 控制移动速度
    if (timestamp - lastMoveTime > GAME_SPEED) {
        moveSnake();
        
        // 在移动蛇之后，检查是否碰到粑粑或地雷
        if (checkPoopCollision(snake.x * gridSize, snake.y * gridSize) ||
            checkMineCollision(snake.x * gridSize, snake.y * gridSize)) {
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

// 修改 reset 函数
function reset() {
    // ... existing reset code ...
    clearMines();
    // 随机生成初始地雷
    spawnMine();
    // ... rest of existing reset code ...
}

// ... rest of existing code ... 