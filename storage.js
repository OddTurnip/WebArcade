/**
 * WebArcade Storage Module
 * Shared localStorage wrapper for all games
 *
 * Usage:
 *   <script src="storage.js"></script>
 *   const data = GameStorage.load('bounce');
 *   data.highScore = 1000;
 *   GameStorage.save('bounce', data);
 */

const GameStorage = {
    /**
     * Get the localStorage key for a game
     * @param {string} gameId - Game identifier (e.g., 'bounce', 'brickbounce')
     * @returns {string} Full localStorage key
     */
    getKey(gameId) {
        return `${gameId}_data`;
    },

    /**
     * Load game data from localStorage
     * @param {string} gameId - Game identifier
     * @param {object} defaults - Default values if no saved data exists
     * @returns {object} Game data (saved or default)
     */
    load(gameId, defaults = {}) {
        const key = this.getKey(gameId);
        try {
            const data = localStorage.getItem(key);
            if (data) {
                // Merge saved data with defaults (in case new fields were added)
                return { ...defaults, ...JSON.parse(data) };
            }
        } catch (e) {
            console.warn(`[GameStorage] Failed to load data for ${gameId}:`, e.message);
        }
        return { ...defaults };
    },

    /**
     * Save game data to localStorage
     * @param {string} gameId - Game identifier
     * @param {object} data - Data to save
     * @returns {boolean} True if save succeeded
     */
    save(gameId, data) {
        const key = this.getKey(gameId);
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.warn(`[GameStorage] Failed to save data for ${gameId}:`, e.message);
            return false;
        }
    },

    /**
     * Clear game data from localStorage
     * @param {string} gameId - Game identifier
     * @returns {boolean} True if clear succeeded
     */
    clear(gameId) {
        const key = this.getKey(gameId);
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.warn(`[GameStorage] Failed to clear data for ${gameId}:`, e.message);
            return false;
        }
    },

    /**
     * Check if game has saved data
     * @param {string} gameId - Game identifier
     * @returns {boolean} True if saved data exists
     */
    exists(gameId) {
        const key = this.getKey(gameId);
        try {
            return localStorage.getItem(key) !== null;
        } catch (e) {
            console.warn(`[GameStorage] Failed to check existence for ${gameId}:`, e.message);
            return false;
        }
    },

    /**
     * Get default data structure for common game types
     * Games can extend these with their own fields
     */
    defaults: {
        /**
         * Basic defaults for arcade-style games (score-based)
         */
        arcade() {
            return {
                highScore: 0,
                gamesPlayed: 0,
                musicEnabled: true,
                sfxEnabled: true
            };
        },

        /**
         * Defaults for level-based games
         */
        levelBased() {
            return {
                highScore: 0,
                gamesPlayed: 0,
                levelsCompleted: 0,
                highestLevel: 1,
                musicEnabled: true,
                sfxEnabled: true
            };
        },

        /**
         * Defaults for puzzle games (tetris-style)
         */
        puzzle() {
            return {
                highScore: 0,
                gamesPlayed: 0,
                linesCleared: 0,
                highestLevel: 1,
                musicEnabled: true,
                sfxEnabled: true
            };
        }
    }
};

console.log('GameStorage loaded');
