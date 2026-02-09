-- iVisit Document Generator - Supabase Migration
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create the main code_chunks table
CREATE TABLE IF NOT EXISTS code_chunks (
  id TEXT PRIMARY KEY,
  file_path TEXT NOT NULL,
  content TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Vector embedding for semantic search (1536 dimensions for OpenAI embeddings)
  embedding vector(1536)
);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_code_chunks_file_path ON code_chunks(file_path);
CREATE INDEX IF NOT EXISTS idx_code_chunks_file_hash ON code_chunks(file_hash);
CREATE INDEX IF NOT EXISTS idx_code_chunks_created_at ON code_chunks(created_at DESC);

-- Full-text search index for content searching
CREATE INDEX IF NOT EXISTS idx_code_chunks_content_search ON code_chunks 
USING gin(to_tsvector('english', content));

-- Vector similarity search index (if using pgvector)
CREATE INDEX IF NOT EXISTS idx_code_chunks_embedding ON code_chunks 
USING ivfflat (embedding vector_cosine_ops);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_code_chunks_updated_at 
    BEFORE UPDATE ON code_chunks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (optional, recommended for production)
ALTER TABLE code_chunks ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust according to your needs)
-- Allow all operations for service role (bypasses RLS)
-- For production, you might want more restrictive policies

-- Function for similarity search
CREATE OR REPLACE FUNCTION search_code_chunks(
  query_vector vector(1536),
  similarity_threshold float DEFAULT 0.5,
  max_results int DEFAULT 10
)
RETURNS TABLE (
  id TEXT,
  file_path TEXT,
  content TEXT,
  file_hash TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id,
    cc.file_path,
    cc.content,
    cc.file_hash,
    cc.created_at,
    cc.updated_at,
    1 - (cc.embedding <=> query_vector) as similarity
  FROM code_chunks cc
  WHERE 1 - (cc.embedding <=> query_vector) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Function for text-based search
CREATE OR REPLACE FUNCTION search_code_chunks_text(
  search_query TEXT,
  max_results int DEFAULT 20
)
RETURNS TABLE (
  id TEXT,
  file_path TEXT,
  content TEXT,
  file_hash TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id,
    cc.file_path,
    cc.content,
    cc.file_hash,
    cc.created_at,
    cc.updated_at,
    ts_rank(to_tsvector('english', cc.content), plainto_tsquery('english', search_query)) as rank
  FROM code_chunks cc
  WHERE to_tsvector('english', cc.content) @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Create a view for recent chunks
CREATE OR REPLACE VIEW recent_code_chunks AS
SELECT 
  id,
  file_path,
  content,
  file_hash,
  created_at,
  updated_at
FROM code_chunks 
ORDER BY updated_at DESC 
LIMIT 100;

-- Grant permissions (adjust as needed)
GRANT ALL ON code_chunks TO service_role;
GRANT SELECT ON code_chunks TO anon;
GRANT SELECT ON code_chunks TO authenticated;

GRANT ALL ON recent_code_chunks TO service_role;
GRANT SELECT ON recent_code_chunks TO anon;
GRANT SELECT ON recent_code_chunks TO authenticated;

GRANT EXECUTE ON FUNCTION search_code_chunks TO service_role;
GRANT EXECUTE ON FUNCTION search_code_chunks_text TO service_role;

-- Sample data test (optional - uncomment to test)
-- INSERT INTO code_chunks (id, file_path, content, file_hash)
-- VALUES (
--   'test-1',
--   'test/sample.js',
--   'console.log("Hello World");',
--   'abc123'
-- );

-- Verify setup
SELECT 'Migration completed successfully!' as status,
       (SELECT COUNT(*) FROM code_chunks) as chunk_count;

-- Show table structure
