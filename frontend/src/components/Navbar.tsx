'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Building2, 
  FileText, 
  Search, 
  MessageSquare, 
  ShieldCheck, 
  PhoneCall,
  Menu,
  X,
  Languages
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lang, setLang] = useState<'EN' | 'KN'>('EN');

  const navLinks = [
    { href: '/', label: lang === 'EN' ? 'Home' : 'ಮುಖಪುಟ', icon: Building2 },
    { href: '/register', label: lang === 'EN' ? 'File Complaint' : 'ದೂರು ಸಲ್ಲಿಸಿ', icon: FileText },
    { href: '/track', label: lang === 'EN' ? 'Track Status' : 'ಸ್ಥಿತಿ ಪರಿಶೀಲನೆ', icon: Search },
    { href: '/whatsapp', label: lang === 'EN' ? 'WhatsApp Bot' : 'ವಾಟ್ಸಾಪ್ ಸೇವೆ', icon: MessageSquare },
    { href: '/admin', label: lang === 'EN' ? 'Admin' : 'ಅಧಿಕಾರಿಗಳ ಲಾಗಿನ್', icon: ShieldCheck },
  ];

  const toggleLanguage = () => {
    setLang(prev => (prev === 'EN' ? 'KN' : 'EN'));
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      {/* Top Government Banner */}
      <div className="bg-gov-primary text-white text-xs py-1.5 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="font-semibold tracking-wide">
              🇮🇳 {lang === 'EN' ? 'Government of Karnataka | Gram Panchayat Grievance Portal' : 'ಕರ್ನಾಟಕ ಸರ್ಕಾರ | ಗ್ರಾಮ ಪಂಚಾಯತ್ ಸಾರ್ವಜನಿಕ ಕುಂದುಕೊರತೆ ನಿವಾರಣಾ ಪೋರ್ಟಲ್'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
           
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded transition font-medium"
              title="Toggle English / Kannada"
            >
              <Languages className="w-3 h-3" />
              <span>{lang === 'EN' ? 'ಕನ್ನಡ' : 'English'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-gov-primary to-blue-700 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <Building2 className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-slate-900">Gram<span className="text-gov-secondary">Seva</span></span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">AI Powered</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium -mt-0.5">
              Panchayat Grievance Redressal
            </p>
          </div>
        </Link>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-gov-primary/10 text-gov-primary'
                    : 'text-slate-600 hover:text-gov-primary hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile menu button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1 shadow-lg">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold ${
                  isActive
                    ? 'bg-gov-primary/10 text-gov-primary'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-5 h-5 text-gov-primary" />
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
