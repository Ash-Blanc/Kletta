import React, { useState } from 'react';
import { Resource, Task, SearchFilters } from '../types';
import { FileText, CheckSquare, Layers, Link as LinkIcon, AlertCircle, Box, Database, Plus, Filter, Search, X, Star, Calendar, Code } from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarRightProps {
  resources: Resource[];
  tasks: Task[];
  onAddResource: (filters: SearchFilters) => void;
  className?: string;
}

const SidebarRight: React.FC<SidebarRightProps> = ({ resources = [], tasks = [], onAddResource, className }) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'paper' | 'library' | 'dataset'>('all');
  
  // Search State
  const [isAdding, setIsAdding] = useState(false);
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('');
  const [minStars, setMinStars] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  const filteredResources = resources.filter(res => 
    activeFilter === 'all' || res.type === activeFilter
  );

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'paper': return <FileText size={14} />;
      case 'library': return <Box size={14} />;
      case 'dataset': return <Database size={14} />;
      default: return <LinkIcon size={14} />;
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'paper': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'library': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'dataset': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default: return 'bg-surfaceHighlight text-textMuted border-surfaceHighlight';
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    onAddResource({
        topic,
        language: language.trim() || undefined,
        minStars: minStars ? parseInt(minStars) : undefined,
        lastUpdated: lastUpdated.trim() || undefined
    });
    
    // Reset form but keep expanded to show loading state via parent if we wanted, 
    // but app logic currently handles global loading state.
    // We'll close it to keep UI clean.
    setIsAdding(false);
    setTopic('');
    setLanguage('');
    setMinStars('');
    setLastUpdated('');
  };

  return (
    <div className={clsx("flex flex-col h-full", className)}>
      
      {/* Active Tasks */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-8">
        
        <div className="space-y-4">
          <div className="flex items-center justify-between text-textMuted mb-2">
            <div className="flex items-center gap-2">
                <CheckSquare size={16} />
                <h3 className="text-xs font-semibold uppercase tracking-wider">Active Plan</h3>
            </div>
            <button className="text-textMuted hover:text-accent transition-colors">
                <Plus size={14} />
            </button>
          </div>
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <div className="text-xs text-textMuted italic p-2">No active tasks</div>
            ) : (
              tasks.map(task => (
                <div key={task.id} className="flex items-start gap-3 p-2 rounded hover:bg-surfaceHighlight/20 transition-colors group">
                  <div className={clsx(
                    "w-4 h-4 rounded border flex items-center justify-center mt-0.5 transition-colors",
                    task.status === 'completed' ? "bg-accent border-accent" : 
                    task.status === 'in-progress' ? "border-accent" : "border-textMuted/50 group-hover:border-textMuted"
                  )}>
                    {task.status === 'completed' && <div className="w-2 h-2 bg-white rounded-[1px]" />}
                    {task.status === 'in-progress' && <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />}
                  </div>
                  <div className={clsx(
                    "text-sm transition-all",
                    task.status === 'completed' ? "text-textMuted line-through" : "text-text"
                  )}>
                    {task.title}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="h-px bg-surfaceHighlight w-full"></div>

        {/* Resources */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-textMuted mb-2">
            <div className="flex items-center gap-2">
                <Layers size={16} />
                <h3 className="text-xs font-semibold uppercase tracking-wider">Resources</h3>
            </div>
            <button 
                onClick={() => setIsAdding(!isAdding)}
                className={clsx("transition-colors", isAdding ? "text-accent" : "text-textMuted hover:text-accent")} 
                title="Find New Resource"
            >
                {isAdding ? <X size={14} /> : <Plus size={14} />}
            </button>
          </div>

          {/* Search Form */}
          {isAdding && (
              <form onSubmit={handleSearchSubmit} className="bg-surfaceHighlight/20 p-3 rounded-lg border border-surfaceHighlight/50 space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 text-textMuted" size={12} />
                      <input 
                          type="text" 
                          placeholder="Search topic..." 
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          autoFocus
                          className="w-full bg-black/20 border border-surfaceHighlight rounded-md py-1.5 pl-8 pr-2 text-xs text-text focus:outline-none focus:border-accent"
                      />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                          <Code className="absolute left-2 top-2 text-textMuted" size={12} />
                          <input 
                              type="text" 
                              placeholder="Lang (e.g. Python)"
                              value={language}
                              onChange={(e) => setLanguage(e.target.value)}
                              className="w-full bg-black/20 border border-surfaceHighlight rounded-md py-1.5 pl-7 pr-2 text-[11px] text-text focus:outline-none focus:border-accent"
                          />
                      </div>
                      <div className="relative">
                          <Star className="absolute left-2 top-2 text-textMuted" size={12} />
                          <input 
                              type="number" 
                              placeholder="Min Stars"
                              value={minStars}
                              onChange={(e) => setMinStars(e.target.value)}
                              className="w-full bg-black/20 border border-surfaceHighlight rounded-md py-1.5 pl-7 pr-2 text-[11px] text-text focus:outline-none focus:border-accent"
                          />
                      </div>
                  </div>

                  <div className="relative">
                       <Calendar className="absolute left-2 top-2 text-textMuted" size={12} />
                       <input 
                           type="text" 
                           placeholder="Updated (e.g. 2024)"
                           value={lastUpdated}
                           onChange={(e) => setLastUpdated(e.target.value)}
                           className="w-full bg-black/20 border border-surfaceHighlight rounded-md py-1.5 pl-7 pr-2 text-[11px] text-text focus:outline-none focus:border-accent"
                       />
                  </div>

                  <button 
                      type="submit" 
                      disabled={!topic.trim()}
                      className="w-full bg-accent hover:bg-accentHover text-white text-xs font-medium py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      Search Resources
                  </button>
              </form>
          )}

          {/* Filter Tabs */}
          {!isAdding && (
            <div className="flex gap-2 pb-2 overflow-x-auto custom-scrollbar">
                {['all', 'paper', 'library', 'dataset'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setActiveFilter(f as any)}
                        className={clsx(
                            "px-2.5 py-1 text-[10px] uppercase font-medium rounded-full border transition-all whitespace-nowrap",
                            activeFilter === f 
                                ? "bg-accent/10 border-accent/50 text-accent" 
                                : "bg-transparent border-surfaceHighlight text-textMuted hover:border-textMuted"
                        )}
                    >
                        {f === 'all' ? 'All' : f === 'library' ? 'Code' : f === 'dataset' ? 'Data' : 'Papers'}
                    </button>
                ))}
            </div>
          )}

          <div className="space-y-3">
            {filteredResources.length === 0 ? (
               <div className="text-xs text-textMuted italic p-4 text-center border border-dashed border-surfaceHighlight rounded-lg">
                 {resources.length === 0 ? "No resources collected" : "No matches found"}
               </div>
            ) : (
              filteredResources.map(res => (
                <a 
                    key={res.id} 
                    href={res.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-surfaceHighlight/20 rounded-lg border border-surfaceHighlight/50 hover:border-accent/50 hover:bg-surfaceHighlight/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className={clsx("p-1.5 rounded-md border flex-shrink-0", getBadgeColor(res.type))}>
                            {getResourceIcon(res.type)}
                        </div>
                        <div className="text-sm font-medium text-text truncate group-hover:text-accent transition-colors">{res.title}</div>
                    </div>
                    {res.url && <LinkIcon size={12} className="text-textMuted group-hover:text-accent opacity-0 group-hover:opacity-100 transition-all" />}
                  </div>
                  
                  {res.summary && (
                      <div className="text-xs text-textMuted/80 line-clamp-2 pl-[34px] mb-2 leading-relaxed">
                        {res.summary}
                      </div>
                  )}

                  <div className="flex flex-wrap gap-2 pl-[34px]">
                    <span className={clsx("text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-wide font-medium", getBadgeColor(res.type))}>
                      {res.type}
                    </span>
                    
                    {/* Metadata Badges */}
                    {res.metadata?.stars && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded border border-surfaceHighlight bg-surfaceHighlight/30 text-textMuted flex items-center gap-1">
                            <Star size={8} className="fill-current" />
                            {res.metadata.stars}
                        </span>
                    )}
                    {res.metadata?.language && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded border border-surfaceHighlight bg-surfaceHighlight/30 text-textMuted flex items-center gap-1">
                            <Code size={8} />
                            {res.metadata.language}
                        </span>
                    )}
                    {res.metadata?.updated && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded border border-surfaceHighlight bg-surfaceHighlight/30 text-textMuted flex items-center gap-1">
                            <Calendar size={8} />
                            {res.metadata.updated}
                        </span>
                    )}
                  </div>
                </a>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SidebarRight;