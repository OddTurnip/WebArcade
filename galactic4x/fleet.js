// ============================================
// FLEET - Movement, Exploration
// ============================================

function calculateTravelInfo(originStar, destStar, shipIds) {
    const dist = Math.sqrt((destStar.x - originStar.x) ** 2 + (destStar.y - originStar.y) ** 2);
    const lightYears = Math.round(dist / CONFIG.PARSEC_SCALE * 10) / 10;
    let slowestSpeed = Infinity;
    let slowestShipName = '';
    for (const shipId of shipIds) {
        const ship = ships.find(s => s.id === shipId);
        if (ship) {
            const shipType = SHIP_TYPES[ship.type];
            if (shipType.speed < slowestSpeed) {
                slowestSpeed = shipType.speed;
                slowestShipName = shipType.name;
            }
        }
    }
    const turns = Math.max(1, Math.ceil(dist / (50 * slowestSpeed)));
    return { lightYears, turns, slowestShipName, slowestSpeed };
}

function moveShips(shipIds, destinationId) {
    const destStar = stars.find(s => s.id === destinationId);
    if (!destStar) return;

    // Find the slowest ship speed among selected ships
    let slowestSpeed = Infinity;
    let originStar = null;
    for (const shipId of shipIds) {
        const ship = ships.find(s => s.id === shipId);
        if (!ship || ship.destination !== null) continue;
        const shipType = SHIP_TYPES[ship.type];
        if (shipType.speed < slowestSpeed) {
            slowestSpeed = shipType.speed;
        }
        if (!originStar) {
            originStar = stars.find(s => s.id === ship.location);
        }
    }

    if (!originStar || slowestSpeed === Infinity) return;

    // Calculate travel time based on slowest ship
    const dist = Math.sqrt((destStar.x - originStar.x) ** 2 + (destStar.y - originStar.y) ** 2);
    const turns = Math.max(1, Math.ceil(dist / (50 * slowestSpeed)));

    // Apply same travel time to all ships in the group
    for (const shipId of shipIds) {
        const ship = ships.find(s => s.id === shipId);
        if (!ship || ship.destination !== null) continue;
        ship.destination = destinationId;
        ship.turnsToArrival = turns;
        ship.totalTurns = turns;
    }
    AudioSystem.sfx.select();
    selectedShips = [];
    destinationStar = null;
    updatePanels();
    saveGameState();
}

function exploreWithScouts(starId) {
    const star = stars.find(s => s.id === starId);
    if (!star) return;

    // Get scouts at this star that can move (not in combat)
    const scoutsHere = getShipsAtStar(starId)
        .filter(s => s.owner === 'player' && s.type === 'scout' && !shipsInCombatThisTurn.has(s.id));

    if (scoutsHere.length === 0) return;

    // Get unexplored stars
    const unexploredStars = stars.filter(s => !s.explored);
    if (unexploredStars.length === 0) return;

    // Get stars that already have a player ship heading there
    const destinationsInUse = new Set();
    for (const ship of ships) {
        if (ship.owner === 'player' && ship.destination !== null) {
            destinationsInUse.add(ship.destination);
        }
    }

    // Sort unexplored stars by distance from current star
    const sortedUnexplored = unexploredStars
        .filter(s => !destinationsInUse.has(s.id))
        .map(s => ({
            star: s,
            distance: Math.sqrt(Math.pow(s.x - star.x, 2) + Math.pow(s.y - star.y, 2))
        }))
        .sort((a, b) => a.distance - b.distance);

    // Assign each scout to the closest available unexplored star
    let assignedCount = 0;
    for (const scout of scoutsHere) {
        if (assignedCount >= sortedUnexplored.length) break;

        const target = sortedUnexplored[assignedCount].star;
        moveShips([scout.id], target.id);
        destinationsInUse.add(target.id);
        assignedCount++;
    }

    if (assignedCount > 0) {
        AudioSystem.sfx.select();
        selectedShips = [];
        destinationStar = null;
        updatePanels();
        draw();
    }
}

function globalExplore() {
    // Get all player scouts that are stationary (not already moving)
    const allScouts = ships.filter(s =>
        s.owner === 'player' &&
        s.type === 'scout' &&
        s.destination === null &&
        !shipsInCombatThisTurn.has(s.id)
    );

    if (allScouts.length === 0) return;

    // Get unexplored stars
    const unexploredStars = stars.filter(s => !s.explored);
    if (unexploredStars.length === 0) return;

    // Get stars that already have a player ship heading there
    const destinationsInUse = new Set();
    for (const ship of ships) {
        if (ship.owner === 'player' && ship.destination !== null) {
            destinationsInUse.add(ship.destination);
        }
    }

    // Sort scouts by their distance to the closest unexplored star
    const scoutsWithClosest = allScouts.map(scout => {
        const scoutStar = stars.find(s => s.id === scout.location);
        if (!scoutStar) return { scout, minDist: Infinity };

        let minDist = Infinity;
        for (const unexplored of unexploredStars) {
            if (!destinationsInUse.has(unexplored.id)) {
                const dist = Math.sqrt(Math.pow(unexplored.x - scoutStar.x, 2) + Math.pow(unexplored.y - scoutStar.y, 2));
                if (dist < minDist) minDist = dist;
            }
        }
        return { scout, minDist, star: scoutStar };
    }).sort((a, b) => a.minDist - b.minDist);

    // Assign scouts starting with the one closest to an unexplored star
    let assignedCount = 0;
    for (const { scout, star } of scoutsWithClosest) {
        if (!star) continue;

        // Find closest unexplored star not already targeted
        const availableTargets = unexploredStars
            .filter(s => !destinationsInUse.has(s.id))
            .map(s => ({
                star: s,
                distance: Math.sqrt(Math.pow(s.x - star.x, 2) + Math.pow(s.y - star.y, 2))
            }))
            .sort((a, b) => a.distance - b.distance);

        if (availableTargets.length === 0) break;

        const target = availableTargets[0].star;
        moveShips([scout.id], target.id);
        destinationsInUse.add(target.id);
        assignedCount++;
    }

    if (assignedCount > 0) {
        AudioSystem.sfx.select();
        selectedShips = [];
        destinationStar = null;
        updatePanels();
        updateTurnInfo();
        draw();
    }
}

function cancelFleet(shipIds) {
    for (const shipId of shipIds) {
        const ship = ships.find(s => s.id === shipId);
        if (ship && ship.owner === 'player') {
            ship.destination = null;
            ship.turnsToArrival = 0;
            ship.totalTurns = 0;
        }
    }
    AudioSystem.sfx.select();
    updatePanels();
    saveGameState();
}

// Expose to window for HTML onclick handlers
window.exploreWithScouts = exploreWithScouts;
window.globalExplore = globalExplore;
window.cancelFleet = cancelFleet;
