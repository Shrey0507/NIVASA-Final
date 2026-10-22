import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Auth
import LoginPage from "./pages/auth/LoginPage";

// Admin
import AdminLayout from "./components/layout/AdminLayout";
import DashboardPage from "./pages/admin/DashboardPage";
import StudentsPage from "./pages/admin/StudentsPage";
import RoomsPage from "./pages/admin/RoomsPage";
import FeesPage from "./pages/admin/FeesPage";
import MessPage from "./pages/admin/MessPage";
import MovementsPage from "./pages/admin/MovementsPage";
import GrievancesPage from "./pages/admin/GrievancesPage";
import NoticesPage from "./pages/admin/NoticesPage";
import CredentialsPage from "./pages/admin/CredentialsPage";

// Student
import StudentLayout from "./components/layout/StudentLayout";
import StudentDashboardPage from "./pages/student/StudentDashboardPage";
import StudentProfilePage from "./pages/student/StudentProfilePage";
import StudentFeesPage from "./pages/student/StudentFeesPage";
import StudentMessPage from "./pages/student/StudentMessPage";
import StudentMovementsPage from "./pages/student/StudentMovementsPage";
import StudentGrievancesPage from "./pages/student/StudentGrievancesPage";
import StudentNoticesPage from "./pages/student/StudentNoticesPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/login" element={<LoginPage initialMode="admin" />} />
        <Route path="/student/login" element={<LoginPage initialMode="student" />} />

        {/* Admin routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="rooms" element={<RoomsPage />} />
          <Route path="fees" element={<FeesPage />} />
          <Route path="mess" element={<MessPage />} />
          <Route path="movements" element={<MovementsPage />} />
          <Route path="grievances" element={<GrievancesPage />} />
          <Route path="notices" element={<NoticesPage />} />
          <Route path="credentials" element={<CredentialsPage />} />
        </Route>

        {/* Student routes */}
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<StudentDashboardPage />} />
          <Route path="profile" element={<StudentProfilePage />} />
          <Route path="fees" element={<StudentFeesPage />} />
          <Route path="mess" element={<StudentMessPage />} />
          <Route path="movements" element={<StudentMovementsPage />} />
          <Route path="grievances" element={<StudentGrievancesPage />} />
          <Route path="notices" element={<StudentNoticesPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
