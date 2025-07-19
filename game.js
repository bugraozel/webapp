/**
 * Bulmaca Oyunu - Ana JavaScript Dosyası
 * Telegram WebApp SDK entegrasyonu
 */

class CandyCrushGame {
    constructor() {
        this.tg = window.Telegram.WebApp;
        this.currentLevel = 1;
        this.score = 0;
        this.totalCoins = 0; // Toplam kazanılan coin
        this.sessionCoins = 0; // Bu oturumda kazanılan coin
        this.moves = 30; // Kalan hamle sayısı
        this.targetScore = 10000; // Seviye hedef skoru
        this.gameBoard = [];
        this.boardSize = 8; // 8x8 oyun tahtası
        this.candyTypes = ['🍭', '🍬', '🧁', '🍫', '🍪', '🎂']; // Candy türleri
        this.selectedCandy = null;
        this.isAnimating = false;
        this.gameTime = 0; // Oyun süresi (saniye)
        this.gameTimer = null; // Timer referansı
        
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
        
        // Oyun timer başlat
        this.gameTime = 0;
        this.gameTimer = setInterval(() => {
            this.gameTime++;
            this.updateDisplay();
        }, 1000);
        
        setTimeout(() => {
            this.loadLevel(this.currentLevel);
            document.getElementById('loading-screen').classList.add('hidden');
            document.getElementById('game-container').classList.remove('hidden');
            this.tg.expand();
            this.createGameBoard();
            this.updateDisplay();
        }, 1500);
    }
    
    loadLevel(level) {
        this.targetScore = level * 5000; // Her seviyede hedef artar
        this.moves = 30 - Math.floor(level / 3); // Seviye arttıkça hamle azalır
        this.moves = Math.max(this.moves, 15); // Minimum 15 hamle
        this.score = 0;
    }
    
    createGameBoard() {
        this.gameBoard = [];
        
        // 8x8 tahta oluştur
        for (let row = 0; row < this.boardSize; row++) {
            this.gameBoard[row] = [];
            for (let col = 0; col < this.boardSize; col++) {
                this.gameBoard[row][col] = this.getRandomCandy();
            }
        }
        
        // İlk eşleşmeleri temizle
        this.removeInitialMatches();
        this.renderBoard();
    }
    
    getRandomCandy() {
        return this.candyTypes[Math.floor(Math.random() * this.candyTypes.length)];
    }
    
    removeInitialMatches() {
        let hasMatches = true;
        while (hasMatches) {
            hasMatches = false;
            
            // Yatay eşleşmeleri kontrol et
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize - 2; col++) {
                    if (this.gameBoard[row][col] === this.gameBoard[row][col + 1] && 
                        this.gameBoard[row][col] === this.gameBoard[row][col + 2]) {
                        this.gameBoard[row][col] = this.getRandomCandy();
                        hasMatches = true;
                    }
                }
            }
            
