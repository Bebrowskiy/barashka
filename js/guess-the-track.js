/**
 * Guess The Track — Полноэкранная Модальная Версия (Glassmorphism Quiz)
 * Изолированная версия (Не конфликтует с основным плеером)
 */

class GuessTheTrackGame {
    constructor(ui, player, db) {
        this.ui = ui;
        this.player = player;
        this.db = db;

        // Состояние игры
        this.currentRound = 0;
        this.totalRounds = 10;
        this.score = 0;
        this.strength = 0; // кол-во правильных
        this.isPlaying = false;
        this.currentTrack = null;
        this.options = [];
        this.answeredRounds = [];

        // Аудио (Изолированное)
        this.localAudio = new Audio();
        this.audioActive = false;

        // Настройки
        this.previewDuration = 10000; // 10 секунд на раунд
        this.previewStartTime = 30; // секунда старта отрывка
        this.timerInterval = null;
        this.userSelection = null; // выбор пользователя

        // DOM элементы
        this.elements = {};
    }

    async init() {
        this.cacheElements();
        this.bindEvents();
        await this.loadHistory();
        await this.startGame();
    }

    cacheElements() {
        this.elements = {
            modal: document.getElementById('gtt-fullscreen-modal'),
            closeBtn: document.getElementById('gtt-close-btn'),
            roundInfo: document.getElementById('gtt-round'),
            progressBar: document.getElementById('gtt-progress-bar'),
            coverArt: document.getElementById('gtt-cover-art'),
            albumContainer: document.querySelector('.gtt-album-container'),
            optionBtns: Array.from(document.querySelectorAll('.gtt-option-btn')),
            scoreScreen: document.getElementById('gtt-score-screen'),
            finalScore: document.getElementById('gtt-final-score'),
            finalAccuracy: document.getElementById('gtt-final-accuracy'),
            playAgainBtn: document.getElementById('gtt-play-again-btn'),
        };
    }

