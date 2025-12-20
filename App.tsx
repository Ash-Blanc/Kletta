import React, { useState, useEffect } from 'react';
import SidebarLeft from './components/SidebarLeft';
import SidebarRight from './components/SidebarRight';
import ChatArea from './components/ChatArea';
import MemoryViewer from './components/Dashboard';
import AgentsTeam from './components/AgentsTeam';
import Settings from './components/Settings';
import LandingPage from './components/LandingPage';
import CreateCompetitionModal from './components/CreateCompetitionModal';
import { Competition, ViewMode, Message, Resource, Task, MemoryBlock, AgentType, KaggleCredentials, LLMKeys, SearchFilters, AIProvider } from './types';
import { PanelRightClose, PanelRightOpen, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { clsx } from 'clsx';
import { findCompetition, findResources, generateAgentResponse } from './services/geminiService';
import { fetchUserCompetitions, searchCompetitions, searchDatasets, KaggleError } from './services/kaggleService';
import * as storage from './services/storageService';
import { FullScreenLoader, OverlayLoader } from './components/LoadingStates';
import { encrypt, decrypt } from './services/cryptoUtils';

const PROVIDER_OPTIONS: AIProvider[] = ['gemini', 'openrouter', 'openai', 'cerebras', 'groq'];

const isAIProvider = (value: string | undefined): value is AIProvider =>
  (value ? PROVIDER_OPTIONS.includes(value as AIProvider) : false);

const getEnvDefaultKeys = (): LLMKeys => {
  const envProvider = import.meta.env.VITE_DEFAULT_PROVIDER;
  const provider = isAIProvider(envProvider) ? envProvider : 'gemini';

  return {
    provider,
    gemini: import.meta.env.VITE_GEMINI_API_KEY || '',
    openRouter: import.meta.env.VITE_OPENROUTER_API_KEY || '',
    openAI: import.meta.env.VITE_OPENAI_API_KEY || '',
    cerebras: '',
    groq: ''
  };
};

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
  const [kaggleStatus, setKaggleStatus] = useState<{ loaded: boolean; error?: string }>({ loaded: false });
  
  // Credentials State
  const [kaggleCreds, setKaggleCreds] = useState<KaggleCredentials | null>(null);
  const [llmKeys, setLlmKeys] = useState<LLMKeys>(() => getEnvDefaultKeys());

  // Load Creds from local storage on mount
  useEffect(() => {
    const storedKaggle = localStorage.getItem('kletta_kaggle_creds');
    if (storedKaggle) {
      try { 
          const parsed = JSON.parse(storedKaggle);
          // Try to decrypt if present
          setKaggleCreds({
              username: decrypt(parsed.username),
              key: decrypt(parsed.key)
          }); 
      } catch (e) { console.error("Failed to parse Kaggle creds"); }
    }

    const storedKeys = localStorage.getItem('kletta_llm_keys');
    if (storedKeys) {
      try { 
        const parsed = JSON.parse(storedKeys);
        setLlmKeys(prev => ({
          provider: isAIProvider(parsed.provider) ? parsed.provider : prev.provider,
          gemini: decrypt(parsed.gemini || ''),
          openRouter: decrypt(parsed.openRouter || ''),
          openAI: decrypt(parsed.openAI || ''),
          cerebras: decrypt(parsed.cerebras || ''),
          groq: decrypt(parsed.groq || ''),
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
      // Encrypt before saving
      const secureCreds = {
          username: encrypt(creds.username),
          key: encrypt(creds.key)
      };
      localStorage.setItem('kletta_kaggle_creds', JSON.stringify(secureCreds));
    } else {
      localStorage.removeItem('kletta_kaggle_creds');
    }
  };

  const handleUpdateLLMKeys = (newKeys: LLMKeys) => {
    const sanitized: LLMKeys = {
      provider: isAIProvider(newKeys.provider) ? newKeys.provider : llmKeys.provider,
      gemini: newKeys.gemini ?? '',
      openRouter: newKeys.openRouter ?? '',
      openAI: newKeys.openAI ?? '',
      cerebras: newKeys.cerebras ?? '',
      groq: newKeys.groq ?? '',
    };

    setLlmKeys(sanitized);
    
    // Encrypt sensitive fields
    const secureKeys = {
        ...sanitized,
        gemini: encrypt(sanitized.gemini || ''),
        openRouter: encrypt(sanitized.openRouter || ''),
        openAI: encrypt(sanitized.openAI || ''),
        cerebras: encrypt(sanitized.cerebras || ''),
        groq: encrypt(sanitized.groq || '')
    };
    localStorage.setItem('kletta_llm_keys', JSON.stringify(secureKeys));
  };

  const handleResetWorkspace = () => {
    // Clear keys and data without confirmation for immediate navigation feel
    localStorage.removeItem('kletta_llm_keys');
    localStorage.removeItem('kletta_kaggle_creds');
    
    // Revert to environment defaults so teams can preconfigure shared creds
    setLlmKeys(getEnvDefaultKeys());
    setKaggleCreds(null);
  };

  // Load workspace data on boot
  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Load saved competitions from IndexedDB
        const savedCompetitions = await storage.loadCompetitions();
        const lastActiveId = await storage.getMeta<string>('activeCompetitionId');

        // 2. Optionally fetch from Kaggle and merge
        let kaggleCompetitions: Competition[] = [];
        if (kaggleCreds) {
          try {
            kaggleCompetitions = await fetchUserCompetitions(kaggleCreds);
            setKaggleStatus({ loaded: true });
          } catch (err: any) {
            console.warn('Kaggle fetch failed:', err);
            const errorMsg = err instanceof KaggleError ? err.message : 'Failed to load from Kaggle.';
            setKaggleStatus({ loaded: false, error: errorMsg });
          }
        } else {
          setKaggleStatus({ loaded: false, error: 'Kaggle credentials not configured.' });
        }

        // 3. Merge: Kaggle competitions update existing, saved ones are preserved
        const merged = new Map<string, Competition>();
        savedCompetitions.forEach((c) => merged.set(c.id, c));
        kaggleCompetitions.forEach((c) => merged.set(c.id, c)); // Kaggle overwrites
        const allCompetitions = Array.from(merged.values());

        setCompetitions(allCompetitions);

        // 4. Restore or pick active competition
        const activeId = lastActiveId && merged.has(lastActiveId)
          ? lastActiveId
          : allCompetitions[0]?.id || null;

        setActiveCompetitionId(activeId);

        // 5. Load data for active competition
        if (activeId) {
          const [msgs, res, tsk, mem] = await Promise.all([
            storage.loadMessages(activeId),
            storage.loadResources(activeId),
            storage.loadTasks(activeId),
            storage.loadMemory(activeId),
          ]);
          setMessages(msgs);
          setResources(res);
          setTasks(tsk);
          setMemory(mem);
          
          // Trigger initialization if no messages exist
          if (msgs.length === 0) {
            handleAgentBoot(activeId, allCompetitions.find(c => c.id === activeId));
          }
        }

        // Save merged competitions to IndexedDB
        if (allCompetitions.length > 0) {
          await storage.saveCompetitions(allCompetitions);
        }
      } catch (err) {
        console.error('Failed to load workspace:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [kaggleCreds]);

  // Save active competition ID to meta when it changes
  useEffect(() => {
    if (activeCompetitionId) {
      storage.setMeta('activeCompetitionId', activeCompetitionId);
    }
  }, [activeCompetitionId]);

  // Auto-save messages when they change (debounced)
  useEffect(() => {
    if (activeCompetitionId && messages.length > 0) {
      const handler = setTimeout(() => {
        storage.saveMessages(activeCompetitionId, messages);
      }, 1000);
      return () => clearTimeout(handler);
    }
  }, [activeCompetitionId, messages]);

  // Auto-save resources when they change (debounced)
  useEffect(() => {
    if (activeCompetitionId) {
      const handler = setTimeout(() => {
        storage.saveResources(activeCompetitionId, resources);
      }, 1000);
      return () => clearTimeout(handler);
    }
  }, [activeCompetitionId, resources]);

  // Auto-save tasks when they change (debounced)
  useEffect(() => {
    if (activeCompetitionId) {
      const handler = setTimeout(() => {
        storage.saveTasks(activeCompetitionId, tasks);
      }, 1000);
      return () => clearTimeout(handler);
    }
  }, [activeCompetitionId, tasks]);

  // Auto-save memory when it changes (debounced)
  useEffect(() => {
    if (activeCompetitionId) {
      const handler = setTimeout(() => {
        storage.saveMemory(activeCompetitionId, memory);
      }, 1000);
      return () => clearTimeout(handler);
    }
  }, [activeCompetitionId, memory]);

  const activeCompetition = competitions.find(c => c.id === activeCompetitionId);

  // Load data when switching competitions
  const handleSelectCompetition = async (id: string) => {
    if (id === activeCompetitionId) return;

    setActiveCompetitionId(id);

    // Load persisted data for the newly selected competition
    try {
      const [msgs, res, tsk, mem] = await Promise.all([
        storage.loadMessages(id),
        storage.loadResources(id),
        storage.loadTasks(id),
        storage.loadMemory(id),
      ]);
      setMessages(msgs);
      setResources(res);
      setTasks(tsk);
      setMemory(mem);
    } catch (err) {
      console.error('Failed to load competition data:', err);
      setMessages([]);
      setResources([]);
      setTasks([]);
      setMemory([]);
    }
  };

  const handleSendMessage = (newMessage: Message) => {
    setMessages(prev => [...prev, newMessage]);
  };

  const handleAgentBoot = async (competitionId: string, competition?: Competition) => {
    if (!competition) return;
    
    setIsSearching(true);
    setLoadingText('Strategist is initializing workspace...');

    try {
        const response = await generateAgentResponse(
            [], 
            `I have just joined the "${competition.name}" competition. Analyze the context and initialize our workspace by creating a high-level roadmap using [ADD_TASK] blocks. Focus on EDA, validation strategy, and baseline modeling.`, 
            llmKeys, 
            competition,
            [], // resources
            [],  // tasks
            kaggleCreds
        );

        let cleanText = response.text;

        // Reuse parsing logic (we should eventually extract this)
        const taskRegex = /\[ADD_TASK:\s*"([\s\S]*?)"\]/g;
        let taskMatch;
        const newTasks: Task[] = [];
        while ((taskMatch = taskRegex.exec(response.text)) !== null) {
            try {
                const newTask: Task = { id: `task-${Date.now()}-${Math.random()}`, title: taskMatch[1], status: 'pending' };
                newTasks.push(newTask);
                cleanText = cleanText.replace(taskMatch[0], '');
            } catch (e) { console.error(e); }
        }
        if (newTasks.length > 0) setTasks(prev => [...newTasks, ...prev]);

        const initialMsg: Message = {
            id: Date.now().toString(),
            role: 'agent',
            agentType: response.agentType,
            content: cleanText.trim(),
            timestamp: new Date(),
        };
        setMessages([initialMsg]);
    } catch (error) {
        console.error('Failed to boot agent', error);
    } finally {
        setIsSearching(false);
    }
  };

  const handleAddTask = (title: string) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title,
      status: 'pending'
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleDeleteResource = (id: string) => {
    setResources(prev => prev.filter(r => r.id !== id));
  };

  const handleRegisterResource = (resource: Omit<Resource, 'id'>) => {
    const newRes: Resource = {
      ...resource,
      id: `res-agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setResources(prev => [newRes, ...prev]);
  };

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleProcessCompetitionCreation = async (query: string) => {
    setLoadingText('Scouting Competition...');
    setIsSearching(true);

    let newComp: Competition | null = null;
    let sourceLabel = 'AI';

    try {
      // 1. Try Kaggle search first if credentials exist
      if (kaggleCreds) {
        try {
          const kaggleResults = await searchCompetitions(query, kaggleCreds);
          if (kaggleResults.length > 0) {
            newComp = kaggleResults[0];
            sourceLabel = 'Kaggle';
          }
        } catch (kaggleErr) {
          console.warn('Kaggle competition search failed, falling back to AI:', kaggleErr);
        }
      }

      // 2. Fallback to AI-based search if Kaggle didn't return results
      if (!newComp) {
        const details = await findCompetition(query, llmKeys);
        const newId = `comp-${Date.now()}`;
        newComp = {
          id: newId,
          name: details?.name || query,
          description: details?.description || 'Initialized via search',
          url: details?.url || `https://www.kaggle.com/search?q=${encodeURIComponent(query)}`,
          tags: details?.tags || ['New'],
          lastActive: 'Just now',
          status: 'active',
        };
      }

      setCompetitions(prev => [newComp!, ...prev]);
      setActiveCompetitionId(newComp.id);

      // Save new competition to IndexedDB
      await storage.saveCompetition(newComp);

      // Reset Workspace State for new competition
      setResources([]);
      setTasks([]);
      setMemory([{ label: 'Status', value: `Initializing environment for ${newComp.name}...`, lastUpdated: 'Now' }]);

      // Strategic Initialization
      await handleAgentBoot(newComp.id, newComp);

      if (window.innerWidth < 768) {
        setLeftSidebarOpen(false);
      }
    } catch (error) {
      console.error('Failed to fetch competition', error);
      alert('Failed to find competition details. Please ensure Kaggle credentials or at least one AI provider is configured in Settings.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddResource = async (filters: SearchFilters) => {
    if (!filters.topic) return;

    setLoadingText(`Researching resources for "${filters.topic}"...`);
    setIsSearching(true);

    const allResults: Resource[] = [];

    try {
      // 1. Search Kaggle datasets if credentials exist
      if (kaggleCreds) {
        try {
          const kaggleDatasets = await searchDatasets(filters.topic, kaggleCreds);
          allResults.push(...kaggleDatasets);
        } catch (kaggleErr) {
          console.warn('Kaggle dataset search failed:', kaggleErr);
        }
      }

      // 2. Search via AI (papers/libraries)
      try {
        const aiResources = await findResources(filters, llmKeys);
        allResults.push(...aiResources);
      } catch (aiErr) {
        console.warn('AI resource search failed:', aiErr);
      }

      if (allResults.length > 0) {
        setResources(prev => [...allResults, ...prev]);
      } else {
        alert('No resources found. Please try a different query.');
      }
    } catch (error) {
      console.error('Failed to add resource', error);
      alert('Failed to search for resources.');
    } finally {
      setIsSearching(false);
    }
  };

  if (isLoading) {
    return <FullScreenLoader message="Loading Kletta workspace…" subtext="Preparing agent memory, competitions, and resources." />;
  }

  // Check if user is "signed in" (has at least one key configured)
  const hasKeys = !!(llmKeys.gemini || llmKeys.openRouter || llmKeys.openAI || llmKeys.cerebras || llmKeys.groq);

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
      {isSearching && <OverlayLoader message={loadingText} />}

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
              onSelectCompetition={handleSelectCompetition}
              onCreateCompetition={handleOpenCreateModal}
              activeView={activeView}
              onViewChange={setActiveView}
              kaggleCreds={kaggleCreds}
              kaggleStatus={kaggleStatus}
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
            resources={resources}
            tasks={tasks}
            onRegisterResource={handleRegisterResource}
            onAddTask={handleAddTask}
            setMessages={setMessages}
            llmKeys={llmKeys}
            kaggleCreds={kaggleCreds}
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
        "fixed inset-y-0 right-0 z-40 h-full bg-surface border-l border-surfaceHighlight transition-all duration-300 ease-in-out shadow-xl md:shadow-none overflow-hidden",
        // Mobile: fixed off-canvas
        rightSidebarOpen ? "translate-x-0" : "-translate-x-full",
        // Desktop: static flow
        "md:static md:transform-none", 
        rightSidebarOpen ? "md:w-72" : "md:w-0 md:border-l-0"
      )}>
         <div className="w-72 h-full">
           <SidebarRight 
              resources={resources}
              tasks={tasks}
              onAddResource={handleAddResource}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onDeleteResource={handleDeleteResource}
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