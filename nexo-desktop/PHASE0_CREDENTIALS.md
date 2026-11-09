# AI provider credentials (Phase 0)

Vite embeds `VITE_*` values into frontend assets, so provider credentials must never be supplied as frontend build variables. The application no longer reads provider keys from Vite environment variables. Headless tests may use process environment values, but the desktop runtime does not.

For a local development run, enter your own provider key in Settings. Settings-stored keys are user-provided credentials and remain in this machine's local webview storage; they are not suitable for shared/team secrets. A build without a user-provided key raises the existing typed missing-key error.

Production provider calls should move behind an authenticated backend boundary before the app ships with a shared provider credential. The repository's ignored `.env` currently contains non-empty OpenAI and Gemini configuration. If a build containing either value has been distributed, treat the value as exposed and rotate it with the provider. This document intentionally contains no credential values.
