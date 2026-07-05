/**
 * Multi-Provider AI Service
 *
 * Priority order (configured via env vars):
 * 1. Groq (FREE - Llama 3 models via GROQ_API_KEY)
 * 2. Google Gemini (FREE tier via GEMINI_API_KEY)
 * 3. OpenAI (paid fallback via OPENAI_API_KEY)
 *
 * Set only the providers you want to use. The service auto-detects
 * which are available and picks the best one.
 */

import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, AIIntent } from '../types';

interface AIContext {
  systemPrompt?: string;
  knowledgeBase?: string;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
}

interface IntentResult {
  intent: AIIntent;
  confidence: number;
  entities: Record<string, string>;
}

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Lazy-init providers
let groq: Groq | null = null;
let genAI: GoogleGenerativeAI | null = null;
let openai: OpenAI | null = null;

function getGroq(): Groq {
  if (!groq && GROQ_API_KEY) groq = new Groq({ apiKey: GROQ_API_KEY });
  return groq!;
}

function getGenAI(): GoogleGenerativeAI {
  if (!genAI && GEMINI_API_KEY) genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  return genAI!;
}

function getOpenAI(): OpenAI {
  if (!openai && OPENAI_API_KEY) openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  return openai!;
}

/** Detect which providers are configured */
function getAvailableProviders(): AIProvider[] {
  const providers: AIProvider[] = [];
  if (GROQ_API_KEY) providers.push('groq');
  if (GEMINI_API_KEY) providers.push('gemini');
  if (OPENAI_API_KEY) providers.push('openai');
  return providers;
}

function buildSystemMessage(context: AIContext): string {
  const parts: string[] = [];

  if (context.systemPrompt) {
    parts.push(context.systemPrompt);
  } else {
    parts.push(
      `Você é um assistente virtual inteligente e prestativo de uma empresa.
Responda de forma humanizada, profissional e amigável.
Seja conciso mas completo em suas respostas.
Se não souber a resposta, seja honesto e ofereça encaminhamento para um atendente humano.`
    );
  }

  if (context.knowledgeBase) {
    parts.push(`\nBase de conhecimento da empresa:\n${context.knowledgeBase}`);
  }

  return parts.join('\n\n');
}

function buildHistoryMessages(context: AIContext): { role: string; content: string }[] {
  const messages: { role: string; content: string }[] = [];
  if (context.conversationHistory) {
    messages.push(...context.conversationHistory);
  }
  return messages;
}

// ─── Groq Provider ──────────────────────────────────────

async function generateWithGroq(
  userMessage: string,
  context: AIContext
): Promise<string | null> {
  try {
    const systemMessage = buildSystemMessage(context);
    const history = buildHistoryMessages(context);

    const messages: { role: string; content: string }[] = [
      { role: 'system', content: systemMessage },
      ...history,
      { role: 'user', content: userMessage },
    ];

    const completion = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: messages as any,
      max_tokens: 600,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || null;
  } catch (error) {
    console.warn('[AI] Groq failed, falling back:', (error as Error).message);
    return null;
  }
}

// ─── Gemini Provider ────────────────────────────────────

async function generateWithGemini(
  userMessage: string,
  context: AIContext
): Promise<string | null> {
  try {
    const systemMessage = buildSystemMessage(context);
    const model = getGenAI().getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: systemMessage,
    });

    const chat = model.startChat({
      history: (context.conversationHistory || []).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    });

    const result = await chat.sendMessage(userMessage);
    const response = result.response.text();
    return response || null;
  } catch (error) {
    console.warn('[AI] Gemini failed, falling back:', (error as Error).message);
    return null;
  }
}

// ─── OpenAI Provider ────────────────────────────────────

async function generateWithOpenAI(
  userMessage: string,
  context: AIContext
): Promise<string | null> {
  try {
    const systemMessage = buildSystemMessage(context);
    const history = buildHistoryMessages(context) as OpenAI.Chat.Completions.ChatCompletionMessageParam[];

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemMessage },
      ...history,
      { role: 'user', content: userMessage },
    ];

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || null;
  } catch (error) {
    console.warn('[AI] OpenAI failed:', (error as Error).message);
    return null;
  }
}

// ─── Public API ─────────────────────────────────────────

/**
 * Generate an AI response using the best available provider.
 * Priority: Groq (free) -> Gemini (free) -> OpenAI (paid)
 *
 * Returns a response string, or throws if no providers are configured.
 */
export async function generateAIResponse(
  userMessage: string,
  context: AIContext = {}
): Promise<string> {
  const providers = getAvailableProviders();

  if (providers.length === 0) {
    throw new Error(
      'Nenhum provedor de IA configurado. Adicione GROQ_API_KEY, GEMINI_API_KEY ou OPENAI_API_KEY no .env'
    );
  }

  // Try providers in priority order
  for (const provider of providers) {
    let result: string | null = null;

    switch (provider) {
      case 'groq':
        result = await generateWithGroq(userMessage, context);
        break;
      case 'gemini':
        result = await generateWithGemini(userMessage, context);
        break;
      case 'openai':
        result = await generateWithOpenAI(userMessage, context);
        break;
    }

    if (result) return result;
  }

  // All providers failed
  return 'Desculpe, estou com dificuldades técnicas no momento. Um atendente humano entrará em contato em breve. 🙏';
}

/**
 * Analyze message intent using the best available provider.
 */
export async function analyzeIntent(message: string): Promise<IntentResult> {
  const providers = getAvailableProviders();
  const systemPrompt = `Analise a intenção do usuário e retorne um JSON com:
- intent: string (compra, duvida, suporte, elogio, reclamacao, cancelamento, saudacao, outro)
- confidence: number (0-1)
- entities: object com entidades relevantes extraídas`;

  // Try Groq first (OpenAI-compatible)
  for (const provider of providers) {
    try {
      if (provider === 'groq') {
        const completion = await getGroq().chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 200,
        });
        return JSON.parse(completion.choices[0]?.message?.content || '{}');
      }

      if (provider === 'gemini') {
        const model = getGenAI().getGenerativeModel({
          model: 'gemini-1.5-flash',
        });
        const result = await model.generateContent([
          { text: systemPrompt },
          { text: message },
        ]);
        const text = result.response.text();
        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
      }

      if (provider === 'openai') {
        const completion = await getOpenAI().chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 200,
        });
        return JSON.parse(completion.choices[0]?.message?.content || '{}');
      }
    } catch {
      continue; // Try next provider
    }
  }

  return { intent: 'outro', confidence: 0.5, entities: {} };
}

/**
 * Get the name of the currently active provider (for dashboard display)
 */
export function getActiveProviderName(): string {
  const providers = getAvailableProviders();
  if (providers.length === 0) return 'Nenhum';
  const names: Record<AIProvider, string> = {
    groq: 'Groq (grátis)',
    gemini: 'Gemini (grátis)',
    openai: 'OpenAI',
  };
  return names[providers[0]];
}
