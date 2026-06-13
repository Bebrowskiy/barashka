export const contentBlockingSettings = {
    BLOCKED_ARTISTS_KEY: 'blocked-artists',
    BLOCKED_TRACKS_KEY: 'blocked-tracks',
    BLOCKED_ALBUMS_KEY: 'blocked-albums',

    getBlockedArtists() {
        try {
            const data = localStorage.getItem(this.BLOCKED_ARTISTS_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    },

    setBlockedArtists(artists) {
        localStorage.setItem(this.BLOCKED_ARTISTS_KEY, JSON.stringify(artists));
    },

    isArtistBlocked(artistId) {
        if (!artistId) return false;
        return this.getBlockedArtists().some((a) => a.id === artistId);
    },

    blockArtist(artist) {
        if (!artist || !artist.id) return;
        const blocked = this.getBlockedArtists();
        if (!blocked.some((a) => a.id === artist.id)) {
            blocked.push({
                id: artist.id,
                name: artist.name || 'Unknown Artist',
                blockedAt: Date.now(),
            });
            this.setBlockedArtists(blocked);
        }
    },

    unblockArtist(artistId) {
        const blocked = this.getBlockedArtists().filter((a) => a.id !== artistId);
        this.setBlockedArtists(blocked);
    },

    getBlockedTracks() {
        try {
            const data = localStorage.getItem(this.BLOCKED_TRACKS_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    },

    setBlockedTracks(tracks) {
        localStorage.setItem(this.BLOCKED_TRACKS_KEY, JSON.stringify(tracks));
    },

    isTrackBlocked(trackId) {
        if (!trackId) return false;
        return this.getBlockedTracks().some((t) => t.id === trackId);
    },

    blockTrack(track) {
        if (!track || !track.id) return;
        const blocked = this.getBlockedTracks();
        if (!blocked.some((t) => t.id === track.id)) {
            blocked.push({
                id: track.id,
                title: track.title || 'Unknown Track',
                artist: track.artist?.name || track.artist || 'Unknown Artist',
                blockedAt: Date.now(),
            });
            this.setBlockedTracks(blocked);
        }
    },

    unblockTrack(trackId) {
        const blocked = this.getBlockedTracks().filter((t) => t.id !== trackId);
        this.setBlockedTracks(blocked);
    },

    getBlockedAlbums() {
        try {
            const data = localStorage.getItem(this.BLOCKED_ALBUMS_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    },

    setBlockedAlbums(albums) {
        localStorage.setItem(this.BLOCKED_ALBUMS_KEY, JSON.stringify(albums));
    },

    isAlbumBlocked(albumId) {
        if (!albumId) return false;
        return this.getBlockedAlbums().some((a) => a.id === albumId);
    },

    blockAlbum(album) {
        if (!album || !album.id) return;
        const blocked = this.getBlockedAlbums();
        if (!blocked.some((a) => a.id === album.id)) {
            blocked.push({
                id: album.id,
                title: album.title || 'Unknown Album',
                artist: album.artist?.name || album.artist || 'Unknown Artist',
                blockedAt: Date.now(),
            });
            this.setBlockedAlbums(blocked);
        }
    },

    unblockAlbum(albumId) {
        const blocked = this.getBlockedAlbums().filter((a) => a.id !== albumId);
        this.setBlockedAlbums(blocked);
    },

    shouldHideTrack(track) {
        if (!track) return true;
        if (this.isTrackBlocked(track.id)) return true;
        if (track.artist?.id && this.isArtistBlocked(track.artist.id)) return true;
        if (track.artists?.some((a) => this.isArtistBlocked(a.id))) return true;
        if (track.album?.id && this.isAlbumBlocked(track.album.id)) return true;
        return false;
    },

    shouldHideAlbum(album) {
        if (!album) return true;
        if (this.isAlbumBlocked(album.id)) return true;
        if (album.artist?.id && this.isArtistBlocked(album.artist.id)) return true;
        if (album.artists?.some((a) => this.isArtistBlocked(a.id))) return true;
        return false;
    },

    shouldHideArtist(artist) {
        if (!artist) return true;
        return this.isArtistBlocked(artist.id);
    },

    filterTracks(tracks) {
        return tracks.filter((t) => !this.shouldHideTrack(t));
    },

    filterAlbums(albums) {
        return albums.filter((a) => !this.shouldHideAlbum(a));
    },

    filterArtists(artists) {
        return artists.filter((a) => !this.shouldHideArtist(a));
    },

    getTotalBlockedCount() {
        return this.getBlockedArtists().length + this.getBlockedTracks().length + this.getBlockedAlbums().length;
    },

    clearAllBlocked() {
        localStorage.removeItem(this.BLOCKED_ARTISTS_KEY);
        localStorage.removeItem(this.BLOCKED_TRACKS_KEY);
        localStorage.removeItem(this.BLOCKED_ALBUMS_KEY);
    },
};
