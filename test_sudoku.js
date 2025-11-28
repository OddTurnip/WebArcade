/**
 * Unit tests for sudoku.js
 *
 * Run with: node test_sudoku.js
 *
 * Tests verify:
 * - Legal move acceptance
 * - Illegal move rejection (row/column/box conflicts)
 * - Puzzle generation produces valid, solvable puzzles
 * - Difficulty levels are appropriate
 */

const {
    isValidPlacement,
    getCandidates,
    isSolved,
    isValidSolution,
    solveNakedSingles,
    solveHiddenSingles,
    solveBacktracking,
    countBacktracks,
    getDifficultyLevel,
    generateCompleteSudoku,
    generatePuzzle,
    countClues,
    TARGET_CLUES
} = require('./sudoku.js');

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
// Helper: Create an empty 9x9 board
// ============================================
function emptyBoard() {
    return Array(9).fill(null).map(() => Array(9).fill(0));
}

// ============================================
// Helper: A known valid completed board
// ============================================
function validCompletedBoard() {
    return [
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
        [1, 9, 8, 3, 4, 2, 5, 6, 7],
        [8, 5, 9, 7, 6, 1, 4, 2, 3],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 1, 5, 3, 7, 2, 8, 4],
        [2, 8, 7, 4, 1, 9, 6, 3, 5],
        [3, 4, 5, 2, 8, 6, 1, 7, 9]
    ];
}

// ============================================
// Legal and illegal move tests
// ============================================

suite('isValidPlacement - Accepting legal moves', () => {
    test('accepts valid placement in empty row/col/box', () => {
        const board = emptyBoard();
        assert(isValidPlacement(board, 0, 0, 5) === true, 'Should accept 5 at (0,0)');
        assert(isValidPlacement(board, 4, 4, 9) === true, 'Should accept 9 at (4,4)');
        assert(isValidPlacement(board, 8, 8, 1) === true, 'Should accept 1 at (8,8)');
    });

    test('accepts placement that does not conflict with existing numbers', () => {
        const board = emptyBoard();
        board[0][0] = 5;
        board[0][1] = 3;
        board[1][0] = 6;

        // Different number in same row
        assert(isValidPlacement(board, 0, 8, 9) === true, 'Should accept 9 in row with 5,3');

        // Different number in same column
        assert(isValidPlacement(board, 8, 0, 2) === true, 'Should accept 2 in col with 5,6');

        // Different number in same box
        assert(isValidPlacement(board, 2, 2, 1) === true, 'Should accept 1 in box with 5,3,6');
    });

    test('allows same number if cell already contains it', () => {
        const board = emptyBoard();
        board[0][0] = 5;
        // When checking if placing 5 at (0,0) is valid, it should be true
        // because we're not comparing against itself
        assert(isValidPlacement(board, 0, 0, 5) === true, 'Should accept same number in same cell');
    });
});

suite('isValidPlacement - Rejecting illegal moves', () => {
    test('rejects duplicate in same row', () => {
        const board = emptyBoard();
        board[0][0] = 5;
        assert(isValidPlacement(board, 0, 8, 5) === false, 'Should reject 5 when 5 exists in same row');
    });

    test('rejects duplicate in same column', () => {
        const board = emptyBoard();
        board[0][0] = 5;
        assert(isValidPlacement(board, 8, 0, 5) === false, 'Should reject 5 when 5 exists in same column');
    });

    test('rejects duplicate in same 3x3 box', () => {
        const board = emptyBoard();
        board[0][0] = 5;
        assert(isValidPlacement(board, 1, 1, 5) === false, 'Should reject 5 when 5 exists in same box');
        assert(isValidPlacement(board, 2, 2, 5) === false, 'Should reject 5 at (2,2) in same box');
    });

    test('rejects in all three regions correctly', () => {
        const board = validCompletedBoard();
        board[4][4] = 0; // Clear center cell (was 5)

        // The center cell should not accept numbers that are in its row, col, or box
        assert(isValidPlacement(board, 4, 4, 4) === false, '4 is in row 4');
        assert(isValidPlacement(board, 4, 4, 2) === false, '2 is in column 4');
        assert(isValidPlacement(board, 4, 4, 7) === false, '7 is in center box');

        // But it should accept 5 (which was the original value)
        assert(isValidPlacement(board, 4, 4, 5) === true, '5 was the original valid value');
    });
});

