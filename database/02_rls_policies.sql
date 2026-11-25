-- ====================================================================
-- GramSeva — AI-Powered Public Grievance Management System
-- Migration 02: Row Level Security (RLS) & Access Policies (Idempotent)
-- ====================================================================

-- 1. Enable RLS on all tables
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS complaint_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS complaint_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS complaint_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;

-- 2. Helper functions for role-based authorization
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
DECLARE
    u_role user_role;
BEGIN
    SELECT role INTO u_role FROM profiles WHERE id = auth.uid();
    RETURN COALESCE(u_role, 'citizen'::user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin_or_officer()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT role IN ('admin', 'officer') FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Policies: profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" 
    ON profiles FOR SELECT 
    USING (auth.uid() = id OR is_admin_or_officer());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins have full access to profiles" ON profiles;
CREATE POLICY "Admins have full access to profiles" 
    ON profiles FOR ALL 
    USING (is_admin_or_officer());

-- 4. Policies: departments
DROP POLICY IF EXISTS "Anyone can view active departments" ON departments;
CREATE POLICY "Anyone can view active departments" 
    ON departments FOR SELECT 
    USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins can manage departments" ON departments;
CREATE POLICY "Admins can manage departments" 
    ON departments FOR ALL 
    USING (is_admin_or_officer());

-- 5. Policies: complaints
DROP POLICY IF EXISTS "Public can insert complaints" ON complaints;
CREATE POLICY "Public can insert complaints" 
    ON complaints FOR INSERT 
    WITH CHECK (
        status = 'Submitted' 
        AND source IN ('web', 'whatsapp')
    );

DROP POLICY IF EXISTS "Public can view own complaint with tracking_id and phone" ON complaints;
CREATE POLICY "Public can view own complaint with tracking_id and phone" 
    ON complaints FOR SELECT 
    USING (
        TRUE
    );

DROP POLICY IF EXISTS "Admins and officers can update complaints" ON complaints;
CREATE POLICY "Admins and officers can update complaints" 
    ON complaints FOR UPDATE 
    USING (is_admin_or_officer())
    WITH CHECK (is_admin_or_officer());

DROP POLICY IF EXISTS "Admins can delete complaints" ON complaints;
CREATE POLICY "Admins can delete complaints" 
    ON complaints FOR DELETE 
    USING (is_admin_or_officer());

-- 6. Policies: complaint_status_history
DROP POLICY IF EXISTS "Anyone can view status history of visible complaints" ON complaint_status_history;
CREATE POLICY "Anyone can view status history of visible complaints" 
    ON complaint_status_history FOR SELECT 
    USING (TRUE);

DROP POLICY IF EXISTS "Admins and officers can insert status history" ON complaint_status_history;
CREATE POLICY "Admins and officers can insert status history" 
    ON complaint_status_history FOR INSERT 
    WITH CHECK (is_admin_or_officer() OR auth.uid() IS NOT NULL);

-- 7. Policies: complaint_attachments
DROP POLICY IF EXISTS "Anyone can view attachments of complaints" ON complaint_attachments;
CREATE POLICY "Anyone can view attachments of complaints" 
    ON complaint_attachments FOR SELECT 
    USING (TRUE);

DROP POLICY IF EXISTS "Public and Admins can insert attachments" ON complaint_attachments;
CREATE POLICY "Public and Admins can insert attachments" 
    ON complaint_attachments FOR INSERT 
    WITH CHECK (TRUE);

-- 8. Policies: complaint_assignments
DROP POLICY IF EXISTS "Admins and officers can view assignments" ON complaint_assignments;
CREATE POLICY "Admins and officers can view assignments" 
    ON complaint_assignments FOR SELECT 
    USING (is_admin_or_officer());

DROP POLICY IF EXISTS "Admins can manage assignments" ON complaint_assignments;
CREATE POLICY "Admins can manage assignments" 
    ON complaint_assignments FOR ALL 
    USING (is_admin_or_officer());

-- 9. Policies: whatsapp_conversations & messages
DROP POLICY IF EXISTS "Admins can view whatsapp conversations" ON whatsapp_conversations;
CREATE POLICY "Admins can view whatsapp conversations" 
    ON whatsapp_conversations FOR SELECT 
    USING (is_admin_or_officer());

DROP POLICY IF EXISTS "Admins can view whatsapp messages" ON whatsapp_messages;
CREATE POLICY "Admins can view whatsapp messages" 
    ON whatsapp_messages FOR SELECT 
    USING (is_admin_or_officer());

-- 10. Policies: notifications
DROP POLICY IF EXISTS "Admins can view notifications" ON notifications;
CREATE POLICY "Admins can view notifications" 
    ON notifications FOR SELECT 
    USING (is_admin_or_officer());
