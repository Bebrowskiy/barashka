interface DeezerArtist {
    id: number;
    name: string;
    picture: string;
    picture_xl: string;
    nb_fan: number;
}

interface DeezerSearchResult {
    data: DeezerArtist[];
}

class DeezerAPI {
    private cache = new Map<string, { picture: string; pictureXl: string; fans: number } | null>();

    private cleanArtistName(name: string): string {
        return name
            .replace(/\s*-\s*Topic$/i, '')
            .replace(/\s*-\s*topic$/i, '')
            .trim();
    }

    async searchArtist(name: string): Promise<{ picture: string; pictureXl: string; fans: number } | null> {
        const cleanName = this.cleanArtistName(name);
        const cacheKey = cleanName.toLowerCase();
        if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!;

        try {
            const response = await fetch(
                `/deezer/search/artist?q=${encodeURIComponent(cleanName)}&limit=5`
            );
            if (!response.ok) return null;

            const result: DeezerSearchResult = await response.json();
            if (!result.data || result.data.length === 0) {
                this.cache.set(cacheKey, null);
                return null;
            }

            // Find best match
            const normalizedName = cleanName.toLowerCase();
            const match = result.data.find(a =>
                a.name.toLowerCase() === normalizedName
            ) || result.data.find(a =>
                a.name.toLowerCase().includes(normalizedName) ||
                normalizedName.includes(a.name.toLowerCase())
            ) || result.data[0];

            const data = {
                picture: match.picture_xl || match.picture || '',
                pictureXl: match.picture_xl || match.picture || '',
                fans: match.nb_fan || 0,
            };

            this.cache.set(cacheKey, data);
            return data;
        } catch {
            this.cache.set(cacheKey, null);
            return null;
        }
    }

    async enrichArtist(name: string, existingPicture?: string): Promise<{ picture: string; pictureXl: string; fans: number }> {
        const deezer = await this.searchArtist(name);
        if (!deezer || !deezer.picture) {
            return {
                picture: existingPicture || '',
                pictureXl: existingPicture || '',
                fans: 0,
            };
        }
        return deezer;
    }

    formatFans(fans: number): string {
        if (fans >= 1_000_000) return `${(fans / 1_000_000).toFixed(1)}M`;
        if (fans >= 1_000) return `${(fans / 1_000).toFixed(0)}K`;
        return String(fans);
    }
}

export const deezerAPI = new DeezerAPI();
