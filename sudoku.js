/**
 * Sudoku Game Logic
 * Pure game logic - no DOM, no canvas, no event listeners
 * Can be used in browser or Node.js
 */

// ============================================
// VALIDATION
// ============================================

/**
 * Check if placing num at (row, col) is valid according to Sudoku rules
 * @param {number[][]} board - 9x9 grid (0 = empty)
 * @param {number} row - Row index (0-8)
 * @param {number} col - Column index (0-8)
 * @param {number} num - Number to place (1-9)
 * @returns {boolean} - True if placement is valid
 */
function isValidPlacement(board, row, col, num) {
    // Check row
    for (let c = 0; c < 9; c++) {
        if (c !== col && board[row][c] === num) return false;
    }
    // Check column
    for (let r = 0; r < 9; r++) {
        if (r !== row && board[r][col] === num) return false;
    }
    // Check 3x3 box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
            if ((r !== row || c !== col) && board[r][c] === num) return false;
        }
    }
    return true;
}

/**
 * Get all valid candidates for a cell
 * @param {number[][]} board - 9x9 grid
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @returns {number[]} - Array of valid numbers (1-9)
 */
function getCandidates(board, row, col) {
    if (board[row][col] !== 0) return [];
    const candidates = [];
    for (let num = 1; num <= 9; num++) {
        if (isValidPlacement(board, row, col, num)) {
            candidates.push(num);
        }
    }
    return candidates;
}

/**
 * Check if a board is completely filled
 * @param {number[][]} board - 9x9 grid
 * @returns {boolean} - True if no empty cells
 */
function isSolved(board) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === 0) return false;
        }
    }
    return true;
}

/**
 * Check if a completed board is valid (all constraints satisfied)
 * @param {number[][]} board - 9x9 grid
 * @returns {boolean} - True if valid solution
 */
function isValidSolution(board) {
    if (!isSolved(board)) return false;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (!isValidPlacement(board, r, c, board[r][c])) {
                return false;
            }
        }
    }
    return true;
}

// ============================================
// SOLVERS
// ============================================

/**
 * Solve using only naked singles (cells with one candidate)
 * Level 1 technique
 * @param {number[][]} board - 9x9 grid (modified in place)
 * @returns {number[][]} - The board after solving
 */
function solveNakedSingles(board) {
    let changed = true;
    while (changed) {
        changed = false;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (board[r][c] === 0) {
                    const candidates = getCandidates(board, r, c);
                    if (candidates.length === 1) {
                        board[r][c] = candidates[0];
                        changed = true;
                    }
                }
            }
        }
    }
    return board;
}

/**
 * Solve using hidden singles (number appears only once in row/col/box)
 * Level 2 technique (includes naked singles)
 * @param {number[][]} board - 9x9 grid (modified in place)
 * @returns {number[][]} - The board after solving
 */
function solveHiddenSingles(board) {
    let changed = true;
    while (changed) {
        changed = false;
        // First try naked singles
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (board[r][c] === 0) {
                    const candidates = getCandidates(board, r, c);
                    if (candidates.length === 1) {
                        board[r][c] = candidates[0];
                        changed = true;
                    }
                }
            }
        }
        if (changed) continue;

        // Hidden singles in rows
        for (let r = 0; r < 9; r++) {
            for (let num = 1; num <= 9; num++) {
                let positions = [];
                for (let c = 0; c < 9; c++) {
                    if (board[r][c] === 0 && getCandidates(board, r, c).includes(num)) {
                        positions.push(c);
                    }
                }
                if (positions.length === 1) {
                    board[r][positions[0]] = num;
                    changed = true;
                }
            }
        }

        // Hidden singles in columns
        for (let c = 0; c < 9; c++) {
            for (let num = 1; num <= 9; num++) {
                let positions = [];
                for (let r = 0; r < 9; r++) {
                    if (board[r][c] === 0 && getCandidates(board, r, c).includes(num)) {
                        positions.push(r);
                    }
                }
                if (positions.length === 1) {
                    board[positions[0]][c] = num;
                    changed = true;
                }
            }
        }

        // Hidden singles in boxes
        for (let boxR = 0; boxR < 3; boxR++) {
            for (let boxC = 0; boxC < 3; boxC++) {
                for (let num = 1; num <= 9; num++) {
                    let positions = [];
                    for (let r = boxR * 3; r < boxR * 3 + 3; r++) {
                        for (let c = boxC * 3; c < boxC * 3 + 3; c++) {
                            if (board[r][c] === 0 && getCandidates(board, r, c).includes(num)) {
                                positions.push({ r, c });
                            }
                        }
                    }
                    if (positions.length === 1) {
                        board[positions[0].r][positions[0].c] = num;
                        changed = true;
                    }
                }
            }
        }
    }
    return board;
}

/**
 * Helper for backtracking solver
 */
function solveBacktrackingHelper(board) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === 0) {
                const candidates = getCandidates(board, r, c);
                for (const num of candidates) {
                    board[r][c] = num;
                    if (solveBacktrackingHelper(board)) {
                        return true;
                    }
                    board[r][c] = 0;
                }
                return false;
            }
        }
    }
    return true;
}

/**
 * Solve using backtracking (brute force)
 * Level 5 technique - can solve any valid puzzle
 * @param {number[][]} board - 9x9 grid (not modified)
 * @returns {number[][]|null} - Solved board or null if unsolvable
 */
function solveBacktracking(board) {
    const copy = board.map(row => [...row]);
    if (solveBacktrackingHelper(copy)) {
        return copy;
    }
    return null;
}

