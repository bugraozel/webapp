/**
 * Candy Crush Tarzı Match-3 Oyunu
 * TRON TRC20 ödeme sistemli
 */

class CandyCrushGame {
    constructor() {
        this.tg = window.Telegram.WebApp;
        this.currentLevel = 1;
        this.score = 0;
        this.coins = 0; // Platform coin'i
        this.moves = 30;
        this.targetScore = 1000;
        this.startTime = null;
        this.gameTimer = null;
        
        this.board = [];
        this.boardSize = 8;
        this.selectedCandy = null;
        this.candyTypes = 6;
        
        // Ödül sistemi
        this.coinRates = {
            match3: 10,
            match4: 25,
            match5: 50,
            combo: 15,
            levelComplete: 100
        };
        
        // Çekim limitleri (USDT-TRC20)
        this.withdrawLimits = {
            min: 5, // 5 USDT minimum
            coinToUsdt: 1000 // 1000 coin = 1 USDT
        };
        
        this.init();
    }
    
    init() {
        console.log('🍭 Candy Crush Oyunu başlatılıyor...');
        
        this.tg.ready();
        this.applyTheme();
        this.setupMainButton();
        this.setupEventListeners();
        this.loadUserData();
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
        // Çekim butonu
        const withdrawBtn = document.getElementById('withdraw-btn');
        if (withdrawBtn) withdrawBtn.addEventListener('click', () => this.showWithdrawModal());
        
        // Wallet bağlama
        const connectWalletBtn = document.getElementById('connect-wallet-btn');
        if (connectWalletBtn) connectWalletBtn.addEventListener('click', () => this.connectWallet());
        
        // Günlük bonus
        const dailyBonusBtn = document.getElementById('daily-bonus-btn');
        if (dailyBonusBtn) dailyBonusBtn.addEventListener('click', () => this.claimDailyBonus());
    }
    
    startGame() {
        document.getElementById('loading-screen').classList.remove('hidden');
        document.getElementById('game-container').classList.add('hidden');
        
        setTimeout(() => {
            this.initializeBoard();
            this.renderBoard();
            this.updateUI();
            
            document.getElementById('loading-screen').classList.add('hidden');
            document.getElementById('game-container').classList.remove('hidden');
            
            this.tg.expand();
            this.startTimer();
        }, 1500);
    }
    
    initializeBoard() {
        this.board = [];
        for (let row = 0; row < this.boardSize; row++) {
            this.board[row] = [];
            for (let col = 0; col < this.boardSize; col++) {
                let candyType;
                do {
                    candyType = Math.floor(Math.random() * this.candyTypes);
                } while (this.wouldCreateMatch(row, col, candyType));
                
                this.board[row][col] = {
                    type: candyType,
                    row: row,
                    col: col,
                    id: `${row}-${col}`
                };
            }
        }
    }
    
    wouldCreateMatch(row, col, candyType) {
        // Yatay kontrol
        if (col >= 2 && 
            this.board[row][col-1]?.type === candyType && 
            this.board[row][col-2]?.type === candyType) {
            return true;
        }
        
        // Dikey kontrol
        if (row >= 2 && 
            this.board[row-1][col]?.type === candyType && 
            this.board[row-2][col]?.type === candyType) {
            return true;
        }
        
        return false;
    }
    
