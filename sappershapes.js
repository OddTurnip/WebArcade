/**
 * Sapper Shapes Game Engine
 * Mine-clearing puzzle for non-square grids (hex, triangle).
 * Uses grid.js for geometry - pure game logic, no DOM.
 *
 * Usage:
 *   const grid = new HexGrid(10, 10, 25);
 *   const game = new SapperShapesGame(grid, { mines: 15 });
 *   game.initGrid();
 *   game.handleFirstClick(x, y);
 */

class SapperShapesGame {
    /**
     * Create a Sapper game with a custom grid.
     * @param {HexGrid|TriangleGrid} grid - Grid object from grid.js
     * @param {object} options - Game options
     * @param {number} options.mines - Number of mines
     * @param {boolean} options.noGuess - Generate guaranteed-solvable puzzles
     * @param {boolean} options.useExtendedNeighbors - For triangles, use 12-neighbor adjacency
     * @param {number} options.maxGenerationAttempts - Max attempts for no-guess generation
     */
    constructor(grid, options = {}) {
        this.grid = grid;
        this.width = grid.width;
        this.height = grid.height;
        this.totalMines = options.mines || Math.floor(grid.width * grid.height * 0.15);
        this.noGuess = options.noGuess || false;
        this.useExtendedNeighbors = options.useExtendedNeighbors || false;
        this.maxGenerationAttempts = options.maxGenerationAttempts || 1000;

        this.cells = new Map();       // Map of "x,y" -> { mine, revealed, flagged, count }
        this.mineLocations = [];
        this.gameOver = false;
        this.won = false;
        this.minesPlaced = false;
    }

    /**
     * Get cell key for map storage.
     */
    _key(x, y) {
        return `${x},${y}`;
    }

