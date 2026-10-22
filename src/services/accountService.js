import { apiRequest } from "@/lib/apiClient";
export const getAccounts = async () => (await apiRequest("/accounts?limit=100")).data || [];
export const createStudentAccount = async (payload) => (await apiRequest("/accounts/students", { method: "POST", body: JSON.stringify(payload) })).account;
export const createAdminAccount = async (payload) => (await apiRequest("/accounts/admins", { method: "POST", body: JSON.stringify(payload) })).account;
export const resendInvite = async (id) => apiRequest(`/accounts/${id}/resend-invite`, { method: "POST" });
export const deactivateAccount = async (id) => apiRequest(`/accounts/${id}/deactivate`, { method: "POST" });
