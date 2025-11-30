// ============================================
// COMBAT SYSTEM
// ============================================

function startCombat(starId) {
    if (combatThisTurn) return; // Only one combat per turn

    const star = stars.find(s => s.id === starId);
    if (!star) return;

    // Get all ships at location
    const allShipsHere = getShipsAtStar(starId);
    const playerMilitary = allShipsHere.filter(s => s.owner === 'player' && SHIP_TYPES[s.type].military);
    const enemyMilitary = allShipsHere.filter(s => s.owner !== 'player' && SHIP_TYPES[s.type].military);
    const enemyDefense = (star.owner && star.owner !== 'player') ? star.defense : 0;

    // Need player military ships, and enemy must have either ships or defenses
    if (playerMilitary.length === 0 || (enemyMilitary.length === 0 && enemyDefense === 0)) return;

    // Track starting counts for history
    const startingPlayerCounts = {};
    const startingEnemyCounts = {};
    for (const s of playerMilitary) {
        startingPlayerCounts[s.type] = (startingPlayerCounts[s.type] || 0) + 1;
    }
    for (const s of enemyMilitary) {
        startingEnemyCounts[s.type] = (startingEnemyCounts[s.type] || 0) + 1;
    }

    // Get enemy race info for naming (from ships if available, otherwise from star owner)
    const enemyOwner = enemyMilitary.length > 0 ? enemyMilitary[0].owner : star.owner;
    const enemyRace = RACES.find(r => r.id === enemyOwner);
    const enemyShortName = enemyRace?.shortName || 'Enemy';
    const playerShortName = player.race?.shortName || 'Player';

    // Track unit numbers by type for debug naming
    const playerUnitNumbers = {};
    const enemyUnitNumbers = {};

    // Create combat units with current health and debug names
    let playerUnits = playerMilitary.map(s => {
        playerUnitNumbers[s.type] = (playerUnitNumbers[s.type] || 0) + 1;
        const unitNum = String(playerUnitNumbers[s.type]).padStart(3, '0');
        return {
            id: s.id,
            type: s.type,
            owner: s.owner,
            hp: SHIP_TYPES[s.type].health,
            maxHp: SHIP_TYPES[s.type].health,
            attack: SHIP_TYPES[s.type].attack,
            speed: SHIP_TYPES[s.type].speed,
            debugName: `${playerShortName} ${SHIP_TYPES[s.type].name} ${unitNum}`
        };
    });

    let enemyUnits = enemyMilitary.map(s => {
        enemyUnitNumbers[s.type] = (enemyUnitNumbers[s.type] || 0) + 1;
        const unitNum = String(enemyUnitNumbers[s.type]).padStart(3, '0');
        return {
            id: s.id,
            type: s.type,
            owner: s.owner,
            hp: SHIP_TYPES[s.type].health,
            maxHp: SHIP_TYPES[s.type].health,
            attack: SHIP_TYPES[s.type].attack,
            speed: SHIP_TYPES[s.type].speed,
            debugName: `${enemyShortName} ${SHIP_TYPES[s.type].name} ${unitNum}`
        };
    });

    // Combat log for debug mode
    const combatLog = [];

    // Track defense pools (attacks against defense destroy Attack amount)
    let playerDefensePool = (star.owner === 'player') ? star.defense : 0;
    let enemyDefensePool = (star.owner && star.owner !== 'player') ? star.defense : 0;
    const startingPlayerDefense = playerDefensePool;
    const startingEnemyDefense = enemyDefensePool;

    // Get all unique speeds including defense (0), sorted descending
    const shipSpeeds = [...new Set([...playerUnits, ...enemyUnits].map(u => u.speed))];
    const speeds = [...new Set([...shipSpeeds, 0])].sort((a, b) => b - a);

    // Process each speed tier
    for (const speed of speeds) {
        // Ships attacking at this speed
        const shipAttackers = [...playerUnits, ...enemyUnits].filter(u => u.speed === speed && u.hp > 0);

        // Defense attacks at speed 0
        const playerDefenseAttacks = (speed === 0) ? playerDefensePool : 0;
        const enemyDefenseAttacks = (speed === 0) ? enemyDefensePool : 0;

        // Add initiative header to combat log if there are attackers at this speed
        const hasAttackers = shipAttackers.length > 0 || playerDefenseAttacks > 0 || enemyDefenseAttacks > 0;
        if (hasAttackers) {
            const initLabel = speed === 0 ? 'Defense' : `Speed ${speed}`;
            combatLog.push(`\n=== Initiative: ${initLabel} ===`);
        }

        // Collect all attacks for simultaneous resolution
        const damageToShips = new Map(); // shipId -> { damage, attacks: [{attacker, damage}] }
        let damageToPlayerDefense = 0;
        let damageToEnemyDefense = 0;
        const attackEvents = []; // For debug log

        // Ship attacks
        for (const attacker of shipAttackers) {
            const isPlayer = attacker.owner === 'player';
            const enemyShipTargets = isPlayer
                ? enemyUnits.filter(u => u.hp > 0)
                : playerUnits.filter(u => u.hp > 0);
            const enemyDefenseAvailable = isPlayer ? enemyDefensePool : playerDefensePool;

            // Build target pool: ships + defense (if any)
            const totalTargets = enemyShipTargets.length + (enemyDefenseAvailable > 0 ? 1 : 0);
            if (totalTargets === 0) continue;

            const roll = Math.floor(Math.random() * totalTargets);
            if (roll < enemyShipTargets.length) {
                // Target a ship
                const target = enemyShipTargets[roll];
                const current = damageToShips.get(target.id) || { damage: 0, attacks: [] };
                current.damage += attacker.attack;
                current.attacks.push({ attacker, damage: attacker.attack });
                damageToShips.set(target.id, current);
            } else {
                // Target defense - destroy Attack amount
                if (isPlayer) {
                    damageToEnemyDefense += attacker.attack;
                    attackEvents.push({ attacker: attacker.debugName, target: 'Defense', damage: attacker.attack });
                } else {
                    damageToPlayerDefense += attacker.attack;
                    attackEvents.push({ attacker: attacker.debugName, target: 'Defense', damage: attacker.attack });
                }
            }
        }

        // Defense attacks (1 attack per defense point, each deals 1 damage)
        for (let i = 0; i < playerDefenseAttacks; i++) {
            const targets = enemyUnits.filter(u => u.hp > 0);
            if (targets.length > 0) {
                const target = targets[Math.floor(Math.random() * targets.length)];
                const current = damageToShips.get(target.id) || { damage: 0, attacks: [] };
                current.damage += 1;
                current.attacks.push({ attacker: { debugName: `${playerShortName} Defense` }, damage: 1 });
                damageToShips.set(target.id, current);
            }
        }
        for (let i = 0; i < enemyDefenseAttacks; i++) {
            const targets = playerUnits.filter(u => u.hp > 0);
            if (targets.length > 0) {
                const target = targets[Math.floor(Math.random() * targets.length)];
                const current = damageToShips.get(target.id) || { damage: 0, attacks: [] };
                current.damage += 1;
                current.attacks.push({ attacker: { debugName: `${enemyShortName} Defense` }, damage: 1 });
                damageToShips.set(target.id, current);
            }
        }

        // Apply all damage simultaneously and log
        for (const unit of [...playerUnits, ...enemyUnits]) {
            if (damageToShips.has(unit.id)) {
                const info = damageToShips.get(unit.id);
                const hpBefore = unit.hp;
                unit.hp -= info.damage;
                // Log each attack with running HP
                let runningHp = hpBefore;
                for (const atk of info.attacks) {
                    runningHp -= atk.damage;
                    const attackerName = atk.attacker.debugName || atk.attacker;
                    const destroyed = runningHp <= 0 ? ' [DESTROYED]' : '';
                    const dmgStr = String(atk.damage).padStart(3, ' ');
                    const hpStr = String(Math.max(0, runningHp)).padStart(3, ' ');
                    const maxHpStr = String(unit.maxHp).padStart(3, ' ');
                    combatLog.push(`${attackerName} → ${unit.debugName} (${dmgStr} dmg, ${hpStr}/${maxHpStr} HP)${destroyed}`);
                }
            }
        }
        playerDefensePool = Math.max(0, playerDefensePool - damageToPlayerDefense);
        enemyDefensePool = Math.max(0, enemyDefensePool - damageToEnemyDefense);
    }

    // Determine casualties
    const playerShipLosses = playerUnits.filter(u => u.hp <= 0);
    const enemyShipLosses = enemyUnits.filter(u => u.hp <= 0);

    // Remove destroyed ships
    const destroyedShipIds = new Set([
        ...playerShipLosses.map(u => u.id),
        ...enemyShipLosses.map(u => u.id)
    ]);
    ships = ships.filter(s => !destroyedShipIds.has(s.id));

    // Update defense count on star
    const playerDefenseLost = startingPlayerDefense - playerDefensePool;
    const enemyDefenseLost = startingEnemyDefense - enemyDefensePool;
    if (star.owner === 'player') {
        star.defense = playerDefensePool;
    } else if (star.owner) {
        star.defense = enemyDefensePool;
    }

    // Destroy unprotected colony ships
    const playerMilitarySurvivors = playerUnits.filter(u => u.hp > 0);
    const enemyMilitarySurvivors = enemyUnits.filter(u => u.hp > 0);

    if (playerMilitarySurvivors.length === 0 && enemyMilitarySurvivors.length > 0) {
        // Enemy wins - destroy player colony ships
        const playerColonyShips = allShipsHere.filter(s => s.owner === 'player' && s.type === 'colony');
        for (const cs of playerColonyShips) {
            destroyedShipIds.add(cs.id);
        }
        ships = ships.filter(s => !playerColonyShips.some(cs => cs.id === s.id));
    } else if (enemyMilitarySurvivors.length === 0 && playerMilitarySurvivors.length > 0) {
        // Player wins - destroy enemy colony ships
        const enemyColonyShips = allShipsHere.filter(s => s.owner !== 'player' && s.type === 'colony');
        for (const cs of enemyColonyShips) {
            destroyedShipIds.add(cs.id);
        }
        ships = ships.filter(s => !enemyColonyShips.some(cs => cs.id === s.id));
    }

    // Mark ships that fought
    for (const unit of playerMilitarySurvivors) {
        shipsInCombatThisTurn.add(unit.id);
    }

    combatThisTurn = true;

    // Count survivors by type
    const playerSurvivorCounts = {};
    const enemySurvivorCounts = {};
    for (const u of playerMilitarySurvivors) {
        playerSurvivorCounts[u.type] = (playerSurvivorCounts[u.type] || 0) + 1;
    }
    for (const u of enemyMilitarySurvivors) {
        enemySurvivorCounts[u.type] = (enemySurvivorCounts[u.type] || 0) + 1;
    }

    // Format ship counts by type (for survivors and losses)
    const formatShipCounts = (counts) => {
        const parts = [];
        for (const type of getShipTypeOrder()) {
            if (counts[type]) {
                parts.push(`${counts[type]} ${SHIP_TYPES[type].name}${counts[type] > 1 ? 's' : ''}`);
            }
        }
        return parts.length > 0 ? parts.join(', ') : 'None';
    };

    // Count losses by type
    const playerLossCounts = {};
    const enemyLossCounts = {};
    for (const u of playerShipLosses) {
        playerLossCounts[u.type] = (playerLossCounts[u.type] || 0) + 1;
    }
    for (const u of enemyShipLosses) {
        enemyLossCounts[u.type] = (enemyLossCounts[u.type] || 0) + 1;
    }

    // Play sound
    AudioSystem.sfx.explosion();

    // Calculate weighted losses (by ship cost)
    const playerLossValue = playerShipLosses.reduce((sum, u) => sum + SHIP_TYPES[u.type].cost, 0);
    const enemyLossValue = enemyShipLosses.reduce((sum, u) => sum + SHIP_TYPES[u.type].cost, 0);

    // Determine battle result
    let battleResult;
    if (playerShipLosses.length === 0 && enemyShipLosses.length === 0) {
        battleResult = 'stalemate';
    } else if (enemyMilitarySurvivors.length === 0) {
        battleResult = 'victory';
    } else if (playerMilitarySurvivors.length === 0) {
        battleResult = 'defeat';
    } else if (enemyLossValue >= playerLossValue) {
        battleResult = 'progress';
    } else {
        battleResult = 'losses';
    }

    // Build result message with detailed losses
    let resultMsg = `Your losses: ${formatShipCounts(playerLossCounts)}`;
    if (playerDefenseLost > 0) resultMsg += `, ${playerDefenseLost} defense`;
    resultMsg += `\nEnemy losses: ${formatShipCounts(enemyLossCounts)}`;
    if (enemyDefenseLost > 0) resultMsg += `, ${enemyDefenseLost} defense`;
    resultMsg += `\n\nYour survivors: ${formatShipCounts(playerSurvivorCounts)}`;
    resultMsg += `\nEnemy survivors: ${formatShipCounts(enemySurvivorCounts)}`;

    // Add debug combat log if enabled
    if (debugMode && combatLog.length > 0) {
        resultMsg += `\n\n--- Combat Log ---\n${combatLog.join('\n')}`;
    }

    // Add to battle history
    battleHistory.unshift({
        turn: year,
        location: star.name,
        playerLosses: playerShipLosses.length,
        playerLossesDetail: formatShipCounts(playerLossCounts),
        enemyLosses: enemyShipLosses.length,
        enemyLossesDetail: formatShipCounts(enemyLossCounts),
        playerDefenseLost,
        enemyDefenseLost,
        playerSurvivors: formatShipCounts(playerSurvivorCounts),
        enemySurvivors: formatShipCounts(enemySurvivorCounts),
        result: battleResult
    });

    // Result display
    const resultLabels = {
        victory: 'VICTORY',
        progress: 'PROGRESS',
        losses: 'LOSSES',
        defeat: 'DEFEAT',
        stalemate: 'STALEMATE'
    };

    showModal(`⚔️ Combat at ${star.name} - ${resultLabels[battleResult]}!`, resultMsg);

    updatePanels();
    updateTurnInfo();
    saveGameState();
}

