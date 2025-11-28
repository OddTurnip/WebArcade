/**
 * Brick Bounce 2 - Level Definitions
 *
 * Pattern Legend:
 *   . = empty space
 *   N = normal brick (1 hit)
 *   D = double-hit brick (2 hits)
 *   T = triple-hit brick (3 hits)
 *   M = metal brick (indestructible)
 *   E = explosive brick (destroys neighbors)
 *   V = moving brick (moves side to side)
 *
 * Each level is an object with:
 *   - name: Display name for the level
 *   - pattern: Array of 5 strings, each 10 characters wide
 *
 * Add new levels by appending to the LEVELS array.
 */

const LEVELS = [
    // Level 1: Simple rows - introduction
    {
        name: "Welcome",
        pattern: [
            "NNNNNNNNNN",
            "NNNNNNNNNN",
            "NNNNNNNNNN",
            "NNNNNNNNNN",
            "..........",
        ]
    },

    // Level 2: Diamond shape
    {
        name: "Diamond",
        pattern: [
            "....NN....",
            "...NNNN...",
            "..NNNNNN..",
            "...NNNN...",
            "....NN....",
        ]
    },

    // Level 3: Checkerboard pattern
    {
        name: "Checkers",
        pattern: [
            "N.N.N.N.N.",
            ".N.N.N.N.N",
            "N.N.N.N.N.",
            ".N.N.N.N.N",
            "N.N.N.N.N.",
        ]
    },

    // Level 4: Introducing double-hit bricks
    {
        name: "Tough Rows",
        pattern: [
            "DDDDDDDDDD",
            "NNNNNNNNNN",
            "NNNNNNNNNN",
            "NNNNNNNNNN",
            "DDDDDDDDDD",
        ]
    },

    // Level 5: Introducing metal (indestructible) bricks
    {
        name: "Steel Wall",
        pattern: [
            "NNNNNNNNNN",
            "NNNNNNNNNN",
            "MMMM..MMMM",
            "NNNNNNNNNN",
            "NNNNNNNNNN",
        ]
    },

    // Level 6: Introducing explosive bricks
    {
        name: "Boom!",
        pattern: [
            "NNN.EE.NNN",
            "NNNNNNNNNN",
            "NNN.EE.NNN",
            "NNNNNNNNNN",
            "NNN.EE.NNN",
        ]
    },

    // Level 7: Introducing moving bricks
    {
        name: "On The Move",
        pattern: [
            "VVVVVVVVVV",
            "..........",
            "NNNNNNNNNN",
            "..........",
            "VVVVVVVVVV",
        ]
    },

    // Level 8: Fort structure with metal walls
    {
        name: "The Fort",
        pattern: [
            "MNNNNNNNNM",
            "M........M",
            "M.DDDDDD.M",
            "M.DDDDDD.M",
            "MNNNNNNNNM",
        ]
    },

    // Level 9: Arrow shape with triple-hit bricks
    {
        name: "Arrow",
        pattern: [
            "....TT....",
            "...TTTT...",
            "..TTTTTT..",
            "...TTTT...",
            "....TT....",
        ]
    },

    // Level 10: Final challenge - combines everything
    {
        name: "Gauntlet",
        pattern: [
            "MTTTTTTTTM",
            "TDDDDDDDDT",
            "TEENNNNEET",
            "TDDDDDDDDT",
            "MTTTTTTTTM",
        ]
    },
];

console.log(`Loaded ${LEVELS.length} levels for Brick Bounce 2`);
