import { Track, Album, Artist } from './types';

const covers = [
    'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=150&h=150',
    'https://images.unsplash.com/photo-1493225457124-a1a2a5f5cb39?auto=format&fit=crop&q=80&w=150&h=150',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=150&h=150',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=150&h=150',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=150&h=150',
    'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=150&h=150'
];

export const forYouTracks: Track[] = [
    { id: '1', title: 'Jealous', artist: '9mice', duration: 186, cover: covers[0] },
    { id: '2', title: 'Самая самая', artist: 'Егор Крид', duration: 231, cover: covers[1] },
    { id: '3', title: 'вклубе', artist: 'тёмный принц', duration: 100, cover: covers[2] },
    { id: '4', title: 'цветы', artist: 'тёмный принц', duration: 99, cover: covers[3] },
    { id: '5', title: 'KARMA', artist: 'ЕГОР КРИД', duration: 169, cover: covers[4] },
    { id: '6', title: 'Будильник', artist: 'Егор Крид', duration: 205, cover: covers[5] },
    { id: '7', title: 'овердоз', artist: 'тёмный принц', duration: 89, cover: covers[0] },
    { id: '8', title: 'отвратительный король', artist: 'тёмный принц', duration: 112, cover: covers[1] },
];

export const recommendedAlbums: Album[] = [
    { id: '1', title: 'Top Songs of the Decade', cover: 'https://images.unsplash.com/photo-1619983081563-430f63602796?auto=format&fit=crop&q=80&w=300&h=300' },
    { id: '2', title: 'Spotify Playlist 2026', cover: 'https://images.unsplash.com/photo-1493225457124-a1a2a5f5cb39?auto=format&fit=crop&q=80&w=300&h=300' },
    { id: '3', title: 'ORDINARY', cover: 'https://images.unsplash.com/photo-1614613535808-3196b289ac2a?auto=format&fit=crop&q=80&w=300&h=300' },
    { id: '4', title: 'Pop Songs 2021', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=300&h=300' },
    { id: '5', title: 'WITH A SM...', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=300&h=300' },
];

export const recommendedArtists: Artist[] = [
    { id: '1', name: 'Sandra', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100' },
    { id: '2', name: 'Top Artists', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=100&h=100' },
    { id: '3', name: 'Hallelujah', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100&h=100' },
    { id: '4', name: 'Jay_cover', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=100&h=100' },
    { id: '5', name: 'Kendrick Lamar', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=100&h=100' },
];
