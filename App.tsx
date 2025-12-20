import React, { useState, useEffect } from 'react';
import SidebarLeft from './components/SidebarLeft';
import SidebarRight from './components/SidebarRight';
import ChatArea from './components/ChatArea';
import MemoryViewer from './components/Dashboard';
import AgentsTeam from './components/AgentsTeam';
import Settings from './components/Settings';
import LandingPage from './components/LandingPage';
import CreateCompetitionModal from './components/CreateCompetitionModal';
import { Competition, ViewMode, Message, Resource, Task, MemoryBlock, AgentType, KaggleCredentials, LLMKeys, SearchFilters } from './types';
import { Menu, Loader2, PanelRightClose, PanelRightOpen, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { clsx } from 'clsx';
import { findCompetition, findResources } from './services/geminiService';

const App: React.FC = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [activeCompetitionId, setActiveCompetitionId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewMode>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [memory, setMemory] = useState<MemoryBlock[]>([]);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingText, setLoadingText] = useState('Consulting knowledge base...');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Credentials State
  const [kaggleCreds, setKaggleCreds] = useState<KaggleCredentials | null>(null);
  const [llmKeys, setLlmKeys] = useState<LLMKeys>({
    provider: 'gemini', // Default provider
    gemini: process.env.API_KEY || '', 
    openRouter: '',
    openAI: ''
  });

  // Load Creds from local storage on mount
  useEffect(() => {
    const storedKaggle = localStorage.getItem('kletta_kaggle_creds');
    if (storedKaggle) {
      try { setKaggleCreds(JSON.parse(storedKaggle)); } catch (e) { console.error("Failed to parse Kaggle creds"); }
    }

    const storedKeys = localStorage.getItem('kletta_llm_keys');
    if (storedKeys) {
      try { 
        const parsed = JSON.parse(storedKeys);
        setLlmKeys(prev => ({ 
            ...prev, 
            ...parsed, 
            gemini: parsed.gemini || prev.gemini,
            provider: parsed.provider || 'gemini' 
        })); 
      } catch (e) { console.error("Failed to parse LLM keys"); }
    }
  }, []);

  // Handle responsive sidebar defaults
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setLeftSidebarOpen(false);
        setRightSidebarOpen(false);
      } else {
        setLeftSidebarOpen(true);
        setRightSidebarOpen(true);
      }
    };
    
    // Set initial state based on width
    if (window.innerWidth < 768) {
        setLeftSidebarOpen(false);
        setRightSidebarOpen(false);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleConnectKaggle = (creds: KaggleCredentials | null) => {
    setKaggleCreds(creds);
    if (creds) {
      localStorage.setItem('kletta_kaggle_creds', JSON.stringify(creds));
    } else {
      localStorage.removeItem('kletta_kaggle_creds');
    }
  };

  const handleUpdateLLMKeys = (newKeys: LLMKeys) => {
    setLlmKeys(newKeys);
    localStorage.setItem('kletta_llm_keys', JSON.stringify(newKeys));
  };

  const handleResetWorkspace = () => {
    // Clear keys and data without confirmation for immediate navigation feel
    localStorage.removeItem('kletta_llm_keys');
    localStorage.removeItem('kletta_kaggle_creds');
    
    // Resetting keys to empty strings triggers re-render of LandingPage
    setLlmKeys({ provider: 'gemini', gemini: '', openRouter: '', openAI: '' });
    setKaggleCreds(null);
  };

  // Simulate initial data loading
  useEffect(() => {
    const loadData = async () => {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Load "fetched" data (simulated dynamic content)
      const fetchedCompetitions: Competition[] = [
        {
          id: 'comp-1',
          name: 'Child Mind Institute',
          description: 'Detect sleep states',
          url: 'https://www.kaggle.com/competitions/child-mind-institute-detect-sleep-states',
          tags: ['Series Time', 'Rank: 120'],
          lastActive: '2 hrs ago',
          status: 'active'
        }
      ];

      setCompetitions(fetchedCompetitions);
      setActiveCompetitionId(fetchedCompetitions[0].id);
      
      setMessages([
         {
            id: 'init-msg',
            role: 'agent',
            agentType: AgentType.Scout,
            content: "🔍 **Kletta Scout initialized.** I've detected the 'Child Mind Institute' competition. Ready to analyze the dataset and rules.",
            timestamp: new Date()
         }
      ]);
      
      setMemory([
         { label: 'Competition Rules', value: 'Goal: Detect sleep states from wrist-worn accelerometer data. Metric: Macro F1 Score.', lastUpdated: 'Now' },
         { label: 'Current Strategy', value: 'EDA on training data, establishing XGBoost baseline.', lastUpdated: 'Now' }
      ]);
      
      setTasks([
         { id: 't1', title: 'Download & Inspect Data', status: 'completed' },
         { id: 't2', title: 'Feature Engineering (Rolling stats)', status: 'in-progress' }
      ]);

      setResources([
         { id: 'r1', title: 'Sleep State Detection Papers', type: 'paper', summary: 'Key papers on accelerometer-based sleep staging.' }
      ]);

      setIsLoading(false);
    };

    loadData();
  }, []);

  const activeCompetition = competitions.find(c => c.id === activeCompetitionId);

  const handleSendMessage = (newMessage: Message) => {
    setMessages(prev => [...prev, newMessage]);
  };

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleProcessCompetitionCreation = async (query: string) => {
    setLoadingText('Scouting Competition...');
    setIsSearching(true);

    try {
      // Pass keys for fallback support
      const details = await findCompetition(query, llmKeys);
      
      const newId = `comp-${Date.now()}`;
      const newComp: Competition = {
         id: newId,
         name: details?.name || query,
         description: details?.description || 'Initialized via search',
         url: details?.url || `https://www.kaggle.com/search?q=${encodeURIComponent(query)}`,
         tags: details?.tags || ['New'],
         lastActive: 'Just now',
         status: 'active'
      };
      
      setCompetitions(prev => [newComp, ...prev]);
      setActiveCompetitionId(newId);
      
      // Reset Workspace State
      setResources([]);
      setTasks([]);
      setMemory([{ label: 'Status', value: `Initializing environment for ${newComp.name}...`, lastUpdated: 'Now' }]);
      
      // Initial message from Scout
      const initialMsg: Message = {
        id: Date.now().toString(),
        role: 'agent',
        agentType: AgentType.Scout,
        content: `🔍 **Kletta Scout Report**
        
I have successfully identified and linked the competition:
**[${newComp.name}](${newComp.url})**

${details?.description || ''}

I am now ready to:
1. Parse the official rules and evaluation metric.
2. Analyze the data format.
3. Suggest a research direction.

How shall we proceed?`,
        timestamp: new Date()
      };
      setMessages([initialMsg]);

      if (window.innerWidth < 768) {
         setLeftSidebarOpen(false);
      }
    } catch (error) {
      console.error("Failed to fetch competition", error);
      alert("Failed to find competition details. Please ensure at least one AI provider (Gemini, OpenRouter, or OpenAI) is configured in Settings.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddResource = async (filters: SearchFilters) => {
    if (!filters.topic) return;

    setLoadingText(`Researching resources for "${filters.topic}"...`);
    setIsSearching(true);

    try {
        // Pass keys for fallback support
        const newResources = await findResources(filters, llmKeys);
        if (newResources.length > 0) {
            setResources(prev => [...newResources, ...prev]);
        } else {
            alert("No resources found. Please try a different query.");
        }
    } catch (error) {
        console.error("Failed to add resource", error);
        alert("Failed to search for resources.");
    } finally {
        setIsSearching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-text">
         <div className="flex flex-col items-center gap-4">
            <Loader2 size={32} className="animate-spin text-accent" />
            <span className="text-sm font-medium text-textMuted">Loading Kletta Workspace...</span>
         </div>
      </div>
    );
  }

  // Check if user is "signed in" (has at least one key configured)
  const hasKeys = !!(llmKeys.gemini || llmKeys.openRouter || llmKeys.openAI);

  if (!hasKeys) {
      return <LandingPage onGetStarted={handleUpdateLLMKeys} />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-text relative">
      
      {/* Left Sidebar Toggle - Mobile Only */}
      <button 
        onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 text-textMuted hover:text-text bg-surface/80 backdrop-blur rounded-md border border-surfaceHighlight transition-colors shadow-sm"
        title={leftSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        {leftSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
      </button>

      {/* Global Overlay Loader for Search */}
      {isSearching && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center">
           <div className="bg-surface p-6 rounded-xl border border-surfaceHighlight shadow-2xl flex flex-col items-center gap-4">
              <Loader2 size={36} className="animate-spin text-accent" />
              <div className="text-center">
                <h3 className="text-lg font-semibold text-text">AI Working</h3>
                <p className="text-sm text-textMuted">{loadingText}</p>
              </div>
           </div>
        </div>
      )}

      {/* Create Competition Modal */}
      <CreateCompetitionModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleProcessCompetitionCreation}
      />

      {/* Left Sidebar */}
      <div className={clsx(
        "fixed inset-y-0 left-0 z-40 h-full bg-surface border-r border-surfaceHighlight transition-all duration-300 ease-in-out shadow-xl md:shadow-none",
        // Mobile: fixed off-canvas
        leftSidebarOpen ? "translate-x-0" : "-translate-x-full",
        // Desktop: relative flow with width transition
        "md:static md:transform-none",
        // Desktop width: Expanded vs Mini (w-20 is approx 80px)
        leftSidebarOpen ? "md:w-64" : "md:w-20"
      )}>
        <div className="w-full h-full overflow-hidden">
            <SidebarLeft 
              competitions={competitions}
              activeId={activeCompetitionId}
              onSelectCompetition={setActiveCompetitionId}
              onCreateCompetition={handleOpenCreateModal}
              activeView={activeView}
              onViewChange={setActiveView}
              kaggleCreds={kaggleCreds}
              isCollapsed={!leftSidebarOpen}
              onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
              onBackToLanding={handleResetWorkspace}
              className="w-full h-full"
            />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {activeView === 'chat' && (
          <ChatArea 
            messages={messages} 
            onSendMessage={handleSendMessage}
            activeCompetition={activeCompetition}
            setMessages={setMessages}
            llmKeys={llmKeys}
          />
        )}
        {activeView === 'memory' && (
          <MemoryViewer competition={activeCompetition} memory={memory} />
        )}
        {activeView === 'agents' && (
          <AgentsTeam />
        )}
        {activeView === 'settings' && (
          <Settings 
            kaggleCreds={kaggleCreds}
            onConnectKaggle={handleConnectKaggle}
            llmKeys={llmKeys}
            onUpdateLLMKeys={handleUpdateLLMKeys}
            onResetWorkspace={handleResetWorkspace}
          />
        )}
      </main>

      {/* Right Sidebar - Context Panel */}
      <div className={clsx(
        "fixed inset-y-0 right-0 z-40 h-full bg-surface border-l border-surfaceHighlight transition-all duration-300 ease-in-out shadow-xl lg:shadow-none",
        // Mobile: fixed off-canvas
        rightSidebarOpen ? "translate-x-0" : "translate-x-full",
        // Desktop: static flow
        "lg:static lg:transform-none", 
        rightSidebarOpen ? "lg:w-72" : "lg:w-0 lg:border-l-0"
      )}>
         <div className="w-72 h-full overflow-hidden">
           <SidebarRight 
              resources={resources}
              tasks={tasks}
              onAddResource={handleAddResource}
              className="w-full h-full"
           />
         </div>
      </div>
      
      {/* Right Sidebar Toggle */}
      <button 
        onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
        className="fixed top-4 right-4 z-50 p-2 text-textMuted hover:text-text bg-surface/80 backdrop-blur rounded-md border border-surfaceHighlight transition-colors shadow-sm"
        title={rightSidebarOpen ? "Close Context Panel" : "Open Context Panel"}
      >
        {rightSidebarOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
      </button>

    </div>
  );
};

export default App;