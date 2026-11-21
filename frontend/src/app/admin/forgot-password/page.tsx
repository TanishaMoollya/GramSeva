'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { requestPasswordReset } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await requestPasswordReset(email);
      setIsSubmitted(true);
      if (res.dev_reset_url) {
        setDevResetUrl(res.dev_reset_url);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to process password reset request.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-700">
        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center text-amber-600 mx-auto shadow-sm mb-3">
            <Mail className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Reset Password
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Enter your official administrative email address. We will send a secure 15-minute recovery link.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 mb-6">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isSubmitted ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2 text-left">
              <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Reset Instructions Dispatched</span>
              </div>
              <p className="leading-relaxed">
                If an active administrator account is registered under <strong>{email}</strong>, a password reset email has been sent. Please check your inbox and spam folder.
              </p>
            </div>

            {devResetUrl && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-left">
                <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-800">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Demonstration Mode Active</span>
                </div>
                <p className="text-[11px] text-amber-700 mb-2">
                  Direct simulation link captured for evaluation:
                </p>
                <a
                  href={devResetUrl}
                  className="inline-block bg-gov-primary hover:bg-blue-900 text-white font-semibold text-xs py-2 px-3 rounded-lg shadow-sm transition"
                >
                  Open Password Reset Form &rarr;
                </a>
              </div>
            )}

            <Link
              href="/admin/login"
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm mt-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Login</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Registered Official Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="officer@gramseva.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-gov-primary focus:border-gov-primary outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full bg-gov-primary hover:bg-blue-900 text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Send Password Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="mt-4 text-center">
              <Link
                href="/admin/login"
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold inline-flex items-center gap-1.5 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Admin Sign In</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
