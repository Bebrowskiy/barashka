import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useI18n } from '../lib/i18n';
import { usePlayer } from '../context/PlayerContext';
import { exportSyncData, importSyncData, encodeSyncData, decodeSyncData, getDataSize, formatDataSize, type SyncData } from '../lib/sync';

type SyncMode = 'idle' | 'exporting' | 'exported' | 'importing' | 'imported' | 'error';

export default function SyncModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { t } = useI18n();
    const { showToast } = usePlayer();
    const [mode, setMode] = useState<'export' | 'import'>('export');
    const [syncState, setSyncState] = useState<SyncMode>('idle');
    const [syncData, setSyncData] = useState<SyncData | null>(null);
    const [encodedData, setEncodedData] = useState('');
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [importInput, setImportInput] = useState('');
    const [error, setError] = useState('');
    const [stats, setStats] = useState<{ imported: number; skipped: number } | null>(null);
    const [dataSize, setDataSize] = useState('');
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!isOpen) {
            setSyncState('idle');
            setSyncData(null);
            setEncodedData('');
            setQrDataUrl('');
            setImportInput('');
            setError('');
            setStats(null);
        }
    }, [isOpen]);

    const handleExport = async () => {
        setSyncState('exporting');
        try {
            const data = await exportSyncData();
            setSyncData(data);
            const encoded = encodeSyncData(data);
            setEncodedData(encoded);
            setDataSize(formatDataSize(getDataSize(data)));

            const url = `${window.location.origin}${window.location.pathname}#sync=${encoded}`;

            try {
                const qrUrl = await QRCode.toDataURL(url, {
                    width: 300,
                    margin: 2,
                    color: { dark: '#000000', light: '#ffffff' },
                    errorCorrectionLevel: 'L',
                });
                setQrDataUrl(qrUrl);
            } catch {
                const shortUrl = `barashka://sync?d=${encoded.slice(0, 100)}`;
                try {
                    const qrUrl = await QRCode.toDataURL(shortUrl, {
                        width: 300,
                        margin: 2,
                        color: { dark: '#000000', light: '#ffffff' },
                    });
                    setQrDataUrl(qrUrl);
                } catch {
                    console.warn('QR generation failed');
                }
            }

            setSyncState('exported');
        } catch (err: any) {
            setError(err.message || 'Export failed');
            setSyncState('error');
        }
    };

    const handleImport = async () => {
        if (!importInput.trim()) return;
        setSyncState('importing');
        setError('');

        try {
            let data: SyncData | null = null;

            const syncMatch = importInput.match(/#sync=([A-Za-z0-9+/=]+)/);
            if (syncMatch) {
                data = decodeSyncData(syncMatch[1]);
            }

            if (!data) {
                const urlMatch = importInput.match(/[?&]d=([A-Za-z0-9+/=]+)/);
                if (urlMatch) {
                    data = decodeSyncData(urlMatch[1]);
                }
            }

            if (!data) {
                data = decodeSyncData(importInput.trim());
            }

            if (!data) {
                throw new Error('Invalid sync data. Make sure you copied the full link or QR data.');
            }

            const result = await importSyncData(data, 'merge');
            setStats(result);
            setSyncState('imported');
            showToast(`Imported ${result.imported} items`);
        } catch (err: any) {
            setError(err.message || 'Import failed');
            setSyncState('error');
        }
    };

    const handleCopyLink = async () => {
        const url = `${window.location.origin}${window.location.pathname}#sync=${encodedData}`;
        try {
            await navigator.clipboard.writeText(url);
            showToast('Link copied to clipboard');
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = url;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('Link copied to clipboard');
        }
    };

    const handleShare = async () => {
        const url = `${window.location.origin}${window.location.pathname}#sync=${encodedData}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Barashka Library Sync',
                    text: `My Barashka library: ${syncData?.likedTracks.length || 0} tracks, ${syncData?.playlists.length || 0} playlists`,
                    url,
                });
            } catch {}
        } else {
            handleCopyLink();
        }
    };

    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        setImportInput(text);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-[#121212] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-lg max-h-[85vh] overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Library Sync</h2>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={() => setMode('export')}
                            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${mode === 'export' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'}`}
                        >
                            Export
                        </button>
                        <button
                            onClick={() => setMode('import')}
                            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${mode === 'import' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'}`}
                        >
                            Import
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {mode === 'export' && (
                        <div className="space-y-4">
                            {syncState === 'idle' && (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-400 mb-4">Export your library to transfer it to another device</p>
                                    <button
                                        onClick={handleExport}
                                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors"
                                    >
                                        Generate Sync Code
                                    </button>
                                </div>
                            )}

                            {syncState === 'exporting' && (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 mx-auto mb-4 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                    <p className="text-slate-600 dark:text-slate-400">Generating sync data...</p>
                                </div>
                            )}

                            {syncState === 'exported' && syncData && (
                                <div className="space-y-4">
                                    <div className="text-center">
                                        {qrDataUrl && (
                                            <div className="inline-block p-4 bg-white rounded-2xl shadow-lg border border-slate-100">
                                                <img src={qrDataUrl} alt="QR Code" className="w-[260px] h-[260px]" />
                                            </div>
                                        )}
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
                                            Scan this QR code on another device
                                        </p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                            {dataSize} • {syncData.likedTracks.length} tracks • {syncData.playlists.length} playlists • {syncData.likedArtists.length} artists
                                        </p>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCopyLink}
                                            className="flex-1 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors text-sm"
                                        >
                                            Copy Link
                                        </button>
                                        <button
                                            onClick={handleShare}
                                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-sm"
                                        >
                                            Share
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {mode === 'import' && (
                        <div className="space-y-4">
                            {syncState === 'idle' && (
                                <>
                                    <div className="text-center py-6">
                                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                                            <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-400 mb-4">Paste a sync link or scan a QR code</p>
                                    </div>

                                    <textarea
                                        value={importInput}
                                        onChange={(e) => setImportInput(e.target.value)}
                                        placeholder="Paste sync link here..."
                                        className="w-full h-24 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    />

                                    <div className="flex gap-2">
                                        <label className="flex-1 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors text-sm text-center cursor-pointer">
                                            Import from File
                                            <input type="file" accept=".json,.txt" className="hidden" onChange={handleFileImport} />
                                        </label>
                                        <button
                                            onClick={handleImport}
                                            disabled={!importInput.trim()}
                                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm"
                                        >
                                            Import
                                        </button>
                                    </div>
                                </>
                            )}

                            {syncState === 'importing' && (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 mx-auto mb-4 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                    <p className="text-slate-600 dark:text-slate-400">Importing data...</p>
                                </div>
                            )}

                            {syncState === 'imported' && stats && (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white mb-1">Import Complete!</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {stats.imported} items imported{stats.skipped > 0 ? `, ${stats.skipped} skipped` : ''}
                                    </p>
                                    <button
                                        onClick={onClose}
                                        className="mt-4 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors"
                                    >
                                        Done
                                    </button>
                                </div>
                            )}

                            {syncState === 'error' && (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </div>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white mb-1">Import Failed</p>
                                    <p className="text-sm text-rose-500">{error}</p>
                                    <button
                                        onClick={() => { setSyncState('idle'); setError(''); }}
                                        className="mt-4 px-6 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
