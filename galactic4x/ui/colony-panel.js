// ============================================
// COLONY PANEL - Selected Planet Details & Fleet
// ============================================

function renderColonyLeftPanel() {
    if (!selectedStar) return '';
    const star = selectedStar;
    let html = `<div class="panel-title">Colony ${star.name}</div>`;

    if (star.explored) {
        const planetInfo = PLANET_TYPES[star.planetType];
        html += `<div class="info-row"><span class="info-label">Type:</span><span class="info-value" style="color:${planetInfo.color}">${planetInfo.name}</span></div>`;
        html += `<div class="info-row"><span class="info-label">Max Pop:</span><span class="info-value">${planetInfo.maxPop}</span></div>`;
    } else {
        html += `<div class="info-row"><span class="info-label">Type:</span><span class="info-value" style="color:#666">Unknown</span></div>`;
        html += `<div class="info-row"><span class="info-label">Max Pop:</span><span class="info-value" style="color:#666">???</span></div>`;
    }

    if (star.owner === 'player') {
        // Ensure auto-locked sliders are at 0 and redistributed
        redistributeAutoLockedSliders(star);

        const planetInfo = PLANET_TYPES[star.planetType];
        const prod = calculateProduction(star);

        html += `<div style="margin-top:10px" class="panel-title">Colony</div>`;
        html += `<div class="info-row"><span class="info-label">Population:</span><span class="info-value">${star.population.toFixed(1)}/${planetInfo.maxPop}</span></div>`;
        html += `<div class="info-row"><span class="info-label">Industry:</span><span class="info-value">${star.industry.toFixed(1)}%</span></div>`;
        html += `<div class="info-row"><span class="info-label">Defense:</span><span class="info-value">${star.defense}</span></div>`;

        html += `<div style="margin-top:10px" class="panel-title">Production</div>`;

        const sliderTypes = [
            { key: 'ship', label: 'Ships', prodKey: 'ship', prodLabel: 'prod' },
            { key: 'def', label: 'Defense', prodKey: 'def', prodLabel: 'def' },
            { key: 'ind', label: 'Industry', prodKey: 'ind', prodLabel: '% ind' },
            { key: 'eco', label: 'Growth', prodKey: 'eco', prodLabel: 'pop' }
        ];

        for (const slider of sliderTypes) {
            const lockState = getSliderLockState(star, slider.key);
            let containerClass = 'slider-container';
            if (lockState.locked) {
                if (lockState.type === 'auto') containerClass += ' locked-auto';
                else if (lockState.type === 'noship') containerClass += ' locked-noship';
                else if (lockState.type === 'user') containerClass += ' locked-user';
            }
            const isUserLocked = star.lockedSliders && star.lockedSliders.includes(slider.key);
            const lockBtnClass = isUserLocked ? 'lock-btn locked' : 'lock-btn';
            const lockDisabled = lockState.type === 'auto' || lockState.type === 'noship';

            // Determine if we should show production (hide if maxed)
            const isMaxed = (slider.key === 'ind' && star.industry >= 100) ||
                           (slider.key === 'eco' && star.population >= planetInfo.maxPop);

            // Format production value (1 decimal for pop/industry growth)
            // Hide ship production if less than 1
            let prodDisplay = '';
            if (!isMaxed) {
                if (slider.key === 'ship' && prod.ship < 1) {
                    // Don't show ship production less than 1
                } else if (slider.key === 'eco' || slider.key === 'ind') {
                    prodDisplay = `+${prod[slider.prodKey].toFixed(1)} ${slider.prodLabel}/year`;
                } else {
                    prodDisplay = `+${prod[slider.prodKey]} ${slider.prodLabel}/year`;
                }
            }

            html += `<div class="${containerClass}" data-slider="${slider.key}">
                <div class="slider-header">
                    <span class="slider-label">${slider.label}</span>
                    <span class="slider-value" id="slider-val-${star.id}-${slider.key}">${star.sliders[slider.key]}%</span>
                </div>
                <div class="slider-row">
                    <input type="range" min="0" max="100" step="5" value="${star.sliders[slider.key]}"
                           ${lockState.locked ? 'disabled' : ''}
                           oninput="previewSlider(${star.id}, '${slider.key}', this.value)"
                           onchange="adjustSlider(${star.id}, '${slider.key}', this.value)">
                    <button class="${lockBtnClass}" ${lockDisabled ? 'disabled' : ''}
                            onclick="toggleSliderLock(${star.id}, '${slider.key}')">
                        ${isUserLocked ? '🔒' : '🔓'}
                    </button>
                </div>
                <div class="slider-production" id="slider-prod-${star.id}-${slider.key}">${prodDisplay}</div>`;
            if (lockState.locked && lockState.reason) {
                const reasonClass = lockState.type === 'noship' ? 'lock-reason warning' : 'lock-reason';
                const prefix = lockState.type === 'noship' ? '⚠ ' : '';
                html += `<div class="${reasonClass}">${prefix}${lockState.reason}</div>`;
            }
            html += `</div>`;
        }

        html += `<div style="margin-top:10px" class="panel-title">Shipyard</div>`;
        if (star.buildingShip) {
            const shipTypeKey = star.buildingShip;
            const shipType = SHIP_TYPES[shipTypeKey];
            const currentProgress = star.shipProgress[shipTypeKey] || 0;
            const progress = Math.floor((currentProgress / shipType.cost) * 100);
            const remaining = shipType.cost - currentProgress;

            // Calculate ships per turn and next turn output
            let shipsNextTurn = 0;
            let turnsLeft = '∞';
            if (prod.ship > 0) {
                const totalNextTurn = currentProgress + prod.ship;
                shipsNextTurn = Math.floor(totalNextTurn / shipType.cost);
                turnsLeft = Math.ceil(remaining / prod.ship);
            }

            html += `<div class="info-row"><span class="info-label">Building:</span><span class="info-value">${shipType.name}</span></div>`;
            html += `<div class="info-row"><span class="info-label">Progress:</span><span class="info-value">${currentProgress}/${shipType.cost} (${progress}%)</span></div>`;
            if (prod.ship > 0) {
                html += `<div class="info-row"><span class="info-label">+Production:</span><span class="info-value">+${prod.ship}/year</span></div>`;
                if (shipsNextTurn > 0) {
                    html += `<div class="info-row"><span class="info-label">Next year:</span><span class="info-value" style="color:#4ecdc4">${shipsNextTurn} ship${shipsNextTurn > 1 ? 's' : ''}</span></div>`;
                } else {
                    html += `<div class="info-row"><span class="info-label">ETA:</span><span class="info-value">${turnsLeft} year${turnsLeft > 1 ? 's' : ''}</span></div>`;
                }
            } else {
                html += `<div class="info-row"><span class="info-label">ETA:</span><span class="info-value">∞ (0% allocated)</span></div>`;
            }
            html += `<button class="btn btn-danger btn-sm" onclick="cancelBuildingShip(${star.id})">Cancel</button>`;
        } else {
            html += `<div class="build-options">`;
            for (const key of getShipTypeOrder()) {
                const type = SHIP_TYPES[key];
                const existingProgress = star.shipProgress[key] || 0;
                let label = `${type.name}<br>(${type.cost})`;
                if (existingProgress > 0) {
                    label = `${type.name}<br>(${existingProgress}/${type.cost})`;
                }
                html += `<button class="btn build-btn" onclick="startBuildingShip(${star.id}, '${key}')">${label}</button>`;
            }
            html += `</div>`;
        }
    } else if (star.owner) {
        // Enemy colony
        const enemyRace = RACES.find(r => r.id === star.owner);
        const planetInfo = PLANET_TYPES[star.planetType];
        html += `<div style="margin-top:10px" class="panel-title">${enemyRace?.shortName || 'Enemy'} Colony</div>`;
        html += `<div class="info-row"><span class="info-label">Owner:</span><span class="info-value" style="color:${enemyRace?.color || '#ff6b6b'}">${enemyRace?.name || star.owner}</span></div>`;
        html += `<div class="info-row"><span class="info-label">Population:</span><span class="info-value">${Math.floor(star.population)}</span></div>`;
        html += `<div class="info-row"><span class="info-label">Defense:</span><span class="info-value">${star.defense}</span></div>`;

        // Check if can conquer (no enemies, no defense, have ships)
        const enemyShipsHere = getShipsAtStar(star.id).filter(s => s.owner !== 'player');
        const playerShipsHere = getShipsAtStar(star.id).filter(s => s.owner === 'player');
        if (enemyShipsHere.length === 0 && star.defense === 0 && playerShipsHere.length > 0) {
            html += `<button class="btn btn-primary" style="margin-top:8px" onclick="conquerStar(${star.id})">🏴 Conquer</button>`;
        }
    } else if (star.explored) {
        const planetInfo = PLANET_TYPES[star.planetType];
        html += `<div style="margin-top:10px;color:#888;font-size:10px">Unclaimed system</div>`;
        const playerShips = getShipsAtStar(star.id).filter(s => s.owner === 'player');
        const enemyShips = getShipsAtStar(star.id).filter(s => s.owner !== 'player');
        const colonyShip = playerShips.find(s => s.type === 'colony');
        if (colonyShip && planetInfo.maxPop > 0 && enemyShips.length === 0) {
            html += `<button class="btn" style="margin-top:8px" onclick="colonizeStar(${colonyShip.id}, ${star.id})">Colonize</button>`;
        } else if (colonyShip && planetInfo.maxPop > 0 && enemyShips.length > 0) {
            html += `<div style="color:#ff6b6b;font-size:10px;margin-top:5px">Clear enemies to colonize</div>`;
        } else if (planetInfo.maxPop === 0) {
            html += `<div style="color:#ff6b6b;font-size:10px;margin-top:5px">Uninhabitable</div>`;
        }
    } else {
        html += `<div style="margin-top:10px;color:#888;font-size:10px">Unexplored - send a ship</div>`;
    }

    return html;
}

