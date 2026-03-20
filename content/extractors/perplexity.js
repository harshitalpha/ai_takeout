// Perplexity AI Conversation Extractor
// Works on perplexity.ai

const PerplexityExtractor = {
  name: 'Perplexity',

  detect() {
    return window.location.hostname.includes('perplexity.ai');
  },

  extract() {
    const messages = [];
    const seenContent = new Set();

    // Helper to add message without duplicates
    const addMessage = (role, content) => {
      if (!content || content.length < 5) return false;
      const fingerprint = content.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 100);
      if (seenContent.has(fingerprint)) return false;
      seenContent.add(fingerprint);
      messages.push({ role, content });
      return true;
    };

    // Get the main container
    const mainContainer = document.querySelector('main');
    if (!mainContainer) {
      return messages;
    }

    // Get the first query from h1
    const h1 = mainContainer.querySelector('h1');
    if (h1) {
      const firstQuery = h1.textContent?.trim();
      if (firstQuery && firstQuery.length > 10 && !firstQuery.toLowerCase().includes('perplexity')) {
        addMessage('user', firstQuery);
      }
    }

    // Find all prose/answer sections (AI responses)
    const answerSections = mainContainer.querySelectorAll('[class*="prose"]');

    answerSections.forEach(el => {
      // Skip nested prose elements
      const parentProse = el.parentElement?.closest('[class*="prose"]');
      if (parentProse) return;

      const content = this.extractContent(el);
      if (content && content.length > 50) {
        addMessage('assistant', content);
      }
    });

    console.log('[AI Takeout] Perplexity extraction:', messages.length, 'messages');
    return messages;
  },

  extractContent(element) {
    if (!element) return '';

    const clone = element.cloneNode(true);

    // Remove UI elements
    clone.querySelectorAll('[class*="source"], [class*="citation"], [class*="reference"], [class*="footnote"]').forEach(el => el.remove());
    clone.querySelectorAll('button, [class*="action"], [class*="toolbar"], [class*="copy"], svg').forEach(el => el.remove());

    // Handle code blocks
    const codeBlocks = clone.querySelectorAll('pre');
    for (const block of codeBlocks) {
      const code = block.querySelector('code') || block;
      const lang = code.className?.match(/language-(\w+)/)?.[1] || '';
      const codeText = code.textContent;
      block.textContent = `\n\`\`\`${lang}\n${codeText}\n\`\`\`\n`;
    }

    // Handle inline code
    const inlineCodes = clone.querySelectorAll('code:not(pre code)');
    for (const code of inlineCodes) {
      code.textContent = `\`${code.textContent}\``;
    }

    let text = clone.textContent || '';
    text = text.replace(/\n{3,}/g, '\n\n').trim();

    return text;
  },

  getTitle() {
    const h1 = document.querySelector('main h1');
    if (h1) {
      const text = h1.textContent?.trim();
      if (text && text.length > 10 && !text.toLowerCase().includes('perplexity')) {
        return text;
      }
    }
    return null;
  }
};

window.PerplexityExtractor = PerplexityExtractor;
