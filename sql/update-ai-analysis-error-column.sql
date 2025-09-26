-- Add ai_analysis_error column if it doesn't exist
ALTER TABLE images 
ADD COLUMN IF NOT EXISTS ai_analysis_error TEXT;
