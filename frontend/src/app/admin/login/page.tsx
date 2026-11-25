'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  RotateCcw,
  Layers,
  ArrowLeft,
  Info
} from 'lucide-react';
import { adminLogin, fetchCaptcha, CaptchaResponse } from '@/lib/api';

type AuthRole = 'main_admin' | 'department_officer';

export default function AdminLoginPage() {
  const router = useRouter();

  // Role Selection State: null = showing initial selection screen
  const [selectedRole, setSelectedRole] = useState<AuthRole | null>(null);

  // Login Form States
  const [identifier, setIdentifier] = useState(''); // email or employee_id
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // CAPTCHA State
  const [captchaData, setCaptchaData] = useState<CaptchaResponse | null>(null);
  const [captchaInput, setCaptchaInput] = useState('');
  const [isCaptchaLoading, setIsCaptchaLoading] = useState(false);

  // Load CAPTCHA
  const loadCaptcha = async () => {
    setIsCaptchaLoading(true);
    try {
      const data = await fetchCaptcha();
      setCaptchaData(data);
      setCaptchaInput('');
    } catch (e) {
      console.error('Failed to load CAPTCHA:', e);
    } finally {
      setIsCaptchaLoading(false);
    }
  };

  // Check remembered email preference on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('gramseva_remembered_admin_email');
      if (savedEmail) {
        setIdentifier(savedEmail);
        setRememberEmail(true);
      }
    }
  }, []);

  // When role changes, refresh CAPTCHA & reset errors
  useEffect(() => {
    if (selectedRole) {
      setErrorMsg(null);
      setSuccessMsg(null);
      loadCaptcha();
    }
  }, [selectedRole]);

  // Main Admin & Department Officer Login Submit Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    if (!captchaInput.trim()) {
      setErrorMsg('Please enter the CAPTCHA code shown.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await adminLogin(
        identifier.trim(),
        password,
        selectedRole,
        captchaData?.captcha_id,
        captchaInput.trim().toUpperCase()
      );

      // Handle remember email preference for Main Admin
      if (typeof window !== 'undefined' && selectedRole === 'main_admin') {
        if (rememberEmail) {
          localStorage.setItem('gramseva_remembered_admin_email', identifier.trim().toLowerCase());
        } else {
          localStorage.removeItem('gramseva_remembered_admin_email');
        }
      }

      // Branch 1: Main Admin -> Requires 2-Stage Email Link Verification
      if (selectedRole === 'main_admin') {
        sessionStorage.setItem(
          'gramseva_pending_challenge',
          JSON.stringify({
            challenge_id: res.challenge_id,
            email: res.email,
            masked_email: res.masked_email,
            expires_in_minutes: res.expires_in_minutes,
            dev_verification_url: res.dev_verification_url || null,
            initiated_at: new Date().toISOString(),
          })
        );
        router.push('/admin/verify-login');
        return;
      }

      // Branch 2: Department Officer -> Direct JWT Session
      if (selectedRole === 'department_officer') {
        localStorage.setItem('gramseva_admin_token', res.access_token);
        localStorage.setItem('gramseva_admin_user', JSON.stringify(res.user));
        router.push('/admin/department');
        return;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials and CAPTCHA.');
      loadCaptcha(); // Refresh CAPTCHA on failure
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-3xl p-6 sm:p-10 shadow-2xl border border-slate-700">
        {/* Government Portal Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 bg-gov-primary rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg mb-2">
            <Building2 className="w-8 h-8 text-amber-400" />
          </div>
          
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Gram<span className="text-gov-secondary">Seva</span> Administration
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            AI-Assisted Smart Civic Issue Management and Resolution System
          </p>
        </div>

        {/* ==================================================================== */}
        {/* VIEW 1: INITIAL ROLE SELECTION CARDS                                 */}
        {/* ==================================================================== */}
        {selectedRole === null ? (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Select Login Role
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Choose your official role category to proceed to the secure login interface
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card A: Main Admin (Panchayat Officer) */}
              <button
                type="button"
                onClick={() => setSelectedRole('main_admin')}
                className="group relative p-5 rounded-2xl border-2 border-slate-200 hover:border-gov-primary bg-slate-50/50 hover:bg-blue-50/30 transition text-left flex flex-col justify-between shadow-sm hover:shadow-md"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-gov-primary/10 text-gov-primary flex items-center justify-center mb-3 group-hover:bg-gov-primary group-hover:text-white transition">
                    <ShieldCheck className="w-6 h-6 text-amber-500 group-hover:text-amber-300" />
                  </div>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-gov-primary mb-1">
                    Central Authority
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-gov-primary transition">
                    Main Admin
                  </h3>
                  <p className="text-xs font-semibold text-slate-600 mb-2">
                    (Panchayat Officer)
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Supervise platform activities, monitor all departments, invite and manage department officers, and review panchayat grievance records.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-gov-primary">
                  <span>Sign In as Admin</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                </div>
              </button>

              {/* Card B: Department Officer */}
              <button
                type="button"
                onClick={() => setSelectedRole('department_officer')}
                className="group relative p-5 rounded-2xl border-2 border-slate-200 hover:border-emerald-600 bg-slate-50/50 hover:bg-emerald-50/30 transition text-left flex flex-col justify-between shadow-sm hover:shadow-md"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition">
                    <Layers className="w-6 h-6 text-emerald-600 group-hover:text-white" />
                  </div>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 mb-1">
                    Department-Wise Redressal
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition">
                    Department Officer
                  </h3>
                  <p className="text-xs font-semibold text-slate-600 mb-2">
                    (Multi-Department)
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Resolve assigned grievances across Sanitation (SAN), Public Works (PWD), Water (WTR), Electricity (ELE), and Admin (ADM).
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-emerald-700">
                  <span>Department Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                </div>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
              <Link href="/" className="hover:text-gov-primary transition font-medium">
                ← Return to Citizen Portal Homepage
              </Link>
            </div>
          </div>
        ) : (
          /* ==================================================================== */
          /* VIEW 2: ROLE-SPECIFIC LOGIN INTERFACE                                */
          /* ==================================================================== */
          <div className="space-y-5">
            {/* Top Bar with Role Info & Back Navigation */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2">
                {selectedRole === 'main_admin' ? (
                  <div className="w-7 h-7 rounded-lg bg-gov-primary flex items-center justify-center text-amber-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                    <Layers className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <span className="text-xs font-extrabold text-slate-900 block leading-tight">
                    {selectedRole === 'main_admin'
                      ? 'Main Admin (Panchayat Officer)'
                      : 'Department Officer Sign In'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {selectedRole === 'main_admin' ? 'Centralized Supervision' : 'Departmental Isolation'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole(null);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-gov-primary hover:text-blue-900 transition bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Change Role</span>
              </button>
            </div>

            {/* Security Notice for Department Officers */}
            {selectedRole === 'department_officer' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
                <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Authorized departmental staff access only. New department officers are invited and registered directly by the <strong>Panchayat Development Officer (Main Admin)</strong> via official invitation link.
                </p>
              </div>
            )}

            {/* Error Message Box */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* Success Message Box */}
            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                <span>{successMsg}</span>
              </div>
            )}

            {/* LOGIN FORM */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {selectedRole === 'main_admin'
                    ? 'Panchayat Officer Official Email'
                    : 'Official Email or Employee ID (e.g. SAN-OFF-001)'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder={
                      selectedRole === 'main_admin'
                        ? 'officer@gramseva.gov.in'
                        : 'official.email@gramseva.gov.in or SAN-OFF-001'
                    }
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-gov-primary focus:border-gov-primary outline-none transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
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
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-gov-primary focus:border-gov-primary outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Government Portal CAPTCHA Box */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Security Verification (CAPTCHA)
                </label>
                <div className="flex items-center gap-3">
                  <div className="h-11 bg-slate-100 border border-slate-300 rounded-xl px-3 flex items-center justify-center select-none shadow-inner overflow-hidden min-w-[130px]">
                    {captchaData?.captcha_image ? (
                      <img
                        src={captchaData.captcha_image}
                        alt="Government CAPTCHA"
                        className="h-9 pointer-events-none"
                      />
                    ) : (
                      <span className="font-mono font-bold tracking-widest text-slate-700 text-base">
                        {isCaptchaLoading ? 'Loading...' : '8K4M9'}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={loadCaptcha}
                    disabled={isCaptchaLoading}
                    title="Refresh CAPTCHA Code"
                    className="p-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-600 transition"
                  >
                    <RotateCcw className={`w-4 h-4 ${isCaptchaLoading ? 'animate-spin' : ''}`} />
                  </button>

                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Enter code"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm uppercase tracking-wider font-semibold focus:ring-2 focus:ring-gov-primary focus:border-gov-primary outline-none transition"
                  />
                </div>
              </div>

              {selectedRole === 'main_admin' && (
                <div className="flex items-center justify-between py-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberEmail}
                      onChange={(e) => setRememberEmail(e.target.checked)}
                      className="rounded border-slate-300 text-gov-primary focus:ring-gov-primary"
                    />
                    <span>Remember my official email</span>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !identifier || !password || !captchaInput}
                className="w-full bg-gov-primary hover:bg-blue-900 text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>
                      {selectedRole === 'main_admin'
                        ? 'Authenticate & Request Verification'
                        : 'Sign In to Department Portal'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Bottom Security Footer */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-1.5 text-center text-xs text-slate-500">
              <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                <span>Government Portal Authentication Standard &bull; TLS 1.3 Protected</span>
              </p>
              <Link href="/" className="hover:text-gov-primary transition font-medium">
                ← Return to Citizen Portal Homepage
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