    bindEvents() {
        // Чтобы не множить события, если init() вызывается повторно:
        // Лучше перезаписывать onClick, но для безопасности уберем старые:
        const clonePlayAgain = this.elements.playAgainBtn?.cloneNode(true);
        if (clonePlayAgain && this.elements.playAgainBtn) {
            this.elements.playAgainBtn.replaceWith(clonePlayAgain);
            this.elements.playAgainBtn = clonePlayAgain;
        }
        const cloneCloseBtn = this.elements.closeBtn?.cloneNode(true);
        if (cloneCloseBtn && this.elements.closeBtn) {
            this.elements.closeBtn.replaceWith(cloneCloseBtn);
            this.elements.closeBtn = cloneCloseBtn;
        }

        this.elements.playAgainBtn?.addEventListener('click', () => this.startGame());
        this.elements.closeBtn?.addEventListener('click', () => this.cleanupAndClose());

        this.elements.optionBtns.forEach((btn) => {
            const clone = btn.cloneNode(true);
            btn.replaceWith(clone);
        });
        
        // Refresh reference after clone
        this.elements.optionBtns = Array.from(document.querySelectorAll('.gtt-option-btn'));

        this.elements.optionBtns.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                if (this.isPlaying && !this.waitingNextRound) {
                    this.selectAnswer(index);
                }
            });
        });
    }

    cleanupAndClose() {
        this.cleanup();
        if (this.elements.modal) {
            this.elements.modal.style.display = 'none';
        }
        // Return to a safe UI state if they arrived via link
        this.ui.showPage('home'); 
    }

    cleanup() {
        clearInterval(this.timerInterval);
        if (this.localAudio) {
            this.localAudio.pause();
            this.localAudio.src = '';
        }
        this.isPlaying = false;
        this.waitingNextRound = false;
    }

    async loadHistory() {
        try {
            const history = await this.db.getHistory();
            this.history = history || [];
        } catch (error) {
            console.error('[GTT] Ошибка загрузки истории:', error);
            this.history = [];
        }
    }

    async startGame() {
        if (!this.history || this.history.length < 4) {
            alert('Нужно минимум 4 уникальных трека в вашей истории прослушивания для игры!');
            this.cleanupAndClose();
            return;
        }

        // Останавливаем основной плеер!
        if (this.player && this.player.audio) {
            this.player.audio.pause();
        }

        // Показываем полноэкранный модал
        if (this.elements.modal) {
            this.elements.modal.style.display = 'flex';
        }

        // Сброс
        this.currentRound = 0;
        this.score = 0;
        this.strength = 0;
        this.answeredRounds = [];
        this.isPlaying = true;
        this.waitingNextRound = false;

        if(this.elements.scoreScreen) this.elements.scoreScreen.style.display = 'none';

        await this.startRound();
    }

    async startRound() {
        if (this.currentRound >= this.totalRounds) {
            this.endGame();
            return;
        }

        this.currentRound++;
        this.updateRoundInfo();
        this.userSelection = null; // Сброс выбора
        this.waitingNextRound = false; // Разрешаем выбор
        
        // Сброс UI-классов анимаций обложки
        if (this.elements.albumContainer) {
            this.elements.albumContainer.classList.remove('revealed', 'correct-pulse', 'playing-pulse');
        }

        this.elements.optionBtns.forEach(btn => {
            btn.classList.remove('correct', 'incorrect', 'selected');
            btn.style.pointerEvents = 'auto'; // allow clicks
        });

        const roundData = await this.prepareRound();
        if (!roundData) {
            alert('Недостаточно уникальных треков для продолжения :(');
            this.endGame();
            return;
        }

        this.currentTrack = roundData.correct;
        this.options = roundData.options;

        await this.renderOptions();
        await this.playPreview();
    }

    async prepareRound() {
        const usedIds = this.answeredRounds.map((r) => r.correctId);
        const availableTracks = this.history.filter((t) => !usedIds.includes(t.id));

        if (availableTracks.length < 1) return null;

        const correctIndex = Math.floor(Math.random() * availableTracks.length);
        const correctTrack = availableTracks[correctIndex];

        const wrongOptions = this.selectWrongOptions(correctTrack, usedIds);
        if(wrongOptions.length < 3) return null; // Edge case
        
        const options = this.shuffleArray([correctTrack, ...wrongOptions]);

        return {
            correct: correctTrack,
            options: options,
        };
    }

    selectWrongOptions(correctTrack, usedIds) {
        const wrongOptions = [];
        const usedWrongIds = new Set();
        usedWrongIds.add(correctTrack.id);

        const availableRandom = this.history.filter((t) => !usedWrongIds.has(t.id));

        // Выбираем 3 случайных неправильных трека
        const shuffled = this.shuffleArray([...availableRandom]);
        for(let i=0; i<3; i++) {
            if (shuffled[i]) {
                wrongOptions.push(shuffled[i]);
            }
        }

        // Если не удалось набрать 3 трека из истории (история слишком маленькая)
        if (wrongOptions.length < 3) return [];

        return wrongOptions;
    }

    async renderOptions() {
        // Установка кнопок
        this.options.forEach((track, index) => {
            const btn = this.elements.optionBtns[index];
            if(!btn) return;
            
            const artistName = track.artist?.name || 'Unknown Artist';
            const trackTitle = track.title || 'Unknown Title';

            btn.querySelector('.gtt-opt-title').textContent = trackTitle;
            btn.querySelector('.gtt-opt-artist').textContent = artistName;
        });

        // Установка Размытой Обложки с ожиданием загрузки
        if (this.elements.coverArt) {
            let coverUrl = this.currentTrack.album?.cover || this.currentTrack.cover || this.currentTrack.image;
            if (coverUrl && !coverUrl.startsWith('http') && !coverUrl.startsWith('data:')) {
                coverUrl = this.player.api.getCoverUrl(coverUrl);
            }
            if (!coverUrl) {
                coverUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            }
            
            await new Promise((resolve) => {
                this.elements.coverArt.onload = resolve;
                this.elements.coverArt.onerror = resolve;
                this.elements.coverArt.src = coverUrl;
            });
        }
    }

    async playPreview() {
        const track = this.currentTrack;
        if (!track) return;
        
        clearInterval(this.timerInterval);

        try {
            this.localAudio.pause();
            
            // Получаем ссылку на стрим
            const streamUrl = await this.player.api.getStreamUrl(track.id, 'HIGH');
            this.localAudio.src = streamUrl;
            
            this.localAudio.currentTime = this.previewStartTime;
            
            // Предварительно показываем полный бар, пока ждем загрузку буфера
            this.elements.progressBar.style.transition = 'none';
            this.elements.progressBar.style.width = '100%';

            this.localAudio.play().then(() => {
                if (this.elements.albumContainer) {
                    this.elements.albumContainer.classList.add('playing-pulse');
                }
                this.startTimer();
            }).catch(e => {
                console.error('[GTT] Не удалось воспроизвести превью:', e);
                this.startTimer();
            });
        } catch (error) {
            console.error('[GTT] Ошибка воспроизведения превью:', error);
            // Фолбэк: быстро засчитать как пропуск, если трек сломан
            this.startTimer();
        }
    }

    startTimer() {
        const startTime = Date.now();
        const duration = this.previewDuration;

        this.elements.progressBar.style.transition = 'none';
        this.elements.progressBar.style.width = '100%';
        
        // Force reflow
        void this.elements.progressBar.offsetWidth;

        this.elements.progressBar.style.transition = `width ${duration / 1000}s linear`;
        this.elements.progressBar.style.width = '0%';

        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            if (elapsed >= duration) {
                clearInterval(this.timerInterval);
                this.timeOut();
            }
        }, 100);
    }

    timeOut() {
        if (!this.isPlaying) return;
        this.waitingNextRound = true;
        this.localAudio.pause();
        
        if (this.elements.albumContainer) {
            this.elements.albumContainer.classList.remove('playing-pulse');
        }

        // Вычисляем результаты по завершению таймера
        const correctIndex = this.options.findIndex((t) => t.id === this.currentTrack.id);
        const correctBtn = this.elements.optionBtns[correctIndex];

        let isCorrect = false;

        // Блокируем кнопки
        this.elements.optionBtns.forEach(btn => btn.style.pointerEvents = 'none');

        if (this.userSelection !== null) {
            const selectedBtn = this.elements.optionBtns[this.userSelection];
            isCorrect = this.userSelection === correctIndex;

            if (isCorrect) {
                this.score += 100;
                this.strength++;
                selectedBtn.classList.remove('selected');
                selectedBtn.classList.add('correct');
                this.revealCoverArt(true);
            } else {
                selectedBtn.classList.remove('selected');
                selectedBtn.classList.add('incorrect');
                if (correctBtn) correctBtn.classList.add('correct');
                this.revealCoverArt(false);
            }
        } else {
            // Пользователь ничего не выбрал
            if (correctBtn) correctBtn.classList.add('correct');
            this.revealCoverArt(false);
        }

        this.answeredRounds.push({
            correctId: this.currentTrack.id,
            userCorrect: isCorrect,
            timeOut: this.userSelection === null, 
        });

        // Пауза перед след. раундом (чтобы посмотреть картинку и ответ)
        setTimeout(() => this.startRound(), 3500);
    }

    selectAnswer(index) {
        if (this.waitingNextRound) return;
        
        // Запоминаем выбор пользователя, но ждем окончания таймера! (Можно менять выбор)
        this.userSelection = index;
        
        // Сбрасываем выделение со всех кнопок
        this.elements.optionBtns.forEach(btn => btn.classList.remove('selected'));
        
        // Визуально фиксируем выбор
        const selectedBtn = this.elements.optionBtns[index];
        if (selectedBtn) {
            selectedBtn.classList.add('selected');
        }
        
        // Музыка и таймер продолжают идти!
    }

    revealCoverArt(pulseCorrect = false) {
        if (this.elements.albumContainer) {
            this.elements.albumContainer.classList.add('revealed');
            if (pulseCorrect) {
                this.elements.albumContainer.classList.add('correct-pulse');
            }
        }
    }

    updateRoundInfo() {
        if (this.elements.roundInfo) {
            this.elements.roundInfo.textContent = `Round ${this.currentRound} / ${this.totalRounds}`;
        }
    }

    endGame() {
        this.isPlaying = false;
        clearInterval(this.timerInterval);
        this.localAudio.pause();

        const accuracy = Math.round((this.strength / this.totalRounds) * 100) || 0;

        if (this.elements.finalScore) this.elements.finalScore.textContent = this.score;
        if (this.elements.finalAccuracy) this.elements.finalAccuracy.textContent = `Accuracy: ${accuracy}%`;

        if (this.elements.scoreScreen) {
            this.elements.scoreScreen.style.display = 'flex';
        }
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}

export { GuessTheTrackGame };
