import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { prompt, useSupabase } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log(`🚀 Next.js API Request: ${prompt.substring(0, 50)}...`);
    console.log(`📡 Using Supabase Memory: ${useSupabase}`);

    // Call the main CLI generator
    // We assume index.js is in the parent directory.
    // However, if we want to be more self-contained or robust, we should ensure the path is correct.
    // The user mentioned "because we are not going ../", implying we might need to run things differently
    // or that the environment variables need to be present in the current directory (which we just fixed).
    
    // BUT, the CLI script `index.js` IS still in the parent directory (`../index.js`).
    // If we want to run it, we must reference it there.
    // Unless the user wants to MOVE the CLI logic into the Next.js app?
    // The user said "move env file here if you ahve to and otehr things".
    // This suggests we should try to make the Web UI more independent or at least have its own config.
    
    // For now, we will keep calling `../index.js` but ensure we pass the correct ENV variables
    // that we just copied into the `web-ui` folder.
    
    const args = [path.join(process.cwd(), '..', 'index.js'), prompt];
    
    const env = { ...process.env };
    
    // Ensure we have the API keys from our local .env (Next.js loads them automatically into process.env)
    if (!env.ANTHROPIC_API_KEY) {
        console.warn("⚠️ ANTHROPIC_API_KEY is missing in Next.js process.env");
    }

    if (!useSupabase) {
        delete env.SUPABASE_URL;
        delete env.SUPABASE_SERVICE_ROLE_KEY;
    }

    const generatorProcess = spawn('node', args, {
      stdio: 'pipe',
      env: env
    });

    const output = await new Promise((resolve, reject) => {
      let output = '';
      let errorOutput = '';

      generatorProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        console.log(`[CLI stdout]: ${chunk.trim()}`);
      });

      generatorProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        console.error(`[CLI stderr]: ${chunk.trim()}`);
      });

      generatorProcess.on('close', (code) => {
        console.log(`[CLI] Process exited with code ${code}`);
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(errorOutput || `Process exited with code ${code}`));
        }
      });
    });

    // Attempt to extract title from logs
    const titleMatch = output.match(/✅ Generated: "(.+?)"/);
    const title = titleMatch ? titleMatch[1] : `Generated Document - ${new Date().toLocaleDateString()}`;

    // Attempt to extract file path
    const mdPathMatch = output.match(/📄 Markdown saved: (.+)/);
    
    let content = output; 
    if (mdPathMatch && mdPathMatch[1]) {
        try {
            const fs = require('fs');
            // The path returned by CLI might be relative to the CLI's CWD (parent dir)
            // or absolute. Let's handle both.
            let filePath = mdPathMatch[1].trim();
            
            if (!path.isAbsolute(filePath)) {
                // If relative, it's relative to the parent directory where index.js ran
                filePath = path.join(process.cwd(), '..', filePath);
            }
            
            if (fs.existsSync(filePath)) {
                content = fs.readFileSync(filePath, 'utf8');
            }
        } catch (e) {
            console.error('Failed to read generated file:', e);
        }
    }

    const document = {
      title: title,
      content: content,
      logs: output,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({ success: true, document });
  } catch (error: any) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
