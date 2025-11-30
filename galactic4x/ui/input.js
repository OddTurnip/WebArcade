// ============================================
// INPUT - Event Handlers
// ============================================

function getStarAtPosition(x, y) {
    for (const star of stars) {
        const dist = Math.sqrt((x - star.x) ** 2 + (y - star.y) ** 2);
        if (dist < 20) {
            return star;
        }
    }
    return null;
}

function initInputHandlers() {
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - 4; // Account for 4px border
        const y = e.clientY - rect.top - 4;

        AudioSystem.unlock();

        if (state === GameState.TITLE) {
            if (hasSaveGame) {
                // Continue (y: +30 to +60)
                if (y >= CONFIG.HEIGHT / 2 + 30 && y <= CONFIG.HEIGHT / 2 + 60) {
                    if (loadGameState()) {
                        state = GameState.PLAYING;
                        actionPanel.classList.remove('hidden');
                        planetPanel.classList.remove('hidden');
                        fleetPanel.classList.remove('hidden');
                        updateTurnInfo();
                        updatePanels();
                        AudioSystem.sfx.select();
                        AudioSystem.music.start('4x');
                    }
                    return;
                }
                // New Game (y: +70 to +100)
                if (y >= CONFIG.HEIGHT / 2 + 70 && y <= CONFIG.HEIGHT / 2 + 100) {
                    clearSaveGame();
                    state = GameState.RACE_SELECT;
                    AudioSystem.sfx.select();
                    return;
                }
                // Load Game (y: +110 to +140)
                if (y >= CONFIG.HEIGHT / 2 + 110 && y <= CONFIG.HEIGHT / 2 + 140) {
                    document.getElementById('loadFileInput').click();
                    AudioSystem.sfx.select();
                    return;
                }
            } else {
                // New Game (y: +30 to +60)
                if (y >= CONFIG.HEIGHT / 2 + 30 && y <= CONFIG.HEIGHT / 2 + 60) {
                    state = GameState.RACE_SELECT;
                    AudioSystem.sfx.select();
                    return;
                }
                // Load Game (y: +70 to +100)
                if (y >= CONFIG.HEIGHT / 2 + 70 && y <= CONFIG.HEIGHT / 2 + 100) {
                    document.getElementById('loadFileInput').click();
                    AudioSystem.sfx.select();
                    return;
                }
            }
            return;
        }

        if (state === GameState.RACE_SELECT) {
            const raceY = 120;
            const raceHeight = 50;
            for (let i = 0; i < RACES.length; i++) {
                const ry = raceY + i * raceHeight;
                if (y >= ry && y < ry + raceHeight && x >= 100 && x <= CONFIG.WIDTH - 100) {
                    player.race = RACES[i];
                    player.color = RACES[i].color;
                    initGame();
                    state = GameState.PLAYING;
                    AudioSystem.sfx.levelComplete();
                    AudioSystem.music.start('4x');
                    saveGameState();
                    return;
                }
            }
            return;
        }

        if (state === GameState.PLAYING) {
            const clickedStar = getStarAtPosition(x, y);

            // If ships are selected and we click a different star, set it as destination
            if (selectedShips.length > 0 && clickedStar && clickedStar !== selectedStar) {
                destinationStar = clickedStar;
                AudioSystem.sfx.select();
                updatePanels();
                return;
            }

            // Otherwise, select the star (or deselect if clicking empty space)
            if (clickedStar) {
                selectedStar = clickedStar;
                selectedShips = [];
                destinationStar = null;
                currentView = ViewState.COLONY;
                AudioSystem.sfx.select();
                updatePanels();
            } else if (selectedShips.length === 0) {
                // Only deselect if no ships are selected (preserve selection for movement)
                selectedStar = null;
                destinationStar = null;
                updatePanels();
            }
            // If ships are selected and clicking empty space, do nothing (keep selection)
        }
    });

    canvas.addEventListener('dblclick', (e) => {
        if (state !== GameState.PLAYING) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - 4;
        const y = e.clientY - rect.top - 4;
        const clickedStar = getStarAtPosition(x, y);

        if (!clickedStar) return;

        // If ships are selected, double-click moves them to that destination
        if (selectedShips.length > 0 && clickedStar !== selectedStar) {
            moveShips(selectedShips, clickedStar.id);
            return;
        }

        // If no ships selected, double-click selects all player ships at that star
        const playerShipsHere = getShipsAtStar(clickedStar.id).filter(s => s.owner === 'player');
        if (playerShipsHere.length > 0) {
            selectedStar = clickedStar;
            selectedShips = playerShipsHere.map(s => s.id);
            destinationStar = null;
            currentView = ViewState.COLONY;
            AudioSystem.sfx.select();
            updatePanels();
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - 4; // Account for 4px border
        const y = e.clientY - rect.top - 4;
        if (state === GameState.PLAYING) {
            hoveredStar = getStarAtPosition(x, y);
        }
    });

    document.addEventListener('keydown', (e) => {
        AudioSystem.unlock();

        // ESC closes modal if open
        if (e.key === 'Escape' && !gameModal.classList.contains('hidden')) {
            closeModal();
            return;
        }

        if (state === GameState.TITLE) {
            if (e.key === 'Enter' || e.key === ' ') {
                if (hasSaveGame && loadGameState()) {
                    state = GameState.PLAYING;
                    actionPanel.classList.remove('hidden');
                    planetPanel.classList.remove('hidden');
                    fleetPanel.classList.remove('hidden');
                    updateTurnInfo();
                    updatePanels();
                    AudioSystem.sfx.select();
                    AudioSystem.music.start('4x');
                } else {
                    state = GameState.RACE_SELECT;
                    AudioSystem.sfx.select();
                }
            }
            return;
        }

        if (state === GameState.RACE_SELECT) {
            if (e.key === 'ArrowUp') {
                raceSelectIndex = (raceSelectIndex - 1 + RACES.length) % RACES.length;
                AudioSystem.sfx.select();
            } else if (e.key === 'ArrowDown') {
                raceSelectIndex = (raceSelectIndex + 1) % RACES.length;
                AudioSystem.sfx.select();
            } else if (e.key === 'Enter' || e.key === ' ') {
                player.race = RACES[raceSelectIndex];
                player.color = RACES[raceSelectIndex].color;
                initGame();
                state = GameState.PLAYING;
                AudioSystem.sfx.levelComplete();
                AudioSystem.music.start('4x');
                saveGameState();
            }
            return;
        }

        if (state === GameState.PLAYING) {
            if (e.key === 'Enter') {
                if (destinationStar && selectedShips.length > 0) {
                    moveShips(selectedShips, destinationStar.id);
                } else {
                    processTurn();
                }
                AudioSystem.sfx.select();
            } else if (e.key === 'Escape') {
                if (destinationStar) {
                    destinationStar = null;
                } else if (selectedShips.length > 0) {
                    selectedShips = [];
                } else {
                    selectedStar = null;
                }
                updatePanels();
            }
        }
    });
}

