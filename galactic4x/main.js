// ============================================
// MAIN - Game Loop & Initialization
// ============================================

function initGame() {
    year = 1;
    selectedStar = null;
    selectedShips = [];
    destinationStar = null;
    battleHistory = [];
    eventHistory = [];
    shipsBuiltThisTurn = {};
    currentView = ViewState.OVERVIEW;
    generateGalaxy();
    actionPanel.classList.remove('hidden');
    planetPanel.classList.remove('hidden');
    fleetPanel.classList.remove('hidden');
    updateTurnInfo();
    updatePanels();
}

// Panel update dispatcher - routes to appropriate view renderers
function updatePlanetPanel() {
    let html = '';

    switch (currentView) {
        case ViewState.HISTORY:
            html = renderHistoryLeftPanel();
            break;
        case ViewState.PLANETS:
            html = renderPlanetsLeftPanel();
            break;
        case ViewState.OVERVIEW:
            html = renderOverviewLeftPanel();
            break;
        case ViewState.COLONY:
            html = renderColonyLeftPanel();
            break;
    }

    planetContent.innerHTML = html;
}

function updateFleetPanel() {
    let html = '';

    switch (currentView) {
        case ViewState.HISTORY:
            html = renderHistoryRightPanel();
            fleetContent.innerHTML = html;
            fleetActions.innerHTML = '';
            break;
        case ViewState.PLANETS:
            html = renderPlanetsRightPanel();
            fleetContent.innerHTML = html;
            fleetActions.innerHTML = '';
            break;
        case ViewState.OVERVIEW:
            html = renderOverviewRightPanel();
            fleetContent.innerHTML = html;
            fleetActions.innerHTML = '';
            break;
        case ViewState.COLONY:
            fleetContent.innerHTML = renderColonyRightPanel();
            fleetActions.innerHTML = renderColonyFleetActions();
            break;
    }
}

// ============================================
// AUDIO CONTROLS
// ============================================
function initAudioControls() {
    document.getElementById('musicToggle').addEventListener('change', (e) => {
        AudioSystem.musicEnabled = e.target.checked;
        if (!e.target.checked) {
            AudioSystem.music.stop();
        }
        gameData.musicEnabled = e.target.checked;
        saveGameData();
    });

    document.getElementById('sfxToggle').addEventListener('change', (e) => {
        AudioSystem.sfxEnabled = e.target.checked;
        gameData.sfxEnabled = e.target.checked;
        saveGameData();
    });

    document.getElementById('debugToggle').addEventListener('change', (e) => {
        debugMode = e.target.checked;
        saveGameState();
    });

    // Apply saved settings
    AudioSystem.musicEnabled = gameData.musicEnabled;
    AudioSystem.sfxEnabled = gameData.sfxEnabled;
    document.getElementById('musicToggle').checked = gameData.musicEnabled;
    document.getElementById('sfxToggle').checked = gameData.sfxEnabled;
}

// ============================================
// GAME LOOP
// ============================================
let lastFrameTime = 0;

function gameLoop(currentTime) {
    const deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;

    GameController.poll();
    draw();

    requestAnimationFrame(gameLoop);
}

// ============================================
// START
// ============================================
function start() {
    initDOMReferences();
    initGameData();
    initInputHandlers();
    initAudioControls();

    hasSaveGame = localStorage.getItem(SAVE_KEY) !== null;

    console.log('Galactic 4X initialized');
    requestAnimationFrame(gameLoop);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
} else {
    start();
}
