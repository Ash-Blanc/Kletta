import React, { useState } from 'react';
import { Resource, Task, SearchFilters, KaggleCredentials } from '../types';
import { 
  FileText, CheckSquare, Layers, Link as LinkIcon, 
  Box, Database, Plus, Search, X, Star, 
  Calendar, Code, Trash2, CheckCircle2, Circle, 
  Clock, GripVertical, ChevronDown, ChevronUp, Terminal, Loader2
} from 'lucide-react';
import { clsx } from 'clsx';
import { searchCompetitions, searchDatasets, fetchLeaderboard, fetchDatasetFiles } from '../services/kaggleService';

interface SidebarRightProps {
  resources: Resource[];
  tasks: Task[];
  onAddResource: (filters: SearchFilters) => void;
  onAddTask: (title: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onDeleteResource: (id: string) => void;
  kaggleCreds: KaggleCredentials | null;
  className?: string;
}

const SidebarRight: React.FC<SidebarRightProps> = ({ 
  resources = [], 
  tasks = [], 
  onAddResource, 
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onDeleteResource,
  kaggleCreds,
  className 
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'paper' | 'library' | 'dataset'>('all');
  
  // States
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  
  // Resource Search State
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('');
  const [minStars, setMinStars] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  // File Listing State
  const [datasetFiles, setDatasetFiles] = useState<Record<string, any[]>>({});
  const [loadingFiles, setLoadingFiles] = useState<string | null>(null);

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

  const handleResourceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    onAddResource({
        topic,
        language: language.trim() || undefined,
        minStars: minStars ? parseInt(minStars) : undefined,
        lastUpdated: lastUpdated.trim() || undefined
    });
    
    setIsAddingResource(false);
    setTopic('');
    setLanguage('');
    setMinStars('');
    setLastUpdated('');
  };

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    onAddTask(newTaskTitle.trim());
    setNewTaskTitle('');
    setIsAddingTask(false);
  };

  const toggleTaskStatus = (task: Task) => {
    const nextStatus: Task['status'] = 
      task.status === 'pending' ? 'in-progress' :
      task.status === 'in-progress' ? 'completed' : 'pending';
    
    onUpdateTask(task.id, { status: nextStatus });
  };

