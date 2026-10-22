import { apiRequest } from "@/lib/apiClient";
const map = (m = {}) => ({ ...m, type: m.movement_type ?? m.type, reason: m.reason ?? m.purpose, requestedDateTime: m.expected_return_time ?? m.expected_return, submittedAt: m.created_at, reviewedAt: m.updated_at, actualReturn: m.actual_return_time });
export const getMovementRequests = async () => (await apiRequest("/movements?limit=100")).data?.map(map) || [];
export const createMovementRequest = async (data) => map((await apiRequest("/movements", { method: "POST", body: JSON.stringify({ movement_type: data.type, destination: data.destination || "", reason: data.reason, expected_return_time: data.requestedDateTime }) })).data);
export const cancelRequest = async (id) => { await apiRequest(`/movements/${id}/return`, { method: "POST" }); };
export const approveRequest = async (id) => map((await apiRequest(`/movements/${id}/return`, { method: "POST" })).data);
export const rejectRequest = async (id) => map((await apiRequest(`/movements/${id}/return`, { method: "POST" })).data);
