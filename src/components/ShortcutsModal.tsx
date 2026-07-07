import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface ShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const shortcuts = [
    { keys: ['Space'], actionKey: 'shortcut-play-pause' },
    { keys: ['←'], actionKey: 'shortcut-seek-back' },
    { keys: ['→'], actionKey: 'shortcut-seek-fwd' },
    { keys: ['Shift', '←'], actionKey: 'shortcut-seek-back-10' },
    { keys: ['Shift', '→'], actionKey: 'shortcut-seek-fwd-10' },
    { keys: ['↑'], actionKey: 'shortcut-volume-up' },
    { keys: ['↓'], actionKey: 'shortcut-volume-down' },
    { keys: ['Ctrl', '→'], actionKey: 'shortcut-next' },
    { keys: ['Ctrl', '←'], actionKey: 'shortcut-prev' },
    { keys: ['M'], actionKey: 'shortcut-mute' },
    { keys: ['S'], actionKey: 'shortcut-shuffle' },
    { keys: ['R'], actionKey: 'shortcut-repeat' },
    { keys: ['F'], actionKey: 'shortcut-fullscreen' },
    { keys: ['Q'], actionKey: 'shortcut-queue' },
    { keys: ['L'], actionKey: 'shortcut-lyrics' },
];

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
    const { t } = useI18n();

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        onClick={e => e.stopPropagation()}
                        className="bg-white dark:bg-[#1A1A1A] rounded-[2.5rem] shadow-2xl dark:shadow-none overflow-hidden w-full max-w-md p-8 relative border border-transparent dark:border-white/[0.05]"
                    >
                        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>

                        <h2 className="text-xl font-display font-black text-slate-900 dark:text-white mb-6">{t('shortcuts-title')}</h2>

                        <div className="space-y-2">
                            {shortcuts.map(({ keys, actionKey }) => (
                                <div key={actionKey} className="flex items-center justify-between py-2">
                                    <span className="text-[14px] font-bold text-slate-600 dark:text-slate-400">{t(actionKey)}</span>
                                    <div className="flex items-center gap-1">
                                        {keys.map((key, i) => (
                                            <span key={i}>
                                                <kbd className="px-2 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/[0.08] rounded-lg text-[12px] font-bold text-slate-600 dark:text-slate-400 shadow-sm">
                                                    {key}
                                                </kbd>
                                                {i < keys.length - 1 && <span className="text-slate-300 dark:text-slate-600 mx-0.5">+</span>}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
