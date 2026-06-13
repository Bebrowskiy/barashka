import { describe, it, expect, beforeEach } from 'vitest';
import { contentBlockingSettings } from '../../js/storage/content-blocking.js';

describe('contentBlockingSettings', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('returns empty blocked lists by default', () => {
        expect(contentBlockingSettings.getBlockedArtists()).toEqual([]);
        expect(contentBlockingSettings.getBlockedTracks()).toEqual([]);
        expect(contentBlockingSettings.getBlockedAlbums()).toEqual([]);
    });

    it('blocks and unblocks artist', () => {
        const artist = { id: '1', name: 'Test Artist' };
        contentBlockingSettings.blockArtist(artist);
        expect(contentBlockingSettings.isArtistBlocked('1')).toBe(true);
        expect(contentBlockingSettings.getBlockedArtists()).toHaveLength(1);

        contentBlockingSettings.unblockArtist('1');
        expect(contentBlockingSettings.isArtistBlocked('1')).toBe(false);
    });

    it('blocks and unblocks track', () => {
        const track = { id: 't1', title: 'Test Track', artist: { name: 'A' } };
        contentBlockingSettings.blockTrack(track);
        expect(contentBlockingSettings.isTrackBlocked('t1')).toBe(true);

        contentBlockingSettings.unblockTrack('t1');
        expect(contentBlockingSettings.isTrackBlocked('t1')).toBe(false);
    });

    it('blocks and unblocks album', () => {
        const album = { id: 'a1', title: 'Test Album', artist: { name: 'A' } };
        contentBlockingSettings.blockAlbum(album);
        expect(contentBlockingSettings.isAlbumBlocked('a1')).toBe(true);

        contentBlockingSettings.unblockAlbum('a1');
        expect(contentBlockingSettings.isAlbumBlocked('a1')).toBe(false);
    });

    it('shouldHideTrack checks artist and album blocking', () => {
        contentBlockingSettings.blockArtist({ id: 'art1', name: 'Blocked' });
        const track = { id: 't2', artist: { id: 'art1' } };
        expect(contentBlockingSettings.shouldHideTrack(track)).toBe(true);

        contentBlockingSettings.blockAlbum({ id: 'alb1', title: 'X', artist: { name: 'Y' } });
        const track2 = { id: 't3', album: { id: 'alb1' } };
        expect(contentBlockingSettings.shouldHideTrack(track2)).toBe(true);
    });

    it('filterTracks removes blocked tracks', () => {
        contentBlockingSettings.blockTrack({ id: 'x1', title: 'X' });
        const tracks = [{ id: 'x1' }, { id: 'y1' }];
        expect(contentBlockingSettings.filterTracks(tracks)).toEqual([{ id: 'y1' }]);
    });

    it('getTotalBlockedCount sums all blocked', () => {
        contentBlockingSettings.blockArtist({ id: '1', name: 'A' });
        contentBlockingSettings.blockTrack({ id: '2', title: 'B' });
        contentBlockingSettings.blockAlbum({ id: '3', title: 'C', artist: { name: 'D' } });
        expect(contentBlockingSettings.getTotalBlockedCount()).toBe(3);
    });

    it('clearAllBlocked removes everything', () => {
        contentBlockingSettings.blockArtist({ id: '1', name: 'A' });
        contentBlockingSettings.clearAllBlocked();
        expect(contentBlockingSettings.getTotalBlockedCount()).toBe(0);
    });

    it('does not duplicate blocked items', () => {
        const artist = { id: '1', name: 'A' };
        contentBlockingSettings.blockArtist(artist);
        contentBlockingSettings.blockArtist(artist);
        expect(contentBlockingSettings.getBlockedArtists()).toHaveLength(1);
    });
});
