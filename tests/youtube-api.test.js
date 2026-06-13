import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { YouTubeAPI } from '../js/youtube-api.js';

const mockVideo = {
    id: 'dQw4w9WgXcQ',
    title: 'Never Gonna Give You Up',
    duration: 212,
    uploaderName: 'Rick Astley',
    uploaderUrl: '/channel/UCuAXFkgsw1L7xaCfnd5JJOw',
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    uploadedDate: '2009-10-25',
    audioStreams: [
        { url: 'https://example.com/audio1', mimeType: 'audio/webm; codecs="opus"', bitrate: 128000 },
        { url: 'https://example.com/audio2', mimeType: 'audio/mp4; codecs="mp4a.40.2"', bitrate: 256000 },
        { url: 'https://example.com/audio3', mimeType: 'audio/webm; codecs="opus"', bitrate: 64000 },
    ],
};

const mockChannel = {
    id: 'UCuAXFkgsw1L7xaCfnd5JJOw',
    name: 'Rick Astley',
    thumbnailUrl: 'https://yt3.ggpht.com/avatar.jpg',
    bannerUrl: 'https://yt3.ggpht.com/banner.jpg',
};

const mockSearchResponse = {
    items: [
        { id: 'video1', title: 'Song 1', duration: 180, uploaderName: 'Artist 1', thumbnailUrl: 'https://example.com/thumb1.jpg' },
        { id: 'video2', title: 'Song 2', duration: 240, uploaderName: 'Artist 2', thumbnailUrl: 'https://example.com/thumb2.jpg' },
    ],
};

