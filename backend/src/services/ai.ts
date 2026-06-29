import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AIContext {
  systemPrompt?: string;
  knowledgeBase?: string;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
}

export async function generateAIResponse(
  userMessage: string,
  context: AIContext = {}
): Promise<string> {
  const systemPrompt = context.systemPrompt || `Você é um assistente virtual inteligente e prestativo de uma empresa.
Responda de forma humanizada, profissional e amigável.
Seja conciso mas completo em suas respostas.
Se não souber a resposta, seja honesto e ofereça encaminhamento para um atendente humano.`;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ];

  if (context.knowledgeBase) {
    messages.push({
      role: 'system',
      content: `Base de conhecimento da empresa:\n${context.knowledgeBase}`,
    });
  }

  if (context.conversationHistory) {
    messages.push(...context.conversationHistory);
  }

  messages.push({ role: 'user', content: userMessage });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.';
  } catch (error) {
    console.error('AI Error:', error);
    return 'Desculpe, estou com dificuldades técnicas. Um atendente entrará em contato em breve.';
  }
}

export async function analyzeIntent(message: string): Promise<{
  intent: string;
  confidence: number;
  entities: Record<string, string>;
}> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Analise a intenção do usuário e retorne um JSON com:
- intent: string (compra, duvida, suporte, elogio, reclamacao, cancelamento, saudacao, outro)
- confidence: number (0-1)
- entities: object com entidades relevantes extraídas`,
        },
        { role: 'user', content: message },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 200,
    });

    return JSON.parse(completion.choices[0]?.message?.content || '{}');
  } catch {
    return { intent: 'outro', confidence: 0.5, entities: {} };
  }
}
