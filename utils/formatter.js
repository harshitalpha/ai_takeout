// Conversation Formatter Utility
// Converts extracted messages into various portable prompt formats

const ConversationFormatter = {

  /**
   * Format conversation in standard markdown format
   * Human-readable with clear context for the receiving AI
   *
   * @param {Array} messages - Array of {role, content} objects
   * @param {string} source - Name of the source AI (e.g., "ChatGPT")
   * @param {string|null} title - Optional conversation title
   * @returns {string} Formatted prompt
   */
  formatStandard(messages, source, title = null) {
    let output = `=== CONVERSATION CONTEXT ===\n`;
    output += `I'm continuing a conversation I started with another AI assistant (${source}).\n`;
    output += `Please read the context below and help me continue from where we left off.\n\n`;

    if (title) {
      output += `Conversation Title: ${title}\n\n`;
    }

    output += `--- Conversation History ---\n\n`;

    for (const msg of messages) {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      output += `**${role}:** ${msg.content}\n\n`;
    }

    output += `--- End of Context ---\n\n`;
    output += `Please acknowledge you've read this context and continue assisting me.`;

    return output;
  },

  /**
   * Format conversation in compact format
   * Minimal formatting for smaller token usage
   *
   * @param {Array} messages - Array of {role, content} objects
   * @param {string} source - Name of the source AI
   * @param {string|null} title - Optional conversation title
   * @returns {string} Formatted prompt
   */
  formatCompact(messages, source, title = null) {
    let output = `[Context from ${source}${title ? `: ${title}` : ''}]\n\n`;

    for (const msg of messages) {
      const role = msg.role === 'user' ? 'U' : 'A';
      output += `${role}: ${msg.content}\n\n`;
    }

    output += `[Continue from here]`;

    return output;
  },

  /**
   * Format conversation as JSON
   * Structured format for programmatic use with APIs
   *
   * @param {Array} messages - Array of {role, content} objects
   * @param {string} source - Name of the source AI
   * @param {string|null} title - Optional conversation title
   * @returns {string} JSON string
   */
  formatJSON(messages, source, title = null) {
    const data = {
      metadata: {
        source,
        title: title || null,
        exportedAt: new Date().toISOString(),
        messageCount: messages.length
      },
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    };

    return JSON.stringify(data, null, 2);
  },

  /**
   * Format conversation for a specific target AI
   * Optimizes the format based on known preferences
   *
   * @param {Array} messages - Array of {role, content} objects
   * @param {string} source - Name of the source AI
   * @param {string} target - Name of the target AI
   * @param {string|null} title - Optional conversation title
   * @returns {string} Formatted prompt
   */
  formatForTarget(messages, source, target, title = null) {
    const targetLower = target.toLowerCase();

    // Custom formatting for specific targets
    if (targetLower.includes('ollama') || targetLower.includes('llama')) {
      // Ollama/LLaMA often works better with JSON or structured input
      return this.formatJSON(messages, source, title);
    }

    if (targetLower.includes('api')) {
      // API usage - return JSON for easy parsing
      return this.formatJSON(messages, source, title);
    }

    // Default to standard format for web-based AIs
    return this.formatStandard(messages, source, title);
  },

  /**
   * Estimate token count for a formatted conversation
   * Rough estimate using average of 4 characters per token
   *
   * @param {string} text - The formatted text
   * @returns {number} Estimated token count
   */
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  },

  /**
   * Truncate conversation to fit within token limit
   * Keeps most recent messages, preserves first message for context
   *
   * @param {Array} messages - Array of {role, content} objects
   * @param {number} maxTokens - Maximum token estimate
   * @returns {Array} Truncated messages array
   */
  truncateToFit(messages, maxTokens) {
    if (messages.length <= 2) {
      return messages;
    }

    // Always keep first and last messages
    const first = messages[0];
    const rest = messages.slice(1);

    const truncated = [first];
    let currentTokens = this.estimateTokens(first.content);

    // Add messages from the end (most recent first)
    for (let i = rest.length - 1; i >= 0; i--) {
      const msgTokens = this.estimateTokens(rest[i].content);

      if (currentTokens + msgTokens > maxTokens) {
        // Add truncation notice
        truncated.splice(1, 0, {
          role: 'system',
          content: `[${i + 1} earlier messages truncated for brevity]`
        });
        break;
      }

      truncated.splice(1, 0, rest[i]);
      currentTokens += msgTokens;
    }

    return truncated;
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConversationFormatter;
} else {
  window.ConversationFormatter = ConversationFormatter;
}
