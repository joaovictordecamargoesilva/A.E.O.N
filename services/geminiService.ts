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
const tools: FunctionDeclaration[] = [
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

DIRETRIZES DE EVOLUÇÃO (MOLDAGEM):
1.  **Adaptação Absoluta:** Analise a seção 'MEMÓRIA NEURAL' acima. Se o usuário pediu para você ser engraçado, SEJA engraçado. Se pediu respostas técnicas, SEJA técnico.
2.  **Evolução Constante:** Se o usuário corrigir seu comportamento (ex: "não fale assim"), use a ferramenta 'save_memory' para gravar essa preferência como uma regra permanente.
3.  **Personalidade Base:** Por padrão, você é sofisticado, eficiente e leal (estilo J.A.R.V.I.S.), MAS isso deve ser sobrescrito pelas preferências do usuário armazenadas na memória.
4.  **Fala Natural:** Não use listas com marcadores ou asteriscos. Fale como um humano conversando pelo telefone.

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
        tools: [{ functionDeclarations: tools }], 
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
        // O Gemini pode chamar múltiplas funções, vamos iterar (embora geralmente seja uma por vez neste caso)
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
                // Execução interna (Server-side simulation)
                saveMemory(args.fact);
                // Retornamos um comando especial para a UI piscar, mas o texto continua
                command = { type: 'MEMORY_SAVE', payload: args.fact };
                // Se não houver texto, geramos um feedback sutil
                if (!responseText) responseText = "Entendido. Protocolo de comportamento atualizado.";
            }
        }
    }
    
    if (!responseText && command && command.type !== 'MEMORY_SAVE') {
        responseText = "Comando executado.";
    }
    
    const cleanText = responseText.replace(/[*#_`]/g, ''); 
    
    return { text: cleanText, command };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "Falha nos sistemas centrais. Tentando reconexão." };
  }
};