  const handleViewFiles = async (res: Resource) => {
    if (datasetFiles[res.id]) {
        // Toggle off if already loaded
        const next = { ...datasetFiles };
        delete next[res.id];
        setDatasetFiles(next);
        return;
    }

    if (!res.url || !res.url.includes('datasets/')) return;
    
    // Extract ref from URL or use a saved ref if we had one
    // Usually URL is https://www.kaggle.com/datasets/owner/slug
    const ref = res.url.split('datasets/')[1];
    if (!ref) return;

    setLoadingFiles(res.id);
    try {
        const files = await fetchDatasetFiles(ref, kaggleCreds);
        setDatasetFiles(prev => ({ ...prev, [res.id]: files }));
    } catch (e) {
        console.error("Failed to fetch files:", e);
    } finally {
        setLoadingFiles(null);
    }
  };

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const progress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  return (
    <div className={clsx("flex flex-col h-full bg-surface border-l border-surfaceHighlight animate-in fade-in slide-in-from-right-4 duration-500", className)}>
      
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-8">
        
        {/* Active Plan Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between group/header">
            <div className="flex items-center gap-2 text-textMuted">
                <CheckSquare size={16} className="text-accent" />
                <h3 className="text-xs font-bold uppercase tracking-widest">Active Plan</h3>
            </div>
            <button 
              onClick={() => setIsAddingTask(!isAddingTask)}
              className={clsx(
                "p-1 rounded-md transition-all",
                isAddingTask ? "bg-accent/10 text-accent rotate-45" : "text-textMuted hover:bg-surfaceHighlight/50 hover:text-text"
              )}
            >
                <Plus size={14} />
            </button>
          </div>

          {tasks.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold text-textMuted px-1">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 w-full bg-surfaceHighlight rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-accent transition-all duration-500 ease-out shadow-[0_0_8px_rgba(32,190,255,0.5)]" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
            </div>
          )}

          {isAddingTask && (
            <form onSubmit={handleTaskSubmit} className="animate-in zoom-in-95 duration-200">
              <input 
                type="text"
                placeholder="New objective..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                autoFocus
                className="w-full bg-black/20 border border-accent/30 rounded-lg px-3 py-2 text-sm text-text placeholder:text-textMuted/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all shadow-inner"
              />
            </form>
          )}

          <div className="space-y-1.5">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 px-4 border border-dashed border-surfaceHighlight rounded-xl bg-surfaceHighlight/5">
                <Clock size={20} className="text-textMuted/30 mb-2" />
                <p className="text-[11px] text-textMuted text-center leading-relaxed">Your agent team will populate this roadmap as research progresses.</p>
              </div>
            ) : (
              tasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surfaceHighlight/30 transition-all group border border-transparent hover:border-surfaceHighlight/50">
                  <button 
                    onClick={() => toggleTaskStatus(task)}
                    className={clsx(
                      "flex-shrink-0 transition-colors",
                      task.status === 'completed' ? "text-accent" : 
                      task.status === 'in-progress' ? "text-yellow-500" : "text-textMuted/40 hover:text-textMuted"
                    )}
                  >
                    {task.status === 'completed' ? <CheckCircle2 size={18} /> : 
                     task.status === 'in-progress' ? <Circle size={18} className="animate-pulse fill-yellow-500/10" /> : 
                     <Circle size={18} />}
                  </button>
                  
                  <div className={clsx(
                    "flex-1 text-sm transition-all truncate",
                    task.status === 'completed' ? "text-textMuted/50 line-through italic" : "text-text"
                  )}>
                    {task.title}
                  </div>

                  <button 
                    onClick={() => onDeleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-textMuted hover:text-red-400 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-surfaceHighlight to-transparent w-full"></div>

        {/* Resources Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between group/header">
            <div className="flex items-center gap-2 text-textMuted">
                <Layers size={16} className="text-purple-400" />
                <h3 className="text-xs font-bold uppercase tracking-widest">Resources</h3>
            </div>
            <button 
                onClick={() => setIsAddingResource(!isAddingResource)}
                className={clsx(
                  "p-1 rounded-md transition-all",
                  isAddingResource ? "bg-accent/10 text-accent" : "text-textMuted hover:bg-surfaceHighlight/50 hover:text-text"
                )} 
                title="Find New Resource"
            >
                {isAddingResource ? <X size={14} /> : <Plus size={14} />}
            </button>
          </div>

          {/* Search Form */}
          {isAddingResource && (
              <form onSubmit={handleResourceSubmit} className="bg-surfaceHighlight/20 p-4 rounded-xl border border-surfaceHighlight/50 space-y-4 animate-in slide-in-from-top-4 duration-300 shadow-xl backdrop-blur-sm">
                  <div className="relative">
                      <Search className="absolute left-3 top-3 text-textMuted" size={14} />
                      <input 
                          type="text" 
                          placeholder="What should I research?" 
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          autoFocus
                          className="w-full bg-black/40 border border-surfaceHighlight rounded-lg py-2.5 pl-10 pr-3 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
                      />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-textMuted ml-1">Language</label>
                          <div className="relative">
                              <Code className="absolute left-2.5 top-2.5 text-textMuted/50" size={12} />
                              <input 
                                  type="text" 
                                  placeholder="Python..."
                                  value={language}
                                  onChange={(e) => setLanguage(e.target.value)}
                                  className="w-full bg-black/20 border border-surfaceHighlight rounded-lg py-2 pl-8 pr-2 text-[11px] text-text focus:outline-none focus:border-accent"
                              />
                          </div>
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-textMuted ml-1">Min Stars</label>
                          <div className="relative">
                              <Star className="absolute left-2.5 top-2.5 text-textMuted/50" size={12} />
                              <input 
                                  type="number" 
                                  placeholder="100+"
                                  value={minStars}
                                  onChange={(e) => setMinStars(e.target.value)}
                                  className="w-full bg-black/20 border border-surfaceHighlight rounded-lg py-2 pl-8 pr-2 text-[11px] text-text focus:outline-none focus:border-accent"
                              />
                          </div>
                      </div>
                  </div>

                  <button 
                      type="submit" 
                      disabled={!topic.trim()}
                      className="w-full bg-accent hover:bg-accentHover text-white text-sm font-bold py-2.5 rounded-lg transition-all shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
                  >
                      Query Knowledge Base
                  </button>
              </form>
          )}

          {/* Filter Tabs */}
          {!isAddingResource && resources.length > 0 && (
            <div className="flex gap-2 pb-1 overflow-x-auto no-scrollbar">
                {['all', 'paper', 'library', 'dataset'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setActiveFilter(f as any)}
                        className={clsx(
                            "px-3 py-1.5 text-[10px] uppercase font-bold rounded-full border transition-all whitespace-nowrap tracking-wider",
                            activeFilter === f 
                                ? "bg-accent/10 border-accent/50 text-accent shadow-sm" 
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
               <div className="flex flex-col items-center justify-center py-10 px-4 border border-dashed border-surfaceHighlight rounded-xl bg-surfaceHighlight/5 text-center">
                 <Database size={24} className="text-textMuted/30 mb-3" />
                 <p className="text-xs text-textMuted">
                   {resources.length === 0 ? "No specialized resources have been indexed for this workspace yet." : "No matching resources found for this filter."}
                 </p>
               </div>
            ) : (
              filteredResources.map(res => (
                <div 
                    key={res.id} 
                    className="group relative block p-4 bg-surfaceHighlight/15 rounded-xl border border-surfaceHighlight/40 hover:border-accent/40 hover:bg-surfaceHighlight/25 transition-all cursor-default shadow-sm"
                >
                  <div className="flex items-start justify-between mb-2">
                    <a 
                      href={res.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 min-w-0 flex-1 hover:text-accent transition-colors"
                    >
                        <div className={clsx("p-2 rounded-lg border flex-shrink-0 shadow-sm", getBadgeColor(res.type))}>
                            {getResourceIcon(res.type)}
                        </div>
                        <div className="text-sm font-bold text-text truncate pr-2">{res.title}</div>
                        {res.url && <LinkIcon size={12} className="text-textMuted/50 group-hover:text-accent transition-colors" />}
                    </a>
                    
                    <button 
                      onClick={() => onDeleteResource(res.id)}
                      className="p-1.5 text-textMuted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-red-500/10"
                      title="Remove Resource"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  
                  {res.summary && (
                      <div className="text-[11px] text-textMuted/80 line-clamp-3 mb-3 leading-relaxed border-l-2 border-surfaceHighlight/50 pl-3">
                        {res.summary}
                      </div>
                  )}

                  {/* File List for Datasets */}
                  {datasetFiles[res.id] && (
                      <div className="mb-3 bg-black/40 rounded-lg border border-surfaceHighlight/50 p-2 space-y-1.5 animate-in fade-in zoom-in-95">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-accent uppercase px-1">
                              <Terminal size={10} />
                              <span>Dataset Files</span>
                          </div>
                          <div className="max-h-32 overflow-y-auto no-scrollbar space-y-1">
                              {datasetFiles[res.id].map((file, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-[10px] text-textMuted px-1 hover:text-text transition-colors">
                                      <span className="truncate pr-4">{file.name}</span>
                                      <span className="font-mono opacity-50 shrink-0">{file.size}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  <div className="flex flex-wrap gap-2 items-center">
                    <span className={clsx("text-[9px] px-2 py-0.5 rounded-full border uppercase tracking-widest font-black shadow-sm", getBadgeColor(res.type))}>
                      {res.type}
                    </span>
                    
                    {res.type === 'dataset' && (
                        <button 
                            onClick={(e) => { e.preventDefault(); handleViewFiles(res); }}
                            className={clsx(
                                "text-[9px] px-2 py-0.5 rounded-full border border-accent/30 text-accent font-bold uppercase transition-all flex items-center gap-1",
                                datasetFiles[res.id] ? "bg-accent text-white" : "hover:bg-accent/10"
                            )}
                        >
                            {loadingFiles === res.id ? <Loader2 size={8} className="animate-spin" /> : <Terminal size={8} />}
                            {datasetFiles[res.id] ? "Hide Files" : "View Files"}
                        </button>
                    )}
                    
                    {/* Metadata Badges */}
                    {res.metadata?.stars && (
                        <div className="flex items-center gap-1 text-[10px] text-textMuted bg-black/20 px-2 py-0.5 rounded-full border border-surfaceHighlight/50 shadow-inner">
                            <Star size={10} className="fill-yellow-500 text-yellow-500" />
                            <span className="font-mono">{res.metadata.stars}</span>
                        </div>
                    )}
                    {res.metadata?.language && (
                        <div className="flex items-center gap-1 text-[10px] text-textMuted bg-black/20 px-2 py-0.5 rounded-full border border-surfaceHighlight/50 shadow-inner">
                            <Code size={10} className="text-accent" />
                            <span>{res.metadata.language}</span>
                        </div>
                    )}
                    {res.metadata?.updated && (
                        <div className="flex items-center gap-1 text-[10px] text-textMuted bg-black/20 px-2 py-0.5 rounded-full border border-surfaceHighlight/50 shadow-inner">
                            <Calendar size={10} />
                            <span>{res.metadata.updated}</span>
                        </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SidebarRight;