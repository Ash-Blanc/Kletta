import React, { useState } from 'react';
import { LLMKeys, AIProvider } from '../types';
import { 
    ArrowRight, Zap, Shield, Cpu, ChevronLeft, 
    ExternalLink, Hexagon, Sparkles, Code, Globe, 
    Database, Terminal, Layout, Search, Layers 
} from 'lucide-react';
import { KlettaIcon } from './KlettaIcon';
import { clsx } from 'clsx';
import { SignInButton, SignUpButton } from "@clerk/clerk-react";

interface LandingPageProps {
  onGetStarted: (keys: LLMKeys) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const features = [
    {
        title: "Autonomous Swarm",
        description: "Specialized agents that collaborate, research, and code in real-time.",
        icon: <Sparkles className="text-emerald-400" size={20} />
    },
    {
        title: "Native Execution",
        description: "Run Python cells directly in your browser with full library support.",
        icon: <Terminal className="text-blue-400" size={20} />
    }
  ];

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-emerald-500/30 selection:text-white overflow-hidden relative flex flex-col">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-emerald-600/10 rounded-full blur-[140px] opacity-50 mix-blend-screen animate-pulse-slow" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-blue-600/10 rounded-full blur-[140px] opacity-40 mix-blend-screen" />
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-30" />
      </div>

      {/* Navbar */}
      <nav className="relative z-50 w-full max-w-[1400px] mx-auto px-8 py-10 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-1000">
        <div className="flex items-center gap-4 cursor-pointer group">
            <div className="w-10 h-10 bg-white text-black rounded-2xl flex items-center justify-center font-black font-serif text-xl tracking-tighter group-hover:rotate-12 transition-transform duration-500 shadow-[0_0_20px_rgba(255,255,255,0.2)]">K</div>
            <div className="font-sans font-bold text-xl tracking-tight text-white/90">Kletta</div>
        </div>

        <div className="hidden md:flex items-center gap-12 text-[13px] uppercase font-bold tracking-widest text-white/40">
            <span className="hover:text-emerald-400 transition-colors cursor-pointer">Protocol</span>
            <span className="hover:text-emerald-400 transition-colors cursor-pointer">Intelligence</span>
            <span className="hover:text-emerald-400 transition-colors cursor-pointer">Archive</span>
        </div>

        <SignInButton mode="modal">
            <button className="group relative px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all overflow-hidden border border-white/10 bg-white/5 hover:border-emerald-500/50">
                <span className="relative z-10">Access Node</span>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </button>
        </SignInButton>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-8 flex-1 flex flex-col lg:flex-row items-center justify-center gap-20 py-12">
        
        <div className="flex-1 max-w-2xl w-full relative min-h-[500px] flex flex-col justify-center text-center lg:text-left items-center lg:items-start">
            
            {/* Hero Content */}
            <div className="transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] w-full">
                <div className="inline-flex items-center gap-3 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[11px] font-black tracking-[0.2em] uppercase text-emerald-400">
                        System Online // v2.5
                    </span>
                </div>

                <h1 className="text-6xl lg:text-8xl font-sans font-bold tracking-tighter text-white mb-10 leading-[0.9] animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                    Kaggle <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-600 animate-gradient-x">
                        Redefined.
                    </span>
                </h1>
                
                <p className="text-xl text-white/40 max-w-lg leading-relaxed mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-400 font-medium">
                    The autonomous workspace for data scientists. 
                    Deploy specialized agent swarms to analyze, research, and dominate competitions.
                </p>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500 flex flex-col sm:flex-row items-center gap-6">
                    <SignUpButton mode="modal">
                        <button className="group bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-black uppercase tracking-widest px-10 py-5 rounded-2xl transition-all flex items-center gap-3 shadow-[0_20px_40px_-10px_rgba(16,185,129,0.4)] hover:shadow-[0_25px_50px_-12px_rgba(16,185,129,0.6)] hover:-translate-y-1 active:translate-y-0">
                            Activate Intelligence
                            <ArrowRight size={18} strokeWidth={3} className="transition-transform group-hover:translate-x-1" />
                        </button>
                    </SignUpButton>
                    <SignInButton mode="modal">
                        <button className="text-white/40 hover:text-white text-xs font-black uppercase tracking-widest transition-colors">
                            Existing Protocol Login
                        </button>
                    </SignInButton>
                </div>

                <div className="mt-20 grid grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-700">
                    {features.map((f, i) => (
                        <div key={i} className="flex flex-col gap-4 items-center lg:items-start text-center lg:text-left">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                                {f.icon}
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-sm font-bold text-white/90 uppercase tracking-wider">{f.title}</h4>
                                <p className="text-xs text-white/30 leading-relaxed font-medium">{f.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Right Column: Dynamic Core */}
        <div className="flex-1 hidden lg:flex items-center justify-center relative min-h-[600px] w-full">
             
             {/* Agents Ticker */}
             <div className="absolute top-0 right-0 left-0 flex justify-center gap-10 pointer-events-none overflow-hidden py-12 opacity-20">
                <div className="flex gap-12 animate-marquee whitespace-nowrap">
                    {['SCOUT', 'RESEARCHER', 'CODER', 'STRATEGIST', 'ANALYST', 'ENSEMBLE'].map((tag) => (
                        <span key={tag} className="text-[10px] font-black tracking-[0.4em] text-white uppercase">{tag}</span>
                    ))}
                </div>
                <div className="flex gap-12 animate-marquee whitespace-nowrap" aria-hidden="true">
                    {['SCOUT', 'RESEARCHER', 'CODER', 'STRATEGIST', 'ANALYST', 'ENSEMBLE'].map((tag) => (
                        <span key={tag} className="text-[10px] font-black tracking-[0.4em] text-white uppercase">{tag}</span>
                    ))}
                </div>
             </div>

             <div className="relative flex items-center justify-center scale-110">
                <div className="absolute w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] animate-pulse-slow" />
                <div className="relative z-20 w-64 h-64 bg-gradient-to-br from-white to-emerald-200 rounded-[60px] rotate-[15deg] animate-float shadow-[0_50px_100px_-20px_rgba(16,185,129,0.5)] flex items-center justify-center border-4 border-white/20 backdrop-blur-3xl">
                    <KlettaIcon size={100} className="text-black -rotate-[15deg] drop-shadow-2xl" />
                </div>
                
                {/* Visual Elements */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
             </div>
        </div>

      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(15deg) scale(1); }
          50% { transform: translateY(-30px) rotate(18deg) scale(1.02); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.1); }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-float { animation: float 10s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
        .animate-marquee { animation: marquee 30s linear infinite; }
        .animate-gradient-x { background-size: 200% 200%; animation: gradient-x 5s ease infinite; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default LandingPage;