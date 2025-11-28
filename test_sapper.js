/**
 * Unit tests for sapper.js
 *
 * Run with: node test_sapper.js
 *
 * Tests focus on verifying no-guess board generation produces
 * boards that are actually solvable through pure logic.
 */

const { SapperGame } = require('./sapper.js');

// ============================================
// Test utilities
// ============================================

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function test(name, fn) {
    try {
        fn();
        testsPassed++;
        console.log(`  ✓ ${name}`);
    } catch (e) {
        testsFailed++;
        console.log(`  ✗ ${name}`);
        console.log(`    Error: ${e.message}`);
    }
}

function suite(name, fn) {
    console.log(`\n${name}`);
    fn();
}

// ============================================
// Independent solver for verification
// (Separate implementation to catch bugs where
// both generator and verifier share the same flaw)
// ============================================

function independentSolve(game, startX, startY) {
    const width = game.width;
    const height = game.height;
    const grid = game.grid;

    // State tracking
    const revealed = [];
    const knownMines = [];

    for (let y = 0; y < height; y++) {
        revealed[y] = new Array(width).fill(false);
        knownMines[y] = new Array(width).fill(false);
    }

    // Reveal a cell (with flood fill for zeros)
    function reveal(x, y) {
        if (x < 0 || x >= width || y < 0 || y >= height) return;
        if (revealed[y][x] || knownMines[y][x]) return;
        if (grid[y][x] === -1) return; // Don't reveal mines

        revealed[y][x] = true;

        if (grid[y][x] === 0) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx !== 0 || dy !== 0) {
                        reveal(x + dx, y + dy);
                    }
                }
            }
        }
    }

    // Start with first click
    reveal(startX, startY);

    // Apply constraint propagation
    let progress = true;
    let iterations = 0;
    const maxIterations = width * height * 10; // Safety limit

    while (progress && iterations < maxIterations) {
        progress = false;
        iterations++;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (!revealed[y][x]) continue;
                if (grid[y][x] <= 0) continue;

                const number = grid[y][x];
                let hiddenCount = 0;
                let mineCount = 0;
                const hiddenCells = [];

                // Count neighbors
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

                        if (knownMines[ny][nx]) {
                            mineCount++;
                        } else if (!revealed[ny][nx]) {
                            hiddenCount++;
                            hiddenCells.push({ x: nx, y: ny });
                        }
                    }
                }

                const remainingMines = number - mineCount;

                // Rule 1: If hidden count equals remaining mines, all hidden are mines
                if (hiddenCount > 0 && hiddenCount === remainingMines) {
                    for (const cell of hiddenCells) {
                        if (!knownMines[cell.y][cell.x]) {
                            knownMines[cell.y][cell.x] = true;
                            progress = true;
                        }
                    }
                }

                // Rule 2: If all mines found, remaining hidden are safe
                if (remainingMines === 0 && hiddenCount > 0) {
                    for (const cell of hiddenCells) {
                        reveal(cell.x, cell.y);
                        progress = true;
                    }
                }
            }
        }
    }

    // Check if all safe cells are revealed
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (grid[y][x] !== -1 && !revealed[y][x]) {
                return false;
            }
        }
    }

    return true;
}

// ============================================
// Basic game mechanics tests
// ============================================

suite('Basic game initialization', () => {
    test('creates grid with correct dimensions', () => {
        const game = new SapperGame({ width: 10, height: 8, mines: 15 });
        game.initGrid();
        assert(game.width === 10, 'Width should be 10');
        assert(game.height === 8, 'Height should be 8');
        assert(game.grid.length === 8, 'Grid should have 8 rows');
        assert(game.grid[0].length === 10, 'Grid should have 10 columns');
    });

    test('grid starts empty with no mines', () => {
        const game = new SapperGame({ width: 5, height: 5, mines: 5 });
        game.initGrid();
        for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 5; x++) {
                assert(game.grid[y][x] === 0, 'All cells should start at 0');
                assert(!game.revealed[y][x], 'No cells should be revealed');
                assert(!game.flagged[y][x], 'No cells should be flagged');
            }
        }
    });

    test('default options are applied', () => {
        const game = new SapperGame();
        assert(game.width === 9, 'Default width is 9');
        assert(game.height === 9, 'Default height is 9');
        assert(game.totalMines === 10, 'Default mines is 10');
        assert(game.noGuess === false, 'Default noGuess is false');
    });
});

