/**
 * Crossfade Manager для Barashka Music Player
 * Обеспечивает плавные переходы между треками с наложением
 * 
 * @module crossfade
 */

import { audioContextManager } from './audio-context.js';

/**
 * Кривые затухания для естественного восприятия
 */
const FADE_CURVES = {
    linear: (progress) => progress,
    logarithmic: (progress) => 1 - Math.log(1 + progress * (Math.E - 1)),
    exponential: (progress) => Math.pow(progress, 3),
    sine: (progress) => Math.sin((progress * Math.PI) / 2),
    cosine: (progress) => 1 - Math.cos((progress * Math.PI) / 2),
};

/**
 * Класс управления Crossfade переходами
 */
export class CrossfadeManager {
    constructor(audioElement) {
        this.audio = audioElement;
        this.nextAudio = null;
        this.isActive = false;
        this.animationFrame = null;
        
        // Параметры текущего перехода
        this.transition = {
            startTime: 0,
            duration: 5000,
            curve: 'logarithmic',
            targetVolume: 1.0,
            resolve: null,
        };
        
        // Gain nodes для Web Audio API
        this.currentGainNode = null;
        this.nextGainNode = null;
        
        // Очереди для плавного переключения
        this.pendingTransitions = [];
    }
    
    /**
     * Инициализация gain nodes через Web Audio API
     */
    initGainNodes() {
        if (!audioContextManager.isReady()) {
            audioContextManager.init(this.audio);
        }
        
        const context = audioContextManager.audioContext;
        
        // Создаём gain node для текущего трека
        if (!this.currentGainNode) {
            this.currentGainNode = context.createGain();
            this.currentGainNode.gain.value = 1.0;
        }
        
        // Создаём gain node для следующего трека
        if (!this.nextGainNode) {
            this.nextGainNode = context.createGain();
            this.nextGainNode.gain.value = 0.0;
        }
        
        return { current: this.currentGainNode, next: this.nextGainNode };
    }
    
    /**
     * Основная функция crossfade перехода
     * @param {HTMLAudioElement} nextAudio - Аудио элемент следующего трека
     * @param {number} duration - Длительность перехода в мс
     * @param {string} curve - Кривая затухания
     * @param {number} targetVolume - Целевая громкость
     * @returns {Promise<boolean>} - Успешность перехода
     */
    async transitionTo(nextAudio, duration = 5000, curve = 'logarithmic', targetVolume = 1.0) {
        if (this.isActive) {
            // Если уже идёт переход, добавляем в очередь
            return new Promise((resolve) => {
                this.pendingTransitions.push({
                    nextAudio,
                    duration,
                    curve,
                    targetVolume,
                    resolve,
                });
            });
        }
        
        this.isActive = true;
        this.transition = {
            startTime: performance.now(),
            duration,
            curve,
            targetVolume,
            resolve: null,
        };
        
        try {
            // Определяем, какой метод использовать
            const useWebAudio = audioContextManager.isReady() || audioContextManager.canInit();
            
            if (useWebAudio) {
                await this._crossfadeWebAudio(nextAudio, duration, curve, targetVolume);
            } else {
                await this._crossfadeSimple(nextAudio, duration, curve, targetVolume);
            }
            
            this.isActive = false;
            
            // Обрабатываем очередь
            if (this.pendingTransitions.length > 0) {
                const next = this.pendingTransitions.shift();
                return this.transitionTo(next.nextAudio, next.duration, next.curve, next.targetVolume);
            }
            
            return true;
            
        } catch (error) {
            console.error('[Crossfade] Transition failed:', error);
            this.isActive = false;
            this._cleanup();
            return false;
        }
    }
    
    /**
     * Crossfade с использованием Web Audio API (продвинутый метод)
     */
    async _crossfadeWebAudio(nextAudio, duration, curve, targetVolume) {
        const { current, next } = this.initGainNodes();
        const context = audioContextManager.audioContext;
        const startTime = context.currentTime;
        const endTime = startTime + (duration / 1000);
        
        // Получаем кривую затухания
        const fadeCurve = FADE_CURVES[curve] || FADE_CURVES.logarithmic;
        
        // Настраиваем текущий gain node (fade out)
        current.gain.cancelScheduledValues(startTime);
        current.gain.setValueAtTime(current.gain.value, startTime);
        
        // Настраиваем следующий gain node (fade in)
        next.gain.cancelScheduledValues(startTime);
        next.gain.setValueAtTime(0.001, startTime);
        
        // Планируем плавные переходы
        // Используем экспоненциальное затухание для более естественного звука
        current.gain.exponentialRampToValueAtTime(0.001, endTime);
        next.gain.exponentialRampToValueAtTime(targetVolume, endTime);
        
        // Подключаем nextAudio к gain node
        const nextSource = context.createMediaElementSource(nextAudio);
        nextSource.connect(next);
        next.connect(context.destination);
        
        // Переподключаем текущий audio к gain node
        // (если ещё не подключен)
        if (!this.audio._connectedToCrossfade) {
            const currentSource = context.createMediaElementSource(this.audio);
            currentSource.connect(current);
            current.connect(context.destination);
            this.audio._connectedToCrossfade = true;
        }
        
        // Запускаем следующий трек
        nextAudio.volume = 1.0; // Устанавливаем полную громкость, контролируем через gain
        await nextAudio.play();
        
        // Ждём завершения перехода
        return new Promise((resolve) => {
            this.transition.resolve = resolve;
            
            // Мониторим завершение
            setTimeout(() => {
                this._swapAudioElements(nextAudio);
                resolve();
            }, duration);
        });
    }
    
