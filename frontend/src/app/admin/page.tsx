'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  BarChart3, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Search, 
  Filter, 
  Download, 
  Sparkles, 
  MapPin, 
  User, 
  Phone, 
  Layers, 
  ShieldCheck, 
  LogOut, 
  ExternalLink,
  ChevronRight,
  MessageSquare,
  RefreshCw,
  Send,
  Edit,
  Save,
  X,
  UserPlus,
  Users,
  ShieldAlert,
  Key,
  Ban,
  CheckCircle,
  History,
  Lock,
  Mail
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  Legend
} from 'recharts';
import ComplaintMap from '@/components/ComplaintMap';
import { 
  fetchComplaints, 
  fetchAnalytics, 
  fetchDepartments,
  updateComplaintStatus, 
  assignComplaint, 
  overrideAI,
  getExportCsvUrl,
  fetchAdminProfile,
  fetchAdministrators,
  inviteAdministrator,
  suspendAdministrator,
  reactivateAdministrator,
  revokeInvitation,
  fetchAuditLogs
} from '@/lib/api';
import { Complaint, Department, AnalyticsSummary, ComplaintStatus, ComplaintPriority } from '@/types';

const COLORS = ['#1E3A8A', '#D97706', '#059669', '#DC2626', '#9333EA', '#0284C7'];
const PRIORITY_COLORS: Record<string, string> = {
  Critical: '#DC2626',
  High: '#EA580C',
  Medium: '#D97706',
  Low: '#059669',
};

