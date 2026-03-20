// Claude.ai Conversation Extractor
// Works on claude.ai

const ClaudeExtractor = {
  name: 'Claude',

  detect() {
    return window.location.hostname.includes('claude.ai');
  },

  extract() {
    const messages = [];

    // Claude.ai structures conversations with human and assistant turns
    // Look for message containers with role indicators

    // Primary selector: Look for message containers
    const messageContainers = document.querySelectorAll('[data-testid*="message"], [class*="message-content"], [class*="conversation-turn"]');

    if (messageContainers.length > 0) {
      for (const container of messageContainers) {
        const role = this.detectRole(container);
        if (!role) continue;

        const content = this.extractContent(container);
        if (content) {
          messages.push({ role, content });
        }
      }
    }

    // Fallback: Try to find human/assistant blocks
    if (messages.length === 0) {
      // Look for the conversation thread
      const thread = document.querySelector('[class*="thread"], [class*="conversation"], main');

      if (thread) {
        // Find alternating human/assistant blocks
        const blocks = thread.querySelectorAll('[class*="human"], [class*="assistant"], [class*="user"], [class*="claude"]');

        for (const block of blocks) {
          const className = block.className.toLowerCase();
          const role = (className.includes('human') || className.includes('user')) ? 'user' : 'assistant';

          const content = this.extractContent(block);
          if (content) {
            messages.push({ role, content });
          }
        }
      }
    }

    // Another fallback: Look for prose content with role detection
    if (messages.length === 0) {
      const proseBlocks = document.querySelectorAll('[class*="prose"], .markdown-content');

      for (const block of proseBlocks) {
        // Try to determine role from parent or sibling elements
        const parent = block.closest('[class*="message"], [class*="turn"]');
        const role = this.detectRole(parent || block);

        if (role) {
          const content = this.extractContent(block);
          if (content) {
            messages.push({ role, content });
          }
        }
      }
    }

    return messages;
  },

  detectRole(element) {
    if (!element) return null;

    // Check data attributes
    const testId = element.getAttribute('data-testid') || '';
    if (testId.includes('human') || testId.includes('user')) return 'user';
    if (testId.includes('assistant') || testId.includes('claude')) return 'assistant';

    // Check class names
    const className = element.className?.toLowerCase() || '';
    if (className.includes('human') || className.includes('user')) return 'user';
    if (className.includes('assistant') || className.includes('claude') || className.includes('ai')) return 'assistant';

    // Check for role indicators in the content
    const text = element.textContent?.slice(0, 100).toLowerCase() || '';
    if (text.startsWith('you:') || text.includes('human:')) return 'user';
    if (text.startsWith('claude:') || text.includes('assistant:')) return 'assistant';

    // Check parent elements
    const parent = element.parentElement;
    if (parent && parent !== document.body) {
      return this.detectRole(parent);
    }

    return null;
  },

  extractContent(element) {
    if (!element) return '';

    // Clone to avoid DOM modifications
    const clone = element.cloneNode(true);

    // Remove UI elements
    clone.querySelectorAll('button, [class*="action"], [class*="toolbar"], [class*="copy"], [class*="avatar"]').forEach(el => el.remove());

    // Remove role labels if present
    clone.querySelectorAll('[class*="role-label"], [class*="sender"]').forEach(el => el.remove());

    // Handle code blocks
    const codeBlocks = clone.querySelectorAll('pre');
    for (const block of codeBlocks) {
      const code = block.querySelector('code') || block;
      const lang = code.className?.match(/language-(\w+)/)?.[1] ||
                   block.getAttribute('data-language') || '';
      const codeText = code.textContent;
      block.textContent = `\n\`\`\`${lang}\n${codeText}\n\`\`\`\n`;
    }

    // Handle inline code
    const inlineCodes = clone.querySelectorAll('code:not(pre code)');
    for (const code of inlineCodes) {
      code.textContent = `\`${code.textContent}\``;
    }

    // Handle lists
    const orderedLists = clone.querySelectorAll('ol');
    for (const ol of orderedLists) {
      const items = ol.querySelectorAll('li');
      items.forEach((li, i) => {
        li.textContent = `${i + 1}. ${li.textContent}\n`;
      });
    }

    const unorderedLists = clone.querySelectorAll('ul');
    for (const ul of unorderedLists) {
      const items = ul.querySelectorAll('li');
      items.forEach(li => {
        li.textContent = `- ${li.textContent}\n`;
      });
    }

    // Get clean text
    let text = clone.textContent || '';

    // Remove role prefixes
    text = text.replace(/^(Human|User|Claude|Assistant):\s*/i, '');

    // Clean up whitespace
    text = text.replace(/\n{3,}/g, '\n\n').trim();

    return text;
  },

  getTitle() {
    // Try to get title from sidebar or header
    const titleEl = document.querySelector('[class*="conversation-title"], [class*="chat-title"], [class*="thread-title"]');

    if (titleEl) {
      return titleEl.textContent?.trim() || null;
    }

    // Check page title
    const pageTitle = document.title;
    if (pageTitle && !pageTitle.toLowerCase().includes('claude')) {
      return pageTitle;
    }

    return null;
  }
};

// Register extractor globally
window.ClaudeExtractor = ClaudeExtractor;
