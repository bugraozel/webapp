/**
 * Bulmaca Oyunu - Ana JavaScript Dosyası
 * Telegram WebApp SDK entegrasyonu
 */

class PuzzleGame {
    constructor() {
        this.tg = window.Telegram.WebApp;
        this.currentLevel = 1;
        this.score = 0;
        this.moves = 0;
        this.startTime = null;
        this.gameTimer = null;
        this.puzzleState = [];
        this.puzzleSize = 3;
        
        this.settings = {
            sound: true,
            vibration: true,
            difficulty: 'easy'
        };
        
        this.init();
    }
    
    init() {
        console.log('Bulmaca Oyunu başlatılıyor...');
        
        this.tg.ready();
        this.applyTheme();
        this.setupMainButton();
        this.setupEventListeners();
        this.startGame();
    }
    
    applyTheme() {
        const themeParams = this.tg.themeParams;
        
        if (themeParams.bg_color) {
            document.documentElement.style.setProperty('--tg-theme-bg-color', themeParams.bg_color);
        }
        if (themeParams.text_color) {
            document.documentElement.style.setProperty('--tg-theme-text-color', themeParams.text_color);
        }
        if (themeParams.button_color) {
            document.documentElement.style.setProperty('--tg-theme-button-color', themeParams.button_color);
        }
    }
    
    setupMainButton() {
        this.tg.MainButton.hide();
    }
    
    setupEventListeners() {
        const shuffleBtn = document.getElementById('shuffle-btn');
        const hintBtn = document.getElementById('hint-btn');
        const resetBtn = document.getElementById('reset-btn');
        
        if (shuffleBtn) shuffleBtn.addEventListener('click', () => this.shufflePuzzle());
        if (hintBtn) hintBtn.addEventListener('click', () => this.showHint());
        if (resetBtn) resetBtn.addEventListener('click', () => this.resetGame());
        
        // Modal butonları
        const nextLevelBtn = document.getElementById('next-level-btn');
        const playAgainBtn = document.getElementById('play-again-btn');
        const shareScoreBtn = document.getElementById('share-score-btn');
        
        if (nextLevelBtn) nextLevelBtn.addEventListener('click', () => this.nextLevel());
        if (playAgainBtn) playAgainBtn.addEventListener('click', () => this.restartCurrentLevel());
        if (shareScoreBtn) shareScoreBtn.addEventListener('click', () => this.shareScore());
    }
    
    startGame() {
        document.getElementById('loading-screen').classList.remove('hidden');
        document.getElementById('game-container').classList.add('hidden');
        
        setTimeout(() => {
            this.loadLevel(this.currentLevel);
            document.getElementById('loading-screen').classList.add('hidden');
            document.getElementById('game-container').classList.remove('hidden');
            this.tg.expand();
            this.startTimer();
        }, 1500);
    }
    
    loadLevel(level) {
        if (level <= 3) this.puzzleSize = 3;
        else if (level <= 6) this.puzzleSize = 4;
        else this.puzzleSize = 5;
        
        this.initializePuzzle();
        this.updateLevelDisplay();
        this.createPuzzleBoard();
        this.shufflePuzzle();
    }
    
    initializePuzzle() {
        this.puzzleState = [];
        for (let i = 0; i < this.puzzleSize * this.puzzleSize - 1; i++) {
            this.puzzleState.push(i);
        }
        this.puzzleState.push(null);
    }
    
    createPuzzleBoard() {
        const board = document.getElementById('puzzle-board');
        if (!board) return;
        
        board.innerHTML = '';
        board.style.gridTemplateColumns = `repeat(${this.puzzleSize}, 1fr)`;
        
        for (let i = 0; i < this.puzzleSize * this.puzzleSize; i++) {
            const piece = document.createElement('div');
            piece.className = 'puzzle-piece';
            piece.dataset.position = i;
            
            if (this.puzzleState[i] !== null) {
                piece.textContent = this.puzzleState[i] + 1;
                piece.classList.add('filled');
                piece.addEventListener('click', () => this.movePiece(i));
            } else {
                piece.classList.add('empty');
            }
            
            board.appendChild(piece);
        }
    }
    
    movePiece(position) {
        const emptyPos = this.puzzleState.indexOf(null);
        
        if (this.isAdjacent(position, emptyPos)) {
            [this.puzzleState[position], this.puzzleState[emptyPos]] = 
            [this.puzzleState[emptyPos], this.puzzleState[position]];
            
            this.moves++;
            this.updateMovesDisplay();
            this.createPuzzleBoard();
            this.updateProgress();
            
            if (this.settings.vibration && this.tg.HapticFeedback) {
                this.tg.HapticFeedback.impactOccurred('light');
            }
            
            if (this.isPuzzleComplete()) {
                this.completePuzzle();
            }
        }
    }
    
    isAdjacent(pos1, pos2) {
        const row1 = Math.floor(pos1 / this.puzzleSize);
        const col1 = pos1 % this.puzzleSize;
        const row2 = Math.floor(pos2 / this.puzzleSize);
        const col2 = pos2 % this.puzzleSize;
        
        return (Math.abs(row1 - row2) === 1 && col1 === col2) ||
               (Math.abs(col1 - col2) === 1 && row1 === row2);
    }
    
    isPuzzleComplete() {
        for (let i = 0; i < this.puzzleState.length - 1; i++) {
            if (this.puzzleState[i] !== i) {
                return false;
            }
        }
        return this.puzzleState[this.puzzleState.length - 1] === null;
    }
    
