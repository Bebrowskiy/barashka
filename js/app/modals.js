let downloadsModule = null;

async function loadDownloadsModule() {
    if (!downloadsModule) {
        downloadsModule = await import('../downloads.js');
    }
    return downloadsModule;
}

export function showDiscographyDownloadModal(artist, api, quality, lyricsManager, triggerBtn) {
    const modal = document.getElementById('discography-download-modal');

    document.getElementById('discography-artist-name').textContent = artist.name;
    document.getElementById('albums-count').textContent = artist.albums?.length || 0;
    document.getElementById('eps-count').textContent = (artist.eps || []).filter((a) => a.type === 'EP').length;
    document.getElementById('singles-count').textContent = (artist.eps || []).filter((a) => a.type === 'SINGLE').length;

    document.getElementById('download-albums').checked = true;
    document.getElementById('download-eps').checked = true;
    document.getElementById('download-singles').checked = true;

    const closeModal = () => {
        modal.classList.remove('active');
    };

    const handleClose = (e) => {
        if (
            e.target === modal ||
            e.target.classList.contains('modal-overlay') ||
            e.target.closest('.close-modal-btn') ||
            e.target.id === 'cancel-discography-download'
        ) {
            closeModal();
        }
    };

    modal.addEventListener('click', handleClose);

    document.getElementById('start-discography-download').onclick = async () => {
        const includeAlbums = document.getElementById('download-albums').checked;
        const includeEPs = document.getElementById('download-eps').checked;
        const includeSingles = document.getElementById('download-singles').checked;

        if (!includeAlbums && !includeEPs && !includeSingles) {
            alert('Please select at least one type of release to download.');
            return;
        }

        closeModal();

        let selectedReleases = [];
        if (includeAlbums) {
            selectedReleases = selectedReleases.concat(artist.albums || []);
        }
        if (includeEPs) {
            selectedReleases = selectedReleases.concat((artist.eps || []).filter((a) => a.type === 'EP'));
        }
        if (includeSingles) {
            selectedReleases = selectedReleases.concat((artist.eps || []).filter((a) => a.type === 'SINGLE'));
        }

        triggerBtn.disabled = true;
        const originalHTML = triggerBtn.innerHTML;
        triggerBtn.innerHTML =
            '<svg class="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg><span>Downloading...</span>';

        try {
            const { downloadDiscography } = await loadDownloadsModule();
            await downloadDiscography(artist, selectedReleases, api, quality, lyricsManager);
        } catch (error) {
            console.error('Discography download failed:', error);
            alert('Failed to download discography: ' + error.message);
        } finally {
            triggerBtn.disabled = false;
            triggerBtn.innerHTML = originalHTML;
        }
    };

    modal.classList.add('active');
}
