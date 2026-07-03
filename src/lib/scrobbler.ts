import { LastFMScrobbler } from './lastfm-scrobbler';
import { ListenBrainzScrobbler } from './listenbrainz-scrobbler';
import { MalojaScrobbler } from './maloja-scrobbler';
import { LibreFmScrobbler } from './librefm-scrobbler';
import type { Track } from '../types';

export class MultiScrobbler {
    lastfm: LastFMScrobbler;
    listenbrainz: ListenBrainzScrobbler;
    maloja: MalojaScrobbler;
    librefm: LibreFmScrobbler;

    constructor() {
        this.lastfm = new LastFMScrobbler();
        this.listenbrainz = new ListenBrainzScrobbler();
        this.maloja = new MalojaScrobbler();
        this.librefm = new LibreFmScrobbler();
    }

    isAuthenticated(): boolean {
        return this.lastfm.isAuthenticated() || this.listenbrainz.isEnabled() || this.maloja.isEnabled() || this.librefm.isAuthenticated();
    }

    onTrackChange(track: Track): void {
        this.lastfm.onTrackChange(track);
        this.listenbrainz.onTrackChange(track);
        this.maloja.onTrackChange(track);
        this.librefm.onTrackChange(track);
    }

    onPlaybackStop(): void {
        this.lastfm.onPlaybackStop();
        this.listenbrainz.onPlaybackStop();
        this.maloja.onPlaybackStop();
        this.librefm.onPlaybackStop();
    }

    async loveTrack(track: Track): Promise<void> {
        await this.lastfm.loveTrack(track);
        await this.librefm.loveTrack(track);
    }
}

export const scrobbler = new MultiScrobbler();
