// Claude.ai Conversation Extractor
// Works on claude.ai

const ClaudeExtractor = {
  name: 'Claude',

  detect() {
    return window.location.hostname.includes('claude.ai');
  },

  extract() {
    const messages = [];

    // Claude.ai DOM structure:
    // - User messages: [data-testid="user-message"] with class font-user-message
    // - Assistant messages: div.standard-markdown containing p.font-claude-response-body
    // Both are inside the conversation scroll area

    const userMessages = document.querySelectorAll('[data-testid="user-message"]');
    const assistantMessages = document.querySelectorAll('.standard-markdown');

    // Collect all messages with their DOM elements for ordering
    const allTurns = [];

    for (const el of userMessages) {
      allTurns.push({ element: el, role: 'user' });
    }

    for (const el of assistantMessages) {
      // Only include standard-markdown blocks that contain Claude's response body
      // (avoid picking up other markdown blocks that aren't assistant messages)
      if (el.querySelector('.font-claude-response-body') || el.closest('[class*="response"]')) {
        allTurns.push({ element: el, role: 'assistant' });
      }
    }

    // If no assistant messages matched with the strict check, include all standard-markdown blocks
    const hasAssistant = allTurns.some(t => t.role === 'assistant');
    if (!hasAssistant && assistantMessages.length > 0) {
      for (const el of assistantMessages) {
        allTurns.push({ element: el, role: 'assistant' });
      }
    }

    // Sort by DOM position to maintain conversation order
    if (allTurns.length > 0) {
      allTurns.sort((a, b) => {
        const pos = a.element.compareDocumentPosition(b.element);
        return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });

      for (const turn of allTurns) {
        const content = this.extractContent(turn.element);
        if (content) {
          messages.push({ role: turn.role, content });
        }
      }
    }

    // Fallback: try broader selectors
    if (messages.length === 0) {
      const userEls = document.querySelectorAll('[class*="font-user-message"]');
      const assistantEls = document.querySelectorAll('[class*="font-claude-response"]');
      const fallbackTurns = [];

      for (const el of userEls) {
        fallbackTurns.push({ element: el, role: 'user' });
      }
      for (const el of assistantEls) {
        // Get the closest parent that wraps the full response
        const container = el.closest('.standard-markdown') || el.closest('[class*="markdown"]') || el;
        if (!fallbackTurns.some(t => t.element === container && t.role === 'assistant')) {
          fallbackTurns.push({ element: container, role: 'assistant' });
        }
      }

      if (fallbackTurns.length > 0) {
        fallbackTurns.sort((a, b) => {
          const pos = a.element.compareDocumentPosition(b.element);
          return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        });

        for (const turn of fallbackTurns) {
          const content = this.extractContent(turn.element);
          if (content) {
            messages.push({ role: turn.role, content });
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

    // Remove UI elements (buttons, action bars, toolbars, avatars, file thumbnails)
    clone.querySelectorAll(
      'button, [class*="action-bar"], [class*="toolbar"], [class*="copy"], [class*="avatar"], [data-testid="file-thumbnail"]'
    ).forEach(el => el.remove());

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
    // Check page title — Claude.ai sets it to the conversation title
    const pageTitle = document.title;
    if (pageTitle && !pageTitle.toLowerCase().includes('claude')) {
      return pageTitle;
    }

    // Try to get title from sidebar or header
    const titleEl = document.querySelector('[class*="conversation-title"], [class*="chat-title"], [class*="thread-title"]');
    if (titleEl) {
      return titleEl.textContent?.trim() || null;
    }

    return null;
  }
};

// Register extractor globally
window.ClaudeExtractor = ClaudeExtractor;
