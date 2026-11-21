'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff, KeyRound } from 'lucide-react';
import { adminLogin } from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  
  // Both fields are strictly empty upon initial load
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check remembered email preference on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('gramseva_remembered_admin_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberEmail(true);
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Stage A: Password authentication
      const res = await adminLogin(email, password);

      // Handle remember email preference
      if (typeof window !== 'undefined') {
        if (rememberEmail) {
          localStorage.setItem('gramseva_remembered_admin_email', email.trim().toLowerCase());
        } else {
          localStorage.removeItem('gramseva_remembered_admin_email');
        }

        // Store pending challenge details for Stage B verification
        sessionStorage.setItem('gramseva_pending_challenge', JSON.stringify({
          challenge_id: res.challenge_id,
          email: res.email,
          masked_email: res.masked_email,
          expires_in_minutes: res.expires_in_minutes,
          dev_verification_url: res.dev_verification_url || null,
          initiated_at: new Date().toISOString()
        }));
      }

      // Transition to Stage B: Email Verification waiting screen
      router.push('/admin/verify-login');
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify your official credentials.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-700">
        <div className="text-center space-y-2 mb-8">
          <div className="w-14 h-14 bg-gov-primary rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg mb-3">
            <Building2 className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Gram<span className="text-gov-secondary">Seva</span> Administrator Portal
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Gram Panchayat Official Governance & CRM Authentication
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 mb-6">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Official Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                placeholder="officer@gramseva.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-gov-primary focus:border-gov-primary outline-none transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Secure Password
              </label>
              <Link 
                href="/admin/forgot-password" 
                className="text-xs text-gov-primary hover:text-blue-800 font-semibold transition"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-gov-primary focus:border-gov-primary outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
              <input
                type="checkbox"
                checked={rememberEmail}
                onChange={(e) => setRememberEmail(e.target.checked)}
                className="rounded border-slate-300 text-gov-primary focus:ring-gov-primary"
              />
              <span>Remember my email</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full bg-gov-primary hover:bg-blue-900 text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Authenticate & Request Verification</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col gap-2 text-center text-xs text-slate-500">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-amber-500" />
            <span>Strict 2-Stage Security: Every login requires email link confirmation.</span>
          </p>
          <Link href="/" className="hover:text-gov-primary transition font-medium mt-1">
            ← Return to Citizen Portal Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
