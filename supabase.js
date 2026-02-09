import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * Supabase integration for storing and retrieving code chunks
 */
class SupabaseMemory {
  constructor(url, serviceRoleKey) {
    this.supabase = createClient(url, serviceRoleKey);
    this.tableName = 'code_chunks';
  }

  /**
   * Initialize the database table
   */
  async initializeTable() {
    try {
      // First, try to check if table exists by querying it
      const { error: checkError } = await this.supabase
        .from(this.tableName)
        .select('id')
        .limit(1);
      
      if (!checkError) {
        console.log('✅ Supabase table already exists');
        return;
      }
      
      // If table doesn't exist, show instructions
      if (checkError.code === 'PGRST116') {
        console.log('📝 Supabase table needs to be created manually');
        console.log('Please run this SQL in your Supabase SQL Editor:');
        console.log(`
-- Create the main table
CREATE TABLE IF NOT EXISTS code_chunks (
  id TEXT PRIMARY KEY,
  file_path TEXT NOT NULL,
  content TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_code_chunks_file_path ON code_chunks(file_path);
CREATE INDEX IF NOT EXISTS idx_code_chunks_file_hash ON code_chunks(file_hash);

-- Optional: Full-text search for better content searching
CREATE INDEX IF NOT EXISTS idx_code_chunks_content_search ON code_chunks 
USING gin(to_tsvector('english', content));
        `);
        
        console.log('\nAfter running the SQL, your Supabase memory will be ready!');
        console.log('You can test with: node init-supabase.js test');
        return;
      }
      
      console.log('✅ Supabase memory initialized');
      
    } catch (error) {
      console.error('Error initializing Supabase table:', error.message);
    }
  }

  /**
   * Store code chunks in Supabase
   * @param {Array} chunks - Array of code chunks with file_path and content
   * @returns {Promise<number>} - Number of chunks stored
   */
  async storeChunks(chunks) {
    try {
      const timestamp = new Date().toISOString();
      const records = chunks.map(chunk => ({
        id: crypto.createHash('md5').update(chunk.file_path + chunk.content).digest('hex'),
        file_path: chunk.file_path,
        content: chunk.content,
        file_hash: crypto.createHash('md5').update(chunk.content).digest('hex'),
        created_at: timestamp,
        updated_at: timestamp
      }));

      // Use upsert to handle duplicates
      const { data, error } = await this.supabase
        .from(this.tableName)
        .upsert(records, { onConflict: 'id' })
        .select();

      if (error) {
        throw error;
      }

      console.log(`Stored ${records.length} chunks in Supabase`);
      return records.length;

    } catch (error) {
      console.error('Error storing chunks in Supabase:', error.message);
      throw error;
    }
  }

  /**
   * Retrieve relevant chunks based on keywords
   * @param {string} prompt - User prompt to search for
   * @param {number} limit - Maximum number of chunks to return
   * @returns {Promise<Array>} - Array of relevant chunks
   */
  async getRelevantChunks(prompt, limit = 10) {
    try {
      // Extract keywords from prompt
      const keywords = this.extractKeywords(prompt);
      
      // Try using the search function first
      if (keywords.length > 0) {
        const searchQuery = keywords.join(' OR ');
        
        const { data, error } = await this.supabase
          .rpc('search_code_chunks_text', {
            search_query: searchQuery,
            max_results: limit
          });

        if (!error && data) {
          console.log(`✅ Found ${data.length} relevant chunks using search function`);
          return data;
        }
      }

      // Fallback to text search with OR conditions
      let query = this.supabase
        .from(this.tableName)
        .select('*')
        .limit(limit);

      if (keywords.length > 0) {
        const searchConditions = keywords.map(keyword => 
          `file_path.ilike.%${keyword}%,content.ilike.%${keyword}%`
        ).join(' OR ');

        query = query.or(searchConditions);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      console.log(`✅ Found ${data.length} relevant chunks using fallback search`);
      return data || [];

    } catch (error) {
      console.error('Error retrieving chunks from Supabase:', error.message);
      return [];
    }
  }

  /**
   * Get all chunks (fallback when no specific search)
   * @param {number} limit - Maximum number of chunks to return
   * @returns {Promise<Array>} - Array of chunks
   */
  async getAllChunks(limit = 50) {
    try {
      // Try using the recent_chunks view first
      const { data: viewData, error: viewError } = await this.supabase
        .from('recent_code_chunks')
        .select('*')
        .limit(limit);

      if (!viewError && viewData) {
        console.log(`✅ Found ${viewData.length} recent chunks using view`);
        return viewData;
      }

      // Fallback to direct table query
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .limit(limit)
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log(`✅ Found ${data.length} chunks using direct query`);
      return data || [];

    } catch (error) {
      console.error('Error retrieving all chunks from Supabase:', error.message);
      return [];
    }
  }

  /**
   * Check if a file has changed by comparing hashes
   * @param {string} filePath - Path to the file
   * @param {string} content - Current file content
   * @returns {Promise<boolean>} - True if file has changed
   */
  async hasFileChanged(filePath, content) {
    try {
      const currentHash = crypto.createHash('md5').update(content).digest('hex');
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('file_hash')
        .eq('file_path', filePath)
        .single();

      if (error || !data) {
        return true; // File doesn't exist, treat as changed
      }

      return data.file_hash !== currentHash;

    } catch (error) {
      console.error('Error checking file changes:', error.message);
      return true; // Assume changed on error
    }
  }

  /**
   * Delete chunks for a specific file
   * @param {string} filePath - Path to the file
   * @returns {Promise<boolean>} - True if successful
   */
  async deleteFileChunks(filePath) {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('file_path', filePath);

      if (error) {
        throw error;
      }

      return true;

    } catch (error) {
      console.error('Error deleting file chunks:', error.message);
      return false;
    }
  }

  /**
   * Extract keywords from a prompt for better search
   * @param {string} prompt - User prompt
   * @returns {Array} - Array of keywords
   */
  extractKeywords(prompt) {
    // Common technical and business terms to look for
    const technicalTerms = [
      'api', 'backend', 'frontend', 'database', 'auth', 'user', 'patient',
      'ambulance', 'hospital', 'dispatch', 'emergency', 'medical', 'health',
      'react', 'node', 'javascript', 'typescript', 'component', 'service',
      'controller', 'model', 'schema', 'migration', 'test', 'config',
      'deployment', 'security', 'privacy', 'legal', 'business', 'revenue',
      'subscription', 'payment', 'integration', 'workflow', 'algorithm'
    ];

    const words = prompt.toLowerCase().split(/\s+/);
    const keywords = words.filter(word => 
      word.length > 3 && 
      (technicalTerms.includes(word) || 
       words.includes(word) || 
       prompt.toLowerCase().includes(word))
    );

    // Remove duplicates and return
    return [...new Set(keywords)];
  }

  /**
   * Test Supabase connection
   * @returns {Promise<boolean>} - True if connection successful
   */
  async testConnection() {
    try {
      // Try to access the table - if it doesn't exist, that's still a successful connection
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('count')
        .limit(1);

      // If error is just "table not found", connection is still good
      if (error && error.code === 'PGRST116') {
        console.log('📝 Table not found, but connection is working');
        return true;
      }

      return !error;
    } catch (error) {
      console.error('Supabase connection test failed:', error.message);
      return false;
    }
  }
}

export default SupabaseMemory;
