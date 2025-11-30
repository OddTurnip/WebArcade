// ============================================
// OVERVIEW PANEL - Empire and Fleet Overview
// ============================================

function renderOverviewLeftPanel() {
    let colonies = getPlayerColonies();
    let html = '<div class="panel-title">Empire Overview</div>';

    if (colonies.length === 0) {
        html += '<div class="empty-state">No colonies yet</div>';
    } else {
        // Sort buttons
        html += '<div style="margin-bottom:6px;display:flex;gap:4px;flex-wrap:wrap;">';
        const sortOptions = [
            { key: 'name', label: 'Name' },
            { key: 'age', label: 'Age' },
            { key: 'dev', label: 'Dev' },
            { key: 'defense', label: 'Def' }
        ];
        for (const opt of sortOptions) {
            const active = overviewSort === opt.key ? 'background:#4ecdc4;color:#1a1a2e;' : '';
            html += `<button class="btn btn-sm" style="padding:2px 6px;font-size:9px;${active}" onclick="setOverviewSort('${opt.key}')">${opt.label}</button>`;
        }
        html += '</div>';

        // Sort colonies
        colonies = [...colonies].sort((a, b) => {
            switch (overviewSort) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'age':
                    return (a.colonizedYear || 1) - (b.colonizedYear || 1);
                case 'dev':
                    return getColonyDevPercent(b) - getColonyDevPercent(a);
                case 'defense':
                    return b.defense - a.defense;
                default:
                    return 0;
            }
        });

        for (const colony of colonies) {
            const planetInfo = PLANET_TYPES[colony.planetType];
            const devPercent = getColonyDevPercent(colony);
            const age = year - (colony.colonizedYear || 1);

            html += `<div class="empire-planet" onclick="selectStar(${colony.id})" style="cursor:pointer;padding:6px;margin:4px 0;background:#252540;border-radius:4px;">`;
            html += `<div style="color:${planetInfo.color};font-weight:bold;font-size:11px;">${colony.name} <span style="color:#888;font-weight:normal;">(${age})</span></div>`;
            html += `<div style="font-size:10px;color:#888;">`;
            html += `Dev: ${devPercent}% | Def: ${colony.defense}`;
            html += `</div>`;

            // Show ship production on separate row (only if producing)
            if (colony.buildingShip) {
                const prod = calculateProduction(colony);
                if (prod.ship >= 1) {
                    const shipType = SHIP_TYPES[colony.buildingShip];
                    const progress = colony.shipProgress[colony.buildingShip] || 0;
                    const pct = Math.floor((progress / shipType.cost) * 100);
                    const shipsPerTurn = prod.ship / shipType.cost;

                    html += `<div style="font-size:10px;color:#4ecdc4;">`;
                    html += `${shipType.name}: ${pct}%`;
                    if (shipsPerTurn >= 0.01) {
                        html += ` (${shipsPerTurn.toFixed(2)}/year)`;
                    }
                    html += `</div>`;
                }
            }
            html += `</div>`;
        }
    }

    return html;
}

function renderOverviewRightPanel() {
    const playerShips = ships.filter(s => s.owner === 'player');
    let html = '<div class="panel-title">Fleet Overview</div>';

    if (playerShips.length === 0) {
        html += '<div class="empty-state">No ships yet</div>';
    } else {
        // Group ships by location (and destination for in-transit)
        const locations = new Map(); // starId -> { stationed: [], incoming: [] }

        for (const ship of playerShips) {
            if (ship.destination !== null) {
                // In transit - group by destination
                if (!locations.has(ship.destination)) {
                    locations.set(ship.destination, { stationed: [], incoming: [] });
                }
                locations.get(ship.destination).incoming.push(ship);
            } else {
                // Stationed
                if (!locations.has(ship.location)) {
                    locations.set(ship.location, { stationed: [], incoming: [] });
                }
                locations.get(ship.location).stationed.push(ship);
            }
        }

        // Sort by star name
        const sortedLocations = [...locations.entries()].sort((a, b) => {
            const starA = stars.find(s => s.id === a[0]);
            const starB = stars.find(s => s.id === b[0]);
            return (starA?.name || '').localeCompare(starB?.name || '');
        });

        for (const [starId, fleets] of sortedLocations) {
            const star = stars.find(s => s.id === starId);
            if (!star) continue;

            html += `<div class="fleet-location" onclick="selectStar(${starId})" style="cursor:pointer;padding:6px;margin:4px 0;background:#252540;border-radius:4px;">`;
            html += `<div style="color:#4ecdc4;font-weight:bold;font-size:11px;">${star.name}</div>`;

            // Count ships by type for stationed
            if (fleets.stationed.length > 0) {
                const counts = {};
                for (const ship of fleets.stationed) {
                    counts[ship.type] = (counts[ship.type] || 0) + 1;
                }
                const parts = [];
                for (const type of getShipTypeOrder()) {
                    if (counts[type]) {
                        parts.push(`${counts[type]} ${SHIP_TYPES[type].name}${counts[type] > 1 ? 's' : ''}`);
                    }
                }
                html += `<div style="font-size:10px;color:#888;">${parts.join(', ')}</div>`;
            }

            // Count ships by type for incoming
            if (fleets.incoming.length > 0) {
                const counts = {};
                let maxEta = 0;
                for (const ship of fleets.incoming) {
                    counts[ship.type] = (counts[ship.type] || 0) + 1;
                    maxEta = Math.max(maxEta, ship.turnsToArrival);
                }
                const parts = [];
                for (const type of getShipTypeOrder()) {
                    if (counts[type]) {
                        parts.push(`${counts[type]} ${SHIP_TYPES[type].name}${counts[type] > 1 ? 's' : ''}`);
                    }
                }
                html += `<div style="font-size:10px;color:#ffe66d;">→ ${parts.join(', ')} (${maxEta}t)</div>`;
            }

            html += `</div>`;
        }
    }

    return html;
}

// Expose sort setter
window.setOverviewSort = function(sortKey) {
    overviewSort = sortKey;
    updatePanels();
};
