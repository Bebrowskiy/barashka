import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Music4 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useI18n } from '../lib/i18n';
import { db } from '../lib/db';

export default function CreatePlaylistModal() {
  const { t } = useI18n();
  const { isCreatePlaylistOpen, setIsCreatePlaylistOpen, openPlaylist, showToast, refreshPlaylists } = usePlayer();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCoverPreview(url);
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      const playlist = await db.createPlaylist({
        title: name.trim(),
        creator: 'Barashka',
        description: description.trim() || '',
        cover: coverPreview || "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?auto=format&fit=crop&q=80&w=400&h=400",
        tracks: [],
      });
      await refreshPlaylists();
      openPlaylist(playlist);
      showToast(t('playlist-created'));
    } catch (err) {
      console.error('Failed to create playlist:', err);
      showToast(t('playlist-create-error'));
    } finally {
      setCreating(false);
      setName('');
      setDescription('');
      setCoverPreview(null);
      setIsCreatePlaylistOpen(false);
    }
  };

  return (
    <AnimatePresence>
      {isCreatePlaylistOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsCreatePlaylistOpen(false)}
        >
          <motion.div
             initial={{ scale: 0.95, opacity: 0, y: 20 }}
             animate={{ scale: 1, opacity: 1, y: 0 }}
             exit={{ scale: 0.95, opacity: 0, y: 20 }}
             onClick={e => e.stopPropagation()}
             className="bg-white dark:bg-[#1A1A1A] rounded-[2.5rem] shadow-2xl dark:shadow-none overflow-hidden w-full max-w-md p-8 relative border border-transparent dark:border-white/[0.05]"
          >
            <button 
               onClick={() => setIsCreatePlaylistOpen(false)}
               className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors focus:outline-none"
            >
               <X className="w-6 h-6" />
            </button>
            
            <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white mb-8 tracking-tight">{t('create-playlist-title')}</h2>
            
            <div className="flex items-center gap-6 mb-8">
               <div 
                 onClick={() => fileInputRef.current?.click()}
                 className={`w-24 h-24 rounded-[1.2rem] flex items-center justify-center cursor-pointer transition-colors shadow-sm overflow-hidden border-2 ${coverPreview ? 'border-transparent' : 'bg-indigo-50 dark:bg-indigo-500/10 border-dashed border-indigo-200 dark:border-indigo-500/30 text-indigo-300 dark:text-indigo-500/50 hover:bg-indigo-100/50 dark:hover:bg-indigo-500/20 hover:text-indigo-400 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-400/50'}`}
               >
                 {coverPreview ? (
                   <img src={coverPreview} className="w-full h-full object-cover" alt="Preview" />
                 ) : (
                   <Music4 className="w-8 h-8" />
                 )}
               </div>
               <div className="flex-1">
                   <p className="text-[13px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">{t('create-playlist-cover')}</p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[14px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 px-5 py-2.5 rounded-full transition-colors focus:outline-none"
                  >
                    {t('create-playlist-choose')}
                  </button>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleImageChange}
                  />
               </div>
            </div>
            
            <div className="flex flex-col gap-5 mb-8">
               <div>
                 <label className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">{t('create-playlist-name')}</label>
                 <input 
                   autoFocus
                   value={name}
                   onChange={e => setName(e.target.value)}
                   placeholder={t('create-playlist-name-placeholder')}
                   className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all text-lg placeholder:text-slate-300 dark:placeholder:text-slate-600"
                 />
               </div>
               <div>
                 <label className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">{t('create-playlist-desc')}</label>
                 <textarea 
                   placeholder={t('create-playlist-desc-placeholder')}
                   value={description}
                   onChange={e => setDescription(e.target.value)}
                   rows={2}
                   className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-semibold px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all resize-none text-[15px] placeholder:text-slate-300 dark:placeholder:text-slate-600"
                 />
               </div>
            </div>
            
            <button 
               onClick={handleCreate}
               disabled={!name.trim()}
               className={`w-full font-bold py-4 rounded-2xl transition-all outline-none text-lg ${name.trim() ? 'bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-500 dark:hover:bg-indigo-400 text-white shadow-xl shadow-indigo-600/20 dark:shadow-indigo-500/20 hover:-translate-y-0.5 active:translate-y-0' : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-transparent dark:border-white/5'}`}
            >
               {t('create-playlist-button')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
