-- ====================================================================
-- GramSeva — AI-Powered Public Grievance Management System
-- Migration 03: Seed Data for Departments, Sample Grievances & Profiles
-- ====================================================================

-- 1. Insert Departments
INSERT INTO departments (id, name, code, description, contact_email, contact_phone, is_active)
VALUES
    ('d0000001-0000-0000-0000-000000000001', 'Sanitation', 'SAN', 'Waste collection, solid waste disposal, public hygiene and cleanliness.', 'sanitation@gramseva.gov.in', '+919876543210', TRUE),
    ('d0000002-0000-0000-0000-000000000002', 'Public Works', 'PWD', 'Road repairs, potholes, culverts, bridge maintenance and public structures.', 'pwd@gramseva.gov.in', '+919876543211', TRUE),
    ('d0000003-0000-0000-0000-000000000003', 'Water Supply', 'WTR', 'Borewells, community taps, water pipeline leakages and RO purification units.', 'water@gramseva.gov.in', '+919876543212', TRUE),
    ('d0000004-0000-0000-0000-000000000004', 'Electricity', 'ELE', 'Streetlights, hanging electric wires, transformer faults and power supply.', 'electricity@gramseva.gov.in', '+919876543213', TRUE),
    ('d0000005-0000-0000-0000-000000000005', 'General Administration', 'ADM', 'Panchayat office documentation, encroachment, licenses and community issues.', 'admin@gramseva.gov.in', '+919876543214', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 2. Insert Demo Complaints (Ramanagara / Bidadi Panchayat Region)
INSERT INTO complaints (
    id, tracking_id, citizen_name, citizen_phone, category, description, 
    village_name, ward_number, address, latitude, longitude, source, status, priority,
    ai_category, ai_priority, ai_department, ai_summary, ai_confidence, ai_reviewed,
    assigned_department_id, assigned_department_name, assigned_officer_name,
    resolution_remarks, created_at, updated_at
)
VALUES
(
    'c0000001-0000-0000-0000-000000000001',
    'GS-2026-1001',
    'Ramesh Kumar',
    '+919845123456',
    'Streetlight issues',
    'Four streetlights near the Government Primary School have been dysfunctional for over 10 days, making the road unsafe for children in the evening.',
    'Harohalli',
    'Ward 3',
    'Near Govt Primary School, Main Cross',
    12.6582,
    77.4521,
    'web',
    'Assigned',
    'High',
    'Streetlight issues',
    'High',
    'Electricity',
    'Dysfunctional streetlights near school causing safety concerns for 10 days.',
    0.95,
    TRUE,
    'd0000004-0000-0000-0000-000000000004',
    'Electricity',
    'Venkatesh Murthy (Lineman)',
    NULL,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '1 day'
),
(
    'c0000002-0000-0000-0000-000000000002',
    'GS-2026-1002',
    'Lakshmi Devi',
    '+919845234567',
    'Water supply',
    'The main pipeline near the community center burst yesterday morning. Potable water is flooding the street and 40 families have no drinking water.',
    'Kallugopahalli',
    'Ward 1',
    'Opposite Community Center, Bazaar Street',
    12.6645,
    77.4610,
    'whatsapp',
    'In Progress',
    'Critical',
    'Water supply',
    'Critical',
    'Water Supply',
    'Major burst in main drinking water pipeline affecting 40 households.',
    0.98,
    TRUE,
    'd0000003-0000-0000-0000-000000000003',
    'Water Supply',
    'Anand Gowda (Water Inspector)',
    'Excavation started; repair team deployed on-site.',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '4 hours'
),
(
    'c0000003-0000-0000-0000-000000000003',
    'GS-2026-1003',
    'Basavaraj Patil',
    '+919845345678',
    'Garbage collection',
    'Solid waste and plastic pile has not been cleared for two weeks near the weekly market ground. Foul odor and stray dogs causing disturbance.',
    'Bidadi Rural',
    'Ward 5',
    'Shandy / Weekly Market Ground North Gate',
    12.6710,
    77.4435,
    'web',
    'Resolved',
    'Medium',
    'Garbage collection',
    'Medium',
    'Sanitation',
    'Uncollected waste heap at weekly market ground for two weeks.',
    0.94,
    TRUE,
    'd0000001-0000-0000-0000-000000000001',
    'Sanitation',
    'Suresh Kumar (Sanitation Supervisor)',
    'Tractor and cleaning crew cleared 3 tonnes of waste. Disinfection powder sprayed.',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '2 days'
),
(
    'c0000004-0000-0000-0000-000000000004',
    'GS-2026-1004',
    'Ananya Rao',
    '+919845456789',
    'Potholes and road damage',
    'Deep crater formed on the bus stop curve. Two two-wheelers skidded yesterday during rainfall.',
    'Maralavadi',
    'Ward 2',
    'Bus Stop curve, Kanakapura Road junction',
    12.6490,
    77.4720,
    'whatsapp',
    'Under Review',
    'High',
    'Potholes and road damage',
    'High',
    'Public Works',
    'Hazardous deep potholes causing accidents on bus stop curve.',
    0.92,
    FALSE,
    NULL,
    NULL,
    NULL,
    NULL,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '12 hours'
),
(
    'c0000005-0000-0000-0000-000000000005',
    'GS-2026-1005',
    'Manjunath S',
    '+919845567890',
    'Drainage and sanitation',
    'Open stormwater drain is clogged with silt and plastic bottles. Drain overflowed into our front yard after rain.',
    'Harohalli',
    'Ward 4',
    'Ganesha Temple Road, 2nd Cross',
    12.6534,
    77.4589,
    'web',
    'Submitted',
    'Medium',
    'Drainage and sanitation',
    'Medium',
    'Sanitation',
    'Clogged stormwater drain leading to overflow into residential compound.',
    0.91,
    FALSE,
    NULL,
    NULL,
    NULL,
    NULL,
    NOW() - INTERVAL '6 hours',
    NOW() - INTERVAL '6 hours'
),
(
    'c0000006-0000-0000-0000-000000000006',
    'GS-2026-1006',
    'Chandrashekar B',
    '+919845678901',
    'Other public issues',
    'Private construction dumping soil and blocking village public pathway.',
    'Kallugopahalli',
    'Ward 2',
    'Old Lake Pathway, Survey No. 42',
    12.6612,
    77.4650,
    'web',
    'Rejected',
    'Low',
    'Other public issues',
    'Low',
    'General Administration',
    'Civil dispute regarding private encroachment on pathway.',
    0.85,
    TRUE,
    'd0000005-0000-0000-0000-000000000005',
    'General Administration',
    'Nagaraj (Panchayat Development Officer)',
    NULL,
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '8 days'
)
ON CONFLICT (tracking_id) DO NOTHING;

-- Update rejection reason for GS-2026-1006
UPDATE complaints 
SET rejection_reason = 'Dispute pertains to private land survey boundary currently under civil court jurisdiction; outside Panchayat executive jurisdiction.'
WHERE tracking_id = 'GS-2026-1006';

-- 3. Status History Seeds
INSERT INTO complaint_status_history (complaint_id, previous_status, new_status, remarks, updated_by_name, created_at)
VALUES
(
    'c0000001-0000-0000-0000-000000000001',
    NULL,
    'Submitted',
    'Complaint submitted via Citizen Web Portal.',
    'Ramesh Kumar (Citizen)',
    NOW() - INTERVAL '3 days'
),
(
    'c0000001-0000-0000-0000-000000000001',
    'Submitted',
    'Under Review',
    'Grievance verified by Panchayat Development Officer.',
    'Panchayat Desk',
    NOW() - INTERVAL '2 days'
),
(
    'c0000001-0000-0000-0000-000000000001',
    'Under Review',
    'Assigned',
    'Assigned to Electricity Department (Venkatesh Murthy, Lineman). Work order generated.',
    'Admin User',
    NOW() - INTERVAL '1 day'
),
(
    'c0000002-0000-0000-0000-000000000002',
    NULL,
    'Submitted',
    'Complaint submitted via GramSeva WhatsApp Bot.',
    'Lakshmi Devi (WhatsApp)',
    NOW() - INTERVAL '2 days'
),
(
    'c0000002-0000-0000-0000-000000000002',
    'Submitted',
    'Under Review',
    'AI flagged priority as Critical. Expedited review by Admin.',
    'Automated System',
    NOW() - INTERVAL '1 day 20 hours'
),
(
    'c0000002-0000-0000-0000-000000000002',
    'Under Review',
    'Assigned',
    'Assigned to Water Supply Department. Water inspector Anand Gowda dispatched.',
    'Admin User',
    NOW() - INTERVAL '1 day 18 hours'
),
(
    'c0000002-0000-0000-0000-000000000002',
    'Assigned',
    'In Progress',
    'Replacement pipeline fittings delivered; emergency water tanker deployed to affected houses.',
    'Anand Gowda',
    NOW() - INTERVAL '4 hours'
),
(
    'c0000003-0000-0000-0000-000000000003',
    NULL,
    'Submitted',
    'Complaint submitted via Citizen Web Portal.',
    'Basavaraj Patil (Citizen)',
    NOW() - INTERVAL '7 days'
),
(
    'c0000003-0000-0000-0000-000000000003',
    'Submitted',
    'Assigned',
    'Assigned to Sanitation Dept.',
    'Admin User',
    NOW() - INTERVAL '5 days'
),
(
    'c0000003-0000-0000-0000-000000000003',
    'Assigned',
    'In Progress',
    'Tractor and loader deployed to Shandy ground.',
    'Suresh Kumar',
    NOW() - INTERVAL '3 days'
),
(
    'c0000003-0000-0000-0000-000000000003',
    'In Progress',
    'Resolved',
    'All solid waste cleared. Area disinfected with bleaching powder. Photo proof submitted.',
    'Suresh Kumar',
    NOW() - INTERVAL '2 days'
);

-- 4. Sample Attachments
INSERT INTO complaint_attachments (complaint_id, file_name, file_url, file_type, attachment_type, uploaded_at)
VALUES
(
    'c0000001-0000-0000-0000-000000000001',
    'broken_streetlight_ward3.jpg',
    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80',
    'image/jpeg',
    'complaint',
    NOW() - INTERVAL '3 days'
),
(
    'c0000002-0000-0000-0000-000000000002',
    'pipe_burst_flooding.jpg',
    'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80',
    'image/jpeg',
    'complaint',
    NOW() - INTERVAL '2 days'
),
(
    'c0000003-0000-0000-0000-000000000003',
    'garbage_pile_market.jpg',
    'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=800&q=80',
    'image/jpeg',
    'complaint',
    NOW() - INTERVAL '7 days'
),
(
    'c0000003-0000-0000-0000-000000000003',
    'resolved_market_clean.jpg',
    'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80',
    'image/jpeg',
    'resolution',
    NOW() - INTERVAL '2 days'
);
