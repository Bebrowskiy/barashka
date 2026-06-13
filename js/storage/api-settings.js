export const apiSettings = {
    STORAGE_KEY: 'monochrome-api-instances-v9',
    INSTANCES_URLS: [
        'https://tidal-uptime.jiffy-puffs-1j.workers.dev/',
        'https://tidal-uptime.props-76styles.workers.dev/',
    ],
    defaultInstances: { api: [], streaming: [] },
    instancesLoaded: false,
    _loadPromise: null,

    async loadInstancesFromGitHub() {
        if (this.instancesLoaded) {
            return this.defaultInstances;
        }

        if (this._loadPromise) {
            return this._loadPromise;
        }

        this._loadPromise = (async () => {
            const cachedData = localStorage.getItem(this.STORAGE_KEY);
            if (cachedData) {
                try {
                    const parsed = JSON.parse(cachedData);
                    const now = Date.now();
                    if (parsed.timestamp && now - parsed.timestamp < 15 * 60 * 1000) {
                        this.defaultInstances = parsed.data;
                        this.instancesLoaded = true;
                        this._loadPromise = null;
                        return this.defaultInstances;
                    }
                } catch (e) {
                    console.warn('Failed to parse cached instances:', e);
                }
            }

            let data = null;
            let fetchError = null;

            const urls = [...this.INSTANCES_URLS].sort(() => Math.random() - 0.5);

            for (const url of urls) {
                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    data = await response.json();
                    break;
                } catch (error) {
                    console.warn(`Failed to fetch from ${url}:`, error);
                    fetchError = error;
                }
            }

            if (!data) {
                console.error('Failed to load instances from all uptime APIs:', fetchError);
                this.defaultInstances = {
                    api: [
                        { url: 'https://eu-central.monochrome.tf', version: '2.4' },
                        { url: 'https://us-west.monochrome.tf', version: '2.4' },
                        { url: 'https://arran.monochrome.tf', version: '2.4' },
                        { url: 'https://triton.squid.wtf', version: '2.4' },
                        { url: 'https://api.monochrome.tf', version: '2.3' },
                        { url: 'https://monochrome-api.samidy.com', version: '2.3' },
                        { url: 'https://maus.qqdl.site', version: '2.2' },
                        { url: 'https://vogel.qqdl.site', version: '2.2' },
                        { url: 'https://katze.qqdl.site', version: '2.2' },
                        { url: 'https://hund.qqdl.site', version: '2.2' },
                        { url: 'https://tidal.kinoplus.online', version: '2.2' },
                        { url: 'https://wolf.qqdl.site', version: '2.2' },
                    ],
                    streaming: [
                        { url: 'https://arran.monochrome.tf', version: '2.4' },
                        { url: 'https://triton.squid.wtf', version: '2.4' },
                        { url: 'https://maus.qqdl.site', version: '2.2' },
                        { url: 'https://vogel.qqdl.site', version: '2.2' },
                        { url: 'https://katze.qqdl.site', version: '2.2' },
                        { url: 'https://hund.qqdl.site', version: '2.2' },
                        { url: 'https://wolf.qqdl.site', version: '2.2' },
                    ],
                };
                this.instancesLoaded = true;
                this._loadPromise = null;
                return this.defaultInstances;
            }

            let groupedInstances = { api: [], streaming: [] };

            if (data.api && Array.isArray(data.api)) {
                groupedInstances.api = data.api.filter((instance) => !instance.url.includes('spotisaver.net'));
            }

            if (data.streaming && Array.isArray(data.streaming)) {
                groupedInstances.streaming = data.streaming.filter(
                    (instance) => !instance.url.includes('spotisaver.net')
                );
            } else if (groupedInstances.api.length > 0) {
                groupedInstances.streaming = [...groupedInstances.api];
            }

            this.defaultInstances = groupedInstances;
            this.instancesLoaded = true;

            try {
                localStorage.setItem(
                    this.STORAGE_KEY,
                    JSON.stringify({
                        timestamp: Date.now(),
                        data: groupedInstances,
                    })
                );
            } catch (e) {
                console.warn('Failed to cache instances:', e);
            }

            this._loadPromise = null;
            return groupedInstances;
        })();

        return this._loadPromise;
    },

    async getInstances(type = 'api', _sortBySpeed = false) {
        let instancesObj;

        instancesObj = await this.loadInstancesFromGitHub();

        const targetUrls = instancesObj[type] || instancesObj.api || [];
        if (targetUrls.length === 0) return [];

        return targetUrls;
    },

    async refreshInstances() {
        const instances = await this.loadInstancesFromGitHub();

        const shuffle = (array) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        };

        if (instances.api && instances.api.length) {
            instances.api = shuffle([...instances.api]);
        }

        if (instances.streaming && instances.streaming.length) {
            instances.streaming = shuffle([...instances.streaming]);
        }

        this.saveInstances(instances);

        return this.getInstances('api');
    },
    saveInstances(instances, type) {
        if (type) {
            try {
                const stored = localStorage.getItem(this.STORAGE_KEY);
                let fullObj = stored ? JSON.parse(stored) : { api: [], streaming: [] };
                fullObj[type] = instances;
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(fullObj));
            } catch (e) {
                console.error('Failed to save instances:', e);
            }
        } else {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(instances));
        }
    },
};
