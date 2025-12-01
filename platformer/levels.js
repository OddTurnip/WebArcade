// ============================================
// PLATFORMER LEVELS
// Level data and generation helpers
// ============================================

// Tile types
const TILE = {
    EMPTY: 0,
    GROUND: 1,
    BRICK: 2,
    BLOCK: 3,
    GOAL: 4,
    PIT: 5  // Invisible death zone below ground level
};

// Level dimensions
const LEVEL_WIDTH = 100;
const LEVEL_HEIGHT = 15;

// ============================================
// LEVEL GENERATION HELPERS
// ============================================

/**
 * Create an empty level filled with EMPTY tiles
 */
function createEmptyLevel() {
    const level = [];
    for (let y = 0; y < LEVEL_HEIGHT; y++) {
        level[y] = [];
        for (let x = 0; x < LEVEL_WIDTH; x++) {
            level[y][x] = TILE.EMPTY;
        }
    }
    return level;
}

/**
 * Fill the bottom rows with ground tiles
 * @param {Array} level - The level array to modify
 * @param {number} rows - Number of rows from bottom to fill (default: 2)
 */
function fillGround(level, rows = 2) {
    for (let r = 0; r < rows; r++) {
        const y = LEVEL_HEIGHT - 1 - r;
        for (let x = 0; x < LEVEL_WIDTH; x++) {
            level[y][x] = TILE.GROUND;
        }
    }
}

/**
 * Fill the top rows with ground tiles (ceiling)
 * @param {Array} level - The level array to modify
 * @param {number} rows - Number of rows from top to fill (default: 2)
 */
function addCeiling(level, rows = 2) {
    for (let r = 0; r < rows; r++) {
        for (let x = 0; x < LEVEL_WIDTH; x++) {
            level[r][x] = TILE.GROUND;
        }
    }
}

/**
 * Add pits (gaps in ground) at specified positions
 * @param {Array} level - The level array to modify
 * @param {Array} pits - Array of {x, width} objects
 * @param {number} depth - How many rows deep (default: 2)
 */
function addPits(level, pits, depth = 2) {
    for (const pit of pits) {
        for (let px = pit.x; px < pit.x + pit.width; px++) {
            for (let d = 0; d < depth; d++) {
                level[LEVEL_HEIGHT - 1 - d][px] = TILE.PIT;
            }
        }
    }
}

/**
 * Add platforms at specified positions
 * @param {Array} level - The level array to modify
 * @param {Array} platforms - Array of {x, y, width, tile?} objects
 */
function addPlatforms(level, platforms) {
    for (const plat of platforms) {
        const tile = plat.tile || TILE.BRICK;
        for (let px = plat.x; px < plat.x + plat.width; px++) {
            level[plat.y][px] = tile;
        }
    }
}

/**
 * Add individual blocks at specified positions
 * @param {Array} level - The level array to modify
 * @param {Array} blocks - Array of {x, y, tile?} objects
 */
function addBlocks(level, blocks) {
    for (const block of blocks) {
        const tile = block.tile || TILE.BLOCK;
        level[block.y][block.x] = tile;
    }
}

/**
 * Add stairs going up from left to right
 * @param {Array} level - The level array to modify
 * @param {number} startX - Starting X position
 * @param {number} steps - Number of steps
 * @param {number} baseY - Y position of bottom step (default: LEVEL_HEIGHT - 3)
 */
function addStairs(level, startX, steps, baseY = LEVEL_HEIGHT - 3) {
    for (let i = 0; i < steps; i++) {
        for (let y = baseY; y >= baseY - i; y--) {
            level[y][startX + i] = TILE.GROUND;
        }
    }
}

/**
 * Fill a rectangular area with a tile
 * @param {Array} level - The level array to modify
 * @param {number} x - Left X position
 * @param {number} y - Top Y position
 * @param {number} width - Width of rectangle
 * @param {number} height - Height of rectangle
 * @param {number} tile - Tile type to fill with
 */
function fillRect(level, x, y, width, height, tile) {
    for (let py = y; py < y + height; py++) {
        for (let px = x; px < x + width; px++) {
            if (px >= 0 && px < LEVEL_WIDTH && py >= 0 && py < LEVEL_HEIGHT) {
                level[py][px] = tile;
            }
        }
    }
}

/**
 * Add a vertical wall
 * @param {Array} level - The level array to modify
 * @param {number} x - X position of wall
 * @param {number} topY - Top Y position
 * @param {number} bottomY - Bottom Y position
 * @param {number} tile - Tile type (default: GROUND)
 */
function addWall(level, x, topY, bottomY, tile = TILE.GROUND) {
    for (let y = topY; y <= bottomY; y++) {
        level[y][x] = tile;
    }
}

