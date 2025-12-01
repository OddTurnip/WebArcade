// ============================================
// PLATFORMER GAME LOGIC
// Core game mechanics (no DOM/rendering)
// ============================================

// ============================================
// GAME CONFIGURATION
// ============================================
const CONFIG = {
    WIDTH: 640,
    HEIGHT: 480,
    TILE_SIZE: 32,
    GRAVITY: 0.6,
    MAX_FALL_SPEED: 12,
    PLAYER_SPEED: 4,
    PLAYER_JUMP: -12,
    ENEMY_SPEED: 1.5,
    COLORS: {
        // Jungle theme
        sky: '#87ceeb',
        skyGradient: '#98d8c8',
        ground: '#5d4037',
        groundHighlight: '#8d6e63',
        groundDark: '#3e2723',
        brick: '#607d5b',       // Mossy stone
        brickHighlight: '#7a9a75',
        block: '#a1887f',       // Ancient stone
        blockShade: '#6d4c41',
        player: '#d2691e',      // Explorer brown/khaki
        playerShirt: '#f5deb3', // Khaki shirt
        enemy: '#228b22',       // Snake green
        enemyDark: '#006400',
        enemyPattern: '#32cd32', // Snake pattern
        gem: '#ff1493',         // Pink gem
        gemShine: '#ffb6c1',
        temple: '#8b7355',      // Temple stone
        templeDark: '#5d4e37',
        templeAccent: '#daa520', // Gold trim
        cloud: '#ffffff',
        bush: '#228b22',
        bushDark: '#006400',
        vine: '#2e8b57',
        tree: '#0b5345',
        treeTrunk: '#5d4037',
        text: '#ffffff',
        textHighlight: '#ffe66d'
    }
};

// Calculate visible tiles
const TILES_X = Math.ceil(CONFIG.WIDTH / CONFIG.TILE_SIZE) + 1;
const TILES_Y = Math.ceil(CONFIG.HEIGHT / CONFIG.TILE_SIZE);

// ============================================
// GAME STATE
// ============================================
const GameState = {
    TITLE: 'title',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over',
    LEVEL_TRANSITION: 'level_transition',
    LEVEL_COMPLETE: 'level_complete'
};

// Timing constants
const UNPAUSE_DELAY = 250;
const STATE_CHANGE_DELAY = 250;
const STARTING_LIVES = 3;

// Game state object - holds all mutable game state
const gameState = {
    state: GameState.TITLE,
    score: 0,
    lives: STARTING_LIVES,
    isNewHighScore: false,
    level: [],
    currentLevel: 1,
    cameraX: 0,
    maxCameraX: 0,
    pauseTime: 0,
    stateChangeTime: 0,
    transitionTimer: 0
};

// Player state
const player = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    width: 24,
    height: 30,
    onGround: false,
    facing: 1,     // 1 = right, -1 = left
    animFrame: 0,
    animTimer: 0
};

// Enemies array
let enemies = [];

// ============================================
// COLLISION DETECTION
// ============================================
function getTileAt(pixelX, pixelY) {
    const tileX = Math.floor(pixelX / CONFIG.TILE_SIZE);
    const tileY = Math.floor(pixelY / CONFIG.TILE_SIZE);
    if (tileX < 0 || tileX >= LEVEL_WIDTH || tileY < 0 || tileY >= LEVEL_HEIGHT) {
        return tileY >= LEVEL_HEIGHT ? TILE.PIT : TILE.EMPTY;
    }
    return gameState.level[tileY][tileX];
}

function isSolidTile(tile) {
    return tile === TILE.GROUND || tile === TILE.BRICK || tile === TILE.BLOCK;
}

function checkCollision(x, y, width, height) {
    // Check all four corners and middle points
    const points = [
        { x: x + 2, y: y + 2 },              // top-left
        { x: x + width - 2, y: y + 2 },      // top-right
        { x: x + 2, y: y + height - 2 },     // bottom-left
        { x: x + width - 2, y: y + height - 2 }, // bottom-right
        { x: x + width / 2, y: y + 2 },      // top-center
        { x: x + width / 2, y: y + height - 2 } // bottom-center
    ];

    for (const point of points) {
        if (isSolidTile(getTileAt(point.x, point.y))) {
            return true;
        }
    }
    return false;
}

function isOnGround(x, y, width, height) {
    // Check if there's solid ground just below the player's feet
    const groundY = y + height + 1;
    return isSolidTile(getTileAt(x + 4, groundY)) ||
           isSolidTile(getTileAt(x + width / 2, groundY)) ||
           isSolidTile(getTileAt(x + width - 4, groundY));
}

