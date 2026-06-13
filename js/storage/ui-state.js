export const settingsUiState = {
    ACTIVE_TAB_KEY: 'settings-active-tab',

    getActiveTab() {
        try {
            return localStorage.getItem(this.ACTIVE_TAB_KEY) || 'appearance';
        } catch {
            return 'appearance';
        }
    },

    setActiveTab(tab) {
        localStorage.setItem(this.ACTIVE_TAB_KEY, tab);
    },
};

export const queueManager = {
    STORAGE_KEY: 'monochrome-queue',

    getQueue() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    },

    saveQueue(queueState) {
        try {
            const minimalState = {
                queue: queueState.queue,
                shuffledQueue: queueState.shuffledQueue,
                originalQueueBeforeShuffle: queueState.originalQueueBeforeShuffle,
                currentQueueIndex: queueState.currentQueueIndex,
                shuffleActive: queueState.shuffleActive,
                repeatMode: queueState.repeatMode,
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(minimalState));
        } catch (e) {
            console.warn('Failed to save queue to localStorage:', e);
        }
    },
};

export const sidebarSettings = {
    STORAGE_KEY: 'monochrome-sidebar-collapsed',

    isCollapsed() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    },

    setCollapsed(collapsed) {
        localStorage.setItem(this.STORAGE_KEY, collapsed ? 'true' : 'false');
    },

    restoreState() {
        const isCollapsed = this.isCollapsed();
        if (isCollapsed) {
            document.body.classList.add('sidebar-collapsed');
            const toggleBtn = document.getElementById('sidebar-toggle');
            if (toggleBtn) {
                toggleBtn.innerHTML =
                    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
            }
        }
    },
};

export const modalSettings = {
    STORAGE_KEY: 'close-modals-on-navigation',
    INTERCEPT_BACK_KEY: 'intercept-back-to-close-modals',

    shouldCloseOnNavigation() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved === null) {
                return false;
            }
            return saved === 'true';
        } catch {
            return false;
        }
    },

    setCloseOnNavigation(enabled) {
        localStorage.setItem(this.STORAGE_KEY, enabled ? 'true' : 'false');
    },

    shouldInterceptBackToClose() {
        try {
            const saved = localStorage.getItem(this.INTERCEPT_BACK_KEY);
            if (saved === null) {
                return false;
            }
            return saved === 'true';
        } catch {
            return false;
        }
    },

    setInterceptBackToClose(enabled) {
        localStorage.setItem(this.INTERCEPT_BACK_KEY, enabled ? 'true' : 'false');
    },

    hasOpenModalsOrPanels() {
        const sidePanel = document.getElementById('side-panel');
        if (sidePanel && sidePanel.classList.contains('active')) {
            return true;
        }
        if (document.querySelector('.modal.active')) {
            return true;
        }
        if (document.querySelector('.modal-overlay')) {
            return true;
        }
        const modalIds = [
            'playlist-modal',
            'folder-modal',
            'playlist-select-modal',
            'shortcuts-modal',
            'missing-tracks-modal',
            'sleep-timer-modal',
            'discography-download-modal',
            'custom-db-modal',
            'tracker-modal',
            'epilepsy-warning-modal',
        ];
        for (const id of modalIds) {
            const modal = document.getElementById(id);
            if (modal && modal.classList.contains('active')) {
                return true;
            }
        }
        return false;
    },

    closeAllModals() {
        document.querySelectorAll('.modal-overlay').forEach((modal) => {
            modal.remove();
        });

        document.querySelectorAll('.modal.active').forEach((modal) => {
            modal.classList.remove('active');
        });

        const modalIds = [
            'playlist-modal',
            'folder-modal',
            'playlist-select-modal',
            'shortcuts-modal',
            'missing-tracks-modal',
            'sleep-timer-modal',
            'discography-download-modal',
            'custom-db-modal',
            'tracker-modal',
            'epilepsy-warning-modal',
        ];

        modalIds.forEach((id) => {
            const modal = document.getElementById(id);
            if (modal) {
                modal.classList.remove('active');
            }
        });
    },
};

