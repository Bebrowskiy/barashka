/**
 * VK Playlist Importer для Barashka Music Player
 * Импорт плейлистов из ВКонтакте через CSV/TXT файлы или прямой парсинг
 * 
 * @module vk-importer
 */

import { db } from './db.js';

/**
 * Класс для управления импортом из VK
 */
export class VKImporter {
    constructor() {
        this.api = null;
        this.isVK = window.location.hostname.includes('vk.com');
    }

    /**
     * Парсинг текста плейлиста в формате "Artist - Title"
     * @param {string} text - Текст плейлиста (каждый трек с новой строки)
     * @returns {Array} - Массив треков {artist, title}
     */
    parsePlaylistText(text) {
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        const tracks = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Разделяем по первому " - "
            const dashIndex = trimmed.indexOf(' - ');
            
            if (dashIndex > 0) {
                const artist = trimmed.substring(0, dashIndex).trim();
                const title = trimmed.substring(dashIndex + 3).trim();
                
                if (artist && title) {
                    tracks.push({ artist, title });
                }
            } else {
                // Если нет разделителя, считаем всё названием
                tracks.push({ artist: '', title: trimmed });
            }
        }

        return tracks;
    }

    /**
     * Обработка файла с плейлистом
     * @param {File} file - Файл для обработки
     * @returns {Promise<Array>} - Массив треков
     */
    async processFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    const tracks = this.parsePlaylistText(text);
                    resolve(tracks);
                } catch (error) {
                    reject(new Error(`Failed to parse file: ${error.message}`));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    }

    /**
     * Поиск трека в Tidal/Qobuz по artist и title
     * @param {string} artist - Исполнитель
     * @param {string} title - Название
     * @param {Object} api - API экземпляр
     * @returns {Promise<Object|null>} - Найденный трек или null
     */
    async searchTrack(artist, title, api) {
        if (!api) {
            console.warn('[VK Importer] API not provided');
            return null;
        }

        try {
            // Формируем поисковый запрос
            const query = `${artist} ${title}`.trim();
            
            // Ищем через API
            const result = await api.searchTracks(query, { limit: 5 });
            
            if (result && result.items && result.items.length > 0) {
                // Пытаемся найти наилучшее совпадение
                for (const track of result.items) {
                    const trackArtist = (track.artist?.name || '').toLowerCase();
                    const trackTitle = (track.title || '').toLowerCase();
                    const searchArtist = artist.toLowerCase();
                    const searchTitle = title.toLowerCase();

                    // Проверяем совпадение артиста и названия
                    const artistMatch = trackArtist.includes(searchArtist) || 
                                       searchArtist.includes(trackArtist);
                    const titleMatch = trackTitle.includes(searchTitle) || 
                                      searchTitle.includes(trackTitle);

                    if (artistMatch && titleMatch) {
                        return track;
                    }
                }

                // Если точного совпадения нет, возвращаем первый результат
                return result.items[0];
            }
        } catch (error) {
            console.warn(`[VK Importer] Search failed for "${artist} - ${title}":`, error);
        }

        return null;
    }

    /**
     * Импорт плейлиста из VK
     * @param {Array} tracks - Массив треков {artist, title}
     * @param {Object} api - API экземпляр
     * @param {string} playlistName - Название плейлиста
     * @param {Function} onProgress - Callback для прогресса (current, total, track)
     * @returns {Promise<Object>} - Результат импорта
     */
    async importPlaylist(tracks, api, playlistName = 'VK Import', onProgress = null) {
        const total = tracks.length;
        const imported = [];
        const failed = [];
        const notFound = [];

        for (let i = 0; i < tracks.length; i++) {
            const { artist, title } = tracks[i];
            
            // Обновляем прогресс
            if (onProgress) {
                onProgress(i + 1, total, { artist, title });
            }

            // Ищем трек
            const foundTrack = await this.searchTrack(artist, title, api);
            
            if (foundTrack) {
                imported.push(foundTrack);
            } else if (artist && title) {
                // Если не нашли, добавляем в failed с оригинальными данными
                failed.push({ artist, title, reason: 'not_found' });
            } else {
                notFound.push({ artist, title, reason: 'empty_data' });
            }

            // Небольшая задержка чтобы не спамить API
            if (i % 10 === 0) {
                await new Promise(r => setTimeout(r, 100));
            }
        }

        // Создаём плейлист в Barashka
        if (imported.length > 0) {
            await db.createPlaylist(playlistName, {
                tracks: imported,
                source: 'vk',
                importedAt: Date.now(),
                originalTrackCount: total,
            });
        }

        return {
            success: true,
            playlistName,
            total,
            imported: imported.length,
            failed: failed.length,
            notFound: notFound.length,
            tracks: imported,
            failedTracks: failed,
            notFoundTracks: notFound,
        };
    }

    /**
     * Генерация bookmarklet для экспорта из VK
     * @returns {string} - JavaScript код для bookmarklet
     */
    generateBookmarklet() {
        const code = `
(function() {
    const actionsLines = document.querySelectorAll('.AudioPlaylistSnippet__actions');
    
    // Проверяем, есть ли уже кнопка
    if (document.querySelector('.barashka-export-btn')) {
        alert('Barashka export button already exists!');
        return;
    }

    const exportTxt = () => {
        (async () => {
            const scroll = (top) => window.scrollTo({ top });
            const delay = (ms) => new Promise((r) => setTimeout(r, ms));

            async function scrollPlaylist() {
                const spinner = document.querySelector('.CatalogBlock__autoListLoader');
                let pageHeight = 0;
                do {
                    pageHeight = document.body.clientHeight;
                    scroll(pageHeight);
                    await delay(400);
                } while (
                    pageHeight < document.body.clientHeight ||
                    spinner?.style.display === ''
                );
            }

            function parsePlaylist() {
                return [...document.querySelectorAll('.audio_row__performer_title')].map(
                    (row) => {
                        const [artist, title] = [
                            '.audio_row__performers',
                            '.audio_row__title',
                        ]
                            .map((selector) => row.querySelector(selector)?.textContent || '')
                            .map((v) => v.replace(/[\\s\\n ]+/g, ' ').trim());

                        return [artist, title].join(' - ');
                    }
                );
            }

            function saveToFile(filename, content) {
                const data = content.replace(/\\n/g, '\\r\\n');
                const blob = new Blob([data], { type: 'text/plain' });
                const link = document.createElement('a');
                link.download = filename;
                link.href = URL.createObjectURL(blob);
                link.target = '_blank';
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            // getting playlist name & author
            const playlistAuthor = document
                .querySelector('.AudioPlaylistSnippet__author')
                .textContent.trim();

            const playlistName = document
                .querySelector('.AudioPlaylistSnippet__title--main')
                .textContent.trim();

            // main
            await scrollPlaylist();
            const list = parsePlaylist();
            saveToFile(\`\${playlistAuthor} - \${playlistName}.txt\`, list.join('\\n'));
            
            // Показываем уведомление
            alert(\`Exported \${list.length} tracks from "\${playlistName}"!\n\nNow import this file in Barashka Music Player.\`);
        })();
    };

    // creating the button
    const exportBtn = document.createElement('span');
    exportBtn.textContent = '🐑 Export to Barashka';
    exportBtn.className = 'barashka-export-btn';
    exportBtn.onclick = exportTxt;
    
    // styling the button
    Object.assign(exportBtn.style, {
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        color: '#fff',
        backgroundColor: '#4C75A3',
        fontWeight: '500',
        padding: '8px 16px',
        borderRadius: '8px',
        marginLeft: '12px',
        transition: 'background-color 0.2s',
        textDecoration: 'none',
        fontSize: '14px'
    });
    
    exportBtn.onmouseover = () => exportBtn.style.backgroundColor = '#5B85B8';
    exportBtn.onmouseout = () => exportBtn.style.backgroundColor = '#4C75A3';

    // append the button as a child to elements
    for (let i = 0; i < actionsLines.length; i++) {
        actionsLines[i].appendChild(exportBtn);
    }
    
    console.log('[Barashka] Export button added to', actionsLines.length, 'playlist(s)');
})();
        `.trim();

        return code;
    }

    /**
     * Создание bookmarklet URL
     * @returns {string} - bookmarklet URL
     */
    getBookmarkletURL() {
        const code = this.generateBookmarklet();
        return 'javascript:' + encodeURIComponent(code);
    }

    /**
     * Генерация инструкции для пользователя
     * @returns {string} - HTML инструкция
     */
    generateInstructions() {
        return `
            <div class="vk-import-instructions">
                <h3>📥 Как импортировать плейлист из VK</h3>
                
                <div class="instruction-step">
                    <h4>Способ 1: Через Bookmarklet (Рекомендуется)</h4>
                    <ol>
                        <li>Перетащите кнопку <strong>"Export to Barashka"</strong> в закладки браузера</li>
                        <li>Откройте любой плейлист ВКонтакте</li>
                        <li>Кликните по закладке "Export to Barashka"</li>
                        <li>Дождитесь прокрутки и экспорта плейлиста</li>
                        <li>Скачается файл с названием плейлиста</li>
                        <li>Импортируйте файл в Barashka через настройки</li>
                    </ol>
                </div>
                
                <div class="instruction-step">
                    <h4>Способ 2: Ручной экспорт</h4>
                    <ol>
                        <li>Скопируйте список треков из VK плейлиста</li>
                        <li>Вставьте в текстовый файл в формате: <code>Artist - Title</code></li>
                        <li>Сохраните файл с расширением .txt</li>
                        <li>Импортируйте файл через Barashka</li>
                    </ol>
                </div>
                
                <div class="instruction-step">
                    <h4>Способ 3: Прямой импорт (если работаете на vk.com)</h4>
                    <ol>
                        <li>Установите userscript менеджер (Tampermonkey, Violentmonkey)</li>
                        <li>Установите скрипт экспорта</li>
                        <li>Кнопка появится автоматически в плейлистах</li>
                    </ol>
                </div>
            </div>
        `;
    }

    /**
     * Создание userscript для Tampermonkey/Violentmonkey
     * @returns {string} - Userscript код
     */
    generateUserscript() {
        return `
// ==UserScript==
// @name         Barashka Music Player - VK Export
// @namespace    https://barashka.samidy.com
// @version      1.0.0
// @description  Экспорт плейлистов из ВКонтакте для импорта в Barashka Music Player
// @author       Barashka Team
// @match        https://vk.com/audios*
// @match        https://vk.com/playlists*
// @match        https://vk.com/artist/*
// @grant        none
// @license      Apache-2.0
// ==/UserScript==

(function() {
    'use strict';

    ${this.generateBookmarklet()}
})();
        `.trim();
    }
}

/**
 * Синглтон экземпляр
 */
export const vkImporter = new VKImporter();

/**
 * Экспорт по умолчанию
 */
export default VKImporter;
