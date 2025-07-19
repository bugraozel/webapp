/**
 * Starlight Crush Oyunu - Ana JavaScript Dosyası
 * Telegram WebApp SDK entegrasyonu ile coin kazanma sistemi
 */

class StarlightCrushGame {
    constructor() {
        // Telegram WebApp SDK - test modu için güvenli başlatma
        this.tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : {
            ready: () => console.log('Test modu - Telegram hazır'),
            expand: () => console.log('Test modu - Telegram genişletildi'),
            initData: '',
            themeParams: {},
            HapticFeedback: null,
            MainButton: {
                show: () => {},
                hide: () => {},
                setText: () => {},
                onClick: () => {}
            }
        };
        
        this.currentLevel = 1;
        this.score = 0;
        this.totalCoins = 0;
        this.sessionCoins = 0;
        this.moves = 30;
        this.targetScore = 10000;
        this.gameBoard = [];
        this.boardSize = 8;
        this.candyTypes = ['⭐', '🌟', '✨', '💫', '⚡', '🔮']; // Yıldız teması
        this.selectedCandy = null;
        this.isAnimating = false;
        this.gameTime = 0;
        this.gameTimer = null;
        this.walletAddress = null;
        this.tronWeb = null;
        
        this.settings = {
            sound: true,
            vibration: true,
            difficulty: 'easy'
        };
        
        this.init();
    }
    
