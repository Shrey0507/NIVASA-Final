import supabase from "./supabase";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

export async function apiRequest(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => null);
  if (response.status === 401) await supabase.auth.signOut();
  if (!response.ok) throw new Error(payload?.error?.message || payload?.error || "Request failed");
  return payload;
}

export const getApiUrl = () => API_URL;
