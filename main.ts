import { BoardController } from "./BoardController.js";

export class Board {
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;
    private model: BoardController;
    private boardSize = 800;
    private borderSize = 40; // Rand in Pixeln

    private clickSound = new Audio('click.wav');
    private captureSound  = new Audio('cash.wav');
    private isMakingMove: boolean = false;

    // Ergänzung zur Klasse Board (innerhalb der Klasse Board einfügen)

    private aiVsAiActive: boolean = false; // Flag, ob KI vs KI läuft

    private aiVsAiMove() {
        if (!this.aiVsAiActive || this.model.isGameOver()) {
            this.aiVsAiActive = false;
            document.getElementById("ai-vs-ai")!.innerText = "KI gegen sich selbst spielen";
            return;
        }
    
        if (this.isMakingMove) return; // Schutz gegen parallele Ausführung
        this.isMakingMove = true;
    
        setTimeout(() => {
            let bestMove;
    
            if (this.getMoveCount() < 3) {
                bestMove = this.getRandomOpeningMove();
            } else {
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
    

    constructor(public size: number) {
        let canvas = document.getElementById("canvas") as HTMLCanvasElement;
        let context = canvas.getContext("2d") as CanvasRenderingContext2D;
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

    public render() {
        this.drawBoardBackground(); // Zeichnet die Holztextur
        this.drawGrid(this.context, this.boardSize, this.size);
        this.drawStarPoints(this.context);
    }

    private drawBoardBackground() {
        let ctx = this.context;
        let gradient = ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, "#DEB887"); // Holzfarbe
        gradient.addColorStop(1, "#D2691E"); // Dunklere Holzfarbe

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    public getGridCell(x: number, y: number, gridSize: number, pixelSize: number): { row: number, col: number } {
        const cellSize = pixelSize / (gridSize - 1);
        x -= this.borderSize; // Rand einkalkulieren
        y -= this.borderSize;
        const col = Math.round(x / cellSize);
        const row = Math.round(y / cellSize);
        return { row, col };
    }

    public getCanvasCoordinates(row: number, col: number, gridSize: number, pixelSize: number): { x: number, y: number } {
        const cellSize = pixelSize / (gridSize - 1);
        const x = col * cellSize + this.borderSize;
        const y = row * cellSize + this.borderSize;
        return { x, y };
    }

    public drawPiece(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string): void {
        ctx.save();
    
        // Schatten für Tiefe
        ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
    
        // Realistischer Stein-Look
        let gradient = ctx.createRadialGradient(x - radius / 3, y - radius / 3, radius / 8, x, y, radius);
        if (color === "white") {
            gradient.addColorStop(0, "#ffffff");
            gradient.addColorStop(1, "#cccccc");
        } else {
            gradient.addColorStop(0, "#222222"); // Glänzenderes Schwarz
            gradient.addColorStop(0.5, "#000000"); // Tiefschwarz
            gradient.addColorStop(1, "#111111"); // Randtiefe
        }
    
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    
        // Lichtreflexion für Glanz
        let reflectionGradient = ctx.createRadialGradient(x - radius / 4, y - radius / 4, radius / 12, x, y, radius);
        reflectionGradient.addColorStop(0, "rgba(255, 255, 255, 0.7)");
        reflectionGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = reflectionGradient;
        ctx.fill();
    
        // Sanfter Rand für Volumen
        let edgeGradient = ctx.createRadialGradient(x, y, radius * 0.7, x, y, radius);
        edgeGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
        edgeGradient.addColorStop(1, "rgba(0, 0, 0, 0.4)");
        ctx.fillStyle = edgeGradient;
        ctx.fill();
    
        ctx.restore();
    }
    

    public drawGrid(ctx: CanvasRenderingContext2D, boardSize: number, gridSize: number) {
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

    private drawStarPoints(ctx: CanvasRenderingContext2D) {
        let starPoints: number[][] = [];

        if (this.size === 19) {
            starPoints = [
                [3, 3], [9, 3], [15, 3],
                [3, 9], [9, 9], [15, 9],
                [3, 15], [9, 15], [15, 15]
            ];
        } else if (this.size === 13) {
            starPoints = [
                [3, 3], [9, 3],
                [3, 9], [9, 9]
            ];
        } else if (this.size === 9) {
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
    
    private updateScore() {
        let score = this.model.countPoints();
        document.getElementById("score")!.innerText = `Weiß: ${score.white} | Schwarz: ${score.black}`;
    }

    private aiMove() {
        if (this.isMakingMove) return;
        this.isMakingMove = true;
    
        setTimeout(() => {
            if (this.model.isGameOver()) {
                this.isMakingMove = false;
                return;
            }
    
            let bestMove;
            if (this.getMoveCount() < 3) {
                bestMove = this.getRandomOpeningMove();
            } else {
                bestMove = this.model.getBestMoveMinimax(this.model.getCurrentPlayer(), 5);
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
    private getMoveCount(): number {
        let count = 0;
        for (let y = 0; y < this.model.grid.length; y++) {
            for (let x = 0; x < this.model.grid.length; x++) {
                if (this.model.grid[y][x] !== 0) count++;
            }
        }
        return count;
    }

    /** Gibt zufällige Startzüge in einer bestimmten Zone */
    private getRandomOpeningMove(): { x: number, y: number } {
        let size = this.model.grid.length;
        let range = Math.floor(size * 0.4); // Spiele innerhalb von 40% des Felds
        let offset = Math.floor((size - range) / 2); // Mittelpunkt berechnen
        let x = Math.floor(Math.random() * range) + offset;
        let y = Math.floor(Math.random() * range) + offset;
        return { x, y };
    }

    public clearCanvas() {
        this.model.clear();
        this.model.currentPlayer = 1;
        this.render();
        this.updateScore();
    }
    public pressEventHandler(e: MouseEvent) {
        let mouseX = e.pageX - this.canvas.offsetLeft;
        let mouseY = e.pageY - this.canvas.offsetTop;
        let pos = this.getGridCell(mouseX, mouseY, this.size, 800);
    
        const result = this.model.setCell(pos.col, pos.row, this.model.getCurrentPlayer());
    
        if (pos.col >= 0 && pos.row >= 0 && result.success) {
            if (result.stonesRemoved) {
                this.captureSound.play(); // 🔊 Sound für entfernte Steine
            } else {
                this.clickSound.play();   // ✅ Normaler Zug
            }
    
            this.render();
            this.updateScore();
    
            if (!this.model.isGameOver()) {
                this.aiMove();
            }
        }
    }
    
    
    public toggleAiVsAi() {
        this.aiVsAiActive = !this.aiVsAiActive;
        const button = document.getElementById("ai-vs-ai")!;
        button.innerText = this.aiVsAiActive ? "KI-Spiel stoppen" : "KI gegen sich selbst spielen";
    
        if (this.aiVsAiActive) {
            this.aiVsAiMove();
        }
    }
   

}

const boardSizeSelect = document.getElementById("board-size") as HTMLSelectElement;
const newGameButton = document.getElementById("new-game")!;
const clearButton = document.getElementById("clear")!;
const aiVsAiButton = document.getElementById("ai-vs-ai")!;
const canvas = document.getElementById("canvas") as HTMLCanvasElement;

let board: Board | null = null;
let selectedSize: number = parseInt(boardSizeSelect.value);

boardSizeSelect.addEventListener("change", () => {
    selectedSize = parseInt(boardSizeSelect.value);
});

newGameButton.addEventListener("click", () => {
    board = new Board(selectedSize);
});

clearButton.addEventListener("click", () => {
    if (board) board.clearCanvas();
});

aiVsAiButton.addEventListener("click", () => {
    if (!board) board = new Board(selectedSize);
    board.toggleAiVsAi(); // Methode werden wir gleich hinzufügen
});

canvas.addEventListener("mousedown", (e) => {
    if (board) board.pressEventHandler(e);
});
