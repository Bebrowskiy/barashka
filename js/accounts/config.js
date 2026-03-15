// js/accounts/config.js
// Firebase Authentication Configuration
// 
// IMPORTANT: For production, configure Firebase via environment variables:
// 1. Copy .env.example to .env
// 2. Set FIREBASE_CONFIG in .env with your Firebase credentials
// 3. Never commit Firebase credentials to version control

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

/**
 * Default Firebase configuration
 * Replace with your own Firebase project credentials
 * Get these from: Firebase Console > Project Settings > General > Your apps > SDK setup and configuration
 */
const DEFAULT_CONFIG = {
    apiKey: 'YOUR_API_KEY', // Replace with your Firebase API key
    authDomain: 'YOUR_PROJECT.firebaseapp.com', // Replace with your Firebase project
    projectId: 'YOUR_PROJECT_ID', // Replace with your Firebase project ID
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
    // Silent fail - use default config
}

// Allow override from window (for auth gate injection)
// This is set by vite-plugin-auth-gate.js from FIREBASE_CONFIG environment variable
if (window.__FIREBASE_CONFIG__) {
    firebaseConfig = window.__FIREBASE_CONFIG__;
}

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const provider = new GoogleAuthProvider();

// Wrapper to match old Appwrite API
export const authWrapper = {
    async createOAuth2Session(providerName, successUrl, failureUrl) {
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            // Redirect with user info
            const token = await user.getIdToken();
            window.location.href = `${successUrl}&userId=${user.uid}&secret=${token}`;
        } catch (error) {
            console.error('[Firebase] OAuth error:', error);
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
        await sendPasswordResetEmail(auth, email);
    },

    async deleteSession(sessionId) {
        await signOut(auth);
    },

    async get() {
        return new Promise((resolve, reject) => {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                unsubscribe(); // Clean up listener
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

    // Direct access to Firebase auth
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
