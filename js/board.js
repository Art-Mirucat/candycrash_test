class Board {
    constructor(canvas, context) {
        this.canvas = canvas;
        this.ctx = context;
        this.grid = []; // 9x9 糖果网格
        this.width = 0; // 棋盘像素宽
        this.height = 0; // 棋盘像素高
        this.cellSize = 0; // 格子大小
        this.offsetX = 0; // 棋盘左上角X偏移
        this.offsetY = 0; // 棋盘左上角Y偏移
        
        this.selectedCandy = null; // 当前选中的糖果
        this.isAnimating = false; // 是否正在进行动画（禁止交互）
        this.score = 0;
        
        // 待处理的消除列表
        this.matches = [];
        
        // 游戏状态
        this.gameState = 'play'; // play, gameover
        
        this.initGrid();
    }

    // 初始化网格
    initGrid() {
        this.grid = [];
        for (let r = 0; r < ROWS; r++) {
            this.grid[r] = [];
            for (let c = 0; c < COLS; c++) {
                let type;
                // 确保初始生成不包含匹配
                do {
                    type = this.getRandomColor();
                } while (
                    (r >= 2 && this.grid[r-1][c].type === type && this.grid[r-2][c].type === type) ||
                    (c >= 2 && this.grid[r][c-1].type === type && this.grid[r][c-2].type === type)
                );
                this.grid[r][c] = new Candy(r, c, type);
            }
        }
    }

    getRandomColor() {
        const colors = [CANDY_TYPE.RED, CANDY_TYPE.YELLOW, CANDY_TYPE.BLUE, CANDY_TYPE.GREEN];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // 调整尺寸
    resize(width, height) {
        // 保持 9x9 正方形格子
        // 棋盘区域应该在屏幕中间
        const maxSize = Math.min(width, height);
        this.cellSize = Math.floor(maxSize / COLS);
        
        // 限制最大格子大小，防止在极大屏幕上过大
        if (this.cellSize > 80) this.cellSize = 80;

        this.width = this.cellSize * COLS;
        this.height = this.cellSize * ROWS;
        
        this.offsetX = (width - this.width) / 2;
        this.offsetY = (height - this.height) / 2;

        // 更新所有糖果的像素位置
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (this.grid[r][c]) {
                    const x = this.offsetX + c * this.cellSize;
                    const y = this.offsetY + r * this.cellSize;
                    this.grid[r][c].setTarget(x, y);
                    this.grid[r][c].teleport(); // 立即到位
                }
            }
        }
    }

    // 获取点击位置的糖果
    getCandyAt(x, y) {
        if (x < this.offsetX || x > this.offsetX + this.width ||
            y < this.offsetY || y > this.offsetY + this.height) {
            return null;
        }
        
        const c = Math.floor((x - this.offsetX) / this.cellSize);
        const r = Math.floor((y - this.offsetY) / this.cellSize);
        
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
            return this.grid[r][c];
        }
        return null;
    }

    // 处理点击
    handleClick(x, y) {
        if (this.isAnimating || this.gameState !== 'play') return;

        const candy = this.getCandyAt(x, y);
        if (!candy) return;

        if (!this.selectedCandy) {
            // 选择第一个糖果
            this.selectCandy(candy);
        } else {
            // 再次点击已选中的，取消选择
            if (this.selectedCandy === candy) {
                this.deselectCandy();
            } else {
                // 检查是否相邻
                if (this.isAdjacent(this.selectedCandy, candy)) {
                    this.swapCandies(this.selectedCandy, candy);
                } else {
                    // 非相邻，切换选择
                    this.deselectCandy();
                    this.selectCandy(candy);
                }
            }
        }
    }

    selectCandy(candy) {
        this.selectedCandy = candy;
        candy.state = CANDY_STATE.SELECTED;
    }

    deselectCandy() {
        if (this.selectedCandy) {
            this.selectedCandy.state = CANDY_STATE.IDLE;
            this.selectedCandy = null;
        }
    }

    isAdjacent(c1, c2) {
        return Math.abs(c1.row - c2.row) + Math.abs(c1.col - c2.col) === 1;
    }

    // 交换糖果
    async swapCandies(c1, c2) {
        this.isAnimating = true;
        this.deselectCandy(); // 取消高亮

        // 逻辑交换
        this.grid[c1.row][c1.col] = c2;
        this.grid[c2.row][c2.col] = c1;
        
        const tempRow = c1.row;
        const tempCol = c1.col;
        c1.row = c2.row;
        c1.col = c2.col;
        c2.row = tempRow;
        c2.col = tempCol;

        // 播放交换音效
        resources.playSound('swap');

        // 动画
        await this.animateSwap(c1, c2);

        // 检查是否有特殊糖果组合
        const specialCombo = this.checkSpecialCombo(c1, c2);
        
        if (specialCombo) {
            // 触发特殊组合
            await this.processSpecialCombo(c1, c2, specialCombo);
            await this.fillBoard();
        } else {
            // 检查是否有匹配
            const matches = this.findMatches();
            
            // 如果有匹配，或者使用了彩虹糖(彩虹糖可以和任何糖交换)
            const isRainbowMove = c1.specialType === SPECIAL_TYPE.RAINBOW || c2.specialType === SPECIAL_TYPE.RAINBOW;
            
            if (matches.length > 0 || isRainbowMove) {
                    // 有效交换
                    if (isRainbowMove) {
                        await this.processRainbowMove(c1, c2);
                    }
                    await this.processMatches(matches);
                } else if ((c1.specialType !== SPECIAL_TYPE.NONE && c1.specialType !== SPECIAL_TYPE.RAINBOW && c2.specialType === SPECIAL_TYPE.NONE) ||
                           (c2.specialType !== SPECIAL_TYPE.NONE && c2.specialType !== SPECIAL_TYPE.RAINBOW && c1.specialType === SPECIAL_TYPE.NONE)) {
                    // 特殊糖果（非彩虹糖）与普通糖果交换，触发特殊糖果效果
                    const specialCandy = c1.specialType !== SPECIAL_TYPE.NONE ? c1 : c2;
                    specialCandy.isMatch = true; // 标记为消除
                    this.triggerSpecialEffect(specialCandy);
                    await this.removeMatches();
        await this.fillBoard();
                    await this.fillBoard();
                }
                else {
                    // 无效交换，换回来
                    // 逻辑换回
                    this.grid[c1.row][c1.col] = c2;
                    this.grid[c2.row][c2.col] = c1;
                    
                    const tR = c1.row;
                    const tC = c1.col;
                    c1.row = c2.row;
                    c1.col = c2.col;
                    c2.row = tR;
                    c2.col = tC;

                    await this.animateSwap(c1, c2);
                    this.isAnimating = false;
                }
        }
    }

    animateSwap(c1, c2) {
        return new Promise(resolve => {
            const x1 = this.offsetX + c1.col * this.cellSize;
            const y1 = this.offsetY + c1.row * this.cellSize;
            const x2 = this.offsetX + c2.col * this.cellSize;
            const y2 = this.offsetY + c2.row * this.cellSize;

            c1.setTarget(x1, y1);
            c2.setTarget(x2, y2);

            // 简单延时等待动画完成 (实际项目中应该监听动画结束)
            setTimeout(resolve, ANIMATION_TIME.SWAP);
        });
    }

    // 检查特殊组合
    checkSpecialCombo(c1, c2) {
        if (c1.specialType === SPECIAL_TYPE.NONE || c2.specialType === SPECIAL_TYPE.NONE) {
            return null; // 必须两个都是特殊糖果
        }
        
        // 彩虹糖组合
        if (c1.specialType === SPECIAL_TYPE.RAINBOW && c2.specialType === SPECIAL_TYPE.RAINBOW) return 'double_rainbow';
        if (c1.specialType === SPECIAL_TYPE.RAINBOW || c2.specialType === SPECIAL_TYPE.RAINBOW) return 'rainbow_mix'; // 彩虹 + 其他特殊
        
        // 炸弹组合
        if (c1.specialType === SPECIAL_TYPE.BOMB && c2.specialType === SPECIAL_TYPE.BOMB) return 'double_bomb';
        
        // 条纹组合
        if ((c1.specialType === SPECIAL_TYPE.STRIPED_H || c1.specialType === SPECIAL_TYPE.STRIPED_V) &&
            (c2.specialType === SPECIAL_TYPE.STRIPED_H || c2.specialType === SPECIAL_TYPE.STRIPED_V)) return 'double_striped';
            
        // 条纹 + 炸弹
        if (((c1.specialType === SPECIAL_TYPE.STRIPED_H || c1.specialType === SPECIAL_TYPE.STRIPED_V) && c2.specialType === SPECIAL_TYPE.BOMB) ||
            ((c2.specialType === SPECIAL_TYPE.STRIPED_H || c2.specialType === SPECIAL_TYPE.STRIPED_V) && c1.specialType === SPECIAL_TYPE.BOMB)) return 'striped_bomb';
            
        return null;
    }

    // 处理特殊组合效果
    async processSpecialCombo(c1, c2, comboType) {
        resources.playSound('special');
        // 将这两个糖果加入消除列表，防止它们被重复处理
        c1.isMatch = true;
        c2.isMatch = true;

        if (comboType === 'double_rainbow') {
            // 清空全屏
            for(let r=0; r<ROWS; r++) {
                for(let c=0; c<COLS; c++) {
                    this.grid[r][c].isMatch = true;
                }
            }
        } else if (comboType === 'rainbow_mix') {
            // 彩虹 + 条纹/炸弹
            const rainbow = c1.specialType === SPECIAL_TYPE.RAINBOW ? c1 : c2;
            const other = c1 === rainbow ? c2 : c1;
            const targetColor = other.type;
            
            // 将所有同色糖果变成该特殊糖果
            for(let r=0; r<ROWS; r++) {
                for(let c=0; c<COLS; c++) {
                    if(this.grid[r][c].type === targetColor) {
                        this.grid[r][c].isMatch = true;
                        // 触发它们的效果（简化处理：直接标记为消除，如果是特殊糖果逻辑会递归）
                        // 这里更复杂的做法是将它们先变成特殊糖果，再引爆。
                        // 简化版：直接消除所有该颜色，并给予大量分数
                        this.grid[r][c].specialType = other.specialType; // 变成特殊糖果
                        this.triggerSpecialEffect(this.grid[r][c]); // 立即引爆
                    }
                }
            }
        } else if (comboType === 'double_bomb') {
            // 两个炸弹：两次3x3，实际上就是更大范围，这里简化为5x5爆炸
            this.explodeArea(c2.row, c2.col, 2); // 半径2 => 5x5
        } else if (comboType === 'double_striped') {
            // 十字消除
            this.clearRow(c2.row);
            this.clearCol(c2.col);
        } else if (comboType === 'striped_bomb') {
            // 条纹+炸弹：3行3列
            for(let i=-1; i<=1; i++) {
                if(c2.row+i >=0 && c2.row+i < ROWS) this.clearRow(c2.row+i);
                if(c2.col+i >=0 && c2.col+i < COLS) this.clearCol(c2.col+i);
            }
        }

        // 移除标记的糖果
        await this.removeMatches();
        await this.fillBoard();
    }
    
    // 处理彩虹糖单消（彩虹糖 + 普通糖）
    async processRainbowMove(c1, c2) {
        const rainbow = c1.specialType === SPECIAL_TYPE.RAINBOW ? c1 : c2;
        const other = c1 === rainbow ? c2 : c1;
        
        resources.playSound('special');
        rainbow.isMatch = true;
        
        // 消除所有同色糖果
        for(let r=0; r<ROWS; r++) {
            for(let c=0; c<COLS; c++) {
                if(this.grid[r][c].type === other.type) {
                    this.grid[r][c].isMatch = true;
                    // 如果被消除的是特殊糖果，触发其效果
                    if(this.grid[r][c].specialType !== SPECIAL_TYPE.NONE) {
                        this.triggerSpecialEffect(this.grid[r][c]);
                    }
                }
            }
        }
        
        await this.removeMatches();
        await this.fillBoard();
    }

    // 查找匹配
    findMatches() {
        const matches = [];
        
        // 横向
        for (let r = 0; r < ROWS; r++) {
            let matchLength = 1;
            for (let c = 0; c < COLS; c++) {
                if (c < COLS - 1 && this.grid[r][c].type === this.grid[r][c+1].type) {
                    matchLength++;
                } else {
                    if (matchLength >= 3) {
                        matches.push({
                            type: 'horizontal',
                            row: r,
                            colStart: c - matchLength + 1,
                            colEnd: c,
                            length: matchLength,
                            color: this.grid[r][c].type
                        });
                    }
                    matchLength = 1;
                }
            }
        }
        
        // 纵向
        for (let c = 0; c < COLS; c++) {
            let matchLength = 1;
            for (let r = 0; r < ROWS; r++) {
                if (r < ROWS - 1 && this.grid[r][c].type === this.grid[r+1][c].type) {
                    matchLength++;
                } else {
                    if (matchLength >= 3) {
                        matches.push({
                            type: 'vertical',
                            col: c,
                            rowStart: r - matchLength + 1,
                            rowEnd: r,
                            length: matchLength,
                            color: this.grid[r][c].type
                        });
                    }
                    matchLength = 1;
                }
            }
        }
        
        return matches;
    }

    // 处理匹配循环
    async processMatches(matches) {
        if (matches.length === 0) {
            this.isAnimating = false;
            return;
        }

        resources.playSound('match');

        // 标记消除并生成特殊糖果
        for (let m of matches) {
            let specialCreated = false;
            let targetRow, targetCol;

            // 确定生成位置（优先在交换位置或随机）
            if (m.type === 'horizontal') {
                targetRow = m.row;
                targetCol = Math.floor((m.colStart + m.colEnd) / 2); // 简化：取中间
            } else {
                targetCol = m.col;
                targetRow = Math.floor((m.rowStart + m.rowEnd) / 2);
            }

            // 遍历匹配中的每个糖果
            for (let i = 0; i < m.length; i++) {
                let r = m.type === 'horizontal' ? m.row : m.rowStart + i;
                let c = m.type === 'horizontal' ? m.colStart + i : m.col;
                
                // 如果该糖果已经是特殊糖果，触发效果
                if (this.grid[r][c].specialType !== SPECIAL_TYPE.NONE && !this.grid[r][c].isMatch) {
                    this.triggerSpecialEffect(this.grid[r][c]);
                }
                
                this.grid[r][c].isMatch = true;
            }

            // 生成特殊糖果逻辑
            if (m.length === 4) {
                // 条纹糖
                // 标记中心点不消除，转变为特殊糖果
                const candy = this.grid[targetRow][targetCol];
                candy.isMatch = false; 
                candy.specialType = m.type === 'horizontal' ? SPECIAL_TYPE.STRIPED_V : SPECIAL_TYPE.STRIPED_H; // 横向消除产生竖条纹(通常逻辑，或者反之) - 这里设定横向匹配产生竖消(Candy Crush逻辑)
                // 修正：横向移动产生横条纹还是竖条纹？
                // Candy Crush: 4个横连 -> 竖条纹(清除一列)。4个竖连 -> 横条纹(清除一行)。
                candy.specialType = m.type === 'horizontal' ? SPECIAL_TYPE.STRIPED_V : SPECIAL_TYPE.STRIPED_H;
                this.addScore(SCORE.MATCH_4);
            } else if (m.length >= 5) {
                // 彩虹糖
                const candy = this.grid[targetRow][targetCol];
                candy.isMatch = false;
                candy.specialType = SPECIAL_TYPE.RAINBOW;
                candy.type = SPECIAL_TYPE.RAINBOW; // 彩虹糖没有颜色
                this.addScore(SCORE.RAINBOW);
            } else {
                this.addScore(SCORE.MATCH_3);
            }
            
            // 注意：L型和T型匹配在简单算法中会被识别为两个独立的横纵匹配
            // 要完美实现Bomb需要更复杂的匹配合并逻辑。
            // 简单处理：如果一个糖果同时在横向和纵向匹配中，它应该变成炸弹。
        }

        // 检测L/T型炸弹生成
        // 如果这里没做Bomb逻辑，就只保留Striped和Rainbow。
        // 尝试简单补丁：
        // 如果一个位置被标记了两次match（横+竖），则生成Bomb。
        
        // findMatches分开返回横竖，如果某个格子坐标出现在两个match里，就是L/T/Cross。
        
        // 重新遍历matches找交点
        const matchMap = new Map(); // key: "r,c", value: count
        for (let m of matches) {
             for (let i = 0; i < m.length; i++) {
                let r = m.type === 'horizontal' ? m.row : m.rowStart + i;
                let c = m.type === 'horizontal' ? m.colStart + i : m.col;
                let key = `${r},${c}`;
                matchMap.set(key, (matchMap.get(key) || 0) + 1);
             }
        }
        
        for (let [key, count] of matchMap) {
            if (count > 1) {
                // 交点，生成炸弹
                const [r, c] = key.split(',').map(Number);
                const candy = this.grid[r][c];
                // 只有当它还没被定为彩虹糖时
                if (candy.specialType !== SPECIAL_TYPE.RAINBOW) {
                    candy.isMatch = false; // 复活
                    candy.specialType = SPECIAL_TYPE.BOMB;
                    this.addScore(SCORE.BOMB);
                }
            }
        }

        await this.removeMatches();
        await this.fillBoard();
    }

    // 触发特殊糖果效果
    triggerSpecialEffect(candy) {
        if (candy.isTriggered) return; // 防止死循环
        candy.isTriggered = true;
        candy.isMatch = true;

        if (candy.specialType === SPECIAL_TYPE.STRIPED_H) {
            this.clearRow(candy.row);
        } else if (candy.specialType === SPECIAL_TYPE.STRIPED_V) {
            this.clearCol(candy.col);
        } else if (candy.specialType === SPECIAL_TYPE.BOMB) {
            this.explodeArea(candy.row, candy.col, 1); // 半径1 => 3x3
        } else if (candy.specialType === SPECIAL_TYPE.RAINBOW) {
            // 被动触发彩虹糖（例如被炸到），随机消一种颜色
            const color = this.getRandomColor();
             for(let r=0; r<ROWS; r++) {
                for(let c=0; c<COLS; c++) {
                    if(this.grid[r][c].type === color) {
                        this.grid[r][c].isMatch = true;
                    }
                }
            }
        }
    }

    clearRow(row) {
        for(let c=0; c<COLS; c++) {
            this.handleCascadingEffect(this.grid[row][c]);
        }
    }

    clearCol(col) {
        for(let r=0; r<ROWS; r++) {
            this.handleCascadingEffect(this.grid[r][col]);
        }
    }

    explodeArea(row, col, radius) {
        for(let r = row - radius; r <= row + radius; r++) {
            for(let c = col - radius; c <= col + radius; c++) {
                if(r >= 0 && r < ROWS && c >= 0 && c < COLS) {
                    this.handleCascadingEffect(this.grid[r][c]);
                }
            }
        }
    }

    // 处理连锁触发（如果消除的是特殊糖果）
    handleCascadingEffect(candy) {
        if (candy.isMatch) return;
        candy.isMatch = true;
        if (candy.specialType !== SPECIAL_TYPE.NONE) {
            this.triggerSpecialEffect(candy);
        }
    }

    // 移除匹配的糖果并执行消除动画
    async removeMatches() {
        // 等待一小段时间展示消除效果
        await new Promise(r => setTimeout(r, ANIMATION_TIME.EXPLODE));
        
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (this.grid[r][c].isMatch) {
                    this.grid[r][c] = null; // 移除
                }
            }
        }
    }

    // 填充棋盘（下落）
    async fillBoard() {
        let moved = false;
        
        // 1. 下落逻辑
        for (let c = 0; c < COLS; c++) {
            for (let r = ROWS - 1; r >= 0; r--) {
                if (this.grid[r][c] === null) {
                    // 往上找第一个非空的
                    let found = false;
                    for (let k = r - 1; k >= 0; k--) {
                        if (this.grid[k][c] !== null) {
                            // 移动下来
                            this.grid[r][c] = this.grid[k][c];
                            this.grid[k][c] = null;
                            this.grid[r][c].row = r;
                            found = true;
                            moved = true;
                            break;
                        }
                    }
                    // 如果上面没找到，生成新的
                    if (!found) {
                        const type = this.getRandomColor();
                        const newCandy = new Candy(r, c, type);
                        // 初始位置在棋盘上方
                        newCandy.y = this.offsetY - (ROWS - r) * this.cellSize; 
                        newCandy.x = this.offsetX + c * this.cellSize;
                        newCandy.targetY = this.offsetY + r * this.cellSize; // 添加这一行
                        this.grid[r][c] = newCandy;
                        moved = true;
                    }
                }
            }
        }

        // 更新目标位置并播放动画
        if (moved) {
            const promises = [];
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const candy = this.grid[r][c];
                    const targetX = this.offsetX + c * this.cellSize;
                    const targetY = this.offsetY + r * this.cellSize;
                    candy.setTarget(targetX, targetY);
                    
                    // 我们不等待每个单独动画，而是等待一个总时间
                    // 这里简化，直接等待固定时间
                }
            }
            await new Promise(r => setTimeout(r, ANIMATION_TIME.FALL * ROWS)); // 给予足够的下落时间
            
            // 下落完成后，再次检查匹配（连锁反应）
            const newMatches = this.findMatches();
            if (newMatches.length > 0) {
                await this.processMatches(newMatches);
            } else {
                this.isAnimating = false;
            }
        } else {
            this.isAnimating = false;
        }
    }

    addScore(points) {
        this.score += points;
        // 更新UI
        const scoreEl = document.getElementById('score-text');
        if(scoreEl) scoreEl.innerText = this.score;
    }

    update(dt) {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (this.grid[r][c]) {
                    this.grid[r][c].update(dt);
                }
            }
        }
    }

    draw() {
        // 绘制背景网格
        // this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        // this.ctx.fillRect(this.offsetX, this.offsetY, this.width, this.height);

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const x = this.offsetX + c * this.cellSize;
                const y = this.offsetY + r * this.cellSize;
                
                // 绘制格子背景
                this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);
            }
        }

        // 绘制糖果
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const candy = this.grid[r][c];
                if (candy) {
                    this.drawCandy(candy);
                }
            }
        }
    }

    drawCandy(candy) {
        const cx = candy.x + this.cellSize / 2;
        const cy = candy.y + this.cellSize / 2;
        const size = (this.cellSize * 0.8) * candy.scale;
        
        this.ctx.save();
        this.ctx.translate(cx, cy);
        
        // 绘制选中光环
        if (candy.state === CANDY_STATE.SELECTED) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, size / 1.5, 0, Math.PI * 2);
            this.ctx.fill();
        }

        let imgKey = candy.type;
        
        // 特殊糖果贴图处理
        if (candy.specialType === SPECIAL_TYPE.RAINBOW) imgKey = 'rainbow';
        else if (candy.specialType === SPECIAL_TYPE.BOMB) imgKey = 'bomb';
        else if (candy.specialType === SPECIAL_TYPE.STRIPED_H) imgKey = 'striped_h';
        else if (candy.specialType === SPECIAL_TYPE.STRIPED_V) imgKey = 'striped_v';

        const img = resources.getImage(imgKey);
        
        if (img) {
            this.ctx.drawImage(img, -size/2, -size/2, size, size);
        } else {
            // 备用绘制
            this.ctx.fillStyle = candy.type;
            if(candy.specialType === SPECIAL_TYPE.RAINBOW) this.ctx.fillStyle = 'purple';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, size/2, 0, Math.PI*2);
            this.ctx.fill();
        }

        this.ctx.restore();
    }
}
