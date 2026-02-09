import fetch from 'node-fetch';

/**
 * Claude Opus API integration for document generation
 */
class ClaudeAPI {
  constructor(apiKey, maxTokens = 8000) {
    this.apiKey = apiKey;
    this.maxTokens = maxTokens;
    this.baseUrl = 'https://api.anthropic.com/v1/messages';
  }

  /**
   * Generate document using Claude Opus API
   * @param {string} prompt - User prompt for document generation
   * @param {Array} chunks - Relevant code chunks to include
   * @returns {Promise<Object>} - Generated document with title and content
   */
  async generateDocument(prompt, chunks = []) {
    try {
      const systemPrompt = `You are a startup, business, and legal expert with deep technical knowledge. 
Generate comprehensive, professional documents based on the provided codebase context and user requirements.

Your output must be valid JSON with this exact structure:
{
  "title": "Document Title",
  "content": "Full document content in Markdown format"
}

Guidelines:
- Create well-structured, professional documents
- Use proper Markdown formatting (headers, lists, tables, code blocks)
- Include relevant technical details from the provided code chunks
- Ensure business-appropriate tone and clarity
- Focus on actionable insights and clear recommendations`;

      // Prepare user message with chunks
      let userMessage = `USER REQUEST: ${prompt}\n\n`;
      
      if (chunks.length > 0) {
        userMessage += `RELEVANT CODEBASE CONTEXT:\n\n`;
        chunks.forEach((chunk, index) => {
          userMessage += `--- Chunk ${index + 1} (${chunk.file_path}) ---\n`;
          userMessage += chunk.content.substring(0, 2000) + '\n\n'; // Limit chunk size for tokens
        });
      } else {
        userMessage += `No specific codebase context provided. Generate based on general knowledge and the request.`;
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-opus-4-6',
          max_tokens: this.maxTokens,
          messages: [
            {
              role: 'user',
              content: userMessage
            }
          ],
          system: systemPrompt
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.content[0].text;
      
      // Parse JSON response
      let document;
      try {
        document = JSON.parse(content);
      } catch (parseError) {
        // Fallback if JSON parsing fails
        document = {
          title: this.extractTitle(prompt),
          content: content
        };
      }

      return document;

    } catch (error) {
      console.error('Error generating document with Claude:', error.message);
      throw error;
    }
  }

  /**
   * Extract a meaningful title from the prompt
   * @param {string} prompt - User prompt
   * @returns {string} - Generated title
   */
  extractTitle(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('business proposal')) return 'Business Proposal';
    if (lowerPrompt.includes('privacy policy')) return 'Privacy Policy';
    if (lowerPrompt.includes('prd') || lowerPrompt.includes('product requirement')) return 'Product Requirements Document';
    if (lowerPrompt.includes('technical')) return 'Technical Documentation';
    if (lowerPrompt.includes('legal')) return 'Legal Document';
    if (lowerPrompt.includes('api')) return 'API Documentation';
    
    // Default title
    return 'Generated Document';
  }

  /**
   * Test API connection
   * @returns {Promise<boolean>} - True if connection successful
   */
  async testConnection() {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-opus-4-6',
          max_tokens: 10,
          messages: [
            {
              role: 'user',
              content: 'Test'
            }
          ]
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Claude API connection test failed:', error.message);
      return false;
    }
  }
}

export default ClaudeAPI;
