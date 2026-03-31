// Тест Discord RPC - запустить в консоли разработчика
console.log('=== Discord RPC Test ===');

// 1. Проверка Tauri
console.log('1. Tauri available:', !!window.__TAURI_INTERNALS__);

// 2. Проверка invoke
try {
    const { invoke } = await import('@tauri-apps/api/core');
    console.log('2. Invoke function:', typeof invoke);
    
    // 3. Тестовый вызов
    console.log('3. Testing RPC call...');
    invoke('set_discord_presence', {
        details: 'Тест из консоли',
        stateStr: 'Проверка работы',
        largeImageKey: 'logo',
        largeText: 'Test',
        smallImageKey: 'logop',
        smallText: 'Barashka',
        startTimestamp: null,
        endTimestamp: null,
        button1Label: 'Test',
        button1Url: 'https://barashka-music.ru',
        button2Label: null,
        button2Url: null,
        trackId: 'console-test'
    }).then(() => {
        console.log('✅ RPC работает! Проверьте Discord');
    }).catch(e => {
        console.error('❌ RPC ошибка:', e);
    });
} catch (e) {
    console.error('❌ Ошибка импорта invoke:', e);
}

// 4. Проверка плеера
console.log('4. Player:', window.__barashkaPlayer ? 'exists' : 'MISSING');
if (window.__barashkaPlayer) {
    console.log('   - currentTrack:', window.__barashkaPlayer.currentTrack?.title || 'none');
    console.log('   - audio:', window.__barashkaPlayer.audio ? 'exists' : 'MISSING');
}

// 5. Проверка __getPlayerState
if (window.__getPlayerState) {
    const state = window.__getPlayerState();
    console.log('5. __getPlayerState:', state.error || 'OK', state.data?.trackMeta?.title);
}
