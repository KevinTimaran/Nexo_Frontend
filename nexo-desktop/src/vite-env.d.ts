/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Nexo API, e.g. https://nexo-api.onrender.com/api/v1 */
  readonly VITE_API_URL?: string;
  /** "server" starts in server mode (web and desktop builds); anything else keeps the local mock default. */
  readonly VITE_DEFAULT_MODE?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_RELEASES_URL?: string;
}
