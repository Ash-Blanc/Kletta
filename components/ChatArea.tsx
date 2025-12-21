import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, AgentType, Competition, LLMKeys, Resource, Task, KaggleCredentials, MemoryBlock } from '../types';
import { Send, User, Sparkles, MoreHorizontal, LayoutTemplate, ExternalLink, FileDown, Copy, RotateCcw, Check, Trash2, Command, Settings2, ChevronDown, ArrowDown } from 'lucide-react';
import { KlettaIcon } from './KlettaIcon';
import { clsx } from 'clsx';
import { generateAgentResponse } from '../services/geminiService';
import { NotebookCell } from './NotebookCell';
import { exportToIPYNB } from '../services/notebookUtils';

interface ChatAreaProps {
  messages: Message[];
  activeCompetition?: Competition;
  resources: Resource[];
  tasks: Task[];
  memory: MemoryBlock[];
  onSendMessage: (msg: Message) => void;
  onRegisterResource: (res: Omit<Resource, 'id'>) => void;
  onAddTask: (title: string) => void;
  onRemoveTaskByTitle: (title: string) => void;
  onClearTasks: () => void;
  onUpdateMemory: (label: string, value: string) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  llmKeys: LLMKeys;
  kaggleCreds: KaggleCredentials | null;
}

const AGENTS_LIST = Object.values(AgentType).filter(type => type !== AgentType.User);