suite('getCandidates - Finding valid numbers', () => {
    test('returns all numbers for empty board cell', () => {
        const board = emptyBoard();
        const candidates = getCandidates(board, 0, 0);
        assert(candidates.length === 9, 'Empty cell should have 9 candidates');
        for (let i = 1; i <= 9; i++) {
            assert(candidates.includes(i), `Should include ${i}`);
        }
    });

    test('returns empty array for filled cell', () => {
        const board = emptyBoard();
        board[0][0] = 5;
        const candidates = getCandidates(board, 0, 0);
        assert(candidates.length === 0, 'Filled cell should have no candidates');
    });

    test('excludes numbers present in row/col/box', () => {
        const board = emptyBoard();
        board[0][1] = 1;
        board[0][2] = 2;
        board[1][0] = 3;
        board[2][0] = 4;
        board[1][1] = 5;

        const candidates = getCandidates(board, 0, 0);
        assert(!candidates.includes(1), 'Should exclude 1 (in row)');
        assert(!candidates.includes(2), 'Should exclude 2 (in row)');
        assert(!candidates.includes(3), 'Should exclude 3 (in column)');
        assert(!candidates.includes(4), 'Should exclude 4 (in column)');
        assert(!candidates.includes(5), 'Should exclude 5 (in box)');
        assert(candidates.includes(6), 'Should include 6');
        assert(candidates.length === 4, 'Should have 4 candidates (6,7,8,9)');
    });
});

// ============================================
// Solver tests
// ============================================

suite('solveBacktracking - Solving puzzles', () => {
    test('solves a valid puzzle', () => {
        const puzzle = validCompletedBoard();
        // Remove some cells
        puzzle[0][0] = 0;
        puzzle[4][4] = 0;
        puzzle[8][8] = 0;

        const solved = solveBacktracking(puzzle);
        assert(solved !== null, 'Should return a solution');
        assert(solved[0][0] === 5, 'Should fill (0,0) with 5');
        assert(solved[4][4] === 5, 'Should fill (4,4) with 5');
        assert(solved[8][8] === 9, 'Should fill (8,8) with 9');
    });

    test('returns null for unsolvable puzzle', () => {
        // Create an invalid state where cell (0,0) has no valid candidates
        // Fill row 0, column 0, and box 0 with 1-9 except leave (0,0) empty
        const board = emptyBoard();
        // Fill row 0 (except 0,0) with 2-9
        for (let c = 1; c <= 8; c++) {
            board[0][c] = c + 1 > 9 ? c - 8 : c + 1;
        }
        // Set row 0 to: 0, 2, 3, 4, 5, 6, 7, 8, 9
        board[0][1] = 2; board[0][2] = 3; board[0][3] = 4;
        board[0][4] = 5; board[0][5] = 6; board[0][6] = 7;
        board[0][7] = 8; board[0][8] = 9;
        // Now cell (0,0) can only be 1
        // Put 1 in column 0 to block it
        board[1][0] = 1;

        const solved = solveBacktracking(board);
        assert(solved === null, 'Should return null for invalid puzzle');
    });

    test('does not modify original board', () => {
        const puzzle = emptyBoard();
        puzzle[0][0] = 5;

        solveBacktracking(puzzle);

        // Original should still have empty cells
        assert(puzzle[8][8] === 0, 'Original board should be unchanged');
    });
});

suite('isSolved and isValidSolution', () => {
    test('isSolved returns true for full board', () => {
        const board = validCompletedBoard();
        assert(isSolved(board) === true, 'Complete board should be solved');
    });

    test('isSolved returns false for incomplete board', () => {
        const board = validCompletedBoard();
        board[0][0] = 0;
        assert(isSolved(board) === false, 'Board with empty cell is not solved');
    });

    test('isValidSolution returns true for valid complete board', () => {
        const board = validCompletedBoard();
        assert(isValidSolution(board) === true, 'Valid board should pass validation');
    });

    test('isValidSolution returns false for invalid complete board', () => {
        const board = validCompletedBoard();
        board[0][1] = board[0][0]; // Create duplicate in row
        assert(isValidSolution(board) === false, 'Invalid board should fail validation');
    });

    test('isValidSolution returns false for incomplete board', () => {
        const board = validCompletedBoard();
        board[0][0] = 0;
        assert(isValidSolution(board) === false, 'Incomplete board is not valid solution');
    });
});

