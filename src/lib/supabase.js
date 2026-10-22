import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes("your-project-ref") && !supabaseAnonKey.includes("your-supabase-anon-key"));
if (!isSupabaseConfigured && import.meta.env.PROD) console.error("NIVASA requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the deployed frontend environment.");
export const supabase = createClient(supabaseUrl || "https://invalid.local", supabaseAnonKey || "invalid-key", { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
export default supabase;