export const sidebarSectionSettings = {
    SHOW_HOME_KEY: 'sidebar-show-home',
    SHOW_LIBRARY_KEY: 'sidebar-show-library',
    SHOW_RECENT_KEY: 'sidebar-show-recent',
    SHOW_UNRELEASED_KEY: 'sidebar-show-unreleased',
    SHOW_DONATE_KEY: 'sidebar-show-donate',
    SHOW_SETTINGS_KEY: 'sidebar-show-settings',
    SHOW_ABOUT_KEY: 'sidebar-show-about',
    SHOW_DOWNLOAD_KEY: 'sidebar-show-download',
    SHOW_DISCORD_KEY: 'sidebar-show-discord',
    SHOW_GITHUB_KEY: 'sidebar-show-github',
    ORDER_KEY: 'sidebar-menu-order',
    DEFAULT_ORDER: [
        'sidebar-nav-home',
        'sidebar-nav-library',
        'sidebar-nav-recent',
        'sidebar-nav-unreleased',
        'sidebar-nav-donate',
        'sidebar-nav-settings',
        'sidebar-nav-about-bottom',
        'sidebar-nav-download-bottom',
        'sidebar-nav-discordbtn',
        'sidebar-nav-githubbtn',
    ],

    getBottomNavIds() {
        const ul = document.querySelector('.sidebar-nav.bottom ul');
        if (!ul) return [];
        return Array.from(ul.children).map((li) => li.id);
    },

    shouldShowHome() {
        try {
            const val = localStorage.getItem(this.SHOW_HOME_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    setShowHome(enabled) {
        localStorage.setItem(this.SHOW_HOME_KEY, enabled ? 'true' : 'false');
    },

    shouldShowLibrary() {
        try {
            const val = localStorage.getItem(this.SHOW_LIBRARY_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    setShowLibrary(enabled) {
        localStorage.setItem(this.SHOW_LIBRARY_KEY, enabled ? 'true' : 'false');
    },

    shouldShowRecent() {
        try {
            const val = localStorage.getItem(this.SHOW_RECENT_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    setShowRecent(enabled) {
        localStorage.setItem(this.SHOW_RECENT_KEY, enabled ? 'true' : 'false');
    },

    shouldShowUnreleased() {
        try {
            const val = localStorage.getItem(this.SHOW_UNRELEASED_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    setShowUnreleased(enabled) {
        localStorage.setItem(this.SHOW_UNRELEASED_KEY, enabled ? 'true' : 'false');
    },

    shouldShowSettings() {
        return true;
    },

    setShowSettings(enabled) {
        if (enabled) {
            localStorage.setItem(this.SHOW_SETTINGS_KEY, 'true');
        } else {
            localStorage.removeItem(this.SHOW_SETTINGS_KEY);
        }
    },

    shouldShowAbout() {
        try {
            const val = localStorage.getItem(this.SHOW_ABOUT_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    setShowAbout(enabled) {
        localStorage.setItem(this.SHOW_ABOUT_KEY, enabled ? 'true' : 'false');
    },

    shouldShowDownload() {
        try {
            const val = localStorage.getItem(this.SHOW_DOWNLOAD_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    setShowDownload(enabled) {
        localStorage.setItem(this.SHOW_DOWNLOAD_KEY, enabled ? 'true' : 'false');
    },

    shouldShowDiscord() {
        try {
            const val = localStorage.getItem(this.SHOW_DISCORD_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    setShowDiscord(enabled) {
        localStorage.setItem(this.SHOW_DISCORD_KEY, enabled ? 'true' : 'false');
    },

    shouldShowGithub() {
        try {
            const val = localStorage.getItem(this.SHOW_GITHUB_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    setShowGithub(enabled) {
        localStorage.setItem(this.SHOW_GITHUB_KEY, enabled ? 'true' : 'false');
    },

    normalizeOrder(order) {
        const baseOrder = this.DEFAULT_ORDER;
        const safeOrder = Array.isArray(order) ? order.filter((id) => baseOrder.includes(id)) : [];
        const uniqueOrder = [...new Set(safeOrder)];
        const missing = baseOrder.filter((id) => !uniqueOrder.includes(id));
        return [...uniqueOrder, ...missing];
    },

    getOrder() {
        try {
            const stored = localStorage.getItem(this.ORDER_KEY);
            if (stored) {
                return this.normalizeOrder(JSON.parse(stored));
            }
        } catch {
            // ignore
        }
        return this.normalizeOrder([]);
    },

    setOrder(order) {
        const normalized = this.normalizeOrder(order);
        localStorage.setItem(this.ORDER_KEY, JSON.stringify(normalized));
    },

    applySidebarOrder() {
        const mainList = document.querySelector('.sidebar-nav.main ul');
        const bottomList = document.querySelector('.sidebar-nav.bottom ul');
        if (!mainList) return;

        const order = this.getOrder();
        const bottomIds = this.getBottomNavIds();
        const mainOrder = order.filter((id) => !bottomIds.includes(id));
        const bottomOrder = order.filter((id) => bottomIds.includes(id));

        mainOrder.forEach((id) => {
            const item = document.getElementById(id);
            if (item) mainList.appendChild(item);
        });

        if (bottomList) {
            bottomOrder.forEach((id) => {
                const item = document.getElementById(id);
                if (item) bottomList.appendChild(item);
            });
        }
    },

    applySidebarVisibility() {
        this.applySidebarOrder();
        const items = [
            { id: 'sidebar-nav-home', check: this.shouldShowHome() },
            { id: 'sidebar-nav-library', check: this.shouldShowLibrary() },
            { id: 'sidebar-nav-recent', check: this.shouldShowRecent() },
            { id: 'sidebar-nav-unreleased', check: this.shouldShowUnreleased() },
            { id: 'sidebar-nav-settings', check: this.shouldShowSettings() },
            { id: 'sidebar-nav-about-bottom', check: this.shouldShowAbout() },
            { id: 'sidebar-nav-download-bottom', check: this.shouldShowDownload() },
            { id: 'sidebar-nav-discordbtn', check: this.shouldShowDiscord() },
            { id: 'sidebar-nav-githubbtn', check: this.shouldShowGithub() },
        ];

        items.forEach(({ id, check }) => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = check ? '' : 'none';
            }
        });
    },
};
