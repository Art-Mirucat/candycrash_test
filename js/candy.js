class Candy {
    constructor(row, col, type, specialType = SPECIAL_TYPE.NONE) {
        this.row = row;
        this.col = col;
        this.type = type; // red, yellow, blue, green
        this.specialType = specialType; // none, striped_h, striped_v, bomb, rainbow
        
        // 动画相关
        this.x = 0; // 像素坐标
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        
        this.state = CANDY_STATE.IDLE;
        this.scale = 1.0; // 缩放比例（用于被选中效果）
        this.alpha = 1.0; // 透明度（用于消除效果）
        
        this.isMatch = false; // 标记是否匹配
        this.mustExplode = false; // 标记是否被特殊效果炸毁
    }

    // 设置目标位置（像素）
    setTarget(x, y) {
        this.targetX = x;
        this.targetY = y;
    }

    // 瞬间移动到目标位置
    teleport() {
        this.x = this.targetX;
        this.y = this.targetY;
    }

    // 更新动画
    update(dt) {
        const speed = 15; // 移动速度系数

        // 简单的线性插值移动
        if (Math.abs(this.x - this.targetX) > 1) {
            this.x += (this.targetX - this.x) * speed * dt;
        } else {
            this.x = this.targetX;
        }

        if (Math.abs(this.y - this.targetY) > 1) {
            this.y += (this.targetY - this.y) * speed * dt;
        } else {
            this.y = this.targetY;
        }

        // 选中状态缩放效果
        if (this.state === CANDY_STATE.SELECTED) {
            this.scale = 1.1 + Math.sin(Date.now() / 200) * 0.05;
        } else {
            this.scale = 1.0;
        }
    }
}