// ============================================
// LEVEL 1: JUNGLE EXTERIOR
// ============================================
function createLevel1() {
    const level = createEmptyLevel();

    // Ground (bottom 2 rows)
    fillGround(level, 2);

    // Pits (gaps in ground)
    addPits(level, [
        { x: 20, width: 3 },
        { x: 35, width: 2 },
        { x: 55, width: 4 },
        { x: 75, width: 3 }
    ]);

    // Floating platforms (mossy stone)
    addPlatforms(level, [
        { x: 15, y: 10, width: 4 },
        { x: 25, y: 9,  width: 3 },
        { x: 32, y: 11, width: 5 },
        { x: 45, y: 10, width: 3 },
        { x: 50, y: 8,  width: 4 },
        { x: 60, y: 10, width: 6 },
        { x: 70, y: 9,  width: 3 },
        { x: 80, y: 10, width: 4 },
        { x: 85, y: 8,  width: 3 }
    ]);

    // Rune blocks (ancient stone blocks)
    addBlocks(level, [
        { x: 12, y: 9 },
        { x: 28, y: 6 },
        { x: 42, y: 9 },
        { x: 48, y: 9 },
        { x: 65, y: 7 },
        { x: 78, y: 9 }
    ]);

    // Temple structure at the end
    // Stairs going up
    addStairs(level, 88, 6);

    // Temple top platform
    addPlatforms(level, [
        { x: 94, y: LEVEL_HEIGHT - 9, width: 6, tile: TILE.GROUND }
    ]);

    // Fill in temple interior (solid structure below platform)
    fillRect(level, 94, LEVEL_HEIGHT - 8, 6, 6, TILE.GROUND);

    // Temple door (empty space for Level 2 entrance)
    level[LEVEL_HEIGHT - 4][97] = TILE.EMPTY;
    level[LEVEL_HEIGHT - 3][97] = TILE.EMPTY;

    // Goal gem at top of temple
    level[LEVEL_HEIGHT - 10][96] = TILE.GOAL;

    return level;
}

// Enemy spawn X positions for Level 1
const ENEMY_SPAWNS_L1 = [18, 30, 40, 52, 68, 82];

// ============================================
// LEVEL 2: TEMPLE INTERIOR
// ============================================
function createLevel2() {
    const level = createEmptyLevel();

    // Ground (bottom 2 rows)
    fillGround(level, 2);

    // Ceiling (temple interior)
    addCeiling(level, 2);

    // Pits (spike pits in temple)
    addPits(level, [
        { x: 15, width: 2 },
        { x: 28, width: 3 },
        { x: 45, width: 2 },
        { x: 58, width: 4 },
        { x: 72, width: 2 }
    ]);

    // Stone platforms
    addPlatforms(level, [
        { x: 10, y: 10, width: 5 },
        { x: 20, y: 8,  width: 4 },
        { x: 32, y: 10, width: 6 },
        { x: 42, y: 7,  width: 3 },
        { x: 50, y: 10, width: 4 },
        { x: 62, y: 9,  width: 5 },
        { x: 75, y: 10, width: 4 },
        { x: 82, y: 8,  width: 3 }
    ]);

    // Rune blocks
    addBlocks(level, [
        { x: 8,  y: 9 },
        { x: 25, y: 5 },
        { x: 38, y: 9 },
        { x: 55, y: 6 },
        { x: 68, y: 9 },
        { x: 80, y: 5 }
    ]);

    // Exit structure stairs
    addStairs(level, 90, 4);

    // Final gem pedestal
    level[LEVEL_HEIGHT - 8][96] = TILE.GROUND;
    level[LEVEL_HEIGHT - 9][96] = TILE.GOAL;

    // Pit below the gem pedestal (miss the jump = death)
    for (let px = 94; px <= 98; px++) {
        if (px !== 96) { // Keep pedestal column solid
            level[LEVEL_HEIGHT - 1][px] = TILE.PIT;
            level[LEVEL_HEIGHT - 2][px] = TILE.PIT;
        }
    }

    // Wall blocking the end
    addWall(level, 99, 2, LEVEL_HEIGHT - 3);

    return level;
}

// Enemy spawn X positions for Level 2
const ENEMY_SPAWNS_L2 = [12, 24, 36, 48, 60, 70, 78];

// ============================================
// LEVEL REGISTRY
// ============================================
const LEVELS = {
    1: { create: createLevel1, enemies: ENEMY_SPAWNS_L1 },
    2: { create: createLevel2, enemies: ENEMY_SPAWNS_L2 }
};

const MAX_LEVELS = Object.keys(LEVELS).length;

/**
 * Create a level by number
 * @param {number} levelNum - Level number (1-indexed)
 * @returns {Array} The level tile array
 */
function createLevel(levelNum) {
    const levelData = LEVELS[levelNum];
    if (!levelData) {
        console.error(`Level ${levelNum} not found`);
        return createEmptyLevel();
    }
    return levelData.create();
}

/**
 * Get enemy spawn positions for a level
 * @param {number} levelNum - Level number (1-indexed)
 * @returns {Array} Array of X positions for enemy spawns
 */
function getEnemySpawns(levelNum) {
    const levelData = LEVELS[levelNum];
    return levelData ? levelData.enemies : [];
}

// Export for browser
if (typeof window !== 'undefined') {
    window.TILE = TILE;
    window.LEVEL_WIDTH = LEVEL_WIDTH;
    window.LEVEL_HEIGHT = LEVEL_HEIGHT;
    window.MAX_LEVELS = MAX_LEVELS;
    window.createLevel = createLevel;
    window.getEnemySpawns = getEnemySpawns;
}

// Export for Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TILE,
        LEVEL_WIDTH,
        LEVEL_HEIGHT,
        MAX_LEVELS,
        createLevel,
        getEnemySpawns,
        // Export helpers for testing
        createEmptyLevel,
        fillGround,
        addCeiling,
        addPits,
        addPlatforms,
        addBlocks,
        addStairs,
        fillRect,
        addWall
    };
}