function renderColonyRightPanel() {
    if (!selectedStar) return '';
    const star = selectedStar;
    const shipsHere = getShipsAtStar(star.id).filter(s => s.owner === 'player');
    const incomingShips = ships.filter(s => s.destination === star.id && s.owner === 'player');

    let html = `<div class="panel-title">Fleets at ${star.name}</div>`;

    if (shipsHere.length > 0) {
        // Group ships by type
        const shipsByType = {};
        for (const ship of shipsHere) {
            if (!shipsByType[ship.type]) {
                shipsByType[ship.type] = [];
            }
            shipsByType[ship.type].push(ship);
        }

        // Count selected by type
        const selectedByType = {};
        for (const shipId of selectedShips) {
            const ship = shipsHere.find(s => s.id === shipId);
            if (ship) {
                selectedByType[ship.type] = (selectedByType[ship.type] || 0) + 1;
            }
        }

        const totalSelected = selectedShips.length;
        html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-size:10px;color:#888">Selected: ${totalSelected}/${shipsHere.length}</span>
            <button class="btn btn-sm" onclick="toggleSelectAll()">${totalSelected === shipsHere.length ? 'Clear' : 'All'}</button>
        </div>`;

        // Show each ship type with selection controls (in display order)
        for (const type of getShipTypeOrder()) {
            if (!shipsByType[type]) continue;
            const typeShips = shipsByType[type];
            const shipType = SHIP_TYPES[type];
            const count = typeShips.length;
            const selected = selectedByType[type] || 0;

            html += `<div style="background:#252540;border-radius:4px;padding:6px;margin:4px 0;">`;
            html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">`;
            html += `<span style="font-size:11px;font-weight:bold;">${shipType.name}</span>`;
            html += `<span style="font-size:10px;color:#888;">${selected}/${count}</span>`;
            html += `</div>`;

            // Quick select buttons
            html += `<div style="display:flex;gap:3px;flex-wrap:wrap;margin-bottom:4px;">`;
            html += `<button class="btn btn-sm" style="padding:1px 4px;font-size:9px;" onclick="selectShipsOfType('${type}', 1)">+1</button>`;
            html += `<button class="btn btn-sm" style="padding:1px 4px;font-size:9px;" onclick="selectShipsOfType('${type}', 10)">+10</button>`;
            html += `<button class="btn btn-sm" style="padding:1px 4px;font-size:9px;" onclick="selectShipsOfType('${type}', 100)">+100</button>`;
            html += `<button class="btn btn-sm" style="padding:1px 4px;font-size:9px;" onclick="deselectShipsOfType('${type}', 1)">-1</button>`;
            html += `<button class="btn btn-sm" style="padding:1px 4px;font-size:9px;" onclick="deselectShipsOfType('${type}', ${count})">None</button>`;
            html += `</div>`;

            // Slider for this type
            html += `<input type="range" min="0" max="${count}" value="${selected}" style="width:100%;"
                       oninput="setShipTypeSelection('${type}', parseInt(this.value))">`;
            html += `</div>`;
        }
    } else {
        html += `<div class="empty-state">No ships at this location</div>`;
    }

    // Show departing fleets (ships ordered to move this turn, not yet departed)
    const departingShips = ships.filter(s =>
        s.location === star.id &&
        s.destination !== null &&
        s.owner === 'player' &&
        s.turnsToArrival === s.totalTurns // Just ordered this turn
    );

    if (departingShips.length > 0) {
        html += `<div style="margin-top:10px" class="panel-title">Departing</div>`;

        // Group by destination and ETA
        const fleetGroups = new Map(); // "destId-eta" -> ships[]
        for (const ship of departingShips) {
            const key = `${ship.destination}-${ship.turnsToArrival}`;
            if (!fleetGroups.has(key)) {
                fleetGroups.set(key, []);
            }
            fleetGroups.get(key).push(ship);
        }

        for (const [key, fleetShips] of fleetGroups) {
            const destStar = stars.find(s => s.id === fleetShips[0].destination);
            const eta = fleetShips[0].turnsToArrival;

            // Group ships by type for this fleet
            const typeCount = {};
            for (const ship of fleetShips) {
                typeCount[ship.type] = (typeCount[ship.type] || 0) + 1;
            }

            // Build ship list string
            const shipList = getShipTypeOrder()
                .filter(t => typeCount[t])
                .map(t => `${typeCount[t]} ${SHIP_TYPES[t].name}${typeCount[t] > 1 ? 's' : ''}`)
                .join(', ');

            const shipIds = fleetShips.map(s => s.id).join(',');

            html += `<div style="background:#252540;border-radius:6px;padding:8px;margin:4px 0;border-left:3px solid #ffe66d;">`;
            html += `<div style="font-size:10px;color:#fff;margin-bottom:4px;">${shipList}</div>`;
            html += `<div style="display:flex;justify-content:space-between;align-items:center;">`;
            html += `<span style="font-size:10px;color:#ffe66d;">→ ${destStar?.name || 'Unknown'}, ${eta} year${eta > 1 ? 's' : ''}</span>`;
            html += `<button class="btn btn-sm" style="color:#ff6b6b;padding:2px 6px;font-size:9px;" onclick="cancelFleet([${shipIds}])">❌ Cancel</button>`;
            html += `</div>`;
            html += `</div>`;
        }
    }

    if (incomingShips.length > 0) {
        html += `<div style="margin-top:10px" class="panel-title">Incoming</div>`;
        // Group incoming by type too
        const incomingByType = {};
        for (const ship of incomingShips) {
            if (!incomingByType[ship.type]) {
                incomingByType[ship.type] = { count: 0, minTurns: Infinity };
            }
            incomingByType[ship.type].count++;
            incomingByType[ship.type].minTurns = Math.min(incomingByType[ship.type].minTurns, ship.turnsToArrival);
        }
        for (const type of getShipTypeOrder()) {
            if (!incomingByType[type]) continue;
            const info = incomingByType[type];
            const shipType = SHIP_TYPES[type];
            html += `<div class="ship-item">
                <span>${info.count}x ${shipType.name}</span>
                <span style="color:#ffe66d">${info.minTurns}t</span>
            </div>`;
        }
    }

    // Show enemy fleets (only for explored planets)
    if (star.explored) {
        const enemyShipsHere = getShipsAtStar(star.id).filter(s => s.owner !== 'player');
        if (enemyShipsHere.length > 0) {
            const enemyOwner = enemyShipsHere[0].owner;
            const enemyRace = RACES.find(r => r.id === enemyOwner);
            const enemyColor = enemyRace?.color || '#ff6b6b';
            html += `<div style="margin-top:10px" class="panel-title" style="color:${enemyColor}">${enemyRace?.shortName || 'Enemy'} Fleet</div>`;
            // Group by type
            const enemyByType = {};
            for (const ship of enemyShipsHere) {
                if (!enemyByType[ship.type]) {
                    enemyByType[ship.type] = 0;
                }
                enemyByType[ship.type]++;
            }
            for (const type of getShipTypeOrder()) {
                if (!enemyByType[type]) continue;
                const count = enemyByType[type];
                const shipType = SHIP_TYPES[type];
                html += `<div class="ship-item" style="color:${enemyColor};">
                    <span>${count}x ${shipType.name}</span>
                    <span style="color:#888;font-size:9px;">${shipType.attack} atk / ${shipType.health} hp</span>
                </div>`;
            }
        }
    }

    return html;
}

