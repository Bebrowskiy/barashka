export async function uploadCoverImage(file) {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Upload failed: ${response.status}`);
        }

        const data = await response.json();
        return data.url;
    } catch (error) {
        console.error('Cover upload error:', error);
        throw error;
    }
}

export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export async function disablePwaForAuthGate() {
    if (!('serviceWorker' in navigator)) return;

    try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
    } catch (error) {
        console.warn('Failed to unregister service workers:', error);
    }

    if ('caches' in window) {
        try {
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map((key) => caches.delete(key)));
        } catch (error) {
            console.warn('Failed to clear caches:', error);
        }
    }
}

let settingsModule = null;
let downloadsModule = null;
let metadataModule = null;

export async function loadSettingsModule() {
    if (!settingsModule) {
        settingsModule = await import('../settings.js');
    }
    return settingsModule;
}

export async function loadDownloadsModule() {
    if (!downloadsModule) {
        downloadsModule = await import('../downloads.js');
    }
    return downloadsModule;
}

export async function loadMetadataModule() {
    if (!metadataModule) {
        metadataModule = await import('../metadata.js');
    }
    return metadataModule;
}
