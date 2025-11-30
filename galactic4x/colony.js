// ============================================
// COLONY - Production, Sliders, Turn Processing
// ============================================

function calculateProduction(star, overrideSliders = null) {
    if (!star.owner) return null; // Unowned stars have no production
    const planetInfo = PLANET_TYPES[star.planetType];
    const baseProduction = star.population * (star.industry / 100) * planetInfo.industryMod;
    const sliders = overrideSliders || star.sliders;
    return {
        ship: Math.floor(baseProduction * (sliders.ship / 100)),
        def: Math.floor(baseProduction * (sliders.def / 100)),
        ind: baseProduction * (sliders.ind / 100) * 0.5, // Keep decimal for gradual growth
        eco: baseProduction * (sliders.eco / 100) * planetInfo.ecoMod * 0.3
    };
}

function getSliderLockState(star, sliderKey) {
    if (star.lockedSliders && star.lockedSliders.includes(sliderKey)) {
        return { locked: true, type: 'user', reason: 'Locked by you' };
    }
    const planetInfo = PLANET_TYPES[star.planetType];
    if (sliderKey === 'ind' && star.industry >= 100) {
        return { locked: true, type: 'auto', reason: 'Industry maxed' };
    }
    if (sliderKey === 'eco' && star.population >= planetInfo.maxPop) {
        return { locked: true, type: 'auto', reason: 'Population maxed' };
    }
    if (sliderKey === 'ship' && !star.buildingShip) {
        return { locked: true, type: 'noship', reason: 'No ship queued' };
    }
    return { locked: false, type: null, reason: null };
}

function normalizeSliders(star, changedKey, newValue) {
    const lockStates = {};
    for (const key of Object.keys(star.sliders)) {
        lockStates[key] = getSliderLockState(star, key);
    }
    star.sliders[changedKey] = newValue;
    const unlockedKeys = Object.keys(star.sliders).filter(k =>
        k !== changedKey && !lockStates[k].locked
    );
    const total = Object.values(star.sliders).reduce((a, b) => a + b, 0);
    const diff = total - 100;
    if (diff === 0 || unlockedKeys.length === 0) return;
    const unlockedTotal = unlockedKeys.reduce((sum, k) => sum + star.sliders[k], 0);
    if (unlockedTotal === 0) {
        const perSlider = Math.floor(diff / unlockedKeys.length);
        for (const key of unlockedKeys) {
            star.sliders[key] = Math.max(0, -perSlider);
        }
    } else {
        for (const key of unlockedKeys) {
            const proportion = star.sliders[key] / unlockedTotal;
            star.sliders[key] = Math.max(0, Math.round(star.sliders[key] - diff * proportion));
        }
    }
    const finalTotal = Object.values(star.sliders).reduce((a, b) => a + b, 0);
    if (finalTotal !== 100 && unlockedKeys.length > 0) {
        const adjustment = 100 - finalTotal;
        for (const key of unlockedKeys) {
            if (star.sliders[key] > 0 || adjustment > 0) {
                star.sliders[key] = Math.max(0, star.sliders[key] + adjustment);
                break;
            }
        }
    }
}

