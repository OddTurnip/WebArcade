# WebArcade Development Guide

## Project Structure

```
WebArcade/
├── README.md            # Project overview
├── LICENSE.md           # CC BY-NC-SA 4.0 license
├── index.html           # Main game selection page
├── controller.js        # Shared input handling (keyboard + gamepad)
├── audio.js             # Shared audio system (SFX + music)
├── storage.js           # Shared localStorage wrapper
├── debug.html           # Controller/input testing utility
├── bounce.html          # Game: Bounce
├── brickbounce.html     # Game: Brick Bounce
├── brickbounce2.html    # Game: Brick Bounce 2
├── brickbounce2-levels.js  # Level data for Brick Bounce 2
├── brickspinner.html    # Game: Brick Spinner (Tetris-style)
├── serpentine.html      # Game: Serpentine (Snake)
├── galacticdefense.html # Game: Galactic Defense (Space Invaders)
├── galactic4x.html      # Game: Galactic 4X (turn-based space strategy)
├── pool.html            # Game: Pool (8-ball billiards)
├── grid.js              # Hex and triangle grid geometry library
├── sapper.js            # Shared game logic for square-grid Sapper games
├── sappershapes.js      # Game logic for hex/triangle Sapper games
├── test_sapper.js       # Unit tests for sapper.js (run: node test_sapper.js)
├── sapperluck.html      # Game: Sapper's Luck (classic mine puzzle, mouse-only)
├── sapperslogic.html    # Game: Sapper's Logic (no-guess mine puzzle, mouse-only)
├── sappershapes.html    # Game: Sapper's Shapes (hex/triangle grids, mouse-only)
└── screenshots/         # Game screenshots for index page
```

## Shared Modules

### controller.js - Input System
```html
<script src="controller.js"></script>
```

Call `GameController.poll()` once per frame at the start of your update loop.

**Mapped Input (recommended):**
- `GameController.direction.{up,down,left,right}` - boolean, currently held
- `GameController.buttons.{a,b,x,y,lb,rb,lt,rt,back,start}` - boolean, currently held
- `GameController.justPressed('a')` - true only on first frame of press
- `GameController.anyButtonJustPressed()` - any action button just pressed

**Default Keyboard Mappings:**
| Action | Keyboard Keys | Controller |
|--------|--------------|------------|
| Directions | Arrows, WASD | D-Pad, Left Stick |
| A (confirm/action) | Space, Enter, Z | A button |
| B (cancel/alt) | Shift, X | B button |
| LB/RB (rotate) | Q/E, [/] | Shoulder buttons |
| Start (pause) | Escape, P | Start button |

**Raw Keyboard Access (for custom mappings):**
```javascript
// Check raw key state without button mapping
GameController.keyboard.isPressed('Space')
GameController.keyboard.justPressed('KeyZ')
GameController.keyboard.anyPressed('Space', 'Enter')

// Customize mappings for a specific game
GameController.setKeyMapping('a', ['Space', 'KeyZ']);  // Replace mapping
GameController.addKeyMapping('a', 'Enter');            // Add to existing
```

### audio.js - Audio System
```html
<script src="audio.js"></script>
```

**Sound Effects:**
```javascript
AudioSystem.sfx.select()      // Menu selection blip
AudioSystem.sfx.paddleHit()   // Ball hits paddle
AudioSystem.sfx.wallHit()     // Ball hits wall
AudioSystem.sfx.brickHit(row) // Brick destroyed (row 0-9 for pitch)
AudioSystem.sfx.death()       // Player dies
AudioSystem.sfx.gameOver()    // Game over fanfare
AudioSystem.sfx.levelComplete() // Level complete fanfare
AudioSystem.sfx.powerUp()     // Power-up collected
AudioSystem.sfx.explosion()   // Explosion
AudioSystem.sfx.shoot()       // Laser/projectile
AudioSystem.sfx.hit()         // Enemy hit
AudioSystem.sfx.eat()         // Food eaten (snake)
AudioSystem.sfx.rotate()      // Piece rotated (tetris)
AudioSystem.sfx.drop()        // Hard drop (tetris)
AudioSystem.sfx.lock()        // Piece locked (tetris)
AudioSystem.sfx.lineClear(n)  // Lines cleared (1-4, 4 = special)
```

**Music:**
```javascript
AudioSystem.music.start('bounce')    // Start music track
AudioSystem.music.stop()             // Stop music
// Available tracks: 'breakout', 'bounce', 'tetris', 'invaders', 'snake'
```

**Audio Unlock:** Call `AudioSystem.unlock()` on first user interaction.

### storage.js - Persistence
```html
<script src="storage.js"></script>
```

```javascript
const GAME_ID = 'mygame';
let data = GameStorage.load(GAME_ID, GameStorage.defaults.arcade());
data.highScore = 1000;
GameStorage.save(GAME_ID, data);

// Default templates:
GameStorage.defaults.arcade()     // highScore, gamesPlayed, musicEnabled, sfxEnabled
GameStorage.defaults.levelBased() // + levelsCompleted, highestLevel
GameStorage.defaults.puzzle()     // + linesCleared
```

### sapper.js - Mine Puzzle Engine
```html
<script src="sapper.js"></script>
```

