import { SVG_VOLUME, SVG_MUTE, formatTime, createQualityBadgeHTML, escapeHtml, getTrackArtists } from '../utils.js';
import { openLyricsPanel } from '../lyrics.js';
import { visualizerSettings } from '../storage.js';
import { Visualizer } from '../visualizer.js';
import { navigate } from '../router.js';

export const fullscreenMixins = {
    updateFullscreenMetadata(track, nextTrack) {
        if (!track) return;
        const overlay = document.getElementById('fullscreen-cover-overlay');
        const image = document.getElementById('fullscreen-cover-image');
        const title = document.getElementById('fullscreen-track-title');
        const artist = document.getElementById('fullscreen-track-artist');
        const nextTrackEl = document.getElementById('fullscreen-next-track');
        const videoCanvas = document.getElementById('fullscreen-video-canvas');

        const isYouTube = typeof track.id === 'string' && track.id.startsWith('y:');

        const videoCoverUrl = track.album?.videoCover
            ? this.api.getVideoCoverUrl(track.album.videoCover, '1280')
            : null;
        const coverUrl = videoCoverUrl || this.api.getCoverUrl(track.album?.cover, '1280');

        const fsLikeBtn = document.getElementById('fs-like-btn');
        if (fsLikeBtn) {
            this.updateLikeState(fsLikeBtn.parentElement, 'track', track.id);
        }

        if (videoCoverUrl) {
            if (image.tagName === 'IMG') {
                const video = document.createElement('video');
                video.src = videoCoverUrl;
                video.autoplay = true;
                video.loop = true;
                video.muted = true;
                video.playsInline = true;
                video.id = image.id;
                video.className = image.className;
                image.replaceWith(video);
            }
        } else {
            if (image.tagName === 'VIDEO') {
                const img = document.createElement('img');
                img.src = coverUrl;
                img.id = image.id;
                img.className = image.className;
                image.replaceWith(img);
            }
        }

        const currentImage = document.getElementById('fullscreen-cover-image');
        if (currentImage.src !== coverUrl || !videoCoverUrl) {
            currentImage.src = coverUrl;
        }
        overlay.style.setProperty('--bg-image', `url('${coverUrl}')`);
        this.extractAndApplyColor(this.api.getCoverUrl(track.album?.cover, '80'));

        // Video Canvas for YouTube tracks
        if (isYouTube && videoCanvas) {
            this.api.getVideoStreamUrl(track.id).then((url) => {
                if (videoCanvas && url) {
                    videoCanvas.src = url;
                    videoCanvas.classList.add('active');
                }
            }).catch(() => {
                if (videoCanvas) {
                    videoCanvas.classList.remove('active');
                }
            });
        } else if (videoCanvas) {
            videoCanvas.classList.remove('active');
            videoCanvas.src = '';
        }

        const qualityBadge = createQualityBadgeHTML(track);
        title.innerHTML = `${escapeHtml(track.title)} ${qualityBadge}`;
        artist.textContent = getTrackArtists(track);

        if (nextTrack) {
            nextTrackEl.style.display = 'flex';
            nextTrackEl.querySelector('.value').textContent = `${nextTrack.title} • ${getTrackArtists(nextTrack)}`;
        } else {
            nextTrackEl.style.display = 'none';
        }
    },

    async showFullscreenCover(track, nextTrack, lyricsManager, audioPlayer) {
        if (!track) return;
        if (window.location.hash !== '#fullscreen') {
            window.history.pushState({ fullscreen: true }, '', '#fullscreen');
        }
        const overlay = document.getElementById('fullscreen-cover-overlay');
        const nextTrackEl = document.getElementById('fullscreen-next-track');
        const lyricsToggleBtn = document.getElementById('toggle-fullscreen-lyrics-btn');

        this.updateFullscreenMetadata(track, nextTrack);

        if (nextTrack) {
            nextTrackEl.classList.remove('animate-in');
            void nextTrackEl.offsetWidth;
            nextTrackEl.classList.add('animate-in');
        } else {
            nextTrackEl.classList.remove('animate-in');
        }

        if (lyricsManager && audioPlayer) {
            lyricsToggleBtn.style.display = 'flex';
            lyricsToggleBtn.classList.remove('active');

            const toggleLyrics = () => {
                openLyricsPanel(track, audioPlayer, lyricsManager);
                lyricsToggleBtn.classList.toggle('active');
            };

            const newToggleBtn = lyricsToggleBtn.cloneNode(true);
            lyricsToggleBtn.parentNode.replaceChild(newToggleBtn, lyricsToggleBtn);
            newToggleBtn.addEventListener('click', toggleLyrics);
        } else {
            lyricsToggleBtn.style.display = 'none';
        }

        const playerBar = document.querySelector('.now-playing-bar');
        if (playerBar) playerBar.style.display = 'none';

        this.setupFullscreenControls(audioPlayer);

        overlay.style.display = 'flex';

        const startVisualizer = () => {
            if (!visualizerSettings.isEnabled()) {
                if (this.visualizer) this.visualizer.stop();
                return;
            }

            if (!this.visualizer && audioPlayer) {
                const canvas = document.getElementById('visualizer-canvas');
                if (canvas) {
                    this.visualizer = new Visualizer(canvas, audioPlayer);
                }
            }
            if (this.visualizer) {
                this.visualizer.start();
            }

            overlay.classList.add('visualizer-active');
        };

        this.setupUIToggleButton(overlay);

        if (localStorage.getItem('epilepsy-warning-dismissed') === 'true') {
            startVisualizer();
        } else {
            const modal = document.getElementById('epilepsy-warning-modal');
            if (modal) {
                modal.classList.add('active');

                const acceptBtn = document.getElementById('epilepsy-accept-btn');
                const cancelBtn = document.getElementById('epilepsy-cancel-btn');

                acceptBtn.onclick = () => {
                    modal.classList.remove('active');
                    localStorage.setItem('epilepsy-warning-dismissed', 'true');
                    startVisualizer();
                };
                cancelBtn.onclick = () => {
                    modal.classList.remove('active');
                    this.closeFullscreenCover();
                };
            } else {
                startVisualizer();
            }
        }
    },

    closeFullscreenCover() {
        const overlay = document.getElementById('fullscreen-cover-overlay');
        overlay.style.display = 'none';
        overlay.classList.remove('visualizer-active', 'ui-hidden');

        const playerBar = document.querySelector('.now-playing-bar');
        if (playerBar) playerBar.style.removeProperty('display');

        if (this.fullscreenUpdateInterval) {
            cancelAnimationFrame(this.fullscreenUpdateInterval);
            this.fullscreenUpdateInterval = null;
        }

        if (this.visualizer) {
            this.visualizer.stop();
        }

        // Stop video canvas
        const videoCanvas = document.getElementById('fullscreen-video-canvas');
        if (videoCanvas) {
            videoCanvas.pause();
            videoCanvas.src = '';
            videoCanvas.classList.remove('active');
        }

        if (this.uiToggleMouseTimer) {
            clearTimeout(this.uiToggleMouseTimer);
            this.uiToggleMouseTimer = null;
        }
    },

    setupUIToggleButton(overlay) {
        const toggleBtn = document.getElementById('toggle-ui-btn');
        if (!toggleBtn) return;

        let isUIHidden = overlay.classList.contains('ui-hidden');
        toggleBtn.classList.toggle('active', isUIHidden);
        toggleBtn.title = isUIHidden ? 'Show UI' : 'Hide UI';

        const showButton = () => {
            toggleBtn.classList.add('visible');
        };

        const hideButton = () => {
            toggleBtn.classList.remove('visible');
        };

        if (isUIHidden) {
            hideButton();
        } else {
            showButton();
        }

        const handleMouseMove = (e) => {
            const rect = overlay.getBoundingClientRect();
            const isNearTopRight = e.clientY < 100 && e.clientX > rect.width - 150;

            if (isUIHidden) {
                if (isNearTopRight) {
                    showButton();
                } else {
                    hideButton();
                }
            }
        };

        const toggleUI = () => {
            isUIHidden = !isUIHidden;
            overlay.classList.toggle('ui-hidden', isUIHidden);
            toggleBtn.classList.toggle('active', isUIHidden);
            toggleBtn.title = isUIHidden ? 'Show UI' : 'Hide UI';

            if (isUIHidden) {
                hideButton();
            } else {
                showButton();
            }
        };

        toggleBtn.addEventListener('click', toggleUI);
        overlay.addEventListener('mousemove', handleMouseMove);
        overlay.addEventListener('mouseleave', () => {
            if (isUIHidden) {
                hideButton();
            }
        });

        this.uiToggleCleanup = () => {
            toggleBtn.removeEventListener('click', toggleUI);
            overlay.removeEventListener('mousemove', handleMouseMove);
        };
    },

    setupFullscreenControls(audioPlayer) {
        const playBtn = document.getElementById('fs-play-pause-btn');
        const prevBtn = document.getElementById('fs-prev-btn');
        const nextBtn = document.getElementById('fs-next-btn');
        const shuffleBtn = document.getElementById('fs-shuffle-btn');
        const repeatBtn = document.getElementById('fs-repeat-btn');
        const progressBar = document.getElementById('fs-progress-bar');
        const progressFill = document.getElementById('fs-progress-fill');
        const currentTimeEl = document.getElementById('fs-current-time');
        const totalDurationEl = document.getElementById('fs-total-duration');
        const fsLikeBtn = document.getElementById('fs-like-btn');
        const fsAddPlaylistBtn = document.getElementById('fs-add-playlist-btn');
        const fsDownloadBtn = document.getElementById('fs-download-btn');
        const fsCastBtn = document.getElementById('fs-cast-btn');
        const fsQueueBtn = document.getElementById('fs-queue-btn');
        const artistEl = document.getElementById('fullscreen-track-artist');

        if (artistEl) {
            artistEl.style.cursor = 'pointer';
            artistEl.onclick = () => {
                if (this.player.currentTrack && this.player.currentTrack.artist) {
                    this.closeFullscreenCover();
                    navigate(`/artist/${this.player.currentTrack.artist.id}`);
                }
            };
        }

        let lastPausedState = null;
        const updatePlayBtn = () => {
            const isPaused = audioPlayer.paused;
            if (isPaused === lastPausedState) return;
            lastPausedState = isPaused;

            if (isPaused) {
                playBtn.innerHTML =
                    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
            } else {
                playBtn.innerHTML =
                    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
            }
        };

        updatePlayBtn();

        playBtn.onclick = () => {
            this.player.handlePlayPause();
            updatePlayBtn();
        };

        prevBtn.onclick = () => this.player.playPrev();
        nextBtn.onclick = () => this.player.playNext();

        shuffleBtn.onclick = () => {
            this.player.toggleShuffle();
            shuffleBtn.classList.toggle('active', this.player.shuffleActive);
        };

        repeatBtn.onclick = () => {
            const mode = this.player.toggleRepeat();
            repeatBtn.classList.toggle('active', mode !== 0);
            if (mode === 2) {
                repeatBtn.innerHTML =
                    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/><path d="M11 10h1v4"/></svg>';
            } else {
                repeatBtn.innerHTML =
                    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>';
            }
        };

        let isFsSeeking = false;
        let wasFsPlaying = false;
        let lastFsSeekPosition = 0;

        const updateFsSeekUI = (position) => {
            if (!isNaN(audioPlayer.duration)) {
                progressFill.style.width = `${position * 100}%`;
                if (currentTimeEl) {
                    currentTimeEl.textContent = formatTime(position * audioPlayer.duration);
                }
            }
        };

        progressBar.addEventListener('mousedown', (e) => {
            isFsSeeking = true;
            wasFsPlaying = !audioPlayer.paused;
            if (wasFsPlaying) audioPlayer.pause();

            const rect = progressBar.getBoundingClientRect();
            const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            lastFsSeekPosition = pos;
            updateFsSeekUI(pos);
        });

        progressBar.addEventListener(
            'touchstart',
            (e) => {
                e.preventDefault();
                isFsSeeking = true;
                wasFsPlaying = !audioPlayer.paused;
                if (wasFsPlaying) audioPlayer.pause();

                const touch = e.touches[0];
                const rect = progressBar.getBoundingClientRect();
                const pos = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
                lastFsSeekPosition = pos;
                updateFsSeekUI(pos);
            },
            { passive: false }
        );

        document.addEventListener('mousemove', (e) => {
            if (isFsSeeking) {
                const rect = progressBar.getBoundingClientRect();
                const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                lastFsSeekPosition = pos;
                updateFsSeekUI(pos);
            }
        });

        document.addEventListener(
            'touchmove',
            (e) => {
                if (isFsSeeking) {
                    const touch = e.touches[0];
                    const rect = progressBar.getBoundingClientRect();
                    const pos = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
                    lastFsSeekPosition = pos;
                    updateFsSeekUI(pos);
                }
            },
            { passive: false }
        );

        document.addEventListener('mouseup', () => {
            if (isFsSeeking) {
                if (!isNaN(audioPlayer.duration)) {
                    audioPlayer.currentTime = lastFsSeekPosition * audioPlayer.duration;
                    if (wasFsPlaying) audioPlayer.play();
                }
                isFsSeeking = false;
            }
        });

        document.addEventListener('touchend', () => {
            if (isFsSeeking) {
                if (!isNaN(audioPlayer.duration)) {
                    audioPlayer.currentTime = lastFsSeekPosition * audioPlayer.duration;
                    if (wasFsPlaying) audioPlayer.play();
                }
                isFsSeeking = false;
            }
        });

        if (fsLikeBtn) {
            fsLikeBtn.onclick = () => document.getElementById('now-playing-like-btn')?.click();
        }
        if (fsAddPlaylistBtn) {
            fsAddPlaylistBtn.onclick = () => document.getElementById('now-playing-add-playlist-btn')?.click();
        }
        if (fsDownloadBtn) {
            fsDownloadBtn.onclick = () => document.getElementById('download-current-btn')?.click();
        }
        if (fsCastBtn) {
            fsCastBtn.onclick = () => document.getElementById('cast-btn')?.click();
        }
        if (fsQueueBtn) {
            fsQueueBtn.onclick = () => {
                document.getElementById('queue-btn')?.click();
            };
        }

        shuffleBtn.classList.toggle('active', this.player.shuffleActive);
        const mode = this.player.repeatMode;
        repeatBtn.classList.toggle('active', mode !== 0);
        if (mode === 2) {
            repeatBtn.innerHTML =
                '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/><path d="M11 10h1v4"/></svg>';
        }

        const fsVolumeBtn = document.getElementById('fs-volume-btn');
        const fsVolumeBar = document.getElementById('fs-volume-bar');
        const fsVolumeFill = document.getElementById('fs-volume-fill');

        if (fsVolumeBtn && fsVolumeBar && fsVolumeFill) {
            const updateFsVolumeUI = () => {
                const { muted } = audioPlayer;
                const volume = this.player.userVolume;
                fsVolumeBtn.innerHTML = muted || volume === 0 ? SVG_MUTE : SVG_VOLUME;
                fsVolumeBtn.classList.toggle('muted', muted || volume === 0);
                const effectiveVolume = muted ? 0 : volume * 100;
                fsVolumeFill.style.setProperty('--fs-volume-level', `${effectiveVolume}%`);
                fsVolumeFill.style.width = `${effectiveVolume}%`;
            };

            fsVolumeBtn.onclick = () => {
                audioPlayer.muted = !audioPlayer.muted;
                localStorage.setItem('muted', audioPlayer.muted);
                updateFsVolumeUI();
            };

            const setFsVolume = (e) => {
                const rect = fsVolumeBar.getBoundingClientRect();
                const position = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                const newVolume = position;
                this.player.setVolume(newVolume);
                if (audioPlayer.muted && newVolume > 0) {
                    audioPlayer.muted = false;
                    localStorage.setItem('muted', false);
                }
                updateFsVolumeUI();
            };

            let isAdjustingFsVolume = false;

            fsVolumeBar.addEventListener('mousedown', (e) => {
                isAdjustingFsVolume = true;
                setFsVolume(e);
            });

            fsVolumeBar.addEventListener(
                'touchstart',
                (e) => {
                    e.preventDefault();
                    isAdjustingFsVolume = true;
                    const touch = e.touches[0];
                    setFsVolume({ clientX: touch.clientX });
                },
                { passive: false }
            );

            document.addEventListener('mousemove', (e) => {
                if (isAdjustingFsVolume) {
                    setFsVolume(e);
                }
            });

            document.addEventListener(
                'touchmove',
                (e) => {
                    if (isAdjustingFsVolume) {
                        const touch = e.touches[0];
                        setFsVolume({ clientX: touch.clientX });
                    }
                },
                { passive: false }
            );

            document.addEventListener('mouseup', () => {
                isAdjustingFsVolume = false;
            });

            document.addEventListener('touchend', () => {
                isAdjustingFsVolume = false;
            });

            audioPlayer.addEventListener('volumechange', updateFsVolumeUI);
            updateFsVolumeUI();
        }

        const update = () => {
            if (document.getElementById('fullscreen-cover-overlay').style.display === 'none') return;

            const duration = audioPlayer.duration || 0;
            const current = audioPlayer.currentTime || 0;

            if (duration > 0) {
                if (!isFsSeeking) {
                    const percent = (current / duration) * 100;
                    progressFill.style.width = `${percent}%`;
                    currentTimeEl.textContent = formatTime(current);
                }
                totalDurationEl.textContent = formatTime(duration);
            }

            updatePlayBtn();
            this.fullscreenUpdateInterval = requestAnimationFrame(update);
        };

        if (this.fullscreenUpdateInterval) cancelAnimationFrame(this.fullscreenUpdateInterval);
        this.fullscreenUpdateInterval = requestAnimationFrame(update);
    },
};
