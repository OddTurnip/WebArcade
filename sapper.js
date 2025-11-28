/**
 * Sapper Game Engine
 * Pure game logic for mine-clearing puzzle games.
 * No DOM dependencies - rendering and events handled by caller.
 *
 * Usage:
 *   const game = new SapperGame({ width: 9, height: 9, mines: 10, noGuess: false });
 *   game.initGrid();
 *   game.handleFirstClick(x, y);  // Places mines, returns cells to reveal
 *   game.revealCell(x, y);        // Returns { hit: bool, revealed: [{x,y}...], won: bool }
 *   game.toggleFlag(x, y);        // Returns new flag state
 *   game.chordReveal(x, y);       // Returns same as revealCell
 */

class SapperGame {
    constructor(options = {}) {
        this.width = options.width || 9;
        this.height = options.height || 9;
        this.totalMines = options.mines || 10;
        this.noGuess = options.noGuess || false;
        this.maxGenerationAttempts = options.maxGenerationAttempts || 1000;

        this.grid = [];           // -1 = mine, 0-8 = adjacent mine count
        this.revealed = [];       // boolean grid
        this.flagged = [];        // boolean grid
        this.mineLocations = [];  // [{x, y}, ...]
        this.gameOver = false;
        this.won = false;
        this.minesPlaced = false;
    }

