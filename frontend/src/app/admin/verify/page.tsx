'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, CheckCircle2, XCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { verifyAdminChallenge } from '@/lib/api';

function VerifyLinkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No verification token provided in URL. Please initiate a new login.');
      return;
    }

    let isMounted = true;

    async function executeVerification() {
      try {
        const data = await verifyAdminChallenge(token as string);
        if (!isMounted) return;

        // Save verified session
        localStorage.setItem('gramseva_admin_token', data.access_token);
        localStorage.setItem('gramseva_admin_user', JSON.stringify(data.user));
        sessionStorage.removeItem('gramseva_pending_challenge');

        setUserName(data.user.name);
        setStatus('success');

        // Automatically redirect to CRM Dashboard after 1.5 seconds
        setTimeout(() => {
          router.push('/admin');
        }, 1500);
      } catch (err: any) {
        if (!isMounted) return;
        setStatus('error');
        setErrorMsg(err.message || 'Verification link is invalid, has expired, or has already been used.');
      }
    }

    executeVerification();

    return () => {
      isMounted = false;
    };
  }, [token, router]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-700 text-center">
        {status === 'verifying' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-blue-50 border-2 border-blue-200 rounded-2xl flex items-center justify-center text-gov-primary mx-auto">
              <div className="w-8 h-8 border-3 border-gov-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Verifying Security Challenge
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Cryptographically validating your single-use verification token. Please hold on...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-200 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Verification Successful
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Welcome back, <strong>{userName || 'Administrator'}</strong>. Your authenticated session is active.
            </p>
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 font-medium flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Redirecting to CRM Dashboard...</span>
            </div>
            <button
              onClick={() => router.push('/admin')}
              className="w-full bg-gov-primary hover:bg-blue-900 text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm mt-4"
            >
              <span>Continue to Dashboard Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center justify-center text-red-600 mx-auto">
              <XCircle className="w-10 h-10" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Verification Failed
            </h1>
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 leading-relaxed text-left">
              <p className="font-semibold mb-1">Reason:</p>
              <p>{errorMsg}</p>
            </div>
            <p className="text-xs text-slate-500">
              Security links expire in 10 minutes and can only be used once. If your link has expired, please log in again to generate a new verification link.
            </p>
            <Link
              href="/admin/login"
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm mt-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Admin Login</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyLinkContent />
    </Suspense>
  );
}
