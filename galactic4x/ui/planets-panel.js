// ============================================
// PLANETS PANEL - Uncolonized & All Colonies
// ============================================

function renderPlanetsLeftPanel() {
    let html = '<div class="panel-title">Uncolonized Worlds</div>';

    // Sort buttons
    html += '<div style="margin-bottom:6px;display:flex;gap:4px;">';
    const sortOptions = [
        { key: 'type', label: 'Type' },
        { key: 'fleet', label: 'Fleet' }
    ];
    for (const opt of sortOptions) {
        const active = planetsSort === opt.key ? 'background:#4ecdc4;color:#1a1a2e;' : '';
        html += `<button class="btn btn-sm" style="padding:2px 6px;font-size:9px;${active}" onclick="setPlanetsSort('${opt.key}')">${opt.label}</button>`;
    }
    html += '</div>';

    // Get explored, uncolonized, colonizable worlds
    let uncolonized = stars.filter(s => s.explored && !s.owner && PLANET_TYPES[s.planetType].maxPop > 0);

    // Sort
    if (planetsSort === 'type') {
        // Highest maxPop first
        uncolonized.sort((a, b) => PLANET_TYPES[b.planetType].maxPop - PLANET_TYPES[a.planetType].maxPop);
    } else if (planetsSort === 'fleet') {
        // Unguarded first (enemy fleet strength = 0), then by weakest fleet
        uncolonized.sort((a, b) => {
            const aFleet = getFleetStrength(a.id) - getFleetStrengthByOwner(a.id, 'player');
            const bFleet = getFleetStrength(b.id) - getFleetStrengthByOwner(b.id, 'player');
            return aFleet - bFleet;
        });
    }

    html += '<div style="max-height:500px;overflow-y:auto;">';
    if (uncolonized.length === 0) {
        html += '<div class="empty-state">No uncolonized worlds discovered</div>';
    } else {
        for (const star of uncolonized) {
            const planetInfo = PLANET_TYPES[star.planetType];
            const enemyShips = ships.filter(s => s.location === star.id && !s.destination && s.owner !== 'player');

            html += `<div style="padding:4px 6px;margin:2px 0;background:#252540;border-radius:4px;cursor:pointer;" onclick="window.selectStarById(${star.id})">`;
            html += `<div style="display:flex;justify-content:space-between;align-items:center;">`;
            html += `<span style="color:#fff;font-weight:bold;font-size:11px;">${star.name}</span>`;
            html += `<span style="color:${planetInfo.color};font-size:10px;">${planetInfo.name} (${planetInfo.maxPop})</span>`;
            html += `</div>`;

            if (enemyShips.length > 0) {
                // Group enemy ships by owner
                const enemyByOwner = {};
                for (const ship of enemyShips) {
                    if (!enemyByOwner[ship.owner]) enemyByOwner[ship.owner] = [];
                    enemyByOwner[ship.owner].push(ship);
                }
                for (const owner of Object.keys(enemyByOwner)) {
                    const ownerRace = RACES.find(r => r.id === owner);
                    const ownerName = ownerRace ? ownerRace.shortName : 'Enemy';
                    const ownerColor = ownerRace ? ownerRace.color : '#ff6b6b';
                    const fleetStr = enemyByOwner[owner].reduce((sum, s) => sum + SHIP_TYPES[s.type].cost, 0);
                    html += `<div style="color:${ownerColor};font-size:9px;">⚔ ${ownerName} Fleet (${fleetStr})</div>`;
                }
            } else {
                html += `<div style="color:#4ecdc4;font-size:9px;">✓ Unguarded</div>`;
            }
            html += `</div>`;
        }
    }
    html += '</div>';

    return html;
}

function renderPlanetsRightPanel() {
    let html = '<div class="panel-title">All Colonies</div>';

    // Sort buttons (same as left panel)
    html += '<div style="margin-bottom:6px;display:flex;gap:4px;">';
    const sortOptions = [
        { key: 'type', label: 'Type' },
        { key: 'fleet', label: 'Fleet' }
    ];
    for (const opt of sortOptions) {
        const active = planetsSort === opt.key ? 'background:#4ecdc4;color:#1a1a2e;' : '';
        html += `<button class="btn btn-sm" style="padding:2px 6px;font-size:9px;${active}" onclick="setPlanetsSort('${opt.key}')">${opt.label}</button>`;
    }
    html += '</div>';

    // Get all colonized worlds (player and enemy)
    let colonized = stars.filter(s => s.owner);

    // Sort
    if (planetsSort === 'type') {
        // Highest maxPop first
        colonized.sort((a, b) => PLANET_TYPES[b.planetType].maxPop - PLANET_TYPES[a.planetType].maxPop);
    } else if (planetsSort === 'fleet') {
        // Unguarded first, then by weakest fleet
        colonized.sort((a, b) => getFleetStrength(a.id) - getFleetStrength(b.id));
    }

    html += '<div style="max-height:500px;overflow-y:auto;">';
    if (colonized.length === 0) {
        html += '<div class="empty-state">No colonies yet</div>';
    } else {
        for (const star of colonized) {
            const planetInfo = PLANET_TYPES[star.planetType];
            const isPlayer = star.owner === 'player';
            const ownerRace = isPlayer ? RACES.find(r => r.id === player.race?.id) : RACES.find(r => r.id === star.owner);
            const ownerName = ownerRace ? ownerRace.shortName : (isPlayer ? 'You' : 'Enemy');
            const ownerColor = isPlayer ? player.color : (ownerRace ? ownerRace.color : '#ff6b6b');
            const fleetStr = getFleetStrength(star.id);
            const defense = star.defense || 0;

            html += `<div style="padding:4px 6px;margin:2px 0;background:#252540;border-radius:4px;border-left:3px solid ${ownerColor};cursor:pointer;" onclick="window.selectStarById(${star.id})">`;
            html += `<div style="display:flex;justify-content:space-between;align-items:center;">`;
            html += `<span style="color:#fff;font-weight:bold;font-size:11px;">${star.name}</span>`;
            html += `<span style="color:${ownerColor};font-size:10px;">${ownerName}</span>`;
            html += `</div>`;
            html += `<div style="display:flex;justify-content:space-between;font-size:9px;color:#888;">`;
            html += `<span style="color:${planetInfo.color}">${planetInfo.name}</span>`;
            html += `<span>Fleet: ${fleetStr} | Def: ${defense}</span>`;
            html += `</div>`;
            html += `</div>`;
        }
    }
    html += '</div>';

    return html;
}

// Expose sort setter
window.setPlanetsSort = function(sortKey) {
    planetsSort = sortKey;
    updatePanels();
};
