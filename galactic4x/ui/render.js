// ============================================
// RENDER - Canvas Drawing Functions
// ============================================

function renderBackground() {
    ctx.fillStyle = CONFIG.COLORS.background;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    ctx.strokeStyle = CONFIG.COLORS.grid;
    ctx.lineWidth = 0.5;
    for (let x = 0; x < CONFIG.WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CONFIG.HEIGHT);
        ctx.stroke();
    }
    for (let y = 0; y < CONFIG.HEIGHT; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CONFIG.WIDTH, y);
        ctx.stroke();
    }
    // Draw background stars with variety
    for (let i = 0; i < 150; i++) {
        const x = (i * 97 + 23) % CONFIG.WIDTH;
        const y = (i * 53 + 17) % CONFIG.HEIGHT;
        const brightness = 40 + (i * 7) % 60; // 40-100 brightness
        const starType = i % 5; // 0-4 for variety

        if (starType === 0) {
            // Bright + shaped star
            ctx.fillStyle = `rgb(${brightness + 50}, ${brightness + 50}, ${brightness + 80})`;
            ctx.fillRect(x - 1, y, 3, 1);
            ctx.fillRect(x, y - 1, 1, 3);
        } else if (starType === 1) {
            // Larger dot
            ctx.fillStyle = `rgb(${brightness + 30}, ${brightness + 20}, ${brightness})`;
            ctx.fillRect(x, y, 2, 2);
        } else if (starType === 2) {
            // Bright single pixel
            ctx.fillStyle = `rgb(${brightness + 60}, ${brightness + 60}, ${brightness + 60})`;
            ctx.fillRect(x, y, 1, 1);
        } else {
            // Dim single pixel
            ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness + 10})`;
            ctx.fillRect(x, y, 1, 1);
        }
    }
}

function getStarColor(star) {
    switch (star.starType) {
        case 'yellow': return CONFIG.COLORS.starYellow;
        case 'red': return CONFIG.COLORS.starRed;
        case 'blue': return CONFIG.COLORS.starBlue;
        case 'white': return CONFIG.COLORS.starWhite;
    }
    return CONFIG.COLORS.starYellow;
}

function renderStars() {
    // Draw travel lines for ships in transit and ship progress
    ctx.strokeStyle = player.color;
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;

    // Group ships by route for cleaner display
    const shipsByRoute = new Map(); // "originId-destId" -> ships[]
    for (const ship of ships) {
        if (ship.destination !== null && ship.owner === 'player') {
            const routeKey = `${ship.location}-${ship.destination}`;
            if (!shipsByRoute.has(routeKey)) {
                shipsByRoute.set(routeKey, []);
            }
            shipsByRoute.get(routeKey).push(ship);
        }
    }

    // Draw lines and ship progress indicators
    for (const [routeKey, routeShips] of shipsByRoute) {
        const origin = stars.find(s => s.id === routeShips[0].location);
        const dest = stars.find(s => s.id === routeShips[0].destination);
        if (origin && dest) {
            // Draw dotted line
            ctx.beginPath();
            ctx.moveTo(origin.x, origin.y);
            ctx.lineTo(dest.x, dest.y);
            ctx.stroke();

            // Draw ship progress indicators (only for multi-turn journeys)
            for (const ship of routeShips) {
                const totalTurns = ship.totalTurns || ship.turnsToArrival;
                if (totalTurns > 1) {
                    // Calculate progress (0 = at origin, 1 = at destination)
                    const progress = (totalTurns - ship.turnsToArrival) / totalTurns;
                    const shipX = origin.x + (dest.x - origin.x) * progress;
                    const shipY = origin.y + (dest.y - origin.y) * progress;

                    // Draw ship indicator circle
                    ctx.setLineDash([]);
                    ctx.fillStyle = player.color;
                    ctx.beginPath();
                    ctx.arc(shipX, shipY, 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.setLineDash([5, 5]);
                }
            }
        }
    }
    ctx.setLineDash([]);

    // Draw destination preview line
    if (destinationStar && selectedStar && selectedShips.length > 0) {
        ctx.strokeStyle = CONFIG.COLORS.destination;
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(selectedStar.x, selectedStar.y);
        ctx.lineTo(destinationStar.x, destinationStar.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Travel time label
        const travelInfo = calculateTravelInfo(selectedStar, destinationStar, selectedShips);
        const midX = (selectedStar.x + destinationStar.x) / 2;
        const midY = (selectedStar.y + destinationStar.y) / 2;
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(midX - 35, midY - 10, 70, 20);
        ctx.fillStyle = CONFIG.COLORS.destination;
        ctx.font = '10px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(`${travelInfo.turns} turns`, midX, midY + 4);
    }

    for (const star of stars) {
        const isSelected = selectedStar && selectedStar.id === star.id;
        const isDestination = destinationStar && destinationStar.id === star.id;
        const isHovered = hoveredStar && hoveredStar.id === star.id;
        const shipsHere = getShipsAtStar(star.id).filter(s => s.owner === 'player');
        // Only show enemy ships for explored planets
        const enemyShipsHere = star.explored ? getShipsAtStar(star.id).filter(s => s.owner !== 'player') : [];

        // Destination ring
        if (isDestination) {
            ctx.strokeStyle = CONFIG.COLORS.destination;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(star.x, star.y, 24, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Selection ring
        if (isSelected) {
            ctx.strokeStyle = player.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(star.x, star.y, 22, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Hover ring
        if (isHovered && !isSelected && !isDestination) {
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(star.x, star.y, 20, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Owner indicator ring
        if (star.owner === 'player') {
            ctx.strokeStyle = player.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(star.x, star.y, 16, 0, Math.PI * 2);
            ctx.stroke();
        } else if (star.owner) {
            // Enemy colony ring
            const enemyRace = RACES.find(r => r.id === star.owner);
            if (enemyRace) {
                ctx.strokeStyle = enemyRace.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(star.x, star.y, 16, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Star glow
        if (star.explored) {
            const gradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, 15);
            gradient.addColorStop(0, getStarColor(star));
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(star.x, star.y, 15, 0, Math.PI * 2);
            ctx.fill();
        }

        // Star core
        ctx.fillStyle = star.explored ? getStarColor(star) : CONFIG.COLORS.unexplored;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.explored ? 6 : 4, 0, Math.PI * 2);
        ctx.fill();

        // Star name
        ctx.fillStyle = star.explored ? '#fff' : '#666';
        ctx.font = '10px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(star.name, star.x, star.y + 28);

        // Ship counts - center the pair if both present
        ctx.font = 'bold 10px Courier New';
        const hasPlayer = shipsHere.length > 0;
        const hasEnemy = enemyShipsHere.length > 0;
        const enemyColor = hasEnemy ? (RACES.find(r => r.id === enemyShipsHere[0].owner)?.color || '#ff6b6b') : '#ff6b6b';

        if (hasPlayer && hasEnemy) {
            // Both present - center the pair
            ctx.fillStyle = player.color;
            ctx.fillText(`[${shipsHere.length}]`, star.x - 13, star.y - 20);
            ctx.fillStyle = enemyColor;
            ctx.fillText(`[${enemyShipsHere.length}]`, star.x + 13, star.y - 20);
        } else if (hasPlayer) {
            ctx.fillStyle = player.color;
            ctx.fillText(`[${shipsHere.length}]`, star.x, star.y - 20);
        } else if (hasEnemy) {
            ctx.fillStyle = enemyColor;
            ctx.fillText(`[${enemyShipsHere.length}]`, star.x, star.y - 20);
        }

        // Planet type (when selected)
        if (star.explored && isSelected) {
            const planetInfo = PLANET_TYPES[star.planetType];
            ctx.fillStyle = planetInfo.color;
            ctx.font = '9px Courier New';
            ctx.fillText(planetInfo.name, star.x, star.y + 38);
        }
    }
}

function renderTitle() {
    renderBackground();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    ctx.fillStyle = '#4ecdc4';
    ctx.font = 'bold 48px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('GALACTIC 4X', CONFIG.WIDTH / 2, 150);

    ctx.fillStyle = '#888';
    ctx.font = '16px Courier New';
    ctx.fillText('Explore, Expand, Exploit, Exterminate', CONFIG.WIDTH / 2, 190);

    ctx.font = '16px Courier New';
    if (hasSaveGame) {
        ctx.fillStyle = '#ffe66d';
        ctx.fillText('[ Continue ]', CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 50);
        ctx.fillStyle = '#4ecdc4';
        ctx.fillText('[ New Game ]', CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 90);
        ctx.fillStyle = '#888';
        ctx.fillText('[ Load Game ]', CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 130);
    } else {
        ctx.fillStyle = '#ffe66d';
        ctx.fillText('[ New Game ]', CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 50);
        ctx.fillStyle = '#888';
        ctx.fillText('[ Load Game ]', CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 90);
    }

    ctx.fillStyle = '#666';
    ctx.font = '12px Courier New';
    ctx.fillText('Build your galactic empire across the stars', CONFIG.WIDTH / 2, CONFIG.HEIGHT - 100);
}

function renderRaceSelect() {
    renderBackground();
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    ctx.fillStyle = '#4ecdc4';
    ctx.font = 'bold 28px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('SELECT YOUR RACE', CONFIG.WIDTH / 2, 80);

    const raceY = 120;
    const raceHeight = 50;

    for (let i = 0; i < RACES.length; i++) {
        const race = RACES[i];
        const y = raceY + i * raceHeight;
        const isHovered = i === raceSelectIndex;

        if (isHovered) {
            ctx.fillStyle = 'rgba(78, 205, 196, 0.2)';
            ctx.fillRect(100, y, CONFIG.WIDTH - 200, raceHeight - 5);
        }

        ctx.fillStyle = race.color;
        ctx.font = isHovered ? 'bold 16px Courier New' : '14px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText(race.name, 120, y + 20);

        ctx.fillStyle = '#888';
        ctx.font = '11px Courier New';
        ctx.fillText(race.desc, 120, y + 36);

        if (isHovered) {
            ctx.fillStyle = race.color;
            ctx.fillText('>', 105, y + 20);
        }
    }

    ctx.fillStyle = '#666';
    ctx.font = '12px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('Use arrows or click to select, Enter to confirm', CONFIG.WIDTH / 2, CONFIG.HEIGHT - 40);
}

function renderPlaying() {
    renderBackground();
    renderStars();

    // Turn counter
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(CONFIG.WIDTH - 100, 10, 90, 30);
    ctx.strokeStyle = '#4a4a6a';
    ctx.strokeRect(CONFIG.WIDTH - 100, 10, 90, 30);
    ctx.fillStyle = '#ffe66d';
    ctx.font = 'bold 12px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('Year ' + year, CONFIG.WIDTH - 55, 30);
}

function draw() {
    switch (state) {
        case GameState.TITLE:
            renderTitle();
            break;
        case GameState.RACE_SELECT:
            renderRaceSelect();
            break;
        case GameState.PLAYING:
        case GameState.END_TURN:
            renderPlaying();
            break;
    }
}