suite('First click safety', () => {
    test('first click is never a mine', () => {
        for (let i = 0; i < 20; i++) {
            const game = new SapperGame({ width: 9, height: 9, mines: 40 });
            game.initGrid();
            const clickX = Math.floor(Math.random() * 9);
            const clickY = Math.floor(Math.random() * 9);
            game.handleFirstClick(clickX, clickY);
            assert(game.grid[clickY][clickX] !== -1, 'Clicked cell should not be a mine');
        }
    });

    test('3x3 exclusion zone around first click is mine-free', () => {
        for (let i = 0; i < 20; i++) {
            const game = new SapperGame({ width: 9, height: 9, mines: 30 });
            game.initGrid();
            const clickX = 4;
            const clickY = 4;
            game.handleFirstClick(clickX, clickY);

            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const x = clickX + dx;
                    const y = clickY + dy;
                    assert(game.grid[y][x] !== -1, `Cell at (${x},${y}) should not be a mine`);
                }
            }
        }
    });
});

suite('Game state', () => {
    test('revealing mine triggers game over', () => {
        const game = new SapperGame({ width: 5, height: 5, mines: 5, noGuess: false });
        game.initGrid();
        game.handleFirstClick(0, 0);

        // Find a mine
        let mineX = -1, mineY = -1;
        for (let y = 0; y < 5 && mineX === -1; y++) {
            for (let x = 0; x < 5; x++) {
                if (game.grid[y][x] === -1) {
                    mineX = x;
                    mineY = y;
                    break;
                }
            }
        }

        if (mineX !== -1) {
            const result = game.revealCell(mineX, mineY);
            assert(result.hit === true, 'Should register mine hit');
            assert(result.lost === true, 'Should set lost flag');
            assert(game.gameOver === true, 'Game should be over');
        }
    });

    test('flagging cells works correctly', () => {
        const game = new SapperGame({ width: 5, height: 5, mines: 5 });
        game.initGrid();

        const result1 = game.toggleFlag(2, 2);
        assert(result1.flagged === true, 'Cell should be flagged');
        assert(result1.flagCount === 1, 'Flag count should be 1');
        assert(game.isFlagged(2, 2) === true, 'isFlagged should return true');

        const result2 = game.toggleFlag(2, 2);
        assert(result2.flagged === false, 'Cell should be unflagged');
        assert(result2.flagCount === 0, 'Flag count should be 0');
    });

    test('flagged cells cannot be revealed', () => {
        const game = new SapperGame({ width: 9, height: 9, mines: 10 });
        game.initGrid();
        game.handleFirstClick(0, 0);

        // Flag an unrevealed cell
        game.toggleFlag(8, 8);
        const result = game.revealCell(8, 8);

        assert(result.revealed.length === 0, 'Flagged cell should not be revealed');
    });
});

suite('Win detection', () => {
    test('game is won when all non-mine cells revealed', () => {
        // Create a small 3x3 with 1 mine for easy testing
        const game = new SapperGame({ width: 3, height: 3, mines: 1 });
        game.initGrid();
        game.handleFirstClick(1, 1); // Center click

        // Reveal all non-mine cells
        let won = false;
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                if (game.grid[y][x] !== -1 && !game.revealed[y][x]) {
                    const result = game.revealCell(x, y);
                    if (result.won) won = true;
                }
            }
        }

        assert(game.won === true, 'Game should be won');
    });
});

// ============================================
// No-guess solvability tests (the main event)
// ============================================

