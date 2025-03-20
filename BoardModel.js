export class BoardModel {
    constructor(size) {
        this.lastGrid = ""; // 📌 Für die Ko-Regel
        this.currentPlayer = 2; // 1 = Weiß, 2 = Schwarz
        this.grid = Array.from({ length: size }, () => Array(size).fill(0));
    }
    setCell(x, y, value) {
        if (isNaN(x) || isNaN(y) || x < 0 || x >= this.grid.length || y < 0 || y >= this.grid.length) {
            console.error(`❌ Ungültige Werte! x=${x}, y=${y}`);
            return false;
        }
        if (this.grid[y][x] !== 0) {
            return false; // Feld ist bereits belegt
        }
        //  **Simuliere den Zug**
        let previousState = this.getBoardState();
        this.grid[y][x] = value;
        this.checkCaptures(x, y, value);
        //  **Ko-Regel prüfen (darf nicht den vorherigen Zustand wiederholen)**
        if (this.getBoardState() === this.lastGrid) {
            this.grid[y][x] = 0; // Zug rückgängig machen
            console.warn("⛔ Ko-Regel! Der gleiche Zustand darf nicht wiederholt werden.");
            return false;
        }
        //  **Selbstmordregel prüfen (keine Freiheiten nach Zug)**
        if (this.getLiberties(this.getStoneGroup(x, y)) === 0) {
            this.grid[y][x] = 0; // Zug rückgängig machen
            console.warn("⛔ Selbstmordregel! Du darfst dich nicht selbst fangen.");
            return false;
        }
        // **Zug ist gültig, speichere den Zustand für die Ko-Regel**
        this.lastGrid = previousState;
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1; // 🏆 Spieler wechseln
        return true;
    }
    getCurrentPlayer() {
        return this.currentPlayer;
    }
    setCurrentPlayer(player) {
        this.currentPlayer = player;
    }
    getCell(x, y) {
        return (x >= 0 && x < this.grid.length && y >= 0 && y < this.grid.length) ? this.grid[y][x] : 0;
    }
    clear() {
        this.grid = Array.from({ length: this.grid.length }, () => Array(this.grid.length).fill(0));
        this.lastGrid = "";
    }
    /** 🔗 Holt eine zusammenhängende Gruppe von Steinen */
    getStoneGroup(x, y) {
        let color = this.getCell(x, y);
        if (color === 0)
            return [];
        let visited = new Set();
        let group = [];
        let stack = [[x, y]];
        while (stack.length > 0) {
            let [cx, cy] = stack.pop();
            let key = `${cx},${cy}`;
            if (!visited.has(key) && this.getCell(cx, cy) === color) {
                visited.add(key);
                group.push([cx, cy]);
                // **Nachbarn überprüfen, aber AUCH außerhalb des Felds checken!**
                for (let [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
                    let nx = cx + dx;
                    let ny = cy + dy;
                    if (nx >= 0 && ny >= 0 && nx < this.grid.length && ny < this.grid.length) {
                        stack.push([nx, ny]);
                    }
                }
            }
        }
        return group;
    }
    /** 🔥 Gibt die Anzahl der Freiheiten einer Gruppe zurück */
    getLiberties(group) {
        let liberties = new Set();
        for (let [x, y] of group) {
            for (let [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
                let nx = x + dx;
                let ny = y + dy;
                if (nx >= 0 && ny >= 0 && nx < this.grid.length && ny < this.grid.length) {
                    if (this.getCell(nx, ny) === 0) {
                        liberties.add(`${nx},${ny}`);
                    }
                }
            }
        }
        // **DEBUG: Zeige die Anzahl der gefundenen Freiheiten in der Konsole**
        console.log(`🟢 Gruppe hat ${liberties.size} Freiheiten`);
        return liberties.size;
    }
    /** 🔥 Prüft, ob gegnerische Gruppen gefangen wurden */
    checkCaptures(x, y, currentPlayer) {
        const opponent = currentPlayer === 1 ? 2 : 1;
        let capturedGroups = [];
        for (let [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
            let nx = x + dx;
            let ny = y + dy;
            if (this.getCell(nx, ny) === opponent) {
                let group = this.getStoneGroup(nx, ny);
                // **DEBUG: Gruppendaten in der Konsole ausgeben**
                console.log(`🔍 Prüfe Gruppe um (${nx}, ${ny}) mit ${group.length} Steinen`);
                if (this.getLiberties(group) === 0) {
                    capturedGroups.push(group);
                }
            }
        }
        // **Fange ALLE Gruppen, die keine Freiheiten mehr haben**
        for (let group of capturedGroups) {
            for (let [gx, gy] of group) {
                this.grid[gy][gx] = 0;
            }
        }
    }
    countPoints() {
        let whiteStones = 0, blackStones = 0;
        let visited = new Set();
        for (let y = 0; y < this.grid.length; y++) {
            for (let x = 0; x < this.grid.length; x++) {
                if (this.grid[y][x] === 1)
                    whiteStones++;
                if (this.grid[y][x] === 2)
                    blackStones++;
                // **Freie Gebiete prüfen**
                if (this.grid[y][x] === 0 && !visited.has(`${x},${y}`)) {
                    let territory = this.getTerritory(x, y, visited);
                    if (territory.color === 1)
                        whiteStones += territory.size;
                    if (territory.color === 2)
                        blackStones += territory.size;
                }
            }
        }
        return { white: whiteStones, black: blackStones };
    }
    /** 🔍 Prüft, ob ein Gebiet nur von einer Farbe umgeben ist */
    getTerritory(x, y, visited) {
        let stack = [[x, y]];
        let territory = [];
        let borderingColors = new Set();
        while (stack.length > 0) {
            let [cx, cy] = stack.pop();
            let key = `${cx},${cy}`;
            if (visited.has(key))
                continue;
            visited.add(key);
            territory.push([cx, cy]);
            for (let [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
                let nx = cx + dx;
                let ny = cy + dy;
                if (nx >= 0 && ny >= 0 && nx < this.grid.length && ny < this.grid.length) {
                    let neighbor = this.getCell(nx, ny);
                    if (neighbor === 0) {
                        stack.push([nx, ny]);
                    }
                    else {
                        borderingColors.add(neighbor);
                    }
                }
            }
        }
        if (borderingColors.size === 1) {
            return { size: territory.length, color: [...borderingColors][0] };
        }
        return { size: 0, color: 0 };
    }
    /** 📌 **Brettzustand als String für die Ko-Regel speichern** */
    getBoardState() {
        return JSON.stringify(this.grid);
    }
    getBestMoveMinimax(player, depth) {
        const moves = this.getPossibleMoves()
            .map(move => ({
            move,
            score: this.evaluateMove(move.x, move.y, player)
        }))
            .sort((a, b) => b.score - a.score); // Beste Züge zuerst
        // 🛡️ Prüfe, ob ein sofortiger defensiver Zug nötig ist
        const defensiveMove = this.getDefensiveMove(player);
        if (defensiveMove)
            return defensiveMove;
        let bestMove = null;
        let bestScore = this.evaluateBoard(player); // Aktueller Zustand (ohne Zug)
        // 🔍 Prüfe nur die Top-5-Kandidaten zur Performancesteigerung
        for (let { move } of moves.slice(0, 5)) {
            this.grid[move.y][move.x] = player;
            const score = this.minimax(depth - 1, -Infinity, Infinity, false, player);
            this.grid[move.y][move.x] = 0;
            if (score > bestScore) {
                bestMove = move;
                bestScore = score;
            }
        }
        // 🚩 Falls kein Zug besser als aktuelle Position ist, dann PASS (null)
        return bestMove;
    }
    getDefensiveMove(player) {
        const dangerGroups = [];
        for (let y = 0; y < this.grid.length; y++) {
            for (let x = 0; x < this.grid.length; x++) {
                if (this.grid[y][x] === player) {
                    const group = this.getStoneGroup(x, y);
                    const liberties = this.getLiberties(group);
                    if (liberties === 1)
                        dangerGroups.push({ group, liberties });
                }
            }
        }
        for (let { group } of dangerGroups) {
            for (let [gx, gy] of group) {
                for (let [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
                    let nx = gx + dx, ny = gy + dy;
                    if (this.getCell(nx, ny) === 0) {
                        // simuliere kurz, ob Zug Freiheiten erhöht
                        this.grid[ny][nx] = player;
                        let newLiberties = this.getLiberties(group);
                        this.grid[ny][nx] = 0;
                        if (newLiberties > 1)
                            return { x: nx, y: ny };
                    }
                }
            }
        }
        return null;
    }
    getPossibleMoves() {
        let moves = [];
        for (let y = 0; y < this.grid.length; y++) {
            for (let x = 0; x < this.grid.length; x++) {
                if (this.grid[y][x] === 0) {
                    moves.push({ x, y });
                }
            }
        }
        return moves;
    }
    evaluateBoard(player) {
        // const opponent = player === 1 ? 2 : 1;
        let score = 0;
        // Kontrolliertes Gebiet stärker gewichten
        const territories = this.countPoints();
        score += territories[player === 1 ? 'white' : 'black'] * 5;
        score -= territories[player === 1 ? 'black' : 'white'] * 5;
        // Belohne sichere Gruppen (mindestens 3 Freiheiten)
        for (let y = 0; y < this.grid.length; y++) {
            for (let x = 0; x < this.grid.length; x++) {
                if (this.grid[y][x] === player) {
                    const liberties = this.getLiberties(this.getStoneGroup(x, y));
                    score += liberties >= 3 ? 4 : -2; // sichere Gruppen belohnen, unsichere bestrafen
                }
            }
        }
        // 👁️ Augenbildung explizit belohnen
        score += this.evaluateEyes(player) * 15;
        return score;
    }
    /** 🏆 Prüft, ob der Zug den Gegner fangen würde */
    checkSimulatedCaptures(grid, x, y, opponent) {
        let captured = 0;
        for (let [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
            let nx = x + dx;
            let ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < grid.length && ny < grid.length) {
                if (grid[ny][nx] === opponent) {
                    let group = this.getStoneGroup(nx, ny);
                    if (this.getLiberties(group) === 0) {
                        captured += group.length; // Anzahl gefangener Steine zählen
                    }
                }
            }
        }
        return captured;
    }
    evaluateMove(x, y, player) {
        const opponent = player === 1 ? 2 : 1;
        let score = 0;
        // Temporäres Spielfeld erzeugen
        let tempGrid = JSON.parse(JSON.stringify(this.grid));
        tempGrid[y][x] = player;
        // Prüfe unmittelbare gegnerische Captures
        const opponentCaptured = this.checkSimulatedCaptures(tempGrid, x, y, opponent);
        score += opponentCaptured * 60;
        // Prüfe, ob Zug eigene Gruppe unmittelbar gefährdet
        const ownGroup = this.getStoneGroup(x, y);
        const ownLibertiesAfter = this.getLiberties(ownGroup);
        if (ownLibertiesAfter === 1) {
            score -= 120;
        }
        else {
            score += ownLibertiesAfter * 6;
        }
        // Prüfe gegnerische Gruppen in Atari oder Fast-Atari
        for (let y1 = 0; y1 < this.grid.length; y1++) {
            for (let x1 = 0; x1 < this.grid.length; x1++) {
                if (this.grid[y1][x1] === opponent) {
                    const oppGroup = this.getStoneGroup(x1, y1);
                    const oppLiberties = this.getLiberties(oppGroup);
                    if (oppLiberties === 1)
                        score += 45;
                    else if (oppLiberties === 2)
                        score += 15;
                }
            }
        }
        // Defensive Situationen bewerten
        for (let y1 = 0; y1 < this.grid.length; y1++) {
            for (let x1 = 0; x1 < this.grid.length; x1++) {
                if (this.grid[y1][x1] === player) {
                    const group = this.getStoneGroup(x1, y1);
                    if (this.getLiberties(group) === 1) {
                        this.grid[y][x] = player;
                        const newLiberties = this.getLiberties(group);
                        this.grid[y][x] = 0;
                        if (newLiberties > 1)
                            score += 70;
                    }
                }
            }
        }
        // Snapback-Erkennung
        if (this.wouldCauseSnapback(x, y, player))
            score -= 100;
        // Strategische Zufälligkeit (Noise)
        score += (Math.random() - 0.5) * 5;
        // NEU: 🚨 Erkennung großer eingekreister Gruppen
        score += this.evaluateEncirclement(player, opponent, x, y) * 0.1;
        return score;
    }
    evaluateEncirclement(player, opponent, moveX, moveY) {
        let encircleScore = 0;
        const groupsBefore = this.getAllGroupsWithLiberties(opponent);
        this.grid[moveY][moveX] = player;
        const groupsAfter = this.getAllGroupsWithLiberties(opponent);
        this.grid[moveY][moveX] = 0;
        groupsBefore.forEach((before, index) => {
            const after = groupsAfter[index];
            // 🚩 Reagiere NUR auf signifikante Freiheit-Reduktion großer Gruppen
            if (before.size >= 5 && before.liberties > 2 && after.liberties <= 2) {
                encircleScore += (before.size * (3 - after.liberties)) * 5; // moderatere Belohnung
            }
        });
        return encircleScore;
    }
    getAllGroupsWithLiberties(color) {
        let visited = new Set();
        let groups = [];
        for (let y = 0; y < this.grid.length; y++) {
            for (let x = 0; x < this.grid.length; x++) {
                const key = `${x},${y}`;
                if (!visited.has(key) && this.grid[y][x] === color) {
                    const group = this.getStoneGroup(x, y);
                    group.forEach(([gx, gy]) => visited.add(`${gx},${gy}`));
                    const liberties = this.getLiberties(group);
                    groups.push({ size: group.length, liberties });
                }
            }
        }
        return groups;
    }
    wouldCauseSnapback(x, y, player) {
        const opponent = player === 1 ? 2 : 1;
        let tempGrid = JSON.parse(JSON.stringify(this.grid));
        tempGrid[y][x] = player;
        // Simuliere Gegner-Zug auf gleichem Punkt nach eigenem Zug
        if (this.checkSimulatedCaptures(tempGrid, x, y, opponent) > 0) {
            return true; // Snapback erkannt!
        }
        return false;
    }
    minimax(depth, alpha, beta, isMaximizing, player) {
        const opponent = player === 1 ? 2 : 1;
        if (depth === 0 || this.isGameOver()) {
            return this.evaluateBoard(player);
        }
        // 🔍 Kandidaten Züge durch evaluateMove vorselektieren
        let possibleMoves = this.getPossibleMoves()
            .map(move => ({ move, score: this.evaluateMove(move.x, move.y, isMaximizing ? player : opponent) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(m => m.move);
        if (isMaximizing) {
            let maxEval = -Infinity;
            for (let move of possibleMoves) {
                this.grid[move.y][move.x] = player;
                const evalScore = this.minimax(depth - 1, alpha, beta, false, player);
                this.grid[move.y][move.x] = 0;
                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha)
                    break;
            }
            return maxEval;
        }
        else {
            let minEval = Infinity;
            for (let move of possibleMoves) {
                this.grid[move.y][move.x] = opponent;
                const evalScore = this.minimax(depth - 1, alpha, beta, true, player);
                this.grid[move.y][move.x] = 0;
                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                if (beta <= alpha)
                    break;
            }
            return minEval;
        }
    }
    /** 🏆 Prüft, ob das Spiel zu Ende ist (kein freies Feld mehr) */
    isGameOver() {
        for (let y = 0; y < this.grid.length; y++) {
            for (let x = 0; x < this.grid.length; x++) {
                if (this.grid[y][x] === 0)
                    return false; // Noch freies Feld = Spiel geht weiter
            }
        }
        console.log("🎉 Spiel vorbei!");
        return true;
    }
    // NEU: Bewertung von Augenbildung explizit
    evaluateEyes(player) {
        let eyesCount = 0;
        for (let y = 0; y < this.grid.length; y++) {
            for (let x = 0; x < this.grid.length; x++) {
                if (this.grid[y][x] === 0) {
                    const territory = this.getTerritory(x, y, new Set());
                    if (territory.size > 0 && territory.color === player) {
                        if (this.isEye(x, y, player))
                            eyesCount++;
                    }
                }
            }
        }
        return eyesCount;
    }
    isEye(x, y, player) {
        for (let [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
            let nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= this.grid.length || ny >= this.grid.length)
                return false;
            if (this.getCell(nx, ny) !== player)
                return false;
        }
        return true;
    }
}
//# sourceMappingURL=BoardModel.js.map