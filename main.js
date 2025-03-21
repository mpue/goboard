import { BoardController } from "./BoardController.js";
export class Board {
    aiVsAiMove() {
        if (!this.aiVsAiActive || this.model.isGameOver()) {
            this.aiVsAiActive = false;
            document.getElementById("ai-vs-ai").innerText = "KI gegen sich selbst spielen";
            return;
        }
        if (this.isMakingMove)
            return; // Schutz gegen parallele Ausführung
        this.isMakingMove = true;
        setTimeout(() => {
            let bestMove;
            if (this.getMoveCount() < 3) {
                bestMove = this.getRandomOpeningMove();
            }
            else {
                bestMove = this.model.getBestMoveMinimax(this.model.getCurrentPlayer(), 4);
            }
            if (bestMove && this.model.setCell(bestMove.x, bestMove.y, this.model.getCurrentPlayer())) {
                this.clickSound.play();
                this.render();
                this.updateScore();
            }
            this.isMakingMove = false; // Sperre wieder freigeben
            this.aiVsAiMove(); // nächster Zug automatisch
        }, 250);
    }
    constructor(size) {
        this.size = size;
        this.boardSize = 800;
        this.borderSize = 40; // Rand in Pixeln
        this.clickSound = new Audio('click.wav');
        this.captureSound = new Audio('cash.wav');
        this.isMakingMove = false;
        // Ergänzung zur Klasse Board (innerhalb der Klasse Board einfügen)
        this.aiVsAiActive = false; // Flag, ob KI vs KI läuft
        let canvas = document.getElementById("canvas");
        let context = canvas.getContext("2d");
        context.lineCap = "round";
        context.lineJoin = "round";
        context.strokeStyle = "black";
        context.lineWidth = 1;
        this.canvas = canvas;
        this.context = context;
        this.model = new BoardController(size);
        this.canvas.width = this.boardSize + this.borderSize * 2;
        this.canvas.height = this.boardSize + this.borderSize * 2;
        this.render();
    }
    render() {
        this.drawBoardBackground(); // Zeichnet die Holztextur
        this.drawGrid(this.context, this.boardSize, this.size);
        this.drawStarPoints(this.context);
    }
    drawBoardBackground() {
        let ctx = this.context;
        let gradient = ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, "#DEB887"); // Holzfarbe
        gradient.addColorStop(1, "#D2691E"); // Dunklere Holzfarbe
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    getGridCell(x, y, gridSize, pixelSize) {
        const cellSize = pixelSize / (gridSize - 1);
        x -= this.borderSize; // Rand einkalkulieren
        y -= this.borderSize;
        const col = Math.round(x / cellSize);
        const row = Math.round(y / cellSize);
        return { row, col };
    }
    getCanvasCoordinates(row, col, gridSize, pixelSize) {
        const cellSize = pixelSize / (gridSize - 1);
        const x = col * cellSize + this.borderSize;
        const y = row * cellSize + this.borderSize;
        return { x, y };
    }
    drawPiece(ctx, x, y, radius, color) {
        ctx.save(); // 🎯 Zustand speichern
        // **Schatten für 3D-Effekt**
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;
        // **Farbverlauf für realistischen Stein-Look**
        let gradient = ctx.createRadialGradient(x - radius / 3, y - radius / 3, radius / 8, x, y, radius);
        if (color === "white") {
            gradient.addColorStop(0, "#ffffff"); // Heller Mittelpunkt
            gradient.addColorStop(1, "#cccccc"); // Weicher Grauton für Tiefeneffekt
        }
        else {
            gradient.addColorStop(0, "#111111"); // Sanftes Schwarz
            gradient.addColorStop(1, "#000000"); // Dunkler Rand für Volumen
        }
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        // **Lichtreflexion für edlen Glanz**
        let reflectionGradient = ctx.createRadialGradient(x - radius / 4, y - radius / 4, radius / 10, x, y, radius);
        reflectionGradient.addColorStop(0, "rgba(255, 255, 255, 0.9)"); // Starke Reflexion
        reflectionGradient.addColorStop(1, "rgba(255, 255, 255, 0)"); // Verlauf ins Nichts
        ctx.fillStyle = reflectionGradient;
        ctx.fill();
        // **Sanfter Rand statt harter schwarzer Linie**
        let edgeGradient = ctx.createRadialGradient(x, y, radius * 0.7, x, y, radius);
        edgeGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
        edgeGradient.addColorStop(1, "rgba(0, 0, 0, 0.5)"); // Weiche Kante
        ctx.fillStyle = edgeGradient;
        ctx.fill();
        ctx.restore(); // Zustand zurücksetzen
    }
    drawGrid(ctx, boardSize, gridSize) {
        ctx.strokeStyle = "#000";
        const stepSize = boardSize / (gridSize - 1);
        for (let x = 0; x < gridSize; x++) {
            ctx.beginPath();
            ctx.moveTo(x * stepSize + this.borderSize, this.borderSize);
            ctx.lineTo(x * stepSize + this.borderSize, boardSize + this.borderSize);
            ctx.stroke();
        }
        for (let y = 0; y < gridSize; y++) {
            ctx.beginPath();
            ctx.moveTo(this.borderSize, y * stepSize + this.borderSize);
            ctx.lineTo(boardSize + this.borderSize, y * stepSize + this.borderSize);
            ctx.stroke();
        }
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                let cellValue = this.model.getCell(x, y);
                if (cellValue !== 0) {
                    let pos = this.getCanvasCoordinates(y, x, this.size, boardSize);
                    let color = cellValue === 1 ? "white" : "black";
                    this.drawPiece(this.context, pos.x, pos.y, stepSize / 2.5, color);
                }
            }
        }
    }
    drawStarPoints(ctx) {
        let starPoints = [];
        if (this.size === 19) {
            starPoints = [
                [3, 3], [9, 3], [15, 3],
                [3, 9], [9, 9], [15, 9],
                [3, 15], [9, 15], [15, 15]
            ];
        }
        else if (this.size === 13) {
            starPoints = [
                [3, 3], [9, 3],
                [3, 9], [9, 9]
            ];
        }
        else if (this.size === 9) {
            starPoints = [
                [2, 2], [6, 2],
                [2, 6], [6, 6]
            ];
        }
        for (let [col, row] of starPoints) {
            let { x, y } = this.getCanvasCoordinates(row, col, this.size, this.boardSize);
            ctx.fillStyle = "black";
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    updateScore() {
        let score = this.model.countPoints();
        document.getElementById("score").innerText = `Weiß: ${score.white} | Schwarz: ${score.black}`;
    }
    aiMove() {
        if (this.isMakingMove)
            return;
        this.isMakingMove = true;
        setTimeout(() => {
            if (this.model.isGameOver()) {
                this.isMakingMove = false;
                return;
            }
            let bestMove;
            if (this.getMoveCount() < 3) {
                bestMove = this.getRandomOpeningMove();
            }
            else {
                bestMove = this.model.getBestMoveMinimax(this.model.getCurrentPlayer(), 2);
            }
            if (bestMove && this.model.setCell(bestMove.x, bestMove.y, this.model.getCurrentPlayer())) {
                this.clickSound.play();
                this.render();
                this.updateScore();
            }
            this.isMakingMove = false;
        }, 500);
    }
    /** 🏆 Zählt die bisher gespielten Züge */
    getMoveCount() {
        let count = 0;
        for (let y = 0; y < this.model.grid.length; y++) {
            for (let x = 0; x < this.model.grid.length; x++) {
                if (this.model.grid[y][x] !== 0)
                    count++;
            }
        }
        return count;
    }
    /** Gibt zufällige Startzüge in einer bestimmten Zone */
    getRandomOpeningMove() {
        let size = this.model.grid.length;
        let range = Math.floor(size * 0.4); // Spiele innerhalb von 40% des Felds
        let offset = Math.floor((size - range) / 2); // Mittelpunkt berechnen
        let x = Math.floor(Math.random() * range) + offset;
        let y = Math.floor(Math.random() * range) + offset;
        return { x, y };
    }
    clearCanvas() {
        this.model.clear();
        this.model.currentPlayer = 1;
        this.render();
        this.updateScore();
    }
    pressEventHandler(e) {
        let mouseX = e.pageX - this.canvas.offsetLeft;
        let mouseY = e.pageY - this.canvas.offsetTop;
        let pos = this.getGridCell(mouseX, mouseY, this.size, 800);
        const result = this.model.setCell(pos.col, pos.row, this.model.getCurrentPlayer());
        if (pos.col >= 0 && pos.row >= 0 && result.success) {
            if (result.stonesRemoved) {
                this.captureSound.play(); // 🔊 Sound für entfernte Steine
            }
            else {
                this.clickSound.play(); // ✅ Normaler Zug
            }
            this.render();
            this.updateScore();
            if (!this.model.isGameOver()) {
                this.aiMove();
            }
        }
    }
    toggleAiVsAi() {
        this.aiVsAiActive = !this.aiVsAiActive;
        const button = document.getElementById("ai-vs-ai");
        button.innerText = this.aiVsAiActive ? "KI-Spiel stoppen" : "KI gegen sich selbst spielen";
        if (this.aiVsAiActive) {
            this.aiVsAiMove();
        }
    }
}
const boardSizeSelect = document.getElementById("board-size");
const newGameButton = document.getElementById("new-game");
const clearButton = document.getElementById("clear");
const aiVsAiButton = document.getElementById("ai-vs-ai");
const canvas = document.getElementById("canvas");
let board = null;
let selectedSize = parseInt(boardSizeSelect.value);
boardSizeSelect.addEventListener("change", () => {
    selectedSize = parseInt(boardSizeSelect.value);
});
newGameButton.addEventListener("click", () => {
    board = new Board(selectedSize);
});
clearButton.addEventListener("click", () => {
    if (board)
        board.clearCanvas();
});
aiVsAiButton.addEventListener("click", () => {
    if (!board)
        board = new Board(selectedSize);
    board.toggleAiVsAi(); // Methode werden wir gleich hinzufügen
});
canvas.addEventListener("mousedown", (e) => {
    if (board)
        board.pressEventHandler(e);
});
//# sourceMappingURL=main.js.map