import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Plus, 
  Trash2, 
  Bot, 
  User as UserIcon, 
  ArrowRight
} from 'lucide-react';
import api from '../services/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

// Simple custom component to render Markdown headers, lists, and bold text
const FormattedMessage: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  
  return (
    <div className="space-y-2 text-xs md:text-sm leading-relaxed">
      {lines.map((line, idx) => {
        // Headers (### Header)
        if (line.startsWith('### ')) {
          return <h4 key={idx} className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-200 mt-3 mb-1">{line.replace('### ', '')}</h4>;
        }
        if (line.startsWith('## ')) {
          return <h3 key={idx} className="text-base md:text-lg font-bold text-slate-850 dark:text-slate-100 mt-4 mb-2">{line.replace('## ', '')}</h3>;
        }
        
        // Bullet points (* point)
        if (line.startsWith('* ') || line.startsWith('- ')) {
          const content = line.substring(2);
          return (
            <ul key={idx} className="list-disc pl-5 my-1">
              <li>{renderBoldText(content)}</li>
            </ul>
          );
        }
        
        // Empty lines
        if (line.trim() === '') {
          return <div key={idx} className="h-2" />;
        }
        
        // Standard text
        return <p key={idx}>{renderBoldText(line)}</p>;
      })}
    </div>
  );
};

// Helper function to format **bold** text in paragraphs
const renderBoldText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-extrabold text-slate-800 dark:text-slate-150">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

