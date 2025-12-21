import { GoogleGenAI, Type } from "@google/genai";
import { Message, AgentType, Resource, LLMKeys, AIProvider, SearchFilters, Competition, Task, KaggleCredentials, AgentConfig, MCPServer, MemoryBlock } from '../types';
import { searchCompetitions, searchDatasets, fetchLeaderboard, fetchDatasetFiles, fetchKernels, fetchKernelStatus, fetchKernelOutput } from './kaggleService';
import { BASE_KLETTA_INSTRUCTION, DEFAULT_AGENT_PROMPTS } from './agentPrompts';
import { callRemoteMCP } from './mcpService';

const SYSTEM_INSTRUCTION = `
You are "Kletta", a sophisticated AI agent workspace designed to win modern "Featured" Kaggle competitions.
You are powered by "Letta", providing persistent memory of the competition state and research history.

You consist of specialized sub-agents. Adopt the persona of the most relevant agent:

AGENTS:
1. Scout (@scout): Challenge deconstructor. Analyzes core constraints and specialized metrics. Proactively adds tasks for problem framing.
2. Researcher (@researcher): SOTA specialist. Scours arXiv and GitHub for cutting-edge techniques and architectures. 
3. Strategist (@strategist): Solution architect. Manages the high-level roadmap and "Zero-to-One" implementation.
4. Coder (@coder): Systems Engineer. Writes robust, optimized implementations of SOTA models and research pipelines.
5. Experimenter (@experimenter): Performance optimizer. Conducts ablation studies and tracks scaling behaviors.
6. Analyst (@analyst): Failure mode analyst. Performs deep error analysis on model predictions and edge cases.
7. Ensemble (@ensemble): Diversity meta-learner. Merges fundamentally different architectures.

FORMATTING RULES:
- Use Markdown.
- Start responses with the persona name (e.g., "🧬 **Researcher:**").
- Be high-performance oriented. Focus on SOTA research, architecture design, and metric optimization.
- Forget traditional ML fluff (standard EDA, generic FE). Focus on the core algorithmic breakthrough.
- **IMPORTANT**: When writing code, ALWAYS use labeled code blocks.

WORKSPACE CONTROL:
You can autonomously update the user's workspace by including these blocks at the END of your message:
- To add a resource: [ADD_RESOURCE: {"title": "Paper/Repo Title", "type": "paper|library|dataset", "url": "https://...", "summary": "Why it matters"}]
- To add a task: [ADD_TASK: "Specific objective description"]
- To remove a task: [REMOVE_TASK: "Specific objective description"]
- To reset the entire plan: [CLEAR_PLAN]
- To update persistent memory: [UPDATE_MEMORY: {"label": "Key Insight Name", "value": "Detailed discovery or state update"}]

MEMORY & CONTEXT:
- You remember the competition details, current scores, and research findings.
- You have access to the resources, tasks, and memory blocks listed in the context below.
- **INITIALIZATION**: If you are starting a new competition, immediately use [ADD_TASK] to create a research-heavy roadmap (Literature Review, SOTA Mapping, Core Architecture Design).
`;

const AGENT_MENTIONS: Record<string, AgentType> = {
  '@scout': AgentType.Scout,
  '@researcher': AgentType.Researcher,
  '@strategist': AgentType.Strategist,
  '@coder': AgentType.Coder,
  '@experimenter': AgentType.Experimenter,
  '@analyst': AgentType.Analyst,
  '@ensemble': AgentType.Ensemble,
};

// --- Context Helper ---

const buildSystemPrompt = (baseSystem: string, competition?: Competition, resources: Resource[] = [], tasks: Task[] = [], memory: MemoryBlock[] = []): string => {
  if (!competition) return baseSystem;

  const contextBlock = `
=== CURRENT COMPETITION CONTEXT ===
Name: ${competition.name}
Description: ${competition.description}
URL: ${competition.url || 'N/A'}
Tags: ${competition.tags.join(', ')}
Status: ${competition.status} (${competition.lastActive})

=== WORKSPACE RESOURCES ===
${resources.length > 0 ? resources.map(r => `- [${r.type.toUpperCase()}] ${r.title} (${r.url || 'No link'})`).join('\n') : 'No resources collected yet.'}

=== ACTIVE PLAN (TASKS) ===
${tasks.length > 0 ? tasks.map(t => `- [${t.status.toUpperCase()}] ${t.title}`).join('\n') : 'No tasks in plan yet.'}

=== PERSISTENT MEMORY ===
${memory.length > 0 ? memory.map(m => `- [${m.label}] ${m.value} (Updated: ${m.lastUpdated})`).join('\n') : 'No persistent memory blocks yet.'}
===================================

Use this context to answer questions immediately. Do NOT ask the user for information already provided above.
`;
  return `${baseSystem}\n${contextBlock}`;
};

