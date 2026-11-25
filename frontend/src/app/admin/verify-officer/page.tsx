'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Mail } from 'lucide-react';
import { verifyOfficerEmail } from '@/lib/api';

function VerifyOfficerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [officerDetails, setOfficerDetails] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setErrorMsg('No verification token provided in URL. Please check your email link.');
      return;
    }

    async function executeVerification() {
      try {
        const res = await verifyOfficerEmail(token as string);
        setSuccess(true);
        setOfficerDetails(res.officer);
      } catch (err: any) {
        setErrorMsg(err.message || 'Verification failed. The link may have expired or already been used.');
      } finally {
        setLoading(false);
      }
    }

    executeVerification();
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-700 text-center">
        <div className="w-16 h-16 bg-gov-primary rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg mb-4">
          <Building2 className="w-8 h-8 text-amber-400" />
        </div>

        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2">
          Department Officer Verification
        </h1>
        <p className="text-xs text-slate-500 font-medium mb-6">
          Karnataka Praja Seve &bull; GramSeva Governance System
        </p>

        {loading && (
          <div className="py-8 space-y-4">
            <div className="w-10 h-10 border-4 border-gov-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Verifying official email link...</p>
          </div>
        )}

        {!loading && success && (
          <div className="space-y-6">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-left space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>Official Email Verified</span>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Your email address has been verified. Your registration has been submitted to the{' '}
                <b>Main Admin (Panchayat Officer)</b> for departmental authorization.
              </p>
              {officerDetails && (
                <div className="pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-800 space-y-0.5">
                  <p><b>Officer:</b> {officerDetails.full_name}</p>
                  <p><b>Employee ID:</b> {officerDetails.employee_id}</p>
                  <p><b>Department:</b> {officerDetails.department_name}</p>
                  <p><b>Status:</b> <span className="font-semibold text-amber-700">Awaiting Main Admin Approval</span></p>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500">
              You will be granted full access to your department dashboard once the Panchayat Officer reviews and approves your account.
            </p>

            <Link
              href="/admin/login"
              className="w-full bg-gov-primary hover:bg-blue-900 text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm"
            >
              <span>Go to Department Officer Login</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {!loading && !success && (
          <div className="space-y-6">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-700 leading-relaxed text-left">
              <b>Verification Error:</b> {errorMsg}
            </div>

            <Link
              href="/admin/login"
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm"
            >
              <span>Return to Login Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyOfficerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerifyOfficerContent />
    </Suspense>
  );
}