    completePuzzle() {
        clearInterval(this.gameTimer);
        const endTime = Date.now();
        const timeTaken = Math.floor((endTime - this.startTime) / 1000);
        
        const timeBonus = Math.max(0, 300 - timeTaken) * 10;
        const movesPenalty = Math.max(0, this.moves - 50) * 5;
        this.score = Math.max(100, 1000 + timeBonus - movesPenalty);
        
        if (this.settings.vibration && this.tg.HapticFeedback) {
            this.tg.HapticFeedback.notificationOccurred('success');
        }
        
        this.showCompletionModal(timeTaken);
        this.sendGameResult(timeTaken);
    }
    
    showCompletionModal(timeTaken) {
        const modal = document.getElementById('completion-modal');
        if (!modal) return;
        
        const scoreDisplay = document.getElementById('final-score');
        const timeDisplay = document.getElementById('final-time');
        const movesDisplay = document.getElementById('final-moves');
        
        if (scoreDisplay) scoreDisplay.textContent = this.score;
        if (timeDisplay) timeDisplay.textContent = this.formatTime(timeTaken);
        if (movesDisplay) movesDisplay.textContent = this.moves;
        
        modal.classList.remove('hidden');
        
        this.tg.MainButton.setText('🎯 Sonraki Seviye');
        this.tg.MainButton.show();
        this.tg.MainButton.onClick(() => this.nextLevel());
    }
    
    sendGameResult(timeTaken) {
        const gameData = {
            action: 'puzzle_completed',
            level: this.currentLevel,
            score: this.score,
            time: timeTaken,
            moves: this.moves,
            difficulty: this.settings.difficulty
        };
        
        try {
            this.tg.sendData(JSON.stringify(gameData));
        } catch (error) {
            console.error('Veri gönderme hatası:', error);
        }
    }
    
    shufflePuzzle() {
        for (let i = 0; i < 1000; i++) {
            const emptyPos = this.puzzleState.indexOf(null);
            const adjacentPositions = this.getAdjacentPositions(emptyPos);
            
            if (adjacentPositions.length > 0) {
                const randomPos = adjacentPositions[Math.floor(Math.random() * adjacentPositions.length)];
                [this.puzzleState[emptyPos], this.puzzleState[randomPos]] = 
                [this.puzzleState[randomPos], this.puzzleState[emptyPos]];
            }
        }
        
        this.createPuzzleBoard();
        this.moves = 0;
        this.updateMovesDisplay();
    }
    
    getAdjacentPositions(position) {
        const adjacent = [];
        const row = Math.floor(position / this.puzzleSize);
        const col = position % this.puzzleSize;
        
        if (row > 0) adjacent.push((row - 1) * this.puzzleSize + col);
        if (row < this.puzzleSize - 1) adjacent.push((row + 1) * this.puzzleSize + col);
        if (col > 0) adjacent.push(row * this.puzzleSize + col - 1);
        if (col < this.puzzleSize - 1) adjacent.push(row * this.puzzleSize + col + 1);
        
        return adjacent;
    }
    
    startTimer() {
        this.startTime = Date.now();
        this.gameTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const timeDisplay = document.getElementById('time-display');
            if (timeDisplay) {
                timeDisplay.textContent = `Süre: ${this.formatTime(elapsed)}`;
            }
        }, 1000);
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    updateLevelDisplay() {
        const levelDisplay = document.getElementById('level-display');
        const scoreDisplay = document.getElementById('score-display');
        
        if (levelDisplay) levelDisplay.textContent = `Seviye: ${this.currentLevel}`;
        if (scoreDisplay) scoreDisplay.textContent = `Skor: ${this.score}`;
    }
    
    updateMovesDisplay() {
        const movesDisplay = document.getElementById('moves-display');
        if (movesDisplay) {
            movesDisplay.textContent = `Hamle: ${this.moves}`;
        }
    }
    
    updateProgress() {
        const correctPieces = this.puzzleState.filter((piece, index) => piece === index).length;
        const totalPieces = this.puzzleState.length - 1;
        const progress = totalPieces > 0 ? (correctPieces / totalPieces) * 100 : 0;
        
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) progressBar.style.width = `${progress}%`;
    }
    
    resetGame() {
        clearInterval(this.gameTimer);
        this.moves = 0;
        this.score = 0;
        this.updateLevelDisplay();
        this.updateMovesDisplay();
        this.loadLevel(this.currentLevel);
    }
    
    showHint() {
        const pieces = document.querySelectorAll('.puzzle-piece');
        pieces.forEach((piece, index) => {
            if (this.puzzleState[index] === index) {
                piece.classList.add('correct-position');
                setTimeout(() => {
                    piece.classList.remove('correct-position');
                }, 2000);
            }
        });
        
        if (this.settings.vibration && this.tg.HapticFeedback) {
            this.tg.HapticFeedback.impactOccurred('medium');
        }
    }
    
    nextLevel() {
        this.currentLevel++;
        const modal = document.getElementById('completion-modal');
        if (modal) modal.classList.add('hidden');
        this.tg.MainButton.hide();
        this.resetGame();
    }
    
    restartCurrentLevel() {
        const modal = document.getElementById('completion-modal');
        if (modal) modal.classList.add('hidden');
        this.tg.MainButton.hide();
        this.resetGame();
    }
    
    shareScore() {
        const shareText = `🧩 ${this.score} puan aldım! Seviye ${this.currentLevel} - ${this.moves} hamle ile tamamladım!`;
        
        if (this.tg.shareMessage) {
            this.tg.shareMessage(shareText);
        } else {
            // Fallback: Copy to clipboard
            navigator.clipboard.writeText(shareText).then(() => {
                alert('Skor panoya kopyalandı!');
            });
        }
    }
}

// Oyunu başlat
document.addEventListener('DOMContentLoaded', () => {
    new PuzzleGame();
});
