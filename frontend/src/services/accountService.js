import { apiRequest } from "@/lib/apiClient";

export const getAccounts = async () =>
  (await apiRequest("/accounts?limit=100")).data || [];

export const createStudentAccount = async (payload) =>
  (await apiRequest("/accounts/students", {
    method: "POST",
    body: JSON.stringify(payload),
  })).account;

export const createAdminAccount = async (payload) => {
  // Map hostel scope to the new role format
  let role;
  if (payload.hostel === "all") role = "super_admin";
  else if (payload.hostel === "girls") role = "girls_admin";
  else role = "boys_admin";

  return (await apiRequest("/accounts/admins", {
    method: "POST",
    body: JSON.stringify({
      full_name: payload.full_name,
      email: payload.email,
      role,
    }),
  })).account;
};

export const resendInvite = async (id) =>
  apiRequest(`/accounts/${id}/resend-invite`, { method: "POST" });

export const deactivateAccount = async (id) =>
  apiRequest(`/accounts/${id}/deactivate`, { method: "POST" });
