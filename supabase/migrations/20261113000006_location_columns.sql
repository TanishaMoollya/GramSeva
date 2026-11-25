-- ====================================================================
-- GramSeva — Karnataka iPGRS Structured Location & Evidence Migration
-- Migration 06: Adds district, taluk, pincode, landmark columns
-- ====================================================================

ALTER TABLE complaints ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS taluk TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS landmark TEXT;

-- Index for district and taluk search performance
CREATE INDEX IF NOT EXISTS idx_complaints_district ON complaints(district);
CREATE INDEX IF NOT EXISTS idx_complaints_taluk ON complaints(taluk);
