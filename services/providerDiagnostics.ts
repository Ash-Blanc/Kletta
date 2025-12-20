import { GoogleGenAI } from '@google/genai';
import { LLMKeys, AIProvider } from '../types';

const PROVIDER_LABELS: Record<AIProvider, string> = {
  gemini: 'Google Gemini',
  openrouter: 'OpenRouter',
  openai: 'OpenAI',
};

const withTimeout = async <T>(promise: Promise<T>, timeout = 15000): Promise<T> => {
  let timer: number | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error('Timed out after 15s')), timeout);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const testGemini = async (apiKey?: string) => {
  if (!apiKey) {
    throw new Error('Missing Google Gemini API key.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await withTimeout(
    ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: 'Health check from Kletta.',
    })
  );

  if (!response.text) {
    throw new Error('Gemini returned an empty response.');
  }

  return 'Gemini responded successfully.';
};

const testOpenAI = async (apiKey?: string) => {
  if (!apiKey) {
    throw new Error('Missing OpenAI API key.');
  }

  const response = await withTimeout(
    fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a health check for Kletta workspace.' },
          { role: 'user', content: 'Respond with READY if you can see this.' },
        ],
        max_tokens: 5,
      }),
    })
  );

  if (!response.ok) {
    const errDetails = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${errDetails}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned an empty response.');
  }

  return 'OpenAI responded successfully.';
};

const testOpenRouter = async (apiKey?: string) => {
  if (!apiKey) {
    throw new Error('Missing OpenRouter API key.');
  }

  const response = await withTimeout(
    fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://kletta.app',
        'X-Title': 'Kletta Diagnostics',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: 'You are a health check for Kletta workspace.' },
          { role: 'user', content: 'Respond with READY if you can see this.' },
        ],
        max_tokens: 5,
      }),
    })
  );

  if (!response.ok) {
    const errDetails = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${errDetails}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenRouter returned an empty response.');
  }

  return 'OpenRouter responded successfully.';
};

export const providerLabels = PROVIDER_LABELS;

export const runProviderDiagnostic = async (provider: AIProvider, keys: LLMKeys): Promise<string> => {
  switch (provider) {
    case 'gemini':
      return testGemini(keys.gemini);
    case 'openrouter':
      return testOpenRouter(keys.openRouter);
    case 'openai':
      return testOpenAI(keys.openAI);
    default:
      throw new Error('Unknown provider');
  }
};