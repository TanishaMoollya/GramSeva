'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Clock, RefreshCw, ArrowLeft, ShieldCheck, CheckCircle2, AlertCircle, ExternalLink, Sparkles } from 'lucide-react';
import { resendAdminChallenge } from '@/lib/api';

export default function VerifyLoginPage() {
  const router = useRouter();

  const [challengeData, setChallengeData] = useState<{
    challenge_id?: string;
    email?: string;
    masked_email?: string;
    expires_in_minutes?: number;
    dev_verification_url?: string | null;
  } | null>(null);

  const [cooldown, setCooldown] = useState(30);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('gramseva_pending_challenge');
      if (!stored) {
        // No pending login challenge found, redirect back to login
        router.push('/admin/login');
        return;
      }
      try {
        setChallengeData(JSON.parse(stored));
      } catch {
        router.push('/admin/login');
      }
    }
  }, [router]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || isResending || !challengeData?.email) return;
    setIsResending(true);
    setResendStatus(null);
    setErrorMsg(null);

    try {
      const res = await resendAdminChallenge(challengeData.email);
      setResendStatus('A fresh verification link has been sent to your email.');
      setCooldown(30); // Reset 30s cooldown
      if (res.dev_verification_url) {
        setChallengeData((prev) => ({
          ...prev,
          dev_verification_url: res.dev_verification_url,
        }));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to resend verification email at this moment.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-700 text-center">
        {/* Animated Security Icon */}
        <div className="w-16 h-16 bg-blue-50 border-2 border-blue-200 rounded-2xl flex items-center justify-center text-gov-primary mx-auto mb-4 relative shadow-sm">
          <Mail className="w-8 h-8 text-gov-primary" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-white animate-pulse" />
        </div>

        {/* Heading & Mandatory Text */}
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
          Verify Your Login
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          We have sent a secure verification link to your registered email address. Please open your inbox and click the link to continue to the GramSeva Administrator Portal.
        </p>

        {/* Masked Email Badge */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 text-center">
          <p className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">
            Verification Sent To
          </p>
          <p className="font-mono text-base font-semibold text-gov-primary tracking-wide">
            {challengeData?.masked_email || 'Loading registered email...'}
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-amber-700">
            <Clock className="w-3.5 h-3.5" />
            <span>Link expires in <strong>10 minutes</strong> &bull; Single-use only</span>
          </div>
        </div>

        {/* Status Alerts */}
        {resendStatus && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{resendStatus}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || isResending}
            className="w-full py-3 px-4 rounded-xl border border-slate-300 font-semibold text-sm text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
            <span>
              {isResending
                ? 'Sending fresh challenge...'
                : cooldown > 0
                ? `Resend Verification Email (${cooldown}s)`
                : 'Resend Verification Email'}
            </span>
          </button>

          <Link
            href="/admin/login"
            className="w-full py-2.5 px-4 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Login</span>
          </Link>
        </div>

        {/* Demonstration / Evaluation Helper (Visible in dev/demo mode) */}
        {challengeData?.dev_verification_url && (
          <div className="mt-8 pt-6 border-t border-slate-200 text-left">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900">
              <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-800">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Academic Demonstration Mode Active</span>
              </div>
              <p className="text-[11px] text-amber-700 mb-2 leading-relaxed">
                In this local evaluation environment, the email verification link was generated and captured:
              </p>
              <a
                href={challengeData.dev_verification_url}
                className="inline-flex items-center gap-1.5 bg-gov-primary hover:bg-blue-900 text-white font-semibold text-xs py-2 px-3 rounded-lg shadow-sm transition"
              >
                <span>Simulate Clicking Email Link</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
