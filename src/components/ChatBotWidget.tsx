import React, { useState, useRef, useEffect } from "react";
import { 
  MessageSquareText, 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User, 
  CornerDownLeft, 
  Trash2, 
  Copy, 
  Check, 
  AlertCircle,
  HelpCircle
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const PRESET_PROMPTS = [
  {
    label: "Draft Plumbing Issue",
    text: "Can you help me draft a detailed complaint for a severe water cooler leak on the 2nd floor?",
  },
  {
    label: "Draft Internet Issue",
    text: "Can you help me write a complaint for extremely slow Wi-Fi in the Hostel Wing C?",
  },
  {
    label: "How does Approval work?",
    text: "Can you explain the step-by-step lifecycle of my complaint once I submit it?",
  },
  {
    label: "Where do complaints go?",
    text: "How do I choose whether to route my complaint to 'Teachers/Staff' or 'Management'?",
  }
];

interface ChatBotWidgetProps {
  embedMode?: boolean;
}

export default function ChatBotWidget({ embedMode = false }: ChatBotWidgetProps) {
  const [isOpen, setIsOpen] = useState(embedMode ? true : false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I am **FixIt Buddy**, your CampusFix AI assistant. 🚀\n\nI'm here to help you **write structured complaints**, answer questions about the submission process, and resolve any confusions about categories, targets, or priorities. \n\nWhat maintenance or repair issues are you facing today? Just describe it to me!",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<{ title: string; message: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    const trimmedText = textToSend.trim();
    if (!trimmedText) return;

    // Add user message to state
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: trimmedText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setApiError(null);

    try {
      // Gather history formatted as simple client message list
      const historyPayload = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: historyPayload }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to communicate with AI.");
      }

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error("Chat error:", err);
      setApiError({
        title: "Assistant Connection Blocked",
        message: err.message || "Ensure the Gemini API Key is specified under Settings > Secrets, or check server logs.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    if (window.confirm("Are you sure you want to clear your chat history?")) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "Chat cleared! I am ready to assist you again. Ask me anything about CampusFix roles, categories, or drafting new complaints.",
          timestamp: new Date(),
        }
      ]);
      setApiError(null);
    }
  };

  // Convert markdown-like text to formatted HTML simple equivalents (bold, code block, lists)
  const formatMessageText = (text: string) => {
    if (!text) return "";
    
    // Split into lines to treat separately
    return text.split("\n").map((line, idx) => {
      let formattedLine = line;

      // Handle simple bold formatting (**text**)
      formattedLine = formattedLine.replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-teal-300">$1</strong>');
      
      // Handle simple bullet points
      if (formattedLine.trim().startsWith("- ") || formattedLine.trim().startsWith("* ")) {
        const content = formattedLine.trim().substring(2);
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-slate-300 my-1 leading-relaxed" 
              dangerouslySetInnerHTML={{ __html: content }} />
        );
      }

      // Handle ordered list items (e.g. 1. text)
      const numMatch = formattedLine.trim().match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <li key={idx} className="ml-5 list-decimal text-xs text-slate-300 my-1 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: numMatch[2] }} />
        );
      }

      // Default line rendering
      return (
        <p key={idx} className="text-xs text-slate-200 leading-relaxed my-1 min-h-[4px]"
           dangerouslySetInnerHTML={{ __html: formattedLine }} />
      );
    });
  };

  return (
    <>
      {/* Floating Chat Trigger Button - Only render if not in embedMode */}
      {!embedMode && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`fixed bottom-6 right-6 p-4 rounded-full shadow-2xl z-[90] transition-all hover:scale-110 flex items-center justify-center gap-2 group cursor-pointer ${
            isOpen 
              ? "bg-rose-500 text-white hover:bg-rose-600 ring-4 ring-rose-500/20" 
              : "bg-teal-500 text-slate-950 hover:bg-teal-400 ring-4 ring-teal-500/20"
          }`}
          title="CampusFix AI Chatbot"
          id="gemini-chatbot-trigger"
        >
          {isOpen ? (
            <X size={22} className="stroke-[2.5]" />
          ) : (
            <>
              <Bot size={22} className="stroke-[2.5] animate-bounce" />
              <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-out font-mono text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                FixIt Buddy
              </span>
            </>
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={embedMode 
          ? "w-full h-full min-h-[550px] bg-slate-900 border border-slate-800/80 rounded-2xl shadow-xl flex flex-col overflow-hidden font-sans"
          : "fixed bottom-24 right-6 w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-[90] flex flex-col overflow-hidden animate-fade-in h-[580px] max-h-[80vh] font-sans"
        }>
          
          {/* Header */}
          <div className="p-4 border-b border-slate-800/80 bg-slate-950 flex justify-between items-center relative">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-teal-500 via-emerald-500 to-indigo-500"></div>
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-teal-500/10 text-teal-400 rounded-lg border border-teal-500/20">
                <Sparkles size={16} className="text-teal-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider font-mono">FixIt Buddy</h4>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono uppercase">CampusFix Smart Assistant</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearChat}
                className="p-1.5 hover:bg-slate-850 text-slate-400 hover:text-slate-300 rounded-lg transition-all cursor-pointer"
                title="Reset/Clear chat session"
              >
                <Trash2 size={14} />
              </button>
              {!embedMode && (
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-slate-850 text-slate-400 hover:text-slate-300 rounded-lg transition-all cursor-pointer"
                  title="Minimize chat"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/40">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 text-[10px] shrink-0 font-mono mt-1">
                    <Bot size={12} />
                  </div>
                )}
                
                <div className="max-w-[85%] group flex flex-col">
                  <div
                    className={`rounded-xl p-3 text-xs leading-relaxed border relative shadow-sm ${
                      msg.role === "user"
                        ? "bg-teal-500/10 border-teal-500/20 text-slate-200 rounded-tr-none"
                        : "bg-slate-900 border-slate-800 text-slate-200 rounded-tl-none"
                    }`}
                  >
                    {/* Render Formatted HTML Content */}
                    <div className="space-y-1.5 break-words">
                      {formatMessageText(msg.content)}
                    </div>

                    {/* Quick copy helper inside chat bubbles */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        className="p-1 bg-slate-950/80 hover:bg-slate-950 text-slate-400 hover:text-slate-200 rounded border border-slate-800 transition-all cursor-pointer"
                        title="Copy message contents"
                      >
                        {copiedId === msg.id ? <Check size={10} className="text-teal-400" /> : <Copy size={10} />}
                      </button>
                    </div>
                  </div>

                  <span className={`text-[9px] text-slate-500 font-mono mt-1 px-1 ${msg.role === "user" ? "text-right" : "text-left"}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {/* API Error Notification */}
            {apiError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex gap-2 items-start animate-fade-in">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                <div>
                  <h5 className="font-bold text-[11px] font-mono uppercase tracking-wider">{apiError.title}</h5>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{apiError.message}</p>
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 text-[10px] shrink-0 font-mono mt-1">
                  <Bot size={12} className="animate-pulse" />
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl rounded-tl-none p-3 max-w-[85%]">
                  <div className="flex gap-1.5 items-center py-1">
                    <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Preset Chips helper */}
          {messages.length === 1 && (
            <div className="p-3 border-t border-slate-800/60 bg-slate-950/20">
              <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-2 flex items-center gap-1">
                <HelpCircle size={10} /> Quick Assist Starters:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_PROMPTS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(preset.text)}
                    className="py-1 px-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-750 hover:border-slate-700 rounded-xl text-[10px] font-mono transition-all text-left cursor-pointer shadow-sm hover:text-white"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form Input Area */}
          <form onSubmit={handleFormSubmit} className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask FixIt Buddy about complaint rules, categories, logins..."
              className="flex-1 bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-teal-500 font-sans"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2 bg-teal-500 text-slate-950 rounded-xl hover:bg-teal-400 transition-all disabled:opacity-40 flex items-center justify-center shrink-0 cursor-pointer"
            >
              <Send size={14} />
            </button>
          </form>

        </div>
      )}
    </>
  );
}