    renderBoard() {
        const gameBoard = document.getElementById('game-board');
        if (!gameBoard) return;
        
        gameBoard.innerHTML = '';
        gameBoard.style.gridTemplateColumns = `repeat(${this.boardSize}, 1fr)`;
        gameBoard.style.gridTemplateRows = `repeat(${this.boardSize}, 1fr)`;
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const candy = this.board[row][col];
                const candyElement = document.createElement('div');
                
                candyElement.className = `candy candy-${candy.type}`;
                candyElement.dataset.row = row;
                candyElement.dataset.col = col;
                candyElement.innerHTML = this.getCandyEmoji(candy.type);
                
                candyElement.addEventListener('click', (e) => this.selectCandy(e, row, col));
                
                gameBoard.appendChild(candyElement);
            }
        }
    }
    
    getCandyEmoji(type) {
        const emojis = ['🍭', '🍬', '🧁', '🍰', '🍪', '🎂'];
        return emojis[type];
    }
    
    selectCandy(e, row, col) {
        const candyElement = e.target;
        
        if (!this.selectedCandy) {
            // İlk seçim
            this.selectedCandy = { row, col, element: candyElement };
            candyElement.classList.add('selected');
        } else {
            // İkinci seçim - swap attempt
            const firstCandy = this.selectedCandy;
            
            if (this.areAdjacent(firstCandy.row, firstCandy.col, row, col)) {
                this.attemptSwap(firstCandy.row, firstCandy.col, row, col);
            }
            
            // Seçimi temizle
            firstCandy.element.classList.remove('selected');
            this.selectedCandy = null;
        }
    }
    
    areAdjacent(row1, col1, row2, col2) {
        const rowDiff = Math.abs(row1 - row2);
        const colDiff = Math.abs(col1 - col2);
        
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }
    
    attemptSwap(row1, col1, row2, col2) {
        // Geçici swap yap
        const temp = this.board[row1][col1];
        this.board[row1][col1] = this.board[row2][col2];
        this.board[row2][col2] = temp;
        
        // Match kontrolü
        const matches = this.findAllMatches();
        
        if (matches.length > 0) {
            // Geçerli hamle
            this.moves--;
            this.processMatches(matches);
            this.updateUI();
            
            // Haptic feedback
            if (this.tg.HapticFeedback) {
                this.tg.HapticFeedback.impactOccurred('light');
            }
            
            // Oyun bitimi kontrolü
            this.checkGameEnd();
        } else {
            // Geçersiz hamle - geri al
            const temp = this.board[row1][col1];
            this.board[row1][col1] = this.board[row2][col2];
            this.board[row2][col2] = temp;
        }
        
        this.renderBoard();
    }
    
    findAllMatches() {
        const matches = [];
        
        // Yatay matches
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize - 2; col++) {
                const match = this.findHorizontalMatch(row, col);
                if (match.length >= 3) {
                    matches.push(...match);
                }
            }
        }
        
        // Dikey matches
        for (let col = 0; col < this.boardSize; col++) {
            for (let row = 0; row < this.boardSize - 2; row++) {
                const match = this.findVerticalMatch(row, col);
                if (match.length >= 3) {
                    matches.push(...match);
                }
            }
        }
        
        // Duplikatları kaldır
        return matches.filter((match, index, self) => 
            index === self.findIndex(m => m.row === match.row && m.col === match.col)
        );
    }
    
    findHorizontalMatch(row, startCol) {
        const match = [];
        const candyType = this.board[row][startCol].type;
        
        for (let col = startCol; col < this.boardSize; col++) {
            if (this.board[row][col].type === candyType) {
                match.push({ row, col, type: candyType });
            } else {
                break;
            }
        }
        
        return match.length >= 3 ? match : [];
    }
    
    findVerticalMatch(startRow, col) {
        const match = [];
        const candyType = this.board[startRow][col].type;
        
        for (let row = startRow; row < this.boardSize; row++) {
            if (this.board[row][col].type === candyType) {
                match.push({ row, col, type: candyType });
            } else {
                break;
            }
        }
        
        return match.length >= 3 ? match : [];
    }
    
    processMatches(matches) {
        // Puan hesapla
        let matchScore = 0;
        let earnedCoins = 0;
        
        if (matches.length === 3) {
            matchScore = 100;
            earnedCoins = this.coinRates.match3;
        } else if (matches.length === 4) {
            matchScore = 300;
            earnedCoins = this.coinRates.match4;
        } else if (matches.length >= 5) {
            matchScore = 500;
            earnedCoins = this.coinRates.match5;
        }
        
        this.score += matchScore;
        this.coins += earnedCoins;
        
        // Match'leri kaldır
        matches.forEach(match => {
            this.board[match.row][match.col] = null;
        });
        
        // Parçaları düşür
        this.dropCandies();
        
        // Yeni parçalar ekle
        this.fillBoard();
        
        // Çıktı gönder
        this.showScoreAnimation(`+${matchScore} Puan, +${earnedCoins} Coin!`);
    }
    
    dropCandies() {
        for (let col = 0; col < this.boardSize; col++) {
            let writeRow = this.boardSize - 1;
            
            for (let row = this.boardSize - 1; row >= 0; row--) {
                if (this.board[row][col] !== null) {
                    if (writeRow !== row) {
                        this.board[writeRow][col] = this.board[row][col];
                        this.board[row][col] = null;
                    }
                    writeRow--;
                }
            }
        }
    }
    
    fillBoard() {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (this.board[row][col] === null) {
                    let candyType;
                    do {
                        candyType = Math.floor(Math.random() * this.candyTypes);
                    } while (this.wouldCreateMatch(row, col, candyType));
                    
                    this.board[row][col] = {
                        type: candyType,
                        row: row,
                        col: col,
                        id: `${row}-${col}`
                    };
                }
            }
        }
    }
    
    checkGameEnd() {
        if (this.moves <= 0) {
            if (this.score >= this.targetScore) {
                this.levelComplete();
            } else {
                this.gameOver();
            }
        }
    }
    
    levelComplete() {
        // Level tamamlama bonusu
        const levelBonus = this.coinRates.levelComplete;
        this.coins += levelBonus;
        
        // Haptic feedback
        if (this.tg.HapticFeedback) {
            this.tg.HapticFeedback.notificationOccurred('success');
        }
        
        this.showLevelCompleteModal();
        this.sendGameResult();
    }
    
    gameOver() {
        this.showGameOverModal();
        this.sendGameResult();
    }
    
    showLevelCompleteModal() {
        const modal = document.getElementById('level-complete-modal');
        if (!modal) return;
        
        document.getElementById('level-score').textContent = this.score;
        document.getElementById('level-coins').textContent = this.coins;
        
        modal.classList.remove('hidden');
        
        this.tg.MainButton.setText('➡️ Sonraki Seviye');
        this.tg.MainButton.show();
        this.tg.MainButton.onClick(() => this.nextLevel());
    }
    
    showGameOverModal() {
        const modal = document.getElementById('game-over-modal');
        if (!modal) return;
        
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-coins').textContent = this.coins;
        
        modal.classList.remove('hidden');
        
        this.tg.MainButton.setText('🔄 Tekrar Oyna');
        this.tg.MainButton.show();
        this.tg.MainButton.onClick(() => this.restartLevel());
    }
    
    updateUI() {
        const scoreDisplay = document.getElementById('score-display');
        const coinsDisplay = document.getElementById('coins-display');
        const movesDisplay = document.getElementById('moves-display');
        const levelDisplay = document.getElementById('level-display');
        const targetDisplay = document.getElementById('target-display');
        
        if (scoreDisplay) scoreDisplay.textContent = this.score;
        if (coinsDisplay) coinsDisplay.textContent = this.coins;
        if (movesDisplay) movesDisplay.textContent = this.moves;
        if (levelDisplay) levelDisplay.textContent = this.currentLevel;
        if (targetDisplay) targetDisplay.textContent = this.targetScore;
        
        // Progress bar
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            const progress = Math.min(100, (this.score / this.targetScore) * 100);
            progressBar.style.width = `${progress}%`;
        }
    }
    
    // TRON Wallet Integration
    showWithdrawModal() {
        const availableUsdt = Math.floor(this.coins / this.withdrawLimits.coinToUsdt);
        
        if (availableUsdt < this.withdrawLimits.min) {
            alert(`Minimum ${this.withdrawLimits.min} USDT çekebilirsiniz. Daha fazla oynayın!`);
            return;
        }
        
        const modal = document.getElementById('withdraw-modal');
        if (!modal) return;
        
        document.getElementById('available-usdt').textContent = availableUsdt;
        modal.classList.remove('hidden');
    }
    
    async connectWallet() {
        try {
            // TronLink integration
            if (typeof window.tronWeb !== 'undefined') {
                const address = window.tronWeb.defaultAddress.base58;
                document.getElementById('wallet-address').textContent = address;
                document.getElementById('connect-wallet-btn').textContent = '✅ Wallet Bağlı';
                
                // Adresi kaydet
                this.userWallet = address;
                this.saveUserData();
            } else {
                alert('TronLink wallet bulunamadı! Lütfen yükleyin.');
            }
        } catch (error) {
            console.error('Wallet bağlama hatası:', error);
            alert('Wallet bağlanırken hata oluştu!');
        }
    }
    
    async processWithdraw(amount) {
        try {
            // Backend'e çekim isteği gönder
            const withdrawData = {
                action: 'withdraw_request',
                wallet_address: this.userWallet,
                amount: amount,
                coins_spent: amount * this.withdrawLimits.coinToUsdt,
                user_id: this.tg.initDataUnsafe?.user?.id
            };
            
            this.tg.sendData(JSON.stringify(withdrawData));
            
            // Coin'leri düş
            this.coins -= amount * this.withdrawLimits.coinToUsdt;
            this.updateUI();
            
            alert('Çekim işlemi başlatıldı! 24 saat içinde işlenecek.');
        } catch (error) {
            console.error('Çekim hatası:', error);
            alert('Çekim işleminde hata oluştu!');
        }
    }
    
    claimDailyBonus() {
        const lastClaim = localStorage.getItem('lastDailyBonus');
        const today = new Date().toDateString();
        
        if (lastClaim !== today) {
            const bonusCoins = 100;
            this.coins += bonusCoins;
            
            localStorage.setItem('lastDailyBonus', today);
            this.updateUI();
            this.saveUserData();
            
            alert(`🎁 Günlük bonus: +${bonusCoins} Coin!`);
        } else {
            alert('Günlük bonusunuz zaten alınmış!');
        }
    }
    
    sendGameResult() {
        const gameData = {
            action: 'game_result',
            level: this.currentLevel,
            score: this.score,
            coins_earned: this.coins,
            user_id: this.tg.initDataUnsafe?.user?.id
        };
        
        try {
            this.tg.sendData(JSON.stringify(gameData));
        } catch (error) {
            console.error('Sonuç gönderme hatası:', error);
        }
    }
    
    saveUserData() {
        const userData = {
            coins: this.coins,
            level: this.currentLevel,
            wallet: this.userWallet
        };
        
        localStorage.setItem('userData', JSON.stringify(userData));
        
        if (this.tg.CloudStorage) {
            this.tg.CloudStorage.setItem('userData', JSON.stringify(userData));
        }
    }
    
    loadUserData() {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            this.coins = userData.coins || 0;
            this.currentLevel = userData.level || 1;
            this.userWallet = userData.wallet || null;
            
            if (this.userWallet) {
                document.getElementById('wallet-address').textContent = this.userWallet;
                document.getElementById('connect-wallet-btn').textContent = '✅ Wallet Bağlı';
            }
        } catch (error) {
            console.error('Kullanıcı verisi yükleme hatası:', error);
        }
    }
    
    showScoreAnimation(text) {
        const animation = document.createElement('div');
        animation.className = 'score-animation';
        animation.textContent = text;
        document.body.appendChild(animation);
        
        setTimeout(() => {
            animation.remove();
        }, 2000);
    }
    
    startTimer() {
        this.startTime = Date.now();
    }
    
    nextLevel() {
        this.currentLevel++;
        this.moves = 30 + (this.currentLevel * 2); // Her seviyede +2 hamle
        this.targetScore = 1000 + (this.currentLevel * 500); // Artan hedef
        this.score = 0;
        
        document.getElementById('level-complete-modal').classList.add('hidden');
        this.tg.MainButton.hide();
        
        this.startGame();
    }
    
    restartLevel() {
        this.moves = 30;
        this.score = 0;
        
        document.getElementById('game-over-modal').classList.add('hidden');
        this.tg.MainButton.hide();
        
        this.startGame();
    }
}

// Oyunu başlat
document.addEventListener('DOMContentLoaded', () => {
    new CandyCrushGame();
});
