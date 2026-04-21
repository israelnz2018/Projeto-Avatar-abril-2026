import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, Sparkles, PlayCircle, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Message } from '@/src/types';

export default function ChatAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello Israel! I'm your Continuous Improvement Copilot. How can I help you today? We can analyze data, update your DMAIC project, or learn a new concept.",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI Response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `### 1. Diagnosis
Based on your question about regression analysis, it seems you're trying to understand the relationship between your independent variables and the output.

### 2. Recommended Action
I suggest running a **Multiple Linear Regression** on your 'Temperature' and 'Pressure' columns to see which one has a higher impact on 'Defect Rate'.

### 3. Execution
I've prepared the analysis tool for you. Would you like me to run it now?

### 4. Business Interpretation
Understanding this relationship will allow you to set tighter control limits on the production line, potentially reducing waste by 15%.

### 5. Learning Recommendation
I recommend watching this video on "Interpreting P-values in Regression".`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col bg-white border border-[#ccc] rounded-[4px] overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-[15px] border-b border-[#ccc] bg-[#1f2937] text-white flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-[35px] h-[35px] bg-white/10 rounded-[4px] flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-[14px] m-0">AI Copilot</h2>
            <p className="text-[10px] text-white/60 m-0 uppercase font-bold tracking-wider">Especialista DMAIC • Ativo</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-[20px] space-y-6 scroll-smooth bg-[#f9f9f9]">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex w-full",
                msg.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div className={cn(
                "flex max-w-[85%] space-x-3",
                msg.role === 'user' ? "flex-row-reverse space-x-reverse" : "flex-row"
              )}>
                <div className={cn(
                  "w-[32px] h-[32px] rounded-[4px] flex items-center justify-center flex-shrink-0 mt-1",
                  msg.role === 'user' ? "bg-[#1f2937]" : "bg-[#e5e7eb]"
                )}>
                  {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} />}
                </div>
                <div className={cn(
                  "p-[15px] rounded-[4px] leading-relaxed text-[13px] border shadow-sm",
                  msg.role === 'user' 
                    ? "bg-[#1f2937] text-white border-[#1f2937]" 
                    : "bg-white text-[#333] border-[#ccc]"
                )}>
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                    {msg.content}
                  </div>
                  {msg.role === 'assistant' && msg.content.includes('Learning Recommendation') && (
                    <div className="mt-4 p-[10px] bg-[#f0f2f5] rounded-[4px] border border-[#ccc] flex items-center justify-between group cursor-pointer hover:border-[#3b82f6] transition-colors">
                      <div className="flex items-center space-x-3">
                        <PlayCircle size={20} className="text-red-600" />
                        <div>
                          <p className="text-[12px] font-bold m-0">Regression Analysis Basics</p>
                          <p className="text-[10px] text-[#666] m-0">YouTube • 4:20</p>
                        </div>
                      </div>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-[#ccc] p-[10px] rounded-[4px] flex items-center space-x-2 shadow-sm">
              <Loader2 size={14} className="animate-spin text-[#3b82f6]" />
              <span className="text-[12px] font-bold text-[#666]">Pensando...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-[15px] border-t border-[#ccc] bg-white">
        <div className="relative max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Pergunte qualquer coisa sobre seu projeto ou dados..."
            className="w-full bg-[#f9f9f9] border border-[#ccc] rounded-[4px] px-[15px] py-[12px] pr-[50px] focus:outline-none focus:border-[#3b82f6] transition-all text-[13px]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-[5px] top-1/2 -translate-y-1/2 p-[8px] bg-[#3b82f6] text-white rounded-[4px] hover:bg-blue-700 transition-all disabled:opacity-50 border-none cursor-pointer"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="mt-3 flex justify-center space-x-2">
          {['Analisar dados', 'Atualizar projeto', 'Aprender DMAIC'].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInput(suggestion)}
              className="text-[10px] font-bold uppercase tracking-wider px-[10px] py-[5px] rounded-[4px] border border-[#ccc] bg-white hover:bg-[#f0f2f5] transition-all cursor-pointer text-[#666]"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
