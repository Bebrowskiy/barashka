// js/music-api.js
// Unified API wrapper that supports Tidal, Qobuz, and YouTube

import { LosslessAPI } from './api.js';
import { QobuzAPI } from './qobuz-api.js';
import { YouTubeAPI } from './youtube-api.js';
import { musicProviderSettings } from './storage.js';

export class MusicAPI {
    constructor(settings) {
        this.tidalAPI = new LosslessAPI(settings);
        this.qobuzAPI = new QobuzAPI();
        this.youtubeAPI = new YouTubeAPI();
        this._settings = settings;
    }

    getCurrentProvider() {
        return musicProviderSettings.getProvider();
    }

    // Get the appropriate API based on provider
    getAPI(provider = null) {
        const p = provider || this.getCurrentProvider();
        if (p === 'qobuz') return this.qobuzAPI;
        if (p === 'youtube') return this.youtubeAPI;
        return this.tidalAPI;
    }

    // Search methods
    async searchTracks(query, options = {}) {
        const provider = options.provider || this.getCurrentProvider();
        return this.getAPI(provider).searchTracks(query, options);
    }

    async searchArtists(query, options = {}) {
        const provider = options.provider || this.getCurrentProvider();
        return this.getAPI(provider).searchArtists(query, options);
    }

    async searchAlbums(query, options = {}) {
        const provider = options.provider || this.getCurrentProvider();
        return this.getAPI(provider).searchAlbums(query, options);
    }

    async searchPlaylists(query, options = {}) {
        const provider = options.provider || this.getCurrentProvider();
        if (provider === 'qobuz') {
            // Qobuz doesn't support playlist search in the current API.
            return { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 };
        }
        return this.getAPI(provider).searchPlaylists(query, options);
    }

    // Get methods
    async getTrack(id, quality, provider = null) {
        const p = provider || this.getProviderFromId(id) || this.getCurrentProvider();
        const api = this.getAPI(p);
        const cleanId = this.stripProviderPrefix(id);
        return api.getTrack(cleanId, quality);
    }

    async getTrackMetadata(id, provider = null) {
        const p = provider || this.getProviderFromId(id) || this.getCurrentProvider();
        const api = this.getAPI(p);
        const cleanId = this.stripProviderPrefix(id);
        return api.getTrackMetadata(cleanId);
    }

    async getAlbum(id, provider = null) {
        const p = provider || this.getProviderFromId(id) || this.getCurrentProvider();
        const api = this.getAPI(p);
        const cleanId = this.stripProviderPrefix(id);
        return api.getAlbum(cleanId);
    }

    async getArtist(id, provider = null) {
        const p = provider || this.getProviderFromId(id) || this.getCurrentProvider();
        const api = this.getAPI(p);
        const cleanId = this.stripProviderPrefix(id);
        return api.getArtist(cleanId);
    }

    async getArtistBiography(id, provider = null) {
        const p = provider || this.getProviderFromId(id) || this.getCurrentProvider();
        if (p !== 'tidal') return null; // Biography only supported for Tidal

        const api = this.getAPI(p);
        const cleanId = this.stripProviderPrefix(id);
        if (typeof api.getArtistBiography === 'function') {
            return api.getArtistBiography(cleanId);
        }
        return null;
    }

    async getArtistSocials(artistName) {
        const p = this.getCurrentProvider();
        const api = this.getAPI(p);
        if (typeof api.getArtistSocials === 'function') {
            return api.getArtistSocials(artistName);
        }
        return null;
    }

    async getPlaylist(id, provider = null) {
        const p = provider || this.getProviderFromId(id) || this.getCurrentProvider();
        const api = this.getAPI(p);
        const cleanId = this.stripProviderPrefix(id);
        if (typeof api.getPlaylist === 'function') {
            return api.getPlaylist(cleanId);
        }
        return null;
    }

    async getMix(id, provider = null) {
        const p = provider || this.getCurrentProvider();
        const api = this.getAPI(p);
        if (typeof api.getMix === 'function') {
            return api.getMix(id);
        }
        return { mix: null, tracks: [] };
    }

    async getTrackRecommendations(id) {
        const p = this.getProviderFromId(id) || this.getCurrentProvider();
        const api = this.getAPI(p);
        const cleanId = this.stripProviderPrefix(id);
        if (typeof api.getTrackRecommendations === 'function') {
            return api.getTrackRecommendations(cleanId);
        }
        return [];
    }

    // Stream methods
    async getStreamUrl(id, quality, provider = null) {
        const p = provider || this.getProviderFromId(id) || this.getCurrentProvider();
        const api = this.getAPI(p);
        const cleanId = this.stripProviderPrefix(id);
        return api.getStreamUrl(cleanId, quality);
    }

