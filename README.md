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

## Kaggle Integration

Kletta connects to the Kaggle API to fetch your competitions and search for datasets.

### Setup

1. Go to [Kaggle Account Settings](https://www.kaggle.com/settings/account)
2. Under **API**, click **Create New Token** to download `kaggle.json`
3. Open the JSON file and copy your `username` and `key`
4. In Kletta Settings, enter these credentials and click **Save Credentials**

### Features

- **Auto-load competitions**: On startup, Kletta fetches your active Kaggle competitions
- **Competition search**: When joining a new competition, Kletta queries Kaggle first (falls back to AI if no results)
- **Dataset discovery**: Resource searches include Kaggle datasets alongside AI-suggested papers and libraries

### Limitations

- **CORS**: Browser-based requests to `kaggle.com/api/v1` may be blocked by CORS. If you see "Unable to reach Kaggle API" errors, the Kaggle API doesn't allow direct browser access. A backend proxy would be needed for full functionality.
- **Rate limits**: Kaggle API has usage limits; excessive requests may be throttled.
