// ============================================
// PERSISTENCE - Save/Load
// ============================================

function initGameData() {
    gameData = GameStorage.load(GAME_ID, {
        ...GameStorage.defaults.arcade(),
        gamesWon: 0
    });
}

function saveGameData() {
    GameStorage.save(GAME_ID, gameData);
}

function buildSaveData() {
    return {
        version: SAVE_VERSION,
        year,
        player: { race: player.race, color: player.color },
        stars: stars.map(s => ({
            id: s.id, name: s.name, x: s.x, y: s.y,
            starType: s.starType, planetType: s.planetType,
            owner: s.owner, explored: s.explored,
            population: s.population, industry: s.industry, defense: s.defense,
            defenseProgress: s.defenseProgress || 0,
            sliders: {...s.sliders}, lockedSliders: [...(s.lockedSliders || [])],
            shipProgress: {...s.shipProgress}, buildingShip: s.buildingShip,
            colonizedYear: s.colonizedYear, aiPhase: s.aiPhase
        })),
        ships: ships.map(s => ({
            id: s.id, type: s.type, owner: s.owner,
            location: s.location, destination: s.destination,
            turnsToArrival: s.turnsToArrival, totalTurns: s.totalTurns
        })),
        nextShipId,
        battleHistory,
        eventHistory,
        debugMode,
        combatThisTurn,
        shipsInCombatThisTurn: [...shipsInCombatThisTurn]
    };
}

function loadSaveData(data) {
    const saveVersion = data.version || 0;

    year = data.turn || data.year; // Support old saves

    // Normalize player race to ensure it references the canonical RACES entry
    // This fixes state contamination when loading after starting a new game
    const savedRace = data.player.race;
    const raceId = savedRace?.id || savedRace; // Handle both object and string formats
    player.race = RACES.find(r => r.id === raceId) || savedRace;
    player.color = data.player.color;

    // Reset turn-specific state that isn't saved
    shipsBuiltThisTurn = {};

    stars = data.stars.map(s => {
        // Backwards compatibility: convert old number shipProgress to object
        let shipProgress = s.shipProgress;
        if (typeof shipProgress === 'number') {
            shipProgress = { scout: 0, fighter: 0, destroyer: 0, cruiser: 0, battleship: 0, colony: 0 };
            if (s.buildingShip && shipProgress[s.buildingShip] !== undefined) {
                shipProgress[s.buildingShip] = s.shipProgress;
            }
        }
        // Ensure new ship types exist in shipProgress
        const defaultProgress = { scout: 0, fighter: 0, destroyer: 0, cruiser: 0, battleship: 0, colony: 0 };
        shipProgress = { ...defaultProgress, ...(shipProgress || {}) };
        return {
            ...s,
            lockedSliders: s.lockedSliders || [],
            shipProgress: shipProgress,
            defenseProgress: s.defenseProgress || 0
        };
    });

    ships = data.ships;
    nextShipId = data.nextShipId;
    battleHistory = data.battleHistory || [];
    eventHistory = data.eventHistory || [];
    debugMode = data.debugMode || false;
    document.getElementById('debugToggle').checked = debugMode;

    // Version 1+ fields: combat state
    if (saveVersion >= 1) {
        combatThisTurn = data.combatThisTurn || false;
        shipsInCombatThisTurn = new Set(data.shipsInCombatThisTurn || []);
    } else {
        combatThisTurn = false;
        shipsInCombatThisTurn = new Set();
    }
}

function saveGameState() {
    if (state !== GameState.PLAYING) return;
    const saveData = buildSaveData();
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    } catch (e) {
        console.warn('Failed to save game:', e);
    }
}

function loadGameState() {
    try {
        const saved = localStorage.getItem(SAVE_KEY);
        if (!saved) return false;
        const data = JSON.parse(saved);
        loadSaveData(data);
        return true;
    } catch (e) {
        console.warn('Failed to load game:', e);
        return false;
    }
}

function clearSaveGame() {
    localStorage.removeItem(SAVE_KEY);
}

// File-based save/load
function saveToFile() {
    if (state !== GameState.PLAYING) {
        alert('No game in progress to save.');
        return;
    }
    const saveData = buildSaveData();
    const json = JSON.stringify(saveData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const raceName = player.race?.shortName || 'Unknown';
    a.download = `galactic4x_${raceName}_year${year}.g4x`;
    a.click();
    URL.revokeObjectURL(url);
    AudioSystem.sfx.select();
}

function loadFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            loadSaveData(data);

            // Start the game
            state = GameState.PLAYING;
            actionPanel.classList.remove('hidden');
            planetPanel.classList.remove('hidden');
            fleetPanel.classList.remove('hidden');
            currentView = ViewState.OVERVIEW;
            selectedStar = null;
            selectedShips = [];
            destinationStar = null;
            updateTurnInfo();
            updatePanels();
            saveGameState();
            AudioSystem.sfx.levelComplete();
            AudioSystem.music.start('4x');
        } catch (err) {
            alert('Failed to load save file: ' + err.message);
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
}

// Expose to window for HTML onclick handlers
window.saveToFile = saveToFile;
window.loadFromFile = loadFromFile;
