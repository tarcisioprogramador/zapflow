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
import { AIIntent } from '../types';
interface AIContext {
    systemPrompt?: string;
    knowledgeBase?: string;
    conversationHistory?: {
        role: 'user' | 'assistant';
        content: string;
    }[];
}
interface IntentResult {
    intent: AIIntent;
    confidence: number;
    entities: Record<string, string>;
}
/**
 * Generate an AI response using the best available provider.
 * Priority: Groq (free) -> Gemini (free) -> OpenAI (paid)
 *
 * Returns a response string, or throws if no providers are configured.
 */
export declare function generateAIResponse(userMessage: string, context?: AIContext): Promise<string>;
/**
 * Analyze message intent using the best available provider.
 */
export declare function analyzeIntent(message: string): Promise<IntentResult>;
/**
 * Get the name of the currently active provider (for dashboard display)
 */
export declare function getActiveProviderName(): string;
export {};
//# sourceMappingURL=ai.d.ts.map