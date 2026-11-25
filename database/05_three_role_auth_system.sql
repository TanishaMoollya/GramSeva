-- ====================================================================
-- GramSeva — AI-Powered Public Grievance Management System
-- Migration 05: Two-Role Authentication System
-- 1. Main Admin (Panchayat Officer)
-- 2. Department Officer (Sanitation, Public Works, Water Supply, Electricity, General Administration)
-- ====================================================================

-- 1. Update admin_memberships table check constraints to support Main Admin and Department Officer
ALTER TABLE admin_memberships DROP CONSTRAINT IF EXISTS admin_memberships_role_check;
ALTER TABLE admin_memberships ADD CONSTRAINT admin_memberships_role_check 
    CHECK (role IN ('main_admin', 'primary_admin', 'department_officer', 'admin'));

ALTER TABLE admin_memberships DROP CONSTRAINT IF EXISTS admin_memberships_status_check;
ALTER TABLE admin_memberships ADD CONSTRAINT admin_memberships_status_check 
    CHECK (status IN ('active', 'pending_approval', 'suspended', 'rejected'));

-- 2. Add columns for Department Officers, unique employee IDs, and email verification
ALTER TABLE admin_memberships ADD COLUMN IF NOT EXISTS employee_id TEXT UNIQUE;
ALTER TABLE admin_memberships ADD COLUMN IF NOT EXISTS department_code TEXT;
ALTER TABLE admin_memberships ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE admin_memberships ADD COLUMN IF NOT EXISTS email_verification_token_hash TEXT;
ALTER TABLE admin_memberships ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE admin_memberships ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 2.1 Update admin_invitations to support inviting Department Officers
ALTER TABLE admin_invitations DROP CONSTRAINT IF EXISTS admin_invitations_role_check;
ALTER TABLE admin_invitations ADD CONSTRAINT admin_invitations_role_check 
    CHECK (role IN ('main_admin', 'primary_admin', 'department_officer', 'admin'));
ALTER TABLE admin_invitations ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE admin_invitations ADD COLUMN IF NOT EXISTS department_code TEXT;

-- 3. Performance indexes
CREATE INDEX IF NOT EXISTS idx_admin_memberships_employee_id ON admin_memberships(employee_id);
CREATE INDEX IF NOT EXISTS idx_admin_memberships_role ON admin_memberships(role);
CREATE INDEX IF NOT EXISTS idx_admin_memberships_dept_code ON admin_memberships(department_code);

-- 4. Seed Initial Pre-Approved Department Officers for the 5 Predefined Departments
-- Passwords:
-- SAN: OfficerSAN#2026
-- PWD: OfficerPWD#2026
-- WTR: OfficerWTR#2026
-- ELE: OfficerELE#2026
-- ADM: OfficerADM#2026

INSERT INTO admin_memberships (
    id, email, employee_id, full_name, role, department_id, department_name, department_code,
    status, password_hash, invited_by, is_email_verified, approved_by, approved_at
)
VALUES
-- Sanitation Officer (Primary alias)
(
    'a0000003-0000-0000-0000-000000000003',
    'sanitation.officer@gramseva.gov.in',
    'SAN-OFF-001',
    'Sri. Somanna (Sanitation Officer)',
    'department_officer',
    'd0000001-0000-0000-0000-000000000001',
    'Sanitation',
    'SAN',
    'active',
    'pbkdf2_sha256$100000$274ca2ebf7573f5b6b983f654b144ba5$571207b91d59dca81f1084347594309b340bf5947fc06f5f0c294a100cb1af08',
    'System Bootstrap',
    TRUE,
    'System',
    NOW()
),
-- Public Works Officer (Primary alias)
(
    'a0000004-0000-0000-0000-000000000004',
    'pwd.officer@gramseva.gov.in',
    'PWD-OFF-002',
    'Sri. Suresh Gowda (Junior Engineer PWD)',
    'department_officer',
    'd0000002-0000-0000-0000-000000000002',
    'Public Works',
    'PWD',
    'active',
    'pbkdf2_sha256$100000$9df0be5d56ac1ab8f897ec6b889dc327$1dfc3c0ce48602d984fe1a7fa4b44f225ce3bfc24bdfd3464305da221ba1d10a',
    'System Bootstrap',
    TRUE,
    'System',
    NOW()
),
-- Water Supply Officer (Primary alias)
(
    'a0000005-0000-0000-0000-000000000005',
    'water.officer@gramseva.gov.in',
    'WTR-OFF-003',
    'Smt. Kavitha Reddy (Water Supply Inspector)',
    'department_officer',
    'd0000003-0000-0000-0000-000000000003',
    'Water Supply',
    'WTR',
    'active',
    'pbkdf2_sha256$100000$1a4504773a825bfcf60fcb891d4e46fd$ab311300fbcebc1f3a675af0e880d91c5357c499883896ddba881ffeda91e7b9',
    'System Bootstrap',
    TRUE,
    'System',
    NOW()
),
-- Electricity Officer (Primary alias)
(
    'a0000006-0000-0000-0000-000000000006',
    'electricity.officer@gramseva.gov.in',
    'ELE-OFF-004',
    'Sri. Venkatesh Murthy (Lineman/BESCOM)',
    'department_officer',
    'd0000004-0000-0000-0000-000000000004',
    'Electricity',
    'ELE',
    'active',
    'pbkdf2_sha256$100000$c1a6f14e588d7f53936400fd47c83bc9$14620560a2213d49b8bb82bf120840959268ac7ad05df832c68645e46e365da4',
    'System Bootstrap',
    TRUE,
    'System',
    NOW()
),
-- General Administration Officer (Primary alias)
(
    'a0000007-0000-0000-0000-000000000007',
    'admin.officer@gramseva.gov.in',
    'ADM-OFF-005',
    'Sri. Chandrashekar (Panchayat Secretary)',
    'department_officer',
    'd0000005-0000-0000-0000-000000000005',
    'General Administration',
    'ADM',
    'active',
    'pbkdf2_sha256$100000$7e2eb97ffa085c6d55926bb79029de12$fc46e07bc5f615bff71cccf628df06fa936406a4513104fef830d361d8898b04',
    'System Bootstrap',
    TRUE,
    'System',
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    employee_id = EXCLUDED.employee_id,
    password_hash = EXCLUDED.password_hash,
    status = EXCLUDED.status,
    role = EXCLUDED.role,
    department_code = EXCLUDED.department_code,
    is_email_verified = TRUE;
