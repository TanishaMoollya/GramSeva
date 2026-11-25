export type ComplaintStatus =
  | 'Submitted'
  | 'Under Review'
  | 'Assigned'
  | 'In Progress'
  | 'Resolved'
  | 'Rejected';

export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type ComplaintSource = 'web' | 'whatsapp';
export type AttachmentType = 'complaint' | 'resolution';

export interface StatusHistoryItem {
  id?: string;
  complaint_id?: string;
  previous_status?: ComplaintStatus | null;
  new_status: ComplaintStatus;
  remarks?: string | null;
  proof_url?: string | null;
  updated_by_name?: string | null;
  created_at: string;
}

export interface AttachmentItem {
  id?: string;
  complaint_id?: string;
  file_name: string;
  file_url: string;
  file_type: string;
  attachment_type: AttachmentType;
  uploaded_at: string;
}

export interface Complaint {
  id: string;
  tracking_id: string;
  citizen_name: string;
  citizen_phone: string;
  category: string;
  description: string;
  village_name: string;
  ward_number: string;
  address: string;
  district?: string | null;
  taluk?: string | null;
  pincode?: string | null;
  landmark?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  source: ComplaintSource;
  status: ComplaintStatus;
  priority: ComplaintPriority;

  // AI Suggestions
  ai_category?: string | null;
  ai_priority?: ComplaintPriority | null;
  ai_department?: string | null;
  ai_summary?: string | null;
  ai_confidence?: number | null;
  ai_reviewed: boolean;
  ai_overridden: boolean;

  // Resolution Fields
  assigned_department_id?: string | null;
  assigned_department_name?: string | null;
  assigned_officer_id?: string | null;
  assigned_officer_name?: string | null;
  resolution_remarks?: string | null;
  rejection_reason?: string | null;
  resolved_at?: string | null;
  proof_url?: string | null;
  image_url?: string | null;

  // Relations
  status_history: StatusHistoryItem[];
  attachments: AttachmentItem[];

  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
}

export interface AnalyticsSummary {
  total_complaints: number;
  new_complaints: number;
  under_review: number;
  assigned: number;
  in_progress: number;
  resolved: number;
  rejected: number;
  pending_total: number;
  resolution_rate_percent: number;
  category_distribution: { name: string; count: number }[];
  department_distribution: { department: string; count: number }[];
  priority_distribution: { priority: string; count: number }[];
  source_distribution: { source: string; count: number }[];
  monthly_trends: { month: string; submitted: number; resolved: number }[];
}

export interface WhatsAppSimResponse {
  phone_number: string;
  bot_reply: string;
  current_step: string;
  collected_data: Record<string, any>;
  complaint_created: boolean;
  tracking_id?: string | null;
}
