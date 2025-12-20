import React from 'react';
import { Competition, MemoryBlock } from '../types';
import { Database, Clock, Cpu, AlertCircle, Trophy, Target } from 'lucide-react';

interface DashboardProps {
  competition?: Competition; 
  memory: MemoryBlock[];
}

const MemoryViewer: React.FC<DashboardProps> = ({ competition, memory = [] }) => {
  if (!competition) {
    return (
      <div className="flex items-center justify-center h-full text-textMuted p-8">
        <div className="text-center">
           <Database size={48} className="mx-auto mb-4 opacity-50" />
           <p>No competition selected for memory view.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-background animate-fadeIn">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-serif font-bold text-text mb-2 flex items-center gap-3">
             <Database className="text-accent" />
             Memory
          </h1>
          <p className="text-textMuted">Live view of Kletta's persistent state for <span className="text-text font-medium">{competition.name}</span>.</p>
        </div>

        {/* Memory Blocks */}
        <div className="grid gap-6">
           {memory.length === 0 ? (
             <div className="p-8 border border-dashed border-surfaceHighlight rounded-xl text-center text-textMuted">
                <AlertCircle size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Memory is currently empty. Start chatting to populate competition context.</p>
             </div>
           ) : (
             memory.map((block, idx) => (
               <div key={idx} className="bg-surface rounded-xl border border-surfaceHighlight overflow-hidden">
                  <div className="bg-surfaceHighlight/30 px-4 py-2 border-b border-surfaceHighlight flex justify-between items-center">
                     <div className="font-mono text-xs font-semibold text-text uppercase tracking-wider">{block.label}</div>
                     <div className="flex items-center gap-1.5 text-[10px] text-textMuted">
                        <Clock size={10} />
                        {block.lastUpdated}
                     </div>
                  </div>
                  <div className="p-4 font-mono text-sm text-textMuted leading-relaxed">
                     {block.value}
                  </div>
               </div>
             ))
           )}
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-3 gap-4">
           <div className="bg-surface p-4 rounded-xl border border-surfaceHighlight flex items-center gap-4">
              <div className="p-2 bg-blue-900/20 text-blue-400 rounded-lg">
                 <Trophy size={20} />
              </div>
              <div>
                 <div className="text-xl font-bold text-text">{competition.tags.find(t => t.includes('Rank')) || '-'}</div>
                 <div className="text-xs text-textMuted">Current Rank</div>
              </div>
           </div>
           <div className="bg-surface p-4 rounded-xl border border-surfaceHighlight flex items-center gap-4">
              <div className="p-2 bg-purple-900/20 text-purple-400 rounded-lg">
                 <Database size={20} />
              </div>
              <div>
                 <div className="text-xl font-bold text-text">{memory.length}</div>
                 <div className="text-xs text-textMuted">Context Blocks</div>
              </div>
           </div>
           <div className="bg-surface p-4 rounded-xl border border-surfaceHighlight flex items-center gap-4">
              <div className="p-2 bg-green-900/20 text-green-400 rounded-lg">
                 <Target size={20} />
              </div>
              <div>
                 <div className="text-xl font-bold text-text">Active</div>
                 <div className="text-xs text-textMuted">Strategy Status</div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default MemoryViewer;