    /**
     * Initialize empty grid. Call before starting a new game.
     */
    initGrid() {
        this.grid = [];
        this.revealed = [];
        this.flagged = [];
        this.mineLocations = [];
        this.gameOver = false;
        this.won = false;
        this.minesPlaced = false;

        for (let y = 0; y < this.height; y++) {
            this.grid[y] = [];
            this.revealed[y] = [];
            this.flagged[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x] = 0;
                this.revealed[y][x] = false;
                this.flagged[y][x] = false;
            }
        }
    }

    /**
     * Handle first click - places mines and reveals the clicked cell.
     * @param {number} x - Click x coordinate
     * @param {number} y - Click y coordinate
     * @returns {object} { success: bool, revealed: [{x,y}...] }
     */
    handleFirstClick(x, y) {
        if (this.minesPlaced) {
            return { success: false, revealed: [] };
        }

        let success;
        if (this.noGuess) {
            success = this._generateSolvableBoard(x, y);
        } else {
            this._placeMinesRandomly(x, y);
            success = true;
        }

        this.minesPlaced = true;

        // Reveal the first cell
        const result = this.revealCell(x, y);
        return { success, revealed: result.revealed };
    }

    /**
     * Reveal a cell at (x, y).
     * @returns {object} { hit: bool, revealed: [{x,y}...], won: bool, lost: bool }
     */
    revealCell(x, y) {
        if (this.gameOver) {
            return { hit: false, revealed: [], won: false, lost: false };
        }

        const revealed = [];
        const hit = this._revealCellRecursive(x, y, revealed);

        if (hit) {
            this.gameOver = true;
            this.won = false;
            return { hit: true, revealed, won: false, lost: true };
        }

        const won = this._checkWin();
        if (won) {
            this.gameOver = true;
            this.won = true;
        }

        return { hit: false, revealed, won, lost: false };
    }

    /**
     * Toggle flag at (x, y).
     * @returns {object} { flagged: bool, flagCount: number }
     */
    toggleFlag(x, y) {
        if (this.gameOver) return { flagged: false, flagCount: this.getFlagCount() };
        if (!this._inBounds(x, y)) return { flagged: false, flagCount: this.getFlagCount() };
        if (this.revealed[y][x]) return { flagged: false, flagCount: this.getFlagCount() };

        this.flagged[y][x] = !this.flagged[y][x];
        return { flagged: this.flagged[y][x], flagCount: this.getFlagCount() };
    }

    /**
     * Chord reveal - if flags around a number equal its value, reveal all unflagged neighbors.
     * @returns {object} Same as revealCell
     */
    chordReveal(x, y) {
        if (this.gameOver) {
            return { hit: false, revealed: [], won: false, lost: false };
        }
        if (!this._inBounds(x, y)) {
            return { hit: false, revealed: [], won: false, lost: false };
        }
        if (!this.revealed[y][x] || this.grid[y][x] <= 0) {
            return { hit: false, revealed: [], won: false, lost: false };
        }

        const adjacentFlags = this._countAdjacentFlags(x, y);
        if (adjacentFlags !== this.grid[y][x]) {
            return { hit: false, revealed: [], won: false, lost: false };
        }

        // Reveal all non-flagged neighbors
        const allRevealed = [];
        let hitMine = false;

        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (!this._inBounds(nx, ny)) continue;
                if (this.flagged[ny][nx]) continue;

                const result = this.revealCell(nx, ny);
                allRevealed.push(...result.revealed);
                if (result.hit) hitMine = true;
            }
        }

        return {
            hit: hitMine,
            revealed: allRevealed,
            won: this.won,
            lost: hitMine
        };
    }

    /**
     * Get current flag count.
     */
    getFlagCount() {
        let count = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.flagged[y][x]) count++;
            }
        }
        return count;
    }

    /**
     * Get remaining mines display (total - flags).
     */
    getRemainingMines() {
        return this.totalMines - this.getFlagCount();
    }

    /**
     * Get cell value at (x, y).
     * @returns {number} -1 for mine, 0-8 for adjacent count, null if out of bounds
     */
    getCell(x, y) {
        if (!this._inBounds(x, y)) return null;
        return this.grid[y][x];
    }

    /**
     * Check if cell is revealed.
     */
    isRevealed(x, y) {
        if (!this._inBounds(x, y)) return false;
        return this.revealed[y][x];
    }

    /**
     * Check if cell is flagged.
     */
    isFlagged(x, y) {
        if (!this._inBounds(x, y)) return false;
        return this.flagged[y][x];
    }

    /**
     * Check if cell is a mine.
     */
    isMine(x, y) {
        if (!this._inBounds(x, y)) return false;
        return this.grid[y][x] === -1;
    }

    // ========================================
    // Private methods
    // ========================================

    _inBounds(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    _revealCellRecursive(x, y, revealed) {
        if (!this._inBounds(x, y)) return false;
        if (this.revealed[y][x] || this.flagged[y][x]) return false;

        this.revealed[y][x] = true;
        revealed.push({ x, y });

        if (this.grid[y][x] === -1) {
            return true; // Hit a mine
        }

        // Flood fill for empty cells
        if (this.grid[y][x] === 0) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    this._revealCellRecursive(x + dx, y + dy, revealed);
                }
            }
        }

        return false;
    }

    _checkWin() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (!this.revealed[y][x] && this.grid[y][x] !== -1) {
                    return false;
                }
            }
        }
        return true;
    }

    _countAdjacentMines(x, y) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (this._inBounds(nx, ny) && this.grid[ny][nx] === -1) {
                    count++;
                }
            }
        }
        return count;
    }

    _countAdjacentFlags(x, y) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (this._inBounds(nx, ny) && this.flagged[ny][nx]) {
                    count++;
                }
            }
        }
        return count;
    }

    _placeMinesRandomly(excludeX, excludeY) {
        const maxMines = Math.min(this.totalMines, this.width * this.height - 9);
        let placed = 0;

        while (placed < maxMines) {
            const x = Math.floor(Math.random() * this.width);
            const y = Math.floor(Math.random() * this.height);

            // Skip if in exclusion zone around first click
            if (Math.abs(x - excludeX) <= 1 && Math.abs(y - excludeY) <= 1) {
                continue;
            }

            // Skip if already a mine
            if (this.grid[y][x] === -1) {
                continue;
            }

            this.grid[y][x] = -1;
            this.mineLocations.push({ x, y });
            placed++;
        }

        this._calculateNumbers();
    }

    _calculateNumbers() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x] !== -1) {
                    this.grid[y][x] = this._countAdjacentMines(x, y);
                }
            }
        }
    }

    // ========================================
    // No-Guess Solver
    // ========================================

    _generateSolvableBoard(excludeX, excludeY) {
        const maxMines = Math.min(this.totalMines, this.width * this.height - 9);

        for (let attempt = 0; attempt < this.maxGenerationAttempts; attempt++) {
            // Reset grid
            const testGrid = [];
            const testMines = [];

            for (let y = 0; y < this.height; y++) {
                testGrid[y] = [];
                for (let x = 0; x < this.width; x++) {
                    testGrid[y][x] = 0;
                }
            }

            // Place mines randomly
            let placed = 0;
            while (placed < maxMines) {
                const x = Math.floor(Math.random() * this.width);
                const y = Math.floor(Math.random() * this.height);

                if (Math.abs(x - excludeX) <= 1 && Math.abs(y - excludeY) <= 1) {
                    continue;
                }

                if (testGrid[y][x] === -1) {
                    continue;
                }

                testGrid[y][x] = -1;
                testMines.push({ x, y });
                placed++;
            }

            // Calculate numbers
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    if (testGrid[y][x] !== -1) {
                        let count = 0;
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                                if (dx === 0 && dy === 0) continue;
                                const nx = x + dx;
                                const ny = y + dy;
                                if (this._inBounds(nx, ny) && testGrid[ny][nx] === -1) {
                                    count++;
                                }
                            }
                        }
                        testGrid[y][x] = count;
                    }
                }
            }

            // Test if solvable
            if (this._simulateSolve(testGrid, excludeX, excludeY)) {
                this.grid = testGrid;
                this.mineLocations = testMines;
                return true;
            }
        }

        // Fallback: use random placement
        console.warn('Could not generate solvable board after max attempts, using random');
        this._placeMinesRandomly(excludeX, excludeY);
        return false;
    }

    _simulateSolve(testGrid, startX, startY) {
        // Create simulation state
        const simRevealed = [];
        const simKnownMines = [];

        for (let y = 0; y < this.height; y++) {
            simRevealed[y] = [];
            simKnownMines[y] = [];
            for (let x = 0; x < this.width; x++) {
                simRevealed[y][x] = false;
                simKnownMines[y][x] = false;
            }
        }

        // Reveal starting cell and flood fill zeros
        const simReveal = (x, y) => {
            if (!this._inBounds(x, y)) return;
            if (simRevealed[y][x] || simKnownMines[y][x]) return;
            if (testGrid[y][x] === -1) return;

            simRevealed[y][x] = true;

            if (testGrid[y][x] === 0) {
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        simReveal(x + dx, y + dy);
                    }
                }
            }
        };

        simReveal(startX, startY);

        // Apply constraint propagation until no progress
        let progress = true;
        while (progress) {
            progress = false;

            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    if (!simRevealed[y][x] || testGrid[y][x] <= 0) continue;

                    const number = testGrid[y][x];
                    let hiddenCount = 0;
                    let knownMineCount = 0;
                    const hiddenCells = [];

                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const nx = x + dx;
                            const ny = y + dy;
                            if (!this._inBounds(nx, ny)) continue;

                            if (simKnownMines[ny][nx]) {
                                knownMineCount++;
                            } else if (!simRevealed[ny][nx]) {
                                hiddenCount++;
                                hiddenCells.push({ x: nx, y: ny });
                            }
                        }
                    }

                    // If hidden count equals remaining mines, all hidden are mines
                    if (hiddenCount > 0 && hiddenCount === number - knownMineCount) {
                        for (const cell of hiddenCells) {
                            if (!simKnownMines[cell.y][cell.x]) {
                                simKnownMines[cell.y][cell.x] = true;
                                progress = true;
                            }
                        }
                    }

                    // If known mines equals the number, all hidden are safe
                    if (knownMineCount === number && hiddenCount > 0) {
                        for (const cell of hiddenCells) {
                            simReveal(cell.x, cell.y);
                            progress = true;
                        }
                    }
                }
            }
        }

        // Check if all safe cells are revealed
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (testGrid[y][x] !== -1 && !simRevealed[y][x]) {
                    return false;
                }
            }
        }

        return true;
    }
}

// Export for use in HTML
if (typeof window !== 'undefined') {
    window.SapperGame = SapperGame;
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SapperGame };
}
