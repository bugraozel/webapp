/**
 * Starlight Crush Oyunu - Ana JavaScript Dosyası
 * Telegram WebApp SDK entegrasyonu ile coin kazanma sistemi
 * Touch/Drag optimizasyonu ile mobil uyumlu
 */

class StarlightCrushGame {
    constructor() {
        // Telegram WebApp SDK - test modu için güvenli başlatma
        this.tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : {
            ready: () => console.log('Test modu - Telegram hazır'),
            expand: () => console.log('Test modu - Telegram genişletildi'),
            initData: '',
            themeParams: {},
            HapticFeedback: {
                impactOccurred: (style) => console.log('Haptic feedback:', style)
            },
            MainButton: {
                show: () => {},
                hide: () => {},
                setText: () => {},
                onClick: () => {}
            }
        };
        
        this.currentLevel = 1;
        this.score = 0;
        this.totalCoins = 100;
        this.sessionCoins = 0;
        this.moves = 30;
        this.targetScore = 10000;
        this.gameBoard = [];
        this.boardSize = 8;
        this.starTypes = ['⭐', '✨', '🌟', '💫', '🔮', '💎']; // Starlight teması
        this.selectedCandy = null;
        this.isAnimating = false;
        this.walletAddress = null;
        this.tronWeb = null;
        
        // Touch/Drag değişkenleri
        this.isDragging = false;
        this.dragStartPos = null;
        this.dragCurrentPos = null;
        this.dragElement = null;
        this.targetElement = null;
        
        this.settings = {
            sound: true,
            vibration: true,
            difficulty: 'easy'
        };
        
        this.init();
    }
    
    init() {
        console.log('Starlight Crush oyunu başlatılıyor...');
        
        // Telegram WebApp hazırla
        this.tg.ready();
        this.tg.expand();
        
        // Tema uygula
        this.applyTheme();
        
        // Event listener'ları kur
        this.setupEventListeners();
        
        // Guardian drag özelliğini ekle
        this.setupGuardianDrag();
        
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
    }
    
    setupEventListeners() {
        // Modal butonları
        const dailyBonusBtn = document.getElementById('daily-bonus-btn');
        const withdrawBtn = document.getElementById('withdraw-btn');
        const walletBtn = document.getElementById('wallet-btn');
        
        if (dailyBonusBtn) dailyBonusBtn.addEventListener('click', () => this.showDailyBonusModal());
        if (withdrawBtn) withdrawBtn.addEventListener('click', () => this.showWithdrawModal());
        if (walletBtn) walletBtn.addEventListener('click', () => this.showWalletModal());
        
        // Daily bonus modal
        const claimBonusBtn = document.getElementById('claim-bonus-btn');
        const closeBonusModal = document.getElementById('close-bonus-modal');
        if (claimBonusBtn) claimBonusBtn.addEventListener('click', () => this.claimDailyBonus());
        if (closeBonusModal) closeBonusModal.addEventListener('click', () => this.hideDailyBonusModal());
        
        // Withdrawal modal
        const submitWithdrawBtn = document.getElementById('submit-withdraw-btn');
        const closeWithdrawModal = document.getElementById('close-withdraw-modal');
        if (submitWithdrawBtn) submitWithdrawBtn.addEventListener('click', () => this.submitWithdrawRequest());
        if (closeWithdrawModal) closeWithdrawModal.addEventListener('click', () => this.hideWithdrawModal());
        
        // Wallet modal
        const connectWalletBtn = document.getElementById('connect-wallet-btn');
        const closeWalletModal = document.getElementById('close-wallet-modal');
        if (connectWalletBtn) connectWalletBtn.addEventListener('click', () => this.connectTronLink());
        if (closeWalletModal) closeWalletModal.addEventListener('click', () => this.hideWalletModal());
        
        // Completion modal
        const nextLevelBtn = document.getElementById('next-level-btn');
        const playAgainBtn = document.getElementById('play-again-btn');
        if (nextLevelBtn) nextLevelBtn.addEventListener('click', () => this.nextLevel());
        if (playAgainBtn) playAgainBtn.addEventListener('click', () => this.playAgain());
        
        // Rules modal
        const closeRulesModal = document.getElementById('close-rules-modal');
        if (closeRulesModal) closeRulesModal.addEventListener('click', () => this.hideRulesModal());
    }
    