// ============================================
// INITIALIZATION
// ============================================
function initLevel(levelNum) {
    // Create level
    gameState.level = createLevel(levelNum);
    gameState.cameraX = 0;
    gameState.maxCameraX = 0;

    // Reset player
    player.x = 3 * CONFIG.TILE_SIZE;
    player.y = (LEVEL_HEIGHT - 3) * CONFIG.TILE_SIZE;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    player.facing = 1;
    player.animFrame = 0;
    player.animTimer = 0;

    // Spawn enemies
    enemies = [];
    const spawns = getEnemySpawns(levelNum);
    for (const spawnX of spawns) {
        enemies.push({
            x: spawnX * CONFIG.TILE_SIZE,
            y: (LEVEL_HEIGHT - 3) * CONFIG.TILE_SIZE,
            vx: -CONFIG.ENEMY_SPEED,
            width: 28,
            height: 26,
            alive: true,
            squashTimer: 0
        });
    }
}

function initGame() {
    gameState.currentLevel = 1;
    gameState.score = 0;
    gameState.lives = STARTING_LIVES;
    gameState.isNewHighScore = false;
    initLevel(gameState.currentLevel);
}

// ============================================
// UPDATE FUNCTIONS
// ============================================
function updateEnemies() {
    for (const enemy of enemies) {
        if (!enemy.alive) {
            if (enemy.squashTimer > 0) {
                enemy.squashTimer--;
            }
            continue;
        }

        // Move enemy
        const newEX = enemy.x + enemy.vx;

        // Check wall collision
        const checkY = enemy.y + enemy.height / 2;
        const frontX = enemy.vx < 0 ? newEX : newEX + enemy.width;
        if (isSolidTile(getTileAt(frontX, checkY))) {
            enemy.vx = -enemy.vx; // Reverse direction
        } else {
            // Check for ledge (don't walk off platforms)
            const groundCheckX = enemy.vx < 0 ? newEX : newEX + enemy.width;
            const groundCheckY = enemy.y + enemy.height + 4;
            if (!isSolidTile(getTileAt(groundCheckX, groundCheckY))) {
                enemy.vx = -enemy.vx; // Reverse at ledge
            } else {
                enemy.x = newEX;
            }
        }

        // Apply gravity to enemy
        const enemyGroundCheck = enemy.y + enemy.height + 1;
        if (!isSolidTile(getTileAt(enemy.x + enemy.width / 2, enemyGroundCheck))) {
            enemy.y += 4; // Fall
        }
    }
}

/**
 * Check for player-enemy collisions
 * @returns {Object|null} Result: {stomp: true, enemy} or {death: true} or null
 */
function checkEnemyCollisions() {
    for (const enemy of enemies) {
        if (!enemy.alive) continue;

        const playerRight = player.x + player.width;
        const playerBottom = player.y + player.height;
        const enemyRight = enemy.x + enemy.width;
        const enemyBottom = enemy.y + enemy.height;

        // AABB collision
        if (player.x < enemyRight &&
            playerRight > enemy.x &&
            player.y < enemyBottom &&
            playerBottom > enemy.y) {

            // Check if player is stomping (falling onto enemy)
            const playerFeetY = playerBottom;
            const enemyHeadY = enemy.y + enemy.height * 0.3;

            if (player.vy > 0 && playerFeetY < enemyHeadY + 10) {
                // Stomp! Kill enemy
                enemy.alive = false;
                enemy.squashTimer = 20;
                player.vy = CONFIG.PLAYER_JUMP * 0.6; // Bounce
                return { stomp: true, enemy };
            } else {
                // Player hit from side - death
                return { death: true };
            }
        }
    }
    return null;
}

/**
 * Update player physics and movement
 * @param {Object} input - {left, right, jump} booleans
 * @returns {Object|null} Result: {death: true}, {goal: true}, or null
 */