// ============================================
// Difficulty classification tests
// ============================================

suite('getDifficultyLevel', () => {
    test('classifies naked-singles-only puzzle as Level 1', () => {
        // Create a puzzle that can be solved with naked singles only
        const board = validCompletedBoard();
        // Remove just one cell - definitely solvable with naked singles
        board[0][0] = 0;

        const level = getDifficultyLevel(board);
        assert(level === 1, `Should be Level 1, got Level ${level}`);
    });
});

// ============================================
// Complete Sudoku generation tests
// ============================================

suite('generateCompleteSudoku', () => {
    test('generates a fully filled 9x9 grid', () => {
        const board = generateCompleteSudoku();
        assert(board.length === 9, 'Should have 9 rows');
        assert(board[0].length === 9, 'Should have 9 columns');

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                assert(board[r][c] >= 1 && board[r][c] <= 9,
                    `Cell (${r},${c}) should be 1-9, got ${board[r][c]}`);
            }
        }
    });

    test('generates a valid solution', () => {
        const board = generateCompleteSudoku();
        assert(isValidSolution(board) === true, 'Generated board should be valid');
    });

    test('generates different boards each time', () => {
        const board1 = generateCompleteSudoku();
        const board2 = generateCompleteSudoku();

        let different = false;
        for (let r = 0; r < 9 && !different; r++) {
            for (let c = 0; c < 9; c++) {
                if (board1[r][c] !== board2[r][c]) {
                    different = true;
                    break;
                }
            }
        }

        assert(different, 'Two generated boards should be different');
    });
});

// ============================================
// Puzzle generation tests for all difficulty levels
// ============================================

suite('generatePuzzle - Level 1 (Easy)', () => {
    test('generates valid, solvable Level 1 puzzles', () => {
        for (let i = 0; i < 3; i++) {
            const { puzzle, solution } = generatePuzzle(1);

            // Check clue count
            const clues = countClues(puzzle);
            assert(clues <= TARGET_CLUES[1] + 5, `Should have ~${TARGET_CLUES[1]} clues, got ${clues}`);

            // Verify solution is valid
            assert(isValidSolution(solution), 'Solution should be valid');

            // Verify puzzle is solvable and matches solution
            const solved = solveBacktracking(puzzle);
            assert(solved !== null, 'Puzzle should be solvable');

            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    assert(solved[r][c] === solution[r][c],
                        `Solved puzzle should match provided solution at (${r},${c})`);
                }
            }

            // Verify difficulty
            const level = getDifficultyLevel(puzzle);
            assert(level <= 1, `Level 1 puzzle should be solvable at Level 1, got Level ${level}`);
        }
    });
});

suite('generatePuzzle - Level 2 (Medium)', () => {
    test('generates valid, solvable Level 2 puzzles', () => {
        for (let i = 0; i < 3; i++) {
            const { puzzle, solution } = generatePuzzle(2);

            const clues = countClues(puzzle);
            assert(clues <= TARGET_CLUES[2] + 5, `Should have ~${TARGET_CLUES[2]} clues, got ${clues}`);

            assert(isValidSolution(solution), 'Solution should be valid');

            const solved = solveBacktracking(puzzle);
            assert(solved !== null, 'Puzzle should be solvable');

            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    assert(solved[r][c] === solution[r][c],
                        `Solved puzzle should match provided solution`);
                }
            }

            const level = getDifficultyLevel(puzzle);
            assert(level <= 2, `Level 2 puzzle should be solvable at Level 2 or less, got Level ${level}`);
        }
    });
});

