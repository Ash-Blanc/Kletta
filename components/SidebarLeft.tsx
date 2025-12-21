import React, { useState, useEffect } from 'react';
import { Competition, ViewMode, KaggleCredentials } from '../types';
import { Trophy, Plus, MessageSquare, Database, Settings, Search, Users, PanelLeftClose, PanelLeftOpen, Trash2, Users2 } from 'lucide-react';
import { KlettaIcon } from './KlettaIcon';
import { clsx } from 'clsx';

interface SidebarLeftProps {
  competitions: Competition[];
  activeId: string | null;
  onSelectCompetition: (id: string) => void;
  onDeleteCompetition: (id: string) => void;
  onCreateCompetition: () => void;
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  kaggleCreds: KaggleCredentials | null;
  kaggleStatus?: { loaded: boolean; error?: string };
  onConnectKaggle?: (creds: KaggleCredentials | null) => void; 
  isCollapsed: boolean;
  onToggle: () => void;
  onBackToLanding?: () => void;
  className?: string;
}

const SidebarLeft: React.FC<SidebarLeftProps> = ({ 
  competitions, 
  activeId, 
  onSelectCompetition,
  onDeleteCompetition,
  onCreateCompetition,
  activeView,
  onViewChange,
  kaggleCreds,
  kaggleStatus,
  isCollapsed,
  onToggle,
  onBackToLanding,
  className 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  // Debounce logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const filteredCompetitions = competitions.filter(comp => 
    comp.name.toLowerCase().includes(debouncedTerm.toLowerCase()) ||
    comp.tags.some(tag => tag.toLowerCase().includes(debouncedTerm.toLowerCase()))
  );

  return (
    <div className={clsx("flex flex-col py-4 transition-all", isCollapsed ? "px-2 items-center" : "px-4", className)}>
      
      {/* Header */}
      <div className={clsx(
          "flex items-center w-full mb-6", 
          isCollapsed ? "justify-center" : "justify-between pl-2"
      )}>
        {!isCollapsed ? (
            <button 
              type="button"
              onClick={onBackToLanding}
              className="group font-serif font-bold text-lg tracking-tight text-text animate-in fade-in slide-in-from-left-2 hover:text-accent transition-all text-left cursor-pointer select-none flex items-center gap-2"
              title="Reset Workspace"
            >
              <KlettaIcon size={20} className="group-hover:rotate-12 transition-transform duration-500" />
              <span>Kletta</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-sans font-normal text-textMuted bg-surfaceHighlight/50 px-1.5 rounded">Reset</span>
            </button>
        ) : (
            <button 
                onClick={onBackToLanding}
                className="hover:scale-110 hover:rotate-12 transition-all duration-500 cursor-pointer"
                title="Reset Workspace"
            >
                <KlettaIcon size={24} />
            </button>
        )}
        {!isCollapsed && (
            <button
                onClick={onToggle}
                className="p-2 text-textMuted hover:text-text hover:bg-surfaceHighlight/30 rounded-md transition-colors cursor-pointer"
                title="Collapse Sidebar"
            >
                <PanelLeftClose size={20} />
            </button>
        )}
      </div>

      {/* Search Bar */}
      <div className={clsx("transition-all", isCollapsed ? "px-0" : "px-2")}>
        {!isCollapsed ? (
            <div className="relative group animate-in fade-in">
              <Search className="absolute left-3 top-2.5 text-textMuted group-focus-within:text-accent transition-colors" size={14} />
              <input 
                type="text" 
                placeholder="Filter competitions..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surfaceHighlight/20 border border-surfaceHighlight rounded-md py-2 pl-9 pr-3 text-xs text-text focus:outline-none focus:border-accent/50 focus:bg-surfaceHighlight/30 transition-all placeholder:text-textMuted/70"
              />
            </div>
        ) : (
            <button className="p-2 text-textMuted hover:text-accent hover:bg-surfaceHighlight/30 rounded-md transition-colors cursor-pointer" title="Search">
                <Search size={20} />
            </button>
        )}
      </div>

      {/* Competitions List */}
      <div className={clsx("flex-1 overflow-y-auto custom-scrollbar mt-4", isCollapsed ? "w-full flex flex-col items-center" : "-mr-2 pr-2")}>
        {!isCollapsed && (
            <div className="flex items-center justify-between mb-3 px-2 animate-in fade-in">
              <h2 className="text-xs font-semibold text-textMuted uppercase tracking-wider">Competitions</h2>
              <button 
                type="button"
                onClick={onCreateCompetition}
                className="p-1 text-textMuted hover:text-accent hover:bg-surfaceHighlight/50 rounded transition-colors cursor-pointer z-10"
                title="Join New Competition"
              >
                <Plus size={16} />
              </button>
            </div>
        )}
        
        <div className="space-y-1 w-full">
          {!isCollapsed && filteredCompetitions.length === 0 ? (
            <div className="text-xs text-textMuted px-2 py-4 text-center border border-dashed border-surfaceHighlight rounded-md space-y-2">
              {competitions.length === 0 ? (
                kaggleStatus?.error ? (
                  <>
                    <p className="text-red-400/80">{kaggleStatus.error}</p>
                    <button
                      onClick={() => onViewChange('settings')}
                      className="text-accent hover:underline text-[11px]"
                    >
                      Configure in Settings →
                    </button>
                  </>
                ) : (
                  <p className="italic">No competitions yet. Click + to join one.</p>
                )
              ) : (
                <p className="italic">No matches found</p>
              )}
            </div>
          ) : (
            filteredCompetitions.map(comp => (
              <div key={comp.id} className="group relative">
                <button
                  onClick={() => {
                    onSelectCompetition(comp.id);
                    onViewChange('chat');
                  }}
                  className={clsx(
                    "rounded-md transition-all duration-200 group flex items-center cursor-pointer w-full text-left p-2.5 gap-3 hover:bg-surfaceHighlight/30",
                    isCollapsed ? "justify-center" : "",
                    activeId === comp.id ? (isCollapsed ? "bg-surfaceHighlight text-accent" : "bg-surfaceHighlight text-text") : "text-textMuted"
                  )}
                  title={isCollapsed ? comp.name : undefined}
                >
                  <Trophy size={isCollapsed ? 20 : 16} className={clsx("flex-shrink-0", activeId === comp.id ? "text-accent" : "text-textMuted")} />
                  {!isCollapsed && (
                      <div className="overflow-hidden flex-1">
                        <div className="font-medium text-sm truncate">{comp.name}</div>
                        <div className="text-xs text-textMuted/70 truncate flex items-center gap-1">
                          {comp.tags[0] || 'Active'}
                        </div>
                      </div>
                  )}
                </button>
                
                {!isCollapsed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCompetition(comp.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 text-textMuted hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                    title="Delete Competition"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))
          )}
          {isCollapsed && (
              <button 
                type="button"
                onClick={onCreateCompetition}
                className="w-10 h-10 mx-auto flex items-center justify-center text-textMuted hover:text-accent hover:bg-surfaceHighlight/30 rounded-md transition-colors mt-2 cursor-pointer"
                title="Join New Competition"
              >
                <Plus size={20} />
              </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className={clsx("w-full", isCollapsed && "flex flex-col items-center")}>
        <div className="h-px bg-surfaceHighlight w-full mb-4"></div>
        <div className="space-y-1 w-full">
          {[
              { id: 'memory', label: 'Memory', icon: Database },
              { id: 'team', label: 'Team', icon: Users2 },
              { id: 'agents', label: 'Agents', icon: Users },
              { id: 'settings', label: 'Settings', icon: Settings, hasStatus: true },
          ].map((item) => (
              <button 
                key={item.id}
                onClick={() => onViewChange(item.id as ViewMode)}
                className={clsx(
                  "rounded-md transition-colors group relative cursor-pointer",
                  isCollapsed 
                    ? "w-10 h-10 mx-auto flex items-center justify-center hover:bg-surfaceHighlight/30" 
                    : "w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-surfaceHighlight/30",
                  activeView === item.id 
                    ? (isCollapsed ? "text-accent bg-surfaceHighlight/30" : "text-accent bg-surfaceHighlight/30") 
                    : "text-textMuted hover:text-text"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <div className="relative">
                    <item.icon size={isCollapsed ? 20 : 18} />
                    {item.hasStatus && (
                        <div className={clsx(
                            "absolute -top-1 -right-1 w-2 h-2 rounded-full border border-surface shadow-sm",
                            kaggleCreds ? "bg-green-500" : "bg-red-500"
                        )}></div>
                    )}
                </div>
                {!isCollapsed && <span>{item.label}</span>}
              </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SidebarLeft;