import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, AgentType, Competition, LLMKeys, Resource, Task } from '../types';
import { Send, User, Bot, Sparkles, MoreHorizontal, LayoutTemplate, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { generateAgentResponse } from '../services/geminiService';
import { NotebookCell } from './NotebookCell';

interface ChatAreaProps {
  messages: Message[];
  activeCompetition?: Competition;
  resources: Resource[];
  tasks: Task[];
  onSendMessage: (msg: Message) => void;
  onRegisterResource: (res: Omit<Resource, 'id'>) => void;
  onAddTask: (title: string) => void;
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
    onSendMessage, 
    onRegisterResource,
    onAddTask,
    setMessages, 
    llmKeys,
    kaggleCreds
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredAgents = AGENTS_LIST.filter(a => a.toLowerCase().includes(mentionFilter));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isTyping]);

  // Reset selection index when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [mentionFilter]);

  // Handle Input Changes to detect @mention
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtSymbolIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbolIndex !== -1) {
      // Check if there are spaces between @ and cursor (invalid mention start)
      const textAfterAt = textBeforeCursor.substring(lastAtSymbolIndex + 1);
      // Valid if no spaces, or if it's the start of the string
      if (!textAfterAt.includes(' ')) {
        setShowMentions(true);
        setMentionFilter(textAfterAt.toLowerCase());
        return;
      }
    }
    
    setShowMentions(false);
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
    setIsTyping(true);

    try {
        // Pass llmKeys here to enable fallback mechanism
        // Pass activeCompetition, resources, and tasks to inject context into system prompt
        // Pass kaggleCreds to enable Kaggle API tool calling
        const response = await generateAgentResponse(
            messages.concat(userMsg), 
            userMsg.content, 
            llmKeys, 
            activeCompetition,
            resources,
            tasks,
            kaggleCreds
        );

        let cleanText = response.text;

        // 1. Check for Resource Additions [ADD_RESOURCE: {...}]
        const resourceRegex = /\[ADD_RESOURCE:\s*({[\s\S]*?})\]/g;
        let resMatch;
        while ((resMatch = resourceRegex.exec(response.text)) !== null) {
            try {
                const resData = JSON.parse(resMatch[1]);
                onRegisterResource(resData);
                // Remove the tag from displayed text
                cleanText = cleanText.replace(resMatch[0], '');
            } catch (e) {
                console.error("Failed to parse agent resource addition:", e);
            }
        }

        // 2. Check for Task Additions [ADD_TASK: "..."]
        const taskRegex = /\[ADD_TASK:\s*"([\s\S]*?)"\]/g;
        let taskMatch;
        while ((taskMatch = taskRegex.exec(response.text)) !== null) {
            try {
                onAddTask(taskMatch[1]);
                cleanText = cleanText.replace(taskMatch[0], '');
            } catch (e) {
                console.error("Failed to parse agent task addition:", e);
            }
        }

        const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        agentType: response.agentType,
        content: cleanText.trim(),
        timestamp: new Date()
        };

        setMessages(prev => [...prev, agentMsg]);
    } catch (error) {
        // Fallback error message if everything failed
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
    // Handle dropdown navigation if visible
    if (showMentions && filteredAgents.length > 0) {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredAgents.length - 1));
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < filteredAgents.length - 1 ? prev + 1 : 0));
            return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            handleSelectAgent(filteredAgents[selectedIndex]);
            return;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            setShowMentions(false);
            return;
        }
    }

    // Handle normal send
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
    <div className="flex flex-col h-full bg-background relative">
      {/* Header */}
      <div className="p-4 border-b border-surfaceHighlight flex items-center justify-between bg-surface/50 backdrop-blur-sm z-10 h-16">
        <div className="flex items-center gap-3 overflow-hidden">
           <h1 className="text-base font-semibold text-text truncate">{activeCompetition.name}</h1>
           <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent text-[10px] uppercase tracking-wider font-medium flex-shrink-0">Active</span>
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
        <button className="p-2 text-textMuted hover:text-text rounded-md hover:bg-surfaceHighlight/50">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
             <div className="w-16 h-16 rounded-full bg-surfaceHighlight/40 flex items-center justify-center">
               <Bot size={28} className="text-accent" />
             </div>
             <div className="space-y-2">
               <p className="text-sm font-medium text-text">Say hello to your agent team</p>
               <p className="text-xs text-textMuted max-w-sm leading-relaxed">
                 Use <code className="bg-black/20 px-1 py-0.5 rounded">@scout</code> to summarize rules, <code className="bg-black/20 px-1 py-0.5 rounded">@coder</code> for baseline code, or ask anything about {activeCompetition.name}.
               </p>
             </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={clsx(
                "flex gap-4 max-w-3xl mx-auto",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              {/* Avatar */}
              <div className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 shadow-sm",
                msg.role === 'user' ? "bg-surfaceHighlight/80" : "bg-surface border border-surfaceHighlight"
              )}>
                {msg.role === 'user' ? (
                  <User size={16} className="text-textMuted" />
                ) : (
                  <Bot size={16} className={getAgentColor(msg.agentType)} />
                )}
              </div>

              {/* Content */}
              <div className={clsx(
                "flex-1 rounded-2xl p-4 text-sm leading-relaxed shadow-sm",
                msg.role === 'user' ? "bg-surfaceHighlight/40 text-text" : "bg-surface text-textMuted"
              )}>
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
                        p: ({node, ...props}) => <p className="leading-relaxed" {...props} />
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
          <div className="flex gap-4 max-w-3xl mx-auto">
            <div className="w-8 h-8 rounded-lg bg-surface border border-surfaceHighlight flex items-center justify-center flex-shrink-0 mt-1">
               <Sparkles size={16} className="text-accent animate-spin" />
            </div>
            <div className="bg-surface rounded-2xl p-4 text-sm text-textMuted flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-textMuted rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
              <span className="w-1.5 h-1.5 bg-textMuted rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
              <span className="w-1.5 h-1.5 bg-textMuted rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 max-w-3xl mx-auto w-full relative">
        {/* Mentions Autocomplete Popup */}
        {showMentions && filteredAgents.length > 0 && (
            <div className="absolute bottom-full left-4 mb-2 w-64 bg-surface border border-surfaceHighlight rounded-lg shadow-xl overflow-hidden z-20 animate-in fade-in slide-in-from-bottom-2">
                <div className="px-3 py-2 text-xs font-semibold text-textMuted bg-surfaceHighlight/30 border-b border-surfaceHighlight flex justify-between items-center">
                    <span>Mention an Agent</span>
                    <span className="text-[10px] opacity-70">↑↓ to navigate</span>
                </div>
                <div ref={dropdownRef} className="max-h-48 overflow-y-auto">
                    {filteredAgents.map((agent, index) => (
                        <button
                            key={agent}
                            onClick={() => handleSelectAgent(agent)}
                            className={clsx(
                                "w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors",
                                index === selectedIndex ? "bg-accent/20 text-text" : "text-textMuted hover:bg-surfaceHighlight/50 hover:text-text"
                            )}
                        >
                            <Bot size={14} className={getAgentColor(agent)} />
                            {agent}
                        </button>
                    ))}
                </div>
            </div>
        )}

        <div className="relative bg-surface rounded-xl border border-surfaceHighlight focus-within:border-accent/50 focus-within:ring-1 focus-within:ring-accent/50 transition-all shadow-lg">
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