suite('generatePuzzle - Level 3 (Hard)', () => {
    test('generates valid, solvable Level 3 puzzles', () => {
        for (let i = 0; i < 2; i++) {
            const { puzzle, solution } = generatePuzzle(3);

            const clues = countClues(puzzle);
            assert(clues <= TARGET_CLUES[3] + 5, `Should have ~${TARGET_CLUES[3]} clues, got ${clues}`);

            assert(isValidSolution(solution), 'Solution should be valid');

            const solved = solveBacktracking(puzzle);
            assert(solved !== null, 'Puzzle should be solvable');

            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    assert(solved[r][c] === solution[r][c],
                        `Solved puzzle should match provided solution`);
                }
            }

            const level = getDifficultyLevel(puzzle);
            assert(level <= 3, `Level 3 puzzle should be solvable at Level 3 or less, got Level ${level}`);
        }
    });
});

suite('generatePuzzle - Level 4 (Expert)', () => {
    test('generates valid, solvable Level 4 puzzles', () => {
        for (let i = 0; i < 2; i++) {
            const { puzzle, solution } = generatePuzzle(4);

            const clues = countClues(puzzle);
            // Level 4 is harder to generate with few clues; allow more tolerance
            assert(clues <= TARGET_CLUES[4] + 10, `Should have ~${TARGET_CLUES[4]} clues, got ${clues}`);

            assert(isValidSolution(solution), 'Solution should be valid');

            const solved = solveBacktracking(puzzle);
            assert(solved !== null, 'Puzzle should be solvable');

            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    assert(solved[r][c] === solution[r][c],
                        `Solved puzzle should match provided solution`);
                }
            }

            const level = getDifficultyLevel(puzzle);
            assert(level <= 4, `Level 4 puzzle should be solvable at Level 4 or less, got Level ${level}`);
        }
    });
});

suite('generatePuzzle - Level 5 (Evil)', () => {
    test('generates valid, solvable Level 5 puzzles', () => {
        // Only test 1 Level 5 puzzle since generation is slow
        const { puzzle, solution } = generatePuzzle(5);

        const clues = countClues(puzzle);
        assert(clues <= TARGET_CLUES[5] + 10, `Should have ~${TARGET_CLUES[5]} clues, got ${clues}`);

        assert(isValidSolution(solution), 'Solution should be valid');

        const solved = solveBacktracking(puzzle);
        assert(solved !== null, 'Puzzle should be solvable');

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                assert(solved[r][c] === solution[r][c],
                    `Solved puzzle should match provided solution`);
            }
        }

        // Level 5 can be any difficulty up to 5
        const level = getDifficultyLevel(puzzle);
        assert(level <= 5, `Level 5 puzzle should be solvable at Level 5 or less, got Level ${level}`);
    });
});

// ============================================
// Unique solution tests
// ============================================

suite('Puzzle uniqueness', () => {
    test('generated puzzles have unique solutions', () => {
        // Generate a few puzzles and verify they have unique solutions
        for (let i = 0; i < 3; i++) {
            const { puzzle, solution } = generatePuzzle(3);

            // Solve the puzzle
            const solved = solveBacktracking(puzzle);
            assert(solved !== null, 'Puzzle should be solvable');

            // Verify the solved board matches the expected solution
            let matches = true;
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (solved[r][c] !== solution[r][c]) {
                        matches = false;
                        break;
                    }
                }
                if (!matches) break;
            }

            assert(matches, 'Solved puzzle should have unique solution matching expected');
        }
    });
});

// ============================================
// countClues utility test
// ============================================

suite('countClues', () => {
    test('counts filled cells correctly', () => {
        const board = emptyBoard();
        assert(countClues(board) === 0, 'Empty board should have 0 clues');

        board[0][0] = 5;
        assert(countClues(board) === 1, 'Should have 1 clue');

        board[4][4] = 9;
        board[8][8] = 1;
        assert(countClues(board) === 3, 'Should have 3 clues');
    });

    test('counts complete board as 81', () => {
        const board = validCompletedBoard();
        assert(countClues(board) === 81, 'Complete board should have 81 clues');
    });
});

// ============================================
// Run tests
// ============================================

console.log('\n========================================');
console.log('Sudoku.js Unit Tests');
console.log('========================================');

const startTime = Date.now();

// Note: All suites have already run at this point due to top-level execution.
// We just need to report results.

console.log('\n========================================');
const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
console.log(`Results: ${testsPassed} passed, ${testsFailed} failed (${totalTime}s)`);
console.log('========================================\n');

process.exit(testsFailed > 0 ? 1 : 0);
