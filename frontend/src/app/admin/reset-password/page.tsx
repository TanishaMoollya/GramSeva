'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { executePasswordReset } from '@/lib/api';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Real-time strength criteria checks
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()\-_=+[\]{}|;:,.<>?]/.test(password);
  const isStrengthValid = hasMinLength && hasUpper && hasLower && hasDigit && hasSpecial;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setErrorMsg('No reset token provided. Please request a new password reset link.');
      return;
    }
    if (!isStrengthValid) {
      setErrorMsg('Please satisfy all password complexity requirements.');
      return;
    }
    if (!passwordsMatch) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await executePasswordReset(token, password);
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/admin/login');
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Password reset failed. Token may be invalid or expired.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-700">
        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-center text-gov-primary mx-auto shadow-sm mb-3">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Create New Password
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Choose a strong, unique administrative password to secure your GramSeva account.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 mb-6">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isSuccess ? (
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Password Updated Successfully</h2>
            <p className="text-xs text-slate-600">
              Your new password is now active. Redirecting you to the Administrator Portal login...
            </p>
            <Link
              href="/admin/login"
              className="w-full bg-gov-primary hover:bg-blue-900 text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm mt-4"
            >
              <span>Sign In with New Password</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-gov-primary focus:border-gov-primary outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-gov-primary focus:border-gov-primary outline-none transition"
                />
              </div>
            </div>

            {/* Complexity Requirements Checklist */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-[11px] text-slate-600">
              <p className="font-semibold text-slate-700 mb-1">Security Standards:</p>
              <div className="grid grid-cols-2 gap-1">
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <Check className="w-3.5 h-3.5" />
                  <span>8+ Characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <Check className="w-3.5 h-3.5" />
                  <span>Uppercase Letter</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <Check className="w-3.5 h-3.5" />
                  <span>Lowercase Letter</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasDigit ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <Check className="w-3.5 h-3.5" />
                  <span>Number (0-9)</span>
                </div>
                <div className={`flex items-center gap-1.5 col-span-2 ${hasSpecial ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <Check className="w-3.5 h-3.5" />
                  <span>Special Character (!@#$%^&*)</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !isStrengthValid || !passwordsMatch}
              className="w-full bg-gov-primary hover:bg-blue-900 text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Confirm and Set Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="mt-4 text-center">
              <Link
                href="/admin/login"
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Login</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
