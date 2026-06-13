import {
    SVG_PLAY,
    SVG_MENU,
    SVG_HEART,
    formatTime,
    hasExplicitContent,
    getTrackArtistsHTML,
    getTrackTitle,
    getTrackYearDisplay,
    createQualityBadgeHTML,
    escapeHtml,
} from '../utils.js';
import { cardSettings, contentBlockingSettings } from '../storage.js';

export const cardMixins = {
    createHeartIcon(filled = false) {
        if (filled) {
            return SVG_HEART.replace('class="heart-icon"', 'class="heart-icon filled"');
        }
        return SVG_HEART;
    },

    createExplicitBadge() {
        return '<span class="explicit-badge">E</span>';
    },

    createTrackItemHTML(track, index, showCover = false, hasMultipleDiscs = false, useTrackNumber = false) {
        const isUnavailable = track.isUnavailable;
        const isBlocked = contentBlockingSettings?.shouldHideTrack(track);
        const trackImageHTML = showCover
            ? this.getCoverHTML(track.album?.videoCover, track.album?.cover, 'Track Cover', 'track-item-cover')
            : '';

        let displayIndex;
        if (hasMultipleDiscs && !showCover) {
            const discNum = track.volumeNumber ?? track.discNumber ?? 1;
            displayIndex = `${discNum}-${track.trackNumber}`;
        } else if (useTrackNumber && track.trackNumber) {
            displayIndex = track.trackNumber;
        } else {
            displayIndex = index + 1;
        }

        const trackNumberHTML = `<div class="track-number">${showCover ? trackImageHTML : displayIndex}</div>`;
        const explicitBadge = hasExplicitContent(track) ? this.createExplicitBadge() : '';
        const qualityBadge = createQualityBadgeHTML(track);
        const trackTitle = getTrackTitle(track);
        const isCurrentTrack = this.player?.currentTrack?.id === track.id;

        if (track.isLocal && (!track.album?.cover || track.album.cover === 'assets/appicon.png')) {
            showCover = false;
        }

        const yearDisplay = getTrackYearDisplay(track);

        const actionsHTML = isUnavailable
            ? ''
            : `
            <button class="track-menu-btn" type="button" title="More options" ${track.isLocal ? 'style="display:none"' : ''}>
                ${SVG_MENU}
            </button>
        `;

        const blockedTitle = isBlocked
            ? `title="Blocked: ${contentBlockingSettings.isTrackBlocked(track.id) ? 'Track blocked' : contentBlockingSettings.isArtistBlocked(track.artist?.id) ? 'Artist blocked' : 'Album blocked'}"`
            : '';

        const classList = [
            'track-item',
            isCurrentTrack ? 'playing' : '',
            isUnavailable ? 'unavailable' : '',
            isBlocked ? 'blocked' : '',
        ]
            .filter(Boolean)
            .join(' ');

        return `
            <div class="${classList}" 
                 data-track-id="${track.id}" 
                 ${track.isLocal ? 'data-is-local="true"' : ''}
                 ${isUnavailable ? 'title="This track is currently unavailable"' : ''}
                 ${blockedTitle}>
                ${trackNumberHTML}
                <div class="track-item-info">
                    <div class="track-item-details">
                        <div class="title">
                            ${escapeHtml(trackTitle)}
                            ${explicitBadge}
                            ${qualityBadge}
                        </div>
                        <div class="artist">${getTrackArtistsHTML(track)}${yearDisplay}</div>
                    </div>
                </div>
                <div class="track-item-duration">${isUnavailable || isBlocked ? '--:--' : track.duration ? formatTime(track.duration) : '--:--'}</div>
                <div class="track-item-actions">
                    ${actionsHTML}
                </div>
            </div>
        `;
    },

    getCoverHTML(videoCover, cover, alt, className = 'card-image', loading = 'lazy') {
        const videoUrl = videoCover ? this.api.getVideoCoverUrl(videoCover) : null;
        if (videoUrl) {
            return `<video src="${videoUrl}" class="${className}" alt="${alt}" autoplay loop muted playsinline></video>`;
        }
        return `<img src="${this.api.getCoverUrl(cover)}" class="${className}" alt="${alt}" loading="${loading}">`;
    },

    createBaseCardHTML({
        type,
        id,
        href,
        title,
        subtitle,
        imageHTML,
        actionButtonsHTML,
        isCompact,
        extraAttributes = '',
        extraClasses = '',
    }) {
        const playBtnHTML =
            type !== 'artist'
                ? `
            <button class="play-btn card-play-btn" data-action="play-card" data-type="${type}" data-id="${id}" title="Play">
                ${SVG_PLAY}
            </button>
            <button class="card-menu-btn" data-action="card-menu" data-type="${type}" data-id="${id}" title="Menu">
                ${SVG_MENU}
            </button>
        `
                : '';

        const cardContent = `
            <div class="card-info">
                <h4 class="card-title">${title}</h4>
                ${subtitle ? `<p class="card-subtitle">${subtitle}</p>` : ''}
            </div>`;

        const buttonsInWrapper = !isCompact ? playBtnHTML : '';
        const buttonsOutside = isCompact ? playBtnHTML : '';

        return `
            <div class="card ${extraClasses} ${isCompact ? 'compact' : ''}" data-${type}-id="${id}" data-href="${href}" style="cursor: pointer;" ${extraAttributes}>
                <div class="card-image-wrapper">
                    ${imageHTML}
                    ${actionButtonsHTML}
                    ${buttonsInWrapper}
                </div>
                ${cardContent}
                ${buttonsOutside}
            </div>
        `;
    },

    createPlaylistCardHTML(playlist) {
        const imageId = playlist.squareImage || playlist.image || playlist.uuid;
        const isCompact = cardSettings.isCompactAlbum();

        return this.createBaseCardHTML({
            type: 'playlist',
            id: playlist.uuid,
            href: `/playlist/${playlist.uuid}`,
            title: playlist.title,
            subtitle: `${playlist.numberOfTracks || 0} tracks`,
            imageHTML: `<img src="${this.api.getCoverUrl(imageId)}" alt="${playlist.title}" class="card-image" loading="lazy">`,
            actionButtonsHTML: `
                <button class="like-btn card-like-btn" data-action="toggle-like" data-type="playlist" title="Add to Liked">
                    ${this.createHeartIcon(false)}
                </button>
            `,
            isCompact,
        });
    },

    createFolderCardHTML(folder) {
        const imageSrc = folder.cover || 'assets/folder.png';
        const isCompact = cardSettings.isCompactAlbum();

        return this.createBaseCardHTML({
            type: 'folder',
            id: folder.id,
            href: `/folder/${folder.id}`,
            title: escapeHtml(folder.name),
            subtitle: `${folder.playlists ? folder.playlists.length : 0} playlists`,
            imageHTML: `<img src="${imageSrc}" alt="${escapeHtml(folder.name)}" class="card-image" loading="lazy" onerror="this.src='/assets/folder.png'">`,
            actionButtonsHTML: '',
            isCompact,
        });
    },

    createMixCardHTML(mix) {
        const imageSrc = mix.cover || '/assets/appicon.png';
        const description = mix.subTitle || mix.description || '';
        const isCompact = cardSettings.isCompactAlbum();

        return this.createBaseCardHTML({
            type: 'mix',
            id: mix.id,
            href: `/mix/${mix.id}`,
            title: mix.title,
            subtitle: description,
            imageHTML: `<img src="${imageSrc}" alt="${mix.title}" class="card-image" loading="lazy">`,
            actionButtonsHTML: `
                <button class="like-btn card-like-btn" data-action="toggle-like" data-type="mix" title="Add to Liked">
                    ${this.createHeartIcon(false)}
                </button>
            `,
            isCompact,
        });
    },

    createUserPlaylistCardHTML(playlist, customSubtitle = null) {
        let imageHTML = '';
        if (playlist.cover) {
            imageHTML = `<img src="${playlist.cover}" alt="${playlist.name}" class="card-image" loading="lazy">`;
        } else {
            const tracks = playlist.tracks || [];
            let uniqueCovers = playlist.images || [];
            const seenCovers = new Set(uniqueCovers);

            if (uniqueCovers.length === 0) {
                for (const track of tracks) {
                    const cover = track.album?.cover;
                    if (cover && !seenCovers.has(cover)) {
                        seenCovers.add(cover);
                        uniqueCovers.push(cover);
                        if (uniqueCovers.length >= 4) break;
                    }
                }
            }

            if (uniqueCovers.length >= 2) {
                const count = Math.min(uniqueCovers.length, 4);
                const itemsClass = count < 4 ? `items-${count}` : '';
                const covers = uniqueCovers.slice(0, 4);
                imageHTML = `
                    <div class="card-image card-collage ${itemsClass}">
                        ${covers.map((cover) => `<img src="${this.api.getCoverUrl(cover)}" alt="" loading="lazy">`).join('')}
                    </div>
                `;
            } else if (uniqueCovers.length > 0) {
                imageHTML = `<img src="${this.api.getCoverUrl(uniqueCovers[0])}" alt="${playlist.name}" class="card-image" loading="lazy">`;
            } else {
                imageHTML = `<img src="/assets/appicon.png" alt="${playlist.name}" class="card-image" loading="lazy">`;
            }
        }

        const isCompact = cardSettings.isCompactAlbum();
        const subtitle =
            customSubtitle || `${playlist.tracks ? playlist.tracks.length : playlist.numberOfTracks || 0} tracks`;

        return this.createBaseCardHTML({
            type: 'user-playlist',
            id: playlist.id,
            href: `/userplaylist/${playlist.id}`,
            title: escapeHtml(playlist.name),
            subtitle,
            imageHTML: imageHTML,
            actionButtonsHTML: `
                <button class="edit-playlist-btn" data-action="edit-playlist" title="Edit Playlist">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button class="delete-playlist-btn" data-action="delete-playlist" title="Delete Playlist">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                </button>
            `,
            isCompact,
            extraAttributes: 'draggable="true"',
            extraClasses: 'user-playlist',
        });
    },

    createAlbumCardHTML(album) {
        const explicitBadge = hasExplicitContent(album) ? this.createExplicitBadge() : '';
        const qualityBadge = createQualityBadgeHTML(album);
        const isBlocked = contentBlockingSettings?.shouldHideAlbum(album);
        let yearDisplay = '';
        if (album.releaseDate) {
            const date = new Date(album.releaseDate);
            if (!isNaN(date.getTime())) yearDisplay = `${date.getFullYear()}`;
        }

        let typeLabel = '';
        if (album.type === 'EP') typeLabel = ' • EP';
        else if (album.type === 'SINGLE') typeLabel = ' • Single';

        const isCompact = cardSettings.isCompactAlbum();
        let artistName = '';
        if (album.artist) {
            artistName = typeof album.artist === 'string' ? album.artist : album.artist.name;
        } else if (album.artists?.length) {
            artistName = album.artists.map((a) => a.name).join(', ');
        }

        return this.createBaseCardHTML({
            type: 'album',
            id: album.id,
            href: `/album/${album.id}`,
            title: `${escapeHtml(album.title)} ${explicitBadge} ${qualityBadge}`,
            subtitle: `${escapeHtml(artistName)} • ${yearDisplay}${typeLabel}`,
            imageHTML: this.getCoverHTML(album.videoCover, album.cover, escapeHtml(album.title)),
            actionButtonsHTML: `
                <button class="like-btn card-like-btn" data-action="toggle-like" data-type="album" title="Add to Liked">
                    ${this.createHeartIcon(false)}
                </button>
            `,
            isCompact,
            extraClasses: isBlocked ? 'blocked' : '',
            extraAttributes: isBlocked
                ? `title="Blocked: ${contentBlockingSettings.isAlbumBlocked(album.id) ? 'Album blocked' : 'Artist blocked'}"`
                : '',
        });
    },

    createArtistCardHTML(artist) {
        const isCompact = cardSettings.isCompactArtist();
        const isBlocked = contentBlockingSettings?.shouldHideArtist(artist);

        return this.createBaseCardHTML({
            type: 'artist',
            id: artist.id,
            href: `/artist/${artist.id}`,
            title: escapeHtml(artist.name),
            subtitle: '',
            imageHTML: `<img src="${this.api.getArtistPictureUrl(artist.picture)}" alt="${escapeHtml(artist.name)}" class="card-image" loading="lazy">`,
            actionButtonsHTML: `
                <button class="like-btn card-like-btn" data-action="toggle-like" data-type="artist" title="Add to Liked">
                    ${this.createHeartIcon(false)}
                </button>
            `,
            isCompact,
            extraClasses: `artist${isBlocked ? ' blocked' : ''}`,
            extraAttributes: isBlocked ? 'title="Blocked: Artist blocked"' : '',
        });
    },

    createSkeletonTrack(showCover = false) {
        return `
            <div class="skeleton-track">
                ${showCover ? '<div class="skeleton skeleton-track-cover"></div>' : '<div class="skeleton skeleton-track-number"></div>'}
                <div class="skeleton-track-info">
                    <div class="skeleton-track-details">
                        <div class="skeleton skeleton-track-title"></div>
                        <div class="skeleton skeleton-track-artist"></div>
                    </div>
                </div>
                <div class="skeleton skeleton-track-duration"></div>
                <div class="skeleton skeleton-track-actions"></div>
            </div>
        `;
    },

    createSkeletonCard(isArtist = false) {
        return `
            <div class="skeleton-card ${isArtist ? 'artist' : ''}">
                <div class="skeleton skeleton-card-image"></div>
                <div class="skeleton skeleton-card-title"></div>
                ${!isArtist ? '<div class="skeleton skeleton-card-subtitle"></div>' : ''}
            </div>
        `;
    },

    createSkeletonTracks(count = 5, showCover = false) {
        return Array(count)
            .fill(0)
            .map(() => this.createSkeletonTrack(showCover))
            .join('');
    },

    createSkeletonCards(count = 6, isArtist = false) {
        return Array(count)
            .fill(0)
            .map(() => this.createSkeletonCard(isArtist))
            .join('');
    },

    createTrackCardHTML(track) {
        const isBlocked = contentBlockingSettings?.shouldHideTrack(track);
        const explicitBadge = hasExplicitContent(track) ? this.createExplicitBadge() : '';
        const qualityBadge = createQualityBadgeHTML(track);

        return `
            <div class="card track-card ${isBlocked ? 'blocked' : ''}" data-track-id="${track.id}" style="cursor: pointer;">
                <div class="card-image-wrapper">
                    ${this.getCoverHTML(track.album?.videoCover, track.album?.cover, getTrackTitle(track))}
                    <button class="play-btn card-play-btn" data-action="play-card" data-type="track" data-id="${track.id}" title="Play">
                        ${SVG_PLAY}
                    </button>
                </div>
                <div class="card-info">
                    <h4 class="card-title">${escapeHtml(getTrackTitle(track))} ${explicitBadge} ${qualityBadge}</h4>
                    <p class="card-subtitle">${getTrackArtistsHTML(track)}</p>
                </div>
            </div>
        `;
    },
};
