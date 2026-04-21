import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface MentorSidebarProps {
  currentPhase: string | null;
  messages: Message[];
  inputMessage: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  suggestions: string[];
  mentorMessage: string;
}

const MentorSidebar: React.FC<MentorSidebarProps> = ({
  currentPhase,
  messages,
  inputMessage,
  onInputChange,
  onSendMessage,
  suggestions,
  mentorMessage
}) => {
  return (
    <div className="w-[320px] bg-[#1a1a1a] text-white rounded-[8px] flex flex-col h-[calc(100vh-140px)] sticky top-[120px] shadow-2xl overflow-hidden border border-gray-800">
      <div className="p-6 border-b border-gray-800 bg-gray-900/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-[15px]">Mentor LBW</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Online para ajudar</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/40 p-4 rounded-[6px] border border-gray-700/50">
          <p className="text-[13px] leading-relaxed italic text-gray-300">
            "{mentorMessage}"
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={cn(
                "flex flex-col max-w-[90%]",
                msg.role === 'user' ? "ml-auto items-end" : "items-start"
              )}>
                <div className={cn(
                  "p-3 rounded-[8px] text-[12px] leading-relaxed",
                  msg.role === 'user' ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-200"
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <h4 className="text-[11px] font-bold uppercase text-gray-500 tracking-widest">
              {currentPhase ? `Sugestões para ${currentPhase}` : 'Sugestões Gerais'}
            </h4>
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <button 
                  key={i}
                  onClick={() => onInputChange(s)}
                  className="w-full text-left p-4 bg-gray-800/50 hover:bg-gray-700 rounded-[6px] text-[12px] transition-all border border-gray-700/50 text-white cursor-pointer flex items-start gap-3 group"
                >
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:scale-125 transition-transform shrink-0" />
                  <span className="group-hover:text-blue-300 transition-colors">{s}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-gray-900/50 border-t border-gray-800">
        <div className="relative">
          <input 
            type="text"
            value={inputMessage}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSendMessage()}
            placeholder="Pergunte ao mentor..."
            className="w-full bg-gray-800 border border-gray-700 rounded-[6px] px-4 py-3 text-[13px] focus:outline-none focus:border-blue-500 text-white placeholder:text-gray-500"
          />
          <button 
            onClick={onSendMessage}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-blue-400 hover:text-blue-300 bg-transparent border-none cursor-pointer transition-colors"
          >
            <ArrowRight size={18} />
          </button>
        </div>
        <p className="text-[10px] text-gray-500 mt-3 text-center">
          Pressione Enter para enviar sua dúvida
        </p>
      </div>
    </div>
  );
};

export default MentorSidebar;
