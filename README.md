# AI Takeout

Your chats, to go. Export AI conversations to continue anywhere.

AI Takeout is a browser extension that empowers you to easily export your conversations from various AI chat platforms. Whether you want to archive your discussions, migrate them to another tool, or generate concise summaries, AI Takeout provides a seamless solution.

## Features

*   **Multi-Platform Support:** Export conversations from popular AI platforms including:
    *   ChatGPT
    *   Gemini
    *   Perplexity AI
    *   Claude
*   **Multiple Export Formats:** Choose the format that best suits your needs:
    *   **Standard Markdown:** Formatted for easy readability and continuity in other AI tools.
    *   **Compact Markdown:** A more concise version for quick sharing.
    *   **JSON:** Structured data for programmatic use or integration.
    *   **Quick Summary:** A brief, automatically generated summary of the conversation.
    *   **AI-Generated Summary:** (Powered by Gemini AI) A comprehensive, detailed summary that captures key topics, main points, solutions, and technical details. Requires a Gemini API key.
*   **Flexible Export Options:**
    *   Export all messages.
    *   Export only user questions.
    *   Select specific messages to export.
*   **Clipboard & Download:** Copy the formatted conversation directly to your clipboard or download it as a `.md` or `.json` file.
*   **Dark Mode:** A comfortable viewing experience in low-light conditions.

## Installation

### From the Chrome Web Store (Coming Soon)

Once published, you will be able to install AI Takeout directly from the Chrome Web Store.

### Manual Installation (Developer Mode)

1.  **Download the repository:**
    ```bash
    git clone https://github.com/your-username/ai-takeout.git
    cd ai-takeout
    ```
2.  **Open Chrome/Edge Extensions page:**
    *   Go to `chrome://extensions` (for Chrome) or `edge://extensions` (for Edge) in your browser.
3.  **Enable Developer Mode:**
    *   Toggle on the "Developer mode" switch, usually located in the top right corner.
4.  **Load unpacked:**
    *   Click on the "Load unpacked" button.
    *   Navigate to the downloaded `ai-takeout` directory and select it.
5.  **Pin the extension:**
    *   Click the puzzle icon in your browser toolbar, find "AI Takeout", and pin it for easy access.

## Usage

1.  **Navigate to an AI Conversation:** Open a supported AI chat platform (e.g., ChatGPT, Gemini) and go to the conversation you wish to export.
2.  **Open the Extension Popup:** Click on the "AI Takeout" icon in your browser toolbar.
3.  **Select Export Options:**
    *   **Export Mode:** Choose between "All Messages," "Questions Only," or "Select Messages" to include in your export.
    *   **Format:** Select your desired output format (Standard, Compact, JSON, Quick Summary, AI-Generated Summary).
4.  **Generate AI Summary (Optional):** If you choose "AI-Generated Summary" for the first time, you will be prompted to enter your Gemini API key. Once saved, the summary will be generated.
5.  **Copy or Download:** Click "Copy to Clipboard" to quickly copy the formatted conversation, or "Download as File" to save it to your computer.

## Contributing

We welcome contributions! If you have suggestions for improvements, bug reports, or want to add support for a new AI platform, please feel free to open an issue or submit a pull request on GitHub.

## License

This project is licensed under the MIT License.
