"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAIResponse = generateAIResponse;
exports.analyzeIntent = analyzeIntent;
exports.getActiveProviderName = getActiveProviderName;
const openai_1 = __importDefault(require("openai"));
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const generative_ai_1 = require("@google/generative-ai");
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
// Lazy-init providers
let groq = null;
let genAI = null;
let openai = null;
function getGroq() {
    if (!groq && GROQ_API_KEY)
        groq = new groq_sdk_1.default({ apiKey: GROQ_API_KEY });
    return groq;
}
function getGenAI() {
    if (!genAI && GEMINI_API_KEY)
        genAI = new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY);
    return genAI;
}
function getOpenAI() {
    if (!openai && OPENAI_API_KEY)
        openai = new openai_1.default({ apiKey: OPENAI_API_KEY });
    return openai;
}
/** Detect which providers are configured */
function getAvailableProviders() {
    const providers = [];
    if (GROQ_API_KEY)
        providers.push('groq');
    if (GEMINI_API_KEY)
        providers.push('gemini');
    if (OPENAI_API_KEY)
        providers.push('openai');
    return providers;
}
function buildSystemMessage(context) {
    const parts = [];
    if (context.systemPrompt) {
        parts.push(context.systemPrompt);
    }
    else {
        parts.push(`Você é um assistente virtual inteligente e prestativo de uma empresa.
Responda de forma humanizada, profissional e amigável.
Seja conciso mas completo em suas respostas.
Se não souber a resposta, seja honesto e ofereça encaminhamento para um atendente humano.`);
    }
    if (context.knowledgeBase) {
        parts.push(`\nBase de conhecimento da empresa:\n${context.knowledgeBase}`);
    }
    return parts.join('\n\n');
}
function buildHistoryMessages(context) {
    const messages = [];
    if (context.conversationHistory) {
        messages.push(...context.conversationHistory);
    }
    return messages;
}
// ─── Groq Provider ──────────────────────────────────────
async function generateWithGroq(userMessage, context) {
    try {
        const systemMessage = buildSystemMessage(context);
        const history = buildHistoryMessages(context);
        const messages = [
            { role: 'system', content: systemMessage },
            ...history,
            { role: 'user', content: userMessage },
        ];
        const completion = await getGroq().chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: messages,
            max_tokens: 600,
            temperature: 0.7,
        });
        return completion.choices[0]?.message?.content || null;
    }
    catch (error) {
        console.warn('[AI] Groq failed, falling back:', error.message);
        return null;
    }
}
// ─── Gemini Provider ────────────────────────────────────
async function generateWithGemini(userMessage, context) {
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
    }
    catch (error) {
        console.warn('[AI] Gemini failed, falling back:', error.message);
        return null;
    }
}
// ─── OpenAI Provider ────────────────────────────────────
async function generateWithOpenAI(userMessage, context) {
    try {
        const systemMessage = buildSystemMessage(context);
        const history = buildHistoryMessages(context);
        const messages = [
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
    }
    catch (error) {
        console.warn('[AI] OpenAI failed:', error.message);
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
async function generateAIResponse(userMessage, context = {}) {
    const providers = getAvailableProviders();
    if (providers.length === 0) {
        throw new Error('Nenhum provedor de IA configurado. Adicione GROQ_API_KEY, GEMINI_API_KEY ou OPENAI_API_KEY no .env');
    }
    // Try providers in priority order
    for (const provider of providers) {
        let result = null;
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
        if (result)
            return result;
    }
    // All providers failed
    return 'Desculpe, estou com dificuldades técnicas no momento. Um atendente humano entrará em contato em breve. 🙏';
}
/**
 * Analyze message intent using the best available provider.
 */
async function analyzeIntent(message) {
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
                if (jsonMatch)
                    return JSON.parse(jsonMatch[0]);
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
        }
        catch {
            continue; // Try next provider
        }
    }
    return { intent: 'outro', confidence: 0.5, entities: {} };
}
/**
 * Get the name of the currently active provider (for dashboard display)
 */
function getActiveProviderName() {
    const providers = getAvailableProviders();
    if (providers.length === 0)
        return 'Nenhum';
    const names = {
        groq: 'Groq (grátis)',
        gemini: 'Gemini (grátis)',
        openai: 'OpenAI',
    };
    return names[providers[0]];
}
//# sourceMappingURL=ai.js.map