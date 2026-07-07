import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { usePlayer } from '../context/PlayerContext';
import { exportSyncData, importSyncData, encodeSyncData, decodeSyncData, getDataSize, formatDataSize, type SyncData } from '../lib/sync';

type SyncMode = 'idle' | 'exporting' | 'exported' | 'importing' | 'imported' | 'error';

export default function SyncModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { showToast } = usePlayer();
    const [mode, setMode] = useState<'export' | 'import'>('export');
    const [syncState, setSyncState] = useState<SyncMode>('idle');
    const [syncData, setSyncData] = useState<SyncData | null>(null);
    const [encodedData, setEncodedData] = useState('');
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [importInput, setImportInput] = useState('');
    const [error, setError] = useState('');
    const [stats, setStats] = useState<{ imported: number; skipped: number; breakdown: any } | null>(null);
    const [dataSize, setDataSize] = useState('');
    const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
    const [previewData, setPreviewData] = useState<SyncData | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setSyncState('idle');
            setSyncData(null);
            setEncodedData('');
            setQrDataUrl('');
            setImportInput('');
            setError('');
            setStats(null);
            setPreviewData(null);
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

    const handlePreview = (input: string) => {
        if (!input.trim()) {
            setPreviewData(null);
            return;
        }

        let data: SyncData | null = null;

        const syncMatch = input.match(/#sync=([A-Za-z0-9+/=]+)/);
        if (syncMatch) data = decodeSyncData(syncMatch[1]);

        if (!data) {
            const urlMatch = input.match(/[?&]d=([A-Za-z0-9+/=]+)/);
            if (urlMatch) data = decodeSyncData(urlMatch[1]);
        }

        if (!data) data = decodeSyncData(input.trim());

        setPreviewData(data);
    };

    const handleImport = async () => {
        if (!importInput.trim()) return;
        setSyncState('importing');
        setError('');

        try {
            let data: SyncData | null = null;

            const syncMatch = importInput.match(/#sync=([A-Za-z0-9+/=]+)/);
            if (syncMatch) data = decodeSyncData(syncMatch[1]);

            if (!data) {
                const urlMatch = importInput.match(/[?&]d=([A-Za-z0-9+/=]+)/);
                if (urlMatch) data = decodeSyncData(urlMatch[1]);
            }

            if (!data) data = decodeSyncData(importInput.trim());

            if (!data) {
                throw new Error('Invalid sync data. Make sure you copied the full link or QR data.');
            }

            const result = await importSyncData(data, importMode);
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
        handlePreview(text);
    };

    const handleDownloadFile = () => {
        if (!encodedData) return;
        const blob = new Blob([JSON.stringify(syncData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `barashka-sync-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-[#121212] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-lg max-h-[85vh] overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Account Transfer</h2>
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
                                    <p className="text-slate-600 dark:text-slate-400 mb-2">Transfer your entire account to another device</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Profile, settings, playlists, favorites, history, and queue</p>
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
                                    </div>

                                    {/* Detailed breakdown */}
                                    <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 space-y-2">
                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">What's included</p>
                                        {syncData.profile && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-600 dark:text-slate-400">Profile</span>
                                                <span className="font-bold text-slate-900 dark:text-white">{syncData.profile.nickname}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600 dark:text-slate-400">Liked tracks</span>
                                            <span className="font-bold text-slate-900 dark:text-white">{syncData.likedTracks.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600 dark:text-slate-400">Liked albums</span>
                                            <span className="font-bold text-slate-900 dark:text-white">{syncData.likedAlbums.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600 dark:text-slate-400">Liked artists</span>
                                            <span className="font-bold text-slate-900 dark:text-white">{syncData.likedArtists.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600 dark:text-slate-400">Playlists</span>
                                            <span className="font-bold text-slate-900 dark:text-white">{syncData.playlists.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600 dark:text-slate-400">History</span>
                                            <span className="font-bold text-slate-900 dark:text-white">{syncData.history.length} tracks</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600 dark:text-slate-400">Settings</span>
                                            <span className="font-bold text-slate-900 dark:text-white">All preferences</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600 dark:text-slate-400">Queue</span>
                                            <span className="font-bold text-slate-900 dark:text-white">{syncData.queue.queue.length} tracks</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-200 dark:border-white/5">
                                            <span>Data size</span>
                                            <span>{dataSize}</span>
                                        </div>
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
                                            className="flex-1 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors text-sm"
                                        >
                                            Share
                                        </button>
                                        <button
                                            onClick={handleDownloadFile}
                                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-sm"
                                        >
                                            Save File
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
                                        <p className="text-slate-600 dark:text-slate-400 mb-4">Paste a sync link, scan a QR code, or load a file</p>
                                    </div>

                                    <textarea
                                        value={importInput}
                                        onChange={(e) => { setImportInput(e.target.value); handlePreview(e.target.value); }}
                                        placeholder="Paste sync link here..."
                                        className="w-full h-24 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    />

                                    {/* Import mode toggle */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setImportMode('merge')}
                                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${importMode === 'merge' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30' : 'bg-slate-100 dark:bg-white/5 text-slate-500 border border-transparent'}`}
                                        >
                                            Merge (add new)
                                        </button>
                                        <button
                                            onClick={() => setImportMode('replace')}
                                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${importMode === 'replace' ? 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30' : 'bg-slate-100 dark:bg-white/5 text-slate-500 border border-transparent'}`}
                                        >
                                            Replace (full overwrite)
                                        </button>
                                    </div>

                                    {/* Preview */}
                                    {previewData && (
                                        <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 space-y-2">
                                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Preview</p>
                                            {previewData.profile && (
                                                <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-white/5">
                                                    {previewData.profile.avatar && (
                                                        <img src={previewData.profile.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                                                    )}
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-900 dark:text-white">{previewData.profile.nickname}</p>
                                                        <p className="text-xs text-slate-400">{previewData.profile.bio || 'No bio'}</p>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div className="flex justify-between"><span className="text-slate-500">Tracks</span><span className="font-bold text-slate-900 dark:text-white">{previewData.likedTracks.length}</span></div>
                                                <div className="flex justify-between"><span className="text-slate-500">Albums</span><span className="font-bold text-slate-900 dark:text-white">{previewData.likedAlbums.length}</span></div>
                                                <div className="flex justify-between"><span className="text-slate-500">Artists</span><span className="font-bold text-slate-900 dark:text-white">{previewData.likedArtists.length}</span></div>
                                                <div className="flex justify-between"><span className="text-slate-500">Playlists</span><span className="font-bold text-slate-900 dark:text-white">{previewData.playlists.length}</span></div>
                                                <div className="flex justify-between"><span className="text-slate-500">History</span><span className="font-bold text-slate-900 dark:text-white">{previewData.history.length}</span></div>
                                                <div className="flex justify-between"><span className="text-slate-500">Queue</span><span className="font-bold text-slate-900 dark:text-white">{previewData.queue?.queue.length || 0}</span></div>
                                            </div>
                                            <p className="text-xs text-slate-400 text-right">{formatDataSize(getDataSize(previewData))}</p>
                                        </div>
                                    )}

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

                                    <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 mt-4 text-left space-y-1.5">
                                        {stats.breakdown.profile && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Profile</span>
                                                <span className="font-bold text-emerald-600">Imported</span>
                                            </div>
                                        )}
                                        {stats.breakdown.settings && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Settings</span>
                                                <span className="font-bold text-emerald-600">Imported</span>
                                            </div>
                                        )}
                                        {stats.breakdown.tracks > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Tracks</span>
                                                <span className="font-bold text-emerald-600">{stats.breakdown.tracks} added</span>
                                            </div>
                                        )}
                                        {stats.breakdown.albums > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Albums</span>
                                                <span className="font-bold text-emerald-600">{stats.breakdown.albums} added</span>
                                            </div>
                                        )}
                                        {stats.breakdown.artists > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Artists</span>
                                                <span className="font-bold text-emerald-600">{stats.breakdown.artists} added</span>
                                            </div>
                                        )}
                                        {stats.breakdown.playlists > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Playlists</span>
                                                <span className="font-bold text-emerald-600">{stats.breakdown.playlists} created</span>
                                            </div>
                                        )}
                                        {stats.breakdown.history > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">History</span>
                                                <span className="font-bold text-emerald-600">{stats.breakdown.history} entries</span>
                                            </div>
                                        )}
                                        {stats.skipped > 0 && (
                                            <div className="flex justify-between text-sm pt-1 border-t border-slate-200 dark:border-white/5">
                                                <span className="text-slate-400">Skipped (already exist)</span>
                                                <span className="text-slate-400">{stats.skipped}</span>
                                            </div>
                                        )}
                                    </div>

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