const ChatArea: React.FC<ChatAreaProps> = ({ 
    messages, 
    activeCompetition, 
    resources,
    tasks,
    memory,
    onSendMessage, 
    onRegisterResource,
    onAddTask,
    onRemoveTaskByTitle,
    onClearTasks,
    onUpdateMemory,
    setMessages, 
    llmKeys,
    kaggleCreds
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [showCommands, setShowCommands] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const SLASH_COMMANDS = [
    { name: 'clear', description: 'Wipe conversation history', icon: <Trash2 size={14} /> },
    { name: 'reset-plan', description: 'Clear active roadmap', icon: <RotateCcw size={14} /> },
    { name: 'settings', description: 'Open workspace settings', icon: <Settings2 size={14} /> },
  ];

  const filteredAgents = showMentions ? AGENTS_LIST.filter(a => a.toLowerCase().includes(mentionFilter)) : [];
  const filteredCommands = showCommands ? SLASH_COMMANDS.filter(c => c.name.includes(mentionFilter)) : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isTyping]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isAtBottom);
  };

  // Reset selection index when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [mentionFilter]);

  // Handle Input Changes to detect @mention or /command
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    
    // Check for @mentions
    const lastAtSymbolIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtSymbolIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtSymbolIndex + 1);
      if (!textAfterAt.includes(' ')) {
        setShowMentions(true);
        setShowCommands(false);
        setMentionFilter(textAfterAt.toLowerCase());
        return;
      }
    }

    // Check for /commands
    if (value.startsWith('/')) {
        const commandText = value.substring(1).split(' ')[0];
        setShowCommands(true);
        setShowMentions(false);
        setMentionFilter(commandText.toLowerCase());
        return;
    }
    
    setShowMentions(false);
    setShowCommands(false);
  };

  const handleSelectCommand = (cmd: string) => {
    if (cmd === 'clear') {
        setMessages([]);
    } else if (cmd === 'reset-plan') {
        onClearTasks();
    }
    setInputValue('');
    setShowCommands(false);
  };

  const handleSelectAgent = (agent: string) => {
    const cursorPosition = textareaRef.current?.selectionStart || inputValue.length;
    const textBeforeCursor = inputValue.substring(0, cursorPosition);
    const lastAtSymbolIndex = textBeforeCursor.lastIndexOf('@');
    
    const prefix = inputValue.substring(0, lastAtSymbolIndex);
    const suffix = inputValue.substring(cursorPosition);
    
    // Add space after mention for convenience
    const newValue = `${prefix}@${agent.toLowerCase()} ${suffix}`;
    setInputValue(newValue);
    setShowMentions(false);
    
    // Focus back on textarea and set cursor position after the inserted mention
    if (textareaRef.current) {
        textareaRef.current.focus();
        // Need to defer setting selection range slightly for React to update value
        setTimeout(() => {
            const newCursorPos = lastAtSymbolIndex + agent.length + 2; // @ + name + space
            textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    }
  };

  const processAgentResponse = (response: { text: string, agentType: AgentType }) => {
    let cleanText = response.text;

    // 1. Check for Resource Additions [ADD_RESOURCE: {...}]
    const resourceRegex = /\[ADD_RESOURCE:\s*({[\s\S]*?})\]/g;
    let resMatch;
    while ((resMatch = resourceRegex.exec(response.text)) !== null) {
        try {
            const resData = JSON.parse(resMatch[1]);
            onRegisterResource(resData);
            cleanText = cleanText.replace(resMatch[0], '');
        } catch (e) { console.error(e); }
    }

    // 2. Check for Task Additions [ADD_TASK: "..."]
    const taskRegex = /\[ADD_TASK:\s*"([\s\S]*?)"\]/g;
    let taskMatch;
    while ((taskMatch = taskRegex.exec(response.text)) !== null) {
        try {
            onAddTask(taskMatch[1]);
            cleanText = cleanText.replace(taskMatch[0], '');
        } catch (e) { console.error(e); }
    }

    // 3. Check for Task Removals [REMOVE_TASK: "..."]
    const removeTaskRegex = /\[REMOVE_TASK:\s*"([\s\S]*?)"\]/g;
    let removeMatch;
    while ((removeMatch = removeTaskRegex.exec(response.text)) !== null) {
        try {
            onRemoveTaskByTitle(removeMatch[1]);
            cleanText = cleanText.replace(removeMatch[0], '');
        } catch (e) { console.error(e); }
    }

    // 4. Check for Plan Clear [CLEAR_PLAN]
    if (response.text.includes('[CLEAR_PLAN]')) {
        onClearTasks();
        cleanText = cleanText.replace('[CLEAR_PLAN]', '');
    }

    // 5. Check for Memory Updates [UPDATE_MEMORY: {...}]
    const memoryRegex = /\[UPDATE_MEMORY:\s*({[\s\S]*?})\]/g;
    let memMatch;
    while ((memMatch = memoryRegex.exec(response.text)) !== null) {
        try {
            const memData = JSON.parse(memMatch[1]);
            onUpdateMemory(memData.label, memData.value);
            cleanText = cleanText.replace(memMatch[0], '');
        } catch (e) { console.error(e); }
    }

    const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        agentType: response.agentType,
        content: cleanText.trim(),
        timestamp: new Date()
    };

    setMessages(prev => [...prev, agentMsg]);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !activeCompetition) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    onSendMessage(userMsg);
    setInputValue('');
    setShowMentions(false);
    setShowCommands(false);
    setIsTyping(true);

    try {
        const response = await generateAgentResponse(
            messages.concat(userMsg), 
            userMsg.content, 
            llmKeys, 
            activeCompetition,
            resources,
            tasks,
            kaggleCreds,
            memory
        );
        processAgentResponse(response);
    } catch (error) {
        // Fallback error message
        const errorMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'agent',
            agentType: AgentType.Strategist,
            content: "⚠️ **System Error:** All AI providers failed. Please check your API keys in Settings.",
            timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle dropdown navigation
    if ((showMentions || showCommands) && (filteredAgents.length > 0 || filteredCommands.length > 0)) {
        const count = showMentions ? filteredAgents.length : filteredCommands.length;
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : count - 1));
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < count - 1 ? prev + 1 : 0));
            return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            if (showMentions) handleSelectAgent(filteredAgents[selectedIndex]);
            else handleSelectCommand(filteredCommands[selectedIndex].name);
            return;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            setShowMentions(false);
            setShowCommands(false);
            return;
        }
    }

    // Handle normal send
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRegenerate = async () => {
    if (messages.length < 2 || isTyping) return;
    
    // Find last user message
    const lastUserMsgIdx = [...messages].reverse().findIndex(m => m.role === 'user');
    if (lastUserMsgIdx === -1) return;
    
    // Correct index from start
    const actualIdx = messages.length - 1 - lastUserMsgIdx;
    const userMsg = messages[actualIdx];
    
    // History is all messages UP TO the user message (exclusive)
    const history = messages.slice(0, actualIdx);
    
    // Wipe all messages after history (including current agent response)
    setMessages([...history, userMsg]);
    
    setIsTyping(true);
    try {
        const response = await generateAgentResponse(
            history.concat(userMsg), 
            userMsg.content, 
            llmKeys, 
            activeCompetition,
            resources,
            tasks,
            kaggleCreds,
            memory
        );
        processAgentResponse(response);
    } catch (e) {
        setIsTyping(false);
    }
  };

  const getAgentColor = (type?: AgentType) => {
    switch (type) {
      case AgentType.Researcher: return 'text-purple-400';
      case AgentType.Scout: return 'text-blue-400';
      case AgentType.Strategist: return 'text-accent'; // Kletta/Kaggle Blue
      case AgentType.Coder: return 'text-green-400';
      case AgentType.Experimenter: return 'text-orange-400';
      case AgentType.Ensemble: return 'text-pink-400';
      case AgentType.Analyst: return 'text-yellow-400';
      default: return 'text-text';
    }
  };

  // Ensure selected item is visible in scroll container
  useEffect(() => {
    if (showMentions && dropdownRef.current) {
        const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement;
        if (selectedElement) {
            selectedElement.scrollIntoView({ block: 'nearest' });
        }
    }
  }, [selectedIndex, showMentions]);

  if (!activeCompetition) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center text-textMuted p-8">
        <div className="w-16 h-16 bg-surfaceHighlight rounded-full flex items-center justify-center mb-4">
           <LayoutTemplate size={32} />
        </div>
        <h2 className="text-xl font-semibold text-text mb-2">No Competition Selected</h2>
        <p className="text-sm max-w-md text-center">Select an active Kaggle competition from the sidebar or initialize a new one to start working.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-surfaceHighlight flex items-center justify-between bg-surface/50 backdrop-blur-sm z-10 h-14 md:h-16 shrink-0">
        <div className="flex items-center gap-2 md:gap-3 overflow-hidden ml-10 md:ml-0">
           <h1 className="text-sm md:text-base font-semibold text-text truncate max-w-[120px] md:max-w-none">{activeCompetition.name}</h1>
           <span className="hidden xs:inline-block px-2 py-0.5 rounded-full bg-accent/20 text-accent text-[9px] md:text-[10px] uppercase tracking-wider font-medium flex-shrink-0">Active</span>
           {activeCompetition.url && (
             <a 
               href={activeCompetition.url} 
               target="_blank" 
               rel="noopener noreferrer"
               className="text-textMuted hover:text-accent transition-colors"
               title="View on Kaggle"
             >
               <ExternalLink size={14} />
             </a>
           )}
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={() => exportToIPYNB(messages, activeCompetition.name)}
                className="p-2 text-textMuted hover:text-accent rounded-md hover:bg-surfaceHighlight/50 flex items-center gap-2 text-xs font-bold uppercase transition-all"
                title="Export implementation to Jupyter Notebook (.ipynb)"
            >
                <FileDown size={18} />
                <span className="hidden sm:inline">Export .ipynb</span>
            </button>
            <button className="p-2 text-textMuted hover:text-text rounded-md hover:bg-surfaceHighlight/50">
                <MoreHorizontal size={20} />
            </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 md:p-4 space-y-6 custom-scrollbar relative"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 text-center px-6">
             <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-surfaceHighlight/40 flex items-center justify-center">
               <KlettaIcon size={24} className="text-accent md:hidden" />
               <KlettaIcon size={28} className="text-accent hidden md:block" />
             </div>
             <div className="space-y-2">
               <p className="text-sm font-medium text-text">Say hello to your agent team</p>
               <p className="text-xs text-textMuted max-w-sm leading-relaxed">
                 Use <code className="bg-black/20 px-1 py-0.5 rounded">@scout</code> to summarize rules, <code className="bg-black/20 px-1 py-0.5 rounded">@coder</code> for code, or ask anything about {activeCompetition.name}.
               </p>
             </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div 
              key={msg.id} 
              className={clsx(
                "flex gap-3 md:gap-4 max-w-3xl mx-auto w-full group",
                msg.role === 'user' ? "flex-row-reverse animate-in fade-in slide-in-from-right-2" : "flex-row animate-in fade-in slide-in-from-left-2"
              )}
            >
              {/* Avatar */}
              <div className={clsx(
                "w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 shadow-sm",
                msg.role === 'user' ? "bg-surfaceHighlight/80" : "bg-surface border border-surfaceHighlight"
              )}>
                {msg.role === 'user' ? (
                  <User size={14} className="text-textMuted md:hidden" />
                ) : (
                  <KlettaIcon size={14} className={clsx(getAgentColor(msg.agentType), "md:hidden")} />
                )}
                {msg.role === 'user' ? (
                  <User size={16} className="text-textMuted hidden md:block" />
                ) : (
                  <KlettaIcon size={16} className={clsx(getAgentColor(msg.agentType), "hidden md:block")} />
                )}
              </div>

              {/* Content */}
              <div className={clsx(
                "flex-1 rounded-2xl p-3 md:p-4 text-xs md:text-sm leading-relaxed shadow-sm min-w-0 overflow-hidden group/msg relative",
                msg.role === 'user' ? "bg-surfaceHighlight/40 text-text" : "bg-surface text-textMuted"
              )}>
                {/* Message Actions */}
                <div className={clsx(
                    "absolute top-2 opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-1 bg-surfaceHighlight/80 backdrop-blur rounded-lg border border-white/5 p-1",
                    msg.role === 'user' ? "left-2" : "right-2"
                )}>
                    <button 
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="p-1 hover:bg-white/10 rounded transition-colors text-textMuted hover:text-text"
                        title="Copy Message"
                    >
                        {copiedId === msg.id ? <Check size={12} className="text-accent" /> : <Copy size={12} />}
                    </button>
                    {msg.role === 'agent' && index === messages.length - 1 && (
                        <button 
                            onClick={handleRegenerate}
                            disabled={isTyping}
                            className={clsx(
                                "p-1 hover:bg-white/10 rounded transition-colors text-textMuted hover:text-text",
                                isTyping && "opacity-50 cursor-not-allowed"
                            )}
                            title="Regenerate"
                        >
                            <RotateCcw size={12} className={clsx(isTyping && "animate-spin")} />
                        </button>
                    )}
                </div>

                {msg.agentType && msg.role === 'agent' && (
                  <div className="flex items-center gap-2 mb-2">
                      <span className={clsx("text-xs font-bold uppercase tracking-wider", getAgentColor(msg.agentType))}>
                        {msg.agentType}
                      </span>
                      <span className="text-[10px] text-textMuted/50">
                        {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                  </div>
                )}
                  <div className="markdown-content space-y-3">
                    <ReactMarkdown 
                      components={{
                        code(props) {
                            const {children, className, node, ...rest} = props;
                            const match = /language-(\w+)/.exec(className || '');
                            // If it's a block code (has language or multiline), use NotebookCell
                            if (match) {
                                return <NotebookCell code={String(children).replace(/\n$/, '')} language={match[1]} />;
                            }
                            return <code className="bg-black/30 rounded px-1.5 py-0.5 text-xs font-mono text-accent" {...rest}>{children}</code>;
                        },
                        pre: ({children}) => <>{children}</>,
                        ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1 marker:text-textMuted" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-4 space-y-1 marker:text-textMuted" {...props} />,
                        a: ({node, ...props}) => <a className="text-accent hover:underline hover:text-accentHover transition-colors" {...props} />,
                        p: ({node, ...props}) => <p className="leading-relaxed" {...props} />,
                        h1: ({node, ...props}) => <h1 className="text-lg font-bold text-text mb-2 border-b border-surfaceHighlight pb-1" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-base font-bold text-text mb-1.5" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-sm font-bold text-text mb-1" {...props} />,
                        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-accent/20 pl-4 italic text-textMuted" {...props} />,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
              </div>
            </div>
          ))
        )}

        {isTyping && (
          <div className="flex gap-3 md:gap-4 max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-surface border border-surfaceHighlight flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
               <KlettaIcon size={16} className="text-accent animate-pulse" />
            </div>
            <div className="bg-surface border border-surfaceHighlight rounded-2xl px-4 py-3 text-sm text-textMuted flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 bg-accent/60 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
              <span className="w-1.5 h-1.5 bg-accent/60 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
              <span className="w-1.5 h-1.5 bg-accent/60 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
              <span className="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">Agent Thinking</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
        
        {/* Floating Scroll Button */}
        {showScrollButton && (
            <button 
                onClick={scrollToBottom}
                className="fixed bottom-24 left-1/2 -translate-x-1/2 z-20 p-3 bg-accent hover:bg-accentHover text-white rounded-full shadow-2xl animate-in fade-in zoom-in slide-in-from-bottom-4 transition-all"
            >
                <ArrowDown size={20} />
            </button>
        )}
      </div>

      {/* Input */}
      <div className="p-3 md:p-4 max-w-3xl mx-auto w-full relative shrink-0">
        {/* Dropdowns (Mentions & Commands) */}
        {(showMentions || showCommands) && (
            <div className="absolute bottom-full left-3 md:left-4 mb-2 w-full md:w-64 max-w-[calc(100vw-24px)] bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-20 animate-in fade-in slide-in-from-bottom-2">
                <div className="px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 bg-white/5 border-b border-white/5 flex justify-between items-center">
                    <span>{showMentions ? 'Summon Agent' : 'System Commands'}</span>
                    <span className="opacity-50">TAB to select</span>
                </div>
                <div ref={dropdownRef} className="max-h-60 overflow-y-auto no-scrollbar py-1">
                    {showMentions ? filteredAgents.map((agent, index) => (
                        <button
                            key={agent}
                            onClick={() => handleSelectAgent(agent)}
                            className={clsx(
                                "w-full text-left px-4 py-2.5 text-xs flex items-center gap-3 transition-all",
                                index === selectedIndex ? "bg-accent/10 text-white pl-6" : "text-white/40 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <KlettaIcon size={14} className={getAgentColor(agent)} />
                            <span className="font-semibold tracking-tight">{agent}</span>
                        </button>
                    )) : filteredCommands.map((cmd, index) => (
                        <button
                            key={cmd.name}
                            onClick={() => handleSelectCommand(cmd.name)}
                            className={clsx(
                                "w-full text-left px-4 py-3 text-xs flex items-center gap-3 transition-all",
                                index === selectedIndex ? "bg-accent/10 text-white pl-6" : "text-white/40 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <div className="p-1.5 rounded-lg bg-white/5">{cmd.icon}</div>
                            <div className="min-w-0">
                                <div className="font-bold tracking-tight text-white/90">/{cmd.name}</div>
                                <div className="text-[10px] opacity-50 truncate">{cmd.description}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        )}

        <div className="relative bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 focus-within:border-accent/50 focus-within:ring-1 focus-within:ring-accent/50 transition-all shadow-xl group/input">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={activeCompetition ? "Ask @scout to analyze rules or @coder to build a baseline..." : "Join a competition to start..."}
            disabled={!activeCompetition}
            className="w-full bg-transparent text-text py-2 px-4 pr-12 resize-none focus:outline-none min-h-[44px] max-h-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
            rows={1}
          />
          <button 
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping || !activeCompetition}
            className="absolute right-2 bottom-1 p-2 text-textMuted hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;