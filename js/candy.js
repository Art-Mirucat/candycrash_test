const CandyType = {
    RED: 'RED',
    GREEN: 'GREEN',
    BLUE: 'BLUE',
    YELLOW: 'YELLOW',
    STRIPE_H: 'STRIPE_H', // Horizontal stripe
    STRIPE_V: 'STRIPE_V', // Vertical stripe
    BOMB: 'BOMB',
    RAINBOW: 'RAINBOW'
};

class Candy {
    constructor(x, y, assets, candyType = null, cellSize = 70, originalType = null) {
        this.x = x;
        this.y = y;
        this.cellSize = cellSize;
        this.assets = assets; // Store assets

        if (candyType === null) {
            const types = [CandyType.RED, CandyType.GREEN, CandyType.BLUE, CandyType.YELLOW];
            this.type = types[Math.floor(Math.random() * types.length)];
            this.originalType = this.type;
        } else {
            this.type = candyType;
            if (Candy.isSpecialType(candyType)) {
                this.originalType = originalType || this.type;
            } else {
                this.originalType = candyType;
            }
        }

        this.specialType = Candy.isSpecialType(this.type) ? this.type : null;
        this.image = this.loadImage();
        this.selected = false;
        this.targetX = x * cellSize;
        this.targetY = y * cellSize;
        this.posX = this.targetX;
        this.posY = this.targetY;
        this.swapping = false;
        this.swappingBack = false;
        this.scale = 1.0;
        this.isFalling = false;
    }

    loadImage() {
        const typeMap = {
            [CandyType.RED]: this.assets.images.red,
            [CandyType.GREEN]: this.assets.images.green,
            [CandyType.BLUE]: this.assets.images.blue,
            [CandyType.YELLOW]: this.assets.images.yellow,
            [CandyType.STRIPE_H]: this.assets.images.stripe_h,
            [CandyType.STRIPE_V]: this.assets.images.stripe_v,
            [CandyType.BOMB]: this.assets.images.bomb,
            [CandyType.RAINBOW]: this.assets.images.rainbow,
        };
        return typeMap[this.type] || this.assets.images.red; // Default to red if image not found
    }

    setTargetPosition(gridX, gridY, swappingBack = false) {
        this.targetX = gridX * this.cellSize;
        this.targetY = gridY * this.cellSize;
        this.x = gridX;
        this.y = gridY;
        if (swappingBack) {
            this.swappingBack = true;
        }
    }

    update(dt) {
        const speed = 500 * dt;
        let animating = false;

        // Handle swapping animation
        if (this.swapping || this.swappingBack) {
            const dx = this.targetX - this.posX;
            const dy = this.targetY - this.posY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < speed) {
                this.posX = this.targetX;
                this.posY = this.targetY;
                if (this.swappingBack) {
                    this.swappingBack = false;
                    this.setTargetPosition(this.x, this.y);
                }
                this.swapping = false;
            } else {
                this.posX += (dx / dist) * speed;
                this.posY += (dy / dist) * speed;
                animating = true;
            }
        }

        // Handle falling animation
        if (this.isFalling) {
            this.posY += 800 * dt;
            if (this.posY >= this.targetY) {
                this.posY = this.targetY;
                this.isFalling = false;
            }
            animating = true;
        }

        return animating;
    }

    draw(ctx, offsetX, offsetY) {
        const size = this.cellSize * this.scale;
        const centerX = this.posX + offsetX + this.cellSize / 2;
        const centerY = this.posY + offsetY + this.cellSize / 2;
        
        ctx.drawImage(this.image, centerX - size / 2, centerY - size / 2, size, size);

        if (this.selected) {
            ctx.strokeStyle = 'yellow';
            ctx.lineWidth = 3;
            ctx.strokeRect(centerX - size / 2, centerY - size / 2, size, size);
        }
    }

    isSpecial() {
        return Candy.isSpecialType(this.type);
    }

    static isSpecialType(candyType) {
        return [CandyType.STRIPE_H, CandyType.STRIPE_V, CandyType.BOMB, CandyType.RAINBOW].includes(candyType);
    }
}