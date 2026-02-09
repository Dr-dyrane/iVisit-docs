import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import ClaudeAPI from './claude.js';
import SupabaseMemory from './supabase.js';
import EnhancedDocxGenerator from './enhanced-docx.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  outputDir: process.env.OUTPUT_DIR || 'docs',
  maxTokens: parseInt(process.env.MAX_TOKENS) || 8000,
  chunkSize: 1500, // Lines per chunk
  excludeDirs: [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '.next',
    '.nuxt',
    'target',
    'bin',
    'obj'
  ],
  excludeFiles: [
    '.log',
    '.tmp',
    '.cache',
    '.DS_Store',
    'package-lock.json',
    'yarn.lock'
  ],
  siblingProjects: [
    '../ivisit-app',
    '../ivisit',
    '../ivisit-console'
  ]
};

/**
 * Main CLI application
 */
class iVisitDocGenerator {
  constructor() {
    this.claude = new ClaudeAPI(process.env.ANTHROPIC_API_KEY, CONFIG.maxTokens);
    this.supabase = null;

    // Initialize Supabase if credentials are provided
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = new SupabaseMemory(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    }
  }

  /**
   * Main entry point
   */
  async run(prompt) {
    try {
      console.log('🚀 iVisit Document Generator');
      console.log('=============================\n');

      // Validate API key
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is required in .env file');
      }

      // Test Claude connection
      console.log('🔍 Testing Claude API connection...');
      const claudeConnected = await this.claude.testConnection();
      if (!claudeConnected) {
        throw new Error('Failed to connect to Claude API');
      }
      console.log('✅ Claude API connected\n');

      // Test Supabase connection if available
      if (this.supabase) {
        console.log('🔍 Testing Supabase connection...');
        const supabaseConnected = await this.supabase.testConnection();
        if (supabaseConnected) {
          console.log('✅ Supabase connected\n');
        } else {
          console.log('⚠️  Supabase connection failed, continuing without memory\n');
          this.supabase = null;
        }
      }

      // Handle special commands
      if (prompt.toLowerCase().includes('index') || prompt.toLowerCase().includes('memory')) {
        await this.indexFiles();
        return;
      }

      // Get relevant chunks
      console.log('📚 Gathering relevant codebase context...');
      const chunks = await this.getRelevantChunks(prompt);
      console.log(`✅ Found ${chunks.length} relevant chunks\n`);

      // Generate document
      console.log('✍️  Generating document with Claude...');
      const document = await this.claude.generateDocument(prompt, chunks);
      console.log(`✅ Generated: "${document.title}"\n`);

      // Save document
      await this.saveDocument(document);

      console.log('🎉 Document generation complete!');

    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }

  /**
   * Index all files into Supabase memory
   */
  async indexFiles() {
    if (!this.supabase) {
      console.log('❌ Supabase not configured. Cannot index files.');
      return;
    }

    console.log('📁 Indexing all iVisit projects into Supabase memory...');

    // Initialize Supabase table
    await this.supabase.initializeTable();

    let totalChunks = 0;

    for (const projectPath of CONFIG.siblingProjects) {
      const fullPath = path.resolve(__dirname, projectPath);

      if (!await fs.pathExists(fullPath)) {
        console.log(`⚠️  Project not found: ${projectPath}`);
        continue;
      }

      console.log(`📖 Reading: ${projectPath}`);
      const chunks = await this.readProjectFiles(fullPath);

      if (chunks.length > 0) {
        const stored = await this.supabase.storeChunks(chunks);
        totalChunks += stored;
      }
    }

    console.log(`✅ Indexed ${totalChunks} total chunks into Supabase memory`);
  }

