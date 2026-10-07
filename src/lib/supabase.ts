import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase (free tier) handles accounts and cloud sync. It's optional: without the
 * env vars below the app runs in guest mode and keeps the profile in this browser.
 *
 * NEXT_PUBLIC_SUPABASE_URL         = https://<project-ref>.supabase.co
 * NEXT_PUBLIC_SUPABASE_ANON_KEY    = the anon / publishable key (safe in the browser —
 *                                    row-level security in supabase/schema.sql protects data)
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)?.trim();

let client: SupabaseClient | null = null;

export const supabaseConfigured = !!(url && key);

export function getSupabase(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  if (!client) {
    client = createClient(url!, key!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
    });
  }
  return client;
}

/** Turn Supabase's auth errors into something a person can act on. */
export function friendlyAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return "That email and password don't match. Try again or use a magic link.";
  if (/email not confirmed/i.test(message)) return "Please confirm your email first — check your inbox (and spam) for the link.";
  if (/user already registered/i.test(message)) return "There's already an account with that email. Try signing in instead.";
  if (/password should be at least/i.test(message)) return "Passwords need at least 6 characters.";
  if (/rate limit|too many/i.test(message)) return "Too many attempts — wait a minute and try again.";
  if (/fetch|network/i.test(message)) return "Couldn't reach the account server. Check your connection (or your Supabase project may be paused).";
  return message;
}
