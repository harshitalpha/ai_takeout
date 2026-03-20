// Generic Fallback Conversation Extractor
// Attempts to extract conversations from unknown chat interfaces

const GenericExtractor = {
  name: 'AI Chat',

  detect() {
    // Always returns true as fallback
    return true;
  },

  extract() {
    const messages = [];

    // Strategy 1: Look for common chat patterns
    const strategies = [
      this.extractByRoleAttributes.bind(this),
      this.extractByClassPatterns.bind(this),
      this.extractByStructuralPatterns.bind(this),
      this.extractByTextPatterns.bind(this)
    ];

    for (const strategy of strategies) {
      const result = strategy();
      if (result.length >= 2) { // Need at least 2 messages for a conversation
        return result;
      }
    }

    // Return whatever we found
    return messages;
  },

  extractByRoleAttributes() {
    const messages = [];

    // Look for elements with role-related data attributes
    const roleElements = document.querySelectorAll('[data-role], [data-message-role], [data-author], [data-sender]');

    for (const el of roleElements) {
      const roleAttr = el.getAttribute('data-role') ||
                       el.getAttribute('data-message-role') ||
                       el.getAttribute('data-author') ||
                       el.getAttribute('data-sender') || '';

      const roleLower = roleAttr.toLowerCase();
      let role = null;

      if (roleLower.includes('user') || roleLower.includes('human')) {
        role = 'user';
      } else if (roleLower.includes('assistant') || roleLower.includes('bot') || roleLower.includes('ai')) {
        role = 'assistant';
      }

      if (role) {
        const content = this.cleanText(el.textContent);
        if (content) {
          messages.push({ role, content });
        }
      }
    }

    return messages;
  },

  extractByClassPatterns() {
    const messages = [];

    // Common class name patterns for chat messages
    const patterns = [
      { selector: '[class*="user-message"], [class*="human-message"], [class*="from-user"]', role: 'user' },
      { selector: '[class*="bot-message"], [class*="assistant-message"], [class*="ai-message"], [class*="from-assistant"]', role: 'assistant' },
      { selector: '[class*="user-turn"], [class*="human-turn"]', role: 'user' },
      { selector: '[class*="assistant-turn"], [class*="bot-turn"], [class*="ai-turn"]', role: 'assistant' }
    ];

    for (const pattern of patterns) {
      const elements = document.querySelectorAll(pattern.selector);
      for (const el of elements) {
        const content = this.cleanText(el.textContent);
        if (content) {
          messages.push({ role: pattern.role, content });
        }
      }
    }

    // Sort messages by DOM order
    if (messages.length > 0) {
      // This is a simplification - ideally we'd sort by actual DOM position
      return messages;
    }

    return [];
  },

  extractByStructuralPatterns() {
    const messages = [];

    // Look for alternating message blocks in a container
    const containers = document.querySelectorAll('[class*="chat"], [class*="conversation"], [class*="messages"], [class*="thread"], main');

    for (const container of containers) {
      // Find direct children that look like messages
      const children = container.querySelectorAll(':scope > div, :scope > article, :scope > section');

      if (children.length >= 2) {
        let lastRole = 'assistant'; // Start with assistant so first detected is user

        for (const child of children) {
          // Skip elements that are clearly not messages (too short, buttons, etc.)
          const text = this.cleanText(child.textContent);
          if (!text || text.length < 5) continue;

          // Check if this looks like a different role than the last
          const detectedRole = this.guessRole(child);

          if (detectedRole) {
            messages.push({ role: detectedRole, content: text });
            lastRole = detectedRole;
          } else {
            // Alternate roles if we can't detect
            const role = lastRole === 'user' ? 'assistant' : 'user';
            messages.push({ role, content: text });
            lastRole = role;
          }
        }
      }

      if (messages.length >= 2) break;
    }

    return messages;
  },

  extractByTextPatterns() {
    const messages = [];

    // Look for text that starts with role indicators
    const textBlocks = document.querySelectorAll('p, div, span');

    for (const block of textBlocks) {
      const text = block.textContent?.trim() || '';

      // Check for role prefix patterns
      const userPatterns = /^(User|Human|You|Me|Q):\s*/i;
      const assistantPatterns = /^(Assistant|AI|Bot|A|Claude|GPT|Gemini|Model):\s*/i;

      if (userPatterns.test(text)) {
        const content = text.replace(userPatterns, '').trim();
        if (content) {
          messages.push({ role: 'user', content });
        }
      } else if (assistantPatterns.test(text)) {
        const content = text.replace(assistantPatterns, '').trim();
        if (content) {
          messages.push({ role: 'assistant', content });
        }
      }
    }

    return messages;
  },

  guessRole(element) {
    const className = element.className?.toLowerCase() || '';
    const id = element.id?.toLowerCase() || '';
    const dataAttrs = Array.from(element.attributes)
      .filter(a => a.name.startsWith('data-'))
      .map(a => a.value.toLowerCase())
      .join(' ');

    const combined = `${className} ${id} ${dataAttrs}`;

    if (/user|human|you|query|question|prompt/.test(combined)) {
      return 'user';
    }

    if (/assistant|bot|ai|response|answer|reply|model/.test(combined)) {
      return 'assistant';
    }

    return null;
  },

  cleanText(text) {
    if (!text) return '';

    return text
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/\n{3,}/g, '\n\n')  // Limit consecutive newlines
      .trim();
  },

  getTitle() {
    // Try common title selectors
    const titleEl = document.querySelector('h1, [class*="title"], [class*="header"] h2');

    if (titleEl) {
      const title = titleEl.textContent?.trim();
      if (title && title.length < 100) {
        return title;
      }
    }

    // Fallback to page title
    return document.title || null;
  }
};

// Register extractor globally
window.GenericExtractor = GenericExtractor;