function renderColonyFleetActions() {
    if (!selectedStar) return '';
    const star = selectedStar;
    const shipsHere = getShipsAtStar(star.id).filter(s => s.owner === 'player');
    let actionsHtml = '';
    const hasSelection = selectedShips.length > 0;

    // Check for enemy military ships or defenses
    const enemyMilitaryHere = star.explored
        ? getShipsAtStar(star.id).filter(s => s.owner !== 'player' && SHIP_TYPES[s.type].military)
        : [];
    const playerMilitaryHere = getShipsAtStar(star.id).filter(s => s.owner === 'player' && SHIP_TYPES[s.type].military);
    const enemyDefenseHere = (star.owner && star.owner !== 'player') ? star.defense : 0;
    const canCombat = (enemyMilitaryHere.length > 0 || enemyDefenseHere > 0) && playerMilitaryHere.length > 0 && !combatThisTurn;

    // Check if selected ships can move (not in combat this turn)
    const selectedCanMove = hasSelection && !selectedShips.some(id => shipsInCombatThisTurn.has(id));

    // Check for scouts and unexplored planets for Explore button
    const scoutsHere = shipsHere.filter(s => s.type === 'scout');
    const unexploredStars = stars.filter(s => !s.explored);
    const canExplore = scoutsHere.length > 0 && unexploredStars.length > 0;

    // Select All button - always on top
    if (shipsHere.length > 0) {
        const allSelected = selectedShips.length === shipsHere.length;
        actionsHtml += `<button class="btn btn-sm" onclick="toggleSelectAll()">${allSelected ? 'Clear Selection' : 'Select All Ships'}</button>`;
    }

    if (destinationStar && selectedCanMove) {
        const travelInfo = calculateTravelInfo(selectedStar, destinationStar, selectedShips);
        actionsHtml += `<div class="destination-highlight">
            <div>To: <strong>${destinationStar.name}</strong></div>
            <div><span class="distance">${travelInfo.lightYears} LY</span> - <span class="turns">${travelInfo.turns} years</span></div>
            ${selectedShips.length > 1 ? `<div style="font-size:9px;color:#888">Slowest: ${travelInfo.slowestShipName}</div>` : ''}
        </div>`;
        actionsHtml += `<button class="btn btn-primary" onclick="confirmMove()">Confirm Move</button>`;
        actionsHtml += `<button class="btn btn-danger btn-sm" onclick="cancelMove()">Cancel</button>`;
    } else {
        // Combat button
        if (canCombat) {
            actionsHtml += `<button class="btn btn-danger" onclick="startCombat(${star.id})">⚔️ Combat</button>`;
        }

        // Move and Explore buttons row
        actionsHtml += `<div style="display:flex;gap:6px;margin-top:6px;">`;

        // Move button
        const moveDisabled = !selectedCanMove;
        actionsHtml += `<button class="btn" ${moveDisabled ? 'disabled' : ''} onclick="window.focus()">Move ${hasSelection ? selectedShips.length + ' Ship' + (selectedShips.length > 1 ? 's' : '') : 'Ships'}</button>`;

        // Explore button
        if (canExplore) {
            actionsHtml += `<button class="btn" onclick="exploreWithScouts(${star.id})">Explore (${scoutsHere.length})</button>`;
        }

        actionsHtml += `</div>`;

        if (hasSelection && shipsInCombatThisTurn.has(selectedShips[0])) {
            actionsHtml += `<div style="font-size:9px;color:#ff6b6b;margin-top:4px">Ships in combat can't move</div>`;
        } else if (hasSelection) {
            actionsHtml += `<div style="font-size:9px;color:#888;margin-top:4px">Click a destination star</div>`;
        }
    }

    return actionsHtml;
}
