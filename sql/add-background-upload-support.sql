-- Add support for background upload tracking
-- This script adds new columns and updates to support background upload processing

-- Add new columns for upload progress and enhanced status tracking
ALTER TABLE images 
ADD COLUMN IF NOT EXISTS upload_progress INTEGER DEFAULT 0;

-- Update the processing_status to include new background upload statuses
-- Note: We can't modify enum types directly in all databases, so we'll handle this in the application
-- The new statuses will be: 'uploading', 'processing', 'pending', 'ai_processing', 'completed', 'failed'

-- Add an index on processing_status for faster queries
CREATE INDEX IF NOT EXISTS idx_images_processing_status ON images(processing_status);

-- Add an index on user_id and created_at for dashboard queries
CREATE INDEX IF NOT EXISTS idx_images_user_created ON images(user_id, created_at DESC);

-- Add an index on user_id and processing_status for filtering
CREATE INDEX IF NOT EXISTS idx_images_user_status ON images(user_id, processing_status);

-- Add a trigger to automatically update the updated_at timestamp when status changes
-- (Only if your database supports it and you have an updated_at column)
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.updated_at = CURRENT_TIMESTAMP;
--     RETURN NEW;
-- END;
-- $$ language 'plpgsql';

-- CREATE TRIGGER update_images_updated_at BEFORE UPDATE ON images
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON COLUMN images.upload_progress IS 'Upload and processing progress percentage (0-100)';
COMMENT ON COLUMN images.processing_status IS 'Status: uploading, processing, pending, ai_processing, completed, failed';