    init() {
        console.log('✨ Starlight Crush oyunu başlatılıyor...');
        
        // Telegram WebApp hazırla
        this.tg.ready();
        this.tg.expand();
        
        // Tema uygula
        this.applyTheme();
        
        // Event listener'ları kur
        this.setupEventListeners();
        
        // Oyunu başlat
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
    
    setupEventListeners() {
        // Modal butonları - güvenli element seçimi
        const dailyBonusBtn = document.getElementById('daily-bonus-btn');
        const withdrawBtn = document.getElementById('withdraw-btn');
        const walletBtn = document.getElementById('wallet-btn');
        
        if (dailyBonusBtn) dailyBonusBtn.addEventListener('click', () => this.showDailyBonusModal());
        if (withdrawBtn) withdrawBtn.addEventListener('click', () => this.showWithdrawModal());
        if (walletBtn) walletBtn.addEventListener('click', () => this.showWalletModal());
        
        // Daily bonus modal
        const claimBonusBtn = document.getElementById('claim-bonus-btn');
        const closeBonusBtn = document.getElementById('close-bonus-modal');
        
        if (claimBonusBtn) claimBonusBtn.addEventListener('click', () => this.claimDailyBonus());
        if (closeBonusBtn) closeBonusBtn.addEventListener('click', () => this.hideDailyBonusModal());
        
        // Withdrawal modal
        const submitWithdrawBtn = document.getElementById('submit-withdraw-btn');
        const closeWithdrawBtn = document.getElementById('close-withdraw-modal');
        
        if (submitWithdrawBtn) submitWithdrawBtn.addEventListener('click', () => this.submitWithdrawRequest());
        if (closeWithdrawBtn) closeWithdrawBtn.addEventListener('click', () => this.hideWithdrawModal());
        
        // Wallet modal
        const connectWalletBtn = document.getElementById('connect-wallet-btn');
        const closeWalletBtn = document.getElementById('close-wallet-modal');
        
        if (connectWalletBtn) connectWalletBtn.addEventListener('click', () => this.connectTronLink());
        if (closeWalletBtn) closeWalletBtn.addEventListener('click', () => this.hideWalletModal());
        
        // Completion modal
        const nextLevelBtn = document.getElementById('next-level-btn');
        const playAgainBtn = document.getElementById('play-again-btn');
        
        if (nextLevelBtn) nextLevelBtn.addEventListener('click', () => this.nextLevel());
        if (playAgainBtn) playAgainBtn.addEventListener('click', () => this.playAgain());
        
        // Rules modal
        const closeRulesBtn = document.getElementById('close-rules-modal');
        if (closeRulesBtn) closeRulesBtn.addEventListener('click', () => this.hideRulesModal());
    }
    
    async startGame() {
        console.log('🌟 Starlight Crush oyunu başlatılıyor...');
        
        // Kullanıcı verilerini yükle
        await this.loadUserData();
        
        // TronLink'i kontrol et
        this.checkTronLink();
        
        // Oyun tahtasını oluştur
        this.createBoard();
        
        // UI'yi güncelle
        this.updateUI();
        
        // Yükleme ekranını gizle
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            const gameContainer = document.getElementById('game-container');
            
            if (loadingScreen) loadingScreen.classList.add('hidden');
            if (gameContainer) gameContainer.classList.remove('hidden');
        }, 2000);
    }
    
    async loadUserData() {
        try {
            const initData = this.tg.initData;
            
            if (!initData) {
                console.log('Test modunda çalışıyor - varsayılan değerler kullanılıyor');
                this.totalCoins = 100;
                return;
            }
            
            const response = await fetch('/api/coins/balance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    initData: initData
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.totalCoins = data.coins || 0;
                console.log('Kullanıcı verisi yüklendi:', data);
            }
        } catch (error) {
            console.error('Kullanıcı verisi yüklenemedi:', error);
            this.totalCoins = 100; // Varsayılan değer
        }
    }
    
    checkTronLink() {
        if (window.tronWeb && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58) {
            this.tronWeb = window.tronWeb;
            this.walletAddress = window.tronWeb.defaultAddress.base58;
            
            const walletStatus = document.getElementById('wallet-status');
            const walletAddress = document.getElementById('wallet-address');
            const walletInfo = document.getElementById('wallet-info');
            
            if (walletStatus) walletStatus.textContent = 'Bağlı';
            if (walletAddress) walletAddress.textContent = this.walletAddress;
            if (walletInfo) walletInfo.classList.remove('hidden');
        }
    }
    
    createBoard() {
        const boardElement = document.getElementById('game-board');
        if (!boardElement) {
            console.error('Game board element bulunamadı!');
            return;
        }
        
        boardElement.style.gridTemplateColumns = `repeat(${this.boardSize}, 1fr)`;
        boardElement.innerHTML = '';
        
        // Oyun tahtasını başlat
        this.gameBoard = [];
        
        for (let row = 0; row < this.boardSize; row++) {
            this.gameBoard[row] = [];
            for (let col = 0; col < this.boardSize; col++) {
                const candyType = Math.floor(Math.random() * this.candyTypes.length);
                this.gameBoard[row][col] = candyType;
                
                const candyElement = document.createElement('div');
                candyElement.className = `candy candy-${candyType}`;
                candyElement.textContent = this.candyTypes[candyType];
                candyElement.dataset.row = row;
                candyElement.dataset.col = col;
                
                candyElement.addEventListener('click', (e) => this.handleCandyClick(e));
                
                boardElement.appendChild(candyElement);
            }
        }
        
        // İlk eşleşmeleri temizle
        this.removeInitialMatches();
    }
    
    removeInitialMatches() {
        let hasMatches = true;
        while (hasMatches) {
            hasMatches = false;
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    if (this.checkMatch(row, col)) {
                        this.gameBoard[row][col] = Math.floor(Math.random() * this.candyTypes.length);
                        hasMatches = true;
                    }
                }
            }
        }
        this.refreshBoard();
    }
    
    handleCandyClick(event) {
        if (this.isAnimating || this.moves <= 0) return;
        
        const row = parseInt(event.target.dataset.row);
        const col = parseInt(event.target.dataset.col);
        
        if (this.selectedCandy) {
            // İkinci yıldız seçildi - yer değiştirmeyi dene
            if (this.isAdjacent(this.selectedCandy, {row, col})) {
                this.swapCandies(this.selectedCandy, {row, col});
            }
            this.clearSelection();
        } else {
            // İlk yıldız seçildi
            this.selectedCandy = {row, col};
            event.target.classList.add('selected');
        }
    }
    
    isAdjacent(candy1, candy2) {
        const rowDiff = Math.abs(candy1.row - candy2.row);
        const colDiff = Math.abs(candy1.col - candy2.col);
        
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }
    
    swapCandies(candy1, candy2) {
        // Yıldızları yer değiştir
        const temp = this.gameBoard[candy1.row][candy1.col];
        this.gameBoard[candy1.row][candy1.col] = this.gameBoard[candy2.row][candy2.col];
        this.gameBoard[candy2.row][candy2.col] = temp;
        
        // Eşleşme kontrolü
        const hasMatch = this.checkMatch(candy1.row, candy1.col) || this.checkMatch(candy2.row, candy2.col);
        
        if (hasMatch) {
            this.moves--;
            this.processMatches();
            this.refreshBoard();
            this.updateUI();
        } else {
            // Eşleşme yoksa geri al
            this.gameBoard[candy2.row][candy2.col] = this.gameBoard[candy1.row][candy1.col];
            this.gameBoard[candy1.row][candy1.col] = temp;
        }
    }
    
    checkMatch(row, col) {
        const candyType = this.gameBoard[row][col];
        
        // Yatay kontrol
        let horizontalCount = 1;
        // Sol
        for (let c = col - 1; c >= 0 && this.gameBoard[row][c] === candyType; c--) {
            horizontalCount++;
        }
        // Sağ
        for (let c = col + 1; c < this.boardSize && this.gameBoard[row][c] === candyType; c++) {
            horizontalCount++;
        }
        
        // Dikey kontrol
        let verticalCount = 1;
        // Yukarı
        for (let r = row - 1; r >= 0 && this.gameBoard[r][col] === candyType; r--) {
            verticalCount++;
        }
        // Aşağı
        for (let r = row + 1; r < this.boardSize && this.gameBoard[r][col] === candyType; r++) {
            verticalCount++;
        }
        
        return horizontalCount >= 3 || verticalCount >= 3;
    }
    
    processMatches() {
        const matchedCandies = [];
        
        // Tüm eşleşmeleri bul
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (this.checkMatch(row, col)) {
                    matchedCandies.push({row, col});
                }
            }
        }
        
        if (matchedCandies.length > 0) {
            // Puan hesapla
            const points = matchedCandies.length * 100;
            const coins = Math.floor(points / 100);
            
            this.score += points;
            this.sessionCoins += coins;
            this.totalCoins += coins;
            
            // Eşleşen yıldızları kaldır
            matchedCandies.forEach(candy => {
                this.gameBoard[candy.row][candy.col] = null;
            });
            
            // Animasyon göster
            this.showScoreAnimation(points, coins);
            
            // Yıldızları düşür
            this.dropCandies();
            
            // Yeni yıldızlar ekle
            this.fillEmptySpaces();
            
            // Seviye kontrolü
            this.checkLevelCompletion();
        }
    }
    
    dropCandies() {
        for (let col = 0; col < this.boardSize; col++) {
            let writeIndex = this.boardSize - 1;
            
            for (let row = this.boardSize - 1; row >= 0; row--) {
                if (this.gameBoard[row][col] !== null) {
                    this.gameBoard[writeIndex][col] = this.gameBoard[row][col];
                    if (writeIndex !== row) {
                        this.gameBoard[row][col] = null;
                    }
                    writeIndex--;
                }
            }
        }
    }
    
    fillEmptySpaces() {
        for (let col = 0; col < this.boardSize; col++) {
            for (let row = 0; row < this.boardSize; row++) {
                if (this.gameBoard[row][col] === null) {
                    this.gameBoard[row][col] = Math.floor(Math.random() * this.candyTypes.length);
                }
            }
        }
    }
    
    refreshBoard() {
        const boardElement = document.getElementById('game-board');
        if (!boardElement) return;
        
        const candyElements = boardElement.querySelectorAll('.candy');
        
        candyElements.forEach((element, index) => {
            const row = Math.floor(index / this.boardSize);
            const col = index % this.boardSize;
            const candyType = this.gameBoard[row][col];
            
            if (candyType !== null && candyType !== undefined) {
                element.textContent = this.candyTypes[candyType];
                element.className = `candy candy-${candyType}`;
            }
        });
    }
    
    clearSelection() {
        const selectedElements = document.querySelectorAll('.candy.selected');
        selectedElements.forEach(candy => {
            candy.classList.remove('selected');
        });
        this.selectedCandy = null;
    }
    
    showScoreAnimation(points, coins) {
        const animation = document.createElement('div');
        animation.className = 'score-animation';
        animation.textContent = `+${points} puan, +${coins} coin ✨`;
        document.body.appendChild(animation);
        
        setTimeout(() => {
            if (animation.parentNode) {
                animation.parentNode.removeChild(animation);
            }
        }, 2000);
    }
    
    updateUI() {
        // Güvenli element güncellemeleri
        const elements = {
            levelDisplay: document.getElementById('level-display'),
            scoreDisplay: document.getElementById('score-display'),
            coinsDisplay: document.getElementById('coins-display'),
            movesDisplay: document.getElementById('moves-display'),
            targetDisplay: document.getElementById('target-score'),
            progressBar: document.getElementById('progress-bar'),
            charLevel: document.getElementById('char-level')
        };
        
        if (elements.levelDisplay) elements.levelDisplay.textContent = `Seviye ${this.currentLevel}`;
        if (elements.scoreDisplay) elements.scoreDisplay.textContent = `Skor: ${this.score.toLocaleString()}`;
        if (elements.coinsDisplay) elements.coinsDisplay.textContent = this.totalCoins;
        if (elements.movesDisplay) elements.movesDisplay.textContent = this.moves;
        if (elements.targetDisplay) elements.targetDisplay.textContent = this.targetScore.toLocaleString();
        if (elements.charLevel) elements.charLevel.textContent = this.currentLevel;
        
        // İlerleme çubuğu
        if (elements.progressBar) {
            const progress = Math.min((this.score / this.targetScore) * 100, 100);
            elements.progressBar.style.width = `${progress}%`;
        }
    }
    
    checkLevelCompletion() {
        if (this.score >= this.targetScore) {
            this.completeLevel();
        } else if (this.moves <= 0) {
            this.gameOver();
        }
    }
    
    async completeLevel() {
        console.log('🎉 Seviye tamamlandı!');
        
        // Oyun verilerini backend'e kaydet
        await this.saveGameData();
        
        // Tamamlama modalını göster
        this.showCompletionModal();
    }
    
    async saveGameData() {
        try {
            const initData = this.tg.initData;
            
            if (initData) {
                const response = await fetch('/api/game/finish', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        initData: initData,
                        score: this.score,
                        level: this.currentLevel,
                        matches: Math.floor(this.score / 100),
                        coinsEarned: this.sessionCoins
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('Oyun verisi kaydedildi:', data);
                }
            } else {
                console.log('Test modu - veri kaydedilmedi');
            }
        } catch (error) {
            console.error('Oyun verisi kaydedilemedi:', error);
        }
    }
    
    gameOver() {
        alert('🌟 Oyun bitti! Hamleniz kalmadı. Tekrar deneyin!');
        this.resetGame();
    }
    
    nextLevel() {
        this.currentLevel++;
        this.targetScore = Math.floor(this.targetScore * 1.5);
        this.moves = 30;
        this.score = 0;
        this.sessionCoins = 0;
        
        this.hideCompletionModal();
        this.createBoard();
        this.updateUI();
    }
    
    playAgain() {
        this.resetGame();
        this.hideCompletionModal();
    }
    
    resetGame() {
        this.currentLevel = 1;
        this.score = 0;
        this.sessionCoins = 0;
        this.moves = 30;
        this.targetScore = 10000;
        
        this.createBoard();
        this.updateUI();
    }
    
    // Modal fonksiyonları
    showDailyBonusModal() {
        const modal = document.getElementById('daily-bonus-modal');
        if (modal) modal.classList.remove('hidden');
    }
    
    hideDailyBonusModal() {
        const modal = document.getElementById('daily-bonus-modal');
        if (modal) modal.classList.add('hidden');
    }
    
    async claimDailyBonus() {
        try {
            const initData = this.tg.initData;
            
            const response = await fetch('/api/coins/daily-bonus', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    initData: initData || ''
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.totalCoins = data.new_balance;
                    this.updateUI();
                    alert(`🎁 ${data.bonus_amount} coin bonus aldınız!`);
                } else {
                    alert(data.message);
                }
            }
        } catch (error) {
            console.error('Bonus alma hatası:', error);
            // Test için varsayılan bonus
            this.totalCoins += 50;
            this.updateUI();
            alert('🎁 50 coin günlük bonus aldınız!');
        }
        
        this.hideDailyBonusModal();
    }
    
    showWithdrawModal() {
        const modal = document.getElementById('withdraw-modal');
        const currentBalance = document.getElementById('current-balance');
        
        if (currentBalance) currentBalance.textContent = this.totalCoins;
        if (modal) modal.classList.remove('hidden');
    }
    
    hideWithdrawModal() {
        const modal = document.getElementById('withdraw-modal');
        if (modal) modal.classList.add('hidden');
    }
    
    async submitWithdrawRequest() {
        const amountInput = document.getElementById('withdraw-amount');
        const tronAddressInput = document.getElementById('tron-address');
        
        if (!amountInput || !tronAddressInput) {
            alert('Form elemanları bulunamadı!');
            return;
        }
        
        const amount = parseInt(amountInput.value);
        const tronAddress = tronAddressInput.value.trim();
        
        if (!amount || amount < 1000) {
            alert('⚠️ Minimum 1000 coin çekebilirsiniz!');
            return;
        }
        
        if (!tronAddress || !tronAddress.startsWith('T') || tronAddress.length !== 34) {
            alert('⚠️ Geçerli bir TRON adresi girin! (T ile başlayan 34 karakter)');
            return;
        }
        
        if (amount > this.totalCoins) {
            alert('⚠️ Yetersiz bakiye!');
            return;
        }
        
        try {
            const initData = this.tg.initData;
            
            const response = await fetch('/api/withdrawal/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    initData: initData || '',
                    amount: amount,
                    tronAddress: tronAddress
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.totalCoins -= amount;
                    this.updateUI();
                    alert(`✅ ${data.message}`);
                    // Form temizle
                    amountInput.value = '';
                    tronAddressInput.value = '';
                } else {
                    alert(`❌ ${data.message}`);
                }
            }
        } catch (error) {
            console.error('Çekim hatası:', error);
            alert('❌ Çekim talebi gönderilemedi! İnternet bağlantınızı kontrol edin.');
        }
        
        this.hideWithdrawModal();
    }
    
    showWalletModal() {
        const modal = document.getElementById('wallet-modal');
        if (modal) modal.classList.remove('hidden');
    }
    
    hideWalletModal() {
        const modal = document.getElementById('wallet-modal');
        if (modal) modal.classList.add('hidden');
    }
    
    async connectTronLink() {
        if (window.tronWeb) {
            try {
                await window.tronWeb.request({method: 'tron_requestAccounts'});
                this.checkTronLink();
                alert('🔗 TronLink başarıyla bağlandı!');
            } catch (error) {
                alert('❌ TronLink bağlantısı başarısız!');
            }
        } else {
            alert('⚠️ TronLink yüklü değil! Lütfen yükleyin: https://www.tronlink.org/');
        }
        
        this.hideWalletModal();
    }
    
    showCompletionModal() {
        const modal = document.getElementById('completion-modal');
        const finalScore = document.getElementById('final-score');
        const earnedCoins = document.getElementById('earned-coins');
        
        if (finalScore) finalScore.textContent = this.score.toLocaleString();
        if (earnedCoins) earnedCoins.textContent = this.sessionCoins;
        if (modal) modal.classList.remove('hidden');
    }
    
    hideCompletionModal() {
        const modal = document.getElementById('completion-modal');
        if (modal) modal.classList.add('hidden');
    }
    
    hideRulesModal() {
        const modal = document.getElementById('rules-modal');
        if (modal) modal.classList.add('hidden');
    }
}

// Oyunu başlat
document.addEventListener('DOMContentLoaded', () => {
    console.log('✨ DOM yüklendi, Starlight Crush başlatılıyor...');
    try {
        new StarlightCrushGame();
    } catch (error) {
        console.error('Oyun başlatılamadı:', error);
    }
});