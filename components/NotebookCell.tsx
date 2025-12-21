import React, { useState, useEffect } from 'react';
import { Play, Copy, Check, Terminal, Loader2, AlertCircle, RotateCcw, Maximize2 } from 'lucide-react';
import { usePython } from 'react-py';
import { clsx } from 'clsx';

interface NotebookCellProps {
  code: string;
  language: string;
}

export const NotebookCell: React.FC<NotebookCellProps> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  // Note: react-py renders plots to a div with id="pyplotfigure" automatically if matplotlib is used
  const { runPython, stdout, stderr, isLoading, isRunning } = usePython();

  const handleRun = () => {
    if (language.toLowerCase() === 'python') {
        runPython(code);
    } else {
        // Fallback for non-python blocks (visual only run)
        console.warn("Execution only supported for Python blocks.");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPython = language.toLowerCase() === 'python';

  return (
    <div className={clsx(
        "my-6 rounded-xl overflow-hidden border border-surfaceHighlight bg-[#0d0d0d] font-mono text-sm shadow-2xl group transition-all duration-300",
        isExpanded ? "fixed inset-10 z-[300] m-0" : "relative"
    )}>
      {/* Header / Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1a1a1a] border-b border-surfaceHighlight/50">
        <div className="flex items-center gap-3">
            <div className="flex gap-1.5 mr-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
            </div>
            <span className={clsx("text-[10px] font-black tracking-widest uppercase", isRunning ? "text-accent animate-pulse" : "text-textMuted/40")}>
                {isRunning ? 'Executing' : 'Python 3.10'}
            </span>
            {isLoading && isPython && (
                <div className="flex items-center gap-1.5 text-[10px] text-accent/70 ml-2">
                    <Loader2 size={10} className="animate-spin" />
                    <span>Booting WASM...</span>
                </div>
            )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:bg-white/5 rounded-lg text-textMuted hover:text-text transition-colors"
                title={isExpanded ? "Collapse" : "Expand"}
            >
                <Maximize2 size={14} />
            </button>
            <button 
                onClick={handleCopy} 
                className="p-1.5 hover:bg-white/5 rounded-lg text-textMuted hover:text-text transition-colors" 
                title="Copy Source"
            >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            </button>
            
            {isPython && (
                <button 
                    onClick={handleRun} 
                    disabled={isLoading || isRunning}
                    className="ml-2 flex items-center gap-2 px-4 py-1.5 bg-accent hover:bg-accentHover text-white rounded-lg transition-all text-xs font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent/20"
                >
                    {isRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
                    {isRunning ? 'Busy' : 'Run'}
                </button>
            )}
        </div>
      </div>

      {/* Code Area */}
      <div className={clsx(
          "p-5 overflow-x-auto bg-[#0d0d0d] custom-scrollbar",
          isExpanded ? "h-[calc(100%-120px)]" : "max-h-[400px]"
      )}>
        <pre className="text-gray-300 whitespace-pre-wrap leading-relaxed selection:bg-accent/30">{code}</pre>
      </div>

      {/* Output Area */}
      {(stdout || stderr) && (
          <div className={clsx(
              "border-t border-surfaceHighlight/50 p-3 animate-in fade-in slide-in-from-top-1",
              stderr ? "bg-red-900/10" : "bg-black/40"
          )}>
              {/* Stdout/Stderr */}
              <div className="mb-3">
                  <div className="flex items-center gap-2 text-xs text-textMuted mb-1.5">
                      {stderr ? <AlertCircle size={12} className="text-red-400" /> : <Terminal size={12} />}
                      <span className={clsx(stderr && "text-red-400 font-semibold")}>
                          {stderr ? 'Error' : 'Output'}
                      </span>
                  </div>
                  <pre className={clsx(
                      "whitespace-pre-wrap text-xs",
                      stderr ? "text-red-300/90" : "text-gray-400"
                  )}>
                      {stderr || stdout}
                  </pre>
              </div>

              {/* Graphical Figure Container */}
              {/* react-py/pyodide will look for this ID to render matplotlib plots */}
              <div id="pyplotfigure" className="mt-2 rounded-lg bg-white overflow-hidden empty:hidden" />
          </div>
      )}
    </div>
  );
};
