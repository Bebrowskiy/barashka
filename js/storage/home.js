export const homePageSettings = {
    SHOW_RECOMMENDED_SONGS_KEY: 'home-show-recommended-songs',
    SHOW_RECOMMENDED_ALBUMS_KEY: 'home-show-recommended-albums',
    SHOW_RECOMMENDED_ARTISTS_KEY: 'home-show-recommended-artists',
    SHOW_JUMP_BACK_IN_KEY: 'home-show-jump-back-in',

    shouldShowRecommendedSongs() {
        try {
            const val = localStorage.getItem(this.SHOW_RECOMMENDED_SONGS_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    setShowRecommendedSongs(enabled) {
        localStorage.setItem(this.SHOW_RECOMMENDED_SONGS_KEY, enabled ? 'true' : 'false');
    },

    shouldShowRecommendedAlbums() {
        try {
            const val = localStorage.getItem(this.SHOW_RECOMMENDED_ALBUMS_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    setShowRecommendedAlbums(enabled) {
        localStorage.setItem(this.SHOW_RECOMMENDED_ALBUMS_KEY, enabled ? 'true' : 'false');
    },

    shouldShowRecommendedArtists() {
        try {
            const val = localStorage.getItem(this.SHOW_RECOMMENDED_ARTISTS_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    setShowRecommendedArtists(enabled) {
        localStorage.setItem(this.SHOW_RECOMMENDED_ARTISTS_KEY, enabled ? 'true' : 'false');
    },

    shouldShowJumpBackIn() {
        try {
            const val = localStorage.getItem(this.SHOW_JUMP_BACK_IN_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    setShowJumpBackIn(enabled) {
        localStorage.setItem(this.SHOW_JUMP_BACK_IN_KEY, enabled ? 'true' : 'false');
    },

    SHOW_EDITORS_PICKS_KEY: 'home-show-editors-picks',

    shouldShowEditorsPicks() {
        try {
            const val = localStorage.getItem(this.SHOW_EDITORS_PICKS_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    setShowEditorsPicks(enabled) {
        localStorage.setItem(this.SHOW_EDITORS_PICKS_KEY, enabled ? 'true' : 'false');
    },

    SHUFFLE_EDITORS_PICKS_KEY: 'home-shuffle-editors-picks',

    shouldShuffleEditorsPicks() {
        try {
            const val = localStorage.getItem(this.SHUFFLE_EDITORS_PICKS_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    setShuffleEditorsPicks(enabled) {
        localStorage.setItem(this.SHUFFLE_EDITORS_PICKS_KEY, enabled ? 'true' : 'false');
    },
};