    async getVideoStreamUrl(id, provider = null) {
        const p = provider || this.getProviderFromId(id) || this.getCurrentProvider();
        const api = this.getAPI(p);
        const cleanId = this.stripProviderPrefix(id);
        if (typeof api.getVideoStreamUrl === 'function') {
            return api.getVideoStreamUrl(cleanId);
        }
        return null;
    }

    // Cover/artwork methods
    getCoverUrl(id, size = '320') {
        if (typeof id === 'string' && id.startsWith('blob:')) {
            return id;
        }
        if (typeof id === 'string' && id.startsWith('q:')) {
            return this.qobuzAPI.getCoverUrl(id.slice(2), size);
        }
        if (typeof id === 'string' && id.startsWith('y:')) {
            return this.youtubeAPI.getCoverUrl(id.slice(2), size);
        }
        if (typeof id === 'string' && id.startsWith('http')) {
            return id;
        }
        return this.tidalAPI.getCoverUrl(id, size);
    }

    getVideoCoverUrl(videoCoverId, fallbackCoverId, size = '1280') {
        const p = this.getCurrentProvider();
        const api = this.getAPI(p);
        if (videoCoverId && typeof api.getVideoCoverUrl === 'function') {
            const videoUrl = api.getVideoCoverUrl(videoCoverId, fallbackCoverId, size);
            if (videoUrl) return videoUrl;
        }
        return this.getCoverUrl(fallbackCoverId, size);
    }

    getArtistPictureUrl(id, size = '320') {
        if (typeof id === 'string' && id.startsWith('q:')) {
            return this.qobuzAPI.getArtistPictureUrl(id.slice(2), size);
        }
        if (typeof id === 'string' && id.startsWith('y:')) {
            return this.youtubeAPI.getArtistPictureUrl(id.slice(2), size);
        }
        if (typeof id === 'string' && id.startsWith('http')) {
            return id;
        }
        return this.tidalAPI.getArtistPictureUrl(id, size);
    }

    extractStreamUrlFromManifest(manifest) {
        return this.tidalAPI.extractStreamUrlFromManifest(manifest);
    }

    // Helper methods
    getProviderFromId(id) {
        if (typeof id === 'string') {
            if (id.startsWith('q:')) return 'qobuz';
            if (id.startsWith('t:')) return 'tidal';
            if (id.startsWith('y:')) return 'youtube';
        }
        return null;
    }

    stripProviderPrefix(id) {
        if (typeof id === 'string') {
            if (id.startsWith('q:') || id.startsWith('t:') || id.startsWith('y:')) {
                return id.slice(2);
            }
        }
        return id;
    }

    // Download methods
    async downloadTrack(id, quality, filename, options = {}) {
        const provider = this.getProviderFromId(id) || this.getCurrentProvider();
        const api = this.getAPI(provider);
        const cleanId = this.stripProviderPrefix(id);
        return api.downloadTrack(cleanId, quality, filename, options);
    }

    // Similar/recommendation methods
    async getSimilarArtists(artistId) {
        const provider = this.getProviderFromId(artistId) || this.getCurrentProvider();
        const api = this.getAPI(provider);
        const cleanId = this.stripProviderPrefix(artistId);
        return api.getSimilarArtists(cleanId);
    }

    async getSimilarAlbums(albumId) {
        const provider = this.getProviderFromId(albumId) || this.getCurrentProvider();
        const api = this.getAPI(provider);
        const cleanId = this.stripProviderPrefix(albumId);
        return api.getSimilarAlbums(cleanId);
    }

    async getRecommendedTracksForPlaylist(tracks, limit = 20, options = {}) {
        const p = this.getCurrentProvider();
        const api = this.getAPI(p);
        if (typeof api.getRecommendedTracksForPlaylist === 'function') {
            return api.getRecommendedTracksForPlaylist(tracks, limit, options);
        }
        return [];
    }

    async getTrackVersions(trackId, options = {}) {
        const p = this.getProviderFromId(trackId) || this.getCurrentProvider();
        const api = this.getAPI(p);
        const cleanId = this.stripProviderPrefix(trackId);
        if (typeof api.getTrackVersions === 'function') {
            return api.getTrackVersions(cleanId, options);
        }
        return [];
    }

    async searchAll(query, options = {}) {
        const provider = options.provider || this.getCurrentProvider();
        const api = this.getAPI(provider);
        if (typeof api.searchAll === 'function') {
            return api.searchAll(query, options);
        }
        return this.searchTracks(query, options);
    }

    // Cache methods
    async clearCache() {
        await this.tidalAPI.clearCache();
        // Qobuz doesn't have cache yet
    }

    getCacheStats() {
        return this.tidalAPI.getCacheStats();
    }

    // Settings accessor for compatibility
    get settings() {
        return this._settings;
    }
}
