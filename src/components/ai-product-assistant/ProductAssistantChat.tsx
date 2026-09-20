import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../../services/nexusApi';
import {
  Sparkles,
  Send,
  Bot,
  User,
  X,
  RefreshCw,
  HelpCircle,
  TrendingDown,
  ShieldCheck,
  Truck,
  Layers,
  ChevronRight,
  Maximize2,
  Minimize2,
  AlertCircle
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  suggestedActions?: string[];
}

export interface ProductAssistantChatProps {
  activeProduct?: Product | null;
  onClearActiveProduct?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  mode?: 'embedded' | 'drawer' | 'modal';
  className?: string;
}

const DEFAULT_PROMPTS = [
  'What is the factory MOQ and production lead time?',
  'Explain the wholesale price ladder and volume savings',
  'What certifications verify materials (OEKO-TEX, REACH, GOTS)?',
  'Compare Air Express vs Chattogram Sea Freight options',
  'How do 50/50 advance production milestones work in NexOS?'
];

export const ProductAssistantChat: React.FC<ProductAssistantChatProps> = ({
  activeProduct,
  onClearActiveProduct,
  isOpen = true,
  onClose,
  mode = 'embedded',
  className = '',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-msg',
      role: 'model',
      text: `Hello! I am your **NexOS Supply Chain & Product Intelligence Advisor**, powered by Gemini. \n\nI can assist you with factory specs, material certifications, wholesale volume economics, production lead times in Bangladesh, and export freight routes.\n\nHow can I support your sourcing today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: [
        'Explain wholesale pricing tiers',
        'Inquire about custom Tech Packs',
        'Verify LWG leather / GOTS cotton standards'
      ]
    }
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // When active product changes, add helpful context notification
  useEffect(() => {
    if (activeProduct) {
      setMessages((prev) => [
        ...prev,
        {
          id: `product-context-${Date.now()}`,
          role: 'model',
          text: `🔍 **Focused Product:** [${activeProduct.sku}] **${activeProduct.title}**\n• **Category:** ${activeProduct.category || 'Atelier Goods'}\n• **Retail FOB Baseline:** $${activeProduct.retailPriceUsd || activeProduct.retailPrice || 0} USD\n• **Factory MOQ:** ${activeProduct.moq || 50} units | **Turnaround:** ${activeProduct.leadTimeDays || 21} days\n\nAsk me anything about volume tier discounts, fabric composition, or factory floor milestones for this item!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedActions: [
            `What is the discount on 500 units of ${activeProduct.sku}?`,
            `Request technical material dossier`,
            `Calculate shipping weight and box dimensions`
          ]
        }
      ]);
    }
  }, [activeProduct]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome-msg')
        .slice(-6)
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      const res = await fetch('/api/ai-product-assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
          contextProduct: activeProduct || null,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const modelMessage: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: data.text || data.fallbackText || 'Response received.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: data.suggestedActions || [],
      };

      setMessages((prev) => [...prev, modelMessage]);
    } catch (err: any) {
      console.warn('[ProductAssistantChat] API request issue:', err);
      // Fallback message to prevent app interruption
      setMessages((prev) => [
        ...prev,
        {
          id: `model-err-${Date.now()}`,
          role: 'model',
          text: `⚡ **NexOS Advisory (Offline Mode)**\n\nRegarding your inquiry: "${query}"\n\n• **Atelier Standards:** Factory MOQs typically range from 50 to 500 pieces with 14–28 day turnaround.\n• **Milestones:** Production begins upon 50% escrow advance deposit.\n• **Logistics:** Air express from Dhaka takes 3–5 business days, ocean freight via Chattogram 25–35 days.\n\n*(Note: Configure GEMINI_API_KEY in Project Settings for live generative intelligence.)*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedActions: [
            'How to configure GEMINI_API_KEY?',
            'View live catalog tiers',
            'Connect with human sourcing merchant'
          ]
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `reset-${Date.now()}`,
        role: 'model',
        text: 'Session history cleared. How can I assist with your supply chain inquiries?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: DEFAULT_PROMPTS.slice(0, 3)
      }
    ]);
  };

  if (!isOpen) return null;

  return (
    <div
      id="ai_product_assistant_container"
      className={`flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-100 ${
        isExpanded ? 'fixed inset-4 z-50 md:inset-10' : 'h-[620px] max-h-[85vh]'
      } ${className}`}
    >
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between px-4 py-3.5 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-orange-950">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-white">AI Product & Supply Chain Assistant</h2>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                Gemini 3.8 Flash
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Interactive specifications, bulk pricing tiers & factory compliance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleClearHistory}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
            title="Reset Conversation"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer hidden sm:flex"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
              title="Close Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Active Product Context Bar (if attached) ── */}
      {activeProduct && (
        <div className="px-4 py-2 bg-orange-950/30 border-b border-orange-900/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
            <span className="font-semibold text-orange-300 shrink-0">Inspecting Product:</span>
            <span className="text-slate-200 truncate font-mono text-[11px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
              {activeProduct.sku}
            </span>
            <span className="text-slate-300 truncate font-medium">{activeProduct.title}</span>
          </div>
          {onClearActiveProduct && (
            <button
              type="button"
              onClick={onClearActiveProduct}
              className="text-slate-400 hover:text-white text-[11px] flex items-center gap-1 ml-2 cursor-pointer shrink-0"
              title="Detach product context"
            >
              <X className="w-3.5 h-3.5" />
              <span>Detach</span>
            </button>
          )}
        </div>
      )}

      {/* ── Chat Messages Stream ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm scrollbar-thin">
        {messages.map((msg) => {
          const isModel = msg.role === 'model';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isModel ? 'items-start' : 'items-start flex-row-reverse'}`}
            >
              <div
                className={`w-7 h-7 rounded-xl shrink-0 flex items-center justify-center text-xs ${
                  isModel
                    ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-sm'
                    : 'bg-slate-700 text-slate-200'
                }`}
              >
                {isModel ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              <div
                className={`flex flex-col max-w-[85%] ${
                  isModel ? 'items-start' : 'items-end'
                }`}
              >
                <div
                  className={`px-4 py-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                    isModel
                      ? 'bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-tl-none shadow-sm'
                      : 'bg-orange-600 text-white rounded-tr-none shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>

                {/* Suggested Action Chips */}
                {isModel && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {msg.suggestedActions.map((action, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSendMessage(action)}
                        className="text-[11px] px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-orange-300 hover:text-white border border-slate-700 hover:border-orange-500/50 rounded-full transition-all cursor-pointer text-left flex items-center gap-1"
                      >
                        <span>{action}</span>
                        <ChevronRight className="w-3 h-3 opacity-60" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 items-start">
            <div className="w-7 h-7 rounded-xl shrink-0 flex items-center justify-center bg-gradient-to-tr from-amber-500 to-orange-500 text-white animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="px-4 py-2.5 bg-slate-800 border border-slate-700/60 rounded-2xl rounded-tl-none text-slate-400 text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
              <span>Analyzing factory telemetry and calculating supply chain parameters…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Quick Starter Questions ── */}
      {messages.length <= 3 && (
        <div className="px-4 py-2 bg-slate-950/50 border-t border-slate-800/60 overflow-x-auto scrollbar-none flex gap-1.5">
          {DEFAULT_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(prompt)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white rounded-lg text-xs whitespace-nowrap transition-all cursor-pointer shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* ── Bottom Input Bar ── */}
      <div className="p-3 bg-slate-950 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeProduct
                ? `Ask about MOQ, pricing tiers, or materials for ${activeProduct.sku}…`
                : 'Ask about Bangladesh factory capacity, MOQs, lead times, compliance…'
            }
            className="flex-1 bg-slate-900 border border-slate-700/80 focus:border-orange-500 text-slate-100 placeholder-slate-500 text-sm px-4 py-2.5 rounded-xl focus:outline-none transition-colors"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-1.5 transition-all cursor-pointer ${
              !inputText.trim() || isLoading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-orange-600 hover:bg-orange-500 text-white shadow-md shadow-orange-950'
            }`}
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-slate-500">
          <span>Supported by Google Gemini on NexOS Engine</span>
          <span>Savar & Gazipur Atelier Certified</span>
        </div>
      </div>
    </div>
  );
};

export default ProductAssistantChat;