            // Dikey eşleşmeleri kontrol et
            for (let col = 0; col < this.boardSize; col++) {
                for (let row = 0; row < this.boardSize - 2; row++) {
                    if (this.gameBoard[row][col] === this.gameBoard[row + 1][col] && 
                        this.gameBoard[row][col] === this.gameBoard[row + 2][col]) {
                        this.gameBoard[row][col] = this.getRandomCandy();
                        hasMatches = true;
                    }
                }
            }
        }
    }
    
    renderBoard() {
        const board = document.getElementById('puzzle-board');
        if (!board) return;
        
        board.innerHTML = '';
        board.className = 'candy-board';
        board.style.gridTemplateColumns = `repeat(${this.boardSize}, 1fr)`;
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const candy = document.createElement('div');
                candy.className = 'candy';
                candy.textContent = this.gameBoard[row][col];
                candy.dataset.row = row;
                candy.dataset.col = col;
                
                candy.addEventListener('click', () => this.selectCandy(row, col));
                board.appendChild(candy);
            }
        }
    }
    
    selectCandy(row, col) {
        if (this.isAnimating) return;
        
        if (!this.selectedCandy) {
            // İlk candy seçimi
            this.selectedCandy = {row, col};
            this.highlightCandy(row, col);
        } else {
            // İkinci candy seçimi - takas yapılacak
            if (this.selectedCandy.row === row && this.selectedCandy.col === col) {
                // Aynı candy'ye tekrar tıklandı, seçimi iptal et
                this.clearSelection();
            } else if (this.areAdjacent(this.selectedCandy, {row, col})) {
                // Komşu candy'ler, takas yap
                this.swapCandies(this.selectedCandy, {row, col});
            } else {
                // Uzak candy, yeni seçim yap
                this.clearSelection();
                this.selectedCandy = {row, col};
                this.highlightCandy(row, col);
            }
        }
    }
    
    areAdjacent(candy1, candy2) {
        const rowDiff = Math.abs(candy1.row - candy2.row);
        const colDiff = Math.abs(candy1.col - candy2.col);
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }
    
    swapCandies(candy1, candy2) {
        // Candy'leri takas et
        const temp = this.gameBoard[candy1.row][candy1.col];
        this.gameBoard[candy1.row][candy1.col] = this.gameBoard[candy2.row][candy2.col];
        this.gameBoard[candy2.row][candy2.col] = temp;
        
        this.renderBoard();
        
        // Eşleşme kontrolü
        const matches = this.findMatches();
        if (matches.length > 0) {
            this.moves--;
            this.processMatches(matches);
            this.clearSelection();
        } else {
            // Eşleşme yoksa takası geri al
            const temp2 = this.gameBoard[candy1.row][candy1.col];
            this.gameBoard[candy1.row][candy1.col] = this.gameBoard[candy2.row][candy2.col];
            this.gameBoard[candy2.row][candy2.col] = temp2;
            this.renderBoard();
            this.clearSelection();
        }
        
        this.updateDisplay();
        this.checkGameEnd();
    }
    
    findMatches() {
        const matches = new Set();
        
        // Yatay eşleşmeler
        for (let row = 0; row < this.boardSize; row++) {
            let count = 1;
            let currentCandy = this.gameBoard[row][0];
            
            for (let col = 1; col < this.boardSize; col++) {
                if (this.gameBoard[row][col] === currentCandy) {
                    count++;
                } else {
                    if (count >= 3) {
                        for (let i = col - count; i < col; i++) {
                            matches.add(`${row},${i}`);
                        }
                    }
                    count = 1;
                    currentCandy = this.gameBoard[row][col];
                }
            }
            if (count >= 3) {
                for (let i = this.boardSize - count; i < this.boardSize; i++) {
                    matches.add(`${row},${i}`);
                }
            }
        }
        
        // Dikey eşleşmeler
        for (let col = 0; col < this.boardSize; col++) {
            let count = 1;
            let currentCandy = this.gameBoard[0][col];
            
            for (let row = 1; row < this.boardSize; row++) {
                if (this.gameBoard[row][col] === currentCandy) {
                    count++;
                } else {
                    if (count >= 3) {
                        for (let i = row - count; i < row; i++) {
                            matches.add(`${i},${col}`);
                        }
                    }
                    count = 1;
                    currentCandy = this.gameBoard[row][col];
                }
            }
            if (count >= 3) {
                for (let i = this.boardSize - count; i < this.boardSize; i++) {
                    matches.add(`${i},${col}`);
                }
            }
        }
        
        return Array.from(matches).map(match => {
            const [row, col] = match.split(',').map(Number);
            return {row, col};
        });
    }
    
    processMatches(matches) {
        // Puan hesapla
        const basePoints = 100;
        const comboBonus = matches.length > 3 ? matches.length * 50 : 0;
        const levelBonus = this.currentLevel * 10;
        
        const earnedPoints = (basePoints * matches.length) + comboBonus + levelBonus;
        const earnedCoins = Math.floor(earnedPoints / 1000); // Her 1000 puan = 1 coin
        
        this.score += earnedPoints;
        this.totalCoins += earnedCoins;
        
        // Eşleşen candy'leri kaldır
        matches.forEach(match => {
            this.gameBoard[match.row][match.col] = null;
        });
        
        // Haptic feedback
        if (this.settings.vibration && this.tg.HapticFeedback) {
            this.tg.HapticFeedback.impactOccurred('medium');
        }
        
        // Candy'leri düşür ve yenilerini ekle
        this.dropCandies();
        this.fillEmpty();
        this.renderBoard();
        
        // Yeni eşleşmeler var mı kontrol et (combo)
        setTimeout(() => {
            const newMatches = this.findMatches();
            if (newMatches.length > 0) {
                this.processMatches(newMatches);
            }
        }, 500);
        
        this.updateDisplay();
    }
    
    dropCandies() {
        for (let col = 0; col < this.boardSize; col++) {
            let writePos = this.boardSize - 1;
            
            for (let row = this.boardSize - 1; row >= 0; row--) {
                if (this.gameBoard[row][col] !== null) {
                    this.gameBoard[writePos][col] = this.gameBoard[row][col];
                    if (writePos !== row) {
                        this.gameBoard[row][col] = null;
                    }
                    writePos--;
                }
            }
        }
    }
    
    fillEmpty() {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (this.gameBoard[row][col] === null) {
                    this.gameBoard[row][col] = this.getRandomCandy();
                }
            }
        }
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
