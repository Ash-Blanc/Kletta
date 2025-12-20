import React, { useState, useEffect } from 'react';
import { KaggleCredentials, LLMKeys, AIProvider } from '../types';
import { Settings as SettingsIcon, Key, ExternalLink, Check, LogOut, Shield, AlertCircle, Zap, Cpu, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';

interface SettingsProps {
  kaggleCreds: KaggleCredentials | null;
  onConnectKaggle: (creds: KaggleCredentials | null) => void;
  llmKeys: LLMKeys;
  onUpdateLLMKeys: (keys: LLMKeys) => void;
  onResetWorkspace?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ kaggleCreds, onConnectKaggle, llmKeys, onUpdateLLMKeys, onResetWorkspace }) => {
  // Kaggle State
  const [usernameInput, setUsernameInput] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [keyError, setKeyError] = useState('');
  const [isKaggleSaved, setIsKaggleSaved] = useState(false);

  // LLM State
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [openAIKey, setOpenAIKey] = useState('');
  const [isLLMSaved, setIsLLMSaved] = useState(false);

  useEffect(() => {
    if (kaggleCreds) {
        setUsernameInput(kaggleCreds.username);
        setKeyInput(kaggleCreds.key);
    } else {
        setUsernameInput('');
        setKeyInput('');
    }
  }, [kaggleCreds]);

  useEffect(() => {
    setProvider(llmKeys.provider || 'gemini');
    setGeminiKey(llmKeys.gemini || '');
    setOpenRouterKey(llmKeys.openRouter || '');
    setOpenAIKey(llmKeys.openAI || '');
  }, [llmKeys]);

  // --- Kaggle Handlers ---
  const validateKaggle = () => {
      let isValid = true;
      if (!usernameInput.trim()) { setUsernameError('Username required'); isValid = false; }
      else if (/\s/.test(usernameInput)) { setUsernameError('No spaces allowed'); isValid = false; }
      else setUsernameError('');

      if (!keyInput.trim()) { setKeyError('Key required'); isValid = false; }
      else if (keyInput.length !== 32 || !/^[a-f0-9]+$/.test(keyInput)) { setKeyError('Invalid format (32 hex chars)'); isValid = false; }
      else setKeyError('');
      
      return isValid;
  };

  const handleSaveKaggle = () => {
      if (validateKaggle()) {
          onConnectKaggle({ username: usernameInput, key: keyInput });
          setIsKaggleSaved(true);
          setTimeout(() => setIsKaggleSaved(false), 3000);
      }
  };

  const handleDisconnectKaggle = () => {
      if (window.confirm("Disconnect Kaggle account?")) {
          onConnectKaggle(null);
          setUsernameInput('');
          setKeyInput('');
      }
  };

  // --- LLM Handlers ---
  const handleSaveLLM = () => {
    onUpdateLLMKeys({
        provider: provider,
        gemini: geminiKey,
        openRouter: openRouterKey,
        openAI: openAIKey
    });
    setIsLLMSaved(true);
    setTimeout(() => setIsLLMSaved(false), 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-background animate-fadeIn custom-scrollbar">
      <div className="max-w-3xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="border-b border-surfaceHighlight pb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold text-text mb-2 flex items-center gap-3">
                <SettingsIcon className="text-textMuted" />
                Settings
            </h1>
            <p className="text-textMuted">Configure your workspace connections and AI providers.</p>
          </div>
          {onResetWorkspace && (
              <button 
                onClick={onResetWorkspace}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-red-500/10 transition-colors"
                title="Sign out and clear all local data"
              >
                  <LogOut size={14} /> Reset Workspace
              </button>
          )}
        </div>

        {/* --- AI Providers Section --- */}
        <div className="space-y-4">
             <h2 className="text-lg font-semibold text-text flex items-center gap-2">
                <Cpu size={20} className="text-accent" />
                AI Model Providers
             </h2>
             <p className="text-sm text-textMuted">
                 Configure your API keys. Select the <strong>Active</strong> provider to be used as the primary intelligence engine. Kletta will fallback to others if the primary fails.
             </p>

             <div className="bg-surface rounded-xl border border-surfaceHighlight overflow-hidden">
                <div className="p-6 space-y-6">
                    
                    {/* Gemini */}
                    <div className={clsx("p-4 rounded-lg border transition-all", provider === 'gemini' ? "bg-surfaceHighlight/20 border-accent" : "border-transparent")}>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-medium text-textMuted uppercase tracking-wide flex items-center gap-2 cursor-pointer" onClick={() => setProvider('gemini')}>
                                <div className={clsx("w-3 h-3 rounded-full border flex items-center justify-center", provider === 'gemini' ? "border-accent" : "border-textMuted")}>
                                    {provider === 'gemini' && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
                                </div>
                                <span>Google Gemini</span>
                            </label>
                            {provider === 'gemini' && <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded">Active</span>}
                        </div>
                        <div className="relative">
                            <input 
                                type="password" 
                                value={geminiKey}
                                onChange={(e) => setGeminiKey(e.target.value)}
                                placeholder="AIzaSy..."
                                className="w-full bg-black/20 border border-surfaceHighlight rounded-lg px-4 py-2.5 text-text text-sm focus:outline-none focus:border-accent transition-all"
                            />
                            <div className="absolute right-3 top-2.5 text-textMuted/30"><Zap size={14} /></div>
                        </div>
                    </div>

                    {/* OpenRouter */}
                    <div className={clsx("p-4 rounded-lg border transition-all", provider === 'openrouter' ? "bg-purple-900/10 border-purple-500" : "border-transparent")}>
                         <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-medium text-textMuted uppercase tracking-wide flex items-center gap-2 cursor-pointer" onClick={() => setProvider('openrouter')}>
                                <div className={clsx("w-3 h-3 rounded-full border flex items-center justify-center", provider === 'openrouter' ? "border-purple-500" : "border-textMuted")}>
                                    {provider === 'openrouter' && <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                                </div>
                                <span>OpenRouter</span>
                            </label>
                            {provider === 'openrouter' && <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">Active</span>}
                        </div>
                        <div className="relative">
                            <input 
                                type="password" 
                                value={openRouterKey}
                                onChange={(e) => setOpenRouterKey(e.target.value)}
                                placeholder="sk-or-v1-..."
                                className="w-full bg-black/20 border border-surfaceHighlight rounded-lg px-4 py-2.5 text-text text-sm focus:outline-none focus:border-purple-500 transition-all"
                            />
                            <div className="absolute right-3 top-2.5 text-textMuted/30"><ExternalLink size={14} /></div>
                        </div>
                        <p className="text-[10px] text-textMuted mt-1 pl-1">Recommended for Claude 3.5 Sonnet or GPT-4o access.</p>
                    </div>

                    {/* OpenAI */}
                    <div className={clsx("p-4 rounded-lg border transition-all", provider === 'openai' ? "bg-green-900/10 border-green-500" : "border-transparent")}>
                         <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-medium text-textMuted uppercase tracking-wide flex items-center gap-2 cursor-pointer" onClick={() => setProvider('openai')}>
                                <div className={clsx("w-3 h-3 rounded-full border flex items-center justify-center", provider === 'openai' ? "border-green-500" : "border-textMuted")}>
                                    {provider === 'openai' && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                                </div>
                                <span>OpenAI</span>
                            </label>
                            {provider === 'openai' && <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Active</span>}
                        </div>
                        <div className="relative">
                            <input 
                                type="password" 
                                value={openAIKey}
                                onChange={(e) => setOpenAIKey(e.target.value)}
                                placeholder="sk-..."
                                className="w-full bg-black/20 border border-surfaceHighlight rounded-lg px-4 py-2.5 text-text text-sm focus:outline-none focus:border-green-500 transition-all"
                            />
                            <div className="absolute right-3 top-2.5 text-textMuted/30"><Shield size={14} /></div>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-surfaceHighlight bg-surfaceHighlight/5 flex justify-end">
                    <button 
                        onClick={handleSaveLLM}
                        className={clsx(
                            "px-6 py-2 text-sm font-medium rounded-lg shadow-lg flex items-center gap-2 transition-all",
                            isLLMSaved 
                                ? "bg-green-500 text-white" 
                                : "bg-surfaceHighlight text-text hover:bg-surfaceHighlight/80"
                        )}
                    >
                        {isLLMSaved ? <><Check size={16} /> Saved</> : "Update Keys"}
                    </button>
                </div>
             </div>
        </div>

        {/* --- Kaggle Section --- */}
        <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text flex items-center gap-2">
                <Key size={20} className={clsx(kaggleCreds ? "text-green-400" : "text-blue-400")} />
                Kaggle API Connection
            </h2>
            <div className="bg-surface rounded-xl border border-surfaceHighlight shadow-sm overflow-hidden">
                <div className="p-6 space-y-6">
                    <p className="text-sm text-textMuted leading-relaxed max-w-xl">
                        Required for automated dataset downloads and submissions.
                    </p>

                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-textMuted mb-1.5 uppercase tracking-wide">Username</label>
                                <input 
                                    type="text" 
                                    value={usernameInput}
                                    onChange={(e) => setUsernameInput(e.target.value)}
                                    placeholder="e.g. johndoe"
                                    className={clsx(
                                        "w-full bg-black/20 border rounded-lg px-4 py-2.5 text-text text-sm focus:outline-none focus:ring-1 transition-all",
                                        usernameError ? "border-red-500/50" : "border-surfaceHighlight focus:border-accent"
                                    )}
                                />
                                {usernameError && <span className="text-xs text-red-400 mt-1 block">{usernameError}</span>}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-textMuted mb-1.5 uppercase tracking-wide">API Key</label>
                                <div className="relative">
                                    <input 
                                        type="password" 
                                        value={keyInput}
                                        onChange={(e) => setKeyInput(e.target.value)}
                                        placeholder="32-char hex string"
                                        className={clsx(
                                            "w-full bg-black/20 border rounded-lg px-4 py-2.5 text-text text-sm focus:outline-none focus:ring-1 transition-all",
                                            keyError ? "border-red-500/50" : "border-surfaceHighlight focus:border-accent"
                                        )}
                                    />
                                    <Shield size={14} className="absolute right-3 top-3 text-textMuted/30" />
                                </div>
                                {keyError && <span className="text-xs text-red-400 mt-1 block">{keyError}</span>}
                            </div>
                        </div>

                        <div className="bg-surfaceHighlight/20 p-4 rounded-lg border border-surfaceHighlight/50 text-sm text-textMuted space-y-3">
                            <h4 className="text-text font-medium text-xs uppercase tracking-wide">Credentials Guide</h4>
                            <ol className="list-decimal list-inside space-y-2 ml-1 text-xs text-textMuted/80">
                                <li>Go to <a href="https://www.kaggle.com/settings/account" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Kaggle Account Settings</a></li>
                                <li>Click <strong>Create New Token</strong> under API.</li>
                                <li>Open <code>kaggle.json</code> and copy details.</li>
                            </ol>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-surfaceHighlight bg-surfaceHighlight/5 flex justify-between items-center">
                    {kaggleCreds ? (
                        <button onClick={handleDisconnectKaggle} className="text-red-400 hover:text-red-300 text-sm font-medium flex items-center gap-2">
                            <LogOut size={16} /> Disconnect
                        </button>
                    ) : <div />}
                    
                    <button 
                        onClick={handleSaveKaggle}
                        disabled={!usernameInput || !keyInput}
                        className={clsx(
                            "px-6 py-2 text-sm font-medium rounded-lg shadow-lg flex items-center gap-2 transition-all",
                            isKaggleSaved 
                                ? "bg-green-500 text-white" 
                                : "bg-accent hover:bg-accentHover text-white shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                    >
                        {isKaggleSaved ? <><Check size={16} /> Connected</> : "Save Credentials"}
                    </button>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;