import React, { useState } from 'react';
import { LLMKeys, AIProvider } from '../types';
import { Bot, ArrowRight, Zap, Shield, Cpu, ChevronLeft, ExternalLink, Hexagon, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

interface LandingPageProps {
  onGetStarted: (keys: LLMKeys) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    
    setIsSubmitting(true);
    
    setTimeout(() => {
        const keys: LLMKeys = {
            provider: provider,
            gemini: provider === 'gemini' ? apiKey : '',
            openRouter: provider === 'openrouter' ? apiKey : '',
            openAI: provider === 'openai' ? apiKey : ''
        };
        onGetStarted(keys);
    }, 800);
  };

  const getProviderLink = (p: AIProvider) => {
    switch(p) {
      case 'gemini': return 'https://aistudio.google.com/app/apikey';
      case 'openai': return 'https://platform.openai.com/api-keys';
      case 'openrouter': return 'https://openrouter.ai/keys';
      default: return '#';
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30 selection:text-white overflow-hidden relative flex flex-col">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
         {/* Top Left Green Glow */}
         <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-emerald-500/10 rounded-full blur-[120px] opacity-40 mix-blend-screen animate-pulse-slow" />
         {/* Bottom Right Blue Glow */}
         <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-blue-600/10 rounded-full blur-[120px] opacity-30 mix-blend-screen" />
         {/* Grid Pattern Overlay */}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] opacity-20" />
      </div>

      {/* Navbar */}
      <nav className="relative z-50 w-full max-w-[1400px] mx-auto px-6 py-8 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowAuth(false)}>
            <div className="w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center font-bold font-serif text-lg tracking-tighter">K</div>
            <div className="font-sans font-semibold text-lg tracking-tight text-white/90">Kletta</div>
        </div>

        {/* Minimal Desktop Nav */}
        <div className="hidden md:flex items-center gap-10 text-sm font-medium text-white/60">
            <span className="hover:text-white transition-colors cursor-pointer">Agents</span>
            <span className="hover:text-white transition-colors cursor-pointer">Memory</span>
            <span className="hover:text-white transition-colors cursor-pointer">Network</span>
        </div>

        {/* Right Action */}
        <div>
            <button 
                onClick={() => setShowAuth(true)}
                className="group relative bg-[#1A1A1A] hover:bg-[#252525] border border-white/10 text-white text-sm font-medium px-6 py-2.5 rounded-full transition-all flex items-center gap-2 overflow-hidden"
            >
                <span className="relative z-10">Join AI</span>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 flex-1 flex flex-col md:flex-row items-center justify-center gap-16 lg:gap-32 py-12 lg:py-0">
        
        {/* Left Column: Text & Auth */}
        <div className="flex-1 max-w-xl w-full relative min-h-[450px] flex flex-col justify-center">
            
            {/* Hero Content (Slide Out) */}
            <div className={clsx(
                "transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] absolute w-full",
                showAuth ? "opacity-0 -translate-x-8 pointer-events-none scale-95" : "opacity-100 translate-x-0 scale-100"
            )}>
                <div className="inline-flex items-center gap-2 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide uppercase">
                        Letta Powered
                    </span>
                    <span className="text-white/40 text-xs">v2.0 Live</span>
                </div>

                <h1 className="text-5xl lg:text-7xl font-sans font-medium tracking-tight text-white mb-8 leading-[1.05] animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                    AI Agent Network <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-200 to-white">
                        Built With You
                    </span>
                </h1>
                
                <p className="text-lg text-white/50 max-w-md leading-relaxed mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 font-light">
                    Deploy autonomous Scouts, Researchers, and Coders. 
                    Powered by full-stack AI infrastructure and persistent memory.
                </p>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400 flex items-center gap-6">
                    <button 
                        onClick={() => setShowAuth(true)}
                        className="group bg-white hover:bg-emerald-50 text-black text-base font-semibold px-8 py-4 rounded-xl transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:-translate-y-0.5"
                    >
                        Activate AI
                        <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </button>
                    <div className="text-sm text-white/40 font-medium">
                        Launch Workspace
                    </div>
                </div>
            </div>

            {/* Auth Form (Slide In) */}
            <div className={clsx(
                "transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] w-full",
                showAuth ? "opacity-100 translate-x-0 relative blur-none" : "opacity-0 translate-x-12 absolute pointer-events-none blur-sm"
            )}>
                <div className="bg-[#111] border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
                     {/* Card Glow */}
                     <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] group-hover:bg-emerald-500/10 transition-colors" />

                     <div className="relative z-10">
                        <div className="flex items-center justify-between mb-8">
                            <button 
                                type="button" 
                                onClick={() => setShowAuth(false)}
                                className="text-xs font-bold uppercase tracking-wider text-white/40 hover:text-white flex items-center gap-2 transition-colors"
                            >
                                <ChevronLeft size={14} /> Return
                            </button>
                            <div className="flex bg-black/50 rounded-lg p-1 gap-1 border border-white/5">
                                <button type="button" onClick={() => setProvider('gemini')} className={clsx("px-3 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wide transition-all", provider === 'gemini' ? "bg-emerald-600 text-white shadow-sm" : "text-white/40 hover:text-white")} title="Google Gemini">Gemini</button>
                                <button type="button" onClick={() => setProvider('openrouter')} className={clsx("px-3 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wide transition-all", provider === 'openrouter' ? "bg-purple-600 text-white shadow-sm" : "text-white/40 hover:text-white")} title="OpenRouter">Router</button>
                                <button type="button" onClick={() => setProvider('openai')} className={clsx("px-3 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wide transition-all", provider === 'openai' ? "bg-blue-600 text-white shadow-sm" : "text-white/40 hover:text-white")} title="OpenAI">OpenAI</button>
                            </div>
                        </div>

                        <form onSubmit={handleStart} className="flex flex-col gap-6">
                            <div className="space-y-2">
                                <h3 className="text-2xl font-medium text-white tracking-tight">Access Node</h3>
                                <p className="text-sm text-white/50">
                                    Secure connection required. API keys are stored locally.
                                </p>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="relative group/input">
                                    <input 
                                        type="password" 
                                        placeholder={
                                            provider === 'gemini' ? "Gemini API Key (AIza...)" : 
                                            provider === 'openrouter' ? "OpenRouter Key (sk-or...)" : 
                                            "OpenAI Key (sk-...)"
                                        }
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-5 py-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-white/20"
                                        autoFocus={showAuth}
                                    />
                                    <div className="absolute right-4 top-4 text-white/20 group-focus-within/input:text-emerald-400 transition-colors">
                                        {provider === 'gemini' ? <Zap size={18} /> : provider === 'openrouter' ? <Cpu size={18} /> : <Shield size={18} />}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] text-white/30 uppercase tracking-wider font-bold">Encrypted Local Storage</span>
                                    <a 
                                        href={getProviderLink(provider)} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 font-medium"
                                    >
                                        Generate Key <ExternalLink size={10} />
                                    </a>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={!apiKey || isSubmitting}
                                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-4 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.2)] hover:shadow-[0_0_35px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <Sparkles size={16} className="animate-spin" /> Initializing...
                                    </span>
                                ) : (
                                    <>
                                        Initialize Workspace
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>
                     </div>
                </div>
            </div>
        </div>

        {/* Right Column: 3D Visual */}
        <div className="flex-1 hidden lg:flex items-center justify-center relative min-h-[600px] w-full animate-in fade-in slide-in-from-right-8 duration-1000 delay-200">
             {/* 3D Structure - Emerald Crystal */}
             <div className="relative w-[500px] h-[500px] perspective-[1000px] flex items-center justify-center">
                
                {/* Central Core */}
                <div className="absolute w-40 h-40 bg-gradient-to-br from-emerald-500 to-teal-800 rounded-3xl opacity-90 animate-float shadow-[0_0_100px_rgba(16,185,129,0.3)] flex items-center justify-center z-20 border border-white/20 backdrop-blur-sm">
                    <Bot size={80} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                </div>

                {/* Orbiting Satellites */}
                <div className="absolute inset-0 m-auto w-full h-full animate-spin-slow">
                    {/* Top */}
                    <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-20 h-20 bg-[#111] border border-emerald-500/30 rounded-2xl backdrop-blur-md flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform">
                         <Zap size={28} className="text-emerald-400" />
                    </div>
                    {/* Bottom Right */}
                    <div className="absolute bottom-[20%] right-[15%] w-16 h-16 bg-[#111] border border-blue-500/30 rounded-2xl backdrop-blur-md flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform">
                         <Cpu size={24} className="text-blue-400" />
                    </div>
                    {/* Bottom Left */}
                    <div className="absolute bottom-[20%] left-[15%] w-16 h-16 bg-[#111] border border-purple-500/30 rounded-2xl backdrop-blur-md flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform">
                         <Shield size={24} className="text-purple-400" />
                    </div>
                </div>
                
                {/* Orbital Rings */}
                <div className="absolute inset-[10%] border border-emerald-500/20 rounded-full animate-spin-slow-reverse opacity-40 skew-x-12"></div>
                <div className="absolute inset-[-5%] border border-white/5 rounded-full animate-spin-slow opacity-20 border-dashed"></div>
             </div>
        </div>

      </div>

      <style>{`
        .perspective-[1000px] { perspective: 1000px; }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotateX(10deg) rotateY(10deg); }
          50% { transform: translateY(-20px) rotateX(10deg) rotateY(15deg); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-slow-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.2; }
        }
        .animate-float { animation: float 8s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 30s linear infinite; }
        .animate-spin-slow-reverse { animation: spin-slow-reverse 40s linear infinite; }
        .animate-pulse-slow { animation: pulse-slow 5s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default LandingPage;