    /**
     * Простой crossfade через volume (fallback для старых браузеров)
     */
    async _crossfadeSimple(nextAudio, duration, curve, targetVolume) {
        const fadeCurve = FADE_CURVES[curve] || FADE_CURVES.logarithmic;
        const startTime = performance.now();
        const startVolume = this.audio.volume;
        
        // Запускаем следующий трек с нулевой громкостью
        nextAudio.volume = 0;
        nextAudio.preload = 'auto';
        
        // Ждём готовности следующего трека
        if (nextAudio.readyState < 3) {
            await new Promise((resolve) => {
                const canPlayHandler = () => {
                    nextAudio.removeEventListener('canplay', canPlayHandler);
                    resolve();
                };
                nextAudio.addEventListener('canplay', canPlayHandler);
                
                // Timeout на случай проблем с загрузкой
                setTimeout(resolve, 5000);
            });
        }
        
        // Запускаем воспроизведение
        await nextAudio.play().catch((e) => {
            console.warn('[Crossfade] Next audio play failed:', e);
        });
        
        // Анимация перехода
        return new Promise((resolve) => {
            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Применяем кривую затухания
                const easedProgress = fadeCurve(progress);
                
                // Fade out текущего трека
                this.audio.volume = startVolume * (1 - easedProgress);
                
                // Fade in следующего трека
                nextAudio.volume = targetVolume * easedProgress;
                
                if (progress < 1) {
                    this.animationFrame = requestAnimationFrame(animate);
                } else {
                    this._swapAudioElements(nextAudio);
                    resolve();
                }
            };
            
            this.animationFrame = requestAnimationFrame(animate);
        });
    }
    
    /**
     * Замена текущего audio элемента на следующий
     */
    _swapAudioElements(nextAudio) {
        // Копируем текущее время воспроизведения (если нужно)
        // nextAudio.currentTime = this.audio.currentTime;
        
        // Обновляем ссылку на текущий audio
        const oldAudio = this.audio;
        this.audio = nextAudio;
        
        // Очищаем старый audio элемент
        oldAudio.pause();
        oldAudio.src = '';
        oldAudio.load();
        
        // Сбрасываем gain nodes
        this._resetGainNodes();
        
        console.log('[Crossfade] Audio elements swapped');
    }
    
    /**
     * Сброс gain nodes после перехода
     */
    _resetGainNodes() {
        if (this.currentGainNode) {
            this.currentGainNode.gain.value = 1.0;
        }
        if (this.nextGainNode) {
            this.nextGainNode.gain.value = 0.0;
        }
    }
    
    /**
     * Очистка ресурсов
     */
    _cleanup() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        if (this.nextAudio) {
            this.nextAudio.pause();
            this.nextAudio.src = '';
            this.nextAudio = null;
        }
    }
    
    /**
     * Принудительная остановка crossfade
     */
    stop() {
        this._cleanup();
        this.isActive = false;
        this.pendingTransitions = [];
        
        // Восстанавливаем громкость
        this.audio.volume = this.transition.targetVolume;
    }
    
    /**
     * Проверка возможности crossfade
     * @param {number} timeRemaining - Оставшееся время текущего трека в секундах
     * @param {number} duration - Требуемая длительность crossfade в мс
     * @returns {boolean}
     */
    canCrossfade(timeRemaining, duration) {
        // Требуем минимум 1 секунду трека после начала crossfade
        const minRemaining = (duration / 1000) + 1;
        return timeRemaining >= minRemaining;
    }
    
    /**
     * Предпрослушивание crossfade (для настроек)
     * @param {number} duration - Длительность
     * @param {string} curve - Кривая
     */
    async preview(duration = 3000, curve = 'logarithmic') {
        const originalVolume = this.audio.volume;
        
        // Имитация fade out
        await this._fadeOutPreview(duration / 2, curve);
        
        // Имитация fade in
        await this._fadeInPreview(duration / 2, curve, originalVolume);
    }
    
    async _fadeOutPreview(halfDuration, curve) {
        const fadeCurve = FADE_CURVES[curve] || FADE_CURVES.logarithmic;
        const startVolume = this.audio.volume;
        const startTime = performance.now();
        
        return new Promise((resolve) => {
            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / halfDuration, 1);
                const easedProgress = fadeCurve(progress);
                
                this.audio.volume = startVolume * (1 - easedProgress);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            requestAnimationFrame(animate);
        });
    }
    
    async _fadeInPreview(halfDuration, curve, targetVolume) {
        const fadeCurve = FADE_CURVES[curve] || FADE_CURVES.logarithmic;
        const startVolume = this.audio.volume;
        const startTime = performance.now();
        
        return new Promise((resolve) => {
            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / halfDuration, 1);
                const easedProgress = fadeCurve(progress);
                
                this.audio.volume = startVolume + (targetVolume - startVolume) * easedProgress;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            requestAnimationFrame(animate);
        });
    }
    
    /**
     * Получение статуса crossfade
     */
    getStatus() {
        return {
            isActive: this.isActive,
            pendingCount: this.pendingTransitions.length,
            currentVolume: this.audio.volume,
        };
    }
}

/**
 * Синглтон экземпляр (будет инициализирован в app.js)
 */
export let crossfadeManager = null;

/**
 * Инициализация менеджера
 */
export function initCrossfadeManager(audioElement) {
    crossfadeManager = new CrossfadeManager(audioElement);
    return crossfadeManager;
}

/**
 * Экспорт для использования в других модулях
 */
export default CrossfadeManager;