function conquerStar(starId) {
    const star = stars.find(s => s.id === starId);
    if (!star || star.owner === 'player' || !star.owner) return false;
    // Can't conquer if enemies or defense remain
    const enemiesHere = getShipsAtStar(starId).filter(s => s.owner !== 'player');
    if (enemiesHere.length > 0 || star.defense > 0) return false;
    // Must have player ships present
    const playerShipsHere = getShipsAtStar(starId).filter(s => s.owner === 'player');
    if (playerShipsHere.length === 0) return false;

    // Conquer - halve population and industry
    star.owner = 'player';
    star.population = Math.floor(star.population / 2);
    star.industry = Math.floor(star.industry / 2);
    star.explored = true;
    star.lockedSliders = [];
    star.sliders = { ship: 0, def: 0, ind: 50, eco: 50 };
    star.shipProgress = { scout: 0, fighter: 0, destroyer: 0, cruiser: 0, battleship: 0, colony: 0 };
    star.buildingShip = null;
    star.defenseProgress = 0;
    star.colonizedYear = year;
    star.aiPhase = undefined;
    // Track conquest event
    eventHistory.unshift({
        year: year,
        type: 'conquest',
        text: `Conquered ${star.name}`
    });
    AudioSystem.sfx.levelComplete();
    updatePanels();
    updateTurnInfo();
    saveGameState();
    return true;
}

// Expose to window for HTML onclick handlers
window.startCombat = startCombat;
window.conquerStar = conquerStar;
