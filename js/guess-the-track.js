/**
 * Guess The Track — MVP Version
 * Игра: угадай трек по 5-секундному отрывку
 * Источник: история прослушиваний из db.js
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
        this.streak = 0;
        this.maxStreak = 0;
        this.isPlaying = false;
        this.currentTrack = null;
        this.options = [];
        this.answeredRounds = [];

        // Настройки
        this.previewDuration = 5000; // 5 секунд
        this.previewStartTime = 30000; // Начинаем с 30-й секунды

        // DOM элементы
        this.elements = {};
    }

    /**
     * Инициализация игры
     */
    async init() {
        this.cacheElements();
        this.bindEvents();
        await this.loadHistory();
    }

    /**
     * Кэширование DOM элементов
     */
    cacheElements() {
        this.elements = {
            view: document.getElementById('guess-the-track-view'),
            startBtn: document.getElementById('gtt-start-btn'),
            roundInfo: document.getElementById('gtt-round-info'),
            progressBar: document.getElementById('gtt-progress-bar'),
            scoreDisplay: document.getElementById('gtt-score'),
            streakDisplay: document.getElementById('gtt-streak'),
            previewPlayer: document.getElementById('gtt-preview-player'),
            optionsContainer: document.getElementById('gtt-options'),
            resultModal: document.getElementById('gtt-result-modal'),
            resultTitle: document.getElementById('gtt-result-title'),
            resultMessage: document.getElementById('gtt-result-message'),
            nextRoundBtn: document.getElementById('gtt-next-round-btn'),
            endGameBtn: document.getElementById('gtt-end-game-btn'),
            finalScore: document.getElementById('gtt-final-score'),
            finalAccuracy: document.getElementById('gtt-final-accuracy'),
        };
    }

    /**
     * Привязка событий
     */
    bindEvents() {
        this.elements.startBtn?.addEventListener('click', () => this.startGame());
        this.elements.nextRoundBtn?.addEventListener('click', () => this.nextRound());
        this.elements.endGameBtn?.addEventListener('click', () => this.endGame());
    }

    /**
     * Загрузка истории прослушиваний
     */
    async loadHistory() {
        try {
            const history = await this.db.getAllFromCollection('history_tracks');
            this.history = history || [];
            console.log(`[GTT] Загружено ${this.history.length} треков из истории`);
        } catch (error) {
            console.error('[GTT] Ошибка загрузки истории:', error);
            this.history = [];
        }
    }

    /**
     * Старт игры
     */
    async startGame() {
        if (this.history.length < 4) {
            this.ui.showNotification('Нужно минимум 4 трека в истории для игры!');
            return;
        }

        // Сброс состояния
        this.currentRound = 0;
        this.score = 0;
        this.streak = 0;
        this.maxStreak = 0;
        this.answeredRounds = [];
        this.isPlaying = true;

        // UI обновления
        this.elements.view?.classList.remove('hidden');
        this.elements.startBtn?.classList.add('hidden');
        this.updateScoreDisplay();

        // Первый раунд
        await this.startRound();
    }

    /**
     * Начало раунда
     */
    async startRound() {
        if (this.currentRound >= this.totalRounds) {
            this.endGame();
            return;
        }

        this.currentRound++;
        this.updateRoundInfo();

        // Выбор трека и вариантов
        const roundData = await this.prepareRound();
        if (!roundData) {
            this.ui.showNotification('Недостаточно треков для продолжения');
            this.endGame();
            return;
        }

        this.currentTrack = roundData.correct;
        this.options = roundData.options;

        // Рендер вариантов
        this.renderOptions();

        // Запуск превью
        await this.playPreview();
    }

    /**
     * Подготовка раунда (выбор трека + вариантов)
     */
    async prepareRound() {
        // Фильтруем уже использованные треки
        const usedIds = this.answeredRounds.map((r) => r.correctId);
        const availableTracks = this.history.filter((t) => !usedIds.includes(t.id));

        if (availableTracks.length < 1) return null;

        // Выбираем правильный трек (случайный)
        const correctIndex = Math.floor(Math.random() * availableTracks.length);
        const correctTrack = availableTracks[correctIndex];

        // Выбираем 3 неправильных варианта (похожий жанр/эпоха)
        const wrongOptions = this.selectWrongOptions(correctTrack, usedIds);

        // Перемешиваем варианты
        const options = this.shuffleArray([correctTrack, ...wrongOptions]);

        return {
            correct: correctTrack,
            options: options,
        };
    }

    /**
     * Выбор неправильных вариантов
     */
    selectWrongOptions(correctTrack, usedIds) {
        const wrongOptions = [];
        const usedWrongIds = new Set(usedIds);

        // Пытаемся найти треки того же артиста
        const sameArtist = this.history.filter(
            (t) => t.artist?.id === correctTrack.artist?.id && t.id !== correctTrack.id && !usedWrongIds.has(t.id)
        );

        // Пытаемся найти треки похожего жанра
        const sameGenre = this.history.filter(
            (t) => t.genre === correctTrack.genre && t.id !== correctTrack.id && !usedWrongIds.has(t.id)
        );

        // Случайные треки
        const random = this.history.filter((t) => t.id !== correctTrack.id && !usedWrongIds.has(t.id));

        // Берём по 1 из каждой категории (если есть)
        if (sameArtist.length > 0) wrongOptions.push(sameArtist[0]);
        if (sameGenre.length > 0 && wrongOptions.length < 2) wrongOptions.push(sameGenre[0]);
        while (wrongOptions.length < 3 && random.length > 0) {
            const idx = Math.floor(Math.random() * random.length);
            if (!wrongOptions.find((t) => t.id === random[idx].id)) {
                wrongOptions.push(random[idx]);
            }
            random.splice(idx, 1);
        }

        return wrongOptions.slice(0, 3);
    }

    /**
     * Рендер вариантов ответа
     */
    renderOptions() {
        const container = this.elements.optionsContainer;
        if (!container) return;

        container.innerHTML = '';

        this.options.forEach((track, index) => {
            const card = document.createElement('div');
            card.className = 'gtt-option-card';
            card.dataset.index = index;
            card.dataset.trackId = track.id;

            const coverUrl = track.cover?.url || track.image || this.ui.generatePlaceholder('album');
            const artistName = track.artist?.name || 'Unknown Artist';
            const trackTitle = track.title || 'Unknown Title';

            card.innerHTML = `
        <div class="gtt-option-cover">
          <img src="${coverUrl}" alt="${trackTitle}" loading="lazy" />
        </div>
        <div class="gtt-option-info">
          <div class="gtt-option-title">${this.ui.escapeHtml(trackTitle)}</div>
          <div class="gtt-option-artist">${this.ui.escapeHtml(artistName)}</div>
        </div>
      `;

            card.addEventListener('click', () => this.selectAnswer(index));
            container.appendChild(card);
        });
    }

    /**
     * Воспроизведение превью (5 секунд)
     */
    async playPreview() {
        const track = this.currentTrack;
        if (!track) return;

        // Блокируем варианты на время превью
        this.toggleOptions(false);

        try {
            // Используем существующий player.js для воспроизведения
            // Начинаем с 30-й секунды, играем 5 секунд
            await this.player.playTrack(track);
            this.player.audio.currentTime = this.previewStartTime / 1000;

            // Создаём таймер для остановки
            this.previewTimeout = setTimeout(() => {
                this.player.pause();
                this.toggleOptions(true);
            }, this.previewDuration);
        } catch (error) {
            console.error('[GTT] Ошибка воспроизведения превью:', error);
            this.toggleOptions(true);
        }
    }

    /**
     * Блокировка/разблокировка вариантов
     */
    toggleOptions(enabled) {
        const cards = this.elements.optionsContainer?.querySelectorAll('.gtt-option-card');
        cards?.forEach((card) => {
            card.style.pointerEvents = enabled ? 'auto' : 'none';
            card.style.opacity = enabled ? '1' : '0.5';
        });
    }

    /**
     * Выбор ответа
     */
    async selectAnswer(selectedIndex) {
        if (!this.isPlaying) return;

        // Очищаем таймер превью
        clearTimeout(this.previewTimeout);
        this.player.pause();

        const selectedTrack = this.options[selectedIndex];
        const isCorrect = selectedTrack.id === this.currentTrack.id;

        // Сохраняем результат раунда
        this.answeredRounds.push({
            correctId: this.currentTrack.id,
            selectedId: selectedTrack.id,
            isCorrect: isCorrect,
        });

        // Подсчёт очков
        if (isCorrect) {
            this.streak++;
            if (this.streak > this.maxStreak) this.maxStreak = this.streak;

            // Базовые очки + бонус за серию
            const basePoints = 100;
            const streakBonus = Math.min(this.streak * 10, 50);
            this.score += basePoints + streakBonus;

            this.showResult(true);
        } else {
            this.streak = 0;
            this.showResult(false);
        }

        this.updateScoreDisplay();
    }

    /**
     * Показ результата раунда
     */
    showResult(isCorrect) {
        const modal = this.elements.resultModal;
        const title = this.elements.resultTitle;
        const message = this.elements.resultMessage;

        if (!modal || !title || !message) return;

        modal.classList.remove('hidden');
        modal.classList.add(isCorrect ? 'gtt-correct' : 'gtt-wrong');

        if (isCorrect) {
            title.textContent = 'Верно! 🎉';
            message.textContent = this.currentTrack.title;
        } else {
            title.textContent = 'Неверно 😔';
            message.textContent = `Правильный ответ: ${this.currentTrack.title}`;
        }

        // Авто-скрытие через 2 секунды
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 2000);
    }

    /**
     * Следующий раунд
     */
    async nextRound() {
        await this.startRound();
    }

    /**
     * Конец игры
     */
    endGame() {
        this.isPlaying = false;
        this.player.pause();

        // Показываем финальные результаты
        const accuracy =
            this.answeredRounds.length > 0
                ? Math.round((this.answeredRounds.filter((r) => r.isCorrect).length / this.answeredRounds.length) * 100)
                : 0;

        if (this.elements.finalScore) {
            this.elements.finalScore.textContent = `${this.score} очков`;
        }
        if (this.elements.finalAccuracy) {
            this.elements.finalAccuracy.textContent = `${accuracy}% точности`;
        }

        // Возвращаем кнопку старта
        this.elements.startBtn?.classList.remove('hidden');
        this.elements.view?.classList.add('hidden');

        this.ui.showNotification(`Игра окончена! Счёт: ${this.score}`);
    }

    /**
     * Обновление отображения счёта
     */
    updateScoreDisplay() {
        if (this.elements.scoreDisplay) {
            this.elements.scoreDisplay.textContent = this.score;
        }
        if (this.elements.streakDisplay) {
            this.elements.streakDisplay.textContent = this.streak > 1 ? `🔥 ${this.streak}` : '';
        }
    }

    /**
     * Обновление информации о раунде
     */
    updateRoundInfo() {
        if (this.elements.roundInfo) {
            this.elements.roundInfo.textContent = `Раунд ${this.currentRound}/${this.totalRounds}`;
        }
        if (this.elements.progressBar) {
            const progress = (this.currentRound / this.totalRounds) * 100;
            this.elements.progressBar.style.width = `${progress}%`;
        }
    }

    /**
     * Перемешивание массива (Fisher-Yates)
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

// Экспорт для использования в app.js
export { GuessTheTrackGame };
