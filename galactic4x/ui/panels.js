// ============================================
// UI PANELS - Shared Helpers
// ============================================

// Format a list of ships by type into a string
function formatShipList(shipsArray) {
    const counts = {};
    for (const ship of shipsArray) {
        counts[ship.type] = (counts[ship.type] || 0) + 1;
    }
    const parts = [];
    for (const type of getShipTypeOrder()) {
        if (counts[type]) {
            parts.push(`${counts[type]} ${SHIP_TYPES[type].name}${counts[type] > 1 ? 's' : ''}`);
        }
    }
    return parts.length > 0 ? parts.join(', ') : 'None';
}

// Format ship counts object into a string
function formatShipCounts(counts) {
    const parts = [];
    for (const type of getShipTypeOrder()) {
        if (counts[type]) {
            parts.push(`${counts[type]} ${SHIP_TYPES[type].name}${counts[type] > 1 ? 's' : ''}`);
        }
    }
    return parts.length > 0 ? parts.join(', ') : 'None';
}

// Show modal dialog
function showModal(title, body) {
    modalTitle.textContent = title;
    // Escape HTML and highlight [DESTROYED] in red
    const escaped = body
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\[DESTROYED\]/g, '<span style="color:#ff6b6b">[DESTROYED]</span>');
    modalBody.innerHTML = escaped;
    // Use wider modal in debug mode for longer combat log lines
    const modalContent = gameModal.querySelector('.modal-content');
    if (debugMode) {
        modalContent.classList.add('wide');
    } else {
        modalContent.classList.remove('wide');
    }
    gameModal.classList.remove('hidden');
}

function closeModal() {
    gameModal.classList.add('hidden');
}

// Update view buttons
function updateViewButtons() {
    const views = [
        { id: ViewState.OVERVIEW, label: 'Overview', always: true },
        { id: ViewState.PLANETS, label: 'Planets', always: true },
        { id: ViewState.COLONY, label: 'Colony', always: false },
        { id: ViewState.HISTORY, label: 'History', always: true }
    ];

    let html = '';
    for (const view of views) {
        const isActive = currentView === view.id;
        const isDisabled = view.id === ViewState.COLONY && !selectedStar;
        const activeStyle = isActive ? 'background:#4ecdc4;color:#1a1a2e;' : '';
        const disabledStyle = isDisabled ? 'opacity:0.4;cursor:not-allowed;' : '';
        const onclick = isDisabled ? '' : `onclick="window.showView('${view.id}')"`;
        html += `<button class="btn" style="${activeStyle}${disabledStyle}" ${onclick}>${view.label}</button>`;
    }
    viewButtons.innerHTML = html;
}

// Update turn info bar
function updateTurnInfo() {
    const colonies = getPlayerColonies();
    const totalShips = ships.filter(s => s.owner === 'player').length;

    // Calculate total production and max production for player's colonies
    let totalProduction = 0;
    let maxColonyProduction = 0;

    for (const colony of colonies) {
        const planetInfo = PLANET_TYPES[colony.planetType];
        // Current production = population * (industry/100) * industryMod
        const colonyProd = colony.population * (colony.industry / 100) * planetInfo.industryMod;
        totalProduction += colonyProd;

        // Max production for this colony if fully developed
        maxColonyProduction += planetInfo.maxPop * 1.0 * planetInfo.industryMod;
    }

    // Calculate max possible production for entire map
    let maxMapProduction = 0;
    for (const star of stars) {
        const planetInfo = PLANET_TYPES[star.planetType];
        if (planetInfo.maxPop > 0) {
            maxMapProduction += planetInfo.maxPop * 1.0 * planetInfo.industryMod;
        }
    }

    // Dev = how developed your colonies are (your prod / your max prod)
    // Conquest = how much of map you control (your prod / map max prod)
    const devPercent = maxColonyProduction > 0 ? Math.round((totalProduction / maxColonyProduction) * 100) : 0;
    const conquestPercent = maxMapProduction > 0 ? Math.round((totalProduction / maxMapProduction) * 100) : 0;

    turnInfo.textContent = `Year ${year} | Colonies: ${colonies.length} | Ships: ${totalShips} | Prod: ${Math.floor(totalProduction)}/year | Dev: ${devPercent}% | Conquest: ${conquestPercent}%`;

    // Show/hide global explore button
    const allScouts = ships.filter(s => s.owner === 'player' && s.type === 'scout' && s.destination === null);
    const unexploredStars = stars.filter(s => !s.explored);
    if (allScouts.length > 0 && unexploredStars.length > 0) {
        globalExploreBtn.style.display = 'inline-block';
        globalExploreBtn.textContent = `Explore (${allScouts.length})`;
    } else {
        globalExploreBtn.style.display = 'none';
    }
}

// Main panel update dispatcher
function updatePanels() {
    updateViewButtons();
    updatePlanetPanel();
    updateFleetPanel();
}

// Expose to window
window.closeModal = closeModal;