// --- Providers ---

async function callGemini(history: Message[], prompt: string, apiKey: string, competition?: Competition, resources: Resource[] = [], tasks: Task[] = [], kaggleCreds?: KaggleCredentials | null, baseSystem: string = SYSTEM_INSTRUCTION, agentConfig?: AgentConfig, mcpServers: MCPServer[] = [], memory: MemoryBlock[] = []): Promise<string> {
    const ai = new GoogleGenAI({ apiKey });
    // Using flash for general chat to avoid limits, user can tweak in future
    const model = 'gemini-2.0-flash-exp'; 

    const recentHistory = history.slice(-10).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const systemInstruction = buildSystemPrompt(baseSystem, competition, resources, tasks, memory);

    // Dynamic Tool Construction based on Agent Config
    const functionDeclarations: any[] = [
        {
            name: "search_kaggle_competitions",
            description: "Search for Kaggle competitions by keyword or query.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    query: { type: Type.STRING, description: "The search query (e.g. 'titanic', 'image classification')." }
                },
                required: ["query"]
            }
        },
        {
            name: "search_kaggle_datasets",
            description: "Search for Kaggle datasets by keyword or query.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    query: { type: Type.STRING, description: "The search query (e.g. 'housing prices', 'nlp datasets')." }
                },
                required: ["query"]
            }
        },
        {
            name: "get_competition_leaderboard",
            description: "Retrieve the current public leaderboard for a competition.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    competition_id: { type: Type.STRING, description: "The Kaggle ID (ref) of the competition." }
                },
                required: ["competition_id"]
            }
        },
        {
            name: "list_dataset_files",
            description: "List the files and their sizes within a specific Kaggle dataset.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    dataset_id: { type: Type.STRING, description: "The Kaggle ID (ref) of the dataset (e.g. 'shivamb/netflix-shows')." }
                },
                required: ["dataset_id"]
            }
        },
        {
            name: "list_kaggle_kernels",
            description: "Search for or list Kaggle kernels (notebooks).",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    search: { type: Type.STRING, description: "Optional: Search query." },
                    mine: { type: Type.BOOLEAN, description: "Optional: If true, only list your own kernels." },
                    competition: { type: Type.STRING, description: "Optional: Limit to a specific competition ref." }
                }
            }
        },
        {
            name: "get_kernel_status",
            description: "Check the current execution status of a Kaggle kernel.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    kernel_id: { type: Type.STRING, description: "The Kaggle ref of the kernel." }
                },
                required: ["kernel_id"]
            }
        },
        {
            name: "get_kernel_output",
            description: "Retrieve the output logs (stdout/stderr) from a Kaggle kernel execution.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    kernel_id: { type: Type.STRING, description: "The Kaggle ref of the kernel." }
                },
                required: ["kernel_id"]
            }
        }
    ];

    // Add MCP tools if configured for this agent
    const activeServers = mcpServers.filter(s => agentConfig?.mcpIds?.includes(s.id));
    
    if (activeServers.length > 0) {
        // For simplicity, we add the standard package search tools if any MCP is active
        // In a more advanced version, we would call tools/list on the MCP server first
        functionDeclarations.push(
            {
                name: "package_search_grep",
                description: "Execute a grep over the source code of a public package.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        registry_name: { type: Type.STRING, description: "crates_io, golang_proxy, npm, or py_pi" },
                        package_name: { type: Type.STRING, description: "Name of the package" },
                        pattern: { type: Type.STRING, description: "Regex pattern" }
                    },
                    required: ["registry_name", "package_name", "pattern"]
                }
            },
            {
                name: "package_search_read_file",
                description: "Reads exact lines from a source file of a public package.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        registry_name: { type: Type.STRING },
                        package_name: { type: Type.STRING },
                        filename_sha256: { type: Type.STRING },
                        start_line: { type: Type.NUMBER },
                        end_line: { type: Type.NUMBER }
                    },
                    required: ["registry_name", "package_name", "filename_sha256", "start_line", "end_line"]
                }
            },
            {
                name: "package_search_hybrid",
                description: "Searches package source code using semantic understanding.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        registry_name: { type: Type.STRING },
                        package_name: { type: Type.STRING },
                        semantic_queries: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["registry_name", "package_name", "semantic_queries"]
                }
            }
        );
    }

    const tools = [
        { googleSearch: {} },
        { functionDeclarations }
    ];

    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: systemInstruction,
        tools: tools,
      },
      history: recentHistory
    });

    let result = await chat.sendMessage({ message: prompt });
    
    // Handle Function Calling turns
    while (result.functionCalls && result.functionCalls.length > 0) {
        const toolResults = [];
        
        for (const call of result.functionCalls) {
            if (call.name === "search_kaggle_competitions") {
                const query = (call.args as any).query;
                const comps = await searchCompetitions(query, kaggleCreds || null);
                toolResults.push({
                    functionResponse: {
                        name: "search_kaggle_competitions",
                        response: { content: comps.map(c => ({ name: c.name, url: c.url, tags: c.tags, description: c.description })) }
                    }
                });
            } else if (call.name === "search_kaggle_datasets") {
                const query = (call.args as any).query;
                const datasets = await searchDatasets(query, kaggleCreds || null);
                toolResults.push({
                    functionResponse: {
                        name: "search_kaggle_datasets",
                        response: { content: datasets.map(d => ({ title: d.title, url: d.url, summary: d.summary })) }
                    }
                });
            } else if (call.name === "get_competition_leaderboard") {
                const id = (call.args as any).competition_id;
                const lb = await fetchLeaderboard(id, kaggleCreds || null);
                toolResults.push({
                    functionResponse: {
                        name: "get_competition_leaderboard",
                        response: { content: lb.slice(0, 20) } // Limit to top 20
                    }
                });
            } else if (call.name === "list_dataset_files") {
                const id = (call.args as any).dataset_id;
                const files = await fetchDatasetFiles(id, kaggleCreds || null);
                toolResults.push({
                    functionResponse: {
                        name: "list_dataset_files",
                        response: { content: files }
                    }
                });
            } else if (call.name === "list_kaggle_kernels") {
                const args = call.args as any;
                const kernels = await fetchKernels(kaggleCreds || null, args);
                toolResults.push({
                    functionResponse: {
                        name: "list_kaggle_kernels",
                        response: { content: kernels }
                    }
                });
            } else if (call.name === "get_kernel_status") {
                const id = (call.args as any).kernel_id;
                const status = await fetchKernelStatus(id, kaggleCreds || null);
                toolResults.push({
                    functionResponse: {
                        name: "get_kernel_status",
                        response: { content: status }
                    }
                });
            } else if (call.name === "get_kernel_output") {
                const id = (call.args as any).kernel_id;
                const output = await fetchKernelOutput(id, kaggleCreds || null);
                toolResults.push({
                    functionResponse: {
                        name: "get_kernel_output",
                        response: { content: output }
                    }
                });
            } else if (call.name.startsWith("package_search_")) {
                // Find first server that supports package search (currently all active ones)
                const server = activeServers[0];
                if (server) {
                    try {
                        const mcpResult = await callRemoteMCP(server, call.name, call.args);
                        toolResults.push({
                            functionResponse: {
                                name: call.name,
                                response: { content: mcpResult }
                            }
                        });
                    } catch (e: any) {
                        toolResults.push({
                            functionResponse: {
                                name: call.name,
                                response: { error: e.message }
                            }
                        });
                    }
                }
            }
        }
        
        if (toolResults.length > 0) {
            result = await chat.sendMessage({ message: toolResults });
        } else {
            break;
        }
    }

    if (!result.text) throw new Error("Gemini returned empty response");
    return result.text;
}