export default function AdminDashboardPage() {
  const router = useRouter();

  // Authentication check
  const [adminUser, setAdminUser] = useState<any>(null);

  // Data states
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedSource, setSelectedSource] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Selected Complaint for Modal/Drawer
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);

  // Status Update Form State
  const [newStatus, setNewStatus] = useState<ComplaintStatus>('In Progress');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [resolutionProofUrl, setResolutionProofUrl] = useState('');
  const [notifyCitizenOnStatus, setNotifyCitizenOnStatus] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Assignment Form State
  const [assignDeptId, setAssignDeptId] = useState('');
  const [assignOfficerName, setAssignOfficerName] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // AI Override Edit Mode State
  const [isEditingAI, setIsEditingAI] = useState(false);
  const [overrideCat, setOverrideCat] = useState('');
  const [overridePrio, setOverridePrio] = useState<ComplaintPriority>('Medium');
  const [overrideDept, setOverrideDept] = useState('');
  const [overrideSummary, setOverrideSummary] = useState('');
  const [isSavingAI, setIsSavingAI] = useState(false);

  // Active View Tab: 'table' | 'analytics' | 'map' | 'admins'
  const [viewTab, setViewTab] = useState<'table' | 'analytics' | 'map' | 'admins'>('table');

  // Administrator Management States (Primary Admin Only)
  const [adminsData, setAdminsData] = useState<{
    administrators: any[];
    invitations: any[];
    current_user_role: string;
  } | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [adminManagementTab, setAdminManagementTab] = useState<'accounts' | 'invitations' | 'audit'>('accounts');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'primary_admin'>('admin');
  const [inviteDept, setInviteDept] = useState('General Administration');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteDevUrl, setInviteDevUrl] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    async function initSession() {
      const token = typeof window !== 'undefined' ? localStorage.getItem('gramseva_admin_token') : null;
      if (!token) {
        router.push('/admin/login');
        return;
      }

      // Check session validity and email verification with backend
      try {
        const profile = await fetchAdminProfile();
        setAdminUser(profile.user);
        loadData();
      } catch (e) {
        console.warn('Session verification failed:', e);
        localStorage.removeItem('gramseva_admin_token');
        localStorage.removeItem('gramseva_admin_user');
        router.push('/admin/login');
      }
    }
    initSession();
  }, [router]);

  const loadAdminData = async () => {
    setIsAdminLoading(true);
    try {
      const [adminsRes, auditRes] = await Promise.all([
        fetchAdministrators(),
        fetchAuditLogs(40),
      ]);
      setAdminsData(adminsRes);
      setAuditLogs(auditRes);
    } catch (e: any) {
      console.error('Failed to load administrator records:', e);
    } finally {
      setIsAdminLoading(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteSubmitting(true);
    setInviteSuccess(null);
    setInviteDevUrl(null);
    setInviteError(null);

    try {
      const res = await inviteAdministrator({
        email: inviteEmail.trim().toLowerCase(),
        full_name: inviteFullName.trim(),
        role: inviteRole,
        department_name: inviteDept,
      });
      setInviteSuccess(res.message);
      if (res.dev_invite_url) {
        setInviteDevUrl(res.dev_invite_url);
      }
      setInviteEmail('');
      setInviteFullName('');
      loadAdminData();
    } catch (err: any) {
      setInviteError(err.message || 'Failed to dispatch invitation.');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleSuspend = async (adminId: string) => {
    if (!confirm('Are you sure you want to suspend this administrator? They will be unable to log in until reactivated.')) return;
    setActionLoadingId(adminId);
    try {
      await suspendAdministrator(adminId);
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to suspend administrator.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReactivate = async (adminId: string) => {
    setActionLoadingId(adminId);
    try {
      await reactivateAdministrator(adminId);
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to reactivate administrator.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    if (!confirm('Revoke this invitation? The link will no longer function.')) return;
    setActionLoadingId(invitationId);
    try {
      await revokeInvitation(invitationId);
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke invitation.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [analyticsData, complaintsData, deptsData] = await Promise.all([
        fetchAnalytics(),
        fetchComplaints({
          search: searchTerm,
          status: selectedStatus,
          category: selectedCategory,
          department: selectedDepartment,
          source: selectedSource,
          sort_by: sortBy,
        }),
        fetchDepartments(),
      ]);
      setAnalytics(analyticsData);
      setComplaints(complaintsData);
      setDepartments(deptsData);
    } catch (e) {
      console.error('Error loading CRM data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-fetch complaints when filters change
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchComplaints({
        search: searchTerm,
        status: selectedStatus,
        category: selectedCategory,
        department: selectedDepartment,
        source: selectedSource,
        sort_by: sortBy,
      }).then(setComplaints).catch(console.error);
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm, selectedStatus, selectedCategory, selectedDepartment, selectedSource, sortBy]);

  const handleOpenDetail = (complaint: Complaint) => {
    setActiveComplaint(complaint);
    setNewStatus(complaint.status);
    setStatusRemarks('');
    setRejectionReason(complaint.rejection_reason || '');
    setResolutionProofUrl('');
    setAssignDeptId(complaint.assigned_department_id || '');
    setAssignOfficerName(complaint.assigned_officer_name || '');
    setAssignNotes('');

    // Prepopulate AI Override fields
    setOverrideCat(complaint.category);
    setOverridePrio(complaint.priority);
    setOverrideDept(complaint.assigned_department_name || '');
    setOverrideSummary(complaint.ai_summary || complaint.description);
    setIsEditingAI(false);
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeComplaint) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await updateComplaintStatus(activeComplaint.id, {
        status: newStatus,
        remarks: statusRemarks,
        rejection_reason: newStatus === 'Rejected' ? rejectionReason : undefined,
        proof_url: resolutionProofUrl || undefined,
        updated_by_name: adminUser?.name || 'Panchayat Development Officer',
        notify_citizen: notifyCitizenOnStatus,
      });
      setActiveComplaint(updated);
      setComplaints((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      // Refresh analytics
      fetchAnalytics().then(setAnalytics).catch(console.error);
      alert(`Status successfully updated to "${newStatus}"! ${notifyCitizenOnStatus ? 'WhatsApp update dispatched to citizen.' : ''}`);
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDepartmentAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeComplaint || !assignDeptId) {
      alert('Please select a department.');
      return;
    }
    const deptObj = departments.find((d) => d.id === assignDeptId);
    if (!deptObj) return;

    setIsAssigning(true);
    try {
      const updated = await assignComplaint(activeComplaint.id, {
        department_id: assignDeptId,
        department_name: deptObj.name,
        officer_name: assignOfficerName || undefined,
        notes: assignNotes || undefined,
        assigned_by_name: adminUser?.name || 'Panchayat Development Officer',
        notify_citizen: true,
      });
      setActiveComplaint(updated);
      setComplaints((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      alert(`Grievance assigned to ${deptObj.name}! Notification sent to citizen.`);
    } catch (err: any) {
      alert('Error assigning department: ' + err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleSaveAIOverride = async () => {
    if (!activeComplaint) return;
    setIsSavingAI(true);
    try {
      const updated = await overrideAI(activeComplaint.id, {
        category: overrideCat,
        priority: overridePrio,
        department: overrideDept,
        summary: overrideSummary,
      });
      setActiveComplaint(updated);
      setComplaints((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setIsEditingAI(false);
      alert('AI Recommendation successfully overridden and saved.');
    } catch (err: any) {
      alert('Error saving override: ' + err.message);
    } finally {
      setIsSavingAI(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('gramseva_admin_token');
    localStorage.removeItem('gramseva_admin_user');
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Admin Sub-header */}
      <div className="bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gov-secondary flex items-center justify-center font-bold text-white text-xs">
              CRM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide">Panchayat Administration CRM</span>
                {adminUser?.role === 'primary_admin' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                    Primary Administrator
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    <ShieldCheck className="w-3 h-3 text-blue-400" />
                    {adminUser?.department_name || 'Department Administrator'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Official: <b className="text-white">{adminUser?.name || 'Administrator'}</b> ({adminUser?.email}) &bull; Harohalli Gram Panchayat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <a
              href={getExportCsvUrl()}
              target="_blank"
              download
              className="hidden sm:inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 bg-red-600/20 hover:bg-red-600/40 text-red-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-500/30 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 w-full flex-1 space-y-8">
        {/* Metric Cards Row */}
        {analytics && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-500">Total Grievances</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-extrabold text-slate-900">{analytics.total_complaints}</span>
                <span className="text-[11px] text-slate-400 font-medium">100%</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-blue-200 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-blue-700">New / Submitted</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-extrabold text-blue-600">{analytics.new_complaints}</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-1.5 py-0.5 rounded">Action Req</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-purple-200 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-purple-700">Under Review</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-extrabold text-purple-600">{analytics.under_review}</span>
                <span className="text-[11px] text-slate-400 font-medium">Verification</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-orange-200 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-orange-700">In Progress</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-extrabold text-orange-600">{analytics.in_progress}</span>
                <span className="text-[11px] text-slate-400 font-medium">Field Crew</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-emerald-700">Resolved</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-extrabold text-emerald-600">{analytics.resolved}</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded">
                  {analytics.resolution_rate_percent}%
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-red-200 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-red-700">Rejected</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-extrabold text-red-600">{analytics.rejected}</span>
                <span className="text-[11px] text-slate-400 font-medium">Disputes</span>
              </div>
            </div>
          </div>
        )}

        {/* View Switcher Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewTab('table')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                viewTab === 'table'
                  ? 'bg-gov-primary text-white shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Grievance Registry ({complaints.length})</span>
            </button>

            <button
              onClick={() => setViewTab('analytics')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                viewTab === 'analytics'
                  ? 'bg-gov-primary text-white shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics & Recharts</span>
            </button>

            <button
              onClick={() => setViewTab('map')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                viewTab === 'map'
                  ? 'bg-gov-primary text-white shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>GIS Map View</span>
            </button>

            {adminUser?.role === 'primary_admin' && (
              <button
                onClick={() => {
                  setViewTab('admins');
                  loadAdminData();
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  viewTab === 'admins'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-amber-500" />
                <span>Manage Administrators</span>
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium hidden sm:block">
            Showing real-time records from Supabase PostgreSQL
          </div>
        </div>

        {/* TAB 1: GRIEVANCE REGISTRY TABLE */}
        {viewTab === 'table' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Filter Bar */}
            <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/50 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Search Input */}
                <div className="sm:col-span-4 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Search by ID, citizen name, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-gov-primary focus:border-gov-primary outline-none bg-white"
                  />
                </div>

                {/* Status Filter */}
                <div className="sm:col-span-2">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-gov-primary outline-none bg-white font-medium"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                {/* Category Filter */}
                <div className="sm:col-span-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-gov-primary outline-none bg-white font-medium"
                  >
                    <option value="All">All Categories</option>
                    <option value="Streetlight issues">Streetlight</option>
                    <option value="Garbage collection">Garbage</option>
                    <option value="Potholes and road damage">Roads/Potholes</option>
                    <option value="Water supply">Water Supply</option>
                    <option value="Drainage and sanitation">Drainage</option>
                    <option value="Other public issues">Other Issues</option>
                  </select>
                </div>

                {/* Department Filter */}
                <div className="sm:col-span-2">
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-gov-primary outline-none bg-white font-medium"
                  >
                    <option value="All">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Source Filter */}
                <div className="sm:col-span-2">
                  <select
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-gov-primary outline-none bg-white font-medium"
                  >
                    <option value="All">All Sources</option>
                    <option value="web">Web Portal</option>
                    <option value="whatsapp">WhatsApp Bot</option>
                  </select>
                </div>
              </div>

              {/* Status Quick Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-400 font-semibold text-[11px] mr-1">Status Quick Filter:</span>
                {['All', 'Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Rejected'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedStatus(st)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                      selectedStatus === st
                        ? 'bg-gov-primary text-white'
                        : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Tracking ID</th>
                    <th className="py-3.5 px-4">Citizen</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Village / Ward</th>
                    <th className="py-3.5 px-4">Source</th>
                    <th className="py-3.5 px-4">AI Priority</th>
                    <th className="py-3.5 px-4">Assigned Dept</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {complaints.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 text-sm">
                        No complaints match your filters.
                      </td>
                    </tr>
                  ) : (
                    complaints.map((c) => (
                      <tr key={c.id} className="hover:bg-blue-50/40 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-gov-primary">
                          {c.tracking_id}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800">{c.citizen_name}</p>
                          <p className="text-[11px] text-slate-500">{c.citizen_phone}</p>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {c.category}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {c.village_name}, {c.ward_number}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              c.source === 'whatsapp'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {c.source === 'whatsapp' ? <MessageSquare className="w-2.5 h-2.5" /> : null}
                            {c.source}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className="inline-block px-2 py-0.5 rounded text-[11px] font-bold"
                            style={{
                              backgroundColor: `${PRIORITY_COLORS[c.priority] || '#64748B'}15`,
                              color: PRIORITY_COLORS[c.priority] || '#64748B',
                            }}
                          >
                            {c.priority}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {c.assigned_department_name || (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-block ${
                              c.status === 'Resolved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : c.status === 'Rejected'
                                ? 'bg-red-100 text-red-800'
                                : c.status === 'In Progress'
                                ? 'bg-orange-100 text-orange-800'
                                : c.status === 'Assigned'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleOpenDetail(c)}
                            className="bg-gov-primary hover:bg-blue-900 text-white font-semibold px-3 py-1.5 rounded-lg text-xs shadow-sm transition inline-flex items-center gap-1"
                          >
                            <span>Manage</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: RECHARTS ANALYTICS */}
        {viewTab === 'analytics' && analytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Category Breakdown */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-sm text-slate-800 mb-4">
                Category-Wise Grievance Distribution
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.category_distribution}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1E3A8A" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Department Breakdown */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-sm text-slate-800 mb-4">
                Department Workload & Assigned Grievances
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.department_distribution}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="department" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#D97706" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Trends */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-sm text-slate-800 mb-4">
                Monthly Grievance Volume & Resolution Trend
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.monthly_trends}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Area type="monotone" dataKey="submitted" stroke="#1E3A8A" fill="#1E3A8A" fillOpacity={0.15} name="Submitted" />
                    <Area type="monotone" dataKey="resolved" stroke="#059669" fill="#059669" fillOpacity={0.25} name="Resolved" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Priority Distribution */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-sm text-slate-800 mb-4">
                Priority-Wise Severity Distribution
              </h3>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.priority_distribution}
                      dataKey="count"
                      nameKey="priority"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {analytics.priority_distribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PRIORITY_COLORS[entry.priority] || COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LEAFLET GIS MAP */}
        {viewTab === 'map' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Gram Panchayat GIS Grievance Map</h3>
                <p className="text-xs text-slate-500">
                  Interactive OpenStreetMap showing all citizen complaints. Color-coded by status. Click marker to inspect.
                </p>
              </div>

              {/* Status Marker Legend */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Submitted
                </span>
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" /> Review
                </span>
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" /> Assigned
                </span>
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-600 inline-block" /> In Progress
                </span>
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Resolved
                </span>
              </div>
            </div>

            <ComplaintMap complaints={complaints} height="520px" />
          </div>
        )}

        {/* TAB 4: ADMINISTRATOR MANAGEMENT (PRIMARY ADMIN ONLY) */}
        {viewTab === 'admins' && (
          <div className="space-y-6">
            {/* Header with Invite CTA */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-lg text-slate-900 tracking-tight">
                    Administrator Management & Access Control
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    Primary Administrator Zone
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                  Only Primary Administrators can authorize new personnel, dispatch cryptographically secure 24-hour invitation links, suspend administrative access, and inspect immutable security audit trails.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={loadAdminData}
                  disabled={isAdminLoading}
                  className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                  title="Refresh Administrator Records"
                >
                  <RefreshCw className={`w-4 h-4 ${isAdminLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => {
                    setIsInviteModalOpen(true);
                    setInviteSuccess(null);
                    setInviteError(null);
                    setInviteDevUrl(null);
                  }}
                  className="inline-flex items-center gap-2 bg-gov-primary hover:bg-blue-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition"
                >
                  <UserPlus className="w-4 h-4 text-amber-300" />
                  <span>Invite New Administrator</span>
                </button>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-500">Active Administrators</span>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">
                  {adminsData?.administrators.filter((a) => a.status === 'active').length || 0}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-red-200 shadow-sm">
                <span className="text-xs font-bold text-red-700">Suspended Accounts</span>
                <p className="text-2xl font-extrabold text-red-600 mt-1">
                  {adminsData?.administrators.filter((a) => a.status === 'suspended').length || 0}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm">
                <span className="text-xs font-bold text-amber-700">Pending Invitations</span>
                <p className="text-2xl font-extrabold text-amber-600 mt-1">
                  {adminsData?.invitations.filter((i) => i.is_active).length || 0}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm">
                <span className="text-xs font-bold text-blue-700">Security Audit Events</span>
                <p className="text-2xl font-extrabold text-blue-600 mt-1">
                  {auditLogs.length}
                </p>
              </div>
            </div>

            {/* Sub-tab Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => setAdminManagementTab('accounts')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  adminManagementTab === 'accounts'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Administrators ({adminsData?.administrators.length || 0})</span>
              </button>
              <button
                onClick={() => setAdminManagementTab('invitations')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  adminManagementTab === 'invitations'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Invitations ({adminsData?.invitations.length || 0})</span>
              </button>
              <button
                onClick={() => setAdminManagementTab('audit')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  adminManagementTab === 'audit'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Security Audit Log ({auditLogs.length})</span>
              </button>
            </div>

            {/* SUB-VIEW 1: ADMINISTRATORS TABLE */}
            {adminManagementTab === 'accounts' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Administrator</th>
                        <th className="py-3.5 px-4">Role</th>
                        <th className="py-3.5 px-4">Department</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Last Login</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {adminsData?.administrators.map((admin) => {
                        const isSelf = admin.email === adminUser?.email;
                        const isPrimary = admin.role === 'primary_admin';
                        const isSuspended = admin.status === 'suspended';

                        return (
                          <tr key={admin.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                  isPrimary ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {admin.full_name?.charAt(0) || 'A'}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <span>{admin.full_name}</span>
                                    {isSelf && (
                                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-normal">
                                        You
                                      </span>
                                    )}
                                  </p>
                                  <p className="font-mono text-[11px] text-slate-500">{admin.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              {isPrimary ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  <ShieldCheck className="w-3 h-3 text-amber-600" />
                                  Primary Admin
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                  Administrator
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-700">
                              {admin.department_name}
                            </td>
                            <td className="py-3.5 px-4">
                              {isSuspended ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                                  <Ban className="w-3 h-3" />
                                  Suspended
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle className="w-3 h-3" />
                                  Active
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-slate-500">
                              {admin.last_login_at
                                ? new Date(admin.last_login_at).toLocaleString()
                                : 'Pending Initial Login'}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {isSelf ? (
                                <span className="text-slate-400 italic text-[11px]">Primary Authority</span>
                              ) : isSuspended ? (
                                <button
                                  onClick={() => handleReactivate(admin.id)}
                                  disabled={actionLoadingId === admin.id}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs border border-emerald-200 transition"
                                >
                                  {actionLoadingId === admin.id ? 'Reactivating...' : 'Reactivate'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleSuspend(admin.id)}
                                  disabled={actionLoadingId === admin.id}
                                  className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs border border-red-200 transition"
                                >
                                  {actionLoadingId === admin.id ? 'Suspending...' : 'Suspend'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-VIEW 2: INVITATIONS TABLE */}
            {adminManagementTab === 'invitations' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Invitee</th>
                        <th className="py-3.5 px-4">Role</th>
                        <th className="py-3.5 px-4">Department</th>
                        <th className="py-3.5 px-4">Invited By</th>
                        <th className="py-3.5 px-4">Expires At</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {(!adminsData?.invitations || adminsData.invitations.length === 0) ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            No administrator invitations on record. Click &quot;Invite New Administrator&quot; to issue a new credential link.
                          </td>
                        </tr>
                      ) : (
                        adminsData.invitations.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-slate-900">{inv.full_name}</p>
                              <p className="font-mono text-[11px] text-slate-500">{inv.email}</p>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-semibold text-slate-700">
                                {inv.role === 'primary_admin' ? 'Primary Administrator' : 'Administrator'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600">{inv.department_name}</td>
                            <td className="py-3.5 px-4 text-slate-500">{inv.invited_by}</td>
                            <td className="py-3.5 px-4 text-slate-500">
                              {new Date(inv.expires_at).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4">
                              {inv.accepted_at ? (
                                <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full text-[11px]">
                                  Accepted
                                </span>
                              ) : inv.revoked_at ? (
                                <span className="text-slate-400 font-bold bg-slate-100 px-2.5 py-1 rounded-full text-[11px]">
                                  Revoked
                                </span>
                              ) : (
                                <span className="text-amber-800 font-bold bg-amber-50 px-2.5 py-1 rounded-full text-[11px]">
                                  Pending Response
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {inv.is_active && (
                                <button
                                  onClick={() => handleRevokeInvite(inv.id)}
                                  disabled={actionLoadingId === inv.id}
                                  className="px-3 py-1 rounded-lg text-red-600 hover:bg-red-50 font-semibold text-xs transition border border-red-200"
                                >
                                  {actionLoadingId === inv.id ? 'Revoking...' : 'Revoke'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-VIEW 3: AUDIT LOGS TABLE */}
            {adminManagementTab === 'audit' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Timestamp</th>
                        <th className="py-3.5 px-4">Action Event</th>
                        <th className="py-3.5 px-4">Actor</th>
                        <th className="py-3.5 px-4">Target Email</th>
                        <th className="py-3.5 px-4">Client IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            No security audit logs recorded yet.
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono text-[11px] font-bold text-gov-primary bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                {log.action}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-700">{log.actor_email}</td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{log.target_email || '—'}</td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{log.ip_address}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* COMPLAINT DETAILS & MANAGEMENT MODAL */}
      {activeComplaint && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-4">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gov-primary flex items-center justify-center text-amber-300 font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base font-mono">{activeComplaint.tracking_id}</h3>
                    <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded font-bold uppercase">
                      {activeComplaint.source}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Citizen: {activeComplaint.citizen_name} ({activeComplaint.citizen_phone})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveComplaint(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs text-slate-700">
              {/* Original Complaint Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-slate-500 font-medium">
                  <span>Category: <b className="text-slate-800">{activeComplaint.category}</b></span>
                  <span>Location: <b className="text-slate-800">{activeComplaint.village_name}, {activeComplaint.ward_number}</b></span>
                  <span>Logged: <b>{new Date(activeComplaint.created_at).toLocaleString()}</b></span>
                </div>
                <p className="text-slate-800 text-sm leading-relaxed pt-1">
                  "{activeComplaint.description}"
                </p>
                <p className="text-slate-500">📍 Landmark: {activeComplaint.address}</p>
              </div>

              {/* AI SUGGESTION & OVERRIDE SECTION */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-sm text-gov-primary">
                      Google Gemini AI Classification Insights
                    </span>
                    {activeComplaint.ai_overridden && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
                        Admin Overridden
                      </span>
                    )}
                  </div>
                  {!isEditingAI && (
                    <button
                      type="button"
                      onClick={() => setIsEditingAI(true)}
                      className="text-xs text-gov-primary hover:text-blue-900 font-semibold flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Override Suggestion</span>
                    </button>
                  )}
                </div>

                {isEditingAI ? (
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-blue-200">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Category</label>
                        <select
                          value={overrideCat}
                          onChange={(e) => setOverrideCat(e.target.value)}
                          className="w-full px-2.5 py-1.5 border rounded-lg text-xs"
                        >
                          <option value="Streetlight issues">Streetlight issues</option>
                          <option value="Garbage collection">Garbage collection</option>
                          <option value="Potholes and road damage">Potholes and road damage</option>
                          <option value="Water supply">Water supply</option>
                          <option value="Drainage and sanitation">Drainage and sanitation</option>
                          <option value="Other public issues">Other public issues</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Priority</label>
                        <select
                          value={overridePrio}
                          onChange={(e) => setOverridePrio(e.target.value as ComplaintPriority)}
                          className="w-full px-2.5 py-1.5 border rounded-lg text-xs font-semibold"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                          <option value="Critical">Critical</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Recommended Department</label>
                        <select
                          value={overrideDept}
                          onChange={(e) => setOverrideDept(e.target.value)}
                          className="w-full px-2.5 py-1.5 border rounded-lg text-xs"
                        >
                          {departments.map((d) => (
                            <option key={d.id} value={d.name}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Executive Summary</label>
                      <input
                        type="text"
                        value={overrideSummary}
                        onChange={(e) => setOverrideSummary(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-lg text-xs"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingAI(false)}
                        className="px-3 py-1.5 rounded-lg border text-slate-600 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveAIOverride}
                        disabled={isSavingAI}
                        className="bg-gov-primary text-white font-bold px-4 py-1.5 rounded-lg flex items-center gap-1 shadow-sm"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Override</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                      <div>
                        <span className="text-slate-500 block">Suggested Category:</span>
                        <span className="font-semibold text-slate-900">{activeComplaint.ai_category || activeComplaint.category}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Suggested Priority:</span>
                        <span
                          className="font-bold text-xs"
                          style={{ color: PRIORITY_COLORS[activeComplaint.priority] }}
                        >
                          {activeComplaint.priority}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Department:</span>
                        <span className="font-semibold text-slate-900">{activeComplaint.ai_department || activeComplaint.assigned_department_name || 'General Administration'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">AI Confidence:</span>
                        <span className="font-semibold text-slate-900">{((activeComplaint.ai_confidence || 0.92) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    {activeComplaint.ai_summary && (
                      <p className="text-slate-700 italic border-t border-blue-200/50 pt-2">
                        Summary: "{activeComplaint.ai_summary}"
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* TWO COLUMN ACTIONS: ASSIGNMENT & STATUS UPDATE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Action 1: Department Assignment */}
                <form onSubmit={handleDepartmentAssign} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-gov-primary" />
                    <span>Assign Responsible Department</span>
                  </h4>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={assignDeptId}
                      onChange={(e) => setAssignDeptId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-xs bg-white"
                    >
                      <option value="">-- Choose Department --</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Assigned Field Officer / Supervisor
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Venkatesh Murthy (Lineman)"
                      value={assignOfficerName}
                      onChange={(e) => setAssignOfficerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Assignment Notes / Work Order
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Urgent wire inspection needed before school opens"
                      value={assignNotes}
                      onChange={(e) => setAssignNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isAssigning}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 rounded-lg transition text-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Update Department Assignment</span>
                  </button>
                </form>

                {/* Action 2: Status Transition */}
                <form onSubmit={handleStatusUpdate} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-gov-primary" />
                    <span>Update Grievance Status</span>
                  </h4>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      New Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as ComplaintStatus)}
                      className="w-full px-3 py-2 rounded-lg border text-xs bg-white font-bold"
                    >
                      <option value="Submitted">Submitted</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Assigned">Assigned</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  {newStatus === 'Rejected' ? (
                    <div>
                      <label className="block text-[11px] font-semibold text-red-600 mb-1">
                        Official Rejection Explanation <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={2}
                        placeholder="State why this grievance is rejected (e.g. Private land dispute, duplicate, invalid jurisdiction)"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-red-300 text-xs"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Administrative Remarks / Progress Notes
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Field crew deployed; transformer replacement ordered"
                        value={statusRemarks}
                        onChange={(e) => setStatusRemarks(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border text-xs"
                      />
                    </div>
                  )}

                  {newStatus === 'Resolved' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-emerald-700 mb-1">
                        Resolution Photo Proof URL (Optional)
                      </label>
                      <input
                        type="url"
                        placeholder="https://example.com/resolved_proof.jpg"
                        value={resolutionProofUrl}
                        onChange={(e) => setResolutionProofUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-emerald-300 text-xs"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="notifyCitizen"
                      checked={notifyCitizenOnStatus}
                      onChange={(e) => setNotifyCitizenOnStatus(e.target.checked)}
                      className="rounded text-gov-primary focus:ring-gov-primary"
                    />
                    <label htmlFor="notifyCitizen" className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-emerald-600" />
                      <span>Send WhatsApp Notification to {activeComplaint.citizen_phone}</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdatingStatus}
                    className="w-full bg-gov-primary hover:bg-blue-900 text-white font-bold py-2 rounded-lg transition text-xs flex items-center justify-center gap-1.5 shadow"
                  >
                    <span>Commit Status Change</span>
                  </button>
                </form>
              </div>

              {/* Status Audit Trail */}
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 mb-3">
                  Status History & Activity Log
                </h4>
                <div className="space-y-2">
                  {activeComplaint.status_history.map((h, i) => (
                    <div key={h.id || i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{h.new_status}</span>
                          {h.updated_by_name && (
                            <span className="text-[10px] text-slate-500">• {h.updated_by_name}</span>
                          )}
                        </div>
                        {h.remarks && <p className="text-slate-600 mt-0.5">{h.remarks}</p>}
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(h.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveComplaint(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INVITATION MODAL (PRIMARY ADMIN ONLY) */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-4">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gov-primary flex items-center justify-center text-amber-300">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Invite Administrator</h3>
                  <p className="text-[11px] text-slate-400">GramSeva Administrative Access Authorization</p>
                </div>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {inviteSuccess ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Invitation Dispatched!</span>
                    </div>
                    <p className="leading-relaxed">{inviteSuccess}</p>
                    <p className="text-[11px] text-emerald-700">The 24-hour invitation link has been dispatched to the administrator&apos;s official inbox.</p>
                  </div>

                  {inviteDevUrl && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-left">
                      <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-800">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <span>Demonstration Mode Quick Link</span>
                      </div>
                      <p className="text-[11px] text-amber-700 mb-2">Simulate onboarding as the invited administrator:</p>
                      <a
                        href={inviteDevUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 bg-gov-primary hover:bg-blue-900 text-white font-semibold text-xs py-2 px-3 rounded-lg shadow-sm transition"
                      >
                        <span>Open Onboarding Form</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setIsInviteModalOpen(false);
                      setInviteSuccess(null);
                    }}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendInvite} className="space-y-4">
                  {inviteError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{inviteError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Administrator Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Suresh Gowda"
                      value={inviteFullName}
                      onChange={(e) => setInviteFullName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-gov-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Official Government Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. suresh.pwd@gramseva.gov.in"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-gov-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Assigned Department
                    </label>
                    <select
                      value={inviteDept}
                      onChange={(e) => setInviteDept(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-gov-primary outline-none bg-white"
                    >
                      <option value="General Administration">General Administration</option>
                      <option value="Sanitation">Sanitation</option>
                      <option value="Public Works">Public Works</option>
                      <option value="Water Supply">Water Supply</option>
                      <option value="Electricity">Electricity</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Administrative Role
                    </label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <label
                        className={`p-3 rounded-xl border cursor-pointer text-xs flex flex-col gap-1 transition ${
                          inviteRole === 'admin'
                            ? 'border-gov-primary bg-blue-50/50 text-slate-900 font-semibold'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="role"
                          checked={inviteRole === 'admin'}
                          onChange={() => setInviteRole('admin')}
                          className="sr-only"
                        />
                        <span>Administrator</span>
                        <span className="text-[10px] text-slate-500 font-normal">Grievance & CRM management</span>
                      </label>

                      <label
                        className={`p-3 rounded-xl border cursor-pointer text-xs flex flex-col gap-1 transition ${
                          inviteRole === 'primary_admin'
                            ? 'border-amber-500 bg-amber-50/50 text-slate-900 font-semibold'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="role"
                          checked={inviteRole === 'primary_admin'}
                          onChange={() => setInviteRole('primary_admin')}
                          className="sr-only"
                        />
                        <span className="text-amber-800">Primary Admin</span>
                        <span className="text-[10px] text-slate-500 font-normal">Full authority & invite rights</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsInviteModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={inviteSubmitting || !inviteEmail || !inviteFullName}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-gov-primary hover:bg-blue-900 text-white shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {inviteSubmitting ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Mail className="w-3.5 h-3.5" />
                          <span>Dispatch Invitation</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
