import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, AppState, Command } from './types';
import { sendMessageToGemini } from './services/geminiService';
import { ChatMessage } from './components/ChatMessage';
import { VoiceIndicator } from './components/VoiceIndicator';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [isSentinelMode, setIsSentinelMode] = useState(false); 
  
  // States de Inicialização
  const [isBooting, setIsBooting] = useState(true);
  const [bootStep, setBootStep] = useState(0);
  const [bootLogs, setBootLogs] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const WAKE_WORDS = ['aeon', 'eon', 'ion', 'lion', 'aion', 'sistema', 'computador'];

  // Boot Sequence Effect
  useEffect(() => {
    const runBootSequence = async () => {
        const addLog = (text: string) => setBootLogs(prev => [...prev, text]);
        
        // Step 1: Core Init
        setTimeout(() => { 
            setBootStep(1); 
            addLog("INITIALIZING A.E.O.N. KERNEL...");
        }, 500);

        // Step 2: Environment Check
        setTimeout(() => {
            setBootStep(2);
            if (!process.env.API_KEY) {
                addLog("CRITICAL ERROR: API_KEY NOT FOUND IN ENV.");
                addLog("SYSTEM HALTED.");
                return;
            }
            addLog("SECURE CONNECTION ESTABLISHED.");
            
            // Simula leitura de memória
            const memCount = localStorage.getItem('aeon_core_memory_v1') 
                ? JSON.parse(localStorage.getItem('aeon_core_memory_v1')!).length 
                : 0;
            addLog(`LOADING NEURAL PATTERNS... [${memCount} RECORDS FOUND]`);
        }, 1500);

        // Step 3: Audio Sensors
        setTimeout(() => {
            setBootStep(3);
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                addLog("AUDIO SENSORS DETECTED.");
                addLog("MICROPHONE INPUT: CALIBRATING...");
            } else {
                addLog("WARNING: AUDIO SENSORS OFFLINE (BROWSER UNSUPPORTED).");
            }
        }, 2500);

        // Step 4: Voice Synthesis
        setTimeout(() => {
            setBootStep(4);
            const voices = synthRef.current.getVoices();
            addLog(`VOICE MODULE: LOADED ${voices.length} PATTERNS.`);
        }, 3500);

        // Finish
        setTimeout(() => {
            setBootStep(5);
            addLog("SYSTEM READY.");
            addLog("PERSONALITY MATRIX: ADAPTED.");
            setTimeout(() => setIsBooting(false), 800);
        }, 4500);
    };

    runBootSequence();
  }, []);

  // Scroll logs automatically
  useEffect(() => {
    if (showLogs && logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [messages, showLogs]);

  // Carregamento de Vozes
  useEffect(() => {
    const loadVoices = () => {
      const voices = synthRef.current.getVoices();
      let bestVoice = voices.find(v => v.lang === 'pt-BR' && v.name.includes('Google'));
      if (!bestVoice) bestVoice = voices.find(v => v.lang === 'pt-BR');
      voiceRef.current = bestVoice || voices[0];
    };

    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Configuração do Reconhecimento de Voz
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false; 
      recognition.interimResults = false;

      recognition.onstart = () => {
        setAppState(prev => {
            if (prev === AppState.PROCESSING || prev === AppState.SPEAKING || prev === AppState.EXECUTING || prev === AppState.MEMORIZING) return prev;
            return prev === AppState.LISTENING ? AppState.LISTENING : (isSentinelMode ? AppState.MONITORING : AppState.LISTENING);
        });
      };
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        console.log("Input:", transcript);

        if (appState === AppState.MONITORING || isSentinelMode) {
            const detectedWord = WAKE_WORDS.find(word => transcript.includes(word));
            
            if (detectedWord) {
                const command = transcript.split(detectedWord)[1]?.trim(); 
                
                if (!command || command.length < 3) {
                    speakText("Online.");
                } else {
                    handleSendMessage(command);
                }
            }
        } else {
            if (transcript) handleSendMessage(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech' && isSentinelMode && appState !== AppState.PROCESSING) {
             // Ignora
        } else {
            setAppState(AppState.IDLE);
        }
      };

      recognition.onend = () => {
        if (isSentinelMode && appState !== AppState.PROCESSING && appState !== AppState.SPEAKING && appState !== AppState.EXECUTING && appState !== AppState.MEMORIZING) {
            setTimeout(() => {
                try {
                    setAppState(AppState.MONITORING);
                    recognition.start(); 
                } catch (e) {
                    setIsSentinelMode(false); 
                    setAppState(AppState.IDLE);
                }
            }, 300);
        } else if (!isSentinelMode) {
             setAppState(AppState.IDLE);
        }
      };

      recognitionRef.current = recognition;
    }
  }, [appState, isSentinelMode]); 

  const executeCommand = (command: Command) => {
    if (command.type === 'MEMORY_SAVE') {
        setAppState(AppState.MEMORIZING);
        setTimeout(() => {
            if (isSentinelMode) setAppState(AppState.MONITORING);
            else setAppState(AppState.IDLE);
        }, 2000);
        return;
    }

    setAppState(AppState.EXECUTING);
    setTimeout(() => {
        try {
            switch (command.type) {
                case 'WHATSAPP':
                    const text = encodeURIComponent(command.payload);
                    window.open(`https://wa.me/?text=${text}`, '_blank');
                    break;
                case 'SPREADSHEET':
                    const { filename, content } = command.payload;
                    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', filename || 'dados_aeon.csv');
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    break;
                case 'CALENDAR':
                    const { title, details, location } = command.payload;
                    const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(details || '')}&location=${encodeURIComponent(location || '')}`;
                    window.open(googleCalendarUrl, '_blank');
                    break;
            }
        } catch (e) {
            console.error("Erro na execução:", e);
        } finally {
            setTimeout(() => {
               if (isSentinelMode) setAppState(AppState.MONITORING);
               else setAppState(AppState.IDLE);
            }, 2000);
        }
    }, 1500);
  };

  const speakText = useCallback((text: string, onEndCallback?: () => void) => {
    if (!synthRef.current) return;
    if (recognitionRef.current) recognitionRef.current.abort();

    synthRef.current.cancel();
    setAppState(AppState.SPEAKING);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    if (voiceRef.current) utterance.voice = voiceRef.current;
    utterance.rate = 1.1; 
    utterance.pitch = 0.9;

    utterance.onend = () => {
        if (onEndCallback) {
            onEndCallback();
        } else {
            setAppState(AppState.IDLE);
            if (isSentinelMode) {
                setTimeout(() => recognitionRef.current?.start(), 300);
            }
        }
    };
    
    utterance.onerror = () => setAppState(AppState.IDLE);
    synthRef.current.speak(utterance);
  }, [isSentinelMode]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    if (recognitionRef.current) recognitionRef.current.abort();

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputText('');
    setShowKeyboard(false);
    setAppState(AppState.PROCESSING);

    try {
      const result = await sendMessageToGemini(text, messages);

      const newBotMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: result.text,
        timestamp: new Date(),
        command: result.command
      };

      setMessages((prev) => [...prev, newBotMessage]);
      
      if (result.command) {
          // Se for comando de memória, falamos primeiro depois visualizamos
          speakText(result.text, () => executeCommand(result.command!));
      } else {
          speakText(result.text);
      }

    } catch (error) {
      setAppState(AppState.IDLE);
    }
  };

  const toggleSentinelMode = () => {
      if (isSentinelMode) {
          setIsSentinelMode(false);
          recognitionRef.current?.stop();
          setAppState(AppState.IDLE);
      } else {
          setIsSentinelMode(true);
          setAppState(AppState.MONITORING);
          try {
            recognitionRef.current?.start();
          } catch(e) { /* Já iniciado */ }
      }
  };

  const manualActivate = () => {
    setIsSentinelMode(false); 
    setAppState(AppState.LISTENING);
    recognitionRef.current?.start();
  };

  // Render da Tela de Boot
  if (isBooting) {
      return (
        <div className="flex flex-col h-screen w-full bg-[#020202] text-cyan-50 font-mono items-center justify-center p-8 overflow-hidden relative selection:bg-cyan-500/30">
            <div className="absolute inset-0 pointer-events-none opacity-20"
                 style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, #06b6d4 1px, transparent 2px)' }}>
            </div>
            
            <div className="w-full max-w-md z-10">
                <div className="flex items-center gap-2 mb-6 text-cyan-500 animate-pulse">
                     <i className="fa-solid fa-microchip text-2xl"></i>
                     <span className="text-xl tracking-[0.2em] font-bold">A.E.O.N. BIOS</span>
                </div>
                
                <div className="space-y-2 mb-8">
                    {bootLogs.map((log, i) => (
                        <div key={i} className="text-xs md:text-sm text-cyan-400/80 font-mono border-l-2 border-cyan-800 pl-3">
                            <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString('pt-BR', {hour12:false})}]</span>
                            {log}
                        </div>
                    ))}
                    <div className="h-4 w-3 bg-cyan-500 animate-pulse inline-block"></div>
                </div>

                <div className="w-full bg-cyan-900/20 h-1 mt-4 relative overflow-hidden">
                    <div 
                        className="h-full bg-cyan-500 transition-all duration-300 ease-out"
                        style={{ width: `${(bootStep / 5) * 100}%` }}
                    ></div>
                </div>
                <div className="flex justify-between text-[10px] text-cyan-700 mt-2 font-bold tracking-widest">
                    <span>SYSTEM CHECK</span>
                    <span>{Math.min(100, Math.round((bootStep / 5) * 100))}%</span>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#020202] text-cyan-50 font-mono overflow-hidden relative selection:bg-cyan-500/30">
      
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#444 1px, transparent 1px), linear-gradient(90deg, #444 1px, transparent 1px)', backgroundSize: '50px 50px' }}>
      </div>

      {/* Visualizador Central */}
      <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none">
         <div className={`transition-all duration-700 ${showLogs || showKeyboard || showInstallHelp ? 'opacity-5 scale-90 blur-sm' : 'opacity-100 scale-100'}`}>
            <VoiceIndicator appState={appState} />
         </div>
      </div>

      {/* Header HUD */}
      <div className="flex-none h-16 flex items-end justify-between px-6 pb-2 z-20 relative">
        <div className="flex flex-col">
            <span className="text-[9px] text-cyan-600/40 uppercase tracking-[0.2em]">System Core</span>
            <div className="flex items-center gap-3">
                <span className={`text-xs font-bold tracking-widest flex items-center gap-2 
                    ${appState === AppState.EXECUTING ? 'text-green-500' : 
                      appState === AppState.MEMORIZING ? 'text-fuchsia-500' : 
                      isSentinelMode ? 'text-purple-400' : 'text-cyan-500'}`}>
                    {appState === AppState.EXECUTING ? 'EXECUTING' : 
                     appState === AppState.MEMORIZING ? 'ARCHIVING DATA' :
                     isSentinelMode ? 'A.E.O.N. SENTINEL' : 'A.E.O.N. READY'}
                </span>
            </div>
        </div>
        
        <button 
          onClick={toggleSentinelMode}
          className={`text-[9px] font-bold border px-3 py-1 transition-all uppercase tracking-wider flex items-center gap-2 rounded-sm
            ${isSentinelMode 
                ? 'border-purple-500/50 text-purple-400 bg-purple-900/10 shadow-[0_0_10px_rgba(168,85,247,0.2)]' 
                : 'border-cyan-900/30 text-cyan-600/60 hover:bg-cyan-900/20'}`}
        >
          <i className={`fa-solid ${isSentinelMode ? 'fa-eye animate-pulse' : 'fa-eye-slash'}`}></i>
          {isSentinelMode ? 'Scan' : 'Idle'}
        </button>
      </div>

      {/* LOG TERMINAL OVERLAY */}
      <div className={`fixed inset-0 z-40 bg-black/95 transition-transform duration-500 ease-in-out flex flex-col
          ${showLogs ? 'translate-y-0' : 'translate-y-full'}`}>
          
          <div className="h-16 border-b border-cyan-900/50 flex items-center justify-between px-6 bg-[#050505]">
              <div className="flex items-center gap-2 text-cyan-500">
                  <i className="fa-solid fa-terminal text-sm"></i>
                  <span className="text-xs tracking-widest font-bold">SYSTEM_LOGS_V3.1</span>
              </div>
              <button onClick={() => setShowLogs(false)} className="text-cyan-700 hover:text-cyan-400 p-2">
                  <i className="fa-solid fa-chevron-down"></i>
              </button>
          </div>

          <div ref={logContainerRef} className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-sm text-cyan-50/80 scrollbar-thin scrollbar-thumb-cyan-900/50 scrollbar-track-transparent">
               {messages.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center text-cyan-900/50 text-xs text-center">
                       <i className="fa-solid fa-server text-4xl mb-4"></i>
                       <p>NO DATA IN BUFFER</p>
                       <p>WAITING FOR AUDIO INPUT...</p>
                   </div>
               )}
               {messages.map((msg) => (
                   <ChatMessage key={msg.id} message={msg} />
               ))}
          </div>
      </div>

      {/* Footer Controls */}
      <div className="fixed bottom-0 left-0 w-full pb-8 pt-4 z-30 pointer-events-none">
        <div className="max-w-2xl mx-auto px-6 w-full flex flex-col items-center pointer-events-auto">
          
          <div className="flex items-center gap-8 justify-center w-full">
             
             {!showKeyboard && (
                <button 
                  onClick={() => setShowLogs(true)}
                  className="w-10 h-10 rounded-full border border-cyan-900/30 text-cyan-800 hover:text-cyan-400 hover:border-cyan-500 hover:bg-cyan-900/20 flex items-center justify-center transition-all backdrop-blur-sm"
                >
                  <i className="fa-solid fa-list-ul text-xs"></i>
                </button>
             )}

             {showKeyboard ? (
               <div className="flex-1 max-w-sm flex items-center bg-black border border-cyan-500/50 px-3 py-2 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                  <span className="text-cyan-500 mr-2">{'>'}</span>
                  <input
                    autoFocus
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
                    placeholder="CMD_INPUT..."
                    className="flex-1 bg-transparent text-cyan-50 placeholder-cyan-900 focus:outline-none px-2 font-mono text-sm uppercase"
                  />
                  <button onClick={() => setShowKeyboard(false)} className="px-3 text-cyan-700 hover:text-cyan-400">
                    <i className="fa-solid fa-xmark"></i>
                  </button>
               </div>
             ) : (
               <button
                  onClick={appState === AppState.LISTENING || appState === AppState.MONITORING ? () => recognitionRef.current?.stop() : manualActivate}
                  className={`relative group h-14 w-14 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-md
                    ${appState === AppState.LISTENING 
                      ? 'bg-orange-500/10 border border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.4)]' 
                      : isSentinelMode 
                        ? 'bg-purple-900/10 border border-purple-500/30 animate-pulse'
                        : appState === AppState.EXECUTING
                            ? 'bg-green-500/10 border border-green-500'
                            : appState === AppState.MEMORIZING
                                ? 'bg-fuchsia-500/10 border border-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,0.4)]'
                                : 'bg-black/40 border border-cyan-800/30 hover:border-cyan-400'
                    }`}
               >
                  <i className={`fa-solid text-lg transition-all
                    ${appState === AppState.LISTENING ? 'fa-microphone text-orange-500' : 
                      appState === AppState.SPEAKING ? 'fa-stop text-cyan-400' : 
                      appState === AppState.EXECUTING ? 'fa-check text-green-400' :
                      appState === AppState.MEMORIZING ? 'fa-brain text-fuchsia-400' :
                      isSentinelMode ? 'fa-fingerprint text-purple-700' : 'fa-microphone text-cyan-900 group-hover:text-cyan-400'
                    }`}></i>
               </button>
             )}

             {!showKeyboard && (
                <div className="flex gap-4">
                     <button 
                      onClick={() => setShowKeyboard(true)}
                      className="w-10 h-10 rounded-full border border-cyan-900/30 text-cyan-800 hover:text-cyan-400 hover:border-cyan-500 hover:bg-cyan-900/20 flex items-center justify-center transition-all backdrop-blur-sm"
                    >
                      <i className="fa-solid fa-terminal text-xs"></i>
                    </button>

                    <button 
                      onClick={() => setShowInstallHelp(true)}
                      className="w-10 h-10 rounded-full border border-cyan-900/30 text-cyan-800 hover:text-cyan-400 hover:border-cyan-500 hover:bg-cyan-900/20 flex items-center justify-center transition-all backdrop-blur-sm"
                    >
                      <i className="fa-solid fa-download text-xs"></i>
                    </button>
                </div>
             )}
          </div>
        </div>
      </div>

      {/* Modal de Instalação */}
      {showInstallHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fade-in">
            <div className="bg-[#050505] border border-cyan-500/30 p-6 max-w-sm w-full shadow-[0_0_50px_rgba(6,182,212,0.1)] relative">
                <button 
                    onClick={() => setShowInstallHelp(false)}
                    className="absolute top-2 right-3 text-cyan-700 hover:text-cyan-400"
                >
                    <i className="fa-solid fa-xmark"></i>
                </button>
                
                <h3 className="text-cyan-400 font-bold text-lg mb-4 tracking-wider border-b border-cyan-900/50 pb-2">
                    <i className="fa-solid fa-cube mr-2"></i>
                    INSTALL AEON
                </h3>
                
                <div className="space-y-4 text-xs font-mono text-cyan-100/70">
                    <p>INITIALIZING DEPLOYMENT SEQUENCE...</p>
                    
                    <div className="bg-cyan-900/5 p-3 border border-cyan-900/20">
                        <strong className="block text-cyan-500 mb-1">IOS_DEPLOY:</strong>
                        1. SELECT [SHARE] <i className="fa-solid fa-arrow-up-from-bracket mx-1"></i><br/>
                        2. EXECUTE "Add to Home Screen".
                    </div>

                    <div className="bg-cyan-900/5 p-3 border border-cyan-900/20">
                        <strong className="block text-cyan-500 mb-1">ANDROID_DEPLOY:</strong>
                        1. SELECT [MENU] <i className="fa-solid fa-ellipsis-vertical mx-1"></i><br/>
                        2. EXECUTE "Install App".
                    </div>
                </div>
                
                <button 
                    onClick={() => setShowInstallHelp(false)}
                    className="w-full mt-6 bg-cyan-900/20 hover:bg-cyan-900/40 text-cyan-400 border border-cyan-500/30 py-3 transition-all uppercase text-xs tracking-[0.2em] font-bold"
                >
                    ACKNOWLEDGE
                </button>
            </div>
        </div>
      )}

    </div>
  );
};

export default App;