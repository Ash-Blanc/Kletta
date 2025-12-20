import React from 'react';
import { AgentType } from '../types';
import { Bot, Users } from 'lucide-react';
import { clsx } from 'clsx';

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

const AgentsTeam: React.FC = () => {
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

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-background animate-fadeIn">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="border-b border-surfaceHighlight pb-6">
          <h1 className="text-2xl font-serif font-bold text-text mb-2 flex items-center gap-3">
             <Users className="text-accent" />
             Kletta Agent Team
          </h1>
          <p className="text-textMuted max-w-2xl">
            Meet the specialized AI personas that collaborate to solve your competition. 
            Each agent has distinct responsibilities, tools, and memory access.
          </p>
        </div>

        {/* Grid of Agents */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.values(AgentType).filter(t => t !== AgentType.User).map(agent => (
                <div key={agent} className="p-6 rounded-xl border border-surfaceHighlight bg-surface hover:border-accent/30 transition-all duration-300 group shadow-sm hover:shadow-md">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-lg bg-surfaceHighlight/30 border border-surfaceHighlight/50">
                                <Bot size={28} className={getAgentColor(agent)} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-text text-lg tracking-tight">{agent}</h3>
                                <code className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded text-textMuted group-hover:text-accent transition-colors font-mono">@{agent.toLowerCase()}</code>
                            </div>
                        </div>
                    </div>
                    
                    <p className="text-sm text-textMuted mb-6 leading-relaxed min-h-[40px]">
                        {AGENT_DETAILS[agent]?.description}
                    </p>
                    
                    <div>
                        <h4 className="text-[10px] uppercase font-semibold text-textMuted/70 mb-2 tracking-wider">Capabilities</h4>
                        <div className="flex flex-wrap gap-2">
                            {AGENT_DETAILS[agent]?.capabilities.map((cap, i) => (
                                <span key={i} className="text-[11px] px-2.5 py-1 rounded-md bg-surfaceHighlight/30 text-textMuted border border-surfaceHighlight/50 group-hover:border-surfaceHighlight transition-colors">
                                    {cap}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default AgentsTeam;