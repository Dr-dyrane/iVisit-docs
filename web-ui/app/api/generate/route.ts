import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ─── GitHub repos to pull context from ────────────────────────
const GITHUB_REPOS = [
  { owner: 'Dr-dyrane', repo: 'ivisit', label: 'iVisit Core Platform' },
  { owner: 'Dr-dyrane', repo: 'ivisit-app', label: 'iVisit Mobile App' },
  { owner: 'Dr-dyrane', repo: 'ivisit-console', label: 'iVisit Admin Console' },
  { owner: 'Dr-dyrane', repo: 'ivisit-docs', label: 'iVisit Data Room / Docs' },
];

// ─── Document type prompts ────────────────────────────────────
const DOC_TYPE_PROMPTS: Record<string, string> = {
  business_proposal:
    'Generate a comprehensive business proposal for iVisit. Include executive summary, market opportunity, product overview (covering all platform components), competitive advantages, revenue model, and growth strategy.',
  privacy_policy:
    'Generate a thorough privacy policy for the iVisit platform. Cover data collection, storage, usage, sharing, user rights, cookies, third-party integrations, and compliance with NDPR (Nigeria Data Protection Regulation) and GDPR.',
  technical_spec:
    'Generate a detailed technical specification document for the iVisit platform. Cover system architecture (Unity Architecture), technology stack, database design, API design, security model, deployment strategy, and performance considerations.',
  legal_agreement:
    'Generate a terms of service / user agreement for the iVisit platform. Cover service description, user obligations, intellectual property, liability limitations, dispute resolution, and governing law (Nigerian law).',
  master_plan:
    'Generate a strategic master plan for iVisit. Cover the vision, phased rollout (0–6 months, 6–18 months, 18–36 months), key milestones, resource requirements, partnerships, and success metrics.',
  custom: '', // Uses customPrompt directly
};

/**
 * Fetch a README from a GitHub repo via the raw content URL.
 * Falls back gracefully if the repo or README doesn't exist.
 */
async function fetchReadme(owner: string, repo: string): Promise<string | null> {
  const urls = [
    `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`,
    `https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const text = await res.text();
        return text;
      }
    } catch {
      // Try next URL
    }
  }
  return null;
}

/**
 * Fetch all repo READMEs concurrently and build a context string,
 * respecting a character budget to stay within token limits.
 */
async function buildGitHubContext(charBudget: number): Promise<string> {
  const results = await Promise.all(
    GITHUB_REPOS.map(async ({ owner, repo, label }) => {
      const readme = await fetchReadme(owner, repo);
      return { label, repo, readme };
    })
  );

  let context = '';
  const perRepoBudget = Math.floor(charBudget / GITHUB_REPOS.length);

  for (const { label, repo, readme } of results) {
    if (readme) {
      const trimmed = readme.substring(0, perRepoBudget);
      context += `\n\n--- ${label} (${repo}) ---\n${trimmed}\n`;
    }
  }

  return context;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Support both admin tab format and legacy CLI format
    const docType = body.doc_type || 'custom';
    const customPrompt = body.custom_prompt || body.prompt || '';

    const basePrompt = DOC_TYPE_PROMPTS[docType] || '';
    const userPrompt = basePrompt
      ? `${basePrompt}\n\nAdditional instructions: ${customPrompt || 'None'}`
      : customPrompt;

    if (!userPrompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Fetch GitHub context — reserve ~20k chars (~5k tokens) for context
    const githubContext = await buildGitHubContext(20000);

    // Build the Claude message
    const systemPrompt = `You are a startup, business, and legal expert with deep technical knowledge of the iVisit platform.
Generate comprehensive, professional documents based on the provided codebase context and user requirements.

Your output must be valid JSON with this exact structure:
{
  "title": "Document Title",
  "content": "Full document content in Markdown format"
}

Guidelines:
- Create well-structured, professional documents
- Use proper Markdown formatting (headers, lists, tables, code blocks)
- Include relevant technical details from the provided context
- Ensure business-appropriate tone and clarity
- Focus on actionable insights and clear recommendations
- Reference actual iVisit features, architecture, and components from the context`;

    let userMessage = `USER REQUEST: ${userPrompt}\n\n`;

    if (githubContext) {
      userMessage += `IVISIT CODEBASE CONTEXT (from GitHub repositories):\n${githubContext}\n\n`;
    } else {
      userMessage += `No codebase context could be fetched. Generate based on general knowledge and the request.\n`;
    }

    const maxTokens = parseInt(process.env.MAX_TOKENS || '8000', 10);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: userMessage }],
        system: systemPrompt,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Claude API error:', response.status, errText);
      return NextResponse.json(
        { error: `Claude API error: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    let rawContent = data.content[0].text;

    // Clean up JSON code blocks if present
    const jsonBlockMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      rawContent = jsonBlockMatch[1];
    }

    // Parse the JSON response
    let document;
    try {
      document = JSON.parse(rawContent);
    } catch {
      // Fallback: use raw content as-is
      document = {
        title: docType === 'custom' ? 'Generated Document' : docType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        content: rawContent,
      };
    }

    return NextResponse.json({
      title: document.title,
      content: document.content,
    });
  } catch (error: any) {
    console.error('Generate error:', error);
    return NextResponse.json(
      { error: error.message || 'Generation failed' },
      { status: 500 }
    );
  }
}