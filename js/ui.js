class UI {
    constructor(screenWidth, screenHeight) {
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
        this.mascotImages = {};
        this.font = '36px "word_font"'; // Assuming the font is loaded via CSS
    }

    // In web development, resources are typically preloaded.
    // We'll assume the main game class handles loading.
    // This method can be used to assign the loaded images.
    setMascotImages(images) {
        this.mascotImages = images;
    }

    updateLayout() {
        // Recalculate positions of UI elements if necessary
        // For now, just updating screen dimensions is enough as elements are drawn relative to them
    }

    drawGameUI(ctx, score, timeLeft) {
        // Draw background
        if (window.background) {
            ctx.drawImage(window.background, 0, 0, this.screenWidth, this.screenHeight);
        } else {
            ctx.fillStyle = 'rgb(255, 200, 230)';
            ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
        }

        // Draw header
        ctx.fillStyle = 'rgb(255, 245, 250)';
        ctx.fillRect(0, 0, this.screenWidth, 120);
        ctx.strokeStyle = 'rgb(210, 105, 30)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 120);
        ctx.lineTo(this.screenWidth, 120);
        ctx.stroke();

        // Draw text
        ctx.fillStyle = 'rgb(210, 105, 30)';
        ctx.font = this.font;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`时间: ${Math.floor(timeLeft)}秒`, 30, 40);

        ctx.textAlign = 'right';
        const scoreText = `分数: ${score}`;
        ctx.fillText(scoreText, this.screenWidth - 30, 40);
        ctx.textAlign = 'left'; // Reset alignment

        // Draw mascot
        let mascot;
        if (timeLeft > 40) {
            mascot = this.mascotImages.happy;
        } else if (timeLeft > 20) {
            mascot = this.mascotImages.normal;
        } else if (timeLeft > 10) {
            mascot = this.mascotImages.sad;
        } else {
            mascot = this.mascotImages.nervous;
        }

        if (mascot) {
            ctx.drawImage(mascot, this.screenWidth / 2 - 57, 8, 115, 115);
        } else {
            // Placeholder drawing if mascot not loaded
            ctx.fillStyle = 'rgb(100, 100, 100)';
            ctx.beginPath();
            ctx.arc(this.screenWidth / 2, 60, 40, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    drawBoardFrame(ctx, board, boardX, boardY) {
        const boardWidth = board.width * board.cellSize;
        const boardHeight = board.height * board.cellSize;

        // Placeholder drawing (since frame image is removed)
        ctx.fillStyle = 'rgb(255, 150, 200)';
        this.roundRect(ctx, boardX - 10, boardY - 10, boardWidth + 20, boardHeight + 20, 15);
        ctx.fill();
        ctx.strokeStyle = 'rgb(255, 100, 180)';
        ctx.lineWidth = 4;
        this.roundRect(ctx, boardX - 10, boardY - 10, boardWidth + 20, boardHeight + 20, 15);
        ctx.stroke();
    }

    // Helper function to draw rounded rectangles, as it's not native in Canvas API
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