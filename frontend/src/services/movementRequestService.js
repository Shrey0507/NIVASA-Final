import { apiRequest } from "@/lib/apiClient";
const map = (m = {}) => ({ ...m, type: m.movement_type ?? m.type, reason: m.reason ?? m.purpose, requestedDateTime: m.expected_return_time ?? m.expected_return, submittedAt: m.created_at, reviewedAt: m.approved_at ?? m.rejected_at ?? m.updated_at, actualReturn: m.actual_return_time, studentName: m.students?.full_name ?? m.student_name, usn: m.students?.usn ?? m.usn, room: m.students?.rooms?.room_number ?? m.students?.room_number ?? m.room, hostel: m.hostel });
export const getMovementRequests = async () => (await apiRequest("/movements?limit=100")).data?.map(map) || [];
export const createMovementRequest = async data => map((await apiRequest("/movements",{method:"POST",body:JSON.stringify({movement_type:data.type,destination:data.destination||"",reason:data.reason,expected_return_time:data.requestedDateTime})})).data);
export const cancelRequest = async id => (await apiRequest(`/movements/${id}/cancel`,{method:"POST"})).data;
export const approveRequest = async (id,remarks="") => map((await apiRequest(`/movements/${id}/approve`,{method:"POST",body:JSON.stringify({remarks})})).data);
export const rejectRequest = async (id,remarks="") => map((await apiRequest(`/movements/${id}/reject`,{method:"POST",body:JSON.stringify({remarks})})).data);