    /**
     * Initialize empty grid. Call before starting a new game.
     */
    initGrid() {
        this.cells.clear();
        this.mineLocations = [];
        this.gameOver = false;
        this.won = false;
        this.minesPlaced = false;

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.cells.set(this._key(x, y), {
                    mine: false,
                    revealed: false,
                    flagged: false,
                    count: 0
                });
            }
        }
    }

    /**
     * Get neighbors of a cell using the grid's neighbor function.
     */
    _getNeighbors(x, y) {
        if (this.useExtendedNeighbors && this.grid.getExtendedNeighbors) {
            return this.grid.getExtendedNeighbors(x, y);
        }
        return this.grid.getNeighbors(x, y);
    }

    /**
     * Handle first click - places mines and reveals the clicked cell.
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

        const result = this.revealCell(x, y);
        return { success, revealed: result.revealed };
    }

    /**
     * Place mines randomly, avoiding the clicked cell and its neighbors.
     */
    _placeMinesRandomly(excludeX, excludeY) {
        // Build exclusion zone (clicked cell + neighbors)
        const exclusionZone = new Set();
        exclusionZone.add(this._key(excludeX, excludeY));
        for (const n of this._getNeighbors(excludeX, excludeY)) {
            exclusionZone.add(this._key(n.x, n.y));
        }

        // Get valid positions
        const validPositions = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (!exclusionZone.has(this._key(x, y))) {
                    validPositions.push({ x, y });
                }
            }
        }

        // Cap mines to available positions
        const maxMines = Math.min(this.totalMines, validPositions.length);

        // Shuffle and pick mine positions
        for (let i = validPositions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [validPositions[i], validPositions[j]] = [validPositions[j], validPositions[i]];
        }

        for (let i = 0; i < maxMines; i++) {
            const pos = validPositions[i];
            const cell = this.cells.get(this._key(pos.x, pos.y));
            cell.mine = true;
            this.mineLocations.push(pos);
        }

        // Calculate numbers
        this._calculateNumbers();
    }

    /**
     * Calculate adjacent mine counts for all cells.
     */
    _calculateNumbers() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.cells.get(this._key(x, y));
                if (!cell.mine) {
                    let count = 0;
                    for (const n of this._getNeighbors(x, y)) {
                        const neighbor = this.cells.get(this._key(n.x, n.y));
                        if (neighbor && neighbor.mine) {
                            count++;
                        }
                    }
                    cell.count = count;
                }
            }
        }
    }

    /**
     * Reveal a cell at (x, y).
     * @returns {{ hit: boolean, revealed: Array, won: boolean, lost: boolean }}
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
            // Reveal all mines on loss
            for (const pos of this.mineLocations) {
                const cell = this.cells.get(this._key(pos.x, pos.y));
                cell.revealed = true;
            }
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
     * Recursively reveal cells (flood fill for zeros).
     */
    _revealCellRecursive(x, y, revealed) {
        if (!this.grid.isInBounds(x, y)) return false;

        const key = this._key(x, y);
        const cell = this.cells.get(key);

        if (cell.revealed || cell.flagged) return false;

        cell.revealed = true;
        revealed.push({ x, y });

        if (cell.mine) {
            return true; // Hit a mine
        }

        // Flood fill for empty cells
        if (cell.count === 0) {
            for (const n of this._getNeighbors(x, y)) {
                this._revealCellRecursive(n.x, n.y, revealed);
            }
        }

        return false;
    }

    /**
     * Toggle flag at (x, y).
     * @returns {{ flagged: boolean, flagCount: number }}
     */
    toggleFlag(x, y) {
        if (this.gameOver) return { flagged: false, flagCount: this.getFlagCount() };
        if (!this.grid.isInBounds(x, y)) return { flagged: false, flagCount: this.getFlagCount() };

        const cell = this.cells.get(this._key(x, y));
        if (cell.revealed) return { flagged: false, flagCount: this.getFlagCount() };

        cell.flagged = !cell.flagged;
        return { flagged: cell.flagged, flagCount: this.getFlagCount() };
    }

    /**
     * Chord reveal - if flags around a number equal its value, reveal neighbors.
     */
    chordReveal(x, y) {
        if (this.gameOver) {
            return { hit: false, revealed: [], won: false, lost: false };
        }
        if (!this.grid.isInBounds(x, y)) {
            return { hit: false, revealed: [], won: false, lost: false };
        }

        const cell = this.cells.get(this._key(x, y));
        if (!cell.revealed || cell.count <= 0) {
            return { hit: false, revealed: [], won: false, lost: false };
        }

        // Count adjacent flags
        let adjacentFlags = 0;
        for (const n of this._getNeighbors(x, y)) {
            const neighbor = this.cells.get(this._key(n.x, n.y));
            if (neighbor && neighbor.flagged) {
                adjacentFlags++;
            }
        }

        if (adjacentFlags !== cell.count) {
            return { hit: false, revealed: [], won: false, lost: false };
        }

        // Reveal all non-flagged neighbors
        const allRevealed = [];
        let hitMine = false;

        for (const n of this._getNeighbors(x, y)) {
            const neighbor = this.cells.get(this._key(n.x, n.y));
            if (neighbor && !neighbor.flagged) {
                const result = this.revealCell(n.x, n.y);
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
     * Check if game is won (all non-mine cells revealed).
     */
    _checkWin() {
        for (const [key, cell] of this.cells) {
            if (!cell.mine && !cell.revealed) {
                return false;
            }
        }
        return true;
    }

    /**
     * Get current flag count.
     */
    getFlagCount() {
        let count = 0;
        for (const [key, cell] of this.cells) {
            if (cell.flagged) count++;
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
     * Get cell data at (x, y).
     */
    getCell(x, y) {
        return this.cells.get(this._key(x, y));
    }

    /**
     * Check if cell is revealed.
     */
    isRevealed(x, y) {
        const cell = this.cells.get(this._key(x, y));
        return cell ? cell.revealed : false;
    }

    /**
     * Check if cell is flagged.
     */
    isFlagged(x, y) {
        const cell = this.cells.get(this._key(x, y));
        return cell ? cell.flagged : false;
    }

    /**
     * Check if cell is a mine.
     */
    isMine(x, y) {
        const cell = this.cells.get(this._key(x, y));
        return cell ? cell.mine : false;
    }

    /**
     * Get adjacent mine count.
     */
    getCount(x, y) {
        const cell = this.cells.get(this._key(x, y));
        return cell ? cell.count : 0;
    }

    // ========================================
    // No-Guess Solver
    // ========================================

    /**
     * Generate a solvable board through repeated attempts.
     */
    _generateSolvableBoard(excludeX, excludeY) {
        // Build exclusion zone
        const exclusionZone = new Set();
        exclusionZone.add(this._key(excludeX, excludeY));
        for (const n of this._getNeighbors(excludeX, excludeY)) {
            exclusionZone.add(this._key(n.x, n.y));
        }

        // Get valid positions
        const allPositions = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (!exclusionZone.has(this._key(x, y))) {
                    allPositions.push({ x, y });
                }
            }
        }

        const maxMines = Math.min(this.totalMines, allPositions.length);

        for (let attempt = 0; attempt < this.maxGenerationAttempts; attempt++) {
            // Create test grid
            const testCells = new Map();
            const testMines = [];

            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    testCells.set(this._key(x, y), { mine: false, count: 0 });
                }
            }

            // Shuffle and place mines
            const positions = [...allPositions];
            for (let i = positions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [positions[i], positions[j]] = [positions[j], positions[i]];
            }

            for (let i = 0; i < maxMines; i++) {
                const pos = positions[i];
                testCells.get(this._key(pos.x, pos.y)).mine = true;
                testMines.push(pos);
            }

            // Calculate numbers
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const cell = testCells.get(this._key(x, y));
                    if (!cell.mine) {
                        let count = 0;
                        for (const n of this._getNeighbors(x, y)) {
                            const neighbor = testCells.get(this._key(n.x, n.y));
                            if (neighbor && neighbor.mine) {
                                count++;
                            }
                        }
                        cell.count = count;
                    }
                }
            }

            // Test if solvable
            if (this._simulateSolve(testCells, excludeX, excludeY)) {
                // Copy to actual game state
                for (const [key, testCell] of testCells) {
                    const cell = this.cells.get(key);
                    cell.mine = testCell.mine;
                    cell.count = testCell.count;
                }
                this.mineLocations = testMines;
                return true;
            }
        }

        // Fallback: use random placement
        console.warn('Could not generate solvable board after max attempts, using random');
        this._placeMinesRandomly(excludeX, excludeY);
        return false;
    }

    /**
     * Simulate solving the board using constraint propagation.
     */
    _simulateSolve(testCells, startX, startY) {
        const simRevealed = new Map();
        const simKnownMines = new Map();

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const key = this._key(x, y);
                simRevealed.set(key, false);
                simKnownMines.set(key, false);
            }
        }

        // Reveal starting cell and flood fill zeros
        const simReveal = (x, y) => {
            if (!this.grid.isInBounds(x, y)) return;
            const key = this._key(x, y);
            if (simRevealed.get(key) || simKnownMines.get(key)) return;

            const cell = testCells.get(key);
            if (cell.mine) return;

            simRevealed.set(key, true);

            if (cell.count === 0) {
                for (const n of this._getNeighbors(x, y)) {
                    simReveal(n.x, n.y);
                }
            }
        };

        simReveal(startX, startY);

        // Apply constraint propagation
        let progress = true;
        while (progress) {
            progress = false;

            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const key = this._key(x, y);
                    if (!simRevealed.get(key)) continue;

                    const cell = testCells.get(key);
                    if (cell.count <= 0) continue;

                    let hiddenCount = 0;
                    let knownMineCount = 0;
                    const hiddenCells = [];

                    for (const n of this._getNeighbors(x, y)) {
                        const nKey = this._key(n.x, n.y);
                        if (simKnownMines.get(nKey)) {
                            knownMineCount++;
                        } else if (!simRevealed.get(nKey)) {
                            hiddenCount++;
                            hiddenCells.push(n);
                        }
                    }

                    // If hidden count equals remaining mines, all hidden are mines
                    if (hiddenCount > 0 && hiddenCount === cell.count - knownMineCount) {
                        for (const c of hiddenCells) {
                            const cKey = this._key(c.x, c.y);
                            if (!simKnownMines.get(cKey)) {
                                simKnownMines.set(cKey, true);
                                progress = true;
                            }
                        }
                    }

                    // If known mines equals the number, all hidden are safe
                    if (knownMineCount === cell.count && hiddenCount > 0) {
                        for (const c of hiddenCells) {
                            simReveal(c.x, c.y);
                            progress = true;
                        }
                    }
                }
            }
        }

        // Check if all safe cells are revealed
        for (const [key, cell] of testCells) {
            if (!cell.mine && !simRevealed.get(key)) {
                return false;
            }
        }

        return true;
    }
}

// ============================================
// Exports
// ============================================

if (typeof window !== 'undefined') {
    window.SapperShapesGame = SapperShapesGame;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SapperShapesGame };
}
