// js/accounts/config.js
// Firebase Authentication Configuration

import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
} from 'firebase/auth';

const STORAGE_KEY = 'monochrome-firebase-config';

const DEFAULT_CONFIG = {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_PROJECT.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT.firebasestorage.app',
    messagingSenderId: 'YOUR_SENDER_ID',
    appId: 'YOUR_APP_ID',
    measurementId: 'YOUR_MEASUREMENT_ID',
};

// Get Firebase config from localStorage or use default
let firebaseConfig = DEFAULT_CONFIG;
try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        firebaseConfig = JSON.parse(stored);
    }
} catch (e) {
    // Silent fail
}

// Allow override from Vite define (from .env)
try {
    // eslint-disable-next-line no-undef
    if (typeof __FIREBASE_CONFIG__ !== 'undefined') {
        // eslint-disable-next-line no-undef
        firebaseConfig = __FIREBASE_CONFIG__;
    }
} catch (e) {
    // Ignore
}

// Fallback to window injection (preview server)
if (typeof window !== 'undefined' && window.__FIREBASE_CONFIG__) {
    firebaseConfig = window.__FIREBASE_CONFIG__;
}

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const provider = new GoogleAuthProvider();

export const authWrapper = {
    async createOAuth2Session(_providerName, successUrl, failureUrl) {
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            const token = await user.getIdToken();
            window.location.href = `${successUrl}&userId=${user.uid}&secret=${token}`;
        } catch (error) {
            window.location.href = `${failureUrl}?error=${encodeURIComponent(error.message)}`;
        }
    },

    async createEmailPasswordSession(email, password) {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result.user;
    },

    async create(uniqueId, email, password) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        return result.user;
    },

    async createRecovery(email, redirectUrl) {
        await sendPasswordResetEmail(auth, email, redirectUrl);
    },

    async deleteSession(_sessionId) {
        await signOut(auth);
    },

    async get() {
        return new Promise((resolve, reject) => {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                unsubscribe();
                if (user) {
                    resolve({
                        $id: user.uid,
                        email: user.email,
                        name: user.displayName,
                        avatar: user.photoURL,
                    });
                } else {
                    reject(new Error('Not authenticated'));
                }
            });
        });
    },

    getFirebaseAuth() {
        return auth;
    },

    getProvider() {
        return provider;
    },
};

export { authWrapper as auth };

export const saveFirebaseConfig = (config) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

export const clearFirebaseConfig = () => {
    localStorage.removeItem(STORAGE_KEY);
};
