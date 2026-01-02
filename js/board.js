class Board {
    constructor(assets, width = 8, height = 8, cellSize = 70) {
        this.assets = assets;
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        this.candies = [];
        this.selected = null; // 初始化 selected 狀態
        this.initializeBoard();
    }

    initializeBoard() {
        this.candies = Array.from({ length: this.height }, (_, y) =>
            Array.from({ length: this.width }, (_, x) => new Candy(x, y, this.assets, null, this.cellSize))
        );

        while (true) {
            const matches = this.findAllMatches();
            if (matches.length === 0) {
                break;
            }
            this.removeMatches(matches);
            this.fillEmptySpaces();
        }
    }

    getCandy(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.candies[y][x];
        }
        return null;
    }

    select(x, y) {
        if (this.isAnimating()) {
            return { needsProcessing: false, swapped: false };
        }

        const candy = this.getCandy(x, y);
        if (!candy) {
            return { needsProcessing: false, swapped: false };
        }

        if (this.selected === null) {
            candy.selected = true;
            this.selected = { x, y };
            return { needsProcessing: false, swapped: false };
        }

        // If we reach here, this.selected is not null
        if (this.selected.x === x && this.selected.y === y) {
            candy.selected = false;
            this.selected = null;
            return { needsProcessing: false, swapped: false };
        }

        const { x: prevX, y: prevY } = this.selected;
        const prevCandy = this.getCandy(prevX, prevY);

        if (!this.isAdjacent(prevX, prevY, x, y)) {
            if (prevCandy) prevCandy.selected = false;
            candy.selected = true;
            this.selected = { x, y };
            return { needsProcessing: false, swapped: false };
        }

        this.swappedCandyPos = { x, y };
        const swapped = this.swap(prevX, prevY, x, y);
        if (prevCandy) prevCandy.selected = false;
        this.selected = null;

        if (!swapped) {
            this.swappedCandyPos = null;
        }

        return { needsProcessing: swapped, swapped: true };
    }

    isAdjacent(x1, y1, x2, y2) {
        return (Math.abs(x1 - x2) === 1 && y1 === y2) || (Math.abs(y1 - y2) === 1 && x1 === x2);
    }

    swap(x1, y1, x2, y2) {
        const candy1 = this.getCandy(x1, y1);
        const candy2 = this.getCandy(x2, y2);
        if (!candy1 || !candy2) {
            return false;
        }

        [this.candies[y1][x1], this.candies[y2][x2]] = [this.candies[y2][x2], this.candies[y1][x1]];

        const matches = this.findAllMatches();
        const isSpecialSwap = candy1.isSpecial() && candy2.isSpecial();
        const isSpecialActivation = (candy1.isSpecial() || candy2.isSpecial()) && !isSpecialSwap;

        if (matches.length === 0 && !isSpecialSwap && !isSpecialActivation) {
            // Swap back the candies in the array
            [this.candies[y1][x1], this.candies[y2][x2]] = [candy1, candy2];
            candy1.setTargetPosition(x1, y1, true);
            candy2.setTargetPosition(x2, y2, true);
            return false;
        }

        candy1.setTargetPosition(x2, y2);
        candy2.setTargetPosition(x1, y1);
        candy1.swapping = true;
        candy2.swapping = true;

        if (isSpecialSwap || isSpecialActivation) {
            this.pendingSpecialActivation = { x1, y1, x2, y2, candy1, candy2 };
        }

        return true;
    }

    handlePendingSpecialActivation() {
        if (!this.pendingSpecialActivation) {
            return { activated: false, score: 0 };
        }

        const { x1, y1, x2, y2, candy1, candy2 } = this.pendingSpecialActivation;
        this.pendingSpecialActivation = null;

        const pos1 = { x: x2, y: y2 };
        const pos2 = { x: x1, y: y1 };
        const type1 = candy1.type;
        const type2 = candy2.type;

        const isSpecialSwap = candy1.isSpecial() && candy2.isSpecial();
        let removedCount = 0;

        if (isSpecialSwap) {
            this.candies[y1][x1] = null;
            this.candies[y2][x2] = null;
            removedCount = 2; // Start with the two swapped special candies
            if ((type1 === CandyType.STRIPE_H || type1 === CandyType.STRIPE_V) && (type2 === CandyType.STRIPE_H || type2 === CandyType.STRIPE_V)) {
                removedCount += this.clearRowAndCol(pos1.x, pos1.y);
            } else if (type1 === CandyType.BOMB && type2 === CandyType.BOMB) {
                removedCount += this.clear9x9(pos1.x, pos1.y);
            } else if ((type1 === CandyType.BOMB && (type2 === CandyType.STRIPE_H || type2 === CandyType.STRIPE_V)) || (type2 === CandyType.BOMB && (type1 === CandyType.STRIPE_H || type1 === CandyType.STRIPE_V))) {
                removedCount += this.clear3xRowsAndCols(pos1.x, pos1.y);
            } else if (type1 === CandyType.RAINBOW && type2 === CandyType.RAINBOW) {
                removedCount += this.clearAllCandies();
            } else if (type1 === CandyType.RAINBOW || type2 === CandyType.RAINBOW) {
                const otherCandy = type2 === CandyType.RAINBOW ? candy1 : candy2;
                removedCount += this.transformAndActivateCandies(otherCandy.type, otherCandy.originalType);
            }
        } else { // Special activation
            let activated = false;
            if (candy1.isSpecial()) {
                if (candy1.type === CandyType.RAINBOW) {
                    removedCount += this.activateRainbowCandy(pos1.x, pos1.y, candy2.type);
                } else {
                    removedCount += this.activateSpecialCandy(pos1.x, pos1.y, type1);
                }
                this.candies[y2][x2] = null; // Remove the other candy
                removedCount += 1;
                activated = true;
            }
            if (candy2.isSpecial()) {
                if (candy2.type === CandyType.RAINBOW) {
                    removedCount += this.activateRainbowCandy(pos2.x, pos2.y, candy1.type);
                } else {
                    removedCount += this.activateSpecialCandy(pos2.x, pos2.y, type2);
                }
                this.candies[y1][x1] = null; // Remove the other candy
                removedCount += 1;
                activated = true;
            }

            if (!activated) {
                const matches = this.findAllMatches();
                if (matches.length === 0) {
                    [this.candies[y1][x1], this.candies[y2][x2]] = [candy1, candy2];
                    return { activated: false, score: 0 };
                }
            }
        }

        this.fillEmptySpaces();
        return { activated: true, score: removedCount * 20 };
    }

    findAllMatches() {
        const hMatches = this.findLinearMatches(true);
        const vMatches = this.findLinearMatches(false);
        return this.mergeMatches([...hMatches, ...vMatches]);
    }

    findLinearMatches(horizontal = true) {
        const matches = [];
        const [mainAxis, subAxis] = horizontal ? [this.width, this.height] : [this.height, this.width];
        for (let i = 0; i < subAxis; i++) {
            for (let j = 0; j < mainAxis - 2;) {
                const coords = k => (horizontal ? { x: j + k, y: i } : { x: i, y: j + k });
                const c1 = this.getCandy(coords(0).x, coords(0).y);
                if (c1 && !c1.isSpecial()) {
                    const match = [coords(0)];
                    for (let k = 1; j + k < mainAxis; k++) {
                        const c2 = this.getCandy(coords(k).x, coords(k).y);
                        if (c2 && c2.type === c1.type && !c2.isSpecial()) {
                            match.push(coords(k));
                        } else {
                            break;
                        }
                    }
                    if (match.length >= 3) {
                        matches.push(match);
                        j += match.length;
                    } else {
                        j++;
                    }
                } else {
                    j++;
                }
            }
        }
        return matches;
    }

    mergeMatches(matches) {
        if (matches.length === 0) return [];
        const merged = [];
        matches.sort((a, b) => b.length - a.length);
        while (matches.length > 0) {
            let base = new Set(matches.shift().map(p => `${p.x},${p.y}`));
            let i = 0;
            while (i < matches.length) {
                const other = new Set(matches[i].map(p => `${p.x},${p.y}`));
                const intersection = new Set([...base].filter(x => other.has(x)));
                if (intersection.size > 0) {
                    base = new Set([...base, ...other]);
                    matches.splice(i, 1);
                    i = 0;
                } else {
                    i++;
                }
            }
            merged.push(Array.from(base).map(s => {
                const [x, y] = s.split(',').map(Number);
                return { x, y };
            }));
        }
        return merged;
    }

    processMatches() {
        const allMatches = this.findAllMatches();
        if (allMatches.length === 0) {
            if (this.swappedCandyPos) this.swappedCandyPos = null;
            return { score: 0, changed: false, matched: false };
        }

        let score = 0;
        let specialActivated = false;
        const toRemove = new Set();

        allMatches.forEach(match => match.forEach(pos => toRemove.add(`${pos.x},${pos.y}`)));

        const activatedByMatch = new Set();
        toRemove.forEach(posStr => {
            const [x, y] = posStr.split(',').map(Number);
            const candy = this.getCandy(x, y);
            if (candy && candy.isSpecial()) {
                const affectedCount = this.activateSpecialCandy(x, y, candy.type, true);
                score += affectedCount * 20;
                specialActivated = true;
            }
        });

        activatedByMatch.forEach(pos => toRemove.add(pos));

        const specialCandiesCreated = this.createSpecialCandies(allMatches);

        specialCandiesCreated.forEach(({ pos }) => {
            const posStr = `${pos.x},${pos.y}`;
            if (toRemove.has(posStr)) {
                toRemove.delete(posStr);
            }
        });

        score += toRemove.size * 10;

        toRemove.forEach(posStr => {
            const [x, y] = posStr.split(',').map(Number);
            this.candies[y][x] = null;
        });

        specialCandiesCreated.forEach(({ pos, candy }) => {
            this.candies[pos.y][pos.x] = candy;
        });

        if (toRemove.size > 0) {
            this.fillEmptySpaces();
        }

        if (this.swappedCandyPos) this.swappedCandyPos = null;

        return { score, changed: true, matched: true };
    }

    removeMatches(matchGroups) {
        matchGroups.forEach(match => {
            match.forEach(({ x, y }) => {
                this.candies[y][x] = null;
            });
        });
    }

    createSpecialCandies(matchGroups) {
        const created = [];
        matchGroups.forEach(match => {
            const isTOrLShape = this.isTOrLShape(match);
            const matchLen = match.length;

            let centerPos;
            if (this.swappedCandyPos && match.some(p => p.x === this.swappedCandyPos.x && p.y === this.swappedCandyPos.y)) {
                centerPos = this.swappedCandyPos;
            } else {
                centerPos = this.findCenterOfMatch(match);
            }

            const originalCandy = this.getCandy(match[0].x, match[0].y);
            if (!originalCandy) return;
            const originalCandyType = originalCandy.type;

            let newCandy = null;
            if (isTOrLShape) {
                newCandy = new Candy(centerPos.x, centerPos.y, this.assets, CandyType.BOMB, this.cellSize, originalCandyType);
            } else if (matchLen >= 5) {
                newCandy = new Candy(centerPos.x, centerPos.y, this.assets, CandyType.RAINBOW, this.cellSize, originalCandyType);
            } else if (matchLen === 4) {
                const xs = new Set(match.map(p => p.x));
                const candyType = xs.size > 1 ? CandyType.STRIPE_H : CandyType.STRIPE_V;
                newCandy = new Candy(centerPos.x, centerPos.y, this.assets, candyType, this.cellSize, originalCandyType);
            }

            if (newCandy) {
                created.push({ pos: centerPos, candy: newCandy });
            }
        });
        return created;
    }

    findCenterOfMatch(match) {
        if (this.isTOrLShape(match)) {
            return this.findIntersection(match);
        }
        return match[Math.floor(match.length / 2)];
    }

    isTOrLShape(match) {
        if (match.length < 5) return false;
        const xs = new Set(match.map(p => p.x));
        const ys = new Set(match.map(p => p.y));
        return xs.size >= 3 && ys.size >= 3;
    }

    findIntersection(match) {
        const xs = match.map(p => p.x);
        const ys = match.map(p => p.y);
        const xCounts = xs.reduce((acc, x) => ({ ...acc, [x]: (acc[x] || 0) + 1 }), {});
        const yCounts = ys.reduce((acc, y) => ({ ...acc, [y]: (acc[y] || 0) + 1 }), {});
        const intersectX = Object.keys(xCounts).find(x => xCounts[x] > 1);
        const intersectY = Object.keys(yCounts).find(y => yCounts[y] > 1);
        return { x: Number(intersectX), y: Number(intersectY) };
    }

    fillEmptySpaces() {
        for (let x = 0; x < this.width; x++) {
            let emptyCount = 0;
            for (let y = this.height - 1; y >= 0; y--) {
                if (this.candies[y][x] === null) {
                    emptyCount++;
                } else if (emptyCount > 0) {
                    const candy = this.candies[y][x];
                    this.candies[y + emptyCount][x] = candy;
                    this.candies[y][x] = null;
                    candy.setTargetPosition(x, y + emptyCount);
                    candy.isFalling = true;
                }
            }

            for (let i = 0; i < emptyCount; i++) {
                const newCandy = new Candy(x, i - emptyCount, this.assets, null, this.cellSize);
                this.candies[i][x] = newCandy;
                newCandy.setTargetPosition(x, i);
                newCandy.isFalling = true;
            }
        }
    }

    activateSpecialCandy(x, y, candyType, fromMatch = false) {
        const toRemove = new Set();
        if (!fromMatch) {
            toRemove.add(`${x},${y}`);
        }

        if (candyType === CandyType.STRIPE_H) {
            this.clearRow(y).forEach(pos => toRemove.add(pos));
        } else if (candyType === CandyType.STRIPE_V) {
            this.clearCol(x).forEach(pos => toRemove.add(pos));
        } else if (candyType === CandyType.BOMB) {
            this.clear3x3(x, y).forEach(pos => toRemove.add(pos));
        } else if (candyType === CandyType.RAINBOW) {
            if (fromMatch) {
                const targetColor = this.getMostCommonNeighborColor(x, y);
                if (targetColor) {
                    this.clearColor(targetColor).forEach(pos => toRemove.add(pos));
                }
            }
        }

        toRemove.forEach(posStr => {
            const [remX, remY] = posStr.split(',').map(Number);
            if (this.getCandy(remX, remY)) {
                this.candies[remY][remX] = null;
            }
        });

        return toRemove.size;
    }

    clearRow(y) {
        return Array.from({ length: this.width }, (_, x) => `${x},${y}`);
    }

    clearCol(x) {
        return Array.from({ length: this.height }, (_, y) => `${x},${y}`);
    }

    clear3x3(x, y) {
        const removed = new Set();
        for (let i = Math.max(0, x - 1); i < Math.min(this.width, x + 2); i++) {
            for (let j = Math.max(0, y - 1); j < Math.min(this.height, y + 2); j++) {
                removed.add(`${i},${j}`);
            }
        }
        return removed;
    }

    clearColor(colorType) {
        const removed = new Set();
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const candy = this.getCandy(x, y);
                if (candy && candy.type === colorType) {
                    removed.add(`${x},${y}`);
                }
            }
        }
        return removed;
    }

    activateRainbowCandy(x, y, targetColor) {
        const toRemove = this.clearColor(targetColor);
        toRemove.add(`${x},${y}`);
        toRemove.forEach(posStr => {
            const [remX, remY] = posStr.split(',').map(Number);
            if (this.getCandy(remX, remY)) {
                this.candies[remY][remX] = null;
            }
        });
        return toRemove.size;
    }

    clearRowAndCol(x, y) {
        const toRemove = new Set([...this.clearRow(y), ...this.clearCol(x)]);
        toRemove.forEach(posStr => {
            const [remX, remY] = posStr.split(',').map(Number);
            if (this.getCandy(remX, remY)) {
                this.candies[remY][remX] = null;
            }
        });
        return toRemove.size;
    }

    clear3xRowsAndCols(x, y) {
        const toRemove = new Set();
        for (let i = Math.max(0, y - 1); i < Math.min(this.height, y + 2); i++) {
            this.clearRow(i).forEach(pos => toRemove.add(pos));
        }
        for (let i = Math.max(0, x - 1); i < Math.min(this.width, x + 2); i++) {
            this.clearCol(i).forEach(pos => toRemove.add(pos));
        }
        toRemove.forEach(posStr => {
            const [remX, remY] = posStr.split(',').map(Number);
            if (this.getCandy(remX, remY)) {
                this.candies[remY][remX] = null;
            }
        });
        return toRemove.size;
    }

    clear9x9(x, y) {
        const toRemove = new Set();
        for (let i = Math.max(0, x - 4); i < Math.min(this.width, x + 5); i++) {
            for (let j = Math.max(0, y - 4); j < Math.min(this.height, y + 5); j++) {
                toRemove.add(`${i},${j}`);
            }
        }
        toRemove.forEach(posStr => {
            const [remX, remY] = posStr.split(',').map(Number);
            if (this.getCandy(remX, remY)) {
                this.candies[remY][remX] = null;
            }
        });
        return toRemove.size;
    }

    clearAllCandies() {
        const count = this.width * this.height;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.candies[y][x] = null;
            }
        }
        return count;
    }

    transformAndActivateCandies(specialTypeToAdd, targetColor) {
        const candiesToTransform = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const candy = this.getCandy(x, y);
                if (candy && candy.type === targetColor) {
                    candiesToTransform.push({ x, y });
                }
            }
        }

        let removedCount = 0;
        candiesToTransform.forEach(({ x, y }) => {
            this.candies[y][x] = null;
            removedCount++;
            removedCount += this.activateSpecialCandy(x, y, specialTypeToAdd);
        });
        return removedCount;
    }

    getMostCommonNeighborColor(x, y) {
        const colors = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const candy = this.getCandy(x + dx, y + dy);
                if (candy && !candy.isSpecial()) {
                    colors.push(candy.type);
                }
            }
        }
        if (colors.length === 0) return null;
        const counts = colors.reduce((acc, color) => ({ ...acc, [color]: (acc[color] || 0) + 1 }), {});
        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    }

    update(dt) {
        let isAnimating = false;
        this.candies.forEach(row => {
            row.forEach(candy => {
                if (candy && candy.update(dt)) {
                    isAnimating = true;
                }
            });
        });
        return isAnimating;
    }

    draw(ctx, offsetX, offsetY) {
        this.candies.forEach(row => {
            row.forEach(candy => {
                if (candy) {
                    candy.draw(ctx, offsetX, offsetY);
                }
            });
        });
    }

    isAnimating() {
        return this.candies.some(row =>
            row.some(candy => candy && (candy.isFalling || candy.swapping || candy.swappingBack))
        );
    }
}