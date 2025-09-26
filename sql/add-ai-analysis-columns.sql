-- Add AI analysis columns to the images table
-- Run this in your Supabase SQL Editor

-- Add columns for AI analysis results
ALTER TABLE images ADD COLUMN tags TEXT[];
ALTER TABLE images ADD COLUMN description TEXT;
ALTER TABLE images ADD COLUMN dominant_colors JSONB;
ALTER TABLE images ADD COLUMN processing_status TEXT DEFAULT 'pending';
ALTER TABLE images ADD COLUMN ai_analysis_error TEXT;
ALTER TABLE images ADD COLUMN analyzed_at TIMESTAMPTZ;

-- Create indexes for better search performance
CREATE INDEX idx_images_tags ON images USING GIN(tags);
CREATE INDEX idx_images_description ON images USING GIN(to_tsvector('english', description));
CREATE INDEX idx_images_processing_status ON images(processing_status);
CREATE INDEX idx_images_analyzed_at ON images(analyzed_at);

-- Add comments for documentation
COMMENT ON COLUMN images.tags IS 'AI-generated tags/keywords for the image';
COMMENT ON COLUMN images.description IS 'AI-generated description of the image content';
COMMENT ON COLUMN images.dominant_colors IS 'Top 3 dominant colors as JSON array of hex values';
COMMENT ON COLUMN images.processing_status IS 'AI analysis status: pending, processing, completed, failed';
COMMENT ON COLUMN images.ai_analysis_error IS 'Error message if AI analysis failed';
COMMENT ON COLUMN images.analyzed_at IS 'Timestamp when AI analysis was completed';

-- Update existing records to have 'pending' status
UPDATE images SET processing_status = 'pending' WHERE processing_status IS NULL;