// ============================================
// GLOBAL UI CALLBACKS (window functions)
// ============================================

window.previewSlider = function(starId, sliderKey, value) {
    const star = stars.find(s => s.id === starId);
    if (!star) return;
    value = parseInt(value);

    // Create a temporary copy of sliders to calculate preview
    const tempSliders = {...star.sliders};
    tempSliders[sliderKey] = value;

    // Calculate how other sliders would adjust
    const lockStates = {};
    for (const key of Object.keys(star.sliders)) {
        lockStates[key] = getSliderLockState(star, key);
    }
    const unlockedKeys = Object.keys(star.sliders).filter(k =>
        k !== sliderKey && !lockStates[k].locked
    );
    const total = Object.values(tempSliders).reduce((a, b) => a + b, 0);
    const diff = total - 100;

    if (diff !== 0 && unlockedKeys.length > 0) {
        const unlockedTotal = unlockedKeys.reduce((sum, k) => sum + tempSliders[k], 0);
        if (unlockedTotal === 0) {
            const perSlider = Math.floor(diff / unlockedKeys.length);
            for (const key of unlockedKeys) {
                tempSliders[key] = Math.max(0, -perSlider);
            }
        } else {
            for (const key of unlockedKeys) {
                const proportion = tempSliders[key] / unlockedTotal;
                tempSliders[key] = Math.max(0, Math.round(tempSliders[key] - diff * proportion));
            }
        }
        // Fix rounding
        const finalTotal = Object.values(tempSliders).reduce((a, b) => a + b, 0);
        if (finalTotal !== 100 && unlockedKeys.length > 0) {
            tempSliders[unlockedKeys[0]] += (100 - finalTotal);
        }
    }

    // Calculate preview production
    const prod = calculateProduction(star, tempSliders);
    const planetInfo = PLANET_TYPES[star.planetType];

    // Update all slider displays
    const sliderTypes = [
        { key: 'ship', prodKey: 'ship', prodLabel: 'prod' },
        { key: 'def', prodKey: 'def', prodLabel: 'def' },
        { key: 'ind', prodKey: 'ind', prodLabel: '% ind' },
        { key: 'eco', prodKey: 'eco', prodLabel: 'pop' }
    ];

    for (const slider of sliderTypes) {
        const valEl = document.getElementById(`slider-val-${starId}-${slider.key}`);
        const prodEl = document.getElementById(`slider-prod-${starId}-${slider.key}`);
        if (valEl) valEl.textContent = `${tempSliders[slider.key]}%`;
        if (prodEl) {
            const isMaxed = (slider.key === 'ind' && star.industry >= 100) ||
                           (slider.key === 'eco' && star.population >= planetInfo.maxPop);
            if (!isMaxed) {
                if (slider.key === 'eco' || slider.key === 'ind') {
                    prodEl.textContent = `+${prod[slider.prodKey].toFixed(1)} ${slider.prodLabel}/year`;
                } else {
                    prodEl.textContent = `+${prod[slider.prodKey]} ${slider.prodLabel}/year`;
                }
            }
        }
    }
};