async function callOpenAI(history: Message[], prompt: string, apiKey: string, competition?: Competition, resources: Resource[] = [], tasks: Task[] = [], kaggleCreds?: KaggleCredentials | null, baseSystem: string = SYSTEM_INSTRUCTION, agentConfig?: AgentConfig, mcpServers: MCPServer[] = [], memory: MemoryBlock[] = []): Promise<string> {
    const systemInstruction = buildSystemPrompt(baseSystem, competition, resources, tasks, memory);
    const messages = [
        { role: 'system', content: systemInstruction },
        ...history.slice(-10).map(msg => ({
            role: msg.role === 'agent' ? 'assistant' : msg.role,
            content: msg.content
        })),
        { role: 'user', content: prompt }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o', // Default to 4o for OpenAI direct
            messages: messages,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI Error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

async function callOpenRouter(history: Message[], prompt: string, apiKey: string, competition?: Competition, resources: Resource[] = [], tasks: Task[] = [], kaggleCreds?: KaggleCredentials | null, baseSystem: string = SYSTEM_INSTRUCTION, agentConfig?: AgentConfig, mcpServers: MCPServer[] = [], memory: MemoryBlock[] = []): Promise<string> {
    const systemInstruction = buildSystemPrompt(baseSystem, competition, resources, tasks, memory);
    const messages = [
        { role: 'system', content: systemInstruction },
        ...history.slice(-10).map(msg => ({
            role: msg.role === 'agent' ? 'assistant' : msg.role,
            content: msg.content
        })),
        { role: 'user', content: prompt }
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://kletta.app', // Required by OpenRouter
            'X-Title': 'Kletta'
        },
        body: JSON.stringify({
            model: 'anthropic/claude-3.5-sonnet', // Premium default for OpenRouter users
            messages: messages
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenRouter Error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

async function callCerebras(history: Message[], prompt: string, apiKey: string, competition?: Competition, resources: Resource[] = [], tasks: Task[] = [], kaggleCreds?: KaggleCredentials | null, baseSystem: string = SYSTEM_INSTRUCTION, agentConfig?: AgentConfig, mcpServers: MCPServer[] = [], memory: MemoryBlock[] = []): Promise<string> {
    const systemInstruction = buildSystemPrompt(baseSystem, competition, resources, tasks, memory);
    const messages = [
        { role: 'system', content: systemInstruction },
        ...history.slice(-10).map(msg => ({
            role: msg.role === 'agent' ? 'assistant' : msg.role,
            content: msg.content
        })),
        { role: 'user', content: prompt }
    ];

    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b',
            messages: messages,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Cerebras Error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

async function callGroq(history: Message[], prompt: string, apiKey: string, competition?: Competition, resources: Resource[] = [], tasks: Task[] = [], kaggleCreds?: KaggleCredentials | null, baseSystem: string = SYSTEM_INSTRUCTION, agentConfig?: AgentConfig, mcpServers: MCPServer[] = [], memory: MemoryBlock[] = []): Promise<string> {
    const systemInstruction = buildSystemPrompt(baseSystem, competition, resources, tasks, memory);
    const messages = [
        { role: 'system', content: systemInstruction },
        ...history.slice(-10).map(msg => ({
            role: msg.role === 'agent' ? 'assistant' : msg.role,
            content: msg.content
        })),
        { role: 'user', content: prompt }
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: messages,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Groq Error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// --- Main Handler ---

export const generateAgentResponse = async (history: Message[], userPrompt: string, keys?: LLMKeys, competition?: Competition, resources: Resource[] = [], tasks: Task[] = [], kaggleCreds?: KaggleCredentials | null, memory: MemoryBlock[] = []): Promise<{ text: string, agentType: AgentType }> => {
    
    // 1. Determine Target Agent
    let targetAgent: AgentType | null = null;
    const lowerPrompt = userPrompt.toLowerCase();
    
    for (const [trigger, agent] of Object.entries(AGENT_MENTIONS)) {
      if (lowerPrompt.includes(trigger)) {
        targetAgent = agent;
        break;
      }
    }

    // 2. Lookup Configuration
    const activeAgentType = targetAgent || AgentType.Strategist;
    const agentConfig = keys?.agentConfigs?.[activeAgentType];

    let effectivePrompt = userPrompt;
    if (targetAgent) {
      effectivePrompt = `[SYSTEM: The user has explicitly summoned the ${targetAgent} agent. Switch to this persona immediately.]\n\n${userPrompt}`;
    }

    let text = "";
    const errors: string[] = [];

    // 3. Chain of Responsibility (Prioritized)
    
    // Define all base providers
    const allProviders = [
        { id: 'gemini' as AIProvider, func: callGemini, key: keys?.gemini },
        { id: 'openrouter' as AIProvider, func: callOpenRouter, key: keys?.openRouter },
        { id: 'openai' as AIProvider, func: callOpenAI, key: keys?.openAI },
        { id: 'cerebras' as AIProvider, func: callCerebras, key: keys?.cerebras },
        { id: 'groq' as AIProvider, func: callGroq, key: keys?.groq }
    ];

    // Determine Provider Order
    let providerOrder: AIProvider[] = [];
    const PROVIDERS: AIProvider[] = ['gemini', 'openrouter', 'openai', 'cerebras', 'groq'];
    
    if (agentConfig?.preferredProvider) {
        providerOrder.push(agentConfig.preferredProvider);
        if (agentConfig.fallbackProviders && agentConfig.fallbackProviders.length > 0) {
            // Add explicitly configured fallbacks
            agentConfig.fallbackProviders.forEach(p => {
                if (!providerOrder.includes(p)) providerOrder.push(p);
            });
        }
    } else {
        providerOrder.push(keys?.provider || 'gemini');
    }

    // Fill in remaining providers to ensure robustness (global chain)
    PROVIDERS.forEach(p => {
        if (!providerOrder.includes(p)) providerOrder.push(p);
    });

    const sortedProviders = providerOrder
        .map(id => allProviders.find(ap => ap.id === id))
        .filter((p): p is typeof allProviders[0] => !!p);

    // 4. Construct Final System Prompt
    // Priority: Custom Prompt > Type Default Prompt > Global Instruction
    const typePrompt = DEFAULT_AGENT_PROMPTS[activeAgentType] || "";
    const specificInstruction = agentConfig?.customPrompt || typePrompt;
    const finalBaseSystem = `${BASE_KLETTA_INSTRUCTION}\n${specificInstruction}`;

    // Execute in order
    for (const provider of sortedProviders) {
        if (provider.key && !text) {
            try {
                // We need to pass the custom baseSystem down
                // Modifying provider functions to accept baseSystem
                text = await provider.func(history, effectivePrompt, provider.key, competition, resources, tasks, kaggleCreds, finalBaseSystem, agentConfig, keys?.mcpServers || [], memory);
            } catch (e: any) {
                console.warn(`${provider.id} Failed:`, e);
                errors.push(`${provider.id}: ${e.message}`);
            }
        }
    }

    if (!text) {
        // If no keys provided at all, or all failed
        if (!keys?.gemini && !keys?.openRouter && !keys?.openAI && !keys?.cerebras && !keys?.groq) {
            return {
                text: "⚠️ **Configuration Error:** No API keys found. Please go to Settings and configure Gemini, OpenRouter, OpenAI, Cerebras, or Groq.",
                agentType: AgentType.Strategist
            };
        }
        return {
            text: `⚠️ **System Error:** Failed to generate response from all configured providers.\n\nErrors:\n${errors.map(e => `- ${e}`).join('\n')}`,
            agentType: AgentType.Strategist
        };
    }

    // 3. Post-Process Agent Detection
    let detectedAgent = targetAgent || AgentType.Strategist;
    if (!targetAgent) {
        const lowerText = text.toLowerCase();
        if (lowerText.includes('scout')) detectedAgent = AgentType.Scout;
        else if (lowerText.includes('researcher')) detectedAgent = AgentType.Researcher;
        else if (lowerText.includes('coder')) detectedAgent = AgentType.Coder;
        else if (lowerText.includes('analyst')) detectedAgent = AgentType.Analyst;
        else if (lowerText.includes('experimenter')) detectedAgent = AgentType.Experimenter;
        else if (lowerText.includes('ensemble')) detectedAgent = AgentType.Ensemble;
    }

    return { text, agentType: detectedAgent };
};

// --- Helper Functions (Updated for fallback) ---

// Helper to execute a structured query across providers
async function executeStructuredQuery(
    keys: LLMKeys | undefined,
    geminiPrompt: string,
    fallbackSystem: string,
    fallbackUser: string
): Promise<any | null> {
    
    const providers = [
        { 
            id: 'gemini' as AIProvider, 
            key: keys?.gemini,
            run: async (k: string) => {
                const ai = new GoogleGenAI({ apiKey: k });
                const response = await ai.models.generateContent({
                    model: "gemini-2.0-flash-exp",
                    contents: geminiPrompt,
                    config: { responseMimeType: "application/json" } // Don't enforce schema strictly to allow partial recovery
                });
                return response.text ? JSON.parse(response.text) : null;
            }
        },
        { 
            id: 'openrouter' as AIProvider, 
            key: keys?.openRouter,
            run: async (k: string) => {
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${k}`,
                        'HTTP-Referer': 'https://kletta.app',
                        'X-Title': 'Kletta'
                    },
                    body: JSON.stringify({
                        model: 'google/gemini-2.0-flash-001', // Use a cheaper/faster model for tools
                        messages: [
                            { role: 'system', content: fallbackSystem },
                            { role: 'user', content: fallbackUser }
                        ],
                        response_format: { type: "json_object" }
                    })
                });
                const data = await response.json();
                return JSON.parse(data.choices[0].message.content);
            }
        },
        { 
            id: 'openai' as AIProvider, 
            key: keys?.openAI,
            run: async (k: string) => {
                 const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${k}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [
                            { role: 'system', content: fallbackSystem },
                            { role: 'user', content: fallbackUser }
                        ],
                        response_format: { type: "json_object" }
                    })
                });
                const data = await response.json();
                return JSON.parse(data.choices[0].message.content);
            }
        },
        { 
            id: 'cerebras' as AIProvider, 
            key: keys?.cerebras,
            run: async (k: string) => {
                 const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${k}`
                    },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b',
                        messages: [
                            { role: 'system', content: fallbackSystem },
                            { role: 'user', content: fallbackUser }
                        ],
                        response_format: { type: "json_object" }
                    })
                });
                const data = await response.json();
                return JSON.parse(data.choices[0].message.content);
            }
        },
        { 
            id: 'groq' as AIProvider, 
            key: keys?.groq,
            run: async (k: string) => {
                 const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${k}`
                    },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b-versatile',
                        messages: [
                            { role: 'system', content: fallbackSystem },
                            { role: 'user', content: fallbackUser }
                        ],
                        response_format: { type: "json_object" }
                    })
                });
                const data = await response.json();
                return JSON.parse(data.choices[0].message.content);
            }
        }
    ];

    const preferred = keys?.provider || 'gemini';
    const sorted = providers.sort((a, b) => {
        if (a.id === preferred) return -1;
        if (b.id === preferred) return 1;
        return 0;
    });

    for (const provider of sorted) {
        if (provider.key) {
            try {
                return await provider.run(provider.key);
            } catch (e) {
                console.warn(`${provider.id} structured query failed:`, e);
            }
        }
    }
    return null;
}

export const findCompetition = async (query: string, keys?: LLMKeys, kaggleCreds?: KaggleCredentials | null): Promise<{ name: string, description: string, url: string, tags: string[] } | null> => {
    // We now use the main response generator turn to allow tool usage during scouting
    try {
        const history: Message[] = [];
        const scoutPrompt = `Find the exact Kaggle competition details for: "${query}". 
        Use the search_kaggle_competitions tool to get the real URL and metadata. 
        Return ONLY a JSON object with keys: name, description, url, tags. 
        Do not include markdown blocks, just the raw JSON string.`;

        const response = await generateAgentResponse(history, scoutPrompt, keys, undefined, [], [], kaggleCreds);
        
        // Try to parse JSON from the agent's text response
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (e) {
        console.warn("AI Scout failed, falling back to structured query:", e);
    }

    // Legacy fallback if the tool-enabled turn fails
    return executeStructuredQuery(
        keys,
        `Find the details for the Kaggle competition matching: "${query}". Return a JSON object with keys: name, description, url, tags. Tags should be an array of strings.`,
        'You are a JSON generator. Return ONLY raw JSON. keys: name, description, url, tags.',
        `Find Kaggle competition details for "${query}".`
    );
};

export const findResources = async (filters: SearchFilters, keys?: LLMKeys): Promise<Resource[]> => {
    // Construct constraint string
    const constraints = [];
    if (filters.language) constraints.push(`Language: ${filters.language}`);
    if (filters.minStars) constraints.push(`Minimum GitHub Stars: ${filters.minStars}`);
    if (filters.lastUpdated) constraints.push(`Updated: ${filters.lastUpdated}`);
    
    const constraintStr = constraints.length > 0 ? `\nConstraints:\n- ${constraints.join('\n- ')}` : '';

    const geminiPrompt = `Find 4 high-quality resources (academic papers or GitHub libraries/code) for the topic "${filters.topic}".${constraintStr}\n\nReturn a JSON array of objects with keys: title, type (paper|library), url, summary, stars (if applicable), language (if applicable), updated (if applicable).`;
    
    const fallbackUser = `List 4 real academic papers or GitHub libraries for "${filters.topic}".${constraintStr}`;

    const result = await executeStructuredQuery(
        keys,
        geminiPrompt,
        'You are a JSON generator. Return ONLY raw JSON array. Keys: title, type, url, summary, stars, language, updated.',
        fallbackUser
    );

    if (result) {
        // Handle wrapper object if present
        const list = Array.isArray(result) ? result : (result.resources || result.items || []);
        return list.map((item: any, i: number) => ({
            id: `res-${Date.now()}-${i}`,
            title: item.title,
            type: item.type,
            url: item.url,
            summary: item.summary,
            metadata: {
                stars: item.stars,
                language: item.language,
                updated: item.updated
            }
        }));
    }
    return [];
};