import React, { useState } from 'react';
import { AgentType, LLMKeys, AIProvider, AgentConfig } from '../types';
import { Bot, Users, Settings2, Save, X, ChevronRight, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { DEFAULT_AGENT_PROMPTS } from '../services/agentPrompts';

const AGENT_DETAILS: Record<string, { description: string; capabilities: string[] }> = {
  [AgentType.Scout]: {
    description: 'Competition analyst with photographic memory for rules and metrics.',
    capabilities: ['Parse Rules', 'Metric Analysis', 'Dataset Overview']
  },
  [AgentType.Researcher]: {
    description: 'Academic expert scouring arXiv and GitHub for SOTA techniques.',
    capabilities: ['Paper Search', 'Code Discovery', 'SOTA Analysis']
  },
  [AgentType.Strategist]: {
    description: 'Project manager prioritizing tasks and managing timeline.',
    capabilities: ['Roadmap Creation', 'Resource Allocation', 'Risk Management']
  },
  [AgentType.Coder]: {
    description: 'Senior ML Engineer writing robust, production-ready pipelines.',
    capabilities: ['PyTorch/TF', 'Pipeline generation', 'Debugging']
  },
  [AgentType.Experimenter]: {
    description: 'MLOps specialist running training and tracking experiments.',
    capabilities: ['Run Training', 'Track CV/LB', 'Hyperparam Tuning']
  },
  [AgentType.Analyst]: {
    description: 'Data Scientist focused on insights, EDA, and error analysis.',
    capabilities: ['Deep EDA', 'Feature Importance', 'Error Analysis']
  },
  [AgentType.Ensemble]: {
    description: 'Meta-learning expert for stacking and blending models.',
    capabilities: ['Blending', 'Stacking', 'Submission Selection']
  }
};

const PROVIDERS: AIProvider[] = ['gemini', 'openrouter', 'openai', 'cerebras', 'groq'];

interface AgentsTeamProps {
  llmKeys: LLMKeys;
  onUpdateLLMKeys: (keys: LLMKeys) => void;
}

const AgentsTeam: React.FC<AgentsTeamProps> = ({ llmKeys, onUpdateLLMKeys }) => {
  const [editingAgent, setEditingAgent] = useState<AgentType | null>(null);
  const [editForm, setEditForm] = useState<AgentConfig | null>(null);

  const getAgentColor = (type: string) => {
    switch (type) {
      case AgentType.Researcher: return 'text-purple-400';
      case AgentType.Scout: return 'text-blue-400';
      case AgentType.Strategist: return 'text-accent'; 
      case AgentType.Coder: return 'text-green-400';
      case AgentType.Experimenter: return 'text-orange-400';
      case AgentType.Ensemble: return 'text-pink-400';
      case AgentType.Analyst: return 'text-yellow-400';
      default: return 'text-text';
    }
  };

  const handleEdit = (agent: AgentType) => {
    const currentConfig = llmKeys.agentConfigs?.[agent] || {
      agentType: agent,
      customPrompt: '',
      preferredProvider: llmKeys.provider,
      fallbackProviders: []
    };
    setEditForm(JSON.parse(JSON.stringify(currentConfig)));
    setEditingAgent(agent);
  };

  const handleSave = () => {
    if (!editForm || !editingAgent) return;

    const newConfigs = { ...(llmKeys.agentConfigs || {}) };
    newConfigs[editingAgent] = editForm;

    onUpdateLLMKeys({
      ...llmKeys,
      agentConfigs: newConfigs
    });
    setEditingAgent(null);
    setEditForm(null);
  };

  const toggleFallback = (p: AIProvider) => {
    if (!editForm) return;
    const current = editForm.fallbackProviders || [];
    const next = current.includes(p) 
      ? current.filter(x => x !== p)
      : [...current, p];
    setEditForm({ ...editForm, fallbackProviders: next });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-background animate-fadeIn custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-8 pb-20">
        
        {/* Header */}
        <div className="border-b border-surfaceHighlight pb-6">
          <h1 className="text-2xl font-serif font-bold text-text mb-2 flex items-center gap-3">
             <Users className="text-accent" />
             Agents
          </h1>
          <p className="text-textMuted max-w-2xl text-sm">
            Configure specialized AI personas. Define custom system prompts and provider fallback logic per agent.
          </p>
        </div>

        {/* Grid of Agents */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.values(AgentType).filter(t => t !== AgentType.User).map(agent => {
                const config = llmKeys.agentConfigs?.[agent];
                const hasCustom = !!config?.customPrompt || (config?.preferredProvider && config.preferredProvider !== llmKeys.provider);

                return (
                    <div key={agent} className="p-6 rounded-2xl border border-surfaceHighlight bg-surface hover:border-accent/30 transition-all duration-300 group shadow-sm hover:shadow-md relative overflow-hidden">
                        {hasCustom && (
                            <div className="absolute top-0 right-0 px-2 py-1 bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-tighter rounded-bl-lg">
                                Customized
                            </div>
                        )}
                        
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-xl bg-surfaceHighlight/30 border border-surfaceHighlight/50">
                                    <Bot size={28} className={getAgentColor(agent)} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-text text-lg tracking-tight">{agent}</h3>
                                    <code className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded text-textMuted group-hover:text-accent transition-colors font-mono">@{agent.toLowerCase()}</code>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleEdit(agent)}
                                className="p-2 text-textMuted hover:text-text hover:bg-surfaceHighlight/50 rounded-lg transition-all"
                                title="Configure Agent"
                            >
                                <Settings2 size={18} />
                            </button>
                        </div>
                        
                        <p className="text-xs text-textMuted mb-6 leading-relaxed min-h-[40px]">
                            {AGENT_DETAILS[agent]?.description}
                        </p>
                        
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-[10px] uppercase font-bold text-textMuted/70 mb-2 tracking-widest">Inference</h4>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] px-2 py-1 rounded bg-black/20 text-text border border-surfaceHighlight">
                                        {config?.preferredProvider || llmKeys.provider}
                                    </span>
                                    {config?.fallbackProviders && config.fallbackProviders.length > 0 && (
                                        <>
                                            <ChevronRight size={10} className="text-textMuted/30" />
                                            <span className="text-[10px] text-textMuted italic">
                                                +{config.fallbackProviders.length} fallbacks
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-[10px] uppercase font-bold text-textMuted/70 mb-2 tracking-widest">Capabilities</h4>
                                <div className="flex flex-wrap gap-2">
                                    {AGENT_DETAILS[agent]?.capabilities.map((cap, i) => (
                                        <span key={i} className="text-[11px] px-2.5 py-1 rounded-md bg-surfaceHighlight/30 text-textMuted border border-surfaceHighlight/50 group-hover:border-surfaceHighlight transition-colors">
                                            {cap}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* Configuration Modal */}
      {editingAgent && editForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
              <div className="w-full max-w-2xl bg-surface border border-surfaceHighlight rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-surfaceHighlight flex items-center justify-between bg-surfaceHighlight/10">
                      <div className="flex items-center gap-3">
                          <Bot size={24} className={getAgentColor(editingAgent)} />
                          <h2 className="text-xl font-bold text-text">Configure @{editingAgent.toLowerCase()}</h2>
                      </div>
                      <button onClick={() => setEditingAgent(null)} className="p-2 text-textMuted hover:text-text rounded-full hover:bg-surfaceHighlight/50">
                          <X size={20} />
                      </button>
                  </div>

                  <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
                      {/* System Prompt */}
                      <div className="space-y-3">
                          <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-textMuted uppercase tracking-widest">System Instruction Override</label>
                              <span className="text-[10px] text-accent/60">Optional</span>
                          </div>
                          <textarea 
                              value={editForm.customPrompt || ''}
                              onChange={(e) => setEditForm({ ...editForm, customPrompt: e.target.value })}
                              placeholder={DEFAULT_AGENT_PROMPTS[editingAgent] || "Describe the specialized behavior for this agent..."}
                              className="w-full h-32 bg-black/30 border border-surfaceHighlight rounded-xl p-4 text-sm text-text focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all resize-none"
                          />
                          <p className="text-[10px] text-textMuted leading-relaxed">
                              Providing a custom prompt will override the default persona logic for this specific agent.
                          </p>
                      </div>

                      {/* Provider Selection */}
                      <div className="grid md:grid-cols-2 gap-8">
                          <div className="space-y-3">
                              <label className="text-xs font-bold text-textMuted uppercase tracking-widest block">Preferred Provider</label>
                              <select 
                                value={editForm.preferredProvider || llmKeys.provider}
                                onChange={(e) => setEditForm({ ...editForm, preferredProvider: e.target.value as AIProvider })}
                                className="w-full bg-black/30 border border-surfaceHighlight rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:border-accent/50 transition-all appearance-none cursor-pointer"
                              >
                                  {PROVIDERS.map(p => (
                                      <option key={p} value={p}>{p.toUpperCase()}</option>
                                  ))}
                              </select>
                          </div>

                          <div className="space-y-3">
                              <label className="text-xs font-bold text-textMuted uppercase tracking-widest block">Active Fallbacks</label>
                              <div className="flex flex-wrap gap-2">
                                  {PROVIDERS.map(p => (
                                      <button 
                                        key={p}
                                        onClick={() => toggleFallback(p)}
                                        className={clsx(
                                            "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border",
                                            editForm.fallbackProviders?.includes(p) 
                                                ? "bg-accent/10 border-accent/50 text-accent" 
                                                : "bg-transparent border-surfaceHighlight text-textMuted opacity-50"
                                        )}
                                      >
                                          {p}
                                      </button>
                                  ))}
                              </div>
                          </div>
                      </div>

                      <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                          <AlertCircle className="text-blue-400 shrink-0" size={18} />
                          <p className="text-[11px] text-blue-300/80 leading-relaxed">
                              Kletta will attempt to use the Preferred Provider first. If it fails (rate limit, API error), it will cycle through the Active Fallbacks in the order defined.
                          </p>
                      </div>
                  </div>

                  <div className="p-6 border-t border-surfaceHighlight bg-surfaceHighlight/5 flex justify-end gap-3">
                      <button 
                        onClick={() => {
                            const newConfigs = { ...(llmKeys.agentConfigs || {}) };
                            delete newConfigs[editingAgent];
                            onUpdateLLMKeys({ ...llmKeys, agentConfigs: newConfigs });
                            setEditingAgent(null);
                        }}
                        className="px-4 py-2 text-sm font-medium text-textMuted hover:text-red-400 transition-colors"
                      >
                          Reset to Defaults
                      </button>
                      <button 
                        onClick={handleSave}
                        className="px-6 py-2 bg-accent hover:bg-accentHover text-white text-sm font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-accent/20 transition-all hover:-translate-y-0.5"
                      >
                          <Save size={16} /> Save Changes
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AgentsTeam;