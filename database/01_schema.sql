-- ====================================================================
-- GramSeva — AI-Powered Public Grievance Management System
-- Database Schema Migration (Supabase PostgreSQL)
-- Migration 01: Tables, Types, Triggers and Sequences
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Custom Types & Enums
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('citizen', 'admin', 'officer');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'complaint_status') THEN
        CREATE TYPE complaint_status AS ENUM (
            'Submitted', 
            'Under Review', 
            'Assigned', 
            'In Progress', 
            'Resolved', 
            'Rejected'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'complaint_priority') THEN
        CREATE TYPE complaint_priority AS ENUM ('Low', 'Medium', 'High', 'Critical');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'complaint_source') THEN
        CREATE TYPE complaint_source AS ENUM ('web', 'whatsapp');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attachment_type') THEN
        CREATE TYPE attachment_type AS ENUM ('complaint', 'resolution');
    END IF;
END $$;

-- 3. Table: profiles (Supabase Auth linked users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone_number TEXT UNIQUE,
    role user_role NOT NULL DEFAULT 'citizen',
    department_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table: departments
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Foreign key for profile department
ALTER TABLE profiles 
    DROP CONSTRAINT IF EXISTS fk_profiles_department,
    ADD CONSTRAINT fk_profiles_department 
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

-- 5. Sequence for Tracking ID Generation: GS-YYYY-XXXX
CREATE SEQUENCE IF NOT EXISTS complaint_seq START WITH 1001;

CREATE OR REPLACE FUNCTION generate_complaint_id()
RETURNS TEXT AS $$
DECLARE
    current_yr TEXT;
    seq_val INT;
BEGIN
    current_yr := TO_CHAR(NOW(), 'YYYY');
    seq_val := NEXTVAL('complaint_seq');
    RETURN 'GS-' || current_yr || '-' || LPAD(seq_val::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- 6. Table: complaints
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_id TEXT NOT NULL UNIQUE DEFAULT generate_complaint_id(),
    citizen_name TEXT NOT NULL,
    citizen_phone TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    village_name TEXT NOT NULL,
    ward_number TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    source complaint_source NOT NULL DEFAULT 'web',
    status complaint_status NOT NULL DEFAULT 'Submitted',
    priority complaint_priority NOT NULL DEFAULT 'Medium',
    
    -- AI Suggestions (from Google Gemini)
    ai_category TEXT,
    ai_priority complaint_priority,
    ai_department TEXT,
    ai_summary TEXT,
    ai_confidence DOUBLE PRECISION,
    ai_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
    ai_overridden BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Resolution Fields
    assigned_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    assigned_department_name TEXT,
    assigned_officer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    assigned_officer_name TEXT,
    resolution_remarks TEXT,
    rejection_reason TEXT,
    resolved_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Table: complaint_assignments
CREATE TABLE IF NOT EXISTS complaint_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    officer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    assigned_officer_name TEXT,
    assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    notes TEXT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Table: complaint_status_history
CREATE TABLE IF NOT EXISTS complaint_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    previous_status complaint_status,
    new_status complaint_status NOT NULL,
    remarks TEXT,
    proof_url TEXT,
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    updated_by_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Table: complaint_attachments
CREATE TABLE IF NOT EXISTS complaint_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    attachment_type attachment_type NOT NULL DEFAULT 'complaint',
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Table: whatsapp_conversations (State management for WhatsApp bot)
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL UNIQUE,
    current_step TEXT NOT NULL DEFAULT 'WELCOME',
    collected_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Table: whatsapp_messages (Incoming & outgoing message logs)
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wamid TEXT UNIQUE,
    phone_number TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message_body TEXT,
    media_url TEXT,
    media_type TEXT,
    status TEXT NOT NULL DEFAULT 'received',
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Table: notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
    recipient_phone TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'whatsapp',
    template_name TEXT,
    message_body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent',
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_complaints_tracking_id ON complaints(tracking_id);
CREATE INDEX IF NOT EXISTS idx_complaints_citizen_phone ON complaints(citizen_phone);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_source ON complaints(source);
CREATE INDEX IF NOT EXISTS idx_complaint_history_complaint_id ON complaint_status_history(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_attachments_complaint_id ON complaint_attachments(complaint_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone ON whatsapp_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(phone_number);

-- 14. Auto-update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_complaints_timestamp ON complaints;
CREATE TRIGGER set_complaints_timestamp
BEFORE UPDATE ON complaints
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_profiles_timestamp ON profiles;
CREATE TRIGGER set_profiles_timestamp
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_whatsapp_conversations_timestamp ON whatsapp_conversations;
CREATE TRIGGER set_whatsapp_conversations_timestamp
BEFORE UPDATE ON whatsapp_conversations
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
