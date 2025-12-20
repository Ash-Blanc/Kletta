import React, { useState } from 'react';
import { X, Search } from 'lucide-react';

interface CreateCompetitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (query: string) => void;
}

const CreateCompetitionModal: React.FC<CreateCompetitionModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    onCreate(query);
    setQuery('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-surface border border-surfaceHighlight rounded-xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-surfaceHighlight flex items-center justify-between bg-surfaceHighlight/10">
          <h3 className="font-semibold text-text">Join Competition</h3>
          <button onClick={onClose} className="text-textMuted hover:text-text transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
             <label className="text-xs font-medium text-textMuted uppercase tracking-wider">Competition Name or Keyword</label>
             <div className="relative">
                <Search className="absolute left-3 top-3 text-textMuted" size={16} />
                <input 
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. 'Titanic', 'AIMO 3', 'Sleep States'"
                  className="w-full bg-black/20 border border-surfaceHighlight rounded-lg pl-10 pr-4 py-2.5 text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                  autoFocus
                />
             </div>
             <p className="text-[11px] text-textMuted">
                Kletta will scout Kaggle for details, rules, and datasets automatically.
             </p>
          </div>

          <div className="flex justify-end pt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-sm text-textMuted hover:text-text transition-colors mr-2"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={!query.trim()}
              className="bg-accent hover:bg-accentHover text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
            >
              Scout & Join
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCompetitionModal;