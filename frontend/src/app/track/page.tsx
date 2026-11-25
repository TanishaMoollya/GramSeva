'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Search, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Building, 
  User, 
  Calendar, 
  MapPin, 
  ArrowLeft,
  FileText,
  ExternalLink,
  ShieldCheck,
  Check,
  Navigation,
  Camera
} from 'lucide-react';
import { trackComplaint } from '@/lib/api';
import { Complaint, ComplaintStatus } from '@/types';

const STATUS_STAGES: ComplaintStatus[] = [
  'Submitted',
  'Under Review',
  'Assigned',
  'In Progress',
  'Resolved',
];

function TrackComplaintContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id') || '';

  const [trackingId, setTrackingId] = useState(initialId);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialId) {
      handleSearch(initialId);
    }
  }, [initialId]);

  const handleSearch = async (targetId?: string) => {
    const idToSearch = (targetId || trackingId).trim();
    if (!idToSearch) {
      setErrorMsg('Please enter a Complaint Tracking ID.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      const data = await trackComplaint(idToSearch, phoneNumber || undefined);
      setComplaint(data);
    } catch (err: any) {
      setComplaint(null);
      setErrorMsg(err.message || 'No complaint found with this Tracking ID.');
    } finally {
      setLoading(false);
    }
  };

  const isRejected = complaint?.status === 'Rejected';

  const getStageIndex = (currentStatus?: ComplaintStatus) => {
    if (!currentStatus || currentStatus === 'Rejected') return -1;
    return STATUS_STAGES.indexOf(currentStatus);
  };

  const currentStageIdx = getStageIndex(complaint?.status);

  return (
    <div className="py-12 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-8">
        {/* Header Breadcrumbs */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <Link href="/" className="hover:text-gov-primary">Home</Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Track Complaint</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Track Grievance Redressal
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Check the live execution timeline, assigned department, and resolution photo proof.
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm mb-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end"
          >
            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Complaint Tracking ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. GS-2026-1001"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-gov-primary focus:border-gov-primary outline-none font-mono uppercase tracking-wider"
                />
              </div>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Registered Phone (Optional)
              </label>
              <input
                type="tel"
                placeholder="e.g. 9845123456"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-gov-primary focus:border-gov-primary outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gov-primary hover:bg-blue-900 text-white font-bold py-2.5 rounded-xl shadow transition flex items-center justify-center gap-2 text-sm disabled:opacity-70"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Search</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Shortcuts */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Try sample complaints:</span>
            {['GS-2026-1001', 'GS-2026-1002', 'GS-2026-1003', 'GS-2026-1006'].map((demoId) => (
              <button
                key={demoId}
                onClick={() => {
                  setTrackingId(demoId);
                  handleSearch(demoId);
                }}
                className="bg-slate-100 hover:bg-gov-primary hover:text-white px-2.5 py-1 rounded-md font-mono text-[11px] transition text-slate-700"
              >
                {demoId}
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3 mb-8">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Grievance Not Found</p>
              <p className="text-xs mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Complaint Details Result */}
        {complaint && (
          <div className="space-y-6">
            {/* Main Status Header Card */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Tracking ID:</span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-gov-primary font-mono">
                      {complaint.tracking_id}
                    </h2>
                    <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold uppercase">
                      via {complaint.source}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{complaint.category}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block font-medium">Current Status</span>
                    <span
                      className={`text-sm font-extrabold px-3 py-1 rounded-full inline-block mt-0.5 ${
                        complaint.status === 'Resolved'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : complaint.status === 'Rejected'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : complaint.status === 'In Progress'
                          ? 'bg-orange-100 text-orange-800 border border-orange-200'
                          : complaint.status === 'Assigned'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {complaint.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Visual Timeline */}
              {isRejected ? (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 mb-6">
                  <div className="flex items-center gap-2 font-bold text-sm mb-1">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span>Grievance Rejected by Panchayat Authorities</span>
                  </div>
                  <p className="text-xs text-red-700 leading-relaxed">
                    <b>Reason:</b> {complaint.rejection_reason || 'Outside Panchayat executive authority or invalid documentation.'}
                  </p>
                </div>
              ) : (
                <div className="mb-8">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                    Redressal Progress Timeline
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4 relative">
                    {STATUS_STAGES.map((stage, idx) => {
                      const isCompleted = currentStageIdx >= idx;
                      const isCurrent = currentStageIdx === idx;
                      return (
                        <div
                          key={stage}
                          className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all ${
                            isCurrent
                              ? 'bg-blue-50/80 border-gov-primary text-gov-primary shadow-sm'
                              : isCompleted
                              ? 'bg-emerald-50/60 border-emerald-300 text-emerald-800'
                              : 'bg-slate-50 border-slate-200 text-slate-400'
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-2 ${
                              isCurrent
                                ? 'bg-gov-primary text-white ring-4 ring-blue-100'
                                : isCompleted
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {isCompleted && !isCurrent ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              idx + 1
                            )}
                          </div>
                          <span className="text-xs font-semibold leading-tight">{stage}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Metadata Grid with Detailed Civic Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">Assigned Department</span>
                  <span className="font-bold text-slate-800">
                    {complaint.assigned_department_name || 'Pending Department Assignment'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Assigned Field Officer</span>
                  <span className="font-bold text-slate-800">
                    {complaint.assigned_officer_name || 'Desk Officer'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">District & Taluk</span>
                  <span className="font-bold text-slate-800">
                    {complaint.district || 'Karnataka'}{complaint.taluk ? ` / ${complaint.taluk}` : ''}
                  </span>
                </div>
              </div>

              {/* Panchayat & Landmark Info Bar */}
              <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gov-primary shrink-0" />
                  <span className="text-slate-700">
                    <b>{complaint.village_name}</b> ({complaint.ward_number}), {complaint.address} {complaint.pincode ? `- ${complaint.pincode}` : ''}
                  </span>
                </div>
                {complaint.latitude && complaint.longitude && (
                  <a
                    href={`https://maps.google.com/?q=${complaint.latitude},${complaint.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gov-primary hover:underline font-bold inline-flex items-center gap-1 shrink-0"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>View on Google Maps</span>
                  </a>
                )}
              </div>
            </div>

            {/* Description & Resolution Notes */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Original Complaint Description
                </h4>
                <p className="text-sm text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed">
                  {complaint.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                  <span>📍 Specific Location: <b>{complaint.address}</b></span>
                  <span>📅 Submitted: <b>{new Date(complaint.created_at).toLocaleDateString()}</b></span>
                </div>

                {/* Citizen Evidence Photo */}
                {(complaint.image_url || complaint.attachments.some(a => a.attachment_type === 'complaint')) && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <span className="text-xs font-bold text-slate-700 block mb-2 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-gov-primary" />
                      <span>Citizen Uploaded Photo Evidence:</span>
                    </span>
                    <div className="rounded-xl overflow-hidden border border-slate-300 shadow-sm max-w-sm bg-slate-900 group relative">
                      <img
                        src={complaint.image_url || complaint.attachments.find(a => a.attachment_type === 'complaint')?.file_url}
                        alt="Citizen Uploaded Evidence"
                        className="w-full h-48 object-cover group-hover:opacity-90 transition"
                      />
                      <a
                        href={complaint.image_url || complaint.attachments.find(a => a.attachment_type === 'complaint')?.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-white text-[11px] text-gov-primary font-bold hover:underline flex items-center justify-between"
                      >
                        <span>View Original Upload</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Resolution Remarks & Verified Proof Photo */}
              {complaint.status === 'Resolved' && (
                <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-4">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Official Resolution Confirmation</span>
                  </div>
                  <p className="text-xs leading-relaxed text-emerald-800">
                    <b>Resolution Remarks:</b> {complaint.resolution_remarks || 'The designated department field crew has resolved the reported civic issue.'}
                  </p>

                  {/* Resolution Proof Photo */}
                  {(complaint.proof_url || complaint.attachments.some((a) => a.attachment_type === 'resolution')) && (
                    <div className="pt-2">
                      <span className="text-xs font-bold text-emerald-900 block mb-2">
                        Official Resolution Proof Photo (Verified):
                      </span>
                      <div className="flex gap-4">
                        <div className="rounded-xl overflow-hidden border border-emerald-300 shadow-sm max-w-xs bg-slate-900">
                          <img
                            src={complaint.proof_url || complaint.attachments.find((a) => a.attachment_type === 'resolution')?.file_url}
                            alt="Resolution Proof"
                            className="w-full h-48 object-cover"
                          />
                          <div className="p-2 bg-white text-[11px] text-slate-600 flex items-center justify-between">
                            <span className="font-semibold text-emerald-800">Field Work Completed</span>
                            <a
                              href={complaint.proof_url || complaint.attachments.find((a) => a.attachment_type === 'resolution')?.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-700 hover:underline font-bold inline-flex items-center gap-1"
                            >
                              <span>View Full Proof</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Chronological Status Audit Log */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                  Official Status History & Officer Remarks
                </h4>
                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200">
                  {complaint.status_history.map((hist, i) => (
                    <div key={hist.id || i} className="relative flex items-start gap-3 pl-8">
                      <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-gov-primary border-2 border-white ring-2 ring-blue-100" />
                      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs w-full">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-800">{hist.new_status}</span>
                          <span className="text-[11px] text-slate-500">
                            {new Date(hist.created_at).toLocaleString()}
                          </span>
                        </div>
                        {hist.remarks && <p className="text-slate-600 mb-1">{hist.remarks}</p>}
                        {hist.updated_by_name && (
                          <span className="text-[10px] text-slate-400 block">
                            Logged by: {hist.updated_by_name}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrackComplaintPage() {
  return (
    <Suspense fallback={
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-4 border-gov-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500 font-semibold">Loading Grievance Tracking...</p>
      </div>
    }>
      <TrackComplaintContent />
    </Suspense>
  );
}
