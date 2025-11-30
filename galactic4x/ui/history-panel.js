// ============================================
// HISTORY PANEL - Events & Battles
// ============================================

function renderHistoryLeftPanel() {
    let html = '<div class="panel-title">Event History</div>';
    html += '<div style="max-height:450px;overflow-y:auto;">';
    if (eventHistory.length === 0) {
        html += '<div class="empty-state">No events yet</div>';
    } else {
        for (const event of eventHistory) {
            let eventColor = '#888';
            if (event.type === 'colony') eventColor = '#4ecdc4';
            else if (event.type === 'conquest') eventColor = '#ffe66d';
            else if (event.type === 'scout') eventColor = '#9932cc';
            else if (event.type === 'built') eventColor = '#4a9fff';

            html += `<div style="padding:4px 6px;margin:2px 0;background:#252540;border-radius:4px;border-left:3px solid ${eventColor};">`;
            html += `<span style="color:#ffe66d;font-size:12px;">Year ${event.year}:</span> `;
            html += `<span style="color:${eventColor};font-size:12px;">${event.text}</span>`;
            html += `</div>`;
        }
    }
    html += '</div>';

    return html;
}

function renderHistoryRightPanel() {
    let html = '<div class="panel-title">Battle History</div>';
    html += '<div style="max-height:450px;overflow-y:auto;">';
    if (battleHistory.length === 0) {
        html += '<div class="empty-state">No battles yet</div>';
    } else {
        for (const battle of battleHistory) {
            // Support old saves with victory boolean and new saves with result string
            const result = battle.result || (battle.victory ? 'victory' : 'defeat');
            const resultColors = {
                victory: '#4ecdc4',
                progress: '#4a9fff',
                stalemate: '#888',
                losses: '#ffa500',
                defeat: '#ff6b6b'
            };
            const resultLabels = {
                victory: 'VICTORY',
                progress: 'PROGRESS',
                stalemate: 'STALEMATE',
                losses: 'LOSSES',
                defeat: 'DEFEAT'
            };
            const resultColor = resultColors[result] || '#888';
            const resultText = resultLabels[result] || result.toUpperCase();

            html += `<div style="padding:6px;margin:4px 0;background:#252540;border-radius:4px;border-left:3px solid ${resultColor};">`;
            html += `<div style="display:flex;justify-content:space-between;align-items:center;">`;
            html += `<span style="color:#ffe66d;font-weight:bold;font-size:11px;">Year ${battle.turn}</span>`;
            html += `<span style="color:${resultColor};font-weight:bold;font-size:10px;">${resultText}</span>`;
            html += `</div>`;
            html += `<div style="color:#888;font-size:10px;margin:2px 0;">${battle.location}</div>`;

            // Losses
            html += `<div style="font-size:10px;margin-top:4px;">`;
            html += `<div style="color:#4ecdc4;">Your losses: ${battle.playerLosses} ships`;
            if (battle.playerDefenseLost > 0) html += `, ${battle.playerDefenseLost} defense`;
            html += `</div>`;
            html += `<div style="color:#ff6b6b;">Enemy losses: ${battle.enemyLosses} ships`;
            if (battle.enemyDefenseLost > 0) html += `, ${battle.enemyDefenseLost} defense`;
            html += `</div>`;
            html += `</div>`;

            // Survivors
            html += `<div style="font-size:9px;margin-top:4px;color:#888;">`;
            html += `<div>Your survivors: ${battle.playerSurvivors}</div>`;
            html += `<div>Enemy survivors: ${battle.enemySurvivors}</div>`;
            html += `</div>`;

            html += `</div>`;
        }
    }
    html += '</div>';

    return html;
}
