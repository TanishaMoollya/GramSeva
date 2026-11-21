'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, UserCheck, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, Building2, Check } from 'lucide-react';
import { validateAdminInvitation, acceptAdminInvitation } from '@/lib/api';

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [invitationData, setInvitationData] = useState<{
    email: string;
    full_name: string;
    role: string;
    department_name: string;
    invited_by: string;
  } | null>(null);

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setErrorMsg('No invitation token provided. Please use the complete link from your invitation email.');
      setIsLoading(false);
      return;
    }

    async function checkToken() {
      try {
        const data = await validateAdminInvitation(token as string);
        setInvitationData(data);
        setFullName(data.full_name);
      } catch (err: any) {
        setErrorMsg(err.message || 'Invitation is invalid, has expired, or has already been accepted.');
      } finally {
        setIsLoading(false);
      }
    }

    checkToken();
  }, [token]);

  // Password complexity checks
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()\-_=+[\]{}|;:,.<>?]/.test(password);
  const isStrengthValid = hasMinLength && hasUpper && hasLower && hasDigit && hasSpecial;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!isStrengthValid) {
      setErrorMsg('Please ensure your password satisfies all security requirements.');
      return;
    }
    if (!passwordsMatch) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await acceptAdminInvitation(token, password, fullName);
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete registration.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-700">
        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 bg-gov-primary rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg mb-3">
            <Building2 className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Gram<span className="text-gov-secondary">Seva</span> Admin Onboarding
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Activate Your Official Administrator Account
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 mb-6">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-gov-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Validating official invitation credentials...</p>
          </div>
        ) : isSuccess ? (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-200 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Account Activated Successfully!</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your administrator profile is now active. As mandated by security policy, please sign in with your email and password to receive your single-use verification link.
            </p>
            <Link
              href="/admin/login"
              className="w-full bg-gov-primary hover:bg-blue-900 text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm mt-4"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Proceed to Administrator Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : invitationData ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Invitation Summary Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Official Email:</span>
                <span className="font-mono font-semibold text-slate-800">{invitationData.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Assigned Role:</span>
                <span className="font-semibold text-gov-primary">
                  {invitationData.role === 'primary_admin' ? 'Primary Administrator' : 'Department Administrator'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Department:</span>
                <span className="font-semibold text-slate-800">{invitationData.department_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Invited By:</span>
                <span className="text-slate-700">{invitationData.invited_by}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-gov-primary focus:border-gov-primary outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Create Secure Password
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
                Confirm Password
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

            {/* Checklist */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-[11px] text-slate-600">
              <p className="font-semibold text-slate-700 mb-1">Password Requirements:</p>
              <div className="grid grid-cols-2 gap-1">
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <Check className="w-3.5 h-3.5" />
                  <span>8+ Characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <Check className="w-3.5 h-3.5" />
                  <span>Uppercase</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <Check className="w-3.5 h-3.5" />
                  <span>Lowercase</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasDigit ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <Check className="w-3.5 h-3.5" />
                  <span>Number</span>
                </div>
                <div className={`flex items-center gap-1.5 col-span-2 ${hasSpecial ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <Check className="w-3.5 h-3.5" />
                  <span>Special Symbol (!@#$%)</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !isStrengthValid || !passwordsMatch || !fullName.trim()}
              className="w-full bg-gov-primary hover:bg-blue-900 text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  <span>Complete Onboarding & Activate</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
