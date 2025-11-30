// ============================================
// GAME CONFIGURATION
// ============================================

const CONFIG = {
    WIDTH: 640,
    HEIGHT: 550,
    STAR_COUNT: 24,
    MIN_STAR_DISTANCE: 60,
    PARSEC_SCALE: 10,
    COLORS: {
        background: '#0a0a1a',
        grid: '#1a1a2e',
        starYellow: '#ffe66d',
        starRed: '#ff6b6b',
        starBlue: '#4a9fff',
        starWhite: '#ffffff',
        text: '#ffffff',
        textHighlight: '#ffe66d',
        playerHighlight: '#4ecdc4',
        unexplored: '#666666',
        destination: '#ffe66d'
    }
};

const PLANET_TYPES = {
    terran: { name: 'Terran', maxPop: 100, industryMod: 1.0, ecoMod: 1.0, color: '#4ecdc4' },
    ocean: { name: 'Ocean', maxPop: 90, industryMod: 0.9, ecoMod: 1.1, color: '#4a9fff' },
    jungle: { name: 'Jungle', maxPop: 80, industryMod: 0.85, ecoMod: 1.2, color: '#2e8b57' },
    arid: { name: 'Arid', maxPop: 60, industryMod: 0.8, ecoMod: 0.7, color: '#daa520' },
    desert: { name: 'Desert', maxPop: 50, industryMod: 0.7, ecoMod: 0.6, color: '#c2b280' },
    tundra: { name: 'Tundra', maxPop: 40, industryMod: 0.6, ecoMod: 0.5, color: '#b0e0e6' },
    barren: { name: 'Barren', maxPop: 30, industryMod: 0.5, ecoMod: 0.3, color: '#808080' },
    inferno: { name: 'Inferno', maxPop: 20, industryMod: 0.4, ecoMod: 0.2, color: '#ff4500' },
    toxic: { name: 'Toxic', maxPop: 15, industryMod: 0.3, ecoMod: 0.1, color: '#7cfc00' }
};

const SHIP_TYPES = {
    scout: { name: 'Scout', cost: 25, speed: 3, attack: 1, health: 2, icon: 'S', military: false },
    fighter: { name: 'Fighter', cost: 50, speed: 3, attack: 2, health: 4, icon: 'F', military: true },
    destroyer: { name: 'Destroyer', cost: 100, speed: 2, attack: 6, health: 12, icon: 'D', military: true },
    cruiser: { name: 'Cruiser', cost: 250, speed: 2, attack: 10, health: 30, icon: 'R', military: true },
    battleship: { name: 'Battleship', cost: 500, speed: 1, attack: 30, health: 100, icon: 'B', military: true },
    colony: { name: 'Colony Ship', cost: 200, speed: 1, attack: 0, health: 1, icon: 'C', colonize: true, military: false }
};

// Get ship types in display order: Colony first, then descending by cost
function getShipTypeOrder() {
    const types = Object.keys(SHIP_TYPES);
    return types.sort((a, b) => {
        if (a === 'colony') return -1;
        if (b === 'colony') return 1;
        return SHIP_TYPES[b].cost - SHIP_TYPES[a].cost;
    });
}

const RACES = [
    { id: 'terran', name: 'Terran Federation', shortName: 'Terran', color: '#4ecdc4', desc: 'Adaptable and expansionist humans' },
    { id: 'crystalline', name: 'Crystalline Collective', shortName: 'Crystal', color: '#9932cc', desc: 'Silicon-based mineral lifeforms' },
    { id: 'aquan', name: 'Aquan Dominion', shortName: 'Aquan', color: '#4a9fff', desc: 'Ocean-dwelling telepaths' },
    { id: 'hivemind', name: 'Hive Swarm', shortName: 'Swarm', color: '#ffa500', desc: 'Unified insectoid consciousness' },
    { id: 'aviari', name: 'Aviari Consortium', shortName: 'Aviari', color: '#ffe66d', desc: 'Elegant avian traders' },
    { id: 'saurian', name: 'Saurian Empire', shortName: 'Saurian', color: '#ff6b6b', desc: 'Ancient reptilian warriors' }
];

const STAR_NAMES = [
    'Sol', 'Alpha', 'Proxima', 'Vega', 'Sirius', 'Rigel', 'Deneb', 'Altair',
    'Polaris', 'Arcturus', 'Capella', 'Betelgeuse', 'Aldebaran', 'Antares',
    'Spica', 'Procyon', 'Canopus', 'Achernar', 'Hadar', 'Acrux', 'Mimosa',
    'Regulus', 'Adhara', 'Shaula', 'Castor', 'Bellatrix', 'Elnath', 'Miaplacidus',
    'Alnilam', 'Alnitak', 'Alioth', 'Dubhe', 'Mirfak', 'Wezen', 'Kaus', 'Sargas'
];

// Game and View States
const GameState = {
    TITLE: 'title',
    RACE_SELECT: 'race_select',
    PLAYING: 'playing',
    END_TURN: 'end_turn'
};

const ViewState = {
    OVERVIEW: 'overview',
    PLANETS: 'planets',
    COLONY: 'colony',
    HISTORY: 'history'
};

// Storage constants
const GAME_ID = 'galactic4x';
const SAVE_KEY = 'galactic4x_save';
const SAVE_VERSION = 1;