function updatePlayer(input) {
    // Player horizontal movement
    player.vx = 0;
    if (input.left) {
        player.vx = -CONFIG.PLAYER_SPEED;
        player.facing = -1;
    }
    if (input.right) {
        player.vx = CONFIG.PLAYER_SPEED;
        player.facing = 1;
    }

    // Prevent backtracking
    const minPlayerX = gameState.maxCameraX + 8;
    if (player.x + player.vx < minPlayerX) {
        player.vx = 0;
        player.x = minPlayerX;
    }

    // Check if on ground before applying physics
    player.onGround = isOnGround(player.x, player.y, player.width, player.height);

    // Jumping
    if (input.jump && player.onGround) {
        player.vy = CONFIG.PLAYER_JUMP;
        player.onGround = false;
        return { jumped: true };
    }

    // Apply gravity
    player.vy += CONFIG.GRAVITY;
    if (player.vy > CONFIG.MAX_FALL_SPEED) {
        player.vy = CONFIG.MAX_FALL_SPEED;
    }

    // Horizontal movement with collision
    const newX = player.x + player.vx;
    if (!checkCollision(newX, player.y, player.width, player.height)) {
        player.x = newX;
    }

    // Vertical movement with collision
    const newY = player.y + player.vy;
    let hitCeiling = false;

    if (player.vy > 0) {
        // Moving down - check for ground
        if (checkCollision(player.x, newY, player.width, player.height)) {
            player.y = Math.floor((newY + player.height) / CONFIG.TILE_SIZE) * CONFIG.TILE_SIZE - player.height;
            player.vy = 0;
        } else {
            player.y = newY;
        }
    } else if (player.vy < 0) {
        // Moving up - check for ceiling
        if (checkCollision(player.x, newY, player.width, player.height)) {
            player.y = Math.floor(newY / CONFIG.TILE_SIZE) * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE;
            player.vy = 0;
            hitCeiling = true;
        } else {
            player.y = newY;
        }
    }

    // Check for pit death
    if (player.y > LEVEL_HEIGHT * CONFIG.TILE_SIZE) {
        return { death: true };
    }

    // Check for goal
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    if (getTileAt(playerCenterX, playerCenterY) === TILE.GOAL) {
        return { goal: true };
    }

    // Update camera (follows player, can't go back)
    const targetCameraX = player.x - CONFIG.WIDTH / 3;
    gameState.cameraX = Math.max(gameState.maxCameraX, Math.min(targetCameraX, (LEVEL_WIDTH - TILES_X) * CONFIG.TILE_SIZE));
    gameState.maxCameraX = gameState.cameraX;

    // Animation
    if (Math.abs(player.vx) > 0 && player.onGround) {
        player.animTimer++;
        if (player.animTimer >= 8) {
            player.animTimer = 0;
            player.animFrame = (player.animFrame + 1) % 3;
        }
    } else if (!player.onGround) {
        player.animFrame = 1; // Jump frame
    } else {
        player.animFrame = 0;
    }

    return hitCeiling ? { hitCeiling: true } : null;
}

/**
 * Update player during level transition (auto-walk)
 * @returns {boolean} True if transition is complete
 */
function updateTransition() {
    gameState.transitionTimer++;

    // Auto-walk player to the right toward the door
    player.facing = 1;
    player.vx = CONFIG.PLAYER_SPEED * 0.7;

    // Simple walking animation
    player.animTimer++;
    if (player.animTimer >= 10) {
        player.animTimer = 0;
        player.animFrame = (player.animFrame + 1) % 3;
    }

    // Move player
    player.x += player.vx;

    // Apply gravity
    player.vy += CONFIG.GRAVITY;
    if (player.vy > CONFIG.MAX_FALL_SPEED) {
        player.vy = CONFIG.MAX_FALL_SPEED;
    }

    // Vertical collision
    const newY = player.y + player.vy;
    if (player.vy > 0) {
        if (checkCollision(player.x, newY, player.width, player.height)) {
            player.y = Math.floor((newY + player.height) / CONFIG.TILE_SIZE) * CONFIG.TILE_SIZE - player.height;
            player.vy = 0;
            player.onGround = true;
        } else {
            player.y = newY;
            player.onGround = false;
        }
    } else {
        player.y = newY;
    }

    // After walking for a bit, transition is complete
    return gameState.transitionTimer > 90;
}

/**
 * Start level transition to next level
 */
function startLevelTransition() {
    gameState.transitionTimer = 0;
    gameState.state = GameState.LEVEL_TRANSITION;
}

/**
 * Advance to the next level
 */
function advanceLevel() {
    gameState.currentLevel++;
    initLevel(gameState.currentLevel);
    gameState.state = GameState.PLAYING;
}

// ============================================
// SCORE CONSTANTS
// ============================================
const SCORE = {
    ENEMY_STOMP: 100,
    LEVEL_COMPLETE: 1000
};

// ============================================
// EXPORTS
// ============================================
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
    window.TILES_X = TILES_X;
    window.TILES_Y = TILES_Y;
    window.GameState = GameState;
    window.UNPAUSE_DELAY = UNPAUSE_DELAY;
    window.STATE_CHANGE_DELAY = STATE_CHANGE_DELAY;
    window.STARTING_LIVES = STARTING_LIVES;
    window.SCORE = SCORE;
    window.gameState = gameState;
    window.player = player;
    window.enemies = enemies;
    window.getEnemies = () => enemies;
    window.getTileAt = getTileAt;
    window.isSolidTile = isSolidTile;
    window.checkCollision = checkCollision;
    window.isOnGround = isOnGround;
    window.initLevel = initLevel;
    window.initGame = initGame;
    window.updateEnemies = updateEnemies;
    window.checkEnemyCollisions = checkEnemyCollisions;
    window.updatePlayer = updatePlayer;
    window.updateTransition = updateTransition;
    window.startLevelTransition = startLevelTransition;
    window.advanceLevel = advanceLevel;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONFIG,
        TILES_X,
        TILES_Y,
        GameState,
        UNPAUSE_DELAY,
        STATE_CHANGE_DELAY,
        STARTING_LIVES,
        SCORE,
        gameState,
        player,
        getEnemies: () => enemies,
        getTileAt,
        isSolidTile,
        checkCollision,
        isOnGround,
        initLevel,
        initGame,
        updateEnemies,
        checkEnemyCollisions,
        updatePlayer,
        updateTransition,
        startLevelTransition,
        advanceLevel
    };
}
