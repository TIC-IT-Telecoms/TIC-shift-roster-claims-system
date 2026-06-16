import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "./store/authStore";

// Auth
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import LoginOtp from "./pages/LoginOtp";

// Employee pages
import Dashboard from "./pages/Dashboard";
import MyProfile from "./pages/MyProfile";
import MyRoster from "./pages/MyRoster";
import MyClaims from "./pages/MyClaims";
import SubmitClaim from "./pages/SubmitClaim";
import MyPayroll from "./pages/MyPayroll";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import MyApprovals from "./pages/MyApprovals";
import MyReports from "./pages/MyReports";

// Admin pages
import AdminDashboard from "./pages/AdminDashboard";
import Employees from "./pages/Employees";
import AddEmployee from "./pages/AddEmployee";
import Teams from "./pages/Teams";
import AddTeam from "./pages/AddTeam";
import Shifts from "./pages/Shifts";
import RotationCycles from "./pages/RotationCycles";
import AdminRosters from "./pages/AdminRosters";
import AdminClaims from "./pages/AdminClaims";
import AdminPayroll from "./pages/AdminPayroll";
import GeneratePayroll from "./pages/GeneratePayroll";
import Compliance from "./pages/Compliance";
import AdminReports from "./pages/AdminReports";
import Holidays from "./pages/Holidays";
import AdminSettings from "./pages/AdminSettings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2,
    },
  },
});

// ===== Protected Route =====
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuth, user } = useAuthStore();
  const role = user?.user?.user?.role;

  if (!isAuth) return <Navigate to="/" replace />;

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={role === "Admin" ? "/admin-dashboard" : "/dashboard"} replace />;
  }

  return children;
};

// ===== Root redirect based on auth state =====
const RootRedirect = () => {
  const { isAuth, user } = useAuthStore();
  if (!isAuth) return <Login replace />;
  return <Navigate to={user?.user?.user?.role === "Admin" ? "/admin-dashboard" : "/dashboard"} replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>

          {/* ===== PUBLIC ===== */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/login-otp" element={<LoginOtp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* ===== EMPLOYEE ROUTES ===== */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={["Employee"]}>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute allowedRoles={["Employee", "Admin"]}>
              <MyProfile />
            </ProtectedRoute>
          } />
          <Route path="/roster" element={
            <ProtectedRoute allowedRoles={["Employee", "Admin"]}>
              <MyRoster />
            </ProtectedRoute>
          } />
          <Route path="/claims" element={
            <ProtectedRoute allowedRoles={["Employee", "Admin"]}>
              <MyClaims />
            </ProtectedRoute>
          } />
          <Route path="/submit-claim" element={
            <ProtectedRoute allowedRoles={["Employee"]}>
              <SubmitClaim />
            </ProtectedRoute>
          } />
          <Route path="/payroll" element={
            <ProtectedRoute allowedRoles={["Employee", "Admin"]}>
              <MyPayroll />
            </ProtectedRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute allowedRoles={["Employee", "Admin"]}>
              <Notifications />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute allowedRoles={["Employee", "Admin"]}>
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="/approvals" element={
            <ProtectedRoute allowedRoles={["Employee"]}>
              <MyApprovals />
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute allowedRoles={["Employee"]}>
              <MyReports />
            </ProtectedRoute>
          } />

          {/* ===== ADMIN ROUTES ===== */}
          <Route path="/admin-dashboard" element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/employees" element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <Employees />
            </ProtectedRoute>
          } />
          <Route path="/employees/add" element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AddEmployee />
            </ProtectedRoute>
          } />
          <Route path="/teams" element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <Teams />
            </ProtectedRoute>
          } />
          <Route path="/teams/add" element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AddTeam />
            </ProtectedRoute>
          } />
          <Route path="/shifts" element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <Shifts />
            </ProtectedRoute>
          } />
          <Route path="/rotation-cycles" element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <RotationCycles />
            </ProtectedRoute>
          } />
          <Route path="/admin-rosters" element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AdminRosters />
            </ProtectedRoute>
          } />
          <Route path="/admin-claims" element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AdminClaims />
            </ProtectedRoute>
          } />
          <Route path="/payroll-admin" element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AdminPayroll />
            </ProtectedRoute>
          } />
          <Route path="/payroll-admin/generate" element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <GeneratePayroll />
            </ProtectedRoute>
          } />
          <Route path="/compliance" element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <Compliance />
            </ProtectedRoute>
          } />
          <Route path="/admin-reports" element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AdminReports />
            </ProtectedRoute>
          } />
          <Route path="/holidays" element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <Holidays />
            </ProtectedRoute>
          } />
          <Route path="/admin-settings" element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AdminSettings />
            </ProtectedRoute>
          } />

          {/* ===== 404 ===== */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;