window.adjustSlider = function(starId, sliderKey, value) {
    const star = stars.find(s => s.id === starId);
    if (!star) return;
    value = parseInt(value);
    normalizeSliders(star, sliderKey, value);
    updatePanels();
    saveGameState();
};

window.toggleSliderLock = function(starId, sliderKey) {
    const star = stars.find(s => s.id === starId);
    if (!star) return;
    if (!star.lockedSliders) star.lockedSliders = [];
    const idx = star.lockedSliders.indexOf(sliderKey);
    if (idx >= 0) {
        star.lockedSliders.splice(idx, 1);
    } else {
        star.lockedSliders.push(sliderKey);
    }
    updatePanels();
    saveGameState();
};

window.selectStar = function(starId) {
    const star = stars.find(s => s.id === starId);
    if (!star) return;
    selectedStar = star;
    selectedShips = [];
    destinationStar = null;
    currentView = ViewState.COLONY;
    updatePanels();
    draw();
};

window.showView = function(viewId) {
    // Colony view requires a selected star
    if (viewId === ViewState.COLONY && !selectedStar) return;

    // Views other than Colony and Planets clear selection
    if (viewId !== ViewState.COLONY && viewId !== ViewState.PLANETS) {
        selectedStar = null;
        selectedShips = [];
        destinationStar = null;
    }

    currentView = viewId;
    updatePanels();
    draw();
};

window.showOverview = function() {
    window.showView(ViewState.OVERVIEW);
};

window.showHistory = function() {
    window.showView(ViewState.HISTORY);
};

window.selectStarById = function(starId) {
    const star = stars.find(s => s.id === starId);
    if (star) {
        selectedStar = star;
        selectedShips = [];
        destinationStar = null;
        currentView = ViewState.COLONY;
        updatePanels();
        draw();
    }
};

window.toggleShipSelection = function(shipId) {
    const idx = selectedShips.indexOf(shipId);
    if (idx >= 0) {
        selectedShips.splice(idx, 1);
    } else {
        selectedShips.push(shipId);
    }
    // Clear destination when selection changes
    destinationStar = null;
    updatePanels();
};

window.toggleSelectAll = function() {
    const shipsHere = getShipsAtStar(selectedStar.id).filter(s => s.owner === 'player');
    if (selectedShips.length === shipsHere.length) {
        selectedShips = [];
    } else {
        selectedShips = shipsHere.map(s => s.id);
    }
    destinationStar = null;
    updatePanels();
};

window.selectShipsOfType = function(type, count) {
    if (!selectedStar) return;
    const shipsHere = getShipsAtStar(selectedStar.id).filter(s => s.owner === 'player' && s.type === type);
    let added = 0;
    for (const ship of shipsHere) {
        if (added >= count) break;
        if (!selectedShips.includes(ship.id)) {
            selectedShips.push(ship.id);
            added++;
        }
    }
    destinationStar = null;
    updatePanels();
};

window.deselectShipsOfType = function(type, count) {
    if (!selectedStar) return;
    const shipsHere = getShipsAtStar(selectedStar.id).filter(s => s.owner === 'player' && s.type === type);
    let removed = 0;
    for (const ship of shipsHere) {
        if (removed >= count) break;
        const idx = selectedShips.indexOf(ship.id);
        if (idx >= 0) {
            selectedShips.splice(idx, 1);
            removed++;
        }
    }
    destinationStar = null;
    updatePanels();
};

window.setShipTypeSelection = function(type, targetCount) {
    if (!selectedStar) return;
    const shipsHere = getShipsAtStar(selectedStar.id).filter(s => s.owner === 'player' && s.type === type);

    // Count currently selected of this type
    let currentCount = 0;
    for (const ship of shipsHere) {
        if (selectedShips.includes(ship.id)) currentCount++;
    }

    if (targetCount > currentCount) {
        // Add more
        for (const ship of shipsHere) {
            if (currentCount >= targetCount) break;
            if (!selectedShips.includes(ship.id)) {
                selectedShips.push(ship.id);
                currentCount++;
            }
        }
    } else if (targetCount < currentCount) {
        // Remove some
        for (const ship of shipsHere) {
            if (currentCount <= targetCount) break;
            const idx = selectedShips.indexOf(ship.id);
            if (idx >= 0) {
                selectedShips.splice(idx, 1);
                currentCount--;
            }
        }
    }
    destinationStar = null;
    updatePanels();
};

window.confirmMove = function() {
    if (destinationStar && selectedShips.length > 0) {
        // Filter out ships that were in combat this turn
        const movableShips = selectedShips.filter(id => !shipsInCombatThisTurn.has(id));
        if (movableShips.length > 0) {
            moveShips(movableShips, destinationStar.id);
        }
    }
};

window.cancelMove = function() {
    destinationStar = null;
    updatePanels();
};

window.endTurn = function() {
    processTurn();
    AudioSystem.sfx.select();
};
