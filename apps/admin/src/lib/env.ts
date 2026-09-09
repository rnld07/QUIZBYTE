/** Public (browser-safe) configuration. */
export function getPublicSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY müssen gesetzt sein (siehe .env.example).');
  }
  return { url, anonKey };
}

/** Server-only secrets. Never import this from a client component. */
export function getElevenLabsEnv(): { apiKey: string; voiceId: string } | null {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) return null;
  return { apiKey, voiceId };
}
