class GameOverScreen {
    constructor(screenWidth, screenHeight, onRestart) {
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
        this.onRestart = onRestart;
        this.fontLarge = '60px "word_font"';
        this.fontMedium = '40px "word_font"';
        this.buttonRect = {
            x: this.screenWidth / 2 - 125,
            y: this.screenHeight * 0.75 - 40,
            width: 250,
            height: 80
        };
    }

    updateLayout() {
        this.buttonRect = {
            x: this.screenWidth / 2 - 125,
            y: this.screenHeight * 0.75 - 40,
            width: 250,
            height: 80
        };
    }

    draw(ctx, score) {
        // Draw background
        if (window.gameOverBackground) {
            ctx.drawImage(window.gameOverBackground, 0, 0, this.screenWidth, this.screenHeight);
        } else {
            ctx.fillStyle = 'rgba(255, 247, 220, 1)';
            ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
        }

        // Draw Title
        const titleText = "游戏结束";
        ctx.font = this.fontLarge;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        this.drawTextWithOutline(ctx, titleText, this.screenWidth / 2, this.screenHeight * 0.3, 'rgb(139,69,19)', 'white', 2);

        // Draw Score
        const scoreText = `最终得分: ${score}`;
        ctx.font = this.fontMedium;
        this.drawTextWithOutline(ctx, scoreText, this.screenWidth / 2, this.screenHeight * 0.5, 'rgb(139,69,19)', 'white', 2);

        // Draw "Play Again" button
        const btn = this.buttonRect;
        if (window.buttonBackground) {
            ctx.drawImage(window.buttonBackground, btn.x, btn.y, btn.width, btn.height);
        } else {
            ctx.fillStyle = 'rgba(255, 253, 150, 1)';
            this.roundRect(ctx, btn.x, btn.y, btn.width, btn.height, 20);
            ctx.fill();
        }

        ctx.font = this.fontMedium;
        ctx.fillStyle = 'rgb(139,69,19)';
        ctx.fillText("再玩一次", this.screenWidth / 2, this.screenHeight * 0.75);
    }

    checkClick(pos) {
        const btn = this.buttonRect;
        return pos.x >= btn.x && pos.x <= btn.x + btn.width &&
               pos.y >= btn.y && pos.y <= btn.y + btn.height;
    }
    
    handleClick(pos) {
        if (this.checkClick(pos)) {
            this.onRestart();
            return true;
        }
        return false;
    }

    drawTextWithOutline(ctx, text, x, y, fillStyle, strokeStyle, lineWidth) {
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth * 2; // Canvas draws strokes centered on the path
        ctx.strokeText(text, x, y);
        ctx.fillStyle = fillStyle;
        ctx.fillText(text, x, y);
    }
    
    // Helper function to draw rounded rectangles
    roundRect(ctx, x, y, width, height, radius) {
        if (typeof radius === 'number') {
            radius = { tl: radius, tr: radius, br: radius, bl: radius };
        } else {
            const defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
            for (let side in defaultRadius) {
                radius[side] = radius[side] || defaultRadius[side];
            }
        }
        ctx.beginPath();
        ctx.moveTo(x + radius.tl, y);
        ctx.lineTo(x + width - radius.tr, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
        ctx.lineTo(x + width, y + height - radius.br);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
        ctx.lineTo(x + radius.bl, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
        ctx.lineTo(x, y + radius.tl);
        ctx.quadraticCurveTo(x, y, x + radius.tl, y);
        ctx.closePath();
    }
}