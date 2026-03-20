// Google Gemini Conversation Extractor
// Works on gemini.google.com

const GeminiExtractor = {
  name: 'Gemini',

  detect() {
    return window.location.hostname.includes('gemini.google.com');
  },

  extract() {
    const messages = [];

    // Gemini structures conversations in turn containers
    // User queries and model responses alternate

    // Try multiple possible selectors for Gemini's UI
    const selectors = [
      // User messages
      { selector: '[data-message-author="user"], .user-query, [class*="query-text"]', role: 'user' },
      // Model responses
      { selector: '[data-message-author="model"], .model-response, [class*="response-text"]', role: 'assistant' }
    ];

    // Alternative: Look for conversation turns
    const conversationContainer = document.querySelector('.conversation-container, [class*="conversation"], main');

    if (conversationContainer) {
      // Try to find turn containers
      const turns = conversationContainer.querySelectorAll('[class*="turn"], [class*="message-pair"], .query-response-pair');

      if (turns.length > 0) {
        for (const turn of turns) {
          // Extract user query
          const userEl = turn.querySelector('[class*="query"], [class*="user"], [class*="prompt"]');
          if (userEl) {
            const content = this.extractContent(userEl);
            if (content) {
              messages.push({ role: 'user', content });
            }
          }

          // Extract model response
          const responseEl = turn.querySelector('[class*="response"], [class*="model"], [class*="answer"]');
          if (responseEl) {
            const content = this.extractContent(responseEl);
            if (content) {
              messages.push({ role: 'assistant', content });
            }
          }
        }
      }
    }

    // Fallback: Try to find messages by data attributes
    if (messages.length === 0) {
      const allMessages = document.querySelectorAll('[data-message-id]');

      for (const el of allMessages) {
        const isUser = el.getAttribute('data-message-author') === 'user' ||
                       el.closest('[class*="user"]') !== null;

        const content = this.extractContent(el);
        if (content) {
          messages.push({
            role: isUser ? 'user' : 'assistant',
            content
          });
        }
      }
    }

    // Another fallback: Look for specific Gemini class patterns
    if (messages.length === 0) {
      // User prompts are often in elements with "query" or "prompt" in the class
      const userMessages = document.querySelectorAll('[class*="query-content"], [class*="prompt-content"], .user-message');
      const assistantMessages = document.querySelectorAll('[class*="response-content"], [class*="model-content"], .model-response');

      // Interleave messages (assuming they're in order)
      const maxLen = Math.max(userMessages.length, assistantMessages.length);

      for (let i = 0; i < maxLen; i++) {
        if (i < userMessages.length) {
          const content = this.extractContent(userMessages[i]);
          if (content) {
            messages.push({ role: 'user', content });
          }
        }
        if (i < assistantMessages.length) {
          const content = this.extractContent(assistantMessages[i]);
          if (content) {
            messages.push({ role: 'assistant', content });
          }
        }
      }
    }

    return messages;
  },

  extractContent(element) {
    if (!element) return '';

    // Clone to avoid DOM modifications
    const clone = element.cloneNode(true);

    // Remove UI elements
    clone.querySelectorAll('button, [class*="action"], [class*="toolbar"], [class*="icon"]').forEach(el => el.remove());

    // Handle code blocks
    const codeBlocks = clone.querySelectorAll('pre, code-block, [class*="code-block"]');
    for (const block of codeBlocks) {
      const code = block.querySelector('code') || block;
      const lang = block.getAttribute('data-language') ||
                   code.className?.match(/language-(\w+)/)?.[1] || '';
      const codeText = code.textContent;
      block.textContent = `\n\`\`\`${lang}\n${codeText}\n\`\`\`\n`;
    }

    // Get clean text
    let text = clone.textContent || '';

    // Clean up excessive whitespace
    text = text.replace(/\n{3,}/g, '\n\n').trim();

    return text;
  },

  getTitle() {
    // Try to get conversation title from sidebar or header
    const titleEl = document.querySelector('[class*="conversation-title"], [class*="chat-title"], header h1');

    if (titleEl) {
      return titleEl.textContent?.trim() || null;
    }

    // Try page title
    const pageTitle = document.title;
    if (pageTitle && !pageTitle.toLowerCase().includes('gemini')) {
      return pageTitle;
    }

    return null;
  }
};

// Register extractor globally
window.GeminiExtractor = GeminiExtractor;
