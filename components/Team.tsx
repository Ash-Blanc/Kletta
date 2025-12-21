import React, { useState } from 'react';
import { Users2, Mail, Link as LinkIcon, Shield, UserPlus, Share2, Download, Check, Loader2, Globe } from 'lucide-react';
import { clsx } from 'clsx';
import { Competition } from '../types';
import { exportWorkspace } from '../services/storageService';

interface TeamProps {
  competition?: Competition;
}

const Team: React.FC<TeamProps> = ({ competition }) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [copyStatus, setCopyStatus] = useState(false);

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

  const handleSendInvite = () => {
    if (!inviteEmail.trim()) return;
    setInviteStatus('sending');
    setTimeout(() => {
        setInviteStatus('sent');
        setInviteEmail('');
        setTimeout(() => setInviteStatus('idle'), 3000);
    }, 1500);
  };

  const handleCopyLink = () => {
    const link = `https://kletta.ai/join/ws-${competition?.id.slice(0, 8)}`;
    navigator.clipboard.writeText(link);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
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
    { name: 'You', role: 'Owner', email: 'user@example.com', avatar: 'Y', color: 'bg-accent', status: 'online', lastActive: 'Active now' },
    { name: 'Kletta Bot', role: 'AI Agent', email: 'system@kletta.ai', avatar: 'K', color: 'bg-emerald-500', status: 'online', lastActive: 'Active now' },
    { name: 'Research Subagent', role: 'Worker', email: 'worker-1@kletta.ai', avatar: 'R', color: 'bg-purple-500', status: 'idle', lastActive: '5m ago' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-background animate-fadeIn custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-surfaceHighlight pb-8">
          <div>
            <div className="flex items-center gap-3 text-accent mb-2">
                <Users2 size={28} />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Network Node</span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-text mb-2">
               Team Workspace
            </h1>
            <p className="text-textMuted text-sm max-w-md">
              Managing secure collaboration for <span className="text-text font-semibold">{competition.name}</span>.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-surfaceHighlight/20 rounded-full border border-surfaceHighlight/50">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-bold text-textMuted uppercase tracking-widest">Workspace Encrypted</span>
          </div>
        </div>

        {/* Invite Section */}
        <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-surface rounded-3xl border border-surfaceHighlight p-8 space-y-6 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-accent/10 transition-colors" />
                
                <div className="space-y-1 relative z-10">
                    <h3 className="text-sm font-black text-text uppercase tracking-[0.2em] flex items-center gap-2">
                        <UserPlus size={16} className="text-accent" />
                        Invite
                    </h3>
                    <p className="text-xs text-textMuted leading-relaxed">Authorized access only. Invitations expire in 24h.</p>
                </div>

                <div className="space-y-4 relative z-10">
                    <div className="relative">
                        <Mail className="absolute left-4 top-3.5 text-textMuted" size={18} />
                        <input 
                            type="email" 
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="colleague@example.com"
                            className="w-full bg-black/40 border border-surfaceHighlight rounded-2xl py-3.5 pl-12 pr-4 text-sm text-text focus:outline-none focus:border-accent transition-all placeholder:text-white/10"
                        />
                    </div>
                    <button 
                        onClick={handleSendInvite}
                        disabled={inviteStatus !== 'idle' || !inviteEmail}
                        className={clsx(
                            "w-full py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg",
                            inviteStatus === 'sent' ? "bg-emerald-500 text-white" : "bg-accent hover:bg-accentHover text-white shadow-accent/20"
                        )}
                    >
                        {inviteStatus === 'sending' ? <Loader2 size={18} className="animate-spin" /> : 
                         inviteStatus === 'sent' ? <Check size={18} /> : 'Send Protocol Invite'}
                    </button>
                </div>
            </div>

            <div className="bg-surface rounded-3xl border border-surfaceHighlight p-8 space-y-6 shadow-xl flex flex-col justify-between group">
                <div className="space-y-1">
                    <h3 className="text-sm font-black text-text uppercase tracking-[0.2em] flex items-center gap-2">
                        <LinkIcon size={16} className="text-blue-400" />
                        Access Link
                    </h3>
                    <p className="text-xs text-textMuted leading-relaxed">Direct tunnel to this workspace environment.</p>
                </div>

                <div className="space-y-4">
                    <div className="flex gap-2 items-center bg-black/40 p-3 rounded-2xl border border-surfaceHighlight/50">
                        <div className="px-2 text-xs text-textMuted font-mono truncate flex-1 opacity-50">
                            kletta.ai/join/ws-{competition.id.slice(0, 8)}
                        </div>
                        <button 
                            onClick={handleCopyLink}
                            className={clsx(
                                "p-2 rounded-xl transition-all",
                                copyStatus ? "bg-emerald-500/20 text-emerald-400" : "text-accent hover:bg-accent/10"
                            )}
                        >
                            {copyStatus ? <Check size={16} /> : <LinkIcon size={16} />}
                        </button>
                    </div>
                    <p className="text-[10px] text-textMuted/50 text-center uppercase font-bold tracking-tighter italic">Warning: Link provides full read/write access.</p>
                </div>
            </div>
        </div>

        {/* Members List */}
        <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-black text-textMuted uppercase tracking-[0.3em]">Active Intelligence Units</h3>
                <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">{members.length} Entities</span>
            </div>
            
            <div className="grid gap-4">
                {members.map((member, i) => (
                    <div key={i} className="flex items-center justify-between p-5 bg-surface rounded-3xl border border-surfaceHighlight group hover:border-accent/20 transition-all shadow-sm hover:shadow-xl hover:-translate-y-0.5">
                        <div className="flex items-center gap-5">
                            <div className="relative">
                                <div className={clsx("w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg", member.color)}>
                                    {member.avatar}
                                </div>
                                <div className={clsx(
                                    "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-surface",
                                    member.status === 'online' ? "bg-emerald-500" : "bg-yellow-500"
                                )} />
                            </div>
                            <div>
                                <div className="text-base font-bold text-text flex items-center gap-2">
                                    {member.name}
                                    {member.role === 'Owner' && <Shield size={14} className="text-accent" />}
                                    {member.role === 'AI Agent' && <Globe size={14} className="text-emerald-400" />}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-[11px] text-textMuted font-medium">{member.email}</span>
                                    <span className="w-1 h-1 rounded-full bg-surfaceHighlight" />
                                    <span className="text-[10px] text-textMuted uppercase font-black tracking-widest opacity-40">{member.lastActive}</span>
                                </div>
                            </div>
                        </div>
                        <div className="hidden sm:block text-[10px] font-black uppercase tracking-[0.2em] text-textMuted bg-surfaceHighlight/20 px-4 py-2 rounded-xl border border-surfaceHighlight/50">
                            {member.role}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Share Snapshot */}
        <div className="bg-gradient-to-br from-surface to-surfaceHighlight/30 rounded-[40px] border border-surfaceHighlight p-10 flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(32,190,255,0.05),transparent)] pointer-events-none" />
            
            <div className="space-y-3 text-center lg:text-left relative z-10">
                <div className="flex items-center justify-center lg:justify-start gap-2 text-purple-400">
                    <Share2 size={20} />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Snapshot Sync</span>
                </div>
                <h3 className="text-xl font-bold text-text tracking-tight">
                    Cold Storage Export
                </h3>
                <p className="text-sm text-textMuted max-w-sm leading-relaxed">
                    Generate an offline JSON bundle containing all messages, resources, and persistent state for manual transfer.
                </p>
            </div>
            
            <button 
                onClick={handleShare}
                className="flex items-center gap-3 px-10 py-5 bg-white/5 hover:bg-white/10 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-all border border-white/10 hover:border-purple-500/50 shadow-2xl relative z-10 group"
            >
                <Download size={18} className="transition-transform group-hover:-translate-y-1" />
                Export Archive
            </button>
        </div>

      </div>
    </div>
  );
};

export default Team;