```javascript
const game = new SapperGame({
    width: 9,
    height: 9,
    mines: 10,
    noGuess: false  // true for guaranteed-solvable puzzles
});

game.initGrid();
game.handleFirstClick(x, y);  // Places mines, returns { success, revealed }
game.revealCell(x, y);        // Returns { hit, revealed, won, lost }
game.toggleFlag(x, y);        // Returns { flagged, flagCount }
game.chordReveal(x, y);       // Auto-reveal if flags match number
```

Used by sapperluck.html (noGuess: false) and sapperslogic.html (noGuess: true).

### grid.js - Non-Square Grid Geometry
```html
<script src="grid.js"></script>
```

```javascript
// Hex grid (pointy-top, odd-row offset)
const hex = new HexGrid(width, height, cellSize);
hex.getNeighbors(x, y);           // Returns [{x, y}, ...] (6 neighbors)
hex.gridToPixel(x, y, offsetX, offsetY);  // Returns {px, py}
hex.pixelToGrid(px, py, offsetX, offsetY); // Returns {x, y} or null
hex.drawCell(ctx, x, y, fill, stroke, offsetX, offsetY);
hex.distance(x1, y1, x2, y2);     // Hex distance (cube coords)

// Triangle grid (alternating up/down triangles)
const tri = new TriangleGrid(width, height, cellSize);
tri.getNeighbors(x, y);           // Returns [{x, y}, ...] (3 edge neighbors)
tri.getExtendedNeighbors(x, y);   // Returns up to 12 neighbors (includes corners)
tri.pointsUp(x, y);               // Returns true if triangle points up
// Same gridToPixel, pixelToGrid, drawCell interface as HexGrid
```

Used by sappershapes.html with sappershapes.js.

## JavaScript Architecture

**Principle:** Keep shared libraries pure and DOM-free. All DOM-specific code stays in the HTML files.

**Libraries (*.js files):**
- Pure game logic only - no DOM, no canvas, no event listeners
- Export clean APIs that accept/return plain data
- Designed to be unit-testable (even if tests don't exist yet)
- Include both browser (`window.X`) and Node.js (`module.exports`) exports

**HTML files:**
- Include shared libraries via `<script src="...">`
- Handle all DOM manipulation, canvas rendering, event listeners
- Bridge between user interactions and library APIs
- Manage audio, storage, and UI state

**Example pattern (sapper.js + sapperluck.html):**
```javascript
// In sapper.js - pure logic
class SapperGame {
    revealCell(x, y) {
        return { hit: false, revealed: [{x: 0, y: 0}], won: false };
    }
}

// In sapperluck.html - DOM integration
canvas.addEventListener('click', (e) => {
    const result = game.revealCell(cellX, cellY);
    result.revealed.forEach(cell => drawCell(cell.x, cell.y));
});
```

## Game Patterns

### Canvas Setup
- Default: 640x480 pixels
- Border: 4px solid #4a4a6a
- Use monospace font for retro feel

### State Machine
```
Basic:      TITLE → PLAYING ↔ PAUSED → GAME_OVER → TITLE
Level-based: MENU → LEVEL_SELECT → PLAYING ↔ PAUSED → LEVEL_COMPLETE → VICTORY/GAME_OVER
```

- **TITLE/MENU:** Wait for input to start
- **PLAYING:** Main game loop
- **PAUSED:** 250ms delay before unpause allowed (prevents flicker)
- **GAME_OVER:** Show score, "NEW HIGH SCORE!" if applicable

### View System (Galactic 4X)

For games with multiple UI panels (like Galactic 4X), use a separate view state:
```javascript
const ViewState = {
    OVERVIEW: 'overview',
    PLANETS: 'planets',
    COLONY: 'colony',
    HISTORY: 'history'
};
let currentView = ViewState.OVERVIEW;
```

**Key principles:**
- Views always update BOTH panels (left and right). Never leave one stale.
- Each view renders its own panel titles dynamically (not in static HTML)
- View buttons highlight the active view and grey out unavailable ones
- Colony view requires a selected star; other views (except Planets) clear the selection

**Panel structure:**
```html
<div id="planetPanel" class="side-panel">
    <div id="planetContent" class="panel-content"></div>
</div>
<!-- Content is fully replaced by updatePlanetPanel() based on currentView -->
```

### Audio Toggle UI
```html
<div id="audioControls">
    <label><input type="checkbox" id="musicToggle" checked> Music</label>
    <label><input type="checkbox" id="sfxToggle" checked> Sound Effects</label>
</div>
```

### Colors
- Background: #000000 (game), #1a1a2e (page), #2a2a4a (panels)
- Primary: #4ecdc4 (cyan)
- Highlight: #ffe66d (yellow)
- Danger: #ff6b6b (red)

### UI Text
- Avoid text wrapping in UI elements - size containers to fit content on single lines

## Debug Utility

`debug.html` is a controller testing page useful for:
- Testing gamepad connections and button mappings
- Verifying keyboard input
- Debugging input issues reported by players
- Understanding how controller.js maps different controller types

Access it at `/WebArcade/debug.html` - it's intentionally kept simple for troubleshooting.

## Adding a New Game

1. Copy an existing game HTML as template
2. Include shared modules: `controller.js`, `audio.js`, `storage.js`
3. Update GAME_ID for unique storage key
4. Implement state machine (TITLE, PLAYING, PAUSED, GAME_OVER)
5. Add to index.html game list
6. Create screenshot for index page (optional)