export const AIChat: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested questions list
  const suggestedQuestions = [
    "Why did profit decrease?",
    "Which region performs best?",
    "Which category should receive more investment?",
    "Summarize last month's performance."
  ];

  // Fetch chat sessions list on mount
  const fetchSessions = async (selectLatest = false) => {
    try {
      const res = await api.get('/ai/sessions');
      setSessions(res.data);
      if (selectLatest && res.data.length > 0) {
        handleSelectSession(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Scroll to bottom when messages list updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/ai/sessions/${sessionId}`);
      setMessages(res.data.messages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCreateNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setInputMsg('');
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation?')) return;
    try {
      await api.delete(`/ai/sessions/${id}`);
      if (currentSessionId === id) {
        handleCreateNewChat();
      }
      fetchSessions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || sending) return;
    
    setSending(true);
    setInputMsg('');
    
    // Optimistic UI updates
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await api.post('/ai/chat', {
        question: text,
        session_id: currentSessionId || undefined
      });
      
      const { response, session_id } = res.data;
      
      const tempAiMsg: ChatMessage = {
        id: `temp-ai-${Date.now()}`,
        role: 'assistant',
        content: response,
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev.filter(m => m.id !== tempUserMsg.id), { ...tempUserMsg, id: `u-${Date.now()}` }, tempAiMsg]);
      
      if (!currentSessionId) {
        setCurrentSessionId(session_id);
        fetchSessions();
      } else {
        // Refresh session list to show updated order/titles
        fetchSessions();
      }
    } catch (err) {
      console.error(err);
      // Remove optimistic message or show error
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'I encountered an error connecting to the AI service. Please make sure the backend is active and your API key is correct.',
        created_at: new Date().toISOString()
      }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex border border-slate-200/60 dark:border-slate-800/60 rounded-3xl bg-white dark:bg-[#0e1420] overflow-hidden shadow-sm">
      
      {/* SESSIONS LIST SIDEBAR */}
      <div className="w-[280px] border-r border-slate-200/60 dark:border-slate-800/60 flex-col hidden md:flex shrink-0 bg-slate-50/50 dark:bg-slate-900/10">
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-800/60">
          <button
            onClick={handleCreateNewChat}
            className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-brand-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={15} />
            <span>New Conversation</span>
          </button>
        </div>

        {/* Sessions Scroll container */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length > 0 ? (
            sessions.map((s) => {
              const isSelected = currentSessionId === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => handleSelectSession(s.id)}
                  className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300 font-semibold' 
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <MessageSquare size={15} className="shrink-0 text-slate-400 group-hover:text-brand-500" />
                    <span className="text-xs truncate max-w-[170px]">{s.title}</span>
                  </div>
                  <button 
                    onClick={(e) => handleDeleteSession(e, s.id)}
                    className="p-1 rounded text-slate-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">No past conversations</div>
          )}
        </div>
      </div>

      {/* CHAT DISPLAY BOX */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0b0f19]">
        
        {/* Chat window Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-[#0e1420]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-violet-500 text-white flex items-center justify-center font-bold">
              <Bot size={17} />
            </div>
            <div>
              <h3 className="text-xs md:text-sm font-bold tracking-wide">InsightIQ Assistant</h3>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-[10px] text-slate-400 font-semibold">Online Analyst</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleCreateNewChat} 
            className="md:hidden p-2 text-xs font-bold text-brand-600 hover:bg-slate-100 rounded-lg flex items-center gap-1"
          >
            <Plus size={14} /> New
          </button>
        </div>

        {/* Message logs scrolling box */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          
          {loadingHistory ? (
            <div className="flex h-full items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            /* Blank state onboarding */
            <div className="max-w-md mx-auto text-center py-12 space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center mx-auto shadow-inner animate-bounce">
                <Bot size={24} />
              </div>
              <div>
                <h3 className="font-bold text-sm md:text-base">Ask InsightIQ intelligence</h3>
                <p className="text-slate-400 text-xs md:text-sm mt-1.5 leading-relaxed">
                  Ask me questions about sales totals, profitability drops, regional performances, or forecasting outcomes. I have full database access.
                </p>
              </div>

              {/* Suggestions Grid */}
              <div className="space-y-2 mt-4 text-left">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1 text-center">Suggested queries</span>
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q)}
                    className="w-full text-left p-3 text-xs bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-800/60 border border-slate-150 dark:border-slate-800 rounded-xl transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <span>{q}</span>
                    <ArrowRight size={13} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Conversation Thread */
            <>
              {messages.map((m) => {
                const isAi = m.role === 'assistant';
                return (
                  <div 
                    key={m.id}
                    className={`flex items-start gap-3 max-w-[85%] ${isAi ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                  >
                    <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-white ${
                      isAi ? 'bg-gradient-to-tr from-brand-600 to-violet-500' : 'bg-slate-700'
                    }`}>
                      {isAi ? <Bot size={16} /> : <UserIcon size={16} />}
                    </div>

                    <div className={`p-4 rounded-2xl ${
                      isAi 
                        ? 'bg-slate-50 dark:bg-slate-900/70 border border-slate-150/60 dark:border-slate-800/60' 
                        : 'bg-brand-600 text-white shadow shadow-brand-500/10'
                    }`}>
                      {isAi ? (
                        <FormattedMessage text={m.content} />
                      ) : (
                        <p className="text-xs md:text-sm whitespace-pre-wrap">{m.content}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {sending && (
                <div className="flex items-start gap-3 max-w-[80%]">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-violet-500 text-white flex items-center justify-center">
                    <Bot size={16} />
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-150 dark:border-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}

        </div>

        {/* SUGGESTION CHIPS BOX (Only visible when active messages are present) */}
        {messages.length > 0 && !sending && (
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-850 overflow-x-auto flex gap-2 scrollbar-none whitespace-nowrap shrink-0">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="text-[11px] bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-800/60 border border-slate-150 dark:border-slate-800 px-3 py-1.5 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* INPUT FORM BLOCK */}
        <div className="p-4 border-t border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-[#0e1420]">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputMsg); }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              disabled={sending}
              placeholder="Ask a question about database metrics..."
              className="flex-1 px-4 py-3 text-xs md:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!inputMsg.trim() || sending}
              className="p-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white rounded-xl shadow shadow-brand-500/10 transition-all flex items-center justify-center cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              <Send size={16} />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
};
