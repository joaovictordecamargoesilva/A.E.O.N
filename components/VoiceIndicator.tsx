import React from 'react';
import { AppState } from '../types';

interface VoiceIndicatorProps {
  appState: AppState;
}

export const VoiceIndicator: React.FC<VoiceIndicatorProps> = ({ appState }) => {
  // Paleta de cores Iron Man HUD (Cyan/Blue padrão, Orange/Red alerta, Purple Memória)
  const isActive = appState !== AppState.IDLE;
  
  const getMainColor = () => {
    switch (appState) {
      case AppState.MONITORING: return 'border-cyan-800/50 shadow-cyan-900/20'; 
      case AppState.LISTENING: return 'border-orange-500 shadow-orange-500/50';
      case AppState.SPEAKING: return 'border-cyan-400 shadow-cyan-400/80';
      case AppState.PROCESSING: return 'border-blue-500 shadow-blue-500/50';
      case AppState.MEMORIZING: return 'border-fuchsia-500 shadow-fuchsia-500/80'; // Cor da Memória
      default: return 'border-slate-600/30 shadow-none';
    }
  };

  return (
    <div className="relative flex items-center justify-center w-80 h-80 pointer-events-none select-none transition-all duration-1000">
      
      {/* Anel Externo - Dados Estáticos */}
      <div className={`absolute inset-0 rounded-full border border-dashed border-slate-700/50 opacity-30 ${isActive ? 'scale-100' : 'scale-90'}`}></div>

      {/* Anel Rotativo Lento (Interface) */}
      <div 
        className={`absolute inset-8 rounded-full border-[1px] border-slate-600/40 
        ${appState === AppState.PROCESSING || appState === AppState.MEMORIZING ? 'animate-[spin_3s_linear_infinite]' : 'animate-[spin_20s_linear_infinite]'}
        `}
      >
        <div className="absolute -top-1 left-1/2 w-2 h-2 bg-slate-500 rounded-full"></div>
        <div className="absolute -bottom-1 left-1/2 w-2 h-2 bg-slate-500 rounded-full"></div>
      </div>

      {/* Radar Scan para Modo MONITORING */}
      {appState === AppState.MONITORING && (
         <div className="absolute inset-4 rounded-full border border-cyan-900/30 overflow-hidden opacity-50">
            <div className="w-full h-1/2 bg-gradient-to-b from-cyan-500/10 to-transparent animate-[spin_4s_linear_infinite] origin-bottom transform translate-y-full"></div>
         </div>
      )}

      {/* Anel de Atividade (Reativo) */}
      <div 
        className={`absolute inset-16 rounded-full border-2 transition-all duration-500 bg-transparent
        ${getMainColor()}
        ${appState === AppState.SPEAKING ? 'scale-110 opacity-100 border-dashed animate-[spin_10s_linear_infinite_reverse]' : ''}
        ${appState === AppState.LISTENING ? 'scale-100 opacity-100 border-solid' : ''}
        ${appState === AppState.MONITORING ? 'scale-100 opacity-60 border-dotted animate-[spin_10s_linear_infinite]' : ''}
        ${appState === AppState.MEMORIZING ? 'scale-105 opacity-100 border-double animate-pulse' : ''} 
        ${appState === AppState.IDLE ? 'scale-95 opacity-20' : ''}
        `}
      ></div>

      {/* Núcleo de Energia (Arc Reactor Style) */}
      <div 
        className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-300
          ${appState === AppState.SPEAKING ? 'bg-cyan-500/10 shadow-[0_0_50px_rgba(34,211,238,0.4)]' : 'bg-transparent'}
          ${appState === AppState.LISTENING ? 'bg-orange-500/10 shadow-[0_0_30px_rgba(249,115,22,0.3)]' : ''}
          ${appState === AppState.MONITORING ? 'bg-cyan-900/5 shadow-[0_0_20px_rgba(6,182,212,0.1)]' : ''}
          ${appState === AppState.MEMORIZING ? 'bg-fuchsia-900/20 shadow-[0_0_40px_rgba(217,70,239,0.3)]' : ''}
        `}
      >
        {/* Círculo Central Sólido */}
        <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center transition-all duration-300
            ${appState === AppState.SPEAKING ? 'border-cyan-400 bg-cyan-400/20 scale-110' : ''}
            ${appState === AppState.LISTENING ? 'border-orange-500 bg-orange-500/20 scale-90' : ''}
            ${appState === AppState.PROCESSING ? 'border-blue-500 animate-pulse' : ''}
            ${appState === AppState.MONITORING ? 'border-cyan-800/60 bg-cyan-900/10' : ''}
            ${appState === AppState.MEMORIZING ? 'border-fuchsia-500 bg-fuchsia-500/20 scale-100' : ''}
            ${appState === AppState.IDLE ? 'border-slate-700 bg-slate-800/50' : ''}
        `}>
             {/* Ícone Técnico */}
             <div className={`transition-all duration-300 ${appState === AppState.SPEAKING ? 'animate-pulse' : ''}`}>
                {appState === AppState.IDLE && <div className="w-2 h-2 bg-slate-500 rounded-full"></div>}
                {appState === AppState.MONITORING && <div className="w-2 h-2 bg-cyan-700/50 rounded-full animate-pulse"></div>}
                {appState === AppState.LISTENING && <div className="w-3 h-3 bg-orange-500 rounded-sm animate-ping"></div>}
                {appState === AppState.PROCESSING && <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>}
                {appState === AppState.SPEAKING && <div className="w-8 h-0.5 bg-cyan-400 shadow-[0_0_10px_cyan]"></div>}
                {appState === AppState.MEMORIZING && <div className="w-4 h-4 bg-fuchsia-500 rotate-45 animate-ping"></div>}
             </div>
        </div>
      </div>

      {/* Elementos Decorativos HUD */}
      {isActive && (
        <>
            <div className="absolute top-0 w-px h-full bg-gradient-to-b from-transparent via-slate-500/20 to-transparent"></div>
            <div className="absolute left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-500/20 to-transparent"></div>
        </>
      )}

    </div>
  );
};