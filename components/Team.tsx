import React from 'react';
import { Users2, Mail, Link as LinkIcon, Shield, UserPlus, Share2, Download } from 'lucide-react';
import { clsx } from 'clsx';
import { Competition } from '../types';
import { exportWorkspace } from '../services/storageService';

interface TeamProps {
  competition?: Competition;
}

const Team: React.FC<TeamProps> = ({ competition }) => {
  const handleShare = async () => {
    try {
      const data = await exportWorkspace();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kletta-team-share-${competition?.id || 'workspace'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export for sharing:', err);
    }
  };

  if (!competition) {
    return (
      <div className="flex items-center justify-center h-full text-textMuted p-8">
        <div className="text-center">
           <Users2 size={48} className="mx-auto mb-4 opacity-50" />
           <p>No competition selected. Select one to manage your team.</p>
        </div>
      </div>
    );
  }

  const members = [
    { name: 'You', role: 'Owner', email: 'user@example.com', avatar: 'Y', color: 'bg-accent' },
    { name: 'Kletta Bot', role: 'AI Agent', email: 'system@kletta.ai', avatar: 'K', color: 'bg-emerald-500' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-background animate-fadeIn custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="border-b border-surfaceHighlight pb-6">
          <h1 className="text-2xl font-serif font-bold text-text mb-2 flex items-center gap-3">
             <Users2 className="text-accent" />
             Team Workspace
          </h1>
          <p className="text-textMuted text-sm">
            Collaborate with other data scientists on <span className="text-text font-medium">{competition.name}</span>.
          </p>
        </div>

        {/* Invite Section */}
        <div className="bg-surface rounded-2xl border border-surfaceHighlight p-6 space-y-6">
            <div className="space-y-1">
                <h3 className="text-sm font-bold text-text uppercase tracking-widest flex items-center gap-2">
                    <UserPlus size={16} className="text-accent" />
                    Invite Collaborator
                </h3>
                <p className="text-xs text-textMuted">Add teammates to this competition workspace.</p>
            </div>

            <div className="flex gap-3">
                <div className="flex-1 relative">
                    <Mail className="absolute left-3 top-2.5 text-textMuted" size={16} />
                    <input 
                        type="email" 
                        placeholder="colleague@example.com"
                        className="w-full bg-black/20 border border-surfaceHighlight rounded-xl py-2.5 pl-10 pr-4 text-sm text-text focus:outline-none focus:border-accent transition-all"
                    />
                </div>
                <button className="px-6 py-2.5 bg-accent hover:bg-accentHover text-white text-sm font-bold rounded-xl transition-all">
                    Send Invite
                </button>
            </div>

            <div className="pt-4 flex items-center gap-4">
                <div className="flex-1 h-px bg-surfaceHighlight"></div>
                <span className="text-[10px] text-textMuted uppercase font-bold tracking-tighter">or share link</span>
                <div className="flex-1 h-px bg-surfaceHighlight"></div>
            </div>

            <div className="flex gap-3 items-center bg-black/20 p-2 rounded-xl border border-surfaceHighlight/50">
                <div className="px-3 py-1.5 text-xs text-textMuted font-mono truncate flex-1">
                    https://kletta.ai/join/ws-{competition.id.slice(0, 8)}
                </div>
                <button className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-colors" title="Copy Link">
                    <LinkIcon size={16} />
                </button>
            </div>
        </div>

        {/* Members List */}
        <div className="space-y-4">
            <h3 className="text-xs font-bold text-textMuted uppercase tracking-widest px-1">Active Collaborators</h3>
            <div className="grid gap-3">
                {members.map((member, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-surface rounded-xl border border-surfaceHighlight group hover:border-surfaceHighlight/80 transition-all">
                        <div className="flex items-center gap-4">
                            <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-lg", member.color)}>
                                {member.avatar}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-text flex items-center gap-2">
                                    {member.name}
                                    {member.role === 'Owner' && <Shield size={12} className="text-accent" />}
                                </div>
                                <div className="text-[11px] text-textMuted">{member.email}</div>
                            </div>
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-textMuted bg-surfaceHighlight/30 px-2 py-1 rounded-md">
                            {member.role}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Share Snapshot */}
        <div className="bg-gradient-to-br from-surface to-surfaceHighlight/20 rounded-2xl border border-surfaceHighlight p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
                <h3 className="text-sm font-bold text-text uppercase tracking-widest flex items-center justify-center md:justify-start gap-2">
                    <Share2 size={16} className="text-purple-400" />
                    Share Workspace Snapshot
                </h3>
                <p className="text-xs text-textMuted">Export current messages, resources, and plan as a JSON bundle for direct import.</p>
            </div>
            <button 
                onClick={handleShare}
                className="flex items-center gap-2 px-6 py-3 bg-surfaceHighlight hover:bg-white/10 text-text text-xs font-bold uppercase rounded-xl transition-all border border-surfaceHighlight"
            >
                <Download size={16} />
                Export for Teammates
            </button>
        </div>

      </div>
    </div>
  );
};

export default Team;
