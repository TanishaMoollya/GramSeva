'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  MessageSquare, 
  Send, 
  RotateCcw, 
  HelpCircle, 
  CheckCircle2, 
  ExternalLink, 
  Sparkles,
  Info,
  Smartphone
} from 'lucide-react';
import { simulateWhatsApp } from '@/lib/api';

interface ChatMessage {
  id: string;
  sender: 'citizen' | 'bot';
  text: string;
  timestamp: string;
  trackingId?: string | null;
}

export default function WhatsAppSimulatorPage() {
  const [phoneNumber, setPhoneNumber] = useState('+919845123456');
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'bot',
      text: 'Namaskara! Welcome to *GramSeva* — AI-Powered Panchayat Grievance Redressal Portal.\n\nReply with:\n• *1* or *Hi* — Register a New Complaint\n• *TRACK <ID>* — Check Status (e.g. TRACK GS-2026-1001)\n• *HELP* — Show Assistance Menu',
      timestamp: 'Just now',
    },
  ]);
  const [currentStep, setCurrentStep] = useState('WELCOME');
  const [createdComplaintId, setCreatedComplaintId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || isSending) return;

    setInputText('');
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'citizen',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    try {
      const res = await simulateWhatsApp({
        phone_number: phoneNumber,
        message_text: textToSend,
      });

      setCurrentStep(res.current_step);
      if (res.tracking_id) {
        setCreatedComplaintId(res.tracking_id);
      }

      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        sender: 'bot',
        text: res.bot_reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        trackingId: res.tracking_id,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'bot',
          text: '⚠️ Network error communicating with GramSeva WhatsApp service.',
          timestamp: 'Just now',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleResetSession = () => {
    handleSendMessage('RESET');
  };

  return (
    <div className="py-12 bg-slate-100 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-8">
        {/* Header Breadcrumbs */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <Link href="/" className="hover:text-gov-primary">Home</Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">WhatsApp Assistant</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                <span className="text-emerald-600">GramSeva WhatsApp Bot</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Interactive Simulator
                </span>
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Demonstrates the official Meta WhatsApp Cloud API conversational intake and real-time database grievance registration.
              </p>
            </div>
            <button
              onClick={handleResetSession}
              className="inline-flex items-center gap-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl border border-slate-300 shadow-sm transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Chat Session</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: WhatsApp Phone Device Frame */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border-4 border-slate-800 overflow-hidden flex flex-col h-[650px]">
              {/* WhatsApp Device Top Bar */}
              <div className="bg-emerald-800 text-white px-4 py-3 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-white text-base">
                    🏛️
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-wide leading-none">GramSeva Panchayat</h3>
                    <span className="text-[10px] text-emerald-200">Official Grievance Bot • Online</span>
                  </div>
                </div>
                <div className="text-[11px] bg-emerald-700/80 px-2 py-0.5 rounded text-emerald-100 font-mono">
                  {phoneNumber}
                </div>
              </div>

              {/* Chat Message Stream */}
              <div
                className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#E5DDD5]"
                style={{
                  backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              >
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.sender === 'citizen' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-sm whitespace-pre-line leading-relaxed ${
                        m.sender === 'citizen'
                          ? 'bg-[#DCF8C6] text-slate-800 rounded-tr-none'
                          : 'bg-white text-slate-900 rounded-tl-none border border-slate-100'
                      }`}
                    >
                      {m.text}
                      <span className="block text-[9px] text-slate-400 text-right mt-1 font-sans">
                        {m.timestamp}
                      </span>
                    </div>

                    {/* If tracking ID was generated, give direct button */}
                    {m.trackingId && (
                      <Link
                        href={`/track?id=${m.trackingId}`}
                        className="mt-1.5 inline-flex items-center gap-1 bg-gov-primary hover:bg-blue-900 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow transition"
                      >
                        <span>View Online Status Timeline</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Suggestion Pills */}
              <div className="bg-slate-100 border-t border-slate-200 px-3 py-2 flex items-center gap-2 overflow-x-auto text-[11px]">
                <span className="text-slate-500 font-medium shrink-0">Quick reply:</span>
                <button
                  onClick={() => handleSendMessage('Hi')}
                  className="bg-white hover:bg-emerald-50 text-slate-700 px-2.5 py-1 rounded-full border border-slate-300 font-medium shrink-0 transition"
                >
                  Hi
                </button>
                <button
                  onClick={() => handleSendMessage('4')}
                  className="bg-white hover:bg-emerald-50 text-slate-700 px-2.5 py-1 rounded-full border border-slate-300 font-medium shrink-0 transition"
                >
                  4 (Water Supply)
                </button>
                <button
                  onClick={() => handleSendMessage('YES')}
                  className="bg-white hover:bg-emerald-50 text-slate-700 px-2.5 py-1 rounded-full border border-slate-300 font-medium shrink-0 transition"
                >
                  YES (Confirm)
                </button>
                <button
                  onClick={() => handleSendMessage('TRACK GS-2026-1001')}
                  className="bg-white hover:bg-emerald-50 text-slate-700 px-2.5 py-1 rounded-full border border-slate-300 font-medium shrink-0 transition"
                >
                  TRACK GS-2026-1001
                </button>
              </div>

              {/* Input Area */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="bg-white p-3 border-t border-slate-200 flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Type a reply (e.g. Hi, 1, description)..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-full border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
                />
                <button
                  type="submit"
                  disabled={isSending || !inputText.trim()}
                  className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition disabled:opacity-50 shrink-0 shadow"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Integration Details & Live Instructions */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-gov-primary" />
                <span>How This Integration Works</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Both the <b>Website Portal</b> and this <b>WhatsApp Chatbot</b> communicate with the exact same FastAPI backend and Supabase PostgreSQL database.
              </p>

              <div className="space-y-3 pt-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-800 block mb-1">1. Conversational State Machine</span>
                  <p className="text-slate-600">
                    The bot maintains an active session in the <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">whatsapp_conversations</code> table, collecting Category → Description → Location → Name → Photo confirmation.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-800 block mb-1">2. Single Shared Database</span>
                  <p className="text-slate-600">
                    Complaints created via WhatsApp are inserted into the same <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">complaints</code> table with <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">source: 'whatsapp'</code> and immediately visible on the Admin CRM table!
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-800 block mb-1">3. Automated Notifications</span>
                  <p className="text-slate-600">
                    When the Panchayat Officer updates the status in the Admin CRM (e.g. from <i>Submitted</i> to <i>In Progress</i>), an outbound WhatsApp message is triggered to the citizen's mobile number.
                  </p>
                </div>
              </div>
            </div>

            {/* Production Meta Cloud API Settings Guide */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Smartphone className="w-4 h-4" />
                <span>Meta WhatsApp Cloud API Production Setup</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                To connect a real WhatsApp Business test number:
              </p>
              <div className="bg-slate-800 p-3.5 rounded-xl font-mono text-[11px] text-emerald-400 space-y-1">
                <p># Callback URL in Meta Developer Dashboard:</p>
                <p className="text-white">https://your-ngrok-url.ngrok-free.app/api/whatsapp/webhook</p>
                <p className="pt-2"># Webhook Verify Token:</p>
                <p className="text-white">gramseva_webhook_secret_token_2026</p>
              </div>
              <p className="text-[11px] text-slate-400">
                Full step-by-step instructions with ngrok commands are documented in <code className="text-amber-300">docs/whatsapp_setup.md</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