// When a slider becomes auto-locked (maxed), set it to 0 and redistribute
function redistributeAutoLockedSliders(star) {
    const keys = ['ship', 'def', 'ind', 'eco'];
    let changed = false;

    for (const key of keys) {
        const lockState = getSliderLockState(star, key);
        // Only handle 'auto' locks (industry/population maxed)
        if (lockState.type === 'auto' && star.sliders[key] > 0) {
            const valueToRedistribute = star.sliders[key];
            star.sliders[key] = 0;
            changed = true;

            // Find sliders that can receive this value
            // Priority: unlocked > noship > user-locked (override)
            const otherKeys = keys.filter(k => k !== key);

            // Get lock states for other sliders
            const otherLockStates = {};
            for (const k of otherKeys) {
                otherLockStates[k] = getSliderLockState(star, k);
            }

            // Try unlocked sliders first
            let receiverKeys = otherKeys.filter(k => !otherLockStates[k].locked);

            // If no unlocked, try noship sliders
            if (receiverKeys.length === 0) {
                receiverKeys = otherKeys.filter(k => otherLockStates[k].type === 'noship');
            }

            // If still nothing, override user locks
            if (receiverKeys.length === 0) {
                receiverKeys = otherKeys.filter(k => otherLockStates[k].type === 'user');
                // Remove the user lock since we're overriding it
                for (const k of receiverKeys) {
                    if (star.lockedSliders) {
                        star.lockedSliders = star.lockedSliders.filter(l => l !== k);
                    }
                }
            }

            // If still nothing (all other sliders are also auto-locked), skip
            if (receiverKeys.length === 0) continue;

            // Redistribute proportionally to current values, or equally if all zero
            const receiverTotal = receiverKeys.reduce((sum, k) => sum + star.sliders[k], 0);
            if (receiverTotal === 0) {
                // Distribute equally
                const perSlider = Math.floor(valueToRedistribute / receiverKeys.length);
                let remainder = valueToRedistribute - (perSlider * receiverKeys.length);
                for (const k of receiverKeys) {
                    star.sliders[k] += perSlider;
                    if (remainder > 0) {
                        star.sliders[k]++;
                        remainder--;
                    }
                }
            } else {
                // Distribute proportionally
                let distributed = 0;
                for (let i = 0; i < receiverKeys.length; i++) {
                    const k = receiverKeys[i];
                    if (i === receiverKeys.length - 1) {
                        // Last one gets the remainder to ensure sum = 100
                        star.sliders[k] += (valueToRedistribute - distributed);
                    } else {
                        const proportion = star.sliders[k] / receiverTotal;
                        const amount = Math.round(valueToRedistribute * proportion);
                        star.sliders[k] += amount;
                        distributed += amount;
                    }
                }
            }
        }
    }

    return changed;
}

function startBuildingShip(starId, shipType) {
    const star = stars.find(s => s.id === starId);
    if (!star || star.owner !== 'player') return;
    star.buildingShip = shipType;
    // Don't reset progress - keep existing progress for this ship type
    AudioSystem.sfx.select();
    updatePanels();
    saveGameState();
}

function cancelBuildingShip(starId) {
    const star = stars.find(s => s.id === starId);
    if (!star) return;
    star.buildingShip = null;
    // Don't clear progress - it stays in the factories for later
    updatePanels();
    saveGameState();
}

function colonizeStar(shipId, starId) {
    const ship = ships.find(s => s.id === shipId);
    const star = stars.find(s => s.id === starId);
    if (!ship || !star || ship.type !== 'colony' || star.owner !== null) return false;
    const planetInfo = PLANET_TYPES[star.planetType];
    if (planetInfo.maxPop === 0) return false;
    // Can't colonize if enemies present
    const enemiesHere = getShipsAtStar(starId).filter(s => s.owner !== 'player');
    if (enemiesHere.length > 0) return false;
    ships = ships.filter(s => s.id !== shipId);
    star.owner = 'player';
    star.explored = true;
    star.population = 10;
    star.industry = 5;
    star.defense = 0;
    star.defenseProgress = 0;
    star.lockedSliders = [];
    star.sliders = { ship: 0, def: 0, ind: 50, eco: 50 };
    star.shipProgress = { scout: 0, fighter: 0, destroyer: 0, cruiser: 0, battleship: 0, colony: 0 };
    star.buildingShip = null;
    star.colonizedYear = year;
    // Track colonization event
    eventHistory.unshift({
        year: year,
        type: 'colony',
        text: `Established colony on ${star.name}`
    });
    AudioSystem.sfx.levelComplete();
    updatePanels();
    updateTurnInfo();
    saveGameState();
    return true;
}

// ============================================
// TURN PROCESSING
// ============================================

