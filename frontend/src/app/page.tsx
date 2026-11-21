'use client';

import React from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Search, 
  MessageSquare, 
  Lightbulb, 
  Trash2, 
  Construction, 
  Droplet, 
  Waves, 
  HelpCircle, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Sparkles,
  MapPin,
  Send
} from 'lucide-react';

const CATEGORIES = [
  {
    id: 'streetlight',
    name: 'Streetlight issues',
    description: 'Broken bulbs, dark stretches, timer faults, damaged light poles, and wire sparks.',
    icon: Lightbulb,
    color: 'from-amber-500 to-yellow-600',
    bg: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  {
    id: 'garbage',
    name: 'Garbage collection',
    description: 'Uncollected domestic waste, weekly shandy litter, overflowing village bins, and illegal dumps.',
    icon: Trash2,
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  {
    id: 'potholes',
    name: 'Potholes and road damage',
    description: 'Crater-like potholes, washed-out village gravel roads, broken culverts, and dangerous curves.',
    icon: Construction,
    color: 'from-orange-500 to-red-600',
    bg: 'bg-orange-50 text-orange-700 border-orange-200'
  },
  {
    id: 'water',
    name: 'Water supply',
    description: 'Borewell pump failure, pipe bursts, contaminated drinking water, and missing water tankers.',
    icon: Droplet,
    color: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  {
    id: 'drainage',
    name: 'Drainage and sanitation',
    description: 'Blocked open gutters, rainwater overflow into compounds, stagnant sewage, and foul odor.',
    icon: Waves,
    color: 'from-cyan-500 to-blue-600',
    bg: 'bg-cyan-50 text-cyan-700 border-cyan-200'
  },
  {
    id: 'other',
    name: 'Other public issues',
    description: 'Pathway encroachments, stray animals, playground hazards, and community infrastructure.',
    icon: HelpCircle,
    color: 'from-purple-500 to-indigo-600',
    bg: 'bg-purple-50 text-purple-700 border-purple-200'
  }
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-900 via-gov-primary to-slate-900 text-white py-16 sm:py-24">
        {/* Subtle decorative background circles */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-inner">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Next-Gen Panchayati Raj Citizen Redressal</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                Empowering Rural Citizens with <span className="text-amber-400">AI-Driven</span> Grievance Resolution
              </h1>

              <p className="text-base sm:text-lg text-blue-100/90 leading-relaxed max-w-2xl">
                GramSeva connects village residents directly with Gram Panchayat officers. Submit grievances via website or official WhatsApp chatbot. Powered by Google Gemini AI for instant categorization, priority tagging, and automated departmental dispatch.
              </p>

              {/* Call to Actions */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/register"
                  className="flex items-center gap-2 bg-gov-secondary hover:bg-amber-600 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  <FileText className="w-5 h-5" />
                  <span>Register a Complaint</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>

                <Link
                  href="/track"
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/30 font-semibold px-6 py-3.5 rounded-xl backdrop-blur transition-all duration-200"
                >
                  <Search className="w-5 h-5 text-amber-300" />
                  <span>Track Status</span>
                </Link>

                <Link
                  href="/whatsapp"
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-3.5 rounded-xl shadow-md transition-all duration-200"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>WhatsApp Bot</span>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-6 border-t border-white/10 grid grid-cols-3 gap-4 text-xs text-blue-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Direct Panchayat Escalation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Average Turnaround 48h</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Transparent Status History</span>
                </div>
              </div>
            </div>

            {/* Right Card: Quick Complaint Track / Overview */}
            <div className="lg:col-span-5">
              <div className="bg-white/95 backdrop-blur-md text-slate-900 rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/20">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">Instant Grievance Lookup</h3>
                    <p className="text-xs text-slate-500">Check current redressal status in real-time</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-gov-primary flex items-center justify-center font-bold">
                    <Search className="w-5 h-5" />
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const tid = (form.elements.namedItem('trackingId') as HTMLInputElement).value;
                    if (tid) window.location.href = `/track?id=${encodeURIComponent(tid)}`;
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Grievance Tracking ID
                    </label>
                    <input
                      name="trackingId"
                      type="text"
                      placeholder="e.g. GS-2026-1001"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-gov-primary focus:border-gov-primary outline-none uppercase font-mono tracking-wide"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gov-primary hover:bg-blue-900 text-white font-semibold py-3 rounded-xl shadow text-sm transition flex items-center justify-center gap-2"
                  >
                    <span>Check Timeline & Proof</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-slate-100 bg-slate-50 -mx-6 -mb-6 p-4 rounded-b-2xl text-xs text-slate-600 flex items-center justify-between">
                  <span className="font-medium text-slate-700">Prefer WhatsApp?</span>
                  <Link
                    href="/whatsapp"
                    className="text-emerald-700 hover:text-emerald-800 font-bold inline-flex items-center gap-1"
                  >
                    Chat with Bot <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grievance Categories Section */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-gov-primary bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              Citizen Redressal Areas
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3">
              Grievance Categories Handled
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Select any civic issue to file an official report directly with the responsible Gram Panchayat department.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.id}
                  className="bg-slate-50 hover:bg-white rounded-2xl p-6 border border-slate-200/80 hover:border-gov-primary/30 hover:shadow-lg transition-all duration-200 flex flex-col justify-between group"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6 text-gov-primary" />
                    </div>
                    <h3 className="font-bold text-base text-slate-900 mb-2 group-hover:text-gov-primary transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">
                      {cat.description}
                    </p>
                  </div>
                  <Link
                    href={`/register?category=${encodeURIComponent(cat.name)}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-gov-primary group-hover:text-gov-secondary transition"
                  >
                    <span>File Grievance</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              Simple 4-Step Process
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3">
              How GramSeva Works for Citizens
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              From submission to field action with photo resolution proof.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative">
              <div className="w-8 h-8 rounded-full bg-gov-primary text-white font-bold flex items-center justify-center text-sm mb-4">
                1
              </div>
              <h4 className="font-bold text-sm text-slate-900 mb-2">Citizen Submits</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Submit grievance via Web portal form with optional GPS map location & photo, or send "Hi" to GramSeva WhatsApp Bot.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative">
              <div className="w-8 h-8 rounded-full bg-gov-secondary text-white font-bold flex items-center justify-center text-sm mb-4">
                2
              </div>
              <h4 className="font-bold text-sm text-slate-900 mb-2">Gemini AI Analysis</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                AI analyzes problem description, extracts category, assigns priority (Low to Critical), and suggests the responsible department.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm mb-4">
                3
              </div>
              <h4 className="font-bold text-sm text-slate-900 mb-2">Panchayat Action</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Panchayat Development Officer validates AI suggestions, issues work order to lineman/supervisor, and updates progress.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm mb-4">
                4
              </div>
              <h4 className="font-bold text-sm text-slate-900 mb-2">Resolution & Proof</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Field team clears issue and uploads resolution photo proof. Citizen receives instant WhatsApp notification and can verify online.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WhatsApp Feature Showcase Banner */}
      <section className="py-14 bg-gradient-to-r from-emerald-800 to-teal-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 bg-emerald-700/60 text-emerald-200 text-xs px-3 py-1 rounded-full font-medium">
                <MessageSquare className="w-3.5 h-3.5" /> Meta WhatsApp Cloud API Integration
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold">
                No App Download Needed. File Grievances on WhatsApp!
              </h3>
              <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
                Rural citizens can simply send a message on WhatsApp. Our automated conversational bot guides them through selecting category, description, and location in their native language.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-4">
              <Link
                href="/whatsapp"
                className="bg-white hover:bg-emerald-50 text-emerald-900 font-bold px-6 py-3.5 rounded-xl shadow-lg transition flex items-center gap-2 text-sm"
              >
                <MessageSquare className="w-4 h-4 text-emerald-700" />
                <span>Launch WhatsApp Simulator</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
