# AI provider credentials (Phase 0)

`VITE_OPENAI_API_KEY` and `VITE_GEMINI_API_KEY` are development-only settings. Vite embeds `VITE_*` values into frontend assets, so these values must never be treated as production secrets. The runtime reads these environment values only in development builds (or headless test processes).

For a local development run, put your own provider key in the ignored `.env.local` file or enter it in Settings. Settings-stored keys are user-provided credentials and remain in this machine's local webview storage; they are not suitable for shared/team secrets. A production build without a user-provided key reports the provider as unconfigured and raises the existing typed missing-key error.

Production provider calls should move behind an authenticated backend boundary before the app ships with a shared provider credential. The repository's ignored `.env` currently contains non-empty OpenAI and Gemini configuration. If a build containing either value has been distributed, treat the value as exposed and rotate it with the provider. This document intentionally contains no credential values.
