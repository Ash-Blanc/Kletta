<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1pr9QYEeSen3CsLPsg9ewLPyMEilmovsZ

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create `.env.local` with any provider keys (all optional):

   ```bash
   VITE_GEMINI_API_KEY=your_gemini_key
   VITE_OPENROUTER_API_KEY=your_openrouter_key
   VITE_OPENAI_API_KEY=your_openai_key
   VITE_DEFAULT_PROVIDER=gemini
   ```

3. Run the app:
   `npm run dev`

### Provider Diagnostics

Once inside the Settings panel you can run quick connection tests for Gemini, OpenRouter, and OpenAI. Each check sends a minimal request and reports success or detailed error feedback (missing key, network issue, etc.).
