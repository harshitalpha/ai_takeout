// Popup controller for AI Conversation Exporter

class PopupController {
  constructor() {
    this.conversationData = null;
    this.exportMode = 'all';        // 'all' | 'questions' | 'select'
    this.selectedIndices = new Set(); // For 'select' mode
    this.aiSummaryCache = null;     // Cache for AI-generated summary
    this.initElements();
    this.attachEventListeners();
    this.loadConversation();
  }

  initElements() {
    this.loadingEl = document.getElementById('loading');
    this.errorEl = document.getElementById('error');
    this.errorMessageEl = document.getElementById('error-message');
    this.contentEl = document.getElementById('content');
    this.sourceEl = document.getElementById('source');
    this.messageCountEl = document.getElementById('message-count');
    this.formatSelect = document.getElementById('format');
    this.copyBtn = document.getElementById('copy-btn');
    this.downloadBtn = document.getElementById('download-btn');
    this.previewEl = document.getElementById('preview');
    this.toastEl = document.getElementById('toast');
    this.toastMessageEl = document.getElementById('toast-message');
  }

  attachEventListeners() {
    this.copyBtn.addEventListener('click', () => this.copyToClipboard());
    this.downloadBtn.addEventListener('click', () => this.downloadFile());

    // Export mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.setExportMode(e.target.dataset.mode));
    });

    // Select all/none buttons
    document.getElementById('select-all-btn')?.addEventListener('click', () => this.selectAllMessages());
    document.getElementById('select-none-btn')?.addEventListener('click', () => this.selectNoMessages());

    // Format change handler (for hidden select - backwards compatibility)
    this.formatSelect.addEventListener('change', () => this.handleFormatChange());

    // Format button clicks
    document.querySelectorAll('.format-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.setFormat(e.currentTarget.dataset.format));
    });

    // API Key modal handlers
    document.getElementById('save-api-key-btn')?.addEventListener('click', () => this.saveApiKey());
    document.getElementById('cancel-api-key-btn')?.addEventListener('click', () => this.hideApiKeyModal());
    document.getElementById('toggle-key-visibility')?.addEventListener('click', () => this.toggleKeyVisibility());
    document.getElementById('manage-api-key')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showApiKeyModal(true); // true = manage mode
    });

    // Theme toggle
    document.getElementById('theme-toggle')?.addEventListener('click', () => this.toggleTheme());
    this.loadTheme();
  }

  loadTheme() {
    chrome.storage.local.get(['darkMode'], (result) => {
      if (result.darkMode) {
        document.body.classList.add('dark-mode');
      }
    });
  }

  toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    chrome.storage.local.set({ darkMode: isDark });
  }

  async setFormat(format) {
    // Update hidden select
    this.formatSelect.value = format;

    // Update button states
    document.querySelectorAll('.format-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.format === format);
    });

    // Trigger format change handling
    await this.handleFormatChange();
  }

  async handleFormatChange() {
    const format = this.formatSelect.value;

    if (format === 'ai-summary') {
      // Check if API key is configured
      const hasKey = await this.hasApiKey();
      if (!hasKey) {
        this.showApiKeyModal();
        this.formatSelect.value = 'standard';
        // Reset button state
        document.querySelectorAll('.format-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.format === 'standard');
        });
        return;
      }
      // Don't generate yet - wait for user to click Copy or Download
    }

    this.updateButtonLabels();
    this.updatePreview();
  }

  updateButtonLabels() {
    const format = this.formatSelect.value;
    const needsGeneration = format === 'ai-summary' && !this.aiSummaryCache;

    if (needsGeneration) {
      this.copyBtn.innerHTML = `
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5,3 19,12 5,21 5,3"></polygon>
        </svg>
        Generate & Copy
      `;
      this.downloadBtn.innerHTML = `
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5,3 19,12 5,21 5,3"></polygon>
        </svg>
        Generate & Download
      `;
    } else {
      this.copyBtn.innerHTML = `
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        Copy to Clipboard
      `;
      this.downloadBtn.innerHTML = `
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7,10 12,15 17,10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Download as File
      `;
    }
  }

  // API Key Management
  async hasApiKey() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['geminiApiKey'], (result) => {
        resolve(!!result.geminiApiKey);
      });
    });
  }

  async getApiKey() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['geminiApiKey'], (result) => {
        resolve(result.geminiApiKey || null);
      });
    });
  }

  async showApiKeyModal(manageMode = false) {
    const modal = document.getElementById('api-key-modal');
    const saveBtn = document.getElementById('save-api-key-btn');

    modal?.classList.remove('hidden');

    // If managing existing key, show delete option
    if (manageMode && await this.hasApiKey()) {
      saveBtn.textContent = 'Update Key';
      // Add delete button if not exists
      if (!document.getElementById('delete-api-key-btn')) {
        const deleteBtn = document.createElement('button');
        deleteBtn.id = 'delete-api-key-btn';
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.textContent = 'Delete Key';
        deleteBtn.style.cssText = 'background: #ef4444; color: white; margin-top: 8px; width: 100%;';
        deleteBtn.addEventListener('click', () => this.deleteApiKey());
        document.querySelector('.modal-actions')?.appendChild(deleteBtn);
      }
    } else {
      saveBtn.textContent = 'Save Key';
    }

    document.getElementById('api-key-input')?.focus();
  }

  hideApiKeyModal() {
    document.getElementById('api-key-modal')?.classList.add('hidden');
    document.getElementById('api-key-input').value = '';
    document.getElementById('api-key-status')?.classList.add('hidden');
  }

  toggleKeyVisibility() {
    const input = document.getElementById('api-key-input');
    if (input) {
      input.type = input.type === 'password' ? 'text' : 'password';
    }
  }

  async saveApiKey() {
    const input = document.getElementById('api-key-input');
    const statusEl = document.getElementById('api-key-status');
    const key = input?.value?.trim();

    if (!key) {
      this.showApiKeyStatus('Please enter an API key', 'error');
      return;
    }

    // Validate key format (Gemini keys start with 'AIza')
    if (!key.startsWith('AIza')) {
      this.showApiKeyStatus('Invalid key format. Gemini API keys start with "AIza"', 'error');
      return;
    }

    // Test the API key with a simple request
    this.showApiKeyStatus('Validating key...', 'pending');

    try {
      const isValid = await this.testApiKey(key);
      if (isValid) {
        // Save to local storage (browser only, never synced)
        chrome.storage.local.set({ geminiApiKey: key }, () => {
          this.showApiKeyStatus('API key saved successfully!', 'success');
          setTimeout(() => {
            this.hideApiKeyModal();
            this.formatSelect.value = 'ai-summary';
            this.handleFormatChange();
          }, 1000);
        });
      } else {
        this.showApiKeyStatus('Invalid API key. Please check and try again.', 'error');
      }
    } catch (e) {
      console.error('[AI Takeout] API key validation failed:', e);
      this.showApiKeyStatus('Failed to validate key. Check your internet connection.', 'error');
    }
  }

  async testApiKey(key) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
      );
      return response.ok;
    } catch (e) {
      return false;
    }
  }

  showApiKeyStatus(message, type) {
    const statusEl = document.getElementById('api-key-status');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = 'api-key-status ' + type;
      statusEl.classList.remove('hidden');
    }
  }

  async deleteApiKey() {
    chrome.storage.local.remove(['geminiApiKey'], () => {
      this.showApiKeyStatus('API key deleted', 'success');
      this.updateApiKeyIndicator();
      setTimeout(() => {
        this.hideApiKeyModal();
        // Remove delete button
        document.getElementById('delete-api-key-btn')?.remove();
      }, 1000);
    });
  }

  async updateApiKeyIndicator() {
    const hasKey = await this.hasApiKey();
    const linkText = document.getElementById('api-key-link-text');
    const link = document.getElementById('manage-api-key');

    if (linkText) {
      linkText.textContent = hasKey ? 'API Key ✓' : 'API Key';
    }
    if (link) {
      link.classList.toggle('api-key-configured', hasKey);
    }
  }

  // AI Summary Generation
  async generateAISummary() {
    if (this.aiSummaryCache) {
      return; // Use cached summary
    }

    const apiKey = await this.getApiKey();
    if (!apiKey) {
      this.showApiKeyModal();
      return;
    }

    // Show persistent loading state
    this.setGeneratingState(true);

    try {
      const messages = this.getFilteredMessages();
      const conversationText = messages.map(m => {
        const role = this.normalizeRole(m.role) === 'user' ? 'User' : 'Assistant';
        return `${role}: ${m.content}`;
      }).join('\n\n');

      // Call Gemini API (using stable gemini-2.5-flash model)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Your task is to create a detailed summary of this conversation that captures all the important information. The summary should be comprehensive enough that someone reading it would understand the full context and key details discussed.

Please structure your summary as follows:

## Overview
A 2-3 sentence summary of what this conversation is about.

## Key Topics Discussed
List each major topic or question that was addressed, with a brief explanation of the discussion around it.

## Main Points & Solutions
For each significant point, solution, or piece of advice provided:
- What was the question or problem?
- What was the answer or solution?
- Any important details, caveats, or nuances mentioned

## Technical Details (if applicable)
Any code snippets, configurations, commands, or technical specifications that were shared.

## Conclusions & Action Items
- Key takeaways from the conversation
- Any next steps or recommendations mentioned
- Important decisions made

Use markdown formatting. Be thorough - it's better to include more detail than to miss something important.

CONVERSATION:
${conversationText}`
              }]
            }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 4000
            }
          })
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          this.setGeneratingState(false);
          this.showToast('Rate limit reached. Please wait a moment and try again.');
          this.formatSelect.value = 'summary'; // Fall back to quick summary
          this.updatePreview();
          return;
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const summaryText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (summaryText) {
        this.aiSummaryCache = summaryText;
        this.setGeneratingState(false);
        this.showToast('AI summary generated!');
        this.updatePreview();
      } else {
        throw new Error('No summary returned');
      }

    } catch (e) {
      console.error('[AI Takeout] AI summary generation failed:', e);
      this.setGeneratingState(false);
      this.showToast('Failed to generate summary');
      this.formatSelect.value = 'standard';
      this.updatePreview();
    }
  }

  setGeneratingState(isGenerating) {
    this.isGenerating = isGenerating;

    // Update buttons
    this.copyBtn.disabled = isGenerating;
    this.downloadBtn.disabled = isGenerating;

    if (isGenerating) {
      this.copyBtn.innerHTML = `
        <div class="btn-spinner"></div>
        Generating Summary...
      `;
      this.copyBtn.classList.add('generating');
      this.downloadBtn.style.opacity = '0.5';
      this.downloadBtn.style.pointerEvents = 'none';

      // Show in preview
      this.previewEl.textContent = 'Generating AI summary... This may take a few seconds.';
    } else {
      this.copyBtn.classList.remove('generating');
      this.downloadBtn.style.opacity = '1';
      this.downloadBtn.style.pointerEvents = 'auto';
      // Restore correct button labels
      this.updateButtonLabels();
    }
  }

  setExportMode(mode) {
    this.exportMode = mode;
    this.aiSummaryCache = null; // Clear AI summary cache when mode changes

    // Update button states
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Show/hide message selector
    const selector = document.getElementById('message-selector');
    if (mode === 'select') {
      selector.classList.remove('hidden');
      this.renderMessageList();
    } else {
      selector.classList.add('hidden');
    }

    this.updateStats();
    this.updatePreview();
  }

  renderMessageList() {
    if (!this.conversationData) return;

    const list = document.getElementById('message-list');
    list.innerHTML = this.conversationData.messages.map((msg, i) => {
      const preview = msg.content.length > 50
        ? msg.content.slice(0, 50) + '...'
        : msg.content;
      const normalizedRole = this.normalizeRole(msg.role);
      const roleLabel = normalizedRole === 'user' ? 'You' : 'AI';
      return `
        <label class="message-item">
          <input type="checkbox" data-index="${i}" ${this.selectedIndices.has(i) ? 'checked' : ''}>
          <span class="message-role ${normalizedRole}">${roleLabel}</span>
          <span class="message-preview">${this.escapeHtml(preview)}</span>
        </label>
      `;
    }).join('');

    list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index);
        if (e.target.checked) {
          this.selectedIndices.add(idx);
        } else {
          this.selectedIndices.delete(idx);
        }
        this.updateStats();
        this.updatePreview();
      });
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Normalize role to 'user' or 'assistant'
  normalizeRole(role) {
    if (!role) return 'assistant';
    const r = role.toLowerCase().trim();
    if (r === 'user' || r === 'human' || r === 'you') return 'user';
    return 'assistant';
  }

  selectAllMessages() {
    if (!this.conversationData) return;
    this.selectedIndices = new Set(
      this.conversationData.messages.map((_, i) => i)
    );
    this.renderMessageList();
    this.updateStats();
    this.updatePreview();
  }

  selectNoMessages() {
    this.selectedIndices = new Set();
    this.renderMessageList();
    this.updateStats();
    this.updatePreview();
  }

  getFilteredMessages() {
    if (!this.conversationData) return [];
    const { messages } = this.conversationData;

    switch (this.exportMode) {
      case 'questions':
        return messages.filter(m => this.normalizeRole(m.role) === 'user');
      case 'select':
        return messages.filter((_, i) => this.selectedIndices.has(i));
      default:
        return messages;
    }
  }

  async loadConversation() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab) {
        this.showError('No active tab found');
        return;
      }

      // Check if we're on a supported site
      const supportedSites = ['chat.openai.com', 'chatgpt.com', 'gemini.google.com', 'perplexity.ai', 'claude.ai'];
      const url = new URL(tab.url);
      const isSupported = supportedSites.some(site => url.hostname.includes(site));

      if (!isSupported) {
        this.showError('This site is not supported');
        return;
      }

      // Request conversation data from content script
      let response;
      try {
        response = await chrome.tabs.sendMessage(tab.id, { action: 'GET_CONVERSATION' });
      } catch (e) {
        // Content script not injected (common in incognito) — inject manually and retry
        console.log('[AI Takeout] Content script not found, injecting manually...');
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: [
              'content/extractors/chatgpt.js',
              'content/extractors/gemini.js',
              'content/extractors/perplexity.js',
              'content/extractors/claude.js',
              'content/extractors/generic.js',
              'content/content.js'
            ]
          });
          response = await chrome.tabs.sendMessage(tab.id, { action: 'GET_CONVERSATION' });
        } catch (retryError) {
          console.error('Error after manual injection:', retryError);
          this.showError('Could not connect to page. Try refreshing.');
          return;
        }
      }

      if (!response || !response.success) {
        this.showError(response?.error || 'Failed to extract conversation');
        return;
      }

      this.conversationData = response.data;
      this.showContent();
    } catch (error) {
      console.error('Error loading conversation:', error);
      this.showError('Could not connect to page. Try refreshing.');
    }
  }

  showError(message) {
    this.loadingEl.classList.add('hidden');
    this.contentEl.classList.add('hidden');
    this.errorEl.classList.remove('hidden');
    this.errorMessageEl.textContent = message;
  }

  showContent() {
    this.loadingEl.classList.add('hidden');
    this.errorEl.classList.add('hidden');
    this.contentEl.classList.remove('hidden');

    this.sourceEl.textContent = this.conversationData.source;
    this.updateBetaLabels();
    this.updateApiKeyIndicator();
    this.updateStats();
    this.updatePreview();
  }

  updateBetaLabels() {
    // Add beta badges for Perplexity and Claude
    const source = this.conversationData.source?.toLowerCase() || '';
    const isBeta = source.includes('perplexity') || source.includes('claude');

    if (isBeta) {
      document.querySelectorAll('.mode-btn').forEach(btn => {
        const mode = btn.dataset.mode;
        if (mode === 'questions' || mode === 'select') {
          // Add beta badge if not already present
          if (!btn.querySelector('.beta-badge')) {
            btn.innerHTML += '<span class="beta-badge">Beta</span>';
          }
        }
      });
    }
  }

  updateStats() {
    if (!this.conversationData) return;
    const filtered = this.getFilteredMessages();
    const total = this.conversationData.messages.length;
    this.messageCountEl.textContent = filtered.length === total
      ? `${total}`
      : `${filtered.length}/${total}`;
  }

  updatePreview() {
    const formatted = this.formatConversation();
    // Show first 500 chars in preview
    const preview = formatted.length > 500
      ? formatted.substring(0, 500) + '...'
      : formatted;
    this.previewEl.textContent = preview;
  }

  formatConversation() {
    const format = this.formatSelect.value;
    const messages = this.getFilteredMessages();
    const { source, title } = this.conversationData;

    switch (format) {
      case 'standard':
        return this.formatStandard(messages, source, title);
      case 'compact':
        return this.formatCompact(messages, source, title);
      case 'json':
        return this.formatJSON(messages, source, title);
      case 'summary':
        return this.formatSummary(source, title);
      case 'ai-summary':
        return this.formatAISummary(source, title);
      default:
        return this.formatStandard(messages, source, title);
    }
  }

  formatAISummary(source, title) {
    if (!this.aiSummaryCache) {
      return 'Click "Copy to Clipboard" or "Download" to generate AI summary.';
    }

    let output = `=== AI-GENERATED SUMMARY ===\n`;
    output += `Source: ${source}${title ? ` | ${title}` : ''}\n\n`;
    output += this.aiSummaryCache;
    output += `\n\n---\n*Summary generated by Gemini AI via AI Takeout*`;

    return output;
  }

  formatSummary(source, title) {
    const messages = this.getFilteredMessages();
    const userMessages = messages.filter(m => this.normalizeRole(m.role) === 'user');
    const assistantMessages = messages.filter(m => this.normalizeRole(m.role) === 'assistant');

    let output = `=== CONVERSATION SUMMARY ===\n`;
    output += `Source: ${source}${title ? ` | ${title}` : ''}\n`;
    output += `Total Messages: ${messages.length} (${userMessages.length} questions, ${assistantMessages.length} responses)\n\n`;

    // First question
    if (userMessages.length > 0) {
      output += `## Initial Question\n`;
      output += this.truncateText(userMessages[0].content, 300) + '\n\n';
    }

    // Key topics - extract from user questions
    if (userMessages.length > 1) {
      output += `## Topics Discussed\n`;
      userMessages.slice(0, 5).forEach((msg, i) => {
        const topic = this.truncateText(msg.content, 100);
        output += `${i + 1}. ${topic}\n`;
      });
      if (userMessages.length > 5) {
        output += `   ... and ${userMessages.length - 5} more questions\n`;
      }
      output += '\n';
    }

    // Last exchange
    if (messages.length >= 2) {
      output += `## Latest Exchange\n`;
      const lastUser = userMessages[userMessages.length - 1];
      const lastAssistant = assistantMessages[assistantMessages.length - 1];

      if (lastUser) {
        output += `**Question:** ${this.truncateText(lastUser.content, 200)}\n\n`;
      }
      if (lastAssistant) {
        output += `**Response:** ${this.truncateText(lastAssistant.content, 300)}\n\n`;
      }
    }

    output += `---\n`;
    output += `*Quick summary generated by AI Takeout. For full context, use Standard or Compact format.*`;

    return output;
  }

  truncateText(text, maxLength) {
    if (!text) return '';
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  formatStandard(messages, source, title) {
    let output = `=== CONVERSATION CONTEXT ===\n`;
    output += `I'm continuing a conversation I started with another AI assistant (${source}).\n`;
    output += `Please read the context below and help me continue from where we left off.\n\n`;

    if (title) {
      output += `Conversation Title: ${title}\n\n`;
    }

    output += `--- Conversation History ---\n\n`;

    for (const msg of messages) {
      const role = this.normalizeRole(msg.role) === 'user' ? 'User' : 'Assistant';
      output += `**${role}:** ${msg.content}\n\n`;
    }

    output += `--- End of Context ---\n\n`;
    output += `Please acknowledge you've read this context and continue assisting me.`;

    return output;
  }

  formatCompact(messages, source, title) {
    let output = `[Context from ${source}${title ? `: ${title}` : ''}]\n\n`;

    for (const msg of messages) {
      const role = this.normalizeRole(msg.role) === 'user' ? 'U' : 'A';
      output += `${role}: ${msg.content}\n\n`;
    }

    output += `[Continue from here]`;

    return output;
  }

  formatJSON(messages, source, title) {
    const data = {
      metadata: {
        source,
        title: title || null,
        exportedAt: new Date().toISOString(),
        messageCount: messages.length
      },
      messages: messages.map(msg => ({
        role: this.normalizeRole(msg.role),
        content: msg.content
      }))
    };

    return JSON.stringify(data, null, 2);
  }

  async copyToClipboard() {
    const format = this.formatSelect.value;

    // Generate AI summary if needed
    if (format === 'ai-summary' && !this.aiSummaryCache) {
      await this.generateAISummary();
      if (!this.aiSummaryCache) {
        return; // Generation failed
      }
    }

    try {
      const formatted = this.formatConversation();
      await navigator.clipboard.writeText(formatted);
      this.showToast('Copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
      this.showToast('Failed to copy');
    }
  }

  async downloadFile() {
    const format = this.formatSelect.value;

    // Generate AI summary if needed
    if (format === 'ai-summary' && !this.aiSummaryCache) {
      await this.generateAISummary();
      if (!this.aiSummaryCache) {
        return; // Generation failed
      }
    }

    const formatted = this.formatConversation();

    let filename, mimeType;
    if (format === 'json') {
      filename = 'conversation.json';
      mimeType = 'application/json';
    } else if (format === 'summary' || format === 'ai-summary') {
      filename = 'conversation-summary.md';
      mimeType = 'text/markdown';
    } else {
      filename = 'conversation.md';
      mimeType = 'text/markdown';
    }

    const blob = new Blob([formatted], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
    this.showToast('File downloaded!');
  }

  showToast(message) {
    this.toastMessageEl.textContent = message;
    this.toastEl.classList.remove('hidden');
    this.toastEl.classList.add('show');

    setTimeout(() => {
      this.toastEl.classList.remove('show');
      setTimeout(() => {
        this.toastEl.classList.add('hidden');
      }, 300);
    }, 2000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
