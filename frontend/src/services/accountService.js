import { apiRequest } from "@/lib/apiClient";

export const getAccounts = async ({
  page = 1,
  perPage = 25,
  search = "",
  role = "",
  status = "",
} = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    perPage: String(perPage),
  });
  if (search) params.set("search", search);
  if (role) params.set("role", role);
  if (status) params.set("status", status);

  return apiRequest(`/accounts?${params.toString()}`);
};

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
