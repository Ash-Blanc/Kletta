import React, { useState, useEffect, useRef } from 'react';
import { Search, Trophy, MessageSquare, Settings, Database, Users, Terminal, X, Command, ChevronRight } from 'lucide-react';
import { Competition, ViewMode } from '../types';
import { clsx } from 'clsx';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  competitions: Competition[];
  onSelectCompetition: (id: string) => void;
  onViewChange: (view: ViewMode) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ 
    isOpen, 
    onClose, 
    competitions, 
    onSelectCompetition, 
    onViewChange 
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const VIEWS = [
    { id: 'chat', label: 'Jump to Chat', icon: <MessageSquare size={16} className="text-blue-400" /> },
    { id: 'memory', label: 'View Persistent Memory', icon: <Database size={16} className="text-emerald-400" /> },
    { id: 'agents', label: 'Configure Agent Team', icon: <Users size={16} className="text-purple-400" /> },
    { id: 'team', label: 'Collaborate with Team', icon: <Users size={16} className="text-orange-400" /> },
    { id: 'settings', label: 'Workspace Settings', icon: <Settings size={16} className="text-textMuted" /> },
  ];

  const filteredComps = competitions
    .filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5);
    
  const filteredViews = VIEWS.filter(v => v.label.toLowerCase().includes(query.toLowerCase()));

  const allItems = [
    ...filteredViews.map(v => ({ type: 'view', ...v })),
    ...filteredComps.map(c => ({ type: 'comp', id: c.id, label: c.name, icon: <Trophy size={16} className="text-yellow-500" /> }))
  ];

  useEffect(() => {
    if (isOpen) {
        setQuery('');
        setSelectedIndex(0);
        setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < allItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : allItems.length - 1));
    } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = allItems[selectedIndex];
        if (item) {
            if (item.type === 'view') {
                onViewChange(item.id as ViewMode);
            } else {
                onSelectCompetition(item.id);
                onViewChange('chat');
            }
            onClose();
        }
    } else if (e.key === 'Escape') {
        onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      {/* Palette */}
      <div className="relative w-full max-w-xl bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
        <div className="flex items-center px-6 border-b border-white/5 bg-white/5">
            <Search className="text-white/20" size={20} />
            <input 
                ref={inputRef}
                type="text" 
                placeholder="Search competitions or jump to sections..." 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent border-0 py-5 px-4 text-sm text-white focus:outline-none placeholder:text-white/10 font-medium"
            />
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-white/30 tracking-tighter">
                <span className="text-[12px]">ESC</span>
            </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto no-scrollbar py-2">
            {allItems.length === 0 ? (
                <div className="px-6 py-12 text-center">
                    <p className="text-sm text-textMuted font-medium">No results found for "{query}"</p>
                </div>
            ) : (
                <div className="space-y-1 px-2">
                    {allItems.map((item, index) => (
                        <button
                            key={item.id + (item.type || '')}
                            onClick={() => {
                                if (item.type === 'view') onViewChange(item.id as ViewMode);
                                else { onSelectCompetition(item.id); onViewChange('chat'); }
                                onClose();
                            }}
                            className={clsx(
                                "w-full text-left px-4 py-3.5 rounded-2xl flex items-center justify-between group transition-all",
                                index === selectedIndex ? "bg-emerald-500 text-black shadow-lg" : "text-white/40 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className={clsx(
                                    "p-2 rounded-xl transition-colors",
                                    index === selectedIndex ? "bg-black/20 text-black" : "bg-white/5"
                                )}>
                                    {item.icon}
                                </div>
                                <div>
                                    <div className="text-[13px] font-bold tracking-tight">{item.label}</div>
                                    <div className={clsx(
                                        "text-[10px] font-medium uppercase tracking-widest mt-0.5 opacity-60",
                                        index === selectedIndex ? "text-black" : "text-textMuted"
                                    )}>
                                        {item.type === 'view' ? 'Navigation' : 'Competition'}
                                    </div>
                                </div>
                            </div>
                            <ChevronRight size={16} className={clsx(
                                "transition-transform group-hover:translate-x-1",
                                index === selectedIndex ? "text-black" : "text-white/10"
                            )} />
                        </button>
                    ))}
                </div>
            )}
        </div>

        <div className="px-6 py-3 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                <div className="flex items-center gap-1.5"><span className="p-1 rounded bg-white/5 border border-white/10 text-[8px]">↑↓</span> Navigate</div>
                <div className="flex items-center gap-1.5"><span className="p-1 rounded bg-white/5 border border-white/10 text-[8px]">ENTER</span> Select</div>
            </div>
            <div className="text-[10px] font-black text-emerald-500/40 uppercase tracking-widest">
                Kletta Intelligence
            </div>
        </div>
      </div>
    </div>
  );
};
