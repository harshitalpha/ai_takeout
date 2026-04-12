// Main Content Script for AI Conversation Exporter
// Coordinates extractors and handles message passing with popup

(function() {
  'use strict';

  // Prevent duplicate injection (e.g. manual re-injection in incognito)
  if (window.__aiTakeoutLoaded) return;
  window.__aiTakeoutLoaded = true;

  // List of available extractors (in priority order)
  const extractors = [
    window.ChatGPTExtractor,
    window.GeminiExtractor,
    window.PerplexityExtractor,
    window.ClaudeExtractor,
    window.GenericExtractor  // Fallback
  ];

  /**
   * Detect which extractor to use for the current page
   * @returns {Object} The matching extractor or generic fallback
   */
  function detectExtractor() {
    for (const extractor of extractors) {
      if (extractor && typeof extractor.detect === 'function') {
        try {
          if (extractor.detect()) {
            console.log(`[AI Exporter] Using ${extractor.name} extractor`);
            return extractor;
          }
        } catch (e) {
          console.warn(`[AI Exporter] Error detecting ${extractor?.name}:`, e);
        }
      }
    }

    // Fallback to generic
    console.log('[AI Exporter] Using Generic extractor');
    return window.GenericExtractor;
  }

  /**
   * Extract conversation using the appropriate extractor
   * @returns {Object} Extraction result with success status and data
   */
  function extractConversation() {
    try {
      const extractor = detectExtractor();

      if (!extractor) {
        return {
          success: false,
          error: 'No extractor available'
        };
      }

      const messages = extractor.extract();

      if (!messages || messages.length === 0) {
        return {
          success: false,
          error: 'No messages found in conversation'
        };
      }

      // Filter out any invalid messages
      const validMessages = messages.filter(msg =>
        msg &&
        typeof msg.role === 'string' &&
        typeof msg.content === 'string' &&
        msg.content.trim().length > 0
      );

      if (validMessages.length === 0) {
        return {
          success: false,
          error: 'No valid messages found'
        };
      }

      const title = typeof extractor.getTitle === 'function'
        ? extractor.getTitle()
        : null;

      return {
        success: true,
        data: {
          source: extractor.name,
          title: title,
          messages: validMessages,
          extractedAt: new Date().toISOString(),
          url: window.location.href
        }
      };

    } catch (error) {
      console.error('[AI Exporter] Extraction error:', error);
      return {
        success: false,
        error: `Extraction failed: ${error.message}`
      };
    }
  }

  /**
   * Listen for messages from the popup
   */
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[AI Exporter] Received message:', request.action);

    if (request.action === 'GET_CONVERSATION') {
      // Extract and send response
      const result = extractConversation();
      console.log('[AI Exporter] Extraction result:', result.success, result.data?.messages?.length || 0, 'messages');
      sendResponse(result);
    }

    // Return true to indicate we'll respond asynchronously
    return true;
  });

  // Log that content script is loaded
  console.log('[AI Exporter] Content script loaded on', window.location.hostname);

})();
