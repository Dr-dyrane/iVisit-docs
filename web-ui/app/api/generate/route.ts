import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const { prompt, useSupabase } = await request.json();

  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Prompt is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Create a ReadableStream for Server-Sent Events or just raw streaming
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
      };

      send({ status: 'info', message: '🚀 Starting CLI Generator...' });

      const args = [path.join(process.cwd(), '..', 'index.js'), prompt];
      const env = { ...process.env };

      if (!useSupabase) {
        delete env.SUPABASE_URL;
        delete env.SUPABASE_SERVICE_ROLE_KEY;
      }

      const generatorProcess = spawn('node', args, {
        stdio: 'pipe',
        env: env,
      });

      let fullOutput = '';
      let errorOutput = '';

      generatorProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        fullOutput += chunk;
        // Send each line as a log
        const lines = chunk.split('\n');
        lines.forEach((line: string) => {
          if (line.trim()) {
            send({ status: 'log', message: line.trim() });
          }
        });
      });

      generatorProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        send({ status: 'error', message: chunk.trim() });
      });

      generatorProcess.on('close', (code) => {
        if (code === 0) {
          // Final document extraction
          const titleMatch = fullOutput.match(/✅ Generated: "(.+?)"/);
          let title = titleMatch ? titleMatch[1] : `Generated Document`;

          const mdPathMatch = fullOutput.match(/📄 Markdown saved: (.+)/);
          let content = fullOutput;

          if (mdPathMatch && mdPathMatch[1]) {
            try {
              let filePath = mdPathMatch[1].trim();
              if (!path.isAbsolute(filePath)) {
                filePath = path.join(process.cwd(), filePath);
              }
              if (fs.existsSync(filePath)) {
                let raw = fs.readFileSync(filePath, 'utf8');
                // Deep Clean: extract from JSON if needed
                const jsonMatch = raw.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
                  raw.match(/^\s*(\{[\s\S]*\})\s*$/);
                if (jsonMatch) {
                  try {
                    const parsed = JSON.parse(jsonMatch[1]);
                    if (parsed.content) raw = parsed.content;
                    if (parsed.title) title = parsed.title;
                  } catch (e) { }
                }
                content = raw;
              } else {
                // Try parent docs
                const parentPath = path.join(process.cwd(), '..', mdPathMatch[1].trim());
                if (fs.existsSync(parentPath)) {
                  let raw = fs.readFileSync(parentPath, 'utf8');
                  const jsonMatch = raw.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
                  if (jsonMatch) {
                    try {
                      const parsed = JSON.parse(jsonMatch[1]);
                      if (parsed.content) raw = parsed.content;
                    } catch (e) { }
                  }
                  content = raw;
                }
              }
            } catch (e) {
              send({ status: 'error', message: 'Failed to read file' });
            }
          }

          send({
            status: 'success',
            document: {
              title,
              content,
              timestamp: new Date().toISOString(),
              type: 'Generated'
            }
          });
          controller.close();
        } else {
          send({ status: 'failed', error: errorOutput || 'Process exited with error' });
          controller.close();
        }
      });

      // Handle process errors
      generatorProcess.on('error', (err) => {
        send({ status: 'failed', error: err.message });
        controller.close();
      });

      // Timeout safety (5 minutes)
      setTimeout(() => {
        if (generatorProcess.exitCode === null) {
          generatorProcess.kill();
          send({ status: 'failed', error: 'Generation timed out' });
          controller.close();
        }
      }, 300000);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}