/**
 * Count backtrack operations needed to solve a puzzle
 * Used to estimate difficulty for levels 3-5
 * @param {number[][]} board - 9x9 grid (not modified)
 * @returns {number} - Number of backtracks
 */
function countBacktracks(board) {
    let count = 0;
    const copy = board.map(row => [...row]);

    function solve() {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (copy[r][c] === 0) {
                    const candidates = getCandidates(copy, r, c);
                    for (const num of candidates) {
                        copy[r][c] = num;
                        if (solve()) return true;
                        copy[r][c] = 0;
                        count++;
                    }
                    return false;
                }
            }
        }
        return true;
    }

    solve();
    return count;
}

// ============================================
// DIFFICULTY CLASSIFICATION
// ============================================

/**
 * Determine the difficulty level of a puzzle
 * @param {number[][]} puzzle - 9x9 grid with some cells empty
 * @returns {number} - Difficulty level 1-5
 */
function getDifficultyLevel(puzzle) {
    // Try Level 1 (naked singles only)
    let test = puzzle.map(row => [...row]);
    solveNakedSingles(test);
    if (isSolved(test)) return 1;

    // Try Level 2 (hidden singles)
    test = puzzle.map(row => [...row]);
    solveHiddenSingles(test);
    if (isSolved(test)) return 2;

    // Levels 3-5 require more advanced techniques
    // Use backtracking count as a proxy for difficulty
    test = puzzle.map(row => [...row]);
    const backtrackCount = countBacktracks(test);

    if (backtrackCount < 10) return 3;
    if (backtrackCount < 50) return 4;
    return 5;
}

// ============================================
// PUZZLE GENERATION
// ============================================

/**
 * Fill a board with a complete valid Sudoku solution
 * @param {number[][]} board - 9x9 grid (modified in place)
 * @returns {boolean} - True if successfully filled
 */
function fillBoard(board) {
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === 0) {
                const shuffled = [...nums].sort(() => Math.random() - 0.5);
                for (const num of shuffled) {
                    if (isValidPlacement(board, r, c, num)) {
                        board[r][c] = num;
                        if (fillBoard(board)) return true;
                        board[r][c] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

/**
 * Generate a complete valid Sudoku grid
 * @returns {number[][]} - Fully filled 9x9 grid
 */
function generateCompleteSudoku() {
    const board = Array(9).fill(null).map(() => Array(9).fill(0));
    fillBoard(board);
    return board;
}

/**
 * Target clue counts for each difficulty level
 */
const TARGET_CLUES = {
    1: 36,  // Easy - naked singles
    2: 30,  // Medium - hidden singles
    3: 26,  // Hard - X-wing/Y-wing
    4: 24,  // Expert - forcing chains
    5: 22   // Evil - trial and error
};

/**
 * Generate a puzzle of a specific difficulty
 * @param {number} targetDifficulty - Difficulty level 1-5
 * @returns {{puzzle: number[][], solution: number[][]}} - Puzzle and its solution
 */
function generatePuzzle(targetDifficulty) {
    const complete = generateCompleteSudoku();
    const puzzle = complete.map(row => [...row]);

    // Create list of all positions and shuffle
    const positions = [];
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            positions.push({ r, c });
        }
    }
    positions.sort(() => Math.random() - 0.5);

    let currentClues = 81;
    const minClues = TARGET_CLUES[targetDifficulty] || 30;

    for (const pos of positions) {
        if (currentClues <= minClues) break;

        const backup = puzzle[pos.r][pos.c];
        puzzle[pos.r][pos.c] = 0;

        // Check if puzzle still has unique solution
        const solved = solveBacktracking(puzzle);

        if (solved) {
            // Verify it matches our complete solution
            let matches = true;
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (solved[r][c] !== complete[r][c]) {
                        matches = false;
                        break;
                    }
                }
                if (!matches) break;
            }

            if (matches) {
                const difficulty = getDifficultyLevel(puzzle);
                if (difficulty <= targetDifficulty) {
                    currentClues--;
                } else {
                    // Restore if too hard
                    puzzle[pos.r][pos.c] = backup;
                }
            } else {
                // Multiple solutions, restore
                puzzle[pos.r][pos.c] = backup;
            }
        } else {
            puzzle[pos.r][pos.c] = backup;
        }
    }

    return { puzzle, solution: complete };
}

/**
 * Count filled cells in a puzzle
 * @param {number[][]} board - 9x9 grid
 * @returns {number} - Number of non-zero cells
 */
function countClues(board) {
    let count = 0;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] !== 0) count++;
        }
    }
    return count;
}

// ============================================
// EXPORTS
// ============================================

// Browser export
if (typeof window !== 'undefined') {
    window.SudokuGame = {
        isValidPlacement,
        getCandidates,
        isSolved,
        isValidSolution,
        solveNakedSingles,
        solveHiddenSingles,
        solveBacktracking,
        countBacktracks,
        getDifficultyLevel,
        fillBoard,
        generateCompleteSudoku,
        generatePuzzle,
        countClues,
        TARGET_CLUES
    };
}

// Node.js export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isValidPlacement,
        getCandidates,
        isSolved,
        isValidSolution,
        solveNakedSingles,
        solveHiddenSingles,
        solveBacktracking,
        countBacktracks,
        getDifficultyLevel,
        fillBoard,
        generateCompleteSudoku,
        generatePuzzle,
        countClues,
        TARGET_CLUES
    };
}
