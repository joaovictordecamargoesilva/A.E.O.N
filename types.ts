export interface Command {
  type: 'WHATSAPP' | 'CALENDAR' | 'SPREADSHEET' | 'MEMORY_SAVE' | 'NONE';
  payload: any;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isError?: boolean;
  command?: Command; // Comando associado à mensagem
}

export enum AppState {
  IDLE = 'IDLE',
  MONITORING = 'MONITORING', 
  LISTENING = 'LISTENING',   
  PROCESSING = 'PROCESSING',
  SPEAKING = 'SPEAKING',
  EXECUTING = 'EXECUTING', 
  MEMORIZING = 'MEMORIZING', // Novo estado visual para salvamento de memória
}

// Augment window for Speech Recognition support
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}