suite('No-guess board generation - Beginner (9x9, 10 mines)', () => {
    const NUM_BOARDS = 10;

    test(`all ${NUM_BOARDS} generated boards are solvable`, () => {
        for (let i = 0; i < NUM_BOARDS; i++) {
            const game = new SapperGame({
                width: 9,
                height: 9,
                mines: 10,
                noGuess: true
            });
            game.initGrid();

            const startX = Math.floor(Math.random() * 9);
            const startY = Math.floor(Math.random() * 9);
            const result = game.handleFirstClick(startX, startY);

            assert(result.success, `Board ${i+1} generation should succeed`);

            // Verify with independent solver
            const solvable = independentSolve(game, startX, startY);
            assert(solvable, `Board ${i+1} should be solvable by independent solver`);
        }
    });
});

suite('No-guess board generation - Intermediate (16x16, 40 mines)', () => {
    const NUM_BOARDS = 10;

    test(`all ${NUM_BOARDS} generated boards are solvable`, () => {
        for (let i = 0; i < NUM_BOARDS; i++) {
            const game = new SapperGame({
                width: 16,
                height: 16,
                mines: 40,
                noGuess: true
            });
            game.initGrid();

            const startX = Math.floor(Math.random() * 16);
            const startY = Math.floor(Math.random() * 16);
            const result = game.handleFirstClick(startX, startY);

            assert(result.success, `Board ${i+1} generation should succeed`);

            const solvable = independentSolve(game, startX, startY);
            assert(solvable, `Board ${i+1} should be solvable by independent solver`);
        }
    });
});

suite('No-guess board generation - Expert (30x16, 96 mines)', () => {
    // Note: 96 mines = 20% of 480 cells (30x16)
    // This matches the game's 20% max density for no-guess mode
    const NUM_BOARDS = 10;

    test(`all ${NUM_BOARDS} generated boards are solvable (this may take a moment...)`, () => {
        const startTime = Date.now();

        for (let i = 0; i < NUM_BOARDS; i++) {
            const game = new SapperGame({
                width: 30,
                height: 16,
                mines: 96, // 20% density - matches game's cap for no-guess
                noGuess: true,
                maxGenerationAttempts: 2000 // More attempts for harder boards
            });
            game.initGrid();

            const startX = Math.floor(Math.random() * 30);
            const startY = Math.floor(Math.random() * 16);
            const result = game.handleFirstClick(startX, startY);

            assert(result.success, `Board ${i+1} generation should succeed`);

            const solvable = independentSolve(game, startX, startY);
            assert(solvable, `Board ${i+1} should be solvable by independent solver`);
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`    (${NUM_BOARDS} expert boards generated and verified in ${elapsed}s)`);
    });
});

suite('No-guess board generation - Edge cases', () => {
    test('handles high mine density (20%)', () => {
        const game = new SapperGame({
            width: 20,
            height: 20,
            mines: 80, // 20%
            noGuess: true
        });
        game.initGrid();

        const result = game.handleFirstClick(10, 10);
        assert(result.success, 'Should generate solvable board at 20% density');

        const solvable = independentSolve(game, 10, 10);
        assert(solvable, 'Board should be solvable');
    });

    test('corner first clicks work correctly', () => {
        const corners = [[0, 0], [0, 15], [29, 0], [29, 15]];

        for (const [x, y] of corners) {
            const game = new SapperGame({
                width: 30,
                height: 16,
                mines: 50,
                noGuess: true
            });
            game.initGrid();

            const result = game.handleFirstClick(x, y);
            assert(result.success, `Corner (${x},${y}) generation should succeed`);

            const solvable = independentSolve(game, x, y);
            assert(solvable, `Corner (${x},${y}) board should be solvable`);
        }
    });
});

// ============================================
// Run tests
// ============================================

console.log('\n========================================');
console.log('Sapper.js Unit Tests');
console.log('========================================');

const startTime = Date.now();

// Note: All suites have already run at this point due to top-level execution.
// We just need to report results.

console.log('\n========================================');
const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
console.log(`Results: ${testsPassed} passed, ${testsFailed} failed (${totalTime}s)`);
console.log('========================================\n');

process.exit(testsFailed > 0 ? 1 : 0);
