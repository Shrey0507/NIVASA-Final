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

  const result = await apiRequest(`/accounts?${params.toString()}`);

  // Compatibility with an older backend deployment that returns only
  // { data: [...] } and does not yet support server-side filters/pagination.
  // In that case, filter the returned account set in the browser so the
  // dropdowns still work instead of silently showing every account.
  if (!result?.pagination) {
    let accounts = Array.isArray(result?.data) ? result.data : [];
    const normalizedSearch = search.trim().toLowerCase();

    if (normalizedSearch) {
      accounts = accounts.filter((account) =>
        [account.full_name, account.email, account.username, account.id]
          .some((value) => String(value || "").toLowerCase().includes(normalizedSearch))
      );
    }
    if (role) accounts = accounts.filter((account) => account.role === role);
    if (status) accounts = accounts.filter((account) => account.status === status);

    const total = accounts.length;
    const start = (page - 1) * perPage;
    return {
      data: accounts.slice(start, start + perPage),
      pagination: {
        page,
        perPage,
        total,
        hasMore: start + perPage < total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      },
    };
  }

  return result;
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

export const permanentlyDeleteAccount = async (id) =>
  apiRequest(`/accounts/${encodeURIComponent(id)}`, { method: "DELETE" });