function processTurn() {
    state = GameState.END_TURN;

    // Process player colonies
    for (const star of getPlayerColonies()) {
        const production = calculateProduction(star);
        const planetInfo = PLANET_TYPES[star.planetType];
        star.industry = Math.min(100, star.industry + production.ind);
        const maxPop = planetInfo.maxPop;
        if (star.population < maxPop) {
            star.population = Math.min(maxPop, star.population + production.eco);
        }
        // Defense uses defenseProgress for partial construction
        if (!star.defenseProgress) star.defenseProgress = 0;
        star.defenseProgress += production.def;
        while (star.defenseProgress >= 20) {
            star.defense++;
            star.defenseProgress -= 20;
        }
        if (star.buildingShip) {
            const shipTypeKey = star.buildingShip;
            star.shipProgress[shipTypeKey] += production.ship;
            const shipType = SHIP_TYPES[shipTypeKey];
            let shipsBuilt = 0;
            // Build as many ships as production allows (with carry-over)
            while (star.shipProgress[shipTypeKey] >= shipType.cost) {
                ships.push({
                    id: nextShipId++,
                    type: shipTypeKey,
                    owner: 'player',
                    location: star.id,
                    destination: null,
                    turnsToArrival: 0
                });
                star.shipProgress[shipTypeKey] -= shipType.cost;
                shipsBuilt++;
                // Track ships built this turn
                shipsBuiltThisTurn[shipTypeKey] = (shipsBuiltThisTurn[shipTypeKey] || 0) + 1;
            }
            if (shipsBuilt > 0) {
                AudioSystem.sfx.powerUp();
            }
            // Keep building same ship type (no longer sets to null)
        }
        // Redistribute sliders if industry or population just maxed
        redistributeAutoLockedSliders(star);
    }

    // Process AI colonies
    for (const star of stars) {
        if (star.owner === 'player' || !star.owner) continue;

        const planetInfo = PLANET_TYPES[star.planetType];
        const maxPop = planetInfo.maxPop;

        // Ensure AI colony has required properties
        if (!star.aiPhase) star.aiPhase = 'growth';
        if (!star.sliders) star.sliders = { ship: 0, def: 0, ind: 50, eco: 50 };
        if (!star.shipProgress) star.shipProgress = { scout: 0, fighter: 0, destroyer: 0, cruiser: 0, battleship: 0, colony: 0 };
        if (!star.defenseProgress) star.defenseProgress = 0;

        // Check if growth phase is complete
        if (star.aiPhase === 'growth') {
            if (star.industry >= 100 && star.population >= maxPop) {
                star.aiPhase = 'military';
                star.sliders = { ship: 50, def: 50, ind: 0, eco: 0 };
                star.buildingShip = 'destroyer';
            }
        }

        const production = calculateProduction(star);
        if (!production) continue; // Skip if production can't be calculated

        // Apply production
        star.industry = Math.min(100, star.industry + production.ind);
        if (star.population < maxPop) {
            star.population = Math.min(maxPop, star.population + production.eco);
        }

        // Defense with partial construction
        star.defenseProgress += production.def;
        while (star.defenseProgress >= 20) {
            star.defense++;
            star.defenseProgress -= 20;
        }

        // Ship building
        if (star.buildingShip) {
            const shipTypeKey = star.buildingShip;
            star.shipProgress[shipTypeKey] += production.ship;
            const shipType = SHIP_TYPES[shipTypeKey];
            while (star.shipProgress[shipTypeKey] >= shipType.cost) {
                ships.push({
                    id: nextShipId++,
                    type: shipTypeKey,
                    owner: star.owner,
                    location: star.id,
                    destination: null,
                    turnsToArrival: 0
                });
                star.shipProgress[shipTypeKey] -= shipType.cost;
            }
        }
    }

    // Process ship movement
    for (const ship of ships) {
        if (ship.destination !== null) {
            ship.turnsToArrival--;
            if (ship.turnsToArrival <= 0) {
                ship.location = ship.destination;
                ship.destination = null;
                const star = stars.find(s => s.id === ship.location);
                if (star && !star.explored && ship.owner === 'player') {
                    star.explored = true;
                    // Track scouting event
                    eventHistory.unshift({
                        year: year + 1, // This happens at start of next year
                        type: 'scout',
                        text: `Scouted ${star.name}`
                    });
                    AudioSystem.sfx.select();
                } else if (star && !star.explored) {
                    star.explored = true;
                }
            }
        }
    }

    // Record ships built this turn as event
    const builtParts = [];
    for (const type of getShipTypeOrder()) {
        if (shipsBuiltThisTurn[type]) {
            const shipType = SHIP_TYPES[type];
            const count = shipsBuiltThisTurn[type];
            builtParts.push(`${count} ${shipType.name}${count > 1 ? 's' : ''}`);
        }
    }
    if (builtParts.length > 0) {
        eventHistory.unshift({
            year: year,
            type: 'built',
            text: `Built ${builtParts.join(', ')}`
        });
    }
    shipsBuiltThisTurn = {};

    // Reset combat state for new turn
    combatThisTurn = false;
    shipsInCombatThisTurn.clear();

    year++;
    state = GameState.PLAYING;
    updatePanels();
    updateTurnInfo();
    saveGameState();
}

// Expose to window for HTML onclick handlers
window.startBuildingShip = startBuildingShip;
window.cancelBuildingShip = cancelBuildingShip;
window.colonizeStar = colonizeStar;
