import { apiRequest } from "@/lib/apiClient";
const mapFee = (f = {}) => ({ ...f, category: f.fee_type ?? f.category, term: f.term ?? f.academic_term, dueDate: f.due_date, paid: f.paid_amount ?? (f.status === "paid" ? Number(f.amount) : 0), balance: f.balance ?? (f.status === "paid" ? 0 : Number(f.amount)) });
const mapGrievance = (g = {}) => ({ ...g, subject: g.title, submittedDate: g.created_at, responses: g.responses ?? (g.response ? [{ id: "response", respondent: "Admin", message: g.response, timestamp: g.updated_at }] : []) });
const mapMovement = (m = {}) => ({ ...m, type: m.movement_type, reason: m.reason ?? m.purpose, requestedDateTime: m.expected_return_time, submittedAt: m.created_at, reviewedAt: m.updated_at, adminRemarks: m.remarks });
const mapNotice = (n = {}) => ({ ...n, body: n.content, audience: n.audience ?? n.target_audience, author: n.published_by, publishDate: n.published_at ?? n.created_at, status: n.status ?? "published" });
export async function getMyFees() { return (await apiRequest("/fees?limit=100")).data?.map(mapFee) || []; }
export async function getMyGrievances() { return (await apiRequest("/grievances?limit=100")).data?.map(mapGrievance) || []; }
export async function createMyGrievance(payload) { return mapGrievance((await apiRequest("/grievances", { method: "POST", body: JSON.stringify({ title: payload.subject, category: payload.category, description: payload.description }) })).data); }
export async function getMyMovements() { return (await apiRequest("/movements?limit=100")).data?.map(mapMovement) || []; }
export async function createMyMovement(payload) { return mapMovement((await apiRequest("/movements", { method: "POST", body: JSON.stringify({ movement_type: payload.type, reason: payload.reason, destination: payload.destination || "", expected_return_time: payload.requestedDateTime }) })).data); }
export async function cancelMyMovement(id) { return apiRequest(`/movements/${id}/return`, { method: "POST" }); }
export async function getMyNotices() { return (await apiRequest("/notices?limit=100")).data?.map(mapNotice) || []; }
export async function getMyMess() { return (await apiRequest("/mess?limit=100")).data || []; }
export function summarizeFees(records) { const totalBilled = records.reduce((sum, r) => sum + Number(r.amount || 0), 0); const totalPaid = records.reduce((sum, r) => sum + Number(r.paid || 0), 0); const outstanding = Math.max(0, totalBilled - totalPaid); const nextDueDate = records.filter((r) => Number(r.balance || 0) > 0 && r.dueDate).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0]?.dueDate || null; return { totalBilled, totalPaid, outstanding, nextDueDate }; }
