/**
 * WebArcade Controller Module
 * Handles keyboard and gamepad input with support for Xbox and SNES-style controllers
 *
 * Architecture:
 * - Raw keyboard state tracked in keyboard.raw
 * - Default key→button mappings applied automatically
 * - Games can use buttons/direction (mapped) or keyboard.raw (unmapped)
 *
 * Default Keyboard Mappings:
 * - Directions: Arrow keys, WASD
 * - A button: Space, Enter, Z
 * - B button: Shift, X
 * - Start: Escape, P (pause)
 * - LB/RB: Q/E (for rotate left/right in puzzle games)
 */

const GameController = {
    // Configuration
    DEADZONE: 0.15,

    // Input state - directions (combined keyboard + gamepad)
    direction: {
        up: false,
        down: false,
        left: false,
        right: false
    },

    // Input state - buttons (combined keyboard + gamepad)
    buttons: {
        a: false, b: false, x: false, y: false,
        lb: false, rb: false, lt: false, rt: false,
        back: false, start: false
    },

    // Raw keyboard state (no button mapping)
    keyboard: {
        raw: {},        // Current frame key states (keyed by KeyboardEvent.code)
        _prev: {},      // Previous frame for justPressed detection

        /**
         * Check if a specific key is currently pressed
         * @param {string} code - KeyboardEvent.code (e.g., 'Space', 'KeyZ')
         */
        isPressed(code) {
            return !!this.raw[code];
        },

        /**
         * Check if a key was just pressed this frame
         * @param {string} code - KeyboardEvent.code
         */
        justPressed(code) {
            return this.raw[code] && !this._prev[code];
        },

        /**
         * Check if any of the given keys is pressed
         * @param {...string} codes - KeyboardEvent.code values
         */
        anyPressed(...codes) {
            return codes.some(code => this.raw[code]);
        },

        /**
         * Check if any of the given keys was just pressed
         * @param {...string} codes - KeyboardEvent.code values
         */
        anyJustPressed(...codes) {
            return codes.some(code => this.raw[code] && !this._prev[code]);
        }
    },

    // Default keyboard → button/direction mappings
    // Games can override these by modifying GameController.keyMappings
    keyMappings: {
        // Directions
        direction: {
            up: ['ArrowUp', 'KeyW'],
            down: ['ArrowDown', 'KeyS'],
            left: ['ArrowLeft', 'KeyA'],
            right: ['ArrowRight', 'KeyD']
        },
        // Buttons
        buttons: {
            a: ['Space', 'Enter', 'KeyZ'],
            b: ['ShiftLeft', 'ShiftRight', 'KeyX'],
            x: ['KeyC'],
            y: ['KeyV'],
            lb: ['KeyQ', 'BracketLeft'],
            rb: ['KeyE', 'BracketRight'],
            lt: ['Digit1'],
            rt: ['Digit2'],
            back: ['Backspace', 'Tab'],
            start: ['Escape', 'KeyP']
        }
    },

    // Track which input sources are active
    sources: {
        keyboard: false,
        dpad: false,
        leftStick: false,
        rightStick: false
    },

    // Previous frame button state (for detecting new presses)
    _prevButtons: {
        a: false, b: false, x: false, y: false,
        lb: false, rb: false, lt: false, rt: false,
        back: false, start: false
    },
    _prevDirection: { up: false, down: false, left: false, right: false },

    // Track connected gamepads
    _connectedGamepads: {},

    // Initialization flag
    _initialized: false,

    /**
     * Initialize the controller system
     * Call this once at startup (auto-called on script load)
     */
    init() {
        if (this._initialized) return;

        // Keyboard events - track raw state
        window.addEventListener('keydown', (e) => {
            this.keyboard.raw[e.code] = true;
            this.sources.keyboard = true;

            // Prevent default for mapped keys
            const isMappedDirection = Object.values(this.keyMappings.direction)
                .some(keys => keys.includes(e.code));
            const isMappedButton = Object.values(this.keyMappings.buttons)
                .some(keys => keys.includes(e.code));

            if (isMappedDirection || isMappedButton) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keyboard.raw[e.code] = false;

            // Check if any keyboard key is still pressed
            const anyPressed = Object.values(this.keyboard.raw).some(v => v);
            if (!anyPressed) {
                this.sources.keyboard = false;
            }
        });

        // Lose focus - clear keyboard state
        window.addEventListener('blur', () => {
            for (const key in this.keyboard.raw) {
                this.keyboard.raw[key] = false;
            }
            this.sources.keyboard = false;
        });

        // Gamepad events
        window.addEventListener('gamepadconnected', (e) => {
            console.log('Gamepad connected:', e.gamepad.id);
            this._connectedGamepads[e.gamepad.index] = e.gamepad;
        });

        window.addEventListener('gamepaddisconnected', (e) => {
            console.log('Gamepad disconnected:', e.gamepad.id);
            delete this._connectedGamepads[e.gamepad.index];
        });

        this._initialized = true;
        console.log('GameController initialized');
    },

    /**
     * Poll input state - call this once per frame at the start of update
     */
    poll() {
        // Store previous state for justPressed detection
        Object.assign(this._prevButtons, this.buttons);
        Object.assign(this._prevDirection, this.direction);
        Object.assign(this.keyboard._prev, this.keyboard.raw);

        // Reset gamepad-specific states
        this.sources.dpad = false;
        this.sources.leftStick = false;
        this.sources.rightStick = false;

        // Reset buttons (will be filled from gamepad + keyboard)
        for (const key in this.buttons) {
            this.buttons[key] = false;
        }

        // Reset direction (will be filled from gamepad + keyboard)
        const gamepadDir = { up: false, down: false, left: false, right: false };

        // ==========================================
        // GAMEPAD INPUT
        // ==========================================
        const gamepads = navigator.getGamepads();

        for (const gamepad of gamepads) {
            if (!gamepad) continue;

            const isStandard = gamepad.mapping === 'standard';
            const isSNESStyle = gamepad.id.includes('0079-0011') || gamepad.id.includes('USB Gamepad');

            // Left analog stick
            if (gamepad.axes.length >= 2) {
                const lx = gamepad.axes[0];
                const ly = gamepad.axes[1];

                if (Math.abs(lx) > this.DEADZONE || Math.abs(ly) > this.DEADZONE) {
                    this.sources.leftStick = true;
                }
                if (lx < -this.DEADZONE) gamepadDir.left = true;
                if (lx > this.DEADZONE) gamepadDir.right = true;
                if (ly < -this.DEADZONE) gamepadDir.up = true;
                if (ly > this.DEADZONE) gamepadDir.down = true;
            }

            // Right analog stick
            if (gamepad.axes.length >= 4) {
                const rx = gamepad.axes[2];
                const ry = gamepad.axes[3];

                if (Math.abs(rx) > this.DEADZONE || Math.abs(ry) > this.DEADZONE) {
                    this.sources.rightStick = true;
                }
                if (rx < -this.DEADZONE) gamepadDir.left = true;
                if (rx > this.DEADZONE) gamepadDir.right = true;
                if (ry < -this.DEADZONE) gamepadDir.up = true;
                if (ry > this.DEADZONE) gamepadDir.down = true;
            }

            if (isStandard) {
                // D-Pad: buttons 12-15
                if (gamepad.buttons[12]?.pressed) { gamepadDir.up = true; this.sources.dpad = true; }
                if (gamepad.buttons[13]?.pressed) { gamepadDir.down = true; this.sources.dpad = true; }
                if (gamepad.buttons[14]?.pressed) { gamepadDir.left = true; this.sources.dpad = true; }
                if (gamepad.buttons[15]?.pressed) { gamepadDir.right = true; this.sources.dpad = true; }

                // Face buttons - check for SNES-style swap
                if (isSNESStyle) {
                    this.buttons.b = this.buttons.b || gamepad.buttons[0]?.pressed || false;
                    this.buttons.a = this.buttons.a || gamepad.buttons[1]?.pressed || false;
                    this.buttons.y = this.buttons.y || gamepad.buttons[2]?.pressed || false;
                    this.buttons.x = this.buttons.x || gamepad.buttons[3]?.pressed || false;
                } else {
                    this.buttons.a = this.buttons.a || gamepad.buttons[0]?.pressed || false;
                    this.buttons.b = this.buttons.b || gamepad.buttons[1]?.pressed || false;
                    this.buttons.x = this.buttons.x || gamepad.buttons[2]?.pressed || false;
                    this.buttons.y = this.buttons.y || gamepad.buttons[3]?.pressed || false;
                }

                // Shoulders
                this.buttons.lb = this.buttons.lb || gamepad.buttons[4]?.pressed || false;
                this.buttons.rb = this.buttons.rb || gamepad.buttons[5]?.pressed || false;
                this.buttons.lt = this.buttons.lt || gamepad.buttons[6]?.pressed || gamepad.buttons[6]?.value > 0.5 || false;
                this.buttons.rt = this.buttons.rt || gamepad.buttons[7]?.pressed || gamepad.buttons[7]?.value > 0.5 || false;

                // Menu
                this.buttons.back = this.buttons.back || gamepad.buttons[8]?.pressed || false;
                this.buttons.start = this.buttons.start || gamepad.buttons[9]?.pressed || false;
            } else {
                // Non-standard mapping fallback
                if (gamepad.buttons.length >= 4) {
                    this.buttons.a = this.buttons.a || gamepad.buttons[0]?.pressed || false;
                    this.buttons.b = this.buttons.b || gamepad.buttons[1]?.pressed || false;
                    this.buttons.x = this.buttons.x || gamepad.buttons[2]?.pressed || false;
                    this.buttons.y = this.buttons.y || gamepad.buttons[3]?.pressed || false;
                }
                if (gamepad.buttons.length >= 6) {
                    this.buttons.lb = this.buttons.lb || gamepad.buttons[4]?.pressed || false;
                    this.buttons.rb = this.buttons.rb || gamepad.buttons[5]?.pressed || false;
                }
                if (gamepad.buttons.length >= 8) {
                    this.buttons.back = this.buttons.back || gamepad.buttons[6]?.pressed || gamepad.buttons[8]?.pressed || false;
                    this.buttons.start = this.buttons.start || gamepad.buttons[7]?.pressed || gamepad.buttons[9]?.pressed || false;
                }

                // D-Pad fallbacks
                if (gamepad.buttons.length >= 16) {
                    if (gamepad.buttons[12]?.pressed) { gamepadDir.up = true; this.sources.dpad = true; }
                    if (gamepad.buttons[13]?.pressed) { gamepadDir.down = true; this.sources.dpad = true; }
                    if (gamepad.buttons[14]?.pressed) { gamepadDir.left = true; this.sources.dpad = true; }
                    if (gamepad.buttons[15]?.pressed) { gamepadDir.right = true; this.sources.dpad = true; }
                }
            }
        }

        // ==========================================
        // KEYBOARD → MAPPED INPUT
        // ==========================================
        const maps = this.keyMappings;

        // Map keyboard → direction
        for (const dir of ['up', 'down', 'left', 'right']) {
            const keys = maps.direction[dir] || [];
            if (keys.some(k => this.keyboard.raw[k])) {
                gamepadDir[dir] = true;
            }
        }

        // Map keyboard → buttons
        for (const btn in maps.buttons) {
            const keys = maps.buttons[btn] || [];
            if (keys.some(k => this.keyboard.raw[k])) {
                this.buttons[btn] = true;
            }
        }

        // ==========================================
        // FINAL DIRECTION STATE
        // ==========================================
        this.direction.up = gamepadDir.up;
        this.direction.down = gamepadDir.down;
        this.direction.left = gamepadDir.left;
        this.direction.right = gamepadDir.right;
    },

    /**
     * Check if a button was just pressed this frame (not held from last frame)
     * Works for both buttons and directions
     * @param {string} button - Button name ('a', 'b', 'up', 'down', etc.)
     */
    justPressed(button) {
        // Check direction buttons
        if (button === 'up' || button === 'down' || button === 'left' || button === 'right') {
            return this.direction[button] && !this._prevDirection[button];
        }
        // Check action buttons
        return this.buttons[button] && !this._prevButtons[button];
    },

    /**
     * Check if a button is currently held
     * @param {string} button - Button name
     */
    isPressed(button) {
        if (button === 'up' || button === 'down' || button === 'left' || button === 'right') {
            return this.direction[button];
        }
        return this.buttons[button];
    },

    /**
     * Check if ANY action button was just pressed (not directions)
     * Useful for "press any button to start" screens
     */
    anyButtonJustPressed() {
        return this.justPressed('a') || this.justPressed('b') ||
               this.justPressed('x') || this.justPressed('y') ||
               this.justPressed('lb') || this.justPressed('rb') ||
               this.justPressed('lt') || this.justPressed('rt') ||
               this.justPressed('back') || this.justPressed('start');
    },

    /**
     * Check if ANY input just happened (buttons, directions, or keyboard)
     * Even more permissive than anyButtonJustPressed
     */
    anyInputJustPressed() {
        // Check buttons
        if (this.anyButtonJustPressed()) return true;
        // Check directions
        if (this.justPressed('up') || this.justPressed('down') ||
            this.justPressed('left') || this.justPressed('right')) return true;
        // Check any keyboard key
        for (const code in this.keyboard.raw) {
            if (this.keyboard.raw[code] && !this.keyboard._prev[code]) return true;
        }
        return false;
    },

    /**
     * Check if any non-direction button is currently pressed
     */
    anyButtonPressed() {
        return this.buttons.a || this.buttons.b ||
               this.buttons.x || this.buttons.y ||
               this.buttons.lb || this.buttons.rb ||
               this.buttons.lt || this.buttons.rt ||
               this.buttons.back || this.buttons.start;
    },

    /**
     * Get list of connected gamepad names
     */
    getConnectedGamepads() {
        const gamepads = navigator.getGamepads();
        return Array.from(gamepads).filter(g => g !== null).map(g => g.id);
    },

    /**
     * Check if any gamepad is connected
     */
    hasGamepad() {
        return this.getConnectedGamepads().length > 0;
    },

    /**
     * Reset a specific key mapping (useful for custom game controls)
     * @param {string} button - Button name to remap
     * @param {string[]} keys - Array of KeyboardEvent.code values
     */
    setKeyMapping(button, keys) {
        if (button in this.keyMappings.buttons) {
            this.keyMappings.buttons[button] = keys;
        } else if (button in this.keyMappings.direction) {
            this.keyMappings.direction[button] = keys;
        }
    },

    /**
     * Add additional keys to an existing mapping
     * @param {string} button - Button name
     * @param {...string} keys - Keys to add
     */
    addKeyMapping(button, ...keys) {
        if (button in this.keyMappings.buttons) {
            this.keyMappings.buttons[button].push(...keys);
        } else if (button in this.keyMappings.direction) {
            this.keyMappings.direction[button].push(...keys);
        }
    }
};

// Auto-initialize when script loads
GameController.init();
