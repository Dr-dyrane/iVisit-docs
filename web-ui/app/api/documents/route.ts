import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const docsDir = path.join(process.cwd(), 'docs');
        const parentDocsDir = path.join(process.cwd(), '..', 'docs');

        let allFiles: any[] = [];

        const scanDir = (dir: string) => {
            if (!fs.existsSync(dir)) return;
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                if (file.endsWith('.md')) {
                    const filePath = path.join(dir, file);
                    const stats = fs.statSync(filePath);
                    let rawContent = fs.readFileSync(filePath, 'utf8');
                    let content = rawContent;
                    let title = '';

                    // DEEP CLEAN: Check if the file is actually a JSON block
                    const jsonMatch = rawContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
                        rawContent.match(/^\s*(\{[\s\S]*\})\s*$/);

                    if (jsonMatch) {
                        try {
                            const parsed = JSON.parse(jsonMatch[1]);
                            if (parsed.content) content = parsed.content;
                            if (parsed.title) title = parsed.title;
                        } catch (e) {
                            // Not valid JSON, stick with raw
                        }
                    }

                    if (!title) {
                        // Try to extract title from Markdown
                        const titleMatch = content.match(/^# (.+)$/m);
                        title = titleMatch ? titleMatch[1] : file.replace('.md', '').replace(/_/g, ' ');
                    }

                    // Determine type from filename or content
                    let type = 'Document';
                    if (file.toLowerCase().includes('proposal')) type = 'Business Proposal';
                    else if (file.toLowerCase().includes('policy')) type = 'Privacy Policy';
                    else if (file.toLowerCase().includes('tech')) type = 'Technical Documentation';

                    allFiles.push({
                        id: file,
                        title,
                        type,
                        timestamp: stats.mtime.toISOString(),
                        content
                    });
                }
            });
        };

        scanDir(docsDir);
        scanDir(parentDocsDir);

        // Sort by most recent
        allFiles.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Deduplicate by title (prefer local)
        const seen = new Set();
        const finalFiles = allFiles.filter(file => {
            const duplicate = seen.has(file.title);
            seen.add(file.title);
            return !duplicate;
        });

        return NextResponse.json(finalFiles);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
