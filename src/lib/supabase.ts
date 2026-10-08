import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./supabase-config";

export function createClient() {
  const config = getSupabaseConfig();
  return config ? createBrowserClient(config.url, config.key) : null;
}
