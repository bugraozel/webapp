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
        
        // Touch/Drag sistemi için değişkenler
        this.isDragging = false;
        this.dragStartPos = null;
        this.dragEndPos = null;
        this.touchStartTime = 0;
        this.draggedCandy = null;
        
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
                
                // Touch event'lerini kur
                this.setupCandyTouchEvents(candyElement);
                
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
    
    setupCandyTouchEvents(candyElement) {
        // Touch events (mobil)
        candyElement.addEventListener('touchstart', (e) => this.handleTouchStart(e), {passive: false});
        candyElement.addEventListener('touchmove', (e) => this.handleTouchMove(e), {passive: false});
        candyElement.addEventListener('touchend', (e) => this.handleTouchEnd(e), {passive: false});
        
        // Mouse events (desktop)
        candyElement.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        candyElement.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        candyElement.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        candyElement.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
        
        // Drag ve context menu'yu devre dışı bırak
        candyElement.style.userSelect = 'none';
        candyElement.style.webkitUserSelect = 'none';
        candyElement.addEventListener('dragstart', (e) => e.preventDefault());
        candyElement.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    // Touch Event Handlers
    handleTouchStart(event) {
        if (this.isAnimating || this.moves <= 0) return;
        
        event.preventDefault();
        const touch = event.touches[0];
        const target = event.currentTarget;
        
        this.isDragging = false;
        this.dragStartPos = {x: touch.clientX, y: touch.clientY};
        this.touchStartTime = Date.now();
        this.draggedCandy = {
            row: parseInt(target.dataset.row),
            col: parseInt(target.dataset.col),
            element: target
        };
        
        // Seçili candy efekti
        this.clearSelection();
        target.classList.add('selected');
        this.selectedCandy = this.draggedCandy;
        
        // Haptic feedback
        if (this.tg.HapticFeedback) {
            this.tg.HapticFeedback.impactOccurred('light');
        }
    }
    
    handleTouchMove(event) {
        if (!this.draggedCandy || this.isAnimating) return;
        
        event.preventDefault();
        const touch = event.touches[0];
        const currentPos = {x: touch.clientX, y: touch.clientY};
        
        const deltaX = currentPos.x - this.dragStartPos.x;
        const deltaY = currentPos.y - this.dragStartPos.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Minimum drag distance kontrolü
        if (distance > 30) {
            this.isDragging = true;
            const direction = this.getDragDirection(deltaX, deltaY);
            if (direction) {
                this.highlightTargetCandy(direction);
                this.dragEndPos = direction;
            }
        }
    }
    
    handleTouchEnd(event) {
        if (!this.draggedCandy) return;
        
        event.preventDefault();
        
        if (this.isDragging && this.dragEndPos) {
            this.performSwap(this.dragEndPos);
        }
        
        this.resetDragState();
    }
    
    // Mouse Event Handlers (Desktop desteği)
    handleMouseDown(event) {
        if (this.isAnimating || this.moves <= 0) return;
        
        const target = event.currentTarget;
        
        this.isDragging = false;
        this.dragStartPos = {x: event.clientX, y: event.clientY};
        this.touchStartTime = Date.now();
        this.draggedCandy = {
            row: parseInt(target.dataset.row),
            col: parseInt(target.dataset.col),
            element: target
        };
        
        this.clearSelection();
        target.classList.add('selected');
        this.selectedCandy = this.draggedCandy;
    }
    
    handleMouseMove(event) {
        if (!this.draggedCandy || this.isAnimating) return;
        
        const currentPos = {x: event.clientX, y: event.clientY};
        const deltaX = currentPos.x - this.dragStartPos.x;
        const deltaY = currentPos.y - this.dragStartPos.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance > 20) {
            this.isDragging = true;
            const direction = this.getDragDirection(deltaX, deltaY);
            if (direction) {
                this.highlightTargetCandy(direction);
                this.dragEndPos = direction;
            }
        }
    }
    
    handleMouseUp(event) {
        if (!this.draggedCandy) return;
        
        if (this.isDragging && this.dragEndPos) {
            this.performSwap(this.dragEndPos);
        }
        
        this.resetDragState();
    }
    
    getDragDirection(deltaX, deltaY) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        
        // Minimum threshold
        if (absX < 20 && absY < 20) return null;
        
        // Hangi yön daha dominant
        if (absX > absY) {
            return deltaX > 0 ? 'right' : 'left';
        } else {
            return deltaY > 0 ? 'down' : 'up';
        }
    }
    
    highlightTargetCandy(direction) {
        if (!this.draggedCandy) return;
        
        const {row, col} = this.draggedCandy;
        let targetRow = row;
        let targetCol = col;
        
        // Hedef pozisyonu hesapla
        switch (direction) {
            case 'up': targetRow--; break;
            case 'down': targetRow++; break;
            case 'left': targetCol--; break;
            case 'right': targetCol++; break;
        }
        
        // Sınır kontrolü
        if (targetRow < 0 || targetRow >= this.boardSize || 
            targetCol < 0 || targetCol >= this.boardSize) {
            return;
        }
        
        // Önceki highlight'ları temizle
        document.querySelectorAll('.candy.target-highlight').forEach(el => {
            el.classList.remove('target-highlight');
        });
        
        // Hedef candy'yi highlight et
        const targetCandy = document.querySelector(`[data-row="${targetRow}"][data-col="${targetCol}"]`);
        if (targetCandy) {
            targetCandy.classList.add('target-highlight');
        }
    }
    
    performSwap(direction) {
        if (!this.draggedCandy) return;
        
        const {row, col} = this.draggedCandy;
        let targetRow = row;
        let targetCol = col;
        
        switch (direction) {
            case 'up': targetRow--; break;
            case 'down': targetRow++; break;
            case 'left': targetCol--; break;
            case 'right': targetCol++; break;
        }
        
        // Sınır kontrolü
        if (targetRow < 0 || targetRow >= this.boardSize || 
            targetCol < 0 || targetCol >= this.boardSize) {
            return;
        }
        
        // Swap işlemini gerçekleştir
        this.swapCandies({row, col}, {row: targetRow, col: targetCol});
        
        // Haptic feedback
        if (this.tg.HapticFeedback) {
            this.tg.HapticFeedback.impactOccurred('medium');
        }
    }
    
    resetDragState() {
        this.isDragging = false;
        this.dragStartPos = null;
        this.dragEndPos = null;
        this.draggedCandy = null;
        this.touchStartTime = 0;
        
        // Highlight'ları temizle
        document.querySelectorAll('.candy.target-highlight').forEach(el => {
            el.classList.remove('target-highlight');
        });
        
        // Seçimi temizle (kısa süre sonra)
        setTimeout(() => {
            this.clearSelection();
        }, 200);
    }
    
    swapCandies(candy1, candy2) {
        if (this.isAnimating) return;
        
        // Animasyon başlat
        this.isAnimating = true;
        
        // Yıldızları yer değiştir
        const temp = this.gameBoard[candy1.row][candy1.col];
        this.gameBoard[candy1.row][candy1.col] = this.gameBoard[candy2.row][candy2.col];
        this.gameBoard[candy2.row][candy2.col] = temp;
        
        // Görsel güncelleme
        this.refreshBoard();
        
        // Eşleşme kontrolü
        const hasMatch = this.checkMatch(candy1.row, candy1.col) || this.checkMatch(candy2.row, candy2.col);
        
        if (hasMatch) {
            this.moves--;
            this.processMatches();
            this.updateUI();
        } else {
            // Eşleşme yoksa geri al
            this.gameBoard[candy2.row][candy2.col] = this.gameBoard[candy1.row][candy1.col];
            this.gameBoard[candy1.row][candy1.col] = temp;
            this.refreshBoard();
        }
        
        this.isAnimating = false;
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
            
            // Eşleşen candy'leri kaldır
            matchedCandies.forEach(candy => {
                this.gameBoard[candy.row][candy.col] = null;
            });
            
            // Animasyon göster
            this.showScoreAnimation(points, coins);
            
            // Candy'leri düşür
            this.dropCandies();
            
            // Yeni candy'ler ekle
            this.fillEmptySpaces();
            
            // Tahtayı yenile
            this.refreshBoard();
            
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
        const levelDisplay = document.getElementById('level-display');
        const scoreDisplay = document.getElementById('score-display');
        const coinsDisplay = document.getElementById('coins-display');
        const movesDisplay = document.getElementById('moves-display');
        const targetScore = document.getElementById('target-score');
        const progressBar = document.getElementById('progress-bar');
        const charLevel = document.getElementById('char-level');
        
        if (levelDisplay) levelDisplay.textContent = `Seviye ${this.currentLevel}`;
        if (scoreDisplay) scoreDisplay.textContent = `Skor: ${this.score.toLocaleString()}`;
        if (coinsDisplay) coinsDisplay.textContent = this.totalCoins;
        if (movesDisplay) movesDisplay.textContent = this.moves;
        if (targetScore) targetScore.textContent = this.targetScore.toLocaleString();
        if (charLevel) charLevel.textContent = this.currentLevel;
        
        // İlerleme çubuğu
        if (progressBar) {
            const progress = Math.min((this.score / this.targetScore) * 100, 100);
            progressBar.style.width = `${progress}%`;
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
        console.log('✨ Seviye tamamlandı!');
        
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
            }
        } catch (error) {
            console.error('Oyun verisi kaydedilemedi:', error);
        }
    }
    
    gameOver() {
        alert('Oyun bitti! Hamleniz kalmadı.');
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
                    this.totalCoins = data.new_balance || (this.totalCoins + 50);
                    this.updateUI();
                    alert(`🎁 ${data.bonus_amount || 50} coin bonus aldınız!`);
                } else {
                    alert(data.message || 'Bonus zaten alınmış!');
                }
            }
        } catch (error) {
            console.error('Bonus alma hatası:', error);
            // Test modunda bonus ver
            this.totalCoins += 50;
            this.updateUI();
            alert('🎁 50 coin bonus aldınız! (Test modu)');
        }
        
        this.hideDailyBonusModal();
    }
    
    showWithdrawModal() {
        const modal = document.getElementById('withdraw-modal');
        const balanceElement = document.getElementById('current-balance');
        
        if (balanceElement) balanceElement.textContent = this.totalCoins;
        if (modal) modal.classList.remove('hidden');
    }
    
    hideWithdrawModal() {
        const modal = document.getElementById('withdraw-modal');
        if (modal) modal.classList.add('hidden');
    }
    
    async submitWithdrawRequest() {
        const amountInput = document.getElementById('withdraw-amount');
        const addressInput = document.getElementById('tron-address');
        
        if (!amountInput || !addressInput) return;
        
        const amount = parseInt(amountInput.value);
        const tronAddress = addressInput.value.trim();
        
        if (!amount || amount < 1000) {
            alert('Minimum 1000 coin çekebilirsiniz!');
            return;
        }
        
        if (!tronAddress || !tronAddress.startsWith('T') || tronAddress.length !== 34) {
            alert('Geçerli bir TRON adresi girin!');
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
                } else {
                    alert(`❌ ${data.message}`);
                }
            }
        } catch (error) {
            console.error('Çekim hatası:', error);
            alert('Çekim talebi gönderilemedi! (Test modu)');
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
                alert('✅ TronLink bağlandı!');
            } catch (error) {
                alert('❌ TronLink bağlantısı başarısız!');
            }
        } else {
            alert('TronLink yükleyin: https://www.tronlink.org/');
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
        window.game = new StarlightCrushGame();
    } catch (error) {
        console.error('Oyun başlatılamadı:', error);
    }
});
