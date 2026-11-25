'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Search,
  RefreshCw,
  LogOut,
  MapPin,
  User,
  Phone,
  Layers,
  ShieldCheck,
  Send,
  Upload,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Camera,
  Navigation,
  X
} from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import {
  fetchComplaints,
  updateComplaintStatus,
  fetchAdminProfile,
  fetchDepartments
} from '@/lib/api';
import { Complaint, ComplaintStatus, Department } from '@/types';

export default function DepartmentOfficerDashboardPage() {
  const router = useRouter();

  // Authentication & Officer Profile
  const [officerUser, setOfficerUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Department Grievances & Stats
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Active Complaint Details Drawer / Modal
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);

  // Status Update Form State
  const [newStatus, setNewStatus] = useState<ComplaintStatus>('In Progress');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [resolutionProofUrl, setResolutionProofUrl] = useState('');
  const [notifyCitizen, setNotifyCitizen] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Initialize Session
  useEffect(() => {
    async function initSession() {
      const token = typeof window !== 'undefined' ? localStorage.getItem('gramseva_admin_token') : null;
      if (!token) {
        router.push('/admin/login');
        return;
      }

      try {
        const profile = await fetchAdminProfile();
        // If logged in as Main Admin, they can access /admin or /admin/department
        if (profile.user.role !== 'department_officer' && profile.user.role !== 'primary_admin' && profile.user.role !== 'main_admin') {
          router.push('/admin/login');
          return;
        }

        setOfficerUser(profile.user);
        loadDepartmentGrievances(profile.user);
      } catch (err) {
        console.warn('Session verification failed:', err);
        localStorage.removeItem('gramseva_admin_token');
        localStorage.removeItem('gramseva_admin_user');
        router.push('/admin/login');
      }
    }

    initSession();
  }, [router]);

  // Load Grievances strictly for this department
  const loadDepartmentGrievances = async (user: any) => {
    setLoading(true);
    try {
      // The backend /api/complaints endpoint strictly enforces department isolation for Department Officers
      const deptFilter = user.department_name || undefined;
      const data = await fetchComplaints({ department: deptFilter });
      setComplaints(data);
      setFilteredComplaints(data);
    } catch (err: any) {
      console.error('Failed to load departmental complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter complaints on search or status change
  useEffect(() => {
    let result = [...complaints];

    if (statusFilter !== 'All') {
      result = result.filter((c) => c.status.toLowerCase() === statusFilter.toLowerCase());
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.tracking_id.toLowerCase().includes(q) ||
          c.citizen_name.toLowerCase().includes(q) ||
          c.village_name.toLowerCase().includes(q) ||
          c.ward_number.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      );
    }

    setFilteredComplaints(result);
  }, [searchTerm, statusFilter, complaints]);

  const openComplaintDrawer = (c: Complaint) => {
    setActiveComplaint(c);
    setNewStatus(c.status);
    setStatusRemarks('');
    setRejectionReason(c.rejection_reason || '');
    setResolutionProofUrl(c.proof_url || '');
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeComplaint) return;

    setIsUpdatingStatus(true);
    try {
      const updated = await updateComplaintStatus(activeComplaint.id, {
        status: newStatus,
        remarks: statusRemarks,
        rejection_reason: newStatus === 'Rejected' ? rejectionReason : undefined,
        proof_url: resolutionProofUrl || undefined,
        updated_by_name: officerUser?.name || 'Department Officer',
        notify_citizen: notifyCitizen,
      });

      setActiveComplaint(updated);
      setComplaints((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      alert(`Grievance status updated to "${newStatus}"! ${notifyCitizen ? 'Citizen notified via WhatsApp.' : ''}`);
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('gramseva_admin_token');
    localStorage.removeItem('gramseva_admin_user');
    router.push('/admin/login');
  };

  // Calculate departmental metrics
  const totalCount = complaints.length;
  const pendingCount = complaints.filter((c) => c.status === 'Submitted').length;
  const inProgressCount = complaints.filter((c) => c.status === 'In Progress').length;
  const resolvedCount = complaints.filter((c) => c.status === 'Resolved').length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Department Sub-header */}
      <div className="bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white shadow-md">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wide">
                  GramSeva Departmental Redressal
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  {officerUser?.department_name || 'Department Officer'} [{officerUser?.department_code || 'DEPT'}]
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Officer: <b className="text-white">{officerUser?.name}</b> (Employee ID: {officerUser?.employee_id || 'N/A'}) &bull; Harohalli Gram Panchayat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => officerUser && loadDepartmentGrievances(officerUser)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Refresh Department Grievances"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-300 text-xs font-bold px-3 py-2 rounded-xl border border-red-500/30 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 w-full flex-1 space-y-6">
        {/* Department Identification Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-blue-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/30 border border-blue-400/40 text-blue-200 text-xs font-bold mb-2">
              <Building2 className="w-3.5 h-3.5" />
              <span>Department Jurisdiction &bull; Code: {officerUser?.department_code}</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">
              {officerUser?.department_name} Departmental Dashboard
            </h2>
            <p className="text-xs text-blue-200 mt-1 max-w-xl">
              Strict access control active: Viewing and resolving grievances assigned specifically to the {officerUser?.department_name} jurisdiction.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-right">
            <span className="text-[11px] uppercase tracking-wider font-bold text-blue-200 block">
              Department Assigned Total
            </span>
            <span className="text-3xl font-black text-amber-300">{totalCount}</span>
            <span className="text-xs text-blue-200 block mt-0.5">Complaints</span>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500">Total Grievances</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-900">{totalCount}</span>
              <FileText className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-blue-200 shadow-sm">
            <span className="text-xs font-bold text-blue-700">Pending / New</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-blue-600">{pendingCount}</span>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm">
            <span className="text-xs font-bold text-amber-700">In Progress</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-amber-600">{inProgressCount}</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-sm">
            <span className="text-xs font-bold text-emerald-700">Resolved</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-emerald-600">{resolvedCount}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
        </div>

        {/* Grievance Registry Table Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by ID, citizen, village, ward..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-gov-primary outline-none bg-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-600">Status:</span>
              <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl">
                {['All', 'Submitted', 'In Progress', 'Resolved'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      statusFilter === st
                        ? 'bg-white text-gov-primary shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st === 'Submitted' ? 'Pending' : st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Grievance Table */}
          {loading ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-8 h-8 border-4 border-gov-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-semibold">Loading department grievances...</p>
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="font-bold text-sm text-slate-800">No Complaints Found</h4>
              <p className="text-xs text-slate-500">
                There are currently no complaints matching your criteria in {officerUser?.department_name}.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Tracking ID</th>
                    <th className="py-3 px-4">Citizen & Location</th>
                    <th className="py-3 px-4">Category & Description</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredComplaints.map((c) => {
                    const statusColors: Record<string, string> = {
                      Submitted: 'bg-blue-50 text-blue-700 border-blue-200',
                      'In Progress': 'bg-amber-50 text-amber-700 border-amber-200',
                      Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      Rejected: 'bg-red-50 text-red-700 border-red-200',
                    };
                    return (
                      <tr key={c.id} className="hover:bg-blue-50/40 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-gov-primary">
                          {c.tracking_id}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{c.citizen_name}</div>
                          <div className="text-[11px] text-slate-500">
                            {c.village_name}, {c.ward_number}
                          </div>
                          {(c.district || c.taluk) && (
                            <div className="text-[10px] text-slate-400 font-semibold">
                              {c.taluk ? `${c.taluk}, ` : ''}{c.district || ''}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800 block">{c.category}</span>
                            {c.image_url && (
                              <span title="Photo evidence attached" className="text-gov-primary bg-blue-50 p-0.5 rounded">
                                <Camera className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 truncate block">
                            {c.description}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.priority === 'Critical'
                                ? 'bg-red-100 text-red-800'
                                : c.priority === 'High'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {c.priority}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              statusColors[c.status] || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[11px] text-slate-500">
                          {new Date(c.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => openComplaintDrawer(c)}
                            className="bg-gov-primary hover:bg-blue-900 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition inline-flex items-center gap-1 shadow-sm"
                          >
                            <span>Resolve</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* RESOLUTION DRAWER / MODAL */}
      {activeComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl p-6 sm:p-8 overflow-y-auto flex flex-col justify-between space-y-6">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                  <span className="font-mono text-xs font-bold text-gov-primary block">
                    {activeComplaint.tracking_id}
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Grievance Resolution & Action
                  </h3>
                </div>
                <button
                  onClick={() => setActiveComplaint(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Complaint Overview Box with Detailed Location & Photos */}
              <div className="my-5 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Citizen</span>
                    <p className="font-bold text-slate-800">{activeComplaint.citizen_name}</p>
                    <p className="text-[11px] text-slate-500">{activeComplaint.citizen_phone}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Assigned Department</span>
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      {activeComplaint.assigned_department_name || officerUser?.department_name || 'Sanitation'}
                    </span>
                  </div>
                </div>

                {/* Structured Location Details */}
                <div className="pt-2.5 border-t border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gov-primary" />
                      <span>Civic Location Breakdown</span>
                    </span>
                    {activeComplaint.latitude && activeComplaint.longitude && (
                      <a
                        href={`https://maps.google.com/?q=${activeComplaint.latitude},${activeComplaint.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-gov-primary hover:underline inline-flex items-center gap-1"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>Google Maps ({activeComplaint.latitude.toFixed(4)}, {activeComplaint.longitude.toFixed(4)})</span>
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-xl border border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">District & Taluk</span>
                      <span className="font-bold text-slate-800">
                        {activeComplaint.district || 'Karnataka'}{activeComplaint.taluk ? ` / ${activeComplaint.taluk}` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Panchayat & Ward</span>
                      <span className="font-bold text-slate-800">
                        {activeComplaint.village_name} ({activeComplaint.ward_number})
                      </span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Specific Address / Landmark</span>
                      <span className="font-semibold text-slate-800">
                        {activeComplaint.address} {activeComplaint.pincode ? `- ${activeComplaint.pincode}` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grievance Description */}
                <div className="pt-2 border-t border-slate-200 text-xs">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                    Grievance Description
                  </span>
                  <p className="text-slate-700 leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                    {activeComplaint.description}
                  </p>
                </div>

                {/* Citizen Uploaded Evidence Photo */}
                {activeComplaint.image_url && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1.5">
                      Citizen Uploaded Evidence Photo
                    </span>
                    <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-900 border border-slate-300 shrink-0">
                        <img
                          src={activeComplaint.image_url}
                          alt="Citizen Evidence"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 mb-1">
                          Citizen Photo Evidence
                        </span>
                        <a
                          href={activeComplaint.image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gov-primary hover:underline font-bold flex items-center gap-1"
                        >
                          <span>Open Full Size Image</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Officer Resolution Proof (if resolved) */}
                {activeComplaint.proof_url && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[10px] text-emerald-700 font-bold uppercase block mb-1.5">
                      Verified Department Resolution Proof
                    </span>
                    <div className="flex items-center gap-3 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-300">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-900 border border-emerald-300 shrink-0">
                        <img
                          src={activeComplaint.proof_url}
                          alt="Resolution Proof"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded mb-1">
                          Work Completed Photo
                        </span>
                        <a
                          href={activeComplaint.proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-700 hover:underline font-bold flex items-center gap-1"
                        >
                          <span>View Verified Resolution Evidence</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Update Form */}
              <form onSubmit={handleUpdateStatus} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Update Grievance Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as ComplaintStatus)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold bg-white focus:ring-2 focus:ring-gov-primary outline-none transition"
                  >
                    <option value="In Progress">In Progress (Field Work Commenced)</option>
                    <option value="Resolved">Resolved (Work Completed & Verified)</option>
                    <option value="Rejected">Rejected (Invalid / Duplicate / Out of Jurisdiction)</option>
                  </select>
                </div>

                {newStatus === 'Rejected' && (
                  <div>
                    <label className="block text-xs font-bold text-red-700 mb-1">
                      Reason for Rejection *
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Specify why this grievance is being rejected..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-red-300 text-xs focus:ring-2 focus:ring-red-500 outline-none transition"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Department Resolution Remarks & Action Taken
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter details of field inspection, contractor assigned, materials repaired, or resolution confirmation..."
                    value={statusRemarks}
                    onChange={(e) => setStatusRemarks(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-gov-primary outline-none transition"
                  />
                </div>

                {/* Cloudinary / Local Resolution Photo Evidence Upload */}
                <div>
                  <ImageUpload
                    value={resolutionProofUrl}
                    onChange={(url) => setResolutionProofUrl(url || '')}
                    folder="gramseva_resolutions"
                    label="Resolution Proof Photo (Completion Evidence)"
                    helperText="Upload camera or file photo proving resolution on-site (Cloudinary / Fast CDN)."
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="notifyCitizenDept"
                    checked={notifyCitizen}
                    onChange={(e) => setNotifyCitizen(e.target.checked)}
                    className="rounded border-slate-300 text-gov-primary focus:ring-gov-primary"
                  />
                  <label htmlFor="notifyCitizenDept" className="text-xs text-slate-600 font-medium">
                    Send real-time WhatsApp resolution notification to citizen
                  </label>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveComplaint(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingStatus}
                    className="flex-1 py-2.5 rounded-xl bg-gov-primary hover:bg-blue-900 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isUpdatingStatus ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Save Status & Notify</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
