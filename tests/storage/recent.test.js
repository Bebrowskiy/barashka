import { describe, it, expect, beforeEach } from 'vitest';
import { recentActivityManager } from '../../js/storage/recent.js';

describe('recentActivityManager', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('returns empty recents by default', () => {
        const recents = recentActivityManager.getRecents();
        expect(recents.artists).toEqual([]);
        expect(recents.albums).toEqual([]);
        expect(recents.playlists).toEqual([]);
        expect(recents.mixes).toEqual([]);
    });

    it('adds artist to recents', () => {
        recentActivityManager.addArtist({ id: 'a1', name: 'Artist 1' });
        const recents = recentActivityManager.getRecents();
        expect(recents.artists).toHaveLength(1);
        expect(recents.artists[0].id).toBe('a1');
    });

    it('adds album to recents', () => {
        recentActivityManager.addAlbum({ id: 'al1', title: 'Album 1' });
        const recents = recentActivityManager.getRecents();
        expect(recents.albums).toHaveLength(1);
    });

    it('deduplicates by id', () => {
        recentActivityManager.addArtist({ id: 'a1', name: 'V1' });
        recentActivityManager.addArtist({ id: 'a1', name: 'V2' });
        const recents = recentActivityManager.getRecents();
        expect(recents.artists).toHaveLength(1);
        expect(recents.artists[0].name).toBe('V2');
    });

    it('limits to 10 items', () => {
        for (let i = 0; i < 15; i++) {
            recentActivityManager.addArtist({ id: `a${i}`, name: `A${i}` });
        }
        expect(recentActivityManager.getRecents().artists).toHaveLength(10);
    });

    it('clears all recents', () => {
        recentActivityManager.addArtist({ id: 'a1', name: 'A' });
        recentActivityManager.clear();
        expect(recentActivityManager.getRecents().artists).toEqual([]);
    });
});