  /**
   * Get relevant chunks for a prompt
   */
  async getRelevantChunks(prompt) {
    if (this.supabase) {
      // Try to get relevant chunks from Supabase
      const relevantChunks = await this.supabase.getRelevantChunks(prompt, 20);

      if (relevantChunks.length > 0) {
        return relevantChunks;
      }

      // Fallback to recent chunks
      console.log('📋 No specific matches found, using recent chunks...');
      return await this.supabase.getAllChunks(15);
    }

    // If no Supabase, read files directly
    console.log('📋 Reading files directly (no Supabase memory)...');
    const allChunks = [];

    for (const projectPath of CONFIG.siblingProjects) {
      const fullPath = path.resolve(__dirname, projectPath);

      if (await fs.pathExists(fullPath)) {
        const chunks = await this.readProjectFiles(fullPath);
        allChunks.push(...chunks.slice(0, 5)); // Limit per project
      }
    }

    return allChunks.slice(0, 20); // Total limit
  }

  /**
   * Read all files from a project and chunk them
   */
  async readProjectFiles(projectPath) {
    const chunks = [];
    const files = await this.getAllFiles(projectPath);

    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const relativePath = path.relative(projectPath, filePath);

        // Skip if file hasn't changed (when using Supabase)
        if (this.supabase) {
          const hasChanged = await this.supabase.hasFileChanged(relativePath, content);
          if (!hasChanged) {
            continue;
          }
        }

        // Chunk large files
        const lines = content.split('\n');
        if (lines.length > CONFIG.chunkSize) {
          for (let i = 0; i < lines.length; i += CONFIG.chunkSize) {
            const chunkLines = lines.slice(i, i + CONFIG.chunkSize);
            chunks.push({
              file_path: relativePath,
              content: chunkLines.join('\n')
            });
          }
        } else {
          chunks.push({
            file_path: relativePath,
            content: content
          });
        }
      } catch (error) {
        console.warn(`⚠️  Could not read ${filePath}: ${error.message}`);
      }
    }

    return chunks;
  }

  /**
   * Recursively get all files from a directory
   */
  async getAllFiles(dirPath) {
    const files = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Skip excluded directories
          if (CONFIG.excludeDirs.includes(entry.name)) {
            continue;
          }

          // Recursively read subdirectories
          const subFiles = await this.getAllFiles(fullPath);
          files.push(...subFiles);
        } else {
          // Skip excluded files
          const shouldExclude = CONFIG.excludeFiles.some(ext =>
            entry.name.endsWith(ext)
          );

          if (!shouldExclude) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not read directory ${dirPath}: ${error.message}`);
    }

    return files;
  }

  /**
 * Save document to file
 */
  async saveDocument(document) {
    // Ensure output directory exists
    await fs.ensureDir(CONFIG.outputDir);

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = document.title.replace(/[^a-zA-Z0-9]/g, '_');

    // Save as Markdown
    const mdPath = path.join(CONFIG.outputDir, `${baseName}_${timestamp}.md`);

    // If the document content is still JSON-encoded (Claude fallback), try to parse it
    let finalContent = document.content;
    try {
      // Check if content is a JSON-like string
      if (typeof finalContent === 'string' && finalContent.trim().startsWith('{')) {
        const parsed = JSON.parse(finalContent);
        if (parsed.content) finalContent = parsed.content;
      }
    } catch (e) {
      // Not JSON or already clean
    }

    await fs.writeFile(mdPath, finalContent, 'utf8');
    console.log(`📄 Markdown saved: ${mdPath}`);

    // Save as enhanced DOCX
    const docxPath = path.join(CONFIG.outputDir, `${baseName}_${timestamp}.docx`);
    const docxGenerator = new EnhancedDocxGenerator();
    const docxBuffer = await docxGenerator.generateDocx(document.content, document.title);
    await fs.writeFile(docxPath, docxBuffer);
    console.log(`📄 Enhanced DOCX saved: ${docxPath}`);
  }
}

// CLI execution
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  const prompt = process.argv[2];

  if (!prompt) {
    console.log('Usage: node index.js "Your prompt here"');
    console.log('');
    console.log('Examples:');
    console.log('  node index.js "Generate a business proposal"');
    console.log('  node index.js "Generate privacy policy"');
    console.log('  node index.js "Generate PRD for backend APIs"');
    console.log('  node index.js "Index all files into Supabase"');
    process.exit(1);
  }

  const generator = new iVisitDocGenerator();
  generator.run(prompt);
}

export default iVisitDocGenerator;
