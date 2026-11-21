-- ====================================================================
-- GramSeva — AI-Powered Public Grievance Management System
-- Migration 04: Secure Administrator Authentication & Management
-- ====================================================================

-- 1. Table: admin_memberships
CREATE TABLE IF NOT EXISTS admin_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('primary_admin', 'admin')),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    department_name TEXT DEFAULT 'General Administration',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    password_hash TEXT,
    invited_by TEXT,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table: admin_login_challenges
CREATE TABLE IF NOT EXISTS admin_login_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admin_memberships(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table: admin_invitations
CREATE TABLE IF NOT EXISTS admin_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('primary_admin', 'admin')),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    department_name TEXT DEFAULT 'General Administration',
    token_hash TEXT NOT NULL UNIQUE,
    invited_by TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table: admin_password_resets
CREATE TABLE IF NOT EXISTS admin_password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table: admin_audit_logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_email TEXT NOT NULL,
    action TEXT NOT NULL,
    target_email TEXT,
    ip_address TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning-fast lookups and verification queries
CREATE INDEX IF NOT EXISTS idx_admin_memberships_email ON admin_memberships(email);
CREATE INDEX IF NOT EXISTS idx_admin_memberships_status ON admin_memberships(status);
CREATE INDEX IF NOT EXISTS idx_admin_login_challenges_token_hash ON admin_login_challenges(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_login_challenges_email ON admin_login_challenges(email);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_token_hash ON admin_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_email ON admin_invitations(email);
CREATE INDEX IF NOT EXISTS idx_admin_password_resets_token_hash ON admin_password_resets(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON admin_audit_logs(created_at DESC);

-- Enable Row Level Security (RLS) on all admin security tables
ALTER TABLE admin_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_login_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Deny all public anon access to authentication & challenge tables
DROP POLICY IF EXISTS "Deny anon access to admin_memberships" ON admin_memberships;
CREATE POLICY "Deny anon access to admin_memberships" ON admin_memberships
    FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Deny anon access to admin_login_challenges" ON admin_login_challenges;
CREATE POLICY "Deny anon access to admin_login_challenges" ON admin_login_challenges
    FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Deny anon access to admin_invitations" ON admin_invitations;
CREATE POLICY "Deny anon access to admin_invitations" ON admin_invitations
    FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Deny anon access to admin_password_resets" ON admin_password_resets;
CREATE POLICY "Deny anon access to admin_password_resets" ON admin_password_resets
    FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Deny anon access to admin_audit_logs" ON admin_audit_logs;
CREATE POLICY "Deny anon access to admin_audit_logs" ON admin_audit_logs
    FOR ALL TO anon USING (false);
