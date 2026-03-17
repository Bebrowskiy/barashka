import{L as m}from"./index-KNTmqdu1.js";class h{constructor(){this.api=null,this.isVK=window.location.hostname.includes("vk.com")}parsePlaylistText(o){const s=o.split(/\r?\n/).filter(r=>r.trim()),n=[];for(const r of s){const t=r.trim();if(!t)continue;const e=t.indexOf(" - ");if(e>0){const i=t.substring(0,e).trim(),a=t.substring(e+3).trim();i&&a&&n.push({artist:i,title:a})}else n.push({artist:"",title:t})}return n}async processFile(o){return new Promise((s,n)=>{const r=new FileReader;r.onload=t=>{try{const e=t.target.result,i=this.parsePlaylistText(e);s(i)}catch(e){n(new Error(`Failed to parse file: ${e.message}`))}},r.onerror=()=>{n(new Error("Failed to read file"))},r.readAsText(o)})}async searchTrack(o,s,n){if(!n)return console.warn("[VK Importer] API not provided"),null;try{const r=`${o} ${s}`.trim(),t=await n.searchTracks(r,{limit:5});if(t&&t.items&&t.items.length>0){for(const e of t.items){const i=(e.artist?.name||"").toLowerCase(),a=(e.title||"").toLowerCase(),l=o.toLowerCase(),c=s.toLowerCase(),p=i.includes(l)||l.includes(i),u=a.includes(c)||c.includes(a);if(p&&u)return e}return t.items[0]}}catch(r){console.warn(`[VK Importer] Search failed for "${o} - ${s}":`,r)}return null}async importPlaylist(o,s,n="VK Import",r=null){const t=o.length,e=[],i=[],a=[];for(let l=0;l<o.length;l++){const{artist:c,title:p}=o[l];r&&r(l+1,t,{artist:c,title:p});const u=await this.searchTrack(c,p,s);u?e.push(u):c&&p?i.push({artist:c,title:p,reason:"not_found"}):a.push({artist:c,title:p,reason:"empty_data"}),l%10===0&&await new Promise(d=>setTimeout(d,100))}return e.length>0&&await m.createPlaylist(n,{tracks:e,source:"vk",importedAt:Date.now(),originalTrackCount:t}),{success:!0,playlistName:n,total:t,imported:e.length,failed:i.length,notFound:a.length,tracks:e,failedTracks:i,notFoundTracks:a}}generateBookmarklet(){return`
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
            alert(\`Exported \${list.length} tracks from "\${playlistName}"!

Now import this file in Barashka Music Player.\`);
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
        `.trim()}getBookmarkletURL(){const o=this.generateBookmarklet();return"javascript:"+encodeURIComponent(o)}generateInstructions(){return`
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
        `}generateUserscript(){return`
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
        `.trim()}}const g=new h;export{h as VKImporter,h as default,g as vkImporter};