    async startGame() {
        console.log('Oyun başlatılıyor...');
        
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
            document.getElementById('loading-screen').classList.add('hidden');
            document.getElementById('game-container').classList.remove('hidden');
        }, 2000);
    }
    
    async loadUserData() {
        try {
            const initData = this.tg.initData;
            
            if (!initData) {
                console.log('Test modunda çalışıyor...');
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
            this.totalCoins = 100;
        }
    }
    
    checkTronLink() {
        if (window.tronWeb && window.tronWeb.defaultAddress.base58) {
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
        if (!boardElement) return;
        
        boardElement.style.gridTemplateColumns = `repeat(${this.boardSize}, 1fr)`;
        boardElement.innerHTML = '';
        
        // Oyun tahtasını başlat
        this.gameBoard = [];
        
        for (let row = 0; row < this.boardSize; row++) {
            this.gameBoard[row] = [];
            for (let col = 0; col < this.boardSize; col++) {
                const candyType = Math.floor(Math.random() * this.starTypes.length);
                this.gameBoard[row][col] = candyType;
                
                const candyElement = document.createElement('div');
                candyElement.className = `candy candy-${candyType}`;
                candyElement.textContent = this.starTypes[candyType];
                candyElement.dataset.row = row;
                candyElement.dataset.col = col;
                
                // Touch/Drag event listeners
                this.addTouchEventListeners(candyElement);
                
                boardElement.appendChild(candyElement);
            }
        }
        
        // İlk eşleşmeleri temizle
        this.removeInitialMatches();
    }
    
    addTouchEventListeners(element) {
        // Mouse events
        element.addEventListener('mousedown', (e) => this.handleDragStart(e));
        element.addEventListener('mousemove', (e) => this.handleDragMove(e));
        element.addEventListener('mouseup', (e) => this.handleDragEnd(e));
        
        // Touch events - mobil için
        element.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleDragStart(e);
        }, { passive: false });
        
        element.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.handleDragMove(e);
        }, { passive: false });
        
        element.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleDragEnd(e);
        }, { passive: false });
    }
    
    handleDragStart(e) {
        if (this.isAnimating || this.moves <= 0) return;
        
        const element = e.target;
        if (!element.classList.contains('candy')) return;
        
        this.isDragging = true;
        this.dragElement = element;
        this.dragStartPos = this.getEventPos(e);
        
        element.classList.add('selected');
        
        // Haptic feedback
        this.tg.HapticFeedback.impactOccurred('light');
    }
    
    handleDragMove(e) {
        if (!this.isDragging || !this.dragElement) return;
        
        this.dragCurrentPos = this.getEventPos(e);
        
        // Drag mesafesini hesapla
        const deltaX = this.dragCurrentPos.x - this.dragStartPos.x;
        const deltaY = this.dragCurrentPos.y - this.dragStartPos.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Minimum drag mesafesi kontrolü
        if (distance > 30) {
            // Drag yönünü belirle
            const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
            const direction = this.getDirection(angle);
            
            const startRow = parseInt(this.dragElement.dataset.row);
            const startCol = parseInt(this.dragElement.dataset.col);
            const targetPos = this.getTargetPosition(startRow, startCol, direction);
            
            if (targetPos) {
                this.targetElement = this.getCandyAt(targetPos.row, targetPos.col);
                if (this.targetElement) {
                    this.targetElement.classList.add('target-highlight');
                }
            }
        }
    }
    
    handleDragEnd(e) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        
        if (this.dragElement) {
            this.dragElement.classList.remove('selected');
            
            if (this.targetElement) {
                this.targetElement.classList.remove('target-highlight');
                
                const startRow = parseInt(this.dragElement.dataset.row);
                const startCol = parseInt(this.dragElement.dataset.col);
                const targetRow = parseInt(this.targetElement.dataset.row);
                const targetCol = parseInt(this.targetElement.dataset.col);
                
                this.swapCandies(
                    { row: startRow, col: startCol },
                    { row: targetRow, col: targetCol }
                );
            }
        }
        
        this.resetDragState();
    }
    
    getEventPos(e) {
        const touch = e.touches ? e.touches[0] : e;
        return {
            x: touch.clientX,
            y: touch.clientY
        };
    }
    
    getDirection(angle) {
        // -45 to 45: sağ, 45 to 135: aşağı, 135 to -135: sol, -135 to -45: yukarı
        if (angle >= -45 && angle <= 45) return 'right';
        if (angle > 45 && angle <= 135) return 'down';
        if (angle > 135 || angle <= -135) return 'left';
        if (angle > -135 && angle < -45) return 'up';
    }
    
    getTargetPosition(row, col, direction) {
        switch (direction) {
            case 'up': return row > 0 ? { row: row - 1, col } : null;
            case 'down': return row < this.boardSize - 1 ? { row: row + 1, col } : null;
            case 'left': return col > 0 ? { row, col: col - 1 } : null;
            case 'right': return col < this.boardSize - 1 ? { row, col: col + 1 } : null;
            default: return null;
        }
    }
    
    getCandyAt(row, col) {
        const boardElement = document.getElementById('game-board');
        if (!boardElement) return null;
        
        const index = row * this.boardSize + col;
        return boardElement.children[index];
    }
    
    resetDragState() {
        this.dragElement = null;
        this.targetElement = null;
        this.dragStartPos = null;
        this.dragCurrentPos = null;
        
        // Tüm highlight'ları temizle
        document.querySelectorAll('.candy.selected, .candy.target-highlight').forEach(candy => {
            candy.classList.remove('selected', 'target-highlight');
        });
    }
    
    removeInitialMatches() {
        let hasMatches = true;
        let iterations = 0;
        while (hasMatches && iterations < 10) {
            hasMatches = false;
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    if (this.checkMatch(row, col)) {
                        this.gameBoard[row][col] = Math.floor(Math.random() * this.starTypes.length);
                        hasMatches = true;
                    }
                }
            }
            iterations++;
        }
        this.refreshBoard();
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
            
            // Haptic feedback
            this.tg.HapticFeedback.impactOccurred('medium');
        } else {
            // Eşleşme yoksa geri al
            this.gameBoard[candy2.row][candy2.col] = this.gameBoard[candy1.row][candy1.col];
            this.gameBoard[candy1.row][candy1.col] = temp;
            
            // Hafif vibrasyon - yanlış hamle
            this.tg.HapticFeedback.impactOccurred('light');
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
                    matchedCandies.push({ row, col });
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
            
            // Güçlü haptic feedback - başarılı eşleşme
            this.tg.HapticFeedback.impactOccurred('heavy');
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
                    this.gameBoard[row][col] = Math.floor(Math.random() * this.starTypes.length);
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
            
            element.textContent = this.starTypes[candyType];
            element.className = `candy candy-${candyType}`;
            element.dataset.row = row;
            element.dataset.col = col;
        });
    }
    
    showScoreAnimation(points, coins) {
        const animation = document.createElement('div');
        animation.className = 'score-animation';
        animation.textContent = `+${points} puan ⭐ +${coins} coin 💰`;
        document.body.appendChild(animation);
        
        setTimeout(() => {
            animation.remove();
        }, 2500);
    }
    
    updateUI() {
        const levelDisplay = document.getElementById('level-display');
        const scoreDisplay = document.getElementById('score-display');
        const coinsDisplay = document.getElementById('coins-display');
        const movesDisplay = document.getElementById('moves-display');
        const targetScore = document.getElementById('target-score');
        const progressBar = document.getElementById('progress-bar');
        const charLevelMini = document.getElementById('char-level-mini');
        
        if (levelDisplay) levelDisplay.textContent = `Seviye ${this.currentLevel}`;
        if (scoreDisplay) scoreDisplay.textContent = `Skor: ${this.score.toLocaleString()}`;
        if (coinsDisplay) coinsDisplay.textContent = this.totalCoins.toLocaleString();
        if (movesDisplay) movesDisplay.textContent = this.moves;
        if (targetScore) targetScore.textContent = this.targetScore.toLocaleString();
        if (charLevelMini) charLevelMini.textContent = this.currentLevel;
        
        // İlerleme çubuğu
        if (progressBar) {
            const progress = Math.min((this.score / this.targetScore) * 100, 100);
            progressBar.style.width = `${progress}%`;
        }
    }
    
    checkLevelCompletion() {
        if (this.score >= this.targetScore) {
            setTimeout(() => this.completeLevel(), 1000);
        } else if (this.moves <= 0) {
            setTimeout(() => this.gameOver(), 1000);
        }
    }
    
    async completeLevel() {
        console.log('Seviye tamamlandı!');
        
        // Oyun verilerini backend'e kaydet
        await this.saveGameData();
        
        // Tamamlama modalını göster
        this.showCompletionModal();
        
        // Güçlü haptic feedback
        this.tg.HapticFeedback.impactOccurred('heavy');
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
            }
        } catch (error) {
            console.error('Oyun verisi kaydedilemedi:', error);
        }
    }
    
    gameOver() {
        alert('🌟 Oyun bitti! Hamleniz kalmadı. Yeni oyun başlatılıyor...');
        this.resetGame();
    }
    
    nextLevel() {
        this.currentLevel++;
        this.targetScore = Math.floor(this.targetScore * 1.5);
        this.moves = Math.min(30 + this.currentLevel, 50);
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
                    this.totalCoins = data.new_balance || (this.totalCoins + 50);
                    this.updateUI();
                    alert(`🎁 ${data.bonus_amount || 50} coin bonus aldınız!`);
                    
                    // Haptic feedback
                    this.tg.HapticFeedback.impactOccurred('heavy');
                } else {
                    alert(data.message || 'Bugün bonus aldınız!');
                }
            }
        } catch (error) {
            console.error('Bonus alma hatası:', error);
            // Test modunda bonus ver
            this.totalCoins += 50;
            this.updateUI();
            alert('🎁 50 coin bonus aldınız!');
        }
        
        this.hideDailyBonusModal();
    }
    
    showWithdrawModal() {
        const modal = document.getElementById('withdraw-modal');
        const currentBalance = document.getElementById('current-balance');
        if (currentBalance) currentBalance.textContent = this.totalCoins.toLocaleString();
        if (modal) modal.classList.remove('hidden');
    }
    
    hideWithdrawModal() {
        const modal = document.getElementById('withdraw-modal');
        if (modal) modal.classList.add('hidden');
    }
    
    async submitWithdrawRequest() {
        const amountInput = document.getElementById('withdraw-amount');
        const tronAddressInput = document.getElementById('tron-address');
        
        if (!amountInput || !tronAddressInput) return;
        
        const amount = parseInt(amountInput.value);
        const tronAddress = tronAddressInput.value.trim();
        
        if (!amount || amount < 1000) {
            alert('⚠️ Minimum 1000 coin çekebilirsiniz!');
            return;
        }
        
        if (amount > this.totalCoins) {
            alert('⚠️ Yetersiz bakiye!');
            return;
        }
        
        if (!tronAddress || !tronAddress.startsWith('T') || tronAddress.length !== 34) {
            alert('⚠️ Geçerli bir TRON adresi girin!');
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
                    alert(`✅ ${data.message || 'Çekim talebi oluşturuldu!'}`);
                    
                    // Input'ları temizle
                    amountInput.value = '';
                    tronAddressInput.value = '';
                } else {
                    alert(`❌ ${data.message || 'Çekim talebi oluşturulamadı!'}`);
                }
            }
        } catch (error) {
            console.error('Çekim hatası:', error);
            alert('❌ Çekim talebi gönderilemedi!');
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
                await window.tronWeb.request({ method: 'tron_requestAccounts' });
                this.checkTronLink();
                alert('✅ TronLink başarıyla bağlandı!');
            } catch (error) {
                alert('❌ TronLink bağlantısı başarısız!');
            }
        } else {
            alert('📱 TronLink uygulamasını yükleyin: https://www.tronlink.org/');
            // Telegram'da link açma
            if (this.tg.openLink) {
                this.tg.openLink('https://www.tronlink.org/');
            }
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
    
    setupGuardianDrag() {
        const guardian = document.querySelector('.character-mini');
        if (!guardian) return;
        
        let isDragging = false;
        let startX, startY;
        let offsetX, offsetY;
        
        // Mouse events
        guardian.addEventListener('mousedown', (e) => {
            isDragging = true;
            guardian.style.transition = 'none';
            
            const rect = guardian.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            e.preventDefault();
        });
        
        // Touch events for mobile
        guardian.addEventListener('touchstart', (e) => {
            isDragging = true;
            guardian.style.transition = 'none';
            
            const rect = guardian.getBoundingClientRect();
            const touch = e.touches[0];
            offsetX = touch.clientX - rect.left;
            offsetY = touch.clientY - rect.top;
            
            document.addEventListener('touchmove', handleTouchMove);
            document.addEventListener('touchend', handleTouchEnd);
            e.preventDefault();
        });
        
        function handleMouseMove(e) {
            if (!isDragging) return;
            
            const newX = e.clientX - offsetX;
            const newY = e.clientY - offsetY;
            
            // Keep within screen bounds
            const maxX = window.innerWidth - guardian.offsetWidth;
            const maxY = window.innerHeight - guardian.offsetHeight;
            
            const constrainedX = Math.max(0, Math.min(newX, maxX));
            const constrainedY = Math.max(0, Math.min(newY, maxY));
            
            guardian.style.left = constrainedX + 'px';
            guardian.style.top = constrainedY + 'px';
            guardian.style.right = 'auto';
        }
        
        function handleMouseUp() {
            isDragging = false;
            guardian.style.transition = 'all 0.3s ease';
            
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }
        
        function handleTouchMove(e) {
            if (!isDragging) return;
            
            const touch = e.touches[0];
            const newX = touch.clientX - offsetX;
            const newY = touch.clientY - offsetY;
            
            // Keep within screen bounds
            const maxX = window.innerWidth - guardian.offsetWidth;
            const maxY = window.innerHeight - guardian.offsetHeight;
            
            const constrainedX = Math.max(0, Math.min(newX, maxX));
            const constrainedY = Math.max(0, Math.min(newY, maxY));
            
            guardian.style.left = constrainedX + 'px';
            guardian.style.top = constrainedY + 'px';
            guardian.style.right = 'auto';
            
            e.preventDefault();
        }
        
        function handleTouchEnd() {
            isDragging = false;
            guardian.style.transition = 'all 0.3s ease';
            
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        }
    }
}

// Oyunu başlat
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM yüklendi, Starlight Crush başlatılıyor...');
    new StarlightCrushGame();
});
