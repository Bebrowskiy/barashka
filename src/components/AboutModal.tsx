import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useI18n } from '../lib/i18n';

export default function AboutModal() {
  const { t } = useI18n();
  const { isAboutOpen, setIsAboutOpen } = usePlayer();

  return (
    <AnimatePresence>
      {isAboutOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsAboutOpen(false)}
        >
          <motion.div
             initial={{ scale: 0.95, opacity: 0, y: 20 }}
             animate={{ scale: 1, opacity: 1, y: 0 }}
             exit={{ scale: 0.95, opacity: 0, y: 20 }}
             onClick={e => e.stopPropagation()}
             className="bg-white dark:bg-[#1A1A1A] text-slate-900 dark:text-white rounded-[2.5rem] shadow-2xl dark:shadow-none overflow-y-auto max-h-[90vh] w-full max-w-md p-8 sm:p-10 relative hide-scrollbar border border-transparent dark:border-white/[0.05]"
          >
            <button 
               onClick={() => setIsAboutOpen(false)}
               className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors focus:outline-none"
            >
               <X className="w-6 h-6" />
            </button>
            
            <div className="flex flex-col items-center text-center mt-2">
               <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-sm dark:shadow-none border border-indigo-100/50 dark:border-indigo-500/20 overflow-hidden">
                  <img src="assets/logo.svg" alt="Barashka" className="w-14 h-14 invert dark:invert-0" />
               </div>
               
               <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white tracking-tight">{t('about-title')}</h2>
               <p className="text-[12px] font-bold text-indigo-500 dark:text-indigo-400 mb-6 uppercase tracking-widest mt-1">{t('about-version')}</p>
               
               <p className="text-[14px] sm:text-[15px] leading-relaxed text-slate-500 dark:text-slate-400 mb-8 font-medium">
                  {t('about-desc')}
               </p>

               <div className="w-full bg-slate-50 dark:bg-[#121212] rounded-[1.5rem] p-6 text-[13px] font-semibold text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-white/10 shadow-inner dark:shadow-none flex flex-col gap-4">
                   <div className="flex flex-col items-center">
                     <span className="block text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Copyright © 2026</span>
                    <a href="https://github.com/Bebrowskiy" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-white/10 px-3 py-1.5 rounded-full transition-all">
                      Bebrowskiy <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                   <p className="pt-2 text-slate-400 dark:text-slate-500 text-[12px]">{t('about-license')}</p>
               </div>
            </div>
            
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
