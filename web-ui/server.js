import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.WEB_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Main generation endpoint - connects to existing backend
app.post('/generate', async (req, res) => {
    try {
        const { prompt, useSupabase } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ 
                success: false, 
                error: 'Prompt is required' 
            });
        }

        console.log(`🚀 Web UI Request: ${prompt.substring(0, 50)}...`);
        
        // Call the main CLI generator
        const generatorProcess = spawn('node', [path.join(path.dirname(__dirname), '..', 'index.js'), `"${prompt}"`], {
            cwd: path.dirname(__dirname),
            stdio: 'pipe'
        });
        
        let output = '';
        let errorOutput = '';
        
        generatorProcess.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        generatorProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        
        generatorProcess.on('close', (code) => {
            if (code === 0) {
                // Parse the generated document from CLI output
                const docMatch = output.match(/📄 (DOCX|Markdown) saved: (.+)/);
                const titleMatch = output.match(/✅ Generated: "(.+)"/);
                
                if (titleMatch && docMatch) {
                    const document = {
                        title: titleMatch[1],
                        content: output, // Use the full CLI output
                        timestamp: new Date().toISOString()
                    };
                    
                    console.log(`✅ Generated: ${document.title}`);
                    res.json({ success: true, document });
                } else {
                    res.status(500).json({ 
                        success: false, 
                        error: 'Failed to parse document from CLI output' 
                    });
                }
            } else {
                res.status(500).json({ 
                    success: false, 
                    error: errorOutput || 'Generation failed' 
                });
            }
        });
        
    } catch (error) {
        console.error('❌ Web UI error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Serve generated documents
app.use('/docs', express.static(path.join(__dirname, '../docs')));

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🌐 iVisit Document Generator Web UI`);
    console.log(`📡 Server running at http://localhost:${PORT}`);
    console.log(`⌨️  Press Ctrl+C to stop`);
    console.log(`🎯 Open http://localhost:${PORT} to start generating documents`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});
