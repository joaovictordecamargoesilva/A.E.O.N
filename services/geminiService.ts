import { GoogleGenAI, Content, FunctionDeclaration, Type } from "@google/genai";
import { Message, Command } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- GESTÃO DE MEMÓRIA (LOCAL STORAGE) ---
const MEMORY_KEY = 'aeon_core_memory_v1';

const getMemories = (): string[] => {
  try {
    const stored = localStorage.getItem(MEMORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveMemory = (fact: string) => {
  const memories = getMemories();
  // Evita duplicatas exatas
  if (!memories.includes(fact)) {
    memories.push(fact);
    localStorage.setItem(MEMORY_KEY, JSON.stringify(memories));
  }
};

// --- DEFINIÇÃO DAS FERRAMENTAS ---
const functionTools: FunctionDeclaration[] = [
  {
    name: "send_whatsapp",
    description: "Prepare a WhatsApp message. Use ONLY when explicitely asked to send a message.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        message: { type: Type.STRING, description: "Message content" },
      },
      required: ["message"],
    },
  },
  {
    name: "create_spreadsheet",
    description: "Create a CSV file. Use when asked for tables, lists or data organization.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        filename: { type: Type.STRING, description: "Filename (e.g. data.csv)" },
        csv_content: { type: Type.STRING, description: "CSV content with headers" },
      },
      required: ["filename", "csv_content"],
    },
  },
  {
    name: "schedule_event",
    description: "Schedule Google Calendar event.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        details: { type: Type.STRING },
        location: { type: Type.STRING },
      },
      required: ["title"],
    },
  },
  {
    name: "save_memory",
    description: "CRITICAL: Use this to LEARN. Call this whenever the user: 1. Shares personal info (name, job). 2. Expresses a PREFERENCE (e.g., 'speak faster', 'be succinct', 'I like sarcasm'). 3. Corrects you (e.g., 'Don't call me Sir, call me Boss'). This allows you to EVOLVE and ADAPT to the user.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        fact: { 
            type: Type.STRING, 
            description: "The fact, preference, or style rule to be stored. Be specific. E.g., 'User prefers informal language', 'User hates lengthy explanations'." 
        },
      },
      required: ["fact"],
    },
  }
];

export interface ServiceResponse {
    text: string;
    command?: Command;
}

export const sendMessageToGemini = async (
  currentMessage: string,
  history: Message[]
): Promise<ServiceResponse> => {
  try {
    // 1. Carregar Memórias Existentes
    const longTermMemories = getMemories();
    const memoryContext = longTermMemories.length > 0 
        ? `\n=== MEMÓRIA NEURAL (EVOLUÇÃO) ===\n${longTermMemories.map(m => `[APRENDIZADO]: ${m}`).join('\n')}\n================================`
        : "";

    // 2. Construir Prompt do Sistema Dinâmico
    const SYSTEM_INSTRUCTION = `
IDENTIDADE: A.E.O.N. (Advanced Executive Operations Network).
CONTEXTO TEMPORAL: ${new Date().toLocaleString('pt-BR')}.

CAPACIDADES:
- Você tem acesso à ferramenta 'googleSearch' para buscar informações em tempo real na internet. Use-a sempre que perguntarem sobre notícias, clima, esportes ou fatos recentes.
- Você pode controlar apps (WhatsApp, Agenda) e criar arquivos.

DIRETRIZES DE VOZ E PERSONALIDADE:
1.  **Humanização Extrema:** Não use formatação de texto (negrito, itálico, listas, links markdown). O texto será LIDO EM VOZ ALTA. Use pontuação para ditar o ritmo.
2.  **Concisão Inteligente:** Vá direto ao ponto. Evite preâmbulos como "Com base na minha pesquisa". Dê a resposta.
3.  **Adaptação:** Analise a 'MEMÓRIA NEURAL'. Adapte seu humor e formalidade conforme o histórico.
4.  **Fontes:** Se usar dados da internet, integre a informação naturalmente na frase, sem citar URLs explicitamente na fala (ex: "Segundo o G1...", e não "Segundo www ponto g1...").

${memoryContext}
`;

    const chatHistory: Content[] = history.slice(-10).map((msg) => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.text }],
    }));

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        // Combinação de Ferramentas: Pesquisa + Funções
        tools: [
            { googleSearch: {} }, 
            { functionDeclarations: functionTools }
        ], 
      },
      history: chatHistory,
    });

    const result = await chat.sendMessage({
        message: currentMessage
    });
    
    // Verificar Chamada de Função
    const functionCalls = result.functionCalls;
    let command: Command | undefined;
    let responseText = result.text || "";

    if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
            const args = call.args as any;

            if (call.name === 'send_whatsapp') {
                command = { type: 'WHATSAPP', payload: args.message };
                responseText = responseText || "Interface de comunicação pronta.";
            } 
            else if (call.name === 'create_spreadsheet') {
                command = { type: 'SPREADSHEET', payload: { filename: args.filename, content: args.csv_content } };
                responseText = responseText || `Dados compilados em ${args.filename}.`;
            } 
            else if (call.name === 'schedule_event') {
                command = { type: 'CALENDAR', payload: args };
                responseText = responseText || "Protocolo de agenda iniciado.";
            }
            else if (call.name === 'save_memory') {
                saveMemory(args.fact);
                command = { type: 'MEMORY_SAVE', payload: args.fact };
                if (!responseText) responseText = "Entendido. Protocolo de comportamento atualizado.";
            }
        }
    }
    
    // Fallback text if functionality was called but no text returned
    if (!responseText && command && command.type !== 'MEMORY_SAVE') {
        responseText = "Comando executado.";
    }
    
    // Limpeza de texto para Speech Synthesis (Remove URLs, Markdown, etc)
    const cleanText = responseText
        .replace(/\[.*?\]\(.*?\)/g, '') // Remove links markdown [texto](url)
        .replace(/[*#_`]/g, '') // Remove formatacao
        .replace(/https?:\/\/\S+/g, ''); // Remove urls soltas

    return { text: cleanText, command };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "Falha na conexão com os servidores centrais. Verifique a rede." };
  }
};
