import React, { useState, useEffect } from 'react';
import { Play, Copy, Check, Terminal, Loader2, AlertCircle } from 'lucide-react';
import { usePython } from 'react-py';
import { clsx } from 'clsx';

interface NotebookCellProps {
  code: string;
  language: string;
}

export const NotebookCell: React.FC<NotebookCellProps> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);
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
    <div className="my-4 rounded-lg overflow-hidden border border-surfaceHighlight bg-[#1e1e1e] font-mono text-sm shadow-md group">
      {/* Header / Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-surfaceHighlight/50">
        <div className="flex items-center gap-2">
            <span className={clsx("text-xs font-bold", isRunning ? "text-accent animate-pulse" : "text-textMuted/50")}>
                {isRunning ? 'In [*]:' : 'In [ ]:'}
            </span>
            <span className="text-[10px] text-textMuted uppercase tracking-wider bg-white/5 px-1.5 py-0.5 rounded">
                {language || 'text'}
            </span>
            {isLoading && isPython && (
                <div className="flex items-center gap-1.5 text-[10px] text-accent/70 ml-2">
                    <Loader2 size={10} className="animate-spin" />
                    <span>Loading Runtime...</span>
                </div>
            )}
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
                onClick={handleCopy} 
                className="p-1.5 hover:bg-white/10 rounded text-textMuted hover:text-text transition-colors" 
                title="Copy Code"
            >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            </button>
            
            {isPython && (
                <button 
                    onClick={handleRun} 
                    disabled={isLoading || isRunning}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 hover:text-green-300 rounded transition-all text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
                    {isRunning ? 'Running...' : 'Run'}
                </button>
            )}
        </div>
      </div>

      {/* Code Area */}
      <div className="p-4 overflow-x-auto bg-[#1e1e1e]">
        <pre className="text-gray-300 whitespace-pre-wrap">{code}</pre>
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
