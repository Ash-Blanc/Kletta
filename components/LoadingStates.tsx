import React from 'react';
import { Loader2 } from 'lucide-react';

interface FullScreenLoaderProps {
  message?: string;
  subtext?: string;
}

export const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({ message = 'Loading Kletta Workspace…', subtext }) => (
  <div className="flex h-screen w-full items-center justify-center bg-background text-text">
    <div className="flex flex-col items-center gap-4">
      <Loader2 size={32} className="animate-spin text-accent" />
      <span className="text-sm font-medium text-textMuted">{message}</span>
      {subtext && <span className="text-xs text-textMuted/70 text-center max-w-sm">{subtext}</span>}
    </div>
  </div>
);

interface OverlayLoaderProps {
  title?: string;
  message?: string;
}

export const OverlayLoader: React.FC<OverlayLoaderProps> = ({ title = 'AI Working', message = 'Consulting knowledge base…' }) => (
  <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center">
    <div className="bg-surface p-6 rounded-xl border border-surfaceHighlight shadow-2xl flex flex-col items-center gap-4 w-[min(90vw,320px)]">
      <Loader2 size={36} className="animate-spin text-accent" />
      <div className="text-center space-y-1">
        <h3 className="text-lg font-semibold text-text">{title}</h3>
        <p className="text-sm text-textMuted leading-relaxed">{message}</p>
      </div>
    </div>
  </div>
);