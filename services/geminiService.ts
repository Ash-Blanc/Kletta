import { GoogleGenAI, Type } from "@google/genai";
import { Message, AgentType, Resource, LLMKeys, AIProvider, SearchFilters, Competition, Task, KaggleCredentials } from '../types';
import { searchCompetitions, searchDatasets } from './kaggleService';

const SYSTEM_INSTRUCTION = `
You are "Kletta", a sophisticated AI agent workspace designed to win Kaggle competitions.
You are powered by "Letta", allowing you to have persistent memory of the competition state, data quirks, and experiment history.

You consist of specialized sub-agents. Adopt the persona of the most relevant agent:

AGENTS:
1. Scout (@scout): Competition analyst. Reads rules, understands metrics, analyzes datasets. Proactively adds tasks related to data understanding.
2. Researcher (@researcher): Academic expert. Finds SOTA papers (arXiv), GitHub repos, and libraries. Adds found resources to the workspace.
3. Strategist (@strategist): Project lead. Prioritizes tasks, manages time/submissions. Responsible for the overall roadmap and initialization.
4. Coder (@coder): Python expert. Writes PyTorch/TensorFlow/XGBoost code, pipelines.
5. Experimenter (@experimenter): MLOps. Runs training, tracks CV vs LB scores.
6. Analyst (@analyst): Data Scientist. EDA, feature importance, error analysis.
7. Ensemble (@ensemble): Meta-learner. Stacking/blending strategies.

FORMATTING RULES:
- Use Markdown.
- Start responses with the persona name if switching context (e.g., "🧬 **Researcher:**").
- Be high-performance oriented. Focus on CV improvement, Leaderboard (LB) climbing, and novel techniques.
- When citing papers or code, provide links if available from search.
- **IMPORTANT**: When writing code (especially as @coder), ALWAYS use labeled code blocks (e.g., \`\`\`python ... \`\`\`). Do not output plain text code.
- **BE CONCISE**: Minimize conversational fluff. Focus on insights and actions.

WORKSPACE CONTROL:
You can autonomously update the user's workspace by including these blocks at the END of your message:
- To add a resource: [ADD_RESOURCE: {"title": "Paper/Repo Title", "type": "paper|library|dataset", "url": "https://...", "summary": "Why it matters"}]
- To add a task: [ADD_TASK: "Specific objective description"]

MEMORY & CONTEXT:
- You remember the competition details, current CV scores, and tried techniques.
- You have access to the resources and tasks listed in the context below. Use them to inform your suggestions.
- **INITIALIZATION**: If you are starting a new competition, immediately use [ADD_TASK] to create an initial roadmap (EDA, Baseline, Cross-Validation setup).
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

const buildSystemPrompt = (baseSystem: string, competition?: Competition, resources: Resource[] = [], tasks: Task[] = []): string => {
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
===================================

Use this context to answer questions immediately. Do NOT ask the user for information already provided above.
`;
  return `${baseSystem}\n${contextBlock}`;
};

// --- Providers ---

async function callGemini(history: Message[], prompt: string, apiKey: string, competition?: Competition, resources: Resource[] = [], tasks: Task[] = [], kaggleCreds?: KaggleCredentials | null): Promise<string> {
    const ai = new GoogleGenAI({ apiKey });
    // Using flash for general chat to avoid limits, user can tweak in future
    const model = 'gemini-2.0-flash-exp'; 

    const recentHistory = history.slice(-10).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const systemInstruction = buildSystemPrompt(SYSTEM_INSTRUCTION, competition, resources, tasks);

    const tools = [
        { googleSearch: {} },
        {
            functionDeclarations: [
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
                }
            ]
        }
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

async function callOpenAI(history: Message[], prompt: string, apiKey: string, competition?: Competition, resources: Resource[] = [], tasks: Task[] = []): Promise<string> {
    const systemInstruction = buildSystemPrompt(SYSTEM_INSTRUCTION, competition, resources, tasks);
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

async function callOpenRouter(history: Message[], prompt: string, apiKey: string, competition?: Competition, resources: Resource[] = [], tasks: Task[] = []): Promise<string> {
    const systemInstruction = buildSystemPrompt(SYSTEM_INSTRUCTION, competition, resources, tasks);
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

async function callCerebras(history: Message[], prompt: string, apiKey: string, competition?: Competition, resources: Resource[] = [], tasks: Task[] = []): Promise<string> {
    const systemInstruction = buildSystemPrompt(SYSTEM_INSTRUCTION, competition, resources, tasks);
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

async function callGroq(history: Message[], prompt: string, apiKey: string, competition?: Competition, resources: Resource[] = [], tasks: Task[] = []): Promise<string> {
    const systemInstruction = buildSystemPrompt(SYSTEM_INSTRUCTION, competition, resources, tasks);
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

export const generateAgentResponse = async (history: Message[], userPrompt: string, keys?: LLMKeys, competition?: Competition, resources: Resource[] = [], tasks: Task[] = [], kaggleCreds?: KaggleCredentials | null): Promise<{ text: string, agentType: AgentType }> => {
    
    // 1. Determine Target Agent
    let targetAgent: AgentType | null = null;
    const lowerPrompt = userPrompt.toLowerCase();
    
    for (const [trigger, agent] of Object.entries(AGENT_MENTIONS)) {
      if (lowerPrompt.includes(trigger)) {
        targetAgent = agent;
        break;
      }
    }

    let effectivePrompt = userPrompt;
    if (targetAgent) {
      effectivePrompt = `[SYSTEM: The user has explicitly summoned the ${targetAgent} agent. Switch to this persona immediately.]\n\n${userPrompt}`;
    }

    let text = "";
    const errors: string[] = [];

    // 2. Chain of Responsibility (Prioritized)
    
    // Define all providers
    const providers = [
        { id: 'gemini' as AIProvider, func: callGemini, key: keys?.gemini },
        { id: 'openrouter' as AIProvider, func: callOpenRouter, key: keys?.openRouter },
        { id: 'openai' as AIProvider, func: callOpenAI, key: keys?.openAI },
        { id: 'cerebras' as AIProvider, func: callCerebras, key: keys?.cerebras },
        { id: 'groq' as AIProvider, func: callGroq, key: keys?.groq }
    ];

    // Sort: Preferred provider first, then others
    const preferred = keys?.provider || 'gemini';
    const sortedProviders = providers.sort((a, b) => {
        if (a.id === preferred) return -1;
        if (b.id === preferred) return 1;
        return 0;
    });

    // Execute in order
    for (const provider of sortedProviders) {
        if (provider.key && !text) {
            try {
                // console.log(`Attempting ${provider.id}...`);
                text = await provider.func(history, effectivePrompt, provider.key, competition, resources, tasks, kaggleCreds);
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

export const findCompetition = async (query: string, keys?: LLMKeys): Promise<{ name: string, description: string, url: string, tags: string[] } | null> => {
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