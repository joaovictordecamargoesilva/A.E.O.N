import React from 'react';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isCommand = message.command !== undefined;
  const time = new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour12: false });

  return (
    <div className="flex w-full mb-2 font-mono text-xs md:text-sm animate-fade-in group">
       {/* Timestamp Column */}
       <div className="w-16 flex-none text-slate-600 mr-2 opacity-50 select-none">
          [{time}]
       </div>

       {/* Content Column */}
       <div className="flex-1">
          <div className={`flex items-start gap-2 ${isUser ? 'text-slate-400' : 'text-cyan-400'}`}>
             <span className="font-bold select-none opacity-70">
                {isUser ? 'USR_CMD >' : 'SYS_OUT >'}
             </span>
             
             <div className="flex flex-col gap-1">
                {isCommand && (
                    <div className="text-[10px] uppercase tracking-widest text-orange-400 font-bold mb-1 opacity-90">
                        [EXEC: {message.command?.type}]
                    </div>
                )}
                <span className={`leading-relaxed ${isCommand ? 'italic opacity-80' : ''}`}>
                    {message.text}
                </span>
             </div>
          </div>
       </div>
    </div>
  );
};