import { trackDismissUpdate } from '../analytics.js';

export function showOfflineNotification() {
    const notification = document.createElement('div');
    notification.className = 'offline-notification';
    notification.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span>You are offline. Some features may not work.</span>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slide-out 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

export function hideOfflineNotification() {
    const notification = document.querySelector('.offline-notification');
    if (notification) {
        notification.style.animation = 'slide-out 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }
}

export function showUpdateNotification(updateCallback) {
    const existingNotification = document.querySelector('.update-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
        <div>
            <strong>Update Available</strong>
            <p>A new version of Barashka is available.</p>
        </div>
        <div class="update-notification-actions">
            <button class="btn-primary" id="update-now-btn">Update Now</button>
            <button class="btn-icon" id="dismiss-update-btn" title="Dismiss">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    `;
    document.body.appendChild(notification);

    document.getElementById('update-now-btn').addEventListener('click', () => {
        if (typeof updateCallback === 'function') {
            updateCallback();
        } else if (updateCallback && updateCallback.postMessage) {
            updateCallback.postMessage({ action: 'skipWaiting' });
        } else {
            window.location.reload();
        }
    });

    document.getElementById('dismiss-update-btn').addEventListener('click', () => {
        trackDismissUpdate();
        notification.remove();
    });
}

export function showMissingTracksNotification(missingTracks) {
    const modal = document.getElementById('missing-tracks-modal');
    const listUl = document.getElementById('missing-tracks-list-ul');
    const copyBtn = document.getElementById('copy-missing-tracks-btn');

    listUl.innerHTML = missingTracks
        .map((track) => {
            const text =
                typeof track === 'string' ? track : `${track.artist ? track.artist + ' - ' : ''}${track.title}`;
            return `<li>${escapeHtmlLocal(text)}</li>`;
        })
        .join('');

    if (copyBtn) {
        const newCopyBtn = copyBtn.cloneNode(true);
        copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);

        newCopyBtn.addEventListener('click', () => {
            const textToCopy = missingTracks
                .map((track) => {
                    return typeof track === 'string'
                        ? track
                        : `${track.artist ? track.artist + ' - ' : ''}${track.title}`;
                })
                .join('\n');

            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalText = newCopyBtn.textContent;
                newCopyBtn.textContent = 'Copied!';
                setTimeout(() => (newCopyBtn.textContent = originalText), 2000);
            });
        });
    }

    const closeModal = () => modal.classList.remove('active');

    const handleClose = (e) => {
        if (
            e.target === modal ||
            e.target.closest('.close-missing-tracks') ||
            e.target.id === 'close-missing-tracks-btn' ||
            e.target.classList.contains('modal-overlay')
        ) {
            closeModal();
            modal.removeEventListener('click', handleClose);
        }
    };

    modal.addEventListener('click', handleClose);
    modal.classList.add('active');
}

function escapeHtmlLocal(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