describe('YouTubeAPI', () => {
    let api;
    let fetchSpy;

    beforeEach(() => {
        api = new YouTubeAPI();
        fetchSpy = vi.spyOn(global, 'fetch');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('stripPrefix', () => {
        it('strips y: prefix', () => {
            expect(api.stripPrefix('y:dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
        });

        it('returns id unchanged without prefix', () => {
            expect(api.stripPrefix('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
        });
    });

    describe('transformTrack', () => {
        it('transforms a video to track format', () => {
            const track = api.transformTrack(mockVideo);

            expect(track.id).toBe('y:dQw4w9WgXcQ');
            expect(track.title).toBe('Never Gonna Give You Up');
            expect(track.duration).toBe(212);
            expect(track.artist.name).toBe('Rick Astley');
            expect(track.album.title).toBe('Rick Astley');
            expect(track.album.cover).toContain('ytimg.com');
            expect(track.isAvailable).toBe(true);
        });

        it('handles missing fields gracefully', () => {
            const track = api.transformTrack({ id: 'test' });
            expect(track.title).toBe('Unknown Title');
            expect(track.artist.name).toBe('Unknown Artist');
        });

        it('returns null for null input', () => {
            expect(api.transformTrack(null)).toBeNull();
        });
    });

    describe('transformArtist', () => {
        it('transforms a channel to artist format', () => {
            const artist = api.transformArtist(mockChannel);

            expect(artist.id).toBe('y:UCuAXFkgsw1L7xaCfnd5JJOw');
            expect(artist.name).toBe('Rick Astley');
            expect(artist.picture).toBe('https://yt3.ggpht.com/avatar.jpg');
        });
    });

    describe('getCoverUrl', () => {
        it('returns YouTube thumbnail URL', () => {
            const url = api.getCoverUrl('dQw4w9WgXcQ');
            expect(url).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
        });
    });

    describe('getArtistPictureUrl', () => {
        it('returns YouTube thumbnail URL for artist', () => {
            const url = api.getArtistPictureUrl('UCuAXFkgsw1L7xaCfnd5JJOw');
            expect(url).toBe('https://i.ytimg.com/vi/UCuAXFkgsw1L7xaCfnd5JJOw/hqdefault.jpg');
        });
    });

    describe('fetchJSON', () => {
        it('returns parsed JSON on success', async () => {
            fetchSpy.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            });

            const result = await api.fetchJSON('/test');
            expect(result).toEqual({ success: true });
        });

        it('throws on non-ok response', async () => {
            fetchSpy.mockResolvedValueOnce({
                ok: false,
                status: 500,
            });

            await expect(api.fetchJSON('/test')).rejects.toThrow();
        });

        it('tries next instance on failure', async () => {
            fetchSpy
                .mockResolvedValueOnce({ ok: false, status: 500 })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ data: 'ok' }),
                });

            const result = await api.fetchJSON('/test');
            expect(result).toEqual({ data: 'ok' });
            expect(fetchSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe('searchTracks', () => {
        it('returns transformed tracks', async () => {
            fetchSpy.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockSearchResponse),
            });

            const result = await api.searchTracks('Rick Astley');

            expect(result.items).toHaveLength(2);
            expect(result.items[0].title).toBe('Song 1');
            expect(result.items[0].id).toBe('y:video1');
            expect(result.items[0].artist.name).toBe('Artist 1');
        });

        it('returns empty on error', async () => {
            fetchSpy.mockRejectedValueOnce(new Error('Network error'));

            const result = await api.searchTracks('test');
            expect(result.items).toEqual([]);
        });

        it('respects limit parameter', async () => {
            fetchSpy.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockSearchResponse),
            });

            const result = await api.searchTracks('test', { limit: 1 });
            expect(result.items).toHaveLength(1);
        });
    });

    describe('searchArtists', () => {
        it('returns transformed artists', async () => {
            fetchSpy.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ items: [mockChannel] }),
            });

            const result = await api.searchArtists('Rick');
            expect(result.items).toHaveLength(1);
            expect(result.items[0].name).toBe('Rick Astley');
        });
    });

    describe('getTrack', () => {
        it('returns track info', async () => {
            fetchSpy.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockVideo),
            });

            const result = await api.getTrack('y:dQw4w9WgXcQ');
            expect(result.info.title).toBe('Never Gonna Give You Up');
        });

        it('caches track results', async () => {
            fetchSpy.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockVideo),
            });

            await api.getTrack('y:dQw4w9WgXcQ');
            await api.getTrack('y:dQw4w9WgXcQ');

            expect(fetchSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('getStreamUrl', () => {
        it('returns best audio stream URL (prefers opus over aac)', async () => {
            fetchSpy.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockVideo),
            });

            const url = await api.getStreamUrl('y:dQw4w9WgXcQ');
            expect(url).toBe('https://example.com/audio1');
        });

        it('prefers opus over aac at same bitrate', async () => {
            const video = {
                ...mockVideo,
                audioStreams: [
                    { url: 'https://example.com/aac', mimeType: 'audio/mp4; codecs="mp4a.40.2"', bitrate: 128000 },
                    { url: 'https://example.com/opus', mimeType: 'audio/webm; codecs="opus"', bitrate: 128000 },
                ],
            };

            fetchSpy.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(video),
            });

            const url = await api.getStreamUrl('y:test');
            expect(url).toBe('https://example.com/opus');
        });

        it('throws when no audio streams available', async () => {
            fetchSpy.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ ...mockVideo, audioStreams: [] }),
            });

            await expect(api.getStreamUrl('y:test')).rejects.toThrow('No audio streams available');
        });

        it('caches stream URLs', async () => {
            fetchSpy.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockVideo),
            });

            await api.getStreamUrl('y:dQw4w9WgXcQ');
            await api.getStreamUrl('y:dQw4w9WgXcQ');

            expect(fetchSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('getTrackRecommendations', () => {
        it('returns related tracks', async () => {
            fetchSpy.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ items: [mockVideo] }),
            });

            const result = await api.getTrackRecommendations('y:dQw4w9WgXcQ');
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Never Gonna Give You Up');
        });

        it('returns empty array on error', async () => {
            fetchSpy.mockRejectedValueOnce(new Error('fail'));

            const result = await api.getTrackRecommendations('y:test');
            expect(result).toEqual([]);
        });
    });

    describe('clearCache', () => {
        it('clears all caches', async () => {
            fetchSpy.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockVideo),
            });

            await api.getStreamUrl('y:test1');
            await api.getTrack('y:test2');

            api.clearCache();

            expect(api.streamCache.size).toBe(0);
            expect(api.trackCache.size).toBe(0);
        });
    });

    describe('getCacheStats', () => {
        it('returns cache sizes', () => {
            const stats = api.getCacheStats();
            expect(stats).toHaveProperty('streamCache');
            expect(stats).toHaveProperty('trackCache');
        });
    });
});
