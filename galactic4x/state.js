// ============================================
// GAME STATE
// ============================================

// Core game state
let state = GameState.TITLE;
let year = 1;

let player = {
    race: null,
    color: '#4ecdc4'
};

let stars = [];
let ships = [];
let nextShipId = 1;

// UI state
let selectedStar = null;
let selectedShips = [];
let destinationStar = null;
let hoveredStar = null;
let raceSelectIndex = 0;
let hasSaveGame = false;
let currentView = ViewState.OVERVIEW;

// Sort preferences
let overviewSort = 'name'; // 'name', 'age', 'dev', 'defense'
let planetsSort = 'type'; // 'type', 'fleet'

// Combat state
let combatThisTurn = false;
let shipsInCombatThisTurn = new Set();

// History
let battleHistory = [];
let eventHistory = [];
let shipsBuiltThisTurn = {};

// Debug
let debugMode = false;

// Persistent game data (high scores, settings)
let gameData = null;

// ============================================
// DOM REFERENCES
// ============================================
let planetPanel, planetContent, fleetPanel, fleetContent, fleetActions;
let actionPanel, viewButtons, turnInfo, globalExploreBtn;
let gameModal, modalTitle, modalBody;
let canvas, ctx;

function initDOMReferences() {
    planetPanel = document.getElementById('planetPanel');
    planetContent = document.getElementById('planetContent');
    fleetPanel = document.getElementById('fleetPanel');
    fleetContent = document.getElementById('fleetContent');
    fleetActions = document.getElementById('fleetActions');
    actionPanel = document.getElementById('actionPanel');
    viewButtons = document.getElementById('viewButtons');
    turnInfo = document.getElementById('turnInfo');
    globalExploreBtn = document.getElementById('globalExploreBtn');
    gameModal = document.getElementById('gameModal');
    modalTitle = document.getElementById('modalTitle');
    modalBody = document.getElementById('modalBody');
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getShipsAtStar(starId) {
    return ships.filter(s => s.location === starId && s.destination === null);
}

function getPlayerColonies() {
    return stars.filter(s => s.owner === 'player');
}

function getFleetStrength(starId) {
    const shipsAtStar = ships.filter(s => s.location === starId && !s.destination);
    return shipsAtStar.reduce((sum, s) => sum + SHIP_TYPES[s.type].cost, 0);
}

function getFleetStrengthByOwner(starId, owner) {
    const shipsAtStar = ships.filter(s => s.location === starId && !s.destination && s.owner === owner);
    return shipsAtStar.reduce((sum, s) => sum + SHIP_TYPES[s.type].cost, 0);
}

function getColonyDevPercent(colony) {
    const planetInfo = PLANET_TYPES[colony.planetType];
    const prod = colony.population * (colony.industry / 100) * planetInfo.industryMod;
    const maxProd = planetInfo.maxPop * 1.0 * planetInfo.industryMod;
    return maxProd > 0 ? Math.round((prod / maxProd) * 100) : 0;
}
