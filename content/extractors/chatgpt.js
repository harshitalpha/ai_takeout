// ChatGPT Conversation Extractor
// Works on chat.openai.com and chatgpt.com

const ChatGPTExtractor = {
  name: 'ChatGPT',

  detect() {
    const hostname = window.location.hostname;
    return hostname.includes('chat.openai.com') || hostname.includes('chatgpt.com');
  },

  extract() {
    const messages = [];

    // ChatGPT uses data-message-author-role attribute on message containers
    const messageElements = document.querySelectorAll('[data-message-author-role]');

    for (const el of messageElements) {
      const role = el.getAttribute('data-message-author-role');

      // Skip system messages
      if (role === 'system') continue;

      // Find the text content - it's usually in a div with markdown content
      const contentEl = el.querySelector('.markdown') ||
                        el.querySelector('[class*="prose"]') ||
                        el;

      let content = '';

      // Handle code blocks specially
      const codeBlocks = contentEl.querySelectorAll('pre code');
      if (codeBlocks.length > 0) {
        // Build content with proper code block formatting
        const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
        let node;
        let inCodeBlock = false;

        while ((node = walker.nextNode())) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'PRE') {
              inCodeBlock = true;
              const code = node.querySelector('code');
              const lang = code?.className?.match(/language-(\w+)/)?.[1] || '';
              content += `\n\`\`\`${lang}\n`;
            } else if (node.tagName === 'CODE' && !inCodeBlock) {
              // Inline code - handled in text node
            }
          } else if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            if (text.trim()) {
              content += text;
            }
          }

          // Check if we're exiting a code block
          if (inCodeBlock && node.nodeType === Node.ELEMENT_NODE && node.tagName === 'PRE') {
            content += '\n```\n';
            inCodeBlock = false;
          }
        }
      } else {
        // Simple text extraction
        content = this.extractTextContent(contentEl);
      }

      if (content.trim()) {
        messages.push({
          role: role === 'user' ? 'user' : 'assistant',
          content: content.trim()
        });
      }
    }

    // Fallback: Try alternative selectors if no messages found
    if (messages.length === 0) {
      return this.extractFallback();
    }

    return messages;
  },

  extractTextContent(element) {
    // Clone to avoid modifying the DOM
    const clone = element.cloneNode(true);

    // Remove copy buttons and other UI elements
    clone.querySelectorAll('button, [class*="copy"]').forEach(el => el.remove());

    // Get text with basic formatting preservation
    let text = '';
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();

        // Add spacing for block elements
        if (['p', 'div', 'br', 'li'].includes(tag)) {
          if (text && !text.endsWith('\n')) {
            text += '\n';
          }
        }

        // Handle list items
        if (tag === 'li') {
          text += '- ';
        }

        // Handle code blocks
        if (tag === 'pre') {
          const code = node.querySelector('code');
          const lang = code?.className?.match(/language-(\w+)/)?.[1] || '';
          text += `\n\`\`\`${lang}\n${code?.textContent || node.textContent}\n\`\`\`\n`;
          return; // Skip children
        }

        // Handle inline code
        if (tag === 'code' && node.parentElement?.tagName !== 'PRE') {
          text += `\`${node.textContent}\``;
          return;
        }

        for (const child of node.childNodes) {
          walk(child);
        }

        if (['p', 'div'].includes(tag)) {
          text += '\n';
        }
      }
    };

    walk(clone);
    return text.replace(/\n{3,}/g, '\n\n').trim();
  },

  extractFallback() {
    const messages = [];

    // Try to find conversation turns by looking for common patterns
    const turns = document.querySelectorAll('[class*="conversation-turn"], [class*="message"], [class*="chat-message"]');

    for (const turn of turns) {
      // Try to determine role from class names or content
      const className = turn.className.toLowerCase();
      const isUser = className.includes('user') || className.includes('human');
      const isAssistant = className.includes('assistant') || className.includes('bot') || className.includes('gpt');

      if (!isUser && !isAssistant) continue;

      const content = turn.textContent?.trim();
      if (content) {
        messages.push({
          role: isUser ? 'user' : 'assistant',
          content
        });
      }
    }

    return messages;
  },

  getTitle() {
    // Try to get title from the sidebar active conversation
    const activeConvo = document.querySelector('[class*="active"] [class*="title"]') ||
                        document.querySelector('nav [class*="selected"]');

    if (activeConvo) {
      return activeConvo.textContent?.trim() || null;
    }

    // Fallback: try to get from page title
    const pageTitle = document.title;
    if (pageTitle && !pageTitle.includes('ChatGPT')) {
      return pageTitle;
    }

    return null;
  }
};

// Register extractor globally
window.ChatGPTExtractor = ChatGPTExtractor;
