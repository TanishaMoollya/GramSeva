import {
  Complaint,
  Department,
  AnalyticsSummary,
  WhatsAppSimResponse,
  ComplaintStatus,
  ComplaintPriority,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchDepartments(): Promise<Department[]> {
  const res = await fetch(`${API_BASE}/api/departments`);
  if (!res.ok) throw new Error('Failed to fetch departments');
  return res.json();
}

export async function submitComplaint(data: {
  citizen_name: string;
  citizen_phone: string;
  category: string;
  description: string;
  village_name: string;
  ward_number: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  image_url?: string | null;
}): Promise<Complaint> {
  const res = await fetch(`${API_BASE}/api/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, source: 'web' }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to submit complaint');
  }
  return res.json();
}

export async function trackComplaint(trackingId: string, phone?: string): Promise<Complaint> {
  const params = new URLSearchParams();
  if (phone) params.set('phone', phone);
  const url = `${API_BASE}/api/complaints/track/${encodeURIComponent(trackingId)}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Complaint not found');
  }
  return res.json();
}

export async function fetchComplaints(params?: {
  search?: string;
  category?: string;
  department?: string;
  status?: string;
  source?: string;
  priority?: string;
  sort_by?: string;
}): Promise<Complaint[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.category && params.category !== 'All') query.set('category', params.category);
  if (params?.department && params.department !== 'All') query.set('department', params.department);
  if (params?.status && params.status !== 'All') query.set('status', params.status);
  if (params?.source && params.source !== 'All') query.set('source', params.source);
  if (params?.priority && params.priority !== 'All') query.set('priority', params.priority);
  if (params?.sort_by) query.set('sort_by', params.sort_by);

  const res = await fetch(`${API_BASE}/api/complaints?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch complaints');
  return res.json();
}

export async function fetchComplaintById(id: string): Promise<Complaint> {
  const res = await fetch(`${API_BASE}/api/complaints/${id}`);
  if (!res.ok) throw new Error('Failed to load complaint');
  return res.json();
}

export async function updateComplaintStatus(
  id: string,
  data: {
    status: ComplaintStatus;
    remarks?: string;
    rejection_reason?: string;
    proof_url?: string;
    updated_by_name?: string;
    notify_citizen?: boolean;
  }
): Promise<Complaint> {
  const res = await fetch(`${API_BASE}/api/complaints/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update status');
  }
  return res.json();
}

export async function assignComplaint(
  id: string,
  data: {
    department_id: string;
    department_name: string;
    officer_name?: string;
    notes?: string;
    assigned_by_name?: string;
    notify_citizen?: boolean;
  }
): Promise<Complaint> {
  const res = await fetch(`${API_BASE}/api/complaints/${id}/assign`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to assign complaint');
  }
  return res.json();
}

export async function overrideAI(
  id: string,
  data: {
    category?: string;
    priority?: ComplaintPriority;
    department?: string;
    summary?: string;
  }
): Promise<Complaint> {
  const res = await fetch(`${API_BASE}/api/complaints/${id}/ai-override`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to override AI recommendation');
  }
  return res.json();
}

export async function fetchAnalytics(): Promise<AnalyticsSummary> {
  const res = await fetch(`${API_BASE}/api/analytics/summary`);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export function getExportCsvUrl(): string {
  return `${API_BASE}/api/analytics/export-csv`;
}

export async function simulateWhatsApp(data: {
  phone_number: string;
  message_text: string;
  media_url?: string | null;
}): Promise<WhatsAppSimResponse> {
  const res = await fetch(`${API_BASE}/api/whatsapp/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed in WhatsApp simulation');
  }
  return res.json();
}

export async function testAIClassify(description: string, category: string = 'Other public issues') {
  const res = await fetch(`${API_BASE}/api/ai/classify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, category }),
  });
  if (!res.ok) throw new Error('Failed to run AI classification');
  return res.json();
}

// ====================================================================
// Administrator Authentication & Security APIs
// ====================================================================

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('gramseva_admin_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

export interface AdminLoginStageAResponse {
  stage: string;
  challenge_id: string;
  email: string;
  masked_email: string;
  expires_in_minutes: number;
  dev_verification_url?: string | null;
  message: string;
}

export interface AdminVerifiedSessionResponse {
  access_token: string;
  token_type: string;
  expires_in_minutes: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'primary_admin' | 'admin';
    department_name: string;
    status: 'active' | 'suspended';
    last_login_at?: string;
  };
}

export async function adminLogin(email: string, password: string): Promise<AdminLoginStageAResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Authentication failed. Please verify credentials.');
  }
  return res.json();
}

export async function verifyAdminChallenge(token: string): Promise<AdminVerifiedSessionResponse> {
  const res = await fetch(`${API_BASE}/api/auth/verify-challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Verification failed or link has expired.');
  }
  return res.json();
}

export async function resendAdminChallenge(email: string): Promise<{ status: string; message: string; dev_verification_url?: string }> {
  const res = await fetch(`${API_BASE}/api/auth/resend-challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to resend verification email.');
  }
  return res.json();
}

export async function fetchAdminProfile(): Promise<{ authenticated: boolean; verified: boolean; user: any }> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error('Session invalid or expired');
  }
  return res.json();
}

export async function requestPasswordReset(email: string): Promise<{ status: string; message: string; dev_reset_url?: string }> {
  const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to request password reset.');
  }
  return res.json();
}

export async function executePasswordReset(token: string, password: string): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Password reset failed.');
  }
  return res.json();
}

export async function validateAdminInvitation(token: string): Promise<{ email: string; full_name: string; role: string; department_name: string; invited_by: string }> {
  const res = await fetch(`${API_BASE}/api/auth/invitation?token=${encodeURIComponent(token)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Invitation is invalid or has expired.');
  }
  return res.json();
}

export async function acceptAdminInvitation(token: string, password: string, fullName?: string): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/api/auth/accept-invitation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password, full_name: fullName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to accept invitation.');
  }
  return res.json();
}

export async function fetchAdministrators(): Promise<{
  administrators: Array<{
    id: string;
    email: string;
    full_name: string;
    role: string;
    department_name: string;
    status: string;
    last_login_at?: string;
    created_at: string;
  }>;
  invitations: Array<{
    id: string;
    email: string;
    full_name: string;
    role: string;
    department_name: string;
    invited_by: string;
    expires_at: string;
    created_at: string;
    is_active: boolean;
  }>;
  current_user_role: string;
}> {
  const res = await fetch(`${API_BASE}/api/auth/administrators`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch administrators.');
  }
  return res.json();
}

export async function inviteAdministrator(data: {
  email: string;
  full_name: string;
  role: string;
  department_name?: string;
}): Promise<{ status: string; message: string; dev_invite_url?: string }> {
  const res = await fetch(`${API_BASE}/api/auth/invite-admin`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to invite administrator.');
  }
  return res.json();
}

export async function suspendAdministrator(adminId: string): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/api/auth/administrators/${adminId}/suspend`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to suspend administrator.');
  }
  return res.json();
}

export async function reactivateAdministrator(adminId: string): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/api/auth/administrators/${adminId}/reactivate`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to reactivate administrator.');
  }
  return res.json();
}

export async function revokeInvitation(invitationId: string): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/api/auth/invitations/${invitationId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to revoke invitation.');
  }
  return res.json();
}

export async function fetchAuditLogs(limit: number = 30): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/auth/audit-logs?limit=${limit}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch audit logs.');
  }
  return res.json();
}
