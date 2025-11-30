// ============================================
// GALAXY GENERATION
// ============================================

function generateGalaxy() {
    stars = [];
    ships = [];
    nextShipId = 1;
    const shuffledNames = [...STAR_NAMES].sort(() => Math.random() - 0.5);

    for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
        let attempts = 0;
        let x, y, valid;

        do {
            x = 50 + Math.random() * (CONFIG.WIDTH - 100);
            y = 50 + Math.random() * (CONFIG.HEIGHT - 100);
            valid = true;
            for (const star of stars) {
                const dist = Math.sqrt((x - star.x) ** 2 + (y - star.y) ** 2);
                if (dist < CONFIG.MIN_STAR_DISTANCE) {
                    valid = false;
                    break;
                }
            }
            attempts++;
        } while (!valid && attempts < 100);

        if (!valid) continue;

        const starTypes = ['yellow', 'red', 'blue', 'white'];
        const starType = starTypes[Math.floor(Math.random() * starTypes.length)];

        let planetType;
        const roll = Math.random();
        if (roll < 0.1) planetType = 'terran';
        else if (roll < 0.2) planetType = 'ocean';
        else if (roll < 0.35) planetType = 'jungle';
        else if (roll < 0.5) planetType = 'arid';
        else if (roll < 0.65) planetType = 'desert';
        else if (roll < 0.75) planetType = 'tundra';
        else if (roll < 0.85) planetType = 'barren';
        else if (roll < 0.93) planetType = 'inferno';
        else planetType = 'toxic';

        stars.push({
            id: i,
            name: shuffledNames[i] || `Star-${i}`,
            x: x,
            y: y,
            starType: starType,
            planetType: planetType,
            owner: null,
            explored: false,
            population: 0,
            industry: 0,
            defense: 0,
            defenseProgress: 0,
            // Default sliders: 50% eco, 50% industry (no ship production until queued)
            sliders: { ship: 0, def: 0, ind: 50, eco: 50 },
            lockedSliders: [],
            shipProgress: { scout: 0, fighter: 0, destroyer: 0, cruiser: 0, battleship: 0, colony: 0 },
            buildingShip: null
        });
    }

    let homeStar = stars.find(s => s.planetType === 'terran') ||
                   stars.find(s => s.planetType === 'ocean') ||
                   stars[0];

    homeStar.owner = 'player';
    homeStar.explored = true;
    homeStar.population = 40;
    homeStar.industry = 20;
    homeStar.defense = 5;
    homeStar.planetType = 'terran';
    homeStar.colonizedYear = 1;

    ships.push({
        id: nextShipId++,
        type: 'scout',
        owner: 'player',
        location: homeStar.id,
        destination: null,
        turnsToArrival: 0
    });
    ships.push({
        id: nextShipId++,
        type: 'scout',
        owner: 'player',
        location: homeStar.id,
        destination: null,
        turnsToArrival: 0
    });
    ships.push({
        id: nextShipId++,
        type: 'colony',
        owner: 'player',
        location: homeStar.id,
        destination: null,
        turnsToArrival: 0
    });

    // Get enemy factions (all races except player's)
    const enemyRaces = RACES.filter(r => r.id !== player.race.id);
    const militaryShipTypes = Object.keys(SHIP_TYPES).filter(k => SHIP_TYPES[k].military);

    // Add random military ship guardians to each non-player planet
    for (const star of stars) {
        if (star.id === homeStar.id) continue; // Skip player's home
        if (PLANET_TYPES[star.planetType].maxPop === 0) continue; // Skip uninhabitable

        const randomEnemy = enemyRaces[Math.floor(Math.random() * enemyRaces.length)];
        const randomShipType = militaryShipTypes[Math.floor(Math.random() * militaryShipTypes.length)];

        ships.push({
            id: nextShipId++,
            type: randomShipType,
            owner: randomEnemy.id,
            location: star.id,
            destination: null,
            turnsToArrival: 0
        });
    }

    // Pick one enemy faction to get a homeworld
    const enemyWithHomeworld = enemyRaces[Math.floor(Math.random() * enemyRaces.length)];

    // Find a good planet for enemy homeworld (prefer terran/ocean, away from player)
    const candidatePlanets = stars.filter(s =>
        s.id !== homeStar.id &&
        PLANET_TYPES[s.planetType].maxPop >= 80
    );

    if (candidatePlanets.length > 0) {
        // Sort by distance from player (prefer far away)
        candidatePlanets.sort((a, b) => {
            const distA = Math.hypot(a.x - homeStar.x, a.y - homeStar.y);
            const distB = Math.hypot(b.x - homeStar.x, b.y - homeStar.y);
            return distB - distA;
        });

        const enemyHome = candidatePlanets[0];
        enemyHome.owner = enemyWithHomeworld.id;
        enemyHome.population = 40;
        enemyHome.industry = 20;
        enemyHome.defense = 5;
        enemyHome.colonizedYear = 1;
        enemyHome.sliders = { ship: 0, def: 0, ind: 50, eco: 50 }; // Start with industry/eco
        enemyHome.aiPhase = 'growth'; // Track AI production phase

        // Remove any guardian ship at enemy homeworld (they own it)
        ships = ships.filter(s => !(s.location === enemyHome.id && s.owner !== 'player'));

        // Give enemy a starting fleet at their homeworld
        ships.push({
            id: nextShipId++,
            type: 'destroyer',
            owner: enemyWithHomeworld.id,
            location: enemyHome.id,
            destination: null,
            turnsToArrival: 0
        